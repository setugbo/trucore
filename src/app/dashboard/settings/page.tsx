"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Save, Mail, Palette, Users, Shield } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function SettingsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "general";

  const memberships = (session?.user as any)?.memberships || [];
  const orgId = memberships[0]?.organizationId;

  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);

  const [branding, setBranding] = useState({
    primaryColor: "#5B21B6",
    secondaryColor: "#7C3AED",
    accentColor: "#C4B5FD",
    companyName: "",
    theme: "light",
  });

  const [modules, setModules] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);

  useEffect(() => {
    if (!orgId) return;
    fetchBranding();
    fetchModules();
    fetchTeam();
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

  async function fetchModules() {
    try {
      const res = await fetch(`/api/modules?organizationId=${orgId}`);
      if (res.ok) setModules(await res.json());
    } catch (err) { console.error(err); }
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

  async function toggleModule(moduleId: string, isEnabled: boolean) {
    try {
      const res = await fetch("/api/modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationModuleId: moduleId, isEnabled }),
      });
      if (res.ok) {
        toast.success("Module updated");
        fetchModules();
      }
    } catch { toast.error("Failed to update"); }
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
          <TabsTrigger value="modules" className="gap-2"><Shield className="h-4 w-4" /> Modules</TabsTrigger>
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
                <Input value={branding.companyName || memberships[0]?.organization?.name || ""}
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

        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Module Management</CardTitle>
              <CardDescription>Enable or disable modules for your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {modules.map((mod: any) => (
                <div key={mod.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="font-medium">{mod.module.name}</div>
                    <div className="text-sm text-muted-foreground">{mod.module.description}</div>
                  </div>
                  <Switch checked={mod.isEnabled} onCheckedChange={(v) => toggleModule(mod.id, v)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage organization members and roles</CardDescription>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input value={process.env.SMTP_HOST || ""} disabled placeholder="mail.company.com" />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input value={process.env.SMTP_PORT || ""} disabled placeholder="465" />
                </div>
                <div className="space-y-2">
                  <Label>SMTP User</Label>
                  <Input value={process.env.SMTP_USER || ""} disabled placeholder="user@company.com" />
                </div>
                <div className="space-y-2">
                  <Label>SMTP From</Label>
                  <Input value={process.env.SMTP_FROM || ""} disabled placeholder="noreply@company.com" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">SMTP settings are configured in your environment variables.</p>

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
