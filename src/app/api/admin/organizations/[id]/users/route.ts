import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { sendEmail, renderInviteEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

async function checkAccess(orgId: string, session: any) {
  const memberships = (session.user as any)?.memberships || [];
  const isSuperAdmin = memberships.some((m: any) => m.role?.type === "SUPER_ADMIN");
  const isOrgAdmin = memberships.some((m: any) => m.organizationId === orgId && m.role?.type === "ORG_ADMIN");
  return isSuperAdmin || isOrgAdmin;
}

// POST - Invite user to org
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(await checkAccess(params.id, session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, name, password, roleType } = await request.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const validRoles = ["ORG_ADMIN", "MODULE_ADMIN", "VIEWER"];
    if (roleType && !validRoles.includes(roleType)) {
      return NextResponse.json({ error: "Invalid role. Use ORG_ADMIN, MODULE_ADMIN, or VIEWER" }, { status: 400 });
    }

    const targetRole = await prisma.role.findFirst({ where: { type: roleType || "VIEWER" } });
    if (!targetRole) return NextResponse.json({ error: "Role not found" }, { status: 400 });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const pw = await bcrypt.hash(password || "Welcome@2026", 12);
      user = await prisma.user.create({ data: { name: name || email.split("@")[0], email, password: pw, isActive: true } });
    }

    const existingMembership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: params.id } },
    });
    if (existingMembership) {
      return NextResponse.json({ error: "User is already a member" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({ where: { id: params.id }, select: { name: true } });

    await prisma.membership.create({
      data: { userId: user.id, organizationId: params.id, roleId: targetRole.id },
    });

    // In-app notification
    await prisma.notification.create({
      data: { organizationId: params.id, userId: user.id, type: "INVITATION", title: "Welcome!", message: `You've been added as ${targetRole.name} to ${org?.name || "the organization"}`, link: "/dashboard" },
    });

    // Email invitation
    try {
      await sendEmail({
        to: email,
        subject: `You've been invited to ${org?.name || "TRUCORE"}`,
        html: renderInviteEmail({
          orgName: org?.name || "the organization",
          inviterName: (session.user as any).name || "An administrator",
          inviteLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://trucore.vercel.app"}/login`,
        }),
      });
    } catch (e) { console.error("Invite email failed (SMTP may not be configured):", e); }

    // Audit log
    await prisma.auditLog.create({
      data: { organizationId: params.id, userId: (session.user as any).id, action: "INVITE_USER", entityType: "User", entityId: user.id, metadata: JSON.stringify({ email, role: targetRole.name }) },
    });

    return NextResponse.json({ message: "User invited successfully", userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Invite user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update user role in org
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(await checkAccess(params.id, session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { membershipId, roleType } = await request.json();
    if (!membershipId || !roleType) return NextResponse.json({ error: "membershipId and roleType are required" }, { status: 400 });

    const validRoles = ["ORG_ADMIN", "MODULE_ADMIN", "VIEWER"];
    if (!validRoles.includes(roleType)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

    const targetRole = await prisma.role.findFirst({ where: { type: roleType } });
    if (!targetRole) return NextResponse.json({ error: "Role not found" }, { status: 400 });

    const membership = await prisma.membership.update({
      where: { id: membershipId },
      data: { roleId: targetRole.id },
      include: { user: { select: { email: true } } },
    });

    await prisma.auditLog.create({
      data: { organizationId: params.id, userId: (session.user as any).id, action: "UPDATE_USER_ROLE", entityType: "User", entityId: membership.userId, metadata: JSON.stringify({ email: membership.user.email, newRole: roleType }) },
    });

    return NextResponse.json({ message: "Role updated" });
  } catch (error) {
    console.error("Update role error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove user from org
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(await checkAccess(params.id, session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const membershipId = searchParams.get("membershipId");
    if (!membershipId) return NextResponse.json({ error: "membershipId is required" }, { status: 400 });

    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: { user: { select: { email: true } } },
    });
    if (!membership) return NextResponse.json({ error: "Membership not found" }, { status: 404 });

    await prisma.membership.delete({ where: { id: membershipId } });

    await prisma.auditLog.create({
      data: { organizationId: params.id, userId: (session.user as any).id, action: "REMOVE_USER", entityType: "User", entityId: membership.userId, metadata: JSON.stringify({ email: membership.user.email }) },
    });

    return NextResponse.json({ message: "User removed from organization" });
  } catch (error) {
    console.error("Remove user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
