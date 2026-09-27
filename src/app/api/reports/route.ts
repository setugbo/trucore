import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor, assertOrgAccess, withErrorHandling } from "@/lib/authz";

export const dynamic = 'force-dynamic';

export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const type = searchParams.get("type");

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }
  assertOrgAccess(actor, organizationId);

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

    if (!type || type === "trends") {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlySurveys = await prisma.generalSurvey.groupBy({
        by: ["createdAt"],
        where: { organizationId, createdAt: { gte: twelveMonthsAgo } },
        _count: true,
      });

      const monthlyCases = await prisma.case.groupBy({
        by: ["createdAt"],
        where: { organizationId, createdAt: { gte: twelveMonthsAgo } },
        _count: true,
      });

      const trends: number[] = [];
      const trendResponses: number[] = [];
      const trendCases: number[] = [];

      for (let i = 0; i < 12; i++) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - (11 - i));
        monthStart.setDate(1);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        trends.push(monthlySurveys.filter((s) => {
          const d = new Date(s.createdAt);
          return d >= monthStart && d < monthEnd;
        }).length);

        trendResponses.push(0); // Would need response-level timestamps
        trendCases.push(monthlyCases.filter((c) => {
          const d = new Date(c.createdAt);
          return d >= monthStart && d < monthEnd;
        }).length);
      }

      result.trends = { surveys: trends, responses: trendResponses, cases: trendCases };
    }

  return NextResponse.json(result);
});
