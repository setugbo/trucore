import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireActor, assertOrgAccess, ApiError, withErrorHandling } from "@/lib/authz";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        organization: true,
        role: true,
      },
    });

    return NextResponse.json(memberships);
  } catch (error) {
    console.error("Organizations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const PUT = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();
  const { organizationId, name, slug } = await request.json();
  if (!organizationId) return NextResponse.json({ error: "organizationId is required" }, { status: 400 });

  assertOrgAccess(actor, organizationId);
  if (actor.roleType !== "SYSTEM_ADMIN" && actor.roleType !== "MODULE_ADMIN" && !actor.isPlatformAdmin) {
    throw new ApiError(403, "Forbidden");
  }

  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(name && { name }),
      ...(slug && { slug }),
    },
  });

  return NextResponse.json(org);
});
