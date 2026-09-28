"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  ClipboardList,
  EyeOff,
  Shield,
  BarChart3,
  Settings,
  Users,
  Building2,
  ChevronLeft,
  ShieldCheck,
  Globe,
} from "lucide-react";
import { useState, useEffect } from "react";

const sidebarItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Reports", href: "/dashboard/reports", icon: BarChart3 },
];

const moduleItems = [
  { title: "General Surveys", href: "/dashboard/general-surveys", icon: ClipboardList, module: "GENERAL_SURVEY" },
  { title: "Anonymous Surveys", href: "/dashboard/anonymous-surveys", icon: EyeOff, module: "ANONYMOUS_SURVEY" },
  { title: "Whistleblowing", href: "/dashboard/cases", icon: Shield, module: "WHISTLEBLOWING" },
];

const bottomItems = [
  { title: "Organization", href: "/dashboard/settings", icon: Building2 },
  { title: "Team", href: "/dashboard/settings?tab=team", icon: Users },
  { title: "Settings", href: "/dashboard/settings?tab=general", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [role, setRole] = useState<string>("");
  const [permLoading, setPermLoading] = useState(true);

  useEffect(() => {
    fetch("/api/permissions").then(r => r.json()).then(data => {
      setPermissions(data.permissions || []);
      setRole(data.role || "");
      setPermLoading(false);
    }).catch(() => setPermLoading(false));
  }, []);

  function hasModulePermission(moduleType: string): boolean {
    return permissions.some(p => p.moduleType === moduleType && p.canView);
  }

  const membership = (session?.user as any)?.membership;
  const isSuperAdmin = membership?.role?.type === "SYSTEM_ADMIN";
  const isPlatformAdmin = !!(session?.user as any)?.isPlatformAdmin;

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800">
              <span className="text-sm font-bold text-white">TC</span>
            </div>
            <span className="text-lg font-bold tracking-tight">TRUCORE</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800">
              <span className="text-sm font-bold text-white">TC</span>
            </div>
          </Link>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size={collapsed ? "icon" : "default"}
                  className={cn(
                    "w-full justify-start gap-3 font-normal",
                    collapsed && "justify-center px-0",
                    isActive && "bg-sidebar-accent font-medium"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Button>
              </Link>
            );
          })}

          {!permLoading && moduleItems.map((item) => {
            if (!hasModulePermission(item.module)) return null;
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size={collapsed ? "icon" : "default"}
                  className={cn(
                    "w-full justify-start gap-3 font-normal",
                    collapsed && "justify-center px-0",
                    isActive && "bg-sidebar-accent font-medium"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Button>
              </Link>
            );
          })}

          {isSuperAdmin && (
            <Link href="/dashboard/admin">
              <Button
                variant={pathname.startsWith("/dashboard/admin") ? "secondary" : "ghost"}
                size={collapsed ? "icon" : "default"}
                className={cn(
                  "w-full justify-start gap-3 font-normal mt-2",
                  collapsed && "justify-center px-0",
                  pathname.startsWith("/dashboard/admin") && "bg-amber-100 dark:bg-amber-950/30 font-medium text-amber-700 dark:text-amber-400"
                )}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Admin Panel</span>}
              </Button>
            </Link>
          )}

          {isPlatformAdmin && (
            <Link href="/dashboard/platform">
              <Button
                variant={pathname.startsWith("/dashboard/platform") ? "secondary" : "ghost"}
                size={collapsed ? "icon" : "default"}
                className={cn(
                  "w-full justify-start gap-3 font-normal",
                  collapsed && "justify-center px-0",
                  pathname.startsWith("/dashboard/platform") && "bg-violet-100 dark:bg-violet-950/30 font-medium text-violet-700 dark:text-violet-400"
                )}
              >
                <Globe className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Platform Admin</span>}
              </Button>
            </Link>
          )}
        </nav>

        <Separator className="my-4" />

        {isSuperAdmin && (
          <nav className="flex flex-col gap-1">
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.includes(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size={collapsed ? "icon" : "default"}
                    className={cn(
                      "w-full justify-start gap-3 font-normal",
                      collapsed && "justify-center px-0",
                      isActive && "bg-sidebar-accent font-medium"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </Button>
                </Link>
              );
            })}
          </nav>
        )}
      </ScrollArea>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className="w-full"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>
    </aside>
  );
}
