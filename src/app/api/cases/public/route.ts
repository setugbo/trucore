import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateCaseId, generateToken } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, category, priority, isAnonymous, reporterName, reporterEmail } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    // Try to find the first organization (public submissions go to a default org)
    // In production, you'd use a domain/organization lookup
    const org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
    if (!org) return NextResponse.json({ error: "No organization configured" }, { status: 500 });

    const token = generateToken(24);

    const caseItem = await prisma.case.create({
      data: {
        caseId: generateCaseId(),
        organizationId: org.id,
        title,
        description,
        category: category || null,
        priority: priority || "normal",
        isAnonymous: isAnonymous !== false,
        reporterToken: token,
        reporterName: isAnonymous ? null : (reporterName || null),
        reporterEmail: isAnonymous ? null : (reporterEmail || null),
      },
    });

    return NextResponse.json({
      id: caseItem.id,
      caseId: caseItem.caseId,
      reporterToken: token,
      message: "Report submitted successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("Public case error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
