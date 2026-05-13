import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  try {
    const org = await prisma.organization.findUnique({
      where: { publicReportSlug: params.slug },
      select: { id: true, name: true, slug: true, publicReportSlug: true },
    });
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(org);
  } catch (error) {
    console.error("Org lookup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
