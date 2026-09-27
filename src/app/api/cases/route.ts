import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateCaseId, generateReportToken } from "@/lib/utils";
import { requireActor, assertModulePermission, withErrorHandling } from "@/lib/authz";
import { caseSchema } from "@/lib/validations";

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const status = searchParams.get("status");

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }
  await assertModulePermission(actor, organizationId, "WHISTLEBLOWING", "canView");

  const where: any = { organizationId };
  if (status) where.status = status;

  const cases = await prisma.case.findMany({
    where,
    include: {
      _count: { select: { messages: true, attachments: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(cases);
});

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();
  const body = await request.json();
  const { organizationId } = body;
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }
  await assertModulePermission(actor, organizationId, "WHISTLEBLOWING", "canCreate");

  const parsed = caseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid case" }, { status: 400 });
  }
  const data = parsed.data;
  const userId = actor.userId;

  const caseItem = await prisma.case.create({
    data: {
      caseId: generateCaseId(),
      organizationId,
      title: data.title,
      description: data.description,
      category: data.category || null,
      priority: data.priority,
      isAnonymous: data.isAnonymous,
      reporterToken: generateReportToken(),
      reporterName: data.isAnonymous ? null : data.reporterName || null,
      reporterEmail: data.isAnonymous ? null : data.reporterEmail || null,
      assignedToId: userId,
    },
  });

  if (!data.isAnonymous) {
    await prisma.caseMessage.create({
      data: {
        caseId: caseItem.id,
        senderId: userId,
        content: data.description,
        isFromReporter: false,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action: "CREATE",
      entityType: "Case",
      entityId: caseItem.id,
      metadata: JSON.stringify({ title: data.title, isAnonymous: data.isAnonymous }),
    },
  });

  // Notify org admins about new case
  const orgAdmins = await prisma.membership.findMany({
    where: { organizationId, role: { type: { in: ["MODULE_ADMIN", "SYSTEM_ADMIN"] } } },
    include: { user: true },
  });
  for (const m of orgAdmins) {
    await prisma.notification.create({
      data: {
        organizationId,
        userId: m.user.id,
        type: "CASE_CREATED",
        title: "New Whistleblowing Case",
        message: `Case ${caseItem.caseId}: ${data.title}`,
        link: `/dashboard/cases/${caseItem.id}`,
      },
    });
  }

  return NextResponse.json(caseItem, { status: 201 });
});
