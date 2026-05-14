"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useOrgId } from "@/lib/use-org";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Mail, Palette, Users, Shield, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSearchParams } from "next/navigation";
import { Loading } from "@/components/shared/loading";

function SettingsContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const defaultTab = searchParams?.get("tab") || "general";

  const orgId = useOrgId();

  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [inviting, setInviting] = useState(false);

  const [smtpConfig, setSmtpConfig] = useState({ host: "", port: "", user: "", from: "" });

  const [branding, setBranding] = useState({
    primaryColor: "#5B21B6",
    secondaryColor: "#7C3AED",
    accentColor: "#C4B5FD",
    companyName: "",
    theme: "light",
  });

  const [team, setTeam] = useState<any[]>([]);

  useEffect(() => {
    if (!orgId) return;
    fetchBranding();
    fetchTeam();
    fetchSmtpConfig();
  }, [orgId]);

  async function fetchBranding() {
    try {
      const res = await fetch(`/api/branding?organizationId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        if (data) setBranding(data);
      }
    } catch (err) { console.error(err); }
  }

  async function fetchSmtpConfig() {
    try {
      const res = await fetch("/api/email/config");
      if (res.ok) setSmtpConfig(await res.json());
    } catch {}
  }

  async function fetchTeam() {
    try {
      const res = await fetch(`/api/users?organizationId=${orgId}`);
      if (res.ok) setTeam(await res.json());
    } catch (err) { console.error(err); }
  }

  async function saveBranding() {
    setSaving(true);
    try {
      const res = await fetch("/api/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, ...branding }),
      });
      if (res.ok) toast.success("Branding saved");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  async function sendInvite() {
    if (!inviteEmail || !orgId) { toast.error("Enter an email address"); return; }
    setInviting(true);
    try {
      const r = await fetch(`/api/admin/organizations/${orgId}/users`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: "", password: "", roleType: inviteRole }),
      });
      if (r.ok) { toast.success("User invited. Email sent if SMTP is configured."); setInviteOpen(false); setInviteEmail(""); fetchTeam(); }
      else { const e = await r.json(); toast.error(e.error || "Failed"); }
    } catch { toast.error("Failed"); }
    finally { setInviting(false); }
  }

  async function sendTestEmail() {
    if (!testEmail) { toast.error("Enter a recipient email"); return; }
    setTestingEmail(true);
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      if (res.ok) toast.success("Test email sent successfully!");
      else toast.error(data.error || "Failed to send test email");
    } catch { toast.error("Failed to send test email"); }
    finally { setTestingEmail(false); }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your organization settings" />

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="gap-2"><Palette className="h-4 w-4" /> Branding</TabsTrigger>
          <TabsTrigger value="team" className="gap-2"><Users className="h-4 w-4" /> Team</TabsTrigger>
          <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" /> Email</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Customize your organization's appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input value={branding.companyName || ""}
                  onChange={(e) => setBranding((p) => ({ ...p, companyName: e.target.value }))}
                  placeholder="Organization name" />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <input type="color" value={branding.primaryColor}
                      onChange={(e) => setBranding((p) => ({ ...p, primaryColor: e.target.value }))}
                      className="h-10 w-10 rounded-lg border cursor-pointer" />
                    <Input value={branding.primaryColor}
                      onChange={(e) => setBranding((p) => ({ ...p, primaryColor: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2">
                    <input type="color" value={branding.secondaryColor}
                      onChange={(e) => setBranding((p) => ({ ...p, secondaryColor: e.target.value }))}
                      className="h-10 w-10 rounded-lg border cursor-pointer" />
                    <Input value={branding.secondaryColor}
                      onChange={(e) => setBranding((p) => ({ ...p, secondaryColor: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2">
                    <input type="color" value={branding.accentColor}
                      onChange={(e) => setBranding((p) => ({ ...p, accentColor: e.target.value }))}
                      className="h-10 w-10 rounded-lg border cursor-pointer" />
                    <Input value={branding.accentColor}
                      onChange={(e) => setBranding((p) => ({ ...p, accentColor: e.target.value }))} />
                  </div>
                </div>
              </div>

              <Button onClick={saveBranding} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" /> Save Branding
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage organization members and roles</CardDescription>
                </div>
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2"><UserPlus className="h-4 w-4" /> Invite Member</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>Send an invitation email to join your organization.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="inviteEmail">Email Address</Label>
                        <Input id="inviteEmail" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={inviteRole} onValueChange={setInviteRole}>
                          <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
                            <SelectItem value="MODULE_ADMIN">Module Admin</SelectItem>
                            <SelectItem value="VIEWER">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={sendInvite} disabled={inviting} className="w-full">
                        {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Invitation
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {team.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No team members found</p>
              ) : (
                <div className="space-y-3">
                  {team.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900 text-sm font-medium text-brand-700">
                          {member.user.name?.[0] || member.user.email[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{member.user.name || "Unnamed"}</p>
                          <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{member.role.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>SMTP Configuration</CardTitle>
              <CardDescription>Configure email settings for notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  Email is configured via server environment variables. The following settings are active:
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">SMTP Host:</span><span className="font-mono text-xs">{smtpConfig.host || "Not set"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">SMTP Port:</span><span className="font-mono text-xs">{smtpConfig.port || "Not set"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">SMTP User:</span><span className="font-mono text-xs">{smtpConfig.user || "Not set"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">From Address:</span><span className="font-mono text-xs">{smtpConfig.from || "Not set"}</span></div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <Label>Test Email</Label>
                <div className="flex gap-2">
                  <Input id="testEmail" placeholder="recipient@company.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
                  <Button variant="outline" onClick={sendTestEmail} disabled={testingEmail} className="gap-2 shrink-0">
                    {testingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Send Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading text="Loading settings..." />}>
      <SettingsContent />
    </Suspense>
  );
}
