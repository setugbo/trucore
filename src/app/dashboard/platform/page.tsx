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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Globe, Building2, Users, ClipboardList, Shield, Plus, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

function PlatformContent() {
  const { data: session } = useSession();
  const isPlatformAdmin = !!(session?.user as any)?.isPlatformAdmin;

  const [stats, setStats] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    fetchStats();
    fetchOrgs();
  }, [isPlatformAdmin]);

  async function fetchStats() {
    try { const r = await fetch("/api/admin/stats"); if (r.ok) setStats(await r.json()); } catch {}
  }

  async function fetchOrgs() {
    setLoading(true);
    try { const r = await fetch("/api/admin/organizations"); if (r.ok) setOrgs(await r.json()); } catch {}
    finally { setLoading(false); }
  }

  async function createOrg() {
    if (!newOrgName.trim()) { toast.error("Organization name is required"); return; }
    setCreating(true);
    try {
      const r = await fetch("/api/admin/organizations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName }),
      });
      if (r.ok) { toast.success("Organization created"); setCreateOpen(false); setNewOrgName(""); fetchOrgs(); fetchStats(); }
      else { const e = await r.json(); toast.error(e.error || "Failed"); }
    } catch { toast.error("Failed"); } finally { setCreating(false); }
  }

  async function toggleOrgActive(organizationId: string, current: boolean) {
    try {
      const r = await fetch("/api/admin/organizations", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, isActive: !current }),
      });
      if (r.ok) { toast.success(`Organization ${current ? "deactivated" : "activated"}`); fetchOrgs(); }
      else { toast.error("Failed"); }
    } catch { toast.error("Failed"); }
  }

  if (!isPlatformAdmin) {
    return (<div className="flex flex-col items-center justify-center py-16"><Globe className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold">Access Denied</h2><p className="text-sm text-muted-foreground mt-2">Only platform administrators can access this console.</p></div>);
  }

  return (
    <div>
      <PageHeader title="Platform Administration" description="Manage every organization on this TRUCORE deployment" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-brand-600" /><div><p className="text-2xl font-bold">{stats?.organizations ?? "-"}</p><p className="text-xs text-muted-foreground">Organizations</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-brand-600" /><div><p className="text-2xl font-bold">{stats?.users ?? "-"}</p><p className="text-xs text-muted-foreground">Users</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><ClipboardList className="h-5 w-5 text-brand-600" /><div><p className="text-2xl font-bold">{stats?.surveys ?? "-"}</p><p className="text-xs text-muted-foreground">Surveys</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Shield className="h-5 w-5 text-brand-600" /><div><p className="text-2xl font-bold">{stats?.cases ?? "-"}</p><p className="text-xs text-muted-foreground">Whistleblowing Cases</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Organizations</CardTitle><CardDescription>Every tenant on this deployment</CardDescription></div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Organization</Button></DialogTrigger>
              <DialogContent><DialogHeader><DialogTitle>Create Organization</DialogTitle><DialogDescription>Adds a new tenant to the platform</DialogDescription></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Name *</Label><Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="Acme Corp" /></div>
                  <Button onClick={createOrg} disabled={creating} className="w-full">{creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <Loading text="Loading organizations..." /> : (
            <div className="space-y-2">
              {orgs.map((org: any) => (
                <div key={org.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground">/{org.slug} &middot; created {formatDate(org.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{org._count?.users ?? 0} users</span>
                      <span>{org._count?.surveys ?? 0} surveys</span>
                      <span>{org._count?.cases ?? 0} cases</span>
                      <Switch checked={org.isActive} onCheckedChange={() => toggleOrgActive(org.id, org.isActive)} />
                      <Badge variant={org.isActive ? "success" : "secondary"}>{org.isActive ? "Active" : "Inactive"}</Badge>
                    </div>
                  </div>
                </div>
              ))}
              {orgs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No organizations yet</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PlatformPage() {
  return <ErrorBoundary><PlatformContent /></ErrorBoundary>;
}
