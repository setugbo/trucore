import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateToken } from "@/lib/utils";

export const dynamic = 'force-dynamic';

async function resolveSurveyId(idOrLink: string): Promise<string | null> {
  let survey = await prisma.anonymousSurvey.findUnique({ where: { id: idOrLink }, select: { id: true } });
  if (!survey) {
    survey = await prisma.anonymousSurvey.findUnique({ where: { publicLink: idOrLink }, select: { id: true } });
  }
  return survey?.id || null;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const surveyId = await resolveSurveyId(params.id);
    if (!surveyId) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    const responses = await prisma.anonymousSurveyResponse.findMany({
      where: { surveyId },
      include: { answers: { include: { question: true } } },
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
    const surveyId = await resolveSurveyId(params.id);
    if (!surveyId) return NextResponse.json({ error: "Survey not found" }, { status: 404 });

    const { answers } = await request.json();
    const token = generateToken(24);
    const response = await prisma.anonymousSurveyResponse.create({
      data: { surveyId, token, answers: { create: answers.map((a: any) => ({ questionId: a.questionId, value: a.value })) } },
      include: { answers: true },
    });
    return NextResponse.json({ token: response.token }, { status: 201 });
  } catch (error) {
    console.error("Anonymous response error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
