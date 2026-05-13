import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateCaseId, generateToken } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const status = searchParams.get("status");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

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
  } catch (error) {
    console.error("Cases fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const body = await request.json();
    const { organizationId, title, description, category, priority, isAnonymous, reporterName, reporterEmail } = body;

    if (!organizationId || !title || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const caseItem = await prisma.case.create({
      data: {
        caseId: generateCaseId(),
        organizationId,
        title,
        description,
        category,
        priority: priority || "normal",
        isAnonymous: isAnonymous !== false,
        reporterToken: generateToken(24),
        reporterName: isAnonymous ? null : (reporterName || null),
        reporterEmail: isAnonymous ? null : (reporterEmail || null),
        ...(userId ? { assignedToId: userId } : {}),
      },
    });

    if (!isAnonymous && userId) {
      await prisma.caseMessage.create({
        data: {
          caseId: caseItem.id,
          senderId: userId,
          content: description,
          isFromReporter: false,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId,
        ...(userId ? { userId } : {}),
        action: "CREATE",
        entityType: "Case",
        entityId: caseItem.id,
        metadata: JSON.stringify({ title, isAnonymous }),
      },
    });

    // Notify org admins about new case
    const orgAdmins = await prisma.membership.findMany({
      where: { organizationId, role: { type: { in: ["ORG_ADMIN", "SUPER_ADMIN"] } } },
      include: { user: true },
    });
    for (const m of orgAdmins) {
      await prisma.notification.create({
        data: {
          organizationId,
          userId: m.user.id,
          type: "CASE_CREATED",
          title: "New Whistleblowing Case",
          message: `Case ${caseItem.caseId}: ${title}`,
          link: `/dashboard/cases/${caseItem.id}`,
        },
      });
    }

    return NextResponse.json(caseItem, { status: 201 });
  } catch (error) {
    console.error("Case create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
