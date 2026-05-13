import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json([
    { type: "GENERAL_SURVEY", name: "General Surveys", description: "Create and manage surveys", isEnabled: true },
    { type: "ANONYMOUS_SURVEY", name: "Anonymous Surveys", description: "Anonymous feedback collection", isEnabled: true },
    { type: "WHISTLEBLOWING", name: "Whistleblowing", description: "Confidential reporting", isEnabled: true },
  ]);
}
