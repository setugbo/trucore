import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkRateLimit, getClientIp, rateLimited } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { token: string } }) {
  try {
    const ip = getClientIp(request);
    // Defense in depth against token enumeration - keyed by IP, not by token,
    // so guessing many tokens from one source still gets throttled.
    const allowed = await checkRateLimit(`case-track:${ip}`, { limit: 20, windowMs: 60 * 1000 });
    if (!allowed) return rateLimited();

    const caseItem = await prisma.case.findUnique({
      where: { reporterToken: params.token },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        attachments: { select: { id: true, fileName: true, fileUrl: true, fileSize: true, uploadedAt: true } },
      },
    });

    if (!caseItem) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const auditTrail = await prisma.auditLog.findMany({
      where: { OR: [{ entityId: caseItem.caseId }, { entityId: caseItem.id }] },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Only expose safe fields
    return NextResponse.json({
      caseId: caseItem.caseId,
      title: caseItem.title,
      status: caseItem.status,
      priority: caseItem.priority,
      category: caseItem.category,
      createdAt: caseItem.createdAt,
      updatedAt: caseItem.updatedAt,
      reporterName: caseItem.reporterName,
      reporterEmail: caseItem.reporterEmail,
      messages: caseItem.messages,
      attachments: caseItem.attachments,
      auditTrail,
    });
  } catch (error) {
    console.error("Track case error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
