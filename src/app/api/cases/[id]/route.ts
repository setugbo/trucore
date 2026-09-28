import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail, renderCaseUpdateEmail } from "@/lib/email";
import { requireActor, assertModulePermission, assertOrgAccess, ApiError, withErrorHandling } from "@/lib/authz";

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const actor = await requireActor();

  const caseItem = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, name: true, email: true } } } },
      attachments: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true, attachments: true } },
    },
  });
  if (!caseItem) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await assertModulePermission(actor, caseItem.organizationId, "WHISTLEBLOWING", "canView");

  const auditTrail = await prisma.auditLog.findMany({
    where: { OR: [{ entityId: caseItem.caseId }, { entityId: params.id }] },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ ...caseItem, auditTrail });
});

export const PUT = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const actor = await requireActor();
  const existing = await prisma.case.findUnique({ where: { id: params.id }, select: { organizationId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await assertModulePermission(actor, existing.organizationId, "WHISTLEBLOWING", "canEdit");

  const body = await request.json();
  const { status, priority, assignedToId } = body;

  // If reassigning, the new assignee must belong to the same organization.
  if (assignedToId) {
    const assigneeMembership = await prisma.membership.findUnique({ where: { userId: assignedToId } });
    if (!assigneeMembership || assigneeMembership.organizationId !== existing.organizationId) {
      throw new ApiError(400, "assignedToId must belong to the case's organization");
    }
  }

  const caseItem = await prisma.case.update({
    where: { id: params.id },
    data: { ...(status && { status }), ...(priority && { priority }), ...(assignedToId !== undefined && { assignedToId }) },
  });
  await prisma.auditLog.create({ data: { organizationId: caseItem.organizationId, userId: actor.userId, action: "UPDATE", entityType: "Case", entityId: caseItem.id, metadata: JSON.stringify({ status, priority }) } });

  const orgAdmins = await prisma.membership.findMany({
    where: { organizationId: caseItem.organizationId, role: { type: { in: ["MODULE_ADMIN", "SYSTEM_ADMIN"] } } },
    include: { user: true },
  });
  for (const m of orgAdmins) {
    await prisma.notification.create({
      data: { organizationId: caseItem.organizationId, userId: m.user.id, type: "CASE_UPDATED", title: `Case ${caseItem.caseId}: ${status || "Status Updated"}`, message: `Status changed for "${caseItem.title}"`, link: `/dashboard/cases/${caseItem.id}` },
    });
    try {
      await sendEmail({
        to: m.user.email,
        subject: `TRUCORE - Case Update: ${caseItem.caseId}`,
        html: renderCaseUpdateEmail({
          caseId: caseItem.caseId,
          status: status || "Updated",
          message: `Status changed for "${caseItem.title}"`,
          dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://trucore.vercel.app"}/dashboard/cases/${caseItem.id}`,
        }),
      });
    } catch (e) { console.error("Status update email failed:", e); }
  }

  return NextResponse.json(caseItem);
});

export const DELETE = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const actor = await requireActor();
  const caseItem = await prisma.case.findUnique({ where: { id: params.id } });
  if (!caseItem) return NextResponse.json({ error: "Not found" }, { status: 404 });

  assertOrgAccess(actor, caseItem.organizationId);
  if (actor.roleType !== "SYSTEM_ADMIN" && !actor.isPlatformAdmin) {
    throw new ApiError(403, "Forbidden");
  }

  await prisma.auditLog.create({
    data: { organizationId: caseItem.organizationId, userId: actor.userId, action: "DELETE", entityType: "Case", entityId: caseItem.id, metadata: JSON.stringify({ caseId: caseItem.caseId, title: caseItem.title }) },
  });

  await prisma.case.delete({ where: { id: params.id } });
  return NextResponse.json({ message: "Case deleted successfully" });
});
