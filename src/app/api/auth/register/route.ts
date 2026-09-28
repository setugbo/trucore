import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { registerSchema } from "@/lib/validations";
import { checkRateLimit, getClientIp, rateLimited } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`register:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
    if (!allowed) return rateLimited();

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { name, email, password, organizationName } = parsed.data;

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
      where: { type: "SYSTEM_ADMIN" },
    });

    if (!superAdminRole) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://trucore.vercel.app"}/api/admin/setup`, { method: "POST" });
      superAdminRole = await prisma.role.findFirst({ where: { type: "SYSTEM_ADMIN" } });
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
