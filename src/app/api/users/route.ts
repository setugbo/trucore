import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor, assertOrgAccess, ApiError, withErrorHandling } from "@/lib/authz";

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }
  assertOrgAccess(actor, organizationId);
  if (actor.roleType === "VIEWER" && !actor.isPlatformAdmin) {
    throw new ApiError(403, "Forbidden");
  }

  const users = await prisma.membership.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          isActive: true,
          createdAt: true,
        },
      },
      role: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
});

export const PUT = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();
  const { userId, name, email } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  if (userId !== actor.userId) {
    // Only an org admin (of the target's own org) or a platform admin may edit someone else.
    const targetMembership = await prisma.membership.findUnique({ where: { userId } });
    if (!targetMembership) return NextResponse.json({ error: "Not found" }, { status: 404 });
    assertOrgAccess(actor, targetMembership.organizationId);
    if (actor.roleType !== "SYSTEM_ADMIN" && !actor.isPlatformAdmin) {
      throw new ApiError(403, "Forbidden");
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { ...(name && { name }), ...(email && { email }) },
  });

  return NextResponse.json(user);
});
