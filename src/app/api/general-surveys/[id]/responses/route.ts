import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActor, assertModulePermission, withErrorHandling, ApiError } from "@/lib/authz";
import { checkRateLimit, getClientIp, rateLimited } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

async function resolveSurveyId(idOrLink: string): Promise<string | null> {
  let survey = await prisma.generalSurvey.findUnique({ where: { id: idOrLink }, select: { id: true } });
  if (!survey) {
    survey = await prisma.generalSurvey.findUnique({ where: { publicLink: idOrLink }, select: { id: true } });
  }
  return survey?.id || null;
}

export const GET = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const surveyId = await resolveSurveyId(params.id);
  if (!surveyId) return NextResponse.json({ error: "Survey not found" }, { status: 404 });

  const survey = await prisma.generalSurvey.findUnique({ where: { id: surveyId }, select: { organizationId: true } });
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });

  const actor = await getActor();
  if (!actor) throw new ApiError(401, "Unauthorized");
  await assertModulePermission(actor, survey.organizationId, "GENERAL_SURVEY", "canView");

  const responses = await prisma.generalSurveyResponse.findMany({
    where: { surveyId },
    include: { user: { select: { id: true, name: true, email: true } }, answers: { include: { question: true } } },
    orderBy: { submittedAt: "desc" },
  });
  return NextResponse.json(responses);
});

export const POST = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const surveyId = await resolveSurveyId(params.id);
  if (!surveyId) return NextResponse.json({ error: "Survey not found" }, { status: 404 });

  const survey = await prisma.generalSurvey.findUnique({
    where: { id: surveyId },
    select: { organizationId: true, isPublic: true, status: true },
  });
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  if (survey.status !== "PUBLISHED") {
    return NextResponse.json({ error: "This survey is not currently accepting responses" }, { status: 400 });
  }

  const actor = await getActor();
  if (!survey.isPublic) {
    // Internal surveys require the respondent to belong to the org.
    if (!actor || actor.organizationId !== survey.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (!actor) {
    // Public survey, anonymous-to-the-app respondent - throttle by IP.
    const ip = getClientIp(request);
    const allowed = await checkRateLimit(`survey-response:${ip}`, { limit: 30, windowMs: 60 * 60 * 1000 });
    if (!allowed) return rateLimited();
  }

  const { answers } = await request.json();
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "At least one answer is required" }, { status: 400 });
  }

  const response = await prisma.generalSurveyResponse.create({
    data: {
      surveyId,
      ...(actor ? { userId: actor.userId } : {}),
      answers: { create: answers.map((a: any) => ({ questionId: a.questionId, value: a.value })) },
    },
    include: { answers: true },
  });
  return NextResponse.json(response, { status: 201 });
});
