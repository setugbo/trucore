"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Loading } from "@/components/shared/loading";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading text="Loading..." />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
