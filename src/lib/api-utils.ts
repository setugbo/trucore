import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function getSession() {
  return await getServerSession(authOptions);
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(error: any) {
  console.error("Server error:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function success(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function createAuditLog(params: {
  organizationId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: any;
  ipAddress?: string;
}) {
  const session = await getSession();
  return prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId || (session?.user as any)?.id,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ipAddress: params.ipAddress,
    },
  });
}
