"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/shared/logo";
import { Loading } from "@/components/shared/loading";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, Shield, Lock, CheckCircle, Building2, Search, Upload } from "lucide-react";
import { CASE_CATEGORIES } from "@/lib/constants";

export default function OrgReportPage() {
  const params = useParams();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"form" | "submitting" | "done">("form");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("normal");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  useEffect(() => { fetchOrg(); }, [params.slug]);

  async function fetchOrg() {
    try {
      const res = await fetch(`/api/organizations/by-report-slug/${params.slug}`);
      if (res.ok) setOrg(await res.json());
      else setOrg(null);
    } catch { setOrg(null); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !description) { toast.error("Title and description are required"); return; }
    setStep("submitting");
    try {
      const formData = new FormData();
      formData.append("organizationSlug", String(params.slug || ""));
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("priority", priority);
      formData.append("isAnonymous", String(!reporterName && !reporterEmail));
      if (reporterName) formData.append("reporterName", reporterName);
      if (reporterEmail) formData.append("reporterEmail", reporterEmail);
      for (const file of evidenceFiles) {
        formData.append("evidence", file);
      }

      const res = await fetch("/api/cases/public", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) { const err = await res.json(); toast.error(err.error || "Submission failed"); setStep("form"); return; }
      const data = await res.json();
      setAccessToken(data.reporterToken);
      setStep("done");
    } catch { toast.error("Something went wrong"); setStep("form"); }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loading text="Loading..." /></div>;

  if (!org) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Report Portal Not Found</CardTitle>
            <CardDescription>The organization you are looking for does not have a public report portal configured.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-brand-50 to-white dark:from-brand-950 dark:to-background">
        <Card className="w-full max-w-lg text-center animate-fade-in-up">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-10 w-10 text-emerald-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Report Submitted</CardTitle>
            <CardDescription className="text-base mt-2">Your report to <strong>{org.name}</strong> has been received.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-4">
              <p className="text-sm font-medium text-amber-800 mb-2">Save your access token:</p>
              <p className="font-mono text-sm bg-amber-100 dark:bg-amber-900/50 p-3 rounded select-all">{accessToken}</p>
            </div>
            <p className="text-xs text-muted-foreground">Use this token to track your case status and read updates.</p>
                <div className="flex gap-2">
                  <Link href={`/track/${accessToken}`} className="flex-1"><Button className="w-full gap-2"><Search className="h-4 w-4" /> Track My Case</Button></Link>
                  <Link href="/" className="flex-1"><Button variant="outline" className="w-full">Return Home</Button></Link>
                </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4 bg-gradient-to-b from-brand-50 to-white dark:from-brand-950 dark:to-background">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <Logo className="justify-center mb-4" />
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 dark:bg-amber-900/30 px-4 py-1.5 text-sm text-amber-700 dark:text-amber-300 mb-4">
            <Building2 className="h-4 w-4" /> {org.name} &mdash; <Shield className="h-4 w-4" /> Confidential Report Portal
          </div>
          <h1 className="text-3xl font-bold">Submit a Confidential Report</h1>
          <p className="text-muted-foreground mt-2">Your identity is protected. All submissions are encrypted.</p>
          <div className="mt-4">
            <Link href="/track" className="text-sm text-brand-600 hover:text-brand-500 underline underline-offset-4">
              Already submitted a report? Track it here &rarr;
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2"><Lock className="h-4 w-4" /> Your identity is protected</div>
            <CardTitle>Report Details</CardTitle>
            <CardDescription>Provide as much detail as possible</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Report Title *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief title of your report" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Please provide a detailed account..." rows={6} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{CASE_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium mb-2">Optional: Provide contact info</p>
                <p className="text-xs text-muted-foreground mb-4">Leaving these blank keeps your report completely anonymous.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="name">Your Name</Label><Input id="name" value={reporterName} onChange={(e) => setReporterName(e.target.value)} placeholder="Optional" /></div>
                  <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={reporterEmail} onChange={(e) => setReporterEmail(e.target.value)} placeholder="Optional" /></div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Supporting Evidence (optional)</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" multiple onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []))} className="flex-1" accept=".pdf,.doc,.docx,.jpg,.png,.zip" />
                  <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
                {evidenceFiles.length > 0 && (
                  <p className="text-xs text-muted-foreground">{evidenceFiles.length} file(s) selected</p>
                )}
              </div>

              <Button type="submit" disabled={step === "submitting"} size="lg" className="w-full gap-2">
                {step === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {step === "submitting" ? "Submitting..." : "Submit Report to " + org.name}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
