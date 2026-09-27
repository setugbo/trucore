import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor, assertModulePermission, withErrorHandling } from "@/lib/authz";

export const dynamic = 'force-dynamic';

export const POST = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const actor = await requireActor();

  const caseItem = await prisma.case.findUnique({ where: { id: params.id }, select: { organizationId: true } });
  if (!caseItem) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await assertModulePermission(actor, caseItem.organizationId, "WHISTLEBLOWING", "canEdit");

  const { content } = await request.json();
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  // This endpoint is the authenticated admin/staff reply channel only.
  // Reporter-side replies go through the separate token-authenticated
  // /api/cases/track/[token]/messages route - isFromReporter is never
  // client-controlled here.
  const message = await prisma.caseMessage.create({
    data: { caseId: params.id, senderId: actor.userId, content, isFromReporter: false },
  });
  return NextResponse.json(message, { status: 201 });
});
