import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    const modules = await prisma.organizationModule.findMany({
      where: { organizationId },
      include: { module: true },
    });

    return NextResponse.json(modules);
  } catch (error) {
    console.error("Modules fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationModuleId, isEnabled } = await request.json();

    const updated = await prisma.organizationModule.update({
      where: { id: organizationModuleId },
      data: { isEnabled },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Module update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
