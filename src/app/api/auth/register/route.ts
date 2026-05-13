import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { name, email, password, organizationName } = await request.json();

    if (!name || !email || !password || !organizationName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must contain uppercase, lowercase, and a number" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const orgSlug = slugify(organizationName) + "-" + Date.now().toString(36);

    const hashedPassword = await bcrypt.hash(password, 12);

    let superAdminRole = await prisma.role.findFirst({
      where: { type: "SUPER_ADMIN" },
    });

    if (!superAdminRole) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://trucore.vercel.app"}/api/admin/setup`, { method: "POST" });
      superAdminRole = await prisma.role.findFirst({ where: { type: "SUPER_ADMIN" } });
    }

    if (!superAdminRole) {
      return NextResponse.json({ error: "System initialization failed. Please try again." }, { status: 500 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, password: hashedPassword },
      });

      const organization = await tx.organization.create({
        data: { name: organizationName, slug: orgSlug },
      });

      await tx.membership.create({
        data: { userId: user.id, organizationId: organization.id, roleId: superAdminRole!.id },
      });

      const modules = await tx.module.findMany();
      for (const mod of modules) {
        await tx.organizationModule.create({
          data: { organizationId: organization.id, moduleId: mod.id, isEnabled: true },
        });
      }

      await tx.brandingConfig.create({
        data: { organizationId: organization.id },
      });

      return { user, organization };
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        organizationId: result.organization.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
