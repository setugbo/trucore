"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/shared/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Database, Activity, History } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function AdminPage() {
  const { data: session } = useSession();
  const [initializing, setInitializing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const memberships = (session?.user as any)?.memberships || [];
  const isSuperAdmin = memberships.some((m: any) => m.role.type === "SUPER_ADMIN");
  const orgId = memberships[0]?.organizationId;

  useEffect(() => {
    if (isSuperAdmin && orgId) fetchAuditLogs();
  }, [isSuperAdmin, orgId]);

  async function fetchAuditLogs() {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/audit-logs?organizationId=${orgId}`);
      if (res.ok) setAuditLogs(await res.json());
    } catch (err) { console.error(err); }
    finally { setLogsLoading(false); }
  }

  async function initializeSystem() {
    if (!confirm("This will initialize roles, permissions, and modules. Continue?")) return;
    setInitializing(true);
    try {
      const res = await fetch("/api/admin/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok) { setResult(data); toast.success("System initialized successfully"); }
      else { toast.error(data.error || "Initialization failed"); }
    } catch { toast.error("Failed to initialize system"); }
    finally { setInitializing(false); }
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground mt-2">Only Super Admins can access this page.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Admin Panel" description="System administration and audit" />

      <Tabs defaultValue="system">
        <TabsList>
          <TabsTrigger value="system" className="gap-2"><Database className="h-4 w-4" /> System</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2"><History className="h-4 w-4" /> Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-brand-600" />
                  <CardTitle>System Initialization</CardTitle>
                </div>
                <CardDescription>Set up roles, permissions, and modules</CardDescription>
              </CardHeader>
              <CardContent>
                {result ? (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm text-emerald-800 dark:text-emerald-200">
                      {result.message}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold">{result.roles}</p>
                        <p className="text-xs text-muted-foreground">Roles Created</p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold">{result.modules}</p>
                        <p className="text-xs text-muted-foreground">Modules Created</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button onClick={initializeSystem} disabled={initializing}>
                    {initializing ? <Loading size="sm" /> : "Initialize System"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-brand-600" />
                  <CardTitle>Activity Log</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAuditLogs}>Refresh</Button>
              </div>
              <CardDescription>Track all administrative actions and changes</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? <Loading text="Loading audit logs..." /> : auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No audit logs yet</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950 shrink-0">
                        <Activity className="h-4 w-4 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{log.action}</span>
                          <Badge variant="outline" className="text-[10px]">{log.entityType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {log.user?.name || log.user?.email || "System"} &middot; {log.entityId && `ID: ${log.entityId.substring(0, 8)}...`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDateTime(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
