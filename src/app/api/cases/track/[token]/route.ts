import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { token: string } }) {
  try {
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

    // Only expose safe fields
    return NextResponse.json({
      caseId: caseItem.caseId,
      title: caseItem.title,
      status: caseItem.status,
      priority: caseItem.priority,
      category: caseItem.category,
      createdAt: caseItem.createdAt,
      updatedAt: caseItem.updatedAt,
      messages: caseItem.messages,
      attachments: caseItem.attachments,
    });
  } catch (error) {
    console.error("Track case error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
