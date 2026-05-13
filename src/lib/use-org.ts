"use client";

import { useSession } from "next-auth/react";

export function useOrgId(): string | null {
  const { data: session } = useSession();
  try {
    const memberships = (session?.user as any)?.memberships;
    if (Array.isArray(memberships) && memberships.length > 0) {
      return memberships[0]?.organizationId || null;
    }
  } catch {}
  return null;
}

export function useOrgSlug(): string | null {
  const { data: session } = useSession();
  try {
    const memberships = (session?.user as any)?.memberships;
    if (Array.isArray(memberships) && memberships.length > 0) {
      return memberships[0]?.organization?.slug || null;
    }
  } catch {}
  return null;
}
