"use client";

import { useState } from "react";
import { useOrgId } from "@/lib/use-org";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { CASE_CATEGORIES, PRIORITY_OPTIONS } from "@/lib/constants";

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("normal");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");

  const orgId = useOrgId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !description) {
      toast.error("Title and description are required");
      return;
    }
    if (!orgId) { toast.error("No organization"); return; }

    setLoading(true);
    try {
      const body: any = { organizationId: orgId, title, description, category, priority, isAnonymous };
      if (!isAnonymous) { body.reporterName = reporterName; body.reporterEmail = reporterEmail; }

      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) { const err = await res.json(); toast.error(err.error || "Failed"); return; }
      const data = await res.json();
      toast.success("Report submitted successfully");
      if (isAnonymous && data.reporterToken) {
        const tokenMsg = `Your access token: ${data.reporterToken}. Save this to track your case.`;
        toast(tokenMsg, { duration: 10000 });
      }
      router.push("/dashboard/cases");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader
        title="Submit a Report"
        description="Confidential whistleblowing report"
        actions={
          <Link href="/dashboard/cases">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      <div className="flex items-center gap-3 rounded-xl border bg-amber-50 dark:bg-amber-950/20 p-4 mb-6">
        <Shield className="h-5 w-5 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Your report will be handled confidentially. {isAnonymous ? "No identifying information will be stored." : ""}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Report Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief title of your report" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide detailed information about your report..." rows={6} required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CASE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} id="isAnonymous" />
              <Label htmlFor="isAnonymous">Submit anonymously</Label>
            </div>

            {!isAnonymous && (
              <div className="grid gap-4 sm:grid-cols-2 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="reporterName">Your Name</Label>
                  <Input id="reporterName" value={reporterName} onChange={(e) => setReporterName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporterEmail">Your Email</Label>
                  <Input id="reporterEmail" type="email" value={reporterEmail} onChange={(e) => setReporterEmail(e.target.value)} placeholder="john@company.com" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} size="lg">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Report
          </Button>
          <Link href="/dashboard/cases">
            <Button type="button" variant="outline" size="lg">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
