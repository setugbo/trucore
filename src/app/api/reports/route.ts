import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const type = searchParams.get("type");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const result: any = {};

    if (!type || type === "overview") {
      const generalSurveys = await prisma.generalSurvey.findMany({
        where: { organizationId },
        include: { _count: { select: { responses: true } } },
      });

      const anonymousSurveys = await prisma.anonymousSurvey.findMany({
        where: { organizationId },
        include: { _count: { select: { responses: true } } },
      });

      const cases = await prisma.case.findMany({
        where: { organizationId },
      });

      result.overview = {
        totalGeneralSurveys: generalSurveys.length,
        totalGeneralResponses: generalSurveys.reduce((s, x) => s + x._count.responses, 0),
        totalAnonymousSurveys: anonymousSurveys.length,
        totalAnonymousResponses: anonymousSurveys.reduce((s, x) => s + x._count.responses, 0),
        totalCases: cases.length,
        openCases: cases.filter((c) => c.status === "SUBMITTED" || c.status === "UNDER_REVIEW").length,
        resolvedCases: cases.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length,
      };
    }

    if (!type || type === "surveys") {
      const surveys = await prisma.generalSurvey.findMany({
        where: { organizationId },
        include: { _count: { select: { responses: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      result.surveys = surveys.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        responseCount: s._count.responses,
        createdAt: s.createdAt,
      }));
    }

    if (!type || type === "cases") {
      const statusCounts = await prisma.case.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: true,
      });

      result.caseStatuses = statusCounts.map((s) => ({
        status: s.status,
        count: s._count,
      }));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
