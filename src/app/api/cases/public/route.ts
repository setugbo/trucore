import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateCaseId, generateReportToken } from "@/lib/utils";
import { v4 as uuid } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let title: string, description: string, category: string, priority: string;
    let isAnonymous = true;
    let reporterName: string | null = null;
    let reporterEmail: string | null = null;
    let organizationSlug: string | null = null;
    const evidenceFiles: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      title = (formData.get("title") as string) || "";
      description = (formData.get("description") as string) || "";
      category = (formData.get("category") as string) || "";
      priority = (formData.get("priority") as string) || "normal";
      isAnonymous = formData.get("isAnonymous") !== "false";
      reporterName = formData.get("reporterName") as string | null;
      reporterEmail = formData.get("reporterEmail") as string | null;
      organizationSlug = formData.get("organizationSlug") as string | null;
      const allEvidence = formData.getAll("evidence") as File[];
      allEvidence.forEach((f) => { if (f && f.size > 0) evidenceFiles.push(f); });
    } else {
      const body = await request.json();
      title = body.title;
      description = body.description;
      category = body.category || "";
      priority = body.priority || "normal";
      isAnonymous = body.isAnonymous !== false;
      reporterName = body.reporterName || null;
      reporterEmail = body.reporterEmail || null;
      organizationSlug = body.organizationSlug || null;
    }

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

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

    const token = generateReportToken();

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
        reporterName: isAnonymous ? null : reporterName,
        reporterEmail: isAnonymous ? null : reporterEmail,
      },
    });

    // Handle file uploads - store as base64 in DB for Vercel compatibility
    let uploadedCount = 0;
    for (const file of evidenceFiles) {
      try {
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
        if (file.size > MAX_SIZE) {
          console.warn("File too large, skipping:", file.name);
          continue;
        }
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString("base64");
        const dataUrl = `data:${file.type || "application/octet-stream"};base64,${base64}`;

        await prisma.caseAttachment.create({
          data: { caseId: caseItem.id, fileName: file.name, fileUrl: dataUrl, fileSize: file.size, mimeType: file.type || null },
        });
        uploadedCount++;
      } catch (fileError) {
        console.error("File upload failed for", file.name, ":", fileError);
      }
    }

    return NextResponse.json({
      id: caseItem.id,
      caseId: caseItem.caseId,
      reporterToken: token,
      evidenceCount: evidenceFiles.length,
      message: "Report submitted successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("Public case error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
