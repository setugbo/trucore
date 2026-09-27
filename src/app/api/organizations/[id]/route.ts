import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor, assertOrgAccess, withErrorHandling } from "@/lib/authz";

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const actor = await requireActor();
  assertOrgAccess(actor, params.id);

  const org = await prisma.organization.findUnique({
    where: { id: params.id },
    include: { branding: true },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(org);
});
