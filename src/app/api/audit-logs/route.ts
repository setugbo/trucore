import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor, assertOrgAccess, ApiError, withErrorHandling } from "@/lib/authz";

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "organizationId is required" }, { status: 400 });

  assertOrgAccess(actor, organizationId);
  if (actor.roleType === "VIEWER" && !actor.isPlatformAdmin) {
    throw new ApiError(403, "Forbidden");
  }

  const logs = await prisma.auditLog.findMany({
    where: { organizationId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(logs);
});
