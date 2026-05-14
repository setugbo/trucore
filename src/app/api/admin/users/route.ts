import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = (session.user as any)?.membership;
    const isSuperAdmin = membership?.role?.type === "SYSTEM_ADMIN";
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, isActive: true, createdAt: true,
        membership: { select: { organizationId: true, role: { select: { id: true, name: true, type: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = (session.user as any)?.membership;
    const isSuperAdmin = membership?.role?.type === "SYSTEM_ADMIN";
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { email, password, name, role: roleType } = await request.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const pw = password || "Admin@2026";
    if (pw.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "User already exists" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(pw, 12);
    const targetRole = await prisma.role.findFirst({ where: { type: roleType || "SYSTEM_ADMIN" } });
    if (!targetRole) return NextResponse.json({ error: "Role not found. Initialize system first." }, { status: 400 });

    const user = await prisma.user.create({
      data: { name: name || email.split("@")[0], email, password: hashedPassword, isActive: true },
    });

    // Assign to the super admin org (first org) or let them create one later
    const firstOrg = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
    if (firstOrg) {
      await prisma.membership.create({ data: { userId: user.id, organizationId: firstOrg.id, roleId: targetRole.id } });
    }

    return NextResponse.json({ message: "User created", userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Admin create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = (session.user as any)?.membership;
    if (membership?.role?.type !== "SYSTEM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  } catch (error) {
    console.error("Admin update user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = (session.user as any)?.membership;
    if (membership?.role?.type !== "SYSTEM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    if (userId === (session.user as any).id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ message: "User deleted" });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
