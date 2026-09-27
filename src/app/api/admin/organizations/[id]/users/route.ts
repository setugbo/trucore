import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { sendEmail, renderInviteEmail } from "@/lib/email";
import { generatePassword } from "@/lib/utils";
import { requireActor, assertOrgAccess, ApiError, withErrorHandling, type Actor } from "@/lib/authz";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["SYSTEM_ADMIN", "MODULE_ADMIN", "VIEWER"];

function assertOrgAdminAccess(actor: Actor, orgId: string) {
  assertOrgAccess(actor, orgId);
  if (actor.isPlatformAdmin) return;
  if (actor.roleType !== "SYSTEM_ADMIN" && actor.roleType !== "MODULE_ADMIN") {
    throw new ApiError(403, "Forbidden");
  }
}

// GET - List this org's members
export const GET = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const actor = await requireActor();
  assertOrgAdminAccess(actor, params.id);

  const memberships = await prisma.membership.findMany({
    where: { organizationId: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, isActive: true, createdAt: true } },
      role: { select: { id: true, name: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(memberships.map((m) => ({
    id: m.user.id,
    membershipId: m.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
    isActive: m.user.isActive,
    createdAt: m.user.createdAt,
    membership: { organizationId: m.organizationId, role: m.role },
  })));
});

// POST - Invite user to org
export const POST = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const actor = await requireActor();
  assertOrgAdminAccess(actor, params.id);

  const { email, name, password, roleType } = await request.json();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  if (roleType && !VALID_ROLES.includes(roleType)) {
    return NextResponse.json({ error: "Invalid role. Use SYSTEM_ADMIN, MODULE_ADMIN, or VIEWER" }, { status: 400 });
  }
  if (password && password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const targetRole = await prisma.role.findFirst({ where: { type: roleType || "VIEWER" } });
  if (!targetRole) return NextResponse.json({ error: "Role not found" }, { status: 400 });

  const generatedPassword = generatePassword();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const pw = await bcrypt.hash(password || generatedPassword, 12);
    user = await prisma.user.create({ data: { name: name || email.split("@")[0], email, password: pw, isActive: true } });
  }

  const existingMembership = await prisma.membership.findUnique({ where: { userId: user.id } });
  if (existingMembership) {
    return NextResponse.json({ error: "User is already a member" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id: params.id }, select: { name: true } });

  await prisma.membership.create({
    data: { userId: user.id, organizationId: params.id, roleId: targetRole.id },
  });

  await prisma.notification.create({
    data: { organizationId: params.id, userId: user.id, type: "INVITATION", title: "Welcome!", message: `You've been added as ${targetRole.name} to ${org?.name || "the organization"}`, link: "/dashboard" },
  });

  const invitePassword = password || generatedPassword;
  try {
    await sendEmail({
      to: email,
      subject: `Welcome to ${org?.name || "TRUCORE"} - Your Account Details`,
      html: renderInviteEmail({
        orgName: org?.name || "the organization",
        inviterName: "An administrator",
        inviteLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://trucore.vercel.app"}/login`,
        email: email,
        password: invitePassword,
      }),
    });
  } catch (e) { console.error("Invite email failed (SMTP may not be configured):", e); }

  const modules = await prisma.module.findMany();
  for (const mod of modules) {
    const isAdmin = targetRole.type === "SYSTEM_ADMIN" || targetRole.type === "MODULE_ADMIN";
    await prisma.userModulePermission.upsert({
      where: { userId_organizationId_moduleId: { userId: user.id, organizationId: params.id, moduleId: mod.id } },
      update: {},
      create: { userId: user.id, organizationId: params.id, moduleId: mod.id, canView: true, canCreate: isAdmin, canEdit: isAdmin, canDelete: isAdmin },
    });
  }

  await prisma.auditLog.create({
    data: { organizationId: params.id, userId: actor.userId, action: "INVITE_USER", entityType: "User", entityId: user.id, metadata: JSON.stringify({ email, role: targetRole.name }) },
  });

  return NextResponse.json({ message: "User invited successfully", userId: user.id }, { status: 201 });
});

// PUT - Update a member's role and/or active status
export const PUT = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const actor = await requireActor();
  assertOrgAdminAccess(actor, params.id);

  const { membershipId, roleType, isActive } = await request.json();
  if (!membershipId) return NextResponse.json({ error: "membershipId is required" }, { status: 400 });

  const existingMembership = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!existingMembership || existingMembership.organizationId !== params.id) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  if (roleType !== undefined) {
    if (!VALID_ROLES.includes(roleType)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    const targetRole = await prisma.role.findFirst({ where: { type: roleType } });
    if (!targetRole) return NextResponse.json({ error: "Role not found" }, { status: 400 });
    await prisma.membership.update({ where: { id: membershipId }, data: { roleId: targetRole.id } });
  }

  if (isActive !== undefined) {
    await prisma.user.update({ where: { id: existingMembership.userId }, data: { isActive } });
  }

  await prisma.auditLog.create({
    data: { organizationId: params.id, userId: actor.userId, action: "UPDATE_USER", entityType: "User", entityId: existingMembership.userId, metadata: JSON.stringify({ roleType, isActive }) },
  });

  return NextResponse.json({ message: "User updated" });
});

// DELETE - Remove user from org
export const DELETE = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const actor = await requireActor();
  assertOrgAdminAccess(actor, params.id);

  const { searchParams } = new URL(request.url);
  const membershipId = searchParams.get("membershipId");
  if (!membershipId) return NextResponse.json({ error: "membershipId is required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { user: { select: { email: true } } },
  });
  if (!membership || membership.organizationId !== params.id) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  await prisma.membership.delete({ where: { id: membershipId } });

  await prisma.auditLog.create({
    data: { organizationId: params.id, userId: actor.userId, action: "REMOVE_USER", entityType: "User", entityId: membership.userId, metadata: JSON.stringify({ email: membership.user.email }) },
  });

  return NextResponse.json({ message: "User removed from organization" });
});
