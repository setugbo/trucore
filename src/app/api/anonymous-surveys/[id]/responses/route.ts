import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { getActor, assertModulePermission, withErrorHandling, ApiError } from "@/lib/authz";
import { checkRateLimit, getClientIp, rateLimited } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

async function resolveSurveyId(idOrLink: string): Promise<string | null> {
  let survey = await prisma.anonymousSurvey.findUnique({ where: { id: idOrLink }, select: { id: true } });
  if (!survey) {
    survey = await prisma.anonymousSurvey.findUnique({ where: { publicLink: idOrLink }, select: { id: true } });
  }
  return survey?.id || null;
}

// Reading anonymous-survey responses exposes free-text answers that can be
// identifying on their own - this must never be publicly reachable.
export const GET = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const surveyId = await resolveSurveyId(params.id);
  if (!surveyId) return NextResponse.json({ error: "Survey not found" }, { status: 404 });

  const survey = await prisma.anonymousSurvey.findUnique({ where: { id: surveyId }, select: { organizationId: true } });
  if (!survey) return NextResponse.json({ error: "Survey not found" }, { status: 404 });

  const actor = await getActor();
  if (!actor) throw new ApiError(401, "Unauthorized");
  await assertModulePermission(actor, survey.organizationId, "ANONYMOUS_SURVEY", "canView");

  const responses = await prisma.anonymousSurveyResponse.findMany({
    where: { surveyId },
    include: { answers: { include: { question: true } } },
    orderBy: { submittedAt: "desc" },
  });
  return NextResponse.json(responses);
});

export const POST = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const surveyId = await resolveSurveyId(params.id);
  if (!surveyId) return NextResponse.json({ error: "Survey not found" }, { status: 404 });

  const survey = await prisma.anonymousSurvey.findUnique({ where: { id: surveyId }, select: { status: true } });
  if (!survey || survey.status !== "PUBLISHED") {
    return NextResponse.json({ error: "This survey is not currently accepting responses" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`anon-survey-response:${ip}`, { limit: 30, windowMs: 60 * 60 * 1000 });
  if (!allowed) return rateLimited();

  const { answers } = await request.json();
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "At least one answer is required" }, { status: 400 });
  }

  const token = generateToken(24);
  const response = await prisma.anonymousSurveyResponse.create({
    data: { surveyId, token, answers: { create: answers.map((a: any) => ({ questionId: a.questionId, value: a.value })) } },
    include: { answers: true },
  });
  return NextResponse.json({ token: response.token }, { status: 201 });
});
