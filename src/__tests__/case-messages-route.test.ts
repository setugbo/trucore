import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  case: { findUnique: vi.fn() },
  caseMessage: { create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

vi.mock("@/lib/authz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/authz")>();
  return { ...actual, requireActor: vi.fn(), assertModulePermission: vi.fn() };
});

import { requireActor, assertModulePermission, ApiError } from "@/lib/authz";
import { POST } from "@/app/api/cases/[id]/messages/route";

describe("POST /api/cases/[id]/messages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a caller who lacks module permission on this case's org", async () => {
    (requireActor as any).mockResolvedValue({ userId: "u1", organizationId: "org1", roleType: "VIEWER", isPlatformAdmin: false });
    mockPrisma.case.findUnique.mockResolvedValue({ organizationId: "org2" });
    (assertModulePermission as any).mockRejectedValue(new ApiError(403, "Forbidden"));

    const req = new Request("http://x", { method: "POST", body: JSON.stringify({ content: "hi" }) });
    const res = await POST(req as any, { params: { id: "case1" } });

    expect(res.status).toBe(403);
    expect(mockPrisma.caseMessage.create).not.toHaveBeenCalled();
  });

  it("never trusts a client-supplied isFromReporter/senderId - the message is always attributed to the caller", async () => {
    (requireActor as any).mockResolvedValue({ userId: "u1", organizationId: "org1", roleType: "MODULE_ADMIN", isPlatformAdmin: false });
    mockPrisma.case.findUnique.mockResolvedValue({ organizationId: "org1" });
    (assertModulePermission as any).mockResolvedValue(undefined);
    mockPrisma.caseMessage.create.mockResolvedValue({ id: "m1" });

    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify({ content: "hello", isFromReporter: true, senderId: "someone-else" }),
    });
    const res = await POST(req as any, { params: { id: "case1" } });

    expect(res.status).toBe(201);
    expect(mockPrisma.caseMessage.create).toHaveBeenCalledWith({
      data: { caseId: "case1", senderId: "u1", content: "hello", isFromReporter: false },
    });
  });
});
