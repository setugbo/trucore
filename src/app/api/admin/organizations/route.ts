import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = (session.user as any)?.membership;
    const isSuperAdmin = membership?.role?.type === "SYSTEM_ADMIN";
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const orgs = await prisma.organization.findMany({
      include: { _count: { select: { users: true, surveys: true, cases: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orgs);
  } catch (error) {
    console.error("Admin orgs error:", error);
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

    const { name, slug } = await request.json();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const orgSlug = slug || slugify(name) + "-" + Date.now().toString(36);

    const existing = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (existing) return NextResponse.json({ error: "Organization with this slug already exists" }, { status: 400 });

    const org = await prisma.organization.create({
      data: { name, slug: orgSlug },
    });
    await prisma.brandingConfig.create({ data: { organizationId: org.id } });

    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    console.error("Admin create org error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const membership = (session.user as any)?.membership;
    const isSuperAdmin = membership?.role?.type === "SYSTEM_ADMIN";
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { organizationId, publicReportSlug } = await request.json();

    if (publicReportSlug) {
      const existing = await prisma.organization.findUnique({ where: { publicReportSlug } });
      if (existing && existing.id !== organizationId) {
        return NextResponse.json({ error: "This slug is already in use by another organization" }, { status: 400 });
      }
    }

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: { publicReportSlug: publicReportSlug || null },
    });

    return NextResponse.json(org);
  } catch (error) {
    console.error("Admin update org error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
