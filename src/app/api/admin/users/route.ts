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
    const memberships = (session.user as any)?.memberships || [];
    const isSuperAdmin = memberships.some((m: any) => m.role?.type === "SUPER_ADMIN");
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, isActive: true, createdAt: true,
        memberships: { select: { organizationId: true, role: { select: { name: true, type: true } } } },
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
    const memberships = (session.user as any)?.memberships || [];
    const isSuperAdmin = memberships.some((m: any) => m.role?.type === "SUPER_ADMIN");
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { email, password, name, role: roleType } = await request.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "User already exists" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password || "Admin@2026", 12);
    const targetRole = await prisma.role.findFirst({ where: { type: roleType || "SUPER_ADMIN" } });
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
