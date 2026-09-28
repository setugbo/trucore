import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomInt } from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(date));
}

/** Picks a cryptographically random index in [0, max). */
function secureIndex(max: number): number {
  return randomInt(0, max);
}

function randomChars(alphabet: string, length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(secureIndex(alphabet.length));
  }
  return result;
}

export function generatePassword(length = 12): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const all = upper + lower + digits;
  const chars = [
    upper[secureIndex(upper.length)],
    lower[secureIndex(lower.length)],
    digits[secureIndex(digits.length)],
    ...Array.from({ length: Math.max(0, length - 3) }, () => all[secureIndex(all.length)]),
  ];
  // Fisher-Yates shuffle using a CSPRNG instead of Math.random().
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** Cryptographically-random opaque token (e.g. password-reset tokens). */
export function generateToken(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return randomChars(chars, length);
}

/**
 * Whistleblower tracking code. This is a bearer credential that stands in for
 * authentication on the public /track page, so it needs real entropy (not just
 * a "looks random" format) and a wide enough keyspace to resist brute force
 * even behind rate limiting.
 */
export function generateReportToken(): string {
  const prefix = "TC";
  const digits = "0123456789";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  const nums = randomChars(digits, 6);
  const code = randomChars(chars, 8);
  return `${prefix}-${nums}-${code}`;
}

/** Display/reference ID only - not used for access control, so no CSPRNG requirement. */
export function generateCaseId(): string {
  const prefix = "TC";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomChars("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 4);
  return `${prefix}-${timestamp}-${random}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}
