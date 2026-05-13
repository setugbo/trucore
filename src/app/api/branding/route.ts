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

    const branding = await prisma.brandingConfig.findUnique({
      where: { organizationId },
    });

    return NextResponse.json(branding);
  } catch (error) {
    console.error("Branding fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, ...data } = await request.json();

    const userId = (session.user as any).id;
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const branding = await prisma.brandingConfig.upsert({
      where: { organizationId },
      update: {
        ...(data.primaryColor && { primaryColor: data.primaryColor }),
        ...(data.secondaryColor && { secondaryColor: data.secondaryColor }),
        ...(data.accentColor && { accentColor: data.accentColor }),
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.theme && { theme: data.theme }),
      },
      create: {
        organizationId,
        ...data,
      },
    });

    return NextResponse.json(branding);
  } catch (error) {
    console.error("Branding update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
