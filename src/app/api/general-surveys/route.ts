import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { requireActor, assertModulePermission, withErrorHandling } from "@/lib/authz";
import { surveySchema, questionSchema } from "@/lib/validations";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const createSurveySchema = surveySchema.extend({
  organizationId: z.string().min(1),
  questions: z.array(questionSchema).optional(),
});

export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }
  await assertModulePermission(actor, organizationId, "GENERAL_SURVEY", "canView");

  const surveys = await prisma.generalSurvey.findMany({
    where: { organizationId },
    include: {
      questions: { orderBy: { order: "asc" } },
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(surveys);
});

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireActor();
  const body = await request.json();

  const parsed = createSurveySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid survey" }, { status: 400 });
  }
  const data = parsed.data;
  await assertModulePermission(actor, data.organizationId, "GENERAL_SURVEY", "canCreate");

  const survey = await prisma.generalSurvey.create({
    data: {
      organizationId: data.organizationId,
      title: data.title,
      description: data.description,
      category: data.category,
      formStyle: data.formStyle,
      isPublic: data.isPublic,
      publicLink: data.isPublic ? generateToken(16) : null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      createdById: actor.userId,
      questions: {
        create: (data.questions || []).map((q, index) => ({
          type: q.type,
          title: q.title,
          description: q.description,
          required: q.required,
          order: q.order ?? index,
          options: q.options || null,
          conditionalLogic: q.conditionalLogic || null,
        })),
      },
    },
    include: {
      questions: { orderBy: { order: "asc" } },
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: data.organizationId,
      userId: actor.userId,
      action: "CREATE",
      entityType: "GeneralSurvey",
      entityId: survey.id,
      metadata: JSON.stringify({ title: data.title }),
    },
  });

  return NextResponse.json(survey, { status: 201 });
});
