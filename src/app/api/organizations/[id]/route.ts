import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const org = await prisma.organization.findUnique({
      where: { id: params.id },
      include: { branding: true, modules: { include: { module: true } } },
    });
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(org);
  } catch (error) {
    console.error("Organization fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
