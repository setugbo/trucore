import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const responses = await prisma.generalSurveyResponse.findMany({
      where: { surveyId: params.id },
      include: { user: { select: { id: true, name: true, email: true } }, answers: { include: { question: true } } },
      orderBy: { submittedAt: "desc" },
    });
    return NextResponse.json(responses);
  } catch (error) {
    console.error("Responses fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const { answers } = await request.json();
    const response = await prisma.generalSurveyResponse.create({
      data: { surveyId: params.id, userId, answers: { create: answers.map((a: any) => ({ questionId: a.questionId, value: a.value })) } },
      include: { answers: true },
    });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Response create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
