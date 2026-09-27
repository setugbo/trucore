import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor, assertOrgAccess, ApiError, withErrorHandling } from "@/lib/authz";
import { brandingSchema } from "@/lib/validations";

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  assertOrgAccess(actor, organizationId);

  const branding = await prisma.brandingConfig.findUnique({ where: { organizationId } });
  return NextResponse.json(branding);
});

export const PUT = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();
  const { organizationId, ...data } = await request.json();
  if (!organizationId) return NextResponse.json({ error: "organizationId is required" }, { status: 400 });

  assertOrgAccess(actor, organizationId);
  if (actor.roleType !== "SYSTEM_ADMIN" && !actor.isPlatformAdmin) {
    throw new ApiError(403, "Forbidden");
  }

  const parsed = brandingSchema.partial().safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid branding data" }, { status: 400 });
  }
  const fields = parsed.data;

  const branding = await prisma.brandingConfig.upsert({
    where: { organizationId },
    update: {
      ...(fields.primaryColor && { primaryColor: fields.primaryColor }),
      ...(fields.secondaryColor && { secondaryColor: fields.secondaryColor }),
      ...(fields.accentColor && { accentColor: fields.accentColor }),
      ...(fields.companyName !== undefined && { companyName: fields.companyName }),
      ...(fields.logoUrl !== undefined && { logoUrl: fields.logoUrl }),
      ...(fields.theme && { theme: fields.theme }),
    },
    create: { organizationId, ...fields },
  });

  return NextResponse.json(branding);
});
