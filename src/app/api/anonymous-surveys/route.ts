import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateToken } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const surveys = await prisma.anonymousSurvey.findMany({
      where: { organizationId },
      include: {
        questions: { orderBy: { order: "asc" } },
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(surveys);
  } catch (error) {
    console.error("Anonymous surveys fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { organizationId, title, description, category, formStyle, startDate, endDate, questions } = body;

    if (!organizationId || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const survey = await prisma.anonymousSurvey.create({
      data: {
        organizationId,
        title,
        description,
        category,
        formStyle: formStyle || "NOTION",
        publicLink: generateToken(16),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        questions: {
          create: (questions || []).map((q: any, index: number) => ({
            type: q.type,
            title: q.title,
            description: q.description,
            required: q.required || false,
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
        organizationId,
        userId,
        action: "CREATE",
        entityType: "AnonymousSurvey",
        entityId: survey.id,
        metadata: JSON.stringify({ title }),
      },
    });

    return NextResponse.json(survey, { status: 201 });
  } catch (error) {
    console.error("Anonymous survey create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
