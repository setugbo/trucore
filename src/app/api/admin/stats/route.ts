import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActor, assertPlatformAdmin, withErrorHandling } from "@/lib/authz";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const actor = await requireActor();
  assertPlatformAdmin(actor);

  const [userCount, orgCount, surveyCount, anonCount, caseCount, surveyResponseCount, anonResponseCount, recentLogs] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.generalSurvey.count(),
    prisma.anonymousSurvey.count(),
    prisma.case.count(),
    prisma.generalSurveyResponse.count(),
    prisma.anonymousSurveyResponse.count(),
    prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
  ]);

  return NextResponse.json({
    users: userCount,
    organizations: orgCount,
    surveys: surveyCount + anonCount,
    responses: surveyResponseCount + anonResponseCount,
    cases: caseCount,
    recentActivity30d: recentLogs,
  });
});
