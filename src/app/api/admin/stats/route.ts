import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const memberships = (session.user as any)?.memberships || [];
    const isSuperAdmin = memberships.some((m: any) => m.role?.type === "SUPER_ADMIN");
    if (!isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
      dbSize: `${((userCount * 0.5 + orgCount * 2 + (surveyCount + anonCount) * 1.5 + caseCount * 2) / 1024).toFixed(2)} MB (est.)`,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
