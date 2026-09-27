import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { requireActor, assertPlatformAdmin, withErrorHandling } from "@/lib/authz";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const actor = await requireActor();
  assertPlatformAdmin(actor);

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, isActive: true, isPlatformAdmin: true, createdAt: true,
      membership: { select: { organizationId: true, role: { select: { id: true, name: true, type: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(users);
});

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();
  assertPlatformAdmin(actor);

  const { email, password, name, role: roleType, organizationId } = await request.json();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!organizationId) return NextResponse.json({ error: "organizationId is required" }, { status: 400 });

  if (!password) return NextResponse.json({ error: "Password is required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "User already exists" }, { status: 400 });

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 400 });

  const hashedPassword = await bcrypt.hash(password, 12);
  const targetRole = await prisma.role.findFirst({ where: { type: roleType || "SYSTEM_ADMIN" } });
  if (!targetRole) return NextResponse.json({ error: "Role not found. Initialize system first." }, { status: 400 });

  const user = await prisma.user.create({
    data: { name: name || email.split("@")[0], email, password: hashedPassword, isActive: true },
  });
  await prisma.membership.create({ data: { userId: user.id, organizationId, roleId: targetRole.id } });

  return NextResponse.json({ message: "User created", userId: user.id }, { status: 201 });
});

export const PUT = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();
  assertPlatformAdmin(actor);

  const { userId, isActive, roleType } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  if (isActive !== undefined) {
    await prisma.user.update({ where: { id: userId }, data: { isActive } });
  }

  if (roleType) {
    const targetRole = await prisma.role.findUnique({ where: { type: roleType } });
    if (!targetRole) return NextResponse.json({ error: "Role not found" }, { status: 400 });
    await prisma.membership.update({ where: { userId }, data: { roleId: targetRole.id } });
  }

  return NextResponse.json({ message: "User updated" });
});

export const DELETE = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();
  assertPlatformAdmin(actor);

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  if (userId === actor.userId) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ message: "User deleted" });
});
