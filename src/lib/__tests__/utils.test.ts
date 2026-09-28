import { describe, it, expect } from "vitest";
import { generateReportToken, generateToken, generateCaseId, generatePassword } from "@/lib/utils";

describe("generateReportToken", () => {
  it("matches the TC-######-XXXXXXXX format", () => {
    expect(generateReportToken()).toMatch(/^TC-\d{6}-[A-Z0-9]{8}$/);
  });

  it("produces unique tokens across many calls", () => {
    const tokens = new Set(Array.from({ length: 2000 }, () => generateReportToken()));
    expect(tokens.size).toBe(2000);
  });
});

describe("generateToken", () => {
  it("respects the requested length", () => {
    expect(generateToken(16)).toHaveLength(16);
    expect(generateToken(32)).toHaveLength(32);
  });

  it("produces unique tokens across many calls", () => {
    const tokens = new Set(Array.from({ length: 500 }, () => generateToken(24)));
    expect(tokens.size).toBe(500);
  });
});

describe("generateCaseId", () => {
  it("starts with the TC- prefix", () => {
    expect(generateCaseId()).toMatch(/^TC-/);
  });
});

describe("generatePassword", () => {
  it("contains at least one uppercase, lowercase letter and digit", () => {
    for (let i = 0; i < 20; i++) {
      const pw = generatePassword();
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[0-9]/);
    }
  });

  it("respects the requested length", () => {
    expect(generatePassword(20)).toHaveLength(20);
  });
});
