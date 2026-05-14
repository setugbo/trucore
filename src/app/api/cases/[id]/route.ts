import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendEmail, renderCaseUpdateEmail } from "@/lib/email";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
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

    // Fetch audit trail for this case
    const auditTrail = await prisma.auditLog.findMany({
      where: { OR: [{ entityId: caseItem.caseId }, { entityId: params.id }] },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ ...caseItem, auditTrail });
  } catch (error) {
    console.error("Case fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const body = await request.json();
    const { status, priority, assignedToId } = body;
    const caseItem = await prisma.case.update({
      where: { id: params.id },
      data: { ...(status && { status }), ...(priority && { priority }), ...(assignedToId !== undefined && { assignedToId }) },
    });
    await prisma.auditLog.create({ data: { organizationId: caseItem.organizationId, userId, action: "UPDATE", entityType: "Case", entityId: caseItem.id, metadata: JSON.stringify({ status, priority }) } });

    // Notify all org admins about status change
    const orgAdmins = await prisma.membership.findMany({
      where: { organizationId: caseItem.organizationId, role: { type: { in: ["MODULE_ADMIN", "SYSTEM_ADMIN"] } } },
      include: { user: true },
    });
    for (const m of orgAdmins) {
      await prisma.notification.create({
        data: { organizationId: caseItem.organizationId, userId: m.user.id, type: "CASE_UPDATED", title: `Case ${caseItem.caseId}: ${status || "Status Updated"}`, message: `Status changed for "${caseItem.title}"`, link: `/dashboard/cases/${caseItem.id}` },
      });
      // Send email notification
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
  } catch (error) {
    console.error("Case update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
