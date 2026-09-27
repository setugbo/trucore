import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  rateLimitHit: {
    upsert: vi.fn(),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
}));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows requests at or under the limit", async () => {
    mockPrisma.rateLimitHit.upsert.mockResolvedValue({ count: 5 });
    expect(await checkRateLimit("key", { limit: 5, windowMs: 60_000 })).toBe(true);
  });

  it("blocks requests once the limit is exceeded", async () => {
    mockPrisma.rateLimitHit.upsert.mockResolvedValue({ count: 6 });
    expect(await checkRateLimit("key", { limit: 5, windowMs: 60_000 })).toBe(false);
  });
});

describe("getClientIp", () => {
  it("reads the first address out of x-forwarded-for", () => {
    const req = new Request("http://example.com", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("http://example.com", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("falls back to 'unknown' when no header is present", () => {
    const req = new Request("http://example.com");
    expect(getClientIp(req)).toBe("unknown");
  });
});
