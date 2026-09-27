import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

const mockPrisma = vi.hoisted(() => ({
  membership: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  userModulePermission: { findFirst: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { getServerSession } from "next-auth";
import {
  getActor,
  assertOrgAccess,
  assertModulePermission,
  assertPlatformAdmin,
  ApiError,
  type Actor,
} from "@/lib/authz";

describe("getActor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when there is no session", async () => {
    (getServerSession as any).mockResolvedValue(null);
    expect(await getActor()).toBeNull();
  });

  it("returns null when the caller's org has been deactivated", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.membership.findUnique.mockResolvedValue({
      organizationId: "org1",
      role: { type: "SYSTEM_ADMIN" },
      organization: { isActive: false },
    });
    mockPrisma.user.findUnique.mockResolvedValue({ isActive: true, isPlatformAdmin: false });
    expect(await getActor()).toBeNull();
  });

  it("still works for a platform admin even if their own org is deactivated", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.membership.findUnique.mockResolvedValue({
      organizationId: "org1",
      role: { type: "SYSTEM_ADMIN" },
      organization: { isActive: false },
    });
    mockPrisma.user.findUnique.mockResolvedValue({ isActive: true, isPlatformAdmin: true });
    expect(await getActor()).not.toBeNull();
  });

  it("returns a populated actor for a valid session", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.membership.findUnique.mockResolvedValue({
      organizationId: "org1",
      role: { type: "MODULE_ADMIN" },
      organization: { isActive: true },
    });
    mockPrisma.user.findUnique.mockResolvedValue({ isActive: true, isPlatformAdmin: false });

    expect(await getActor()).toEqual({
      userId: "u1",
      organizationId: "org1",
      roleType: "MODULE_ADMIN",
      isPlatformAdmin: false,
    });
  });
});

describe("assertOrgAccess", () => {
  const actor: Actor = { userId: "u1", organizationId: "org1", roleType: "VIEWER", isPlatformAdmin: false };

  it("allows access to the actor's own org", () => {
    expect(() => assertOrgAccess(actor, "org1")).not.toThrow();
  });

  it("rejects access to a different org", () => {
    expect(() => assertOrgAccess(actor, "org2")).toThrow(ApiError);
  });

  it("lets a platform admin through regardless of org", () => {
    const admin: Actor = { ...actor, isPlatformAdmin: true };
    expect(() => assertOrgAccess(admin, "org2")).not.toThrow();
  });
});

describe("assertModulePermission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a cross-org request before ever checking module permissions", async () => {
    const actor: Actor = { userId: "u1", organizationId: "org1", roleType: "VIEWER", isPlatformAdmin: false };
    await expect(assertModulePermission(actor, "org2", "WHISTLEBLOWING", "canView")).rejects.toThrow(ApiError);
    expect(mockPrisma.userModulePermission.findFirst).not.toHaveBeenCalled();
  });

  it("lets a SYSTEM_ADMIN of the same org through without a permission row", async () => {
    const actor: Actor = { userId: "u1", organizationId: "org1", roleType: "SYSTEM_ADMIN", isPlatformAdmin: false };
    await expect(assertModulePermission(actor, "org1", "WHISTLEBLOWING", "canEdit")).resolves.toBeUndefined();
    expect(mockPrisma.userModulePermission.findFirst).not.toHaveBeenCalled();
  });

  it("falls through to the real UserModulePermission row for a VIEWER", async () => {
    const actor: Actor = { userId: "u1", organizationId: "org1", roleType: "VIEWER", isPlatformAdmin: false };

    mockPrisma.userModulePermission.findFirst.mockResolvedValue({ canView: true });
    await expect(assertModulePermission(actor, "org1", "WHISTLEBLOWING", "canView")).resolves.toBeUndefined();

    mockPrisma.userModulePermission.findFirst.mockResolvedValue({ canView: false });
    await expect(assertModulePermission(actor, "org1", "WHISTLEBLOWING", "canView")).rejects.toThrow(ApiError);

    mockPrisma.userModulePermission.findFirst.mockResolvedValue(null);
    await expect(assertModulePermission(actor, "org1", "WHISTLEBLOWING", "canView")).rejects.toThrow(ApiError);
  });
});

describe("assertPlatformAdmin", () => {
  it("throws for a non-platform-admin", () => {
    const actor: Actor = { userId: "u1", organizationId: "org1", roleType: "SYSTEM_ADMIN", isPlatformAdmin: false };
    expect(() => assertPlatformAdmin(actor)).toThrow(ApiError);
  });

  it("allows a platform admin", () => {
    const actor: Actor = { userId: "u1", organizationId: "org1", roleType: "VIEWER", isPlatformAdmin: true };
    expect(() => assertPlatformAdmin(actor)).not.toThrow();
  });
});
