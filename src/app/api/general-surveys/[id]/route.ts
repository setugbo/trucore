import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateToken } from "@/lib/utils";

export const dynamic = 'force-dynamic';

async function resolveId(idOrLink: string) {
  let s = await prisma.generalSurvey.findUnique({ where: { id: idOrLink }, select: { id: true } });
  if (!s) s = await prisma.generalSurvey.findUnique({ where: { publicLink: idOrLink }, select: { id: true } });
  return s?.id || null;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = await resolveId(params.id);
    if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const survey = await prisma.generalSurvey.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: "asc" } }, _count: { select: { responses: true } } },
    });
    if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(survey);
  } catch (error) {
    console.error("Survey fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = await resolveId(params.id);
    if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const { title, description, category, formStyle, status, isPublic, startDate, endDate, questions } = body;

    // Only regenerate publicLink when publishing for the first time
    let publicLinkData = {};
    if (isPublic !== undefined) {
      const existing = await prisma.generalSurvey.findUnique({ where: { id }, select: { publicLink: true } });
      publicLinkData = isPublic
        ? { isPublic: true, publicLink: existing?.publicLink || generateToken(16) }
        : { isPublic: false, publicLink: null };
    }

    // CRITICAL FIX: Only delete & recreate questions if questions array is explicitly provided
    if (questions !== undefined) {
      await prisma.generalSurveyQuestion.deleteMany({ where: { surveyId: id } });
    }

    const survey = await prisma.generalSurvey.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(formStyle && { formStyle }),
        ...(status && { status }),
        ...publicLinkData,
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(questions !== undefined ? {
          questions: { create: questions.map((q: any, i: number) => ({
            type: q.type, title: q.title, description: q.description, required: q.required || false, order: q.order ?? i, options: q.options || null,
          })) },
        } : {}),
      },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json(survey);
  } catch (error) {
    console.error("Survey update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = await resolveId(params.id);
    if (!id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.generalSurvey.delete({ where: { id } });
    return NextResponse.json({ message: "Survey deleted" });
  } catch (error) {
    console.error("Survey delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
