import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, name, slug, logo } = await request.json();

    const userId = (session.user as any).id;
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { role: true },
    });

    if (!membership || (membership.role.type !== "SUPER_ADMIN" && membership.role.type !== "ORG_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(logo !== undefined && { logo }),
      },
    });

    return NextResponse.json(org);
  } catch (error) {
    console.error("Organization update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
