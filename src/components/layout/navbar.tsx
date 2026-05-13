"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getInitials, formatDateTime } from "@/lib/utils";
import { Bell, LogOut, User, Settings, CheckCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useOrgId } from "@/lib/use-org";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Navbar() {
  const { data: session } = useSession();
  const orgId = useOrgId();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [orgId]);

  async function fetchNotifications() {
    try {
      const res = await fetch(`/api/notifications?organizationId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  }

  async function markAllRead() {
    try {
      await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAll: true }) });
      setUnreadCount(0);
      setNotifications((prev: any[]) => prev.map((n: any) => ({ ...n, isRead: true })));
    } catch {}
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
      <div className="flex-1" />

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Button variant="ghost" size="icon-sm" onClick={markAllRead} title="Mark all as read">
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="h-72">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No notifications yet</div>
            ) : (
              notifications.slice(0, 20).map((n: any) => (
                <DropdownMenuItem key={n.id} className={`p-3 ${!n.isRead ? "bg-brand-50 dark:bg-brand-950/20" : ""}`} asChild>
                  <Link href={n.link || "#"} className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-sm font-medium flex-1">{n.title}</span>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-brand-600 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                  </Link>
                </DropdownMenuItem>
              ))
            )}
          </ScrollArea>
          {notifications.length > 20 && <DropdownMenuSeparator />}
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback className="text-xs">{getInitials(session?.user?.name || "U")}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium">{session?.user?.name}</span>
              <span className="text-xs text-muted-foreground">{session?.user?.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings"><User className="mr-2 h-4 w-4" /> Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
