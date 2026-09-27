import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor, assertPlatformAdmin, withErrorHandling } from "@/lib/authz";

export const dynamic = "force-dynamic";

// GET /api/admin/organizations/[id] - Full org detail with users, branding, modules, audit trail
export const GET = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const actor = await requireActor();
  assertPlatformAdmin(actor);

  const org = await prisma.organization.findUnique({
    where: { id: params.id },
    include: {
      branding: true,
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

  const auditLogs = await prisma.auditLog.findMany({
    where: { organizationId: params.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ ...org, auditLogs });
});

// PUT /api/admin/organizations/[id] - Update org settings
export const PUT = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const actor = await requireActor();
  assertPlatformAdmin(actor);

  const body = await request.json();
  const { name, slug, publicReportSlug, isActive } = body;

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (slug !== undefined) data.slug = slug;
  if (publicReportSlug !== undefined) data.publicReportSlug = publicReportSlug || null;
  if (isActive !== undefined) data.isActive = isActive;

  const org = await prisma.organization.update({ where: { id: params.id }, data });
  return NextResponse.json(org);
});

// DELETE /api/admin/organizations/[id] - Delete organization
export const DELETE = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const actor = await requireActor();
  assertPlatformAdmin(actor);

  await prisma.organization.delete({ where: { id: params.id } });
  return NextResponse.json({ message: "Organization deleted" });
});
