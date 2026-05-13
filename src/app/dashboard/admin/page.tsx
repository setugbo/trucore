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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Building2, Users, Activity, History, Plus, Loader2, Globe, Settings, BarChart3, Cpu, HardDrive, Server, Zap, Mail, Link2, UserPlus, UserMinus, Trash2, Edit3, Eye, Palette, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#5B21B6", "#7C3AED", "#C4B5FD", "#8B5CF6", "#A78BFA"];

function AdminContent() {
  const { data: session } = useSession();
  const [tab, setTab] = useState("dashboard");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [orgDetail, setOrgDetail] = useState<any>(null);
  const [orgDetailLoading, setOrgDetailLoading] = useState(false);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editBrandingOpen, setEditBrandingOpen] = useState(false);

  // Forms
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviting, setInviting] = useState(false);

  // Branding form
  const [brandColors, setBrandColors] = useState({ primaryColor: "#5B21B6", secondaryColor: "#7C3AED", accentColor: "#C4B5FD", companyName: "" });
  const [savingBranding, setSavingBranding] = useState(false);

  const membership = (session?.user as any)?.membership;
  const isSuperAdmin = membership?.role?.type === "SYSTEM_ADMIN";
  const orgId = membership?.organizationId;

  useEffect(() => {
    if (isSuperAdmin) { fetchOrganizations(); fetchAllUsers(); fetchPlatformStats(); }
  }, [isSuperAdmin, orgId]);

  async function fetchPlatformStats() {
    try { const r = await fetch("/api/admin/stats"); if (r.ok) setPlatformStats(await r.json()); } catch {}
  }
  async function fetchOrganizations() {
    setOrgsLoading(true);
    try { const r = await fetch("/api/admin/organizations"); if (r.ok) setOrganizations(await r.json()); } catch {}
    finally { setOrgsLoading(false); }
  }
  async function fetchAllUsers() {
    setUsersLoading(true);
    try { const r = await fetch("/api/admin/users"); if (r.ok) setAllUsers(await r.json()); } catch {}
    finally { setUsersLoading(false); }
  }
  async function fetchOrgDetail(orgId: string) {
    setOrgDetailLoading(true);
    try { const r = await fetch(`/api/admin/organizations/${orgId}`); if (r.ok) setOrgDetail(await r.json()); } catch {}
    finally { setOrgDetailLoading(false); }
  }

  async function createOrg() {
    if (!newOrgName) { toast.error("Name is required"); return; }
    setCreating(true);
    try {
      const r = await fetch("/api/admin/organizations", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName, slug: newOrgSlug || newOrgName.toLowerCase().replace(/\s+/g, "-") }) });
      if (r.ok) { toast.success("Organization created"); setCreateOpen(false); setNewOrgName(""); setNewOrgSlug(""); fetchOrganizations(); }
      else { const e = await r.json(); toast.error(e.error || "Failed"); }
    } catch { toast.error("Failed"); } finally { setCreating(false); }
  }

  async function inviteUser() {
    if (!inviteEmail) { toast.error("Email is required"); return; }
    if (!selectedOrg) { toast.error("Select an organization first"); return; }
    setInviting(true);
    try {
      const r = await fetch(`/api/admin/organizations/${selectedOrg}/users`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: inviteName || undefined, password: invitePassword || undefined, roleType: inviteRole }),
      });
      if (r.ok) { toast.success("User invited (email sent if SMTP configured)"); setInviteOpen(false); setInviteEmail(""); setInviteName(""); fetchOrgDetail(selectedOrg); }
      else { const e = await r.json(); toast.error(e.error || "Failed"); }
    } catch { toast.error("Failed"); } finally { setInviting(false); }
  }

  async function updateUserRole(membershipId: string, newRole: string) {
    try {
      const r = await fetch(`/api/admin/organizations/${selectedOrg}/users`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, roleType: newRole }),
      });
      if (r.ok) { toast.success("Role updated"); fetchOrgDetail(selectedOrg); }
      else { const e = await r.json(); toast.error(e.error || "Failed"); }
    } catch { toast.error("Failed"); }
  }

  async function removeUser(membershipId: string, name: string) {
    if (!confirm(`Remove ${name} from this organization?`)) return;
    try {
      const r = await fetch(`/api/admin/organizations/${selectedOrg}/users?membershipId=${membershipId}`, { method: "DELETE" });
      if (r.ok) { toast.success("User removed"); fetchOrgDetail(selectedOrg); }
      else { const e = await r.json(); toast.error(e.error || "Failed"); }
    } catch { toast.error("Failed"); }
  }

  async function saveBranding() {
    if (!selectedOrg) return;
    setSavingBranding(true);
    try {
      const r = await fetch("/api/branding", { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: selectedOrg, ...brandColors }) });
      if (r.ok) { toast.success("Branding updated"); setEditBrandingOpen(false); fetchOrgDetail(selectedOrg); }
      else { const e = await r.json(); toast.error(e.error || "Failed"); }
    } catch { toast.error("Failed"); } finally { setSavingBranding(false); }
  }

  async function deleteOrg(orgId: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const r = await fetch(`/api/admin/organizations/${orgId}`, { method: "DELETE" });
      if (r.ok) { toast.success("Organization deleted"); if (selectedOrg === orgId) { setSelectedOrg(null); setOrgDetail(null); } fetchOrganizations(); }
      else { const e = await r.json(); toast.error(e.error || "Failed"); }
    } catch { toast.error("Failed"); }
  }

  function viewOrg(orgId: string) {
    setSelectedOrg(orgId);
    fetchOrgDetail(orgId);
    setTab("org-detail");
  }

  if (!isSuperAdmin) {
    return (<div className="flex flex-col items-center justify-center py-16">
      <Shield className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold">Access Denied</h2>
      <p className="text-sm text-muted-foreground mt-2">Only Platform Super Admins can access this console.</p>
    </div>);
  }

  const totalOrgs = organizations.length;
  const totalUsers = allUsers.length;
  const totalSurveys = platformStats?.surveys || 0;
  const totalCases = platformStats?.cases || 0;

  return (
    <div>
      <PageHeader title="TRUCORE Platform Console" description="Full SaaS management — organizations, users, branding, monitoring & control" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard" className="gap-2"><Activity className="h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="organizations" className="gap-2"><Globe className="h-4 w-4" /> Organizations</TabsTrigger>
          <TabsTrigger value="org-detail" className="gap-2"><Building2 className="h-4 w-4" /> Org Detail</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> All Users</TabsTrigger>
        </TabsList>

        {/* === DASHBOARD === */}
        <TabsContent value="dashboard" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-brand-600"><CardHeader className="py-4"><CardTitle className="text-sm font-medium flex items-center gap-2"><Building2 className="h-4 w-4" /> Organizations</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{totalOrgs}</p><p className="text-xs text-muted-foreground">Active tenants</p></CardContent></Card>
            <Card className="border-l-4 border-l-emerald-500"><CardHeader className="py-4"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Total Users</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{totalUsers}</p><p className="text-xs text-muted-foreground">Across all orgs</p></CardContent></Card>
            <Card className="border-l-4 border-l-amber-500"><CardHeader className="py-4"><CardTitle className="text-sm font-medium flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Total Surveys</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{totalSurveys}</p><p className="text-xs text-muted-foreground">All modules</p></CardContent></Card>
            <Card className="border-l-4 border-l-red-500"><CardHeader className="py-4"><CardTitle className="text-sm font-medium flex items-center gap-2"><Shield className="h-4 w-4" /> Cases</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{totalCases}</p><p className="text-xs text-muted-foreground">Whistleblowing reports</p></CardContent></Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card><CardHeader><div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-brand-600" /><CardTitle>Quick Actions</CardTitle></div></CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => setCreateOpen(true)} className="w-full justify-start gap-3" variant="outline"><Plus className="h-4 w-4" /> Create New Organization</Button>
                <Button onClick={() => setTab("organizations")} className="w-full justify-start gap-3" variant="outline"><Eye className="h-4 w-4" /> View All Organizations</Button>
                <Button onClick={() => setTab("users")} className="w-full justify-start gap-3" variant="outline"><Users className="h-4 w-4" /> Manage Platform Users</Button>
              </CardContent></Card>
            <Card><CardHeader><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-brand-600" /><CardTitle>Platform Summary</CardTitle></div></CardHeader>
              <CardContent><div className="space-y-3">
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Organizations</span><span className="font-semibold">{totalOrgs}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Users</span><span className="font-semibold">{totalUsers}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Surveys</span><span className="font-semibold">{totalSurveys}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Cases</span><span className="font-semibold">{totalCases}</span></div>
              </div></CardContent></Card>
          </div>
        </TabsContent>

        {/* === ORGANIZATIONS LIST === */}
        <TabsContent value="organizations" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>All Organizations</CardTitle><CardDescription>Full tenant lifecycle management</CardDescription></div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Organization</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>Create Organization</DialogTitle><DialogDescription>Add a new tenant to the platform</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Organization Name *</Label><Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="Acme Corp" /></div>
                      <div className="space-y-2"><Label>URL Slug</Label><Input value={newOrgSlug} onChange={(e) => setNewOrgSlug(e.target.value)} placeholder="acme-corp" /></div>
                      <Button onClick={createOrg} disabled={creating} className="w-full">{creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {orgsLoading ? <Loading text="Loading..." /> : organizations.length === 0 ? (
                <div className="text-center py-12"><Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-sm text-muted-foreground">No organizations yet. Create your first tenant.</p></div>
              ) : (
                <div className="grid gap-3">
                  {organizations.map((org: any) => (
                    <div key={org.id} className="rounded-lg border p-4 hover:border-brand-300 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950"><Building2 className="h-5 w-5 text-brand-600" /></div>
                          <div>
                            <p className="font-medium text-base">{org.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{org.slug} &middot; {org._count?.users || 0} users &middot; {org._count?.surveys || 0} surveys &middot; {org._count?.cases || 0} cases</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="success">Active</Badge>
                          <Button variant="outline" size="sm" onClick={() => viewOrg(org.id)} className="gap-1"><Eye className="h-3 w-3" /> Manage</Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => deleteOrg(org.id, org.name)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      {org.publicReportSlug && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Link2 className="h-3 w-3" /> Report Portal: <span className="font-mono text-brand-600">/report/{org.publicReportSlug}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ORG DETAIL === */}
        <TabsContent value="org-detail" className="mt-6">
          {!selectedOrg ? (
            <Card><CardContent className="p-12 text-center"><Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Select an organization from the Organizations tab to manage it.</p></CardContent></Card>
          ) : orgDetailLoading ? <Loading text="Loading organization details..." /> : !orgDetail ? (
            <Card><CardContent className="p-12 text-center"><p className="text-muted-foreground">Organization not found.</p></CardContent></Card>
          ) : (
            <div className="space-y-6">
              {/* Org Header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{orgDetail.name}</h2>
                      <p className="text-sm text-muted-foreground font-mono">{orgDetail.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={editBrandingOpen} onOpenChange={setEditBrandingOpen}>
                        <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2" onClick={() => {
                          const b = orgDetail.branding;
                          setBrandColors({ primaryColor: b?.primaryColor || "#5B21B6", secondaryColor: b?.secondaryColor || "#7C3AED", accentColor: b?.accentColor || "#C4B5FD", companyName: b?.companyName || orgDetail.name });
                        }}><Palette className="h-4 w-4" /> Branding</Button></DialogTrigger>
                        <DialogContent><DialogHeader><DialogTitle>Org Branding</DialogTitle><DialogDescription>Customize {orgDetail.name}'s appearance</DialogDescription></DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2"><Label>Company Name</Label><Input value={brandColors.companyName} onChange={(e) => setBrandColors(p => ({ ...p, companyName: e.target.value }))} /></div>
                            <div className="grid grid-cols-3 gap-3">
                              <div><Label className="text-xs">Primary</Label><input type="color" value={brandColors.primaryColor} onChange={(e) => setBrandColors(p => ({ ...p, primaryColor: e.target.value }))} className="h-10 w-full rounded-lg border cursor-pointer" /></div>
                              <div><Label className="text-xs">Secondary</Label><input type="color" value={brandColors.secondaryColor} onChange={(e) => setBrandColors(p => ({ ...p, secondaryColor: e.target.value }))} className="h-10 w-full rounded-lg border cursor-pointer" /></div>
                              <div><Label className="text-xs">Accent</Label><input type="color" value={brandColors.accentColor} onChange={(e) => setBrandColors(p => ({ ...p, accentColor: e.target.value }))} className="h-10 w-full rounded-lg border cursor-pointer" /></div>
                            </div>
                            <Button onClick={saveBranding} disabled={savingBranding} className="w-full">{savingBranding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Branding</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" size="sm" onClick={() => { setTab("organizations"); setSelectedOrg(null); setOrgDetail(null); }}><Eye className="h-4 w-4" /> Back</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                    <div><span className="text-muted-foreground">Users</span><p className="font-semibold">{orgDetail.users?.length || 0}</p></div>
                    <div><span className="text-muted-foreground">Surveys</span><p className="font-semibold">{orgDetail._count?.surveys || 0}</p></div>
                    <div><span className="text-muted-foreground">Anon Surveys</span><p className="font-semibold">{orgDetail._count?.anonymousSurveys || 0}</p></div>
                    <div><span className="text-muted-foreground">Cases</span><p className="font-semibold">{orgDetail._count?.cases || 0}</p></div>
                  </div>
                </CardContent>
              </Card>

              {/* User Management */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div><CardTitle>Users</CardTitle><CardDescription>Manage members of this organization</CardDescription></div>
                    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                      <DialogTrigger asChild><Button size="sm" className="gap-2"><UserPlus className="h-4 w-4" /> Add User</Button></DialogTrigger>
                      <DialogContent><DialogHeader><DialogTitle>Add User to {orgDetail.name}</DialogTitle><DialogDescription>Invite a new or existing user with a specific role</DialogDescription></DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2"><Label>Email *</Label><Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@company.com" /></div>
                          <div className="space-y-2"><Label>Display Name</Label><Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Optional" /></div>
                          <div className="space-y-2"><Label>Initial Password</Label><Input type="password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} placeholder="Default: Welcome@2026" /></div>
                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={inviteRole} onValueChange={setInviteRole}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MODULE_ADMIN">Organization Admin</SelectItem>
                                <SelectItem value="MODULE_ADMIN">Module Admin</SelectItem>
                                <SelectItem value="VIEWER">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={inviteUser} disabled={inviting} className="w-full">
                            {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add User
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {orgDetail.users?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No users in this organization yet</p>
                  ) : (
                    <div className="space-y-2">
                      {(orgDetail.users || []).map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 text-sm font-medium text-brand-700">
                              {(m.user.name?.[0] || m.user.email?.[0] || "?").toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{m.user.name || "Unnamed"}</p>
                              <p className="text-xs text-muted-foreground">{m.user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select value={m.role.type} onValueChange={(newRole) => updateUserRole(m.id, newRole)}>
                              <SelectTrigger className="h-8 w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MODULE_ADMIN">Org Admin</SelectItem>
                                <SelectItem value="MODULE_ADMIN">Module Admin</SelectItem>
                                <SelectItem value="VIEWER">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => removeUser(m.id, m.user.name || m.user.email)} title="Remove from org">
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Audit Trail */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><History className="h-5 w-5 text-brand-600" /><CardTitle>Audit Trail</CardTitle></div>
                    <Button variant="outline" size="sm" onClick={() => fetchOrgDetail(selectedOrg)}><RefreshCw className="h-4 w-4" /></Button>
                  </div>
                  <CardDescription>Recent activity within this organization</CardDescription>
                </CardHeader>
                <CardContent>
                  {orgDetail.auditLogs?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {(orgDetail.auditLogs || []).slice(0, 30).map((log: any) => (
                        <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950">
                            <Activity className="h-4 w-4 text-brand-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{log.action}</span>
                              <Badge variant="outline" className="text-[10px]">{log.entityType}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{log.user?.name || log.user?.email || "System"}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(log.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          )}
        </TabsContent>

        {/* === ALL USERS === */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Platform Users</CardTitle><CardDescription>All users across all organizations</CardDescription></CardHeader>
            <CardContent>
              {usersLoading ? <Loading text="Loading..." /> : allUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No users</p>
              ) : (
                <div className="space-y-2">
                  {allUsers.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 text-sm font-medium text-brand-700">
                          {(u.name?.[0] || u.email?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.name || "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={u.isActive ? "success" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                        <span className="text-xs text-muted-foreground">{u.memberships?.length || 0} org(s)</span>
                        {u.role === "SYSTEM_ADMIN" && <Badge variant="default">Super Admin</Badge>}
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
