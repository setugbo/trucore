import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateCaseId, generateReportToken } from "@/lib/utils";
import { checkRateLimit, getClientIp, rateLimited } from "@/lib/rate-limit";
import { assertValidUpload, fileToDataUrl, MAX_FILES_PER_SUBMISSION, UploadValidationError } from "@/lib/uploads";
import { caseSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`case-submit:${ip}`, { limit: 10, windowMs: 60 * 60 * 1000 });
    if (!allowed) return rateLimited();

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

    const parsed = caseSchema.safeParse({
      title,
      description,
      category: category || undefined,
      priority: (priority || "normal") as any,
      isAnonymous,
      reporterName: reporterName || undefined,
      reporterEmail: reporterEmail || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid submission" }, { status: 400 });
    }

    if (!organizationSlug) {
      return NextResponse.json({ error: "organizationSlug is required" }, { status: 400 });
    }
    const org = await prisma.organization.findFirst({
      where: { OR: [{ slug: organizationSlug }, { publicReportSlug: organizationSlug }] },
    });
    if (!org) return NextResponse.json({ error: "Unknown organization" }, { status: 400 });

    if (evidenceFiles.length > MAX_FILES_PER_SUBMISSION) {
      return NextResponse.json({ error: `A maximum of ${MAX_FILES_PER_SUBMISSION} files may be attached` }, { status: 400 });
    }
    for (const file of evidenceFiles) {
      try {
        assertValidUpload(file);
      } catch (e) {
        if (e instanceof UploadValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
        throw e;
      }
    }

    const token = generateReportToken();

    const data = parsed.data;
    const caseItem = await prisma.case.create({
      data: {
        caseId: generateCaseId(),
        organizationId: org.id,
        title: data.title,
        description: data.description,
        category: data.category || null,
        priority: data.priority,
        isAnonymous: data.isAnonymous,
        reporterToken: token,
        reporterName: data.isAnonymous ? null : data.reporterName || null,
        reporterEmail: data.isAnonymous ? null : data.reporterEmail || null,
      },
    });

    // Files were already validated (type/size/count) above; store as base64 in DB for serverless compatibility.
    let uploadedCount = 0;
    for (const file of evidenceFiles) {
      try {
        const dataUrl = await fileToDataUrl(file);
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
