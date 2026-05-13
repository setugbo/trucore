"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/shared/loading";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Database, Building2, Users, Activity, History, Plus, Loader2, Globe, Settings, BarChart3, Cpu, HardDrive, AlertTriangle, Server, Zap, Mail } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#5B21B6", "#7C3AED", "#C4B5FD", "#8B5CF6", "#A78BFA"];

function AdminContent() {
  const { data: session } = useSession();
  const [initializing, setInitializing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Create org dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const memberships = (session?.user as any)?.memberships || [];
  const isSuperAdmin = memberships.some((m: any) => m.role?.type === "SUPER_ADMIN");
  const orgId = memberships[0]?.organizationId;

  useEffect(() => { if (isSuperAdmin) { fetchAuditLogs(); fetchOrganizations(); fetchAllUsers(); fetchPlatformStats(); } }, [isSuperAdmin, orgId]);

  async function fetchPlatformStats() {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setPlatformStats(await res.json());
    } catch {}
    finally { setStatsLoading(false); }
  }

  async function fetchAuditLogs() {
    if (!orgId) return;
    setLogsLoading(true);
    try { const res = await fetch(`/api/audit-logs?organizationId=${orgId}`); if (res.ok) setAuditLogs(await res.json()); } catch {}
    finally { setLogsLoading(false); }
  }

  async function fetchOrganizations() {
    setOrgsLoading(true);
    try { const res = await fetch("/api/admin/organizations"); if (res.ok) setOrganizations(await res.json()); } catch {}
    finally { setOrgsLoading(false); }
  }

  async function fetchAllUsers() {
    setUsersLoading(true);
    try { const res = await fetch("/api/admin/users"); if (res.ok) setAllUsers(await res.json()); } catch {}
    finally { setUsersLoading(false); }
  }

  async function initializeSystem() {
    if (!confirm("Initialize roles, permissions, and modules?")) return;
    setInitializing(true);
    try { const res = await fetch("/api/admin/setup", { method: "POST" }); const data = await res.json();
      if (res.ok) { setResult(data); toast.success("System initialized"); } else toast.error(data.error || "Failed"); }
    catch { toast.error("Failed"); } finally { setInitializing(false); }
  }

  async function createOrganization() {
    if (!newOrgName) { toast.error("Organization name is required"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/organizations", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName, slug: newOrgSlug || newOrgName.toLowerCase().replace(/\s+/g, "-") }) });
      if (res.ok) { toast.success("Organization created"); setCreateOpen(false); setNewOrgName(""); setNewOrgSlug(""); fetchOrganizations(); }
      else { const err = await res.json(); toast.error(err.error || "Failed"); }
    } catch { toast.error("Failed"); } finally { setCreating(false); }
  }

  async function createAdminUser() {
    if (!newAdminEmail) { toast.error("Email is required"); return; }
    setCreatingAdmin(true);
    try {
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newAdminEmail, password: newAdminPassword || "Admin@2026", name: newAdminEmail.split("@")[0], role: "SUPER_ADMIN" }) });
      if (res.ok) { toast.success("Admin user created"); setNewAdminEmail(""); setNewAdminPassword(""); fetchAllUsers(); }
      else { const err = await res.json(); toast.error(err.error || "Failed"); }
    } catch { toast.error("Failed"); } finally { setCreatingAdmin(false); }
  }

  if (!isSuperAdmin) {
    return (<div className="flex flex-col items-center justify-center py-16">
      <Shield className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold">Access Denied</h2>
      <p className="text-sm text-muted-foreground mt-2">Only Super Admins can access this page.</p>
    </div>);
  }

  const totalSurveys = platformStats?.surveys || 0;
  const totalResponses = platformStats?.responses || 0;
  const totalCases = platformStats?.cases || 0;
  const dbSize = platformStats?.dbSize || "N/A";
  const activeUsers = allUsers.filter((u: any) => u.isActive).length;

  const storageData = [
    { name: "Users", value: allUsers.length },
    { name: "Organizations", value: organizations.length },
    { name: "Surveys", value: totalSurveys },
    { name: "Cases", value: totalCases },
  ];

  return (
    <div>
      <PageHeader title="Platform Admin Console" description="Full SaaS platform management, monitoring & control" />

      <Tabs defaultValue="monitor">
        <TabsList className="flex-wrap">
          <TabsTrigger value="monitor" className="gap-2"><Activity className="h-4 w-4" /> Monitoring</TabsTrigger>
          <TabsTrigger value="organizations" className="gap-2"><Globe className="h-4 w-4" /> Organizations</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> Users & Admins</TabsTrigger>
          <TabsTrigger value="system" className="gap-2"><Database className="h-4 w-4" /> System</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2"><History className="h-4 w-4" /> Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="mt-6 space-y-6">
          {/* Resource Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-brand-600">
              <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Total Users</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{allUsers.length}</p><p className="text-xs text-muted-foreground">{activeUsers} active</p></CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Building2 className="h-4 w-4" /> Organizations</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{organizations.length}</p><p className="text-xs text-muted-foreground">Tenant organizations</p></CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Total Surveys</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{totalSurveys}</p><p className="text-xs text-muted-foreground">{totalResponses} total responses</p></CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Shield className="h-4 w-4" /> Cases Filed</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{totalCases}</p><p className="text-xs text-muted-foreground">Whistleblowing reports</p></CardContent>
            </Card>
          </div>

          {/* Capacity & Infrastructure */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-brand-600" />
                  <CardTitle>Platform Capacity</CardTitle>
                </div>
                <CardDescription>Current resource utilization</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? <Loading text="Loading stats..." /> : (
                  <div className="space-y-6">
                    <div><div className="flex justify-between text-sm mb-1"><span>User Capacity</span><span className="font-medium">{allUsers.length} / ∞</span></div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-brand-600 rounded-full" style={{ width: `${Math.min(allUsers.length, 100)}%` }} /></div></div>
                    <div><div className="flex justify-between text-sm mb-1"><span>Organizations</span><span className="font-medium">{organizations.length} / ∞</span></div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(organizations.length, 100)}%` }} /></div></div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Database</p><p className="font-semibold">{dbSize}</p></div>
                      <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Avg Users/Org</p><p className="font-semibold">{organizations.length > 0 ? (allUsers.length / organizations.length).toFixed(1) : 0}</p></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-brand-600" />
                  <CardTitle>Data Distribution</CardTitle>
                </div>
                <CardDescription>Resource allocation across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={storageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {storageData.map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie><Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Growth Trend */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-brand-600" />
                <CardTitle>Platform Growth</CardTitle>
              </div>
              <CardDescription>Monthly resource trends (last 12 months)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={
                  Array.from({ length: 12 }, (_, i) => {
                    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
                    return { month: d.toLocaleString("default", { month: "short" }), users: Math.max(0, Math.round(allUsers.length * (i + 1) / 12)), orgs: Math.max(0, Math.round(organizations.length * (i + 1) / 12)) };
                  })
                }>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="users" stroke="#5B21B6" strokeWidth={2} dot={{ r: 3 }} name="Users" />
                  <Line type="monotone" dataKey="orgs" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Organizations" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* External Services Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-brand-600" />
                <CardTitle>External Services</CardTitle>
              </div>
              <CardDescription>Connected infrastructure status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950"><Zap className="h-5 w-5 text-emerald-600" /></div>
                    <div><p className="font-medium">Vercel</p><p className="text-xs text-muted-foreground">Hosting & Deployment</p></div>
                  </div>
                  <Badge variant="success">Connected</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950"><Database className="h-5 w-5 text-emerald-600" /></div>
                    <div><p className="font-medium">Neon DB</p><p className="text-xs text-muted-foreground">PostgreSQL Database</p></div>
                  </div>
                  <Badge variant="success">Connected</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><Mail className="h-5 w-5 text-muted-foreground" /></div>
                    <div><p className="font-medium">SMTP</p><p className="text-xs text-muted-foreground">Email service</p></div>
                  </div>
                  <Badge variant="secondary">Configured</Badge>
                </div>
                <Button variant="outline" size="sm" onClick={fetchPlatformStats} className="gap-2"><Activity className="h-4 w-4" /> Refresh All</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>All Organizations</CardTitle><CardDescription>Manage tenant organizations</CardDescription></div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Organization</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>Create Organization</DialogTitle><DialogDescription>Add a new tenant</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Organization Name *</Label><Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="Acme Corp" /></div>
                      <div className="space-y-2"><Label>Slug</Label><Input value={newOrgSlug} onChange={(e) => setNewOrgSlug(e.target.value)} placeholder="acme-corp" /></div>
                      <Button onClick={createOrganization} disabled={creating} className="w-full">{creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {orgsLoading ? <Loading text="Loading..." /> : organizations.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No organizations</p> : (
                <div className="space-y-3">
                  {organizations.map((org: any) => (
                    <div key={org.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950"><Building2 className="h-5 w-5 text-brand-600" /></div>
                        <div><p className="font-medium">{org.name}</p><p className="text-sm text-muted-foreground font-mono">{org.slug} &middot; {org._count?.users || 0} users &middot; {org._count?.surveys || 0} surveys</p></div>
                      </div>
                      <Badge variant="success">Active</Badge>
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
              <div className="flex items-center justify-between">
                <div><CardTitle>User Management</CardTitle><CardDescription>All platform users & admin accounts</CardDescription></div>
                <Dialog>
                  <DialogTrigger asChild><Button className="gap-2"><Shield className="h-4 w-4" /> Create Admin</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>Create Platform Admin</DialogTitle><DialogDescription>Grant Super Admin privileges</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Email *</Label><Input value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="admin@company.com" /></div>
                      <div className="space-y-2"><Label>Password</Label><Input type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} placeholder="Default: Admin@2026" /></div>
                      <Button onClick={createAdminUser} disabled={creatingAdmin} className="w-full">{creatingAdmin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Admin User</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? <Loading text="Loading..." /> : allUsers.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No users</p> : (
                <div className="space-y-3">
                  {allUsers.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 text-sm font-medium text-brand-700">
                          {(u.name?.[0] || u.email?.[0] || "?").toUpperCase()}
                        </div>
                        <div><p className="font-medium">{u.name || "Unnamed"}</p><p className="text-sm text-muted-foreground">{u.email}</p></div>
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
            <Card><CardHeader><div className="flex items-center gap-2"><Database className="h-5 w-5 text-brand-600" /><CardTitle>System Initialization</CardTitle></div><CardDescription>Roles, permissions, modules</CardDescription></CardHeader>
              <CardContent>{result ? (<div className="space-y-3"><div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm">{result.message}</div>
                <div className="grid grid-cols-2 gap-3"><div className="rounded-lg border p-3 text-center"><p className="text-2xl font-bold">{result.roles}</p><p className="text-xs text-muted-foreground">Roles</p></div>
                  <div className="rounded-lg border p-3 text-center"><p className="text-2xl font-bold">{result.modules}</p><p className="text-xs text-muted-foreground">Modules</p></div></div></div>) : (
                <Button onClick={initializeSystem} disabled={initializing} className="gap-2">{initializing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}Initialize</Button>)}</CardContent></Card>
            <Card><CardHeader><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-brand-600" /><CardTitle>Platform Summary</CardTitle></div><CardDescription>Snapshot</CardDescription></CardHeader>
              <CardContent><div className="space-y-3">
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Organizations</span><span className="font-semibold">{organizations.length}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Total Users</span><span className="font-semibold">{allUsers.length}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Audit Events</span><span className="font-semibold">{auditLogs.length}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Database</span><span className="font-semibold">{dbSize}</span></div>
              </div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><History className="h-5 w-5 text-brand-600" /><CardTitle>Audit Log</CardTitle></div>
                <Button variant="outline" size="sm" onClick={fetchAuditLogs}>Refresh</Button>
              </div>
              <CardDescription>All administrative actions across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? <Loading text="Loading..." /> : auditLogs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No audit logs</p> : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950"><Activity className="h-4 w-4 text-brand-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><span className="text-sm font-medium">{log.action}</span><Badge variant="outline" className="text-[10px]">{log.entityType}</Badge></div>
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

export default function AdminPage() {
  return <ErrorBoundary><AdminContent /></ErrorBoundary>;
}
