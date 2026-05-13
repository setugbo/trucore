import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateToken } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const responses = await prisma.anonymousSurveyResponse.findMany({
      where: { surveyId: params.id },
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
    const { answers } = await request.json();
    const token = generateToken(24);
    const response = await prisma.anonymousSurveyResponse.create({
      data: { surveyId: params.id, token, answers: { create: answers.map((a: any) => ({ questionId: a.questionId, value: a.value })) } },
      include: { answers: true },
    });
    return NextResponse.json({ token: response.token }, { status: 201 });
  } catch (error) {
    console.error("Anonymous response error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
