"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/shared/logo";
import { toast } from "sonner";
import { Loader2, Shield, Lock, CheckCircle, Search, Upload, AlertTriangle, ArrowRight } from "lucide-react";
import { CASE_CATEGORIES } from "@/lib/constants";

export default function WhistleblowingPage() {
  const [mode, setMode] = useState<"landing" | "form" | "submitting" | "done">("landing");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("normal");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [accessToken, setAccessToken] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !description) { toast.error("Title and description are required"); return; }
    setMode("submitting");
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("priority", priority);
      formData.append("isAnonymous", String(!reporterName && !reporterEmail));
      if (reporterName) formData.append("reporterName", reporterName);
      if (reporterEmail) formData.append("reporterEmail", reporterEmail);
      for (const file of evidenceFiles) formData.append("evidence", file);

      const res = await fetch("/api/cases/public", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); toast.error(err.error || "Failed"); setMode("form"); return; }
      const data = await res.json();
      setAccessToken(data.reporterToken);
      setMode("done");
    } catch { toast.error("Something went wrong"); setMode("form"); }
  }

  // === LANDING PAGE ===
  if (mode === "landing") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white dark:from-brand-950 dark:to-background">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <Logo />
            <div className="flex items-center gap-4">
              <Link href="/track" className="text-sm text-muted-foreground hover:text-foreground">Track a Report</Link>
              <Link href="/login"><Button variant="outline" size="sm">Admin Login</Button></Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="py-20 px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 dark:bg-amber-900/30 px-4 py-1.5 text-sm text-amber-700 dark:text-amber-300 mb-6">
              <Shield className="h-4 w-4" /> Confidential & Secure
            </div>
            <h1 className="text-5xl font-bold tracking-tight">Whistleblowing Portal</h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              A secure, confidential platform for reporting concerns. Your identity is protected and all submissions are encrypted.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
              <Button size="xl" onClick={() => setMode("form")} className="gap-2">
                <Shield className="h-5 w-5" /> Submit a Report <ArrowRight className="h-5 w-5" />
              </Button>
              <Link href="/track">
                <Button variant="outline" size="xl" className="gap-2">
                  <Search className="h-5 w-5" /> Track Existing Report
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t py-16 px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950 mb-4"><Shield className="h-8 w-8 text-brand-600" /></div>
                <h3 className="font-semibold">1. Submit Report</h3><p className="text-sm text-muted-foreground mt-2">Fill out the confidential form. Provide as much detail as possible. Optionally attach evidence.</p></div>
              <div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950 mb-4"><Lock className="h-8 w-8 text-brand-600" /></div>
                <h3 className="font-semibold">2. Get Your Token</h3><p className="text-sm text-muted-foreground mt-2">Receive a unique tracking code. Save it — it's your only way to check case updates.</p></div>
              <div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950 mb-4"><Search className="h-8 w-8 text-brand-600" /></div>
                <h3 className="font-semibold">3. Track Progress</h3><p className="text-sm text-muted-foreground mt-2">Use your token anytime to check status, read responses, and communicate securely.</p></div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-8 px-6">
          <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Logo variant="small" />
            <p className="text-xs text-muted-foreground">&copy; 2026 TRUCORE. All rights reserved. Speak Freely. Report Safely.</p>
          </div>
        </footer>
      </div>
    );
  }

  // === SUBMITTED ===
  if (mode === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-brand-50 to-white dark:from-brand-950 dark:to-background">
        <Card className="w-full max-w-lg text-center animate-fade-in-up">
          <CardHeader>
            <div className="flex justify-center mb-4"><div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30"><CheckCircle className="h-10 w-10 text-emerald-600" /></div></div>
            <CardTitle className="text-2xl">Report Submitted</CardTitle>
            <CardDescription className="text-base mt-2">Your report has been received and will be reviewed confidentially.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-4">
              <p className="text-sm font-medium text-amber-800 mb-2">Your Tracking Code:</p>
              <p className="font-mono text-sm bg-amber-100 dark:bg-amber-900/50 p-3 rounded select-all text-center text-lg font-bold">{accessToken}</p>
            </div>
            <p className="text-xs text-muted-foreground">Save this code. You need it to track your report.</p>
            <div className="flex gap-2">
              <Link href={`/track/${accessToken}`} className="flex-1"><Button className="w-full gap-2"><Search className="h-4 w-4" /> Track My Report</Button></Link>
              <Button variant="outline" className="flex-1" onClick={() => setMode("landing")}>Submit Another</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === FORM ===
  return (
    <div className="min-h-screen py-16 px-4 bg-gradient-to-b from-brand-50 to-white dark:from-brand-950 dark:to-background">
      <div className="mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <Logo className="justify-center mb-4" />
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 dark:bg-amber-900/30 px-4 py-1.5 text-sm text-amber-700 dark:text-amber-300 mb-4">
            <Lock className="h-4 w-4" /> Your identity is protected
          </div>
          <h1 className="text-3xl font-bold">Submit a Confidential Report</h1>
          <p className="text-muted-foreground mt-2">All submissions are encrypted and confidential.</p>
          <button onClick={() => setMode("landing")} className="mt-2 text-sm text-brand-600 hover:text-brand-500 underline underline-offset-4">&larr; Back to overview</button>
        </div>

        <Card>
          <CardHeader><CardTitle>Report Details</CardTitle><CardDescription>Provide as much detail as possible</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2"><Label htmlFor="title">Report Title *</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief title" required /></div>
              <div className="space-y-2"><Label htmlFor="description">Detailed Description *</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide a detailed account..." rows={6} required /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Category</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CASE_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Priority</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium mb-2">Optional: Contact Info</p>
                <p className="text-xs text-muted-foreground mb-4">Leaving these blank keeps your report anonymous.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" value={reporterName} onChange={(e) => setReporterName(e.target.value)} placeholder="Optional" /></div>
                  <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={reporterEmail} onChange={(e) => setReporterEmail(e.target.value)} placeholder="Optional" /></div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Supporting Evidence (optional)</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" multiple onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []))} className="flex-1" accept=".pdf,.doc,.docx,.jpg,.png,.zip" />
                  <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
                {evidenceFiles.length > 0 && <p className="text-xs text-muted-foreground">{evidenceFiles.length} file(s) selected</p>}
              </div>
              <Button type="submit" disabled={mode === "submitting"} size="lg" className="w-full gap-2">
                {mode === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {mode === "submitting" ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
