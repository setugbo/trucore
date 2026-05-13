import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateCaseId, generateToken } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, category, priority, isAnonymous, reporterName, reporterEmail, organizationSlug } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    // Find org by slug or by publicReportSlug, or fall back to first org
    let org = null;
    if (organizationSlug) {
      org = await prisma.organization.findFirst({
        where: { OR: [{ slug: organizationSlug }, { publicReportSlug: organizationSlug }] },
      });
    }
    if (!org) {
      org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
    }
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
