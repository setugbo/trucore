import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const { content, isFromReporter } = await request.json();
    if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });
    const message = await prisma.caseMessage.create({
      data: { caseId: params.id, senderId: isFromReporter ? null : (userId || null), content, isFromReporter: isFromReporter || false },
    });
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Message create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
