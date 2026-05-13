"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/shared/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, Database, Building2, Users, Activity, History, Plus, Loader2, Globe, Settings } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function AdminPage() {
  const { data: session } = useSession();
  const [initializing, setInitializing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Create org dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [creating, setCreating] = useState(false);

  const memberships = (session?.user as any)?.memberships || [];
  const isSuperAdmin = memberships.some((m: any) => m.role.type === "SUPER_ADMIN");
  const orgId = memberships[0]?.organizationId;

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAuditLogs();
      fetchOrganizations();
      fetchAllUsers();
    }
  }, [isSuperAdmin, orgId]);

  async function fetchAuditLogs() {
    if (!orgId) return;
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/audit-logs?organizationId=${orgId}`);
      if (res.ok) setAuditLogs(await res.json());
    } catch {}
    finally { setLogsLoading(false); }
  }

  async function fetchOrganizations() {
    setOrgsLoading(true);
    try {
      const res = await fetch("/api/admin/organizations");
      if (res.ok) setOrganizations(await res.json());
    } catch {}
    finally { setOrgsLoading(false); }
  }

  async function fetchAllUsers() {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) setAllUsers(await res.json());
    } catch {}
    finally { setUsersLoading(false); }
  }

  async function initializeSystem() {
    if (!confirm("Initialize roles, permissions, and modules?")) return;
    setInitializing(true);
    try {
      const res = await fetch("/api/admin/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok) { setResult(data); toast.success("System initialized"); }
      else { toast.error(data.error || "Failed"); }
    } catch { toast.error("Failed"); }
    finally { setInitializing(false); }
  }

  async function createOrganization() {
    if (!newOrgName) { toast.error("Organization name is required"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName, slug: newOrgSlug || newOrgName.toLowerCase().replace(/\s+/g, "-") }),
      });
      if (res.ok) {
        toast.success("Organization created");
        setCreateOpen(false);
        setNewOrgName("");
        setNewOrgSlug("");
        fetchOrganizations();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed");
      }
    } catch { toast.error("Failed to create"); }
    finally { setCreating(false); }
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
      <PageHeader title="Admin Panel" description="System administration — full SaaS platform control" />

      <Tabs defaultValue="organizations">
        <TabsList>
          <TabsTrigger value="organizations" className="gap-2"><Globe className="h-4 w-4" /> Organizations</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="system" className="gap-2"><Database className="h-4 w-4" /> System</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2"><History className="h-4 w-4" /> Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Organizations</CardTitle>
                  <CardDescription>Manage tenant organizations on the platform</CardDescription>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2"><Plus className="h-4 w-4" /> New Organization</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Organization</DialogTitle>
                      <DialogDescription>Add a new tenant to the platform</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Organization Name *</Label>
                        <Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="Acme Corp" />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug (URL identifier)</Label>
                        <Input value={newOrgSlug} onChange={(e) => setNewOrgSlug(e.target.value)} placeholder="acme-corp" />
                      </div>
                      <Button onClick={createOrganization} disabled={creating} className="w-full">
                        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Organization
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {orgsLoading ? <Loading text="Loading organizations..." /> : organizations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No organizations yet</p>
              ) : (
                <div className="space-y-3">
                  {organizations.map((org: any) => (
                    <div key={org.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
                          <Building2 className="h-5 w-5 text-brand-600" />
                        </div>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground font-mono">{org.slug} &middot; {org._count?.users || 0} users</p>
                        </div>
                      </div>
                      <Badge variant={org.isActive !== false ? "success" : "secondary"}>
                        {org.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>View all users across all organizations</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? <Loading text="Loading users..." /> : allUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
              ) : (
                <div className="space-y-3">
                  {allUsers.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 text-sm font-medium text-brand-700">
                          {(u.name?.[0] || u.email?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{u.name || "Unnamed"}</p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={u.isActive ? "success" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                        <span className="text-xs text-muted-foreground">{u.memberships?.length || 0} org(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm">{result.message}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3 text-center"><p className="text-2xl font-bold">{result.roles}</p><p className="text-xs text-muted-foreground">Roles</p></div>
                      <div className="rounded-lg border p-3 text-center"><p className="text-2xl font-bold">{result.modules}</p><p className="text-xs text-muted-foreground">Modules</p></div>
                    </div>
                  </div>
                ) : (
                  <Button onClick={initializeSystem} disabled={initializing} className="gap-2">
                    {initializing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                    Initialize System
                  </Button>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-brand-600" />
                  <CardTitle>Platform Stats</CardTitle>
                </div>
                <CardDescription>Overview of the TRUCORE platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Organizations</span><span className="font-semibold">{organizations.length}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Total Users</span><span className="font-semibold">{allUsers.length}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Audit Events</span><span className="font-semibold">{auditLogs.length}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-brand-600" />
                  <CardTitle>Audit Log</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAuditLogs}>Refresh</Button>
              </div>
              <CardDescription>Track all administrative actions across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? <Loading text="Loading audit logs..." /> : auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No audit logs yet</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950">
                        <Activity className="h-4 w-4 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{log.action}</span>
                          <Badge variant="outline" className="text-[10px]">{log.entityType}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{log.user?.name || log.user?.email || "System"}</p>
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
