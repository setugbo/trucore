import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  anonymousSurvey: { findUnique: vi.fn() },
  anonymousSurveyResponse: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

vi.mock("@/lib/authz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/authz")>();
  return { ...actual, getActor: vi.fn(), assertModulePermission: vi.fn() };
});

import { getActor, assertModulePermission, ApiError } from "@/lib/authz";
import { GET } from "@/app/api/anonymous-surveys/[id]/responses/route";

describe("GET /api/anonymous-surveys/[id]/responses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an unauthenticated request instead of returning response data", async () => {
    mockPrisma.anonymousSurvey.findUnique.mockResolvedValue({ id: "survey1", organizationId: "org1" });
    (getActor as any).mockResolvedValue(null);

    const res = await GET(new Request("http://x") as any, { params: { id: "survey1" } });

    expect(res.status).toBe(401);
    expect(mockPrisma.anonymousSurveyResponse.findMany).not.toHaveBeenCalled();
  });

  it("rejects an authenticated caller from a different org", async () => {
    mockPrisma.anonymousSurvey.findUnique.mockResolvedValue({ id: "survey1", organizationId: "org1" });
    (getActor as any).mockResolvedValue({ userId: "u1", organizationId: "org2", roleType: "SYSTEM_ADMIN", isPlatformAdmin: false });
    (assertModulePermission as any).mockRejectedValue(new ApiError(403, "Forbidden"));

    const res = await GET(new Request("http://x") as any, { params: { id: "survey1" } });

    expect(res.status).toBe(403);
    expect(mockPrisma.anonymousSurveyResponse.findMany).not.toHaveBeenCalled();
  });

  it("returns responses for an authorized org member", async () => {
    mockPrisma.anonymousSurvey.findUnique.mockResolvedValue({ id: "survey1", organizationId: "org1" });
    (getActor as any).mockResolvedValue({ userId: "u1", organizationId: "org1", roleType: "SYSTEM_ADMIN", isPlatformAdmin: false });
    (assertModulePermission as any).mockResolvedValue(undefined);
    mockPrisma.anonymousSurveyResponse.findMany.mockResolvedValue([{ id: "r1" }]);

    const res = await GET(new Request("http://x") as any, { params: { id: "survey1" } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "r1" }]);
  });
});
