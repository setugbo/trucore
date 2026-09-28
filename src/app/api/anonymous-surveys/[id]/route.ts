import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getActor, assertModulePermission, withErrorHandling } from "@/lib/authz";

export const dynamic = 'force-dynamic';

async function resolveId(idOrLink: string) {
  let s = await prisma.anonymousSurvey.findUnique({ where: { id: idOrLink }, select: { id: true } });
  if (!s) s = await prisma.anonymousSurvey.findUnique({ where: { publicLink: idOrLink }, select: { id: true } });
  return s?.id || null;
}

export const GET = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const id = await resolveId(params.id);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const survey = await prisma.anonymousSurvey.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } }, _count: { select: { responses: true } } },
  });
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isPubliclyViewable = survey.status === "PUBLISHED";
  if (!isPubliclyViewable) {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertModulePermission(actor, survey.organizationId, "ANONYMOUS_SURVEY", "canView");
  }

  return NextResponse.json(survey);
});

export const PUT = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const id = await resolveId(params.id);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.anonymousSurvey.findUnique({ where: { id }, select: { organizationId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await assertModulePermission(actor, existing.organizationId, "ANONYMOUS_SURVEY", "canEdit");

  const body = await request.json();
  const { title, description, category, formStyle, status, startDate, endDate, questions } = body;

  if (questions !== undefined) {
    await prisma.anonymousSurveyQuestion.deleteMany({ where: { surveyId: id } });
  }

  const survey = await prisma.anonymousSurvey.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(formStyle && { formStyle }),
      ...(status && { status }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(questions !== undefined ? {
        questions: { create: questions.map((q: any, i: number) => ({
          type: q.type, title: q.title, description: q.description, required: q.required || false, order: q.order ?? i, options: q.options || null, conditionalLogic: q.conditionalLogic || null,
        })) },
      } : {}),
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(survey);
});

export const DELETE = withErrorHandling(async (request: Request, { params }: { params: { id: string } }) => {
  const id = await resolveId(params.id);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.anonymousSurvey.findUnique({ where: { id }, select: { organizationId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await assertModulePermission(actor, existing.organizationId, "ANONYMOUS_SURVEY", "canDelete");

  await prisma.anonymousSurvey.delete({ where: { id } });
  return NextResponse.json({ message: "Survey deleted" });
});
