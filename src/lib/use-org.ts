"use client";

import { useSession } from "next-auth/react";

export function useOrgId(): string | null {
  const { data: session } = useSession();
  try {
    const membership = (session?.user as any)?.membership;
    if (membership) {
      return membership?.organizationId || null;
    }
  } catch {}
  return null;
}

export function useOrgSlug(): string | null {
  const { data: session } = useSession();
  try {
    const membership = (session?.user as any)?.membership;
    if (membership) {
      return membership?.organization?.slug || null;
    }
  } catch {}
  return null;
}
