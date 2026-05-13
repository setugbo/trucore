import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    let survey = await prisma.generalSurvey.findUnique({
      where: { id: params.id },
      include: { questions: { orderBy: { order: "asc" } }, _count: { select: { responses: true } } },
    });
    if (!survey) {
      survey = await prisma.generalSurvey.findUnique({
        where: { publicLink: params.id },
        include: { questions: { orderBy: { order: "asc" } }, _count: { select: { responses: true } } },
      });
    }
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
    const body = await request.json();
    const { title, description, category, formStyle, status, isPublic, startDate, endDate, questions } = body;
    await prisma.generalSurveyQuestion.deleteMany({ where: { surveyId: params.id } });
    const survey = await prisma.generalSurvey.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(formStyle && { formStyle }),
        ...(status && { status }),
        ...(isPublic !== undefined && { isPublic, publicLink: isPublic ? (await prisma.generalSurvey.findUnique({ where: { id: params.id } }))?.publicLink || null : null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        questions: { create: (questions || []).map((q: any, i: number) => ({ type: q.type, title: q.title, description: q.description, required: q.required || false, order: q.order ?? i, options: q.options || null })) },
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
    await prisma.generalSurvey.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Survey deleted" });
  } catch (error) {
    console.error("Survey delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
