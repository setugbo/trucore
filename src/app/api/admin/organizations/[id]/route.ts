import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/organizations/[id] - Full org detail with users, branding, modules, audit trail
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const isSuperAdmin = ((session.user as any)?.memberships || []).some((m: any) => m.role?.type === "SUPER_ADMIN");
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const org = await prisma.organization.findUnique({
      where: { id: params.id },
      include: {
        branding: true,
        modules: { include: { module: true } },
        users: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true, isActive: true, createdAt: true } },
            role: { select: { id: true, name: true, type: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { surveys: true, anonymousSurveys: true, cases: true } },
      },
    });
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get recent audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { organizationId: params.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ ...org, auditLogs });
  } catch (error) {
    console.error("Org detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/organizations/[id] - Update org settings
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const isSuperAdmin = ((session.user as any)?.memberships || []).some((m: any) => m.role?.type === "SUPER_ADMIN");
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { name, slug, publicReportSlug, isActive } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (publicReportSlug !== undefined) data.publicReportSlug = publicReportSlug || null;
    if (isActive !== undefined) data.isActive = isActive;

    const org = await prisma.organization.update({ where: { id: params.id }, data });
    return NextResponse.json(org);
  } catch (error) {
    console.error("Org update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/organizations/[id] - Delete organization
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const isSuperAdmin = ((session.user as any)?.memberships || []).some((m: any) => m.role?.type === "SUPER_ADMIN");
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.organization.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Organization deleted" });
  } catch (error) {
    console.error("Org delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
