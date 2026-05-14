"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { ArrowRight, Shield, ClipboardList, EyeOff, BarChart3, Lock, Mail, AlertTriangle, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const features = [
    {
      icon: ClipboardList,
      title: "General Surveys",
      description: "Create and distribute professional surveys with identifiable responses.",
    },
    {
      icon: EyeOff,
      title: "Anonymous Surveys",
      description: "Collect honest feedback with complete anonymity guarantees.",
    },
    {
      icon: Shield,
      title: "Whistleblowing",
      description: "Secure case management with anonymous two-way communication.",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Powerful insights with charts, trends, and exportable reports.",
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "RBAC, audit logs, tenant isolation, and data encryption.",
    },
    {
      icon: Mail,
      title: "Email Notifications",
      description: "Automated SMTP-based email system for invites and updates.",
    },
  ];

  return (
    <div className="min-h-screen">
      <header className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
                <Button>Request Access</Button>
              </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 to-transparent dark:from-brand-950/20" />
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-brand-600" />
            Enterprise-grade communication platform
          </div>
          <h1 className="mt-8 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Speak Freely.
            <br />
            <span className="gradient-primary bg-clip-text text-transparent">Report Safely.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            TRUCORE empowers organizations to foster transparency, collect honest feedback,
            and manage confidential reports with enterprise-grade security.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="xl" className="gap-2">
                Request Access <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="xl">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Everything you need</h2>
            <p className="mt-2 text-muted-foreground">
              Complete toolkit for organizational communication and reporting.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-xl border bg-card p-6 transition-all hover:shadow-md hover:border-brand-200 dark:hover:border-brand-800"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-brand-600" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Public Report CTA */}
      <section className="border-t bg-gradient-to-br from-brand-50 to-white dark:from-brand-950 dark:to-background py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-amber-100 dark:bg-amber-900/30 px-4 py-1.5 text-sm text-amber-700 dark:text-amber-300 mb-6">
            <AlertTriangle className="h-4 w-4" /> Need to report a concern?
          </div>
          <h2 className="text-3xl font-bold">Speak Up. Stay Safe.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Our secure whistleblowing portal allows anyone to submit confidential reports without creating an account.
            Your identity is protected and all communications are encrypted.
          </p>
          <div className="mt-8">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/whistleblowing">
                <Button size="xl" className="gap-2">
                  <Shield className="h-5 w-5" /> Submit a Confidential Report
                </Button>
              </Link>
              <Link href="/track">
                <Button variant="outline" size="xl" className="gap-2">
                  <Search className="h-5 w-5" /> Track a Report
                </Button>
              </Link>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No account needed. No tracking. Complete anonymity guaranteed.
          </p>
        </div>
      </section>

      <footer className="border-t py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Logo />
            <p className="text-sm text-muted-foreground">
              &copy; 2026 TRUCORE. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
