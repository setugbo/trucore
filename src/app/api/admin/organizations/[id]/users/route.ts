import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/admin/organizations/[id]/users - Add user to organization
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const adminMemberships = (session.user as any)?.memberships || [];
    const isSuperAdmin = adminMemberships.some((m: any) => m.role?.type === "SUPER_ADMIN");
    const isOrgAdmin = adminMemberships.some((m: any) => m.organizationId === params.id && m.role?.type === "ORG_ADMIN");
    if (!isSuperAdmin && !isOrgAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { email, name, password, roleType } = await request.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    // Valid org roles
    const validRoles = ["ORG_ADMIN", "MODULE_ADMIN", "VIEWER"];
    if (roleType && !validRoles.includes(roleType)) {
      return NextResponse.json({ error: "Invalid role. Must be ORG_ADMIN, MODULE_ADMIN, or VIEWER" }, { status: 400 });
    }

    const targetRole = await prisma.role.findFirst({ where: { type: roleType || "VIEWER" } });
    if (!targetRole) return NextResponse.json({ error: "Role not found" }, { status: 400 });

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Create user if doesn't exist
      const pw = await bcrypt.hash(password || "Welcome@2026", 12);
      user = await prisma.user.create({ data: { name: name || email.split("@")[0], email, password: pw, isActive: true } });
    }

    // Check if already a member
    const existingMembership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: params.id } },
    });
    if (existingMembership) {
      return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 });
    }

    // Create membership
    await prisma.membership.create({
      data: { userId: user.id, organizationId: params.id, roleId: targetRole.id },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        organizationId: params.id,
        userId: user.id,
        type: "INVITATION",
        title: "Welcome to the organization",
        message: `You have been added as ${targetRole.name} to ${(await prisma.organization.findUnique({ where: { id: params.id }, select: { name: true } }))?.name || "the organization"}`,
        link: "/dashboard",
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: params.id,
        userId: (session.user as any).id,
        action: "INVITE_USER",
        entityType: "User",
        entityId: user.id,
        metadata: JSON.stringify({ email, role: targetRole.name }),
      },
    });

    return NextResponse.json({ message: "User added to organization", userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Invite user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
