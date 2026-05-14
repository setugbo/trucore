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
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Users, Activity, History, Plus, Loader2, UserPlus, UserMinus, RefreshCw, Key, Check, X, Eye, EyeOff, Edit3 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { useOrgId } from "@/lib/use-org";
import Link from "next/link";

function AdminContent() {
  const { data: session } = useSession();
  const orgId = useOrgId();
  const membership = (session?.user as any)?.membership;
  const isSystemAdmin = membership?.role?.type === "SYSTEM_ADMIN";

  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [modules, setModules] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, Record<string, any>>>({});

  // Dialogs
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!isSystemAdmin || !orgId) return;
    fetchUsers();
    fetchModules();
    fetchAuditLogs();
    fetchPermissions();
  }, [isSystemAdmin, orgId]);

  async function fetchUsers() {
    setUsersLoading(true);
    try { const r = await fetch("/api/admin/users"); if (r.ok) setUsers(await r.json()); } catch {}
    finally { setUsersLoading(false); }
  }

  async function fetchModules() {
    try { const r = await fetch("/api/modules"); if (r.ok) setModules(await r.json()); } catch {}
  }

  async function fetchAuditLogs() {
    if (!orgId) return;
    setLogsLoading(true);
    try { const r = await fetch(`/api/audit-logs?organizationId=${orgId}`); if (r.ok) setAuditLogs(await r.json()); } catch {}
    finally { setLogsLoading(false); }
  }

  async function fetchPermissions() {
    if (!orgId) return;
    try {
      const r = await fetch("/api/admin/permissions");
      if (r.ok) {
        const data = await r.json();
        const permMap: Record<string, any> = {};
        data.forEach((p: any) => {
          if (!permMap[p.userId]) permMap[p.userId] = {};
          permMap[p.userId][p.moduleType] = p;
        });
        setPermissions(permMap);
      }
    } catch {}
  }

  async function inviteUser() {
    if (!inviteEmail || !orgId) { toast.error("Email is required"); return; }
    setInviting(true);
    try {
      const r = await fetch(`/api/admin/organizations/${orgId}/users`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: inviteName || undefined, password: undefined, roleType: inviteRole }),
      });
      if (r.ok) { toast.success("User added"); setInviteOpen(false); setInviteEmail(""); setInviteName(""); fetchUsers(); fetchPermissions(); }
      else { const e = await r.json(); toast.error(e.error || "Failed"); }
    } catch { toast.error("Failed"); } finally { setInviting(false); }
  }

  async function togglePermission(userId: string, moduleType: string, field: string, value: boolean) {
    try {
      const r = await fetch("/api/admin/permissions", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, moduleType, [field]: value }),
      });
      if (r.ok) { toast.success("Permission updated"); fetchPermissions(); }
      else { toast.error("Failed"); }
    } catch { toast.error("Failed"); }
  }

  async function toggleUserActive(userId: string, current: boolean) {
    try {
      const r = await fetch("/api/admin/users", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isActive: !current }),
      });
      if (r.ok) { toast.success(`User ${current ? "deactivated" : "activated"}`); fetchUsers(); }
      else { toast.error("Failed"); }
    } catch { toast.error("Failed"); }
  }

  async function changeUserRole(userId: string, newRole: string) {
    try {
      const r = await fetch("/api/admin/users", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleType: newRole }),
      });
      if (r.ok) { toast.success("Role updated"); fetchUsers(); fetchPermissions(); }
      else { toast.error("Failed"); }
    } catch { toast.error("Failed"); }
  }

  if (!isSystemAdmin) {
    return (<div className="flex flex-col items-center justify-center py-16"><Shield className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold">Access Denied</h2><p className="text-sm text-muted-foreground mt-2">Only System Administrators can access this panel.</p></div>);
  }

  return (
    <div>
      <PageHeader title="System Administration" description="User management, permissions, audit trail & monitoring" />

      <Tabs defaultValue="users">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2"><Key className="h-4 w-4" /> Permissions</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2"><History className="h-4 w-4" /> Audit Trail</TabsTrigger>
          <TabsTrigger value="activities" className="gap-2"><Activity className="h-4 w-4" /> Activities</TabsTrigger>
        </TabsList>

        {/* === USERS TAB === */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>User Management</CardTitle><CardDescription>Manage all system users, roles, and account status</CardDescription></div>
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                  <DialogTrigger asChild><Button className="gap-2"><UserPlus className="h-4 w-4" /> Add User</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>Add User</DialogTitle><DialogDescription>Create a new user or invite an existing one</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Email *</Label><Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@company.com" /></div>
                      <div className="space-y-2"><Label>Name</Label><Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Optional" /></div>
                      <div className="space-y-2"><Label>Role</Label><Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                          <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
                          <SelectItem value="MODULE_ADMIN">Module Admin</SelectItem>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                        </SelectContent></Select></div>
                      <Button onClick={inviteUser} disabled={inviting} className="w-full">{inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add User</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? <Loading text="Loading users..." /> : (
                <div className="space-y-2">
                  {users.map((u: any) => (
                    <div key={u.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 text-sm font-medium text-brand-700">
                            {(u.name?.[0] || u.email?.[0] || "?").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{u.name || "Unnamed"}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={u.membership?.role?.type || "VIEWER"} onValueChange={(v) => changeUserRole(u.id, v)}>
                            <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
                              <SelectItem value="MODULE_ADMIN">Module Admin</SelectItem>
                              <SelectItem value="VIEWER">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon-sm" onClick={() => toggleUserActive(u.id, u.isActive)} title={u.isActive ? "Deactivate" : "Activate"}>
                            {u.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Badge variant={u.isActive ? "success" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PERMISSIONS TAB === */}
        <TabsContent value="permissions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>Module Permissions</CardTitle><CardDescription>Configure per-user access to each module</CardDescription></div>
                <Button variant="outline" onClick={fetchPermissions}><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? <Loading text="Loading..." /> : (
                <div className="space-y-4">
                  {users.filter((u: any) => u.membership?.role?.type !== "SYSTEM_ADMIN").map((u: any) => (
                    <div key={u.id} className="rounded-lg border p-4">
                      <p className="font-medium text-sm mb-3">{u.name || u.email} <span className="text-muted-foreground font-normal">({u.membership?.role?.type})</span></p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {(modules || []).map((mod: any) => {
                          const perm = permissions[u.id]?.[mod.type] || {};
                          return (
                            <div key={mod.type} className="rounded-lg border p-3">
                              <p className="text-sm font-medium mb-2">{mod.name}</p>
                              <div className="space-y-2">
                                {["canView", "canCreate", "canEdit", "canDelete"].map((field) => (
                                  <div key={field} className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground capitalize">{field.replace("can", "")}</span>
                                    <Switch
                                      checked={perm[field] || false}
                                      onCheckedChange={(v) => togglePermission(u.id, mod.type, field, v)}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === AUDIT TRAIL TAB === */}
        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><History className="h-5 w-5 text-brand-600" /><CardTitle>Audit Trail</CardTitle></div>
                <Button variant="outline" onClick={fetchAuditLogs}><RefreshCw className="h-4 w-4" /></Button>
              </div>
              <CardDescription>All administrative actions and system events</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? <Loading text="Loading..." /> : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No audit logs yet</div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950">
                        <Activity className="h-4 w-4 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{log.action}</span>
                          <Badge variant="outline" className="text-[10px]">{log.entityType}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{log.user?.name || log.user?.email || "System"}</p>
                        {log.metadata && <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{log.metadata}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ACTIVITIES TAB === */}
        <TabsContent value="activities" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card><CardHeader><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-brand-600" /><CardTitle>Recent Activity</CardTitle></div><CardDescription>Last 24 hours</CardDescription></CardHeader>
              <CardContent>
                {auditLogs.filter((l: any) => new Date(l.createdAt) > new Date(Date.now() - 86400000)).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.filter((l: any) => new Date(l.createdAt) > new Date(Date.now() - 86400000)).slice(0, 10).map((log: any) => (
                      <div key={log.id} className="flex items-center gap-3 text-sm border-b pb-2 last:border-0">
                        <Activity className="h-3 w-3 text-brand-600 shrink-0" />
                        <span className="font-medium text-xs">{log.action}</span>
                        <span className="text-xs text-muted-foreground">{log.user?.name || "System"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent></Card>
            <Card><CardHeader><div className="flex items-center gap-2"><Users className="h-5 w-5 text-brand-600" /><CardTitle>System Overview</CardTitle></div></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Total Users</span><span className="font-semibold">{users.length}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">Active Users</span><span className="font-semibold">{users.filter((u: any) => u.isActive).length}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-sm text-muted-foreground">System Admins</span><span className="font-semibold">{users.filter((u: any) => u.membership?.role?.type === "SYSTEM_ADMIN").length}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-muted-foreground">Audit Events</span><span className="font-semibold">{auditLogs.length}</span></div>
                </div>
              </CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminPage() {
  return <ErrorBoundary><AdminContent /></ErrorBoundary>;
}
