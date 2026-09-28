import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { requireActor, assertPlatformAdmin, withErrorHandling } from "@/lib/authz";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const actor = await requireActor();
  assertPlatformAdmin(actor);

  const orgs = await prisma.organization.findMany({
    include: { _count: { select: { users: true, surveys: true, cases: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orgs);
});

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();
  assertPlatformAdmin(actor);

  const { name, slug } = await request.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const orgSlug = slug || slugify(name) + "-" + Date.now().toString(36);

  const existing = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (existing) return NextResponse.json({ error: "Organization with this slug already exists" }, { status: 400 });

  const org = await prisma.organization.create({ data: { name, slug: orgSlug } });
  await prisma.brandingConfig.create({ data: { organizationId: org.id } });

  return NextResponse.json(org, { status: 201 });
});

export const PUT = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();
  assertPlatformAdmin(actor);

  const { organizationId, publicReportSlug, isActive } = await request.json();
  if (!organizationId) return NextResponse.json({ error: "organizationId is required" }, { status: 400 });

  if (publicReportSlug) {
    const existing = await prisma.organization.findUnique({ where: { publicReportSlug } });
    if (existing && existing.id !== organizationId) {
      return NextResponse.json({ error: "This slug is already in use by another organization" }, { status: 400 });
    }
  }

  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(publicReportSlug !== undefined && { publicReportSlug: publicReportSlug || null }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(org);
});
