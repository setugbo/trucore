"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/shared/logo";
import { toast } from "sonner";
import { Loader2, Shield, Lock, CheckCircle } from "lucide-react";
import { CASE_CATEGORIES } from "@/lib/constants";

export default function PublicReportPage() {
  const [step, setStep] = useState<"form" | "submitting" | "done">("form");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("normal");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [accessToken, setAccessToken] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !description) { toast.error("Title and description are required"); return; }
    setStep("submitting");
    try {
      const res = await fetch("/api/cases/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, category, priority, isAnonymous: !reporterName && !reporterEmail,
          reporterName: reporterName || undefined,
          reporterEmail: reporterEmail || undefined,
        }),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err.error || "Submission failed"); setStep("form"); return; }
      const data = await res.json();
      setAccessToken(data.reporterToken);
      setStep("done");
    } catch { toast.error("Something went wrong"); setStep("form"); }
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
            <CardTitle className="text-2xl">Report Submitted Successfully</CardTitle>
            <CardDescription className="text-base mt-2">
              Your report has been received and will be reviewed confidentially.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                Save your access token to track this case:
              </p>
              <p className="font-mono text-sm bg-amber-100 dark:bg-amber-900/50 p-3 rounded select-all">
                {accessToken}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              This token is your only way to check case updates. TRUCORE does not store any identifying information.
            </p>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/"}>
              Return Home
            </Button>
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
            <Shield className="h-4 w-4" /> Confidential & Secure
          </div>
          <h1 className="text-3xl font-bold">Submit a Confidential Report</h1>
          <p className="text-muted-foreground mt-2">
            Use this form to report concerns safely and anonymously. All submissions are encrypted and confidential.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Lock className="h-4 w-4" /> Your identity is protected
            </div>
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
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide a detailed account including dates, locations, and any relevant information..." rows={6} required />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CASE_CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                    </SelectContent>
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
                <p className="text-xs text-muted-foreground mb-4">
                  Leaving these blank keeps your report completely anonymous.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input id="name" value={reporterName} onChange={(e) => setReporterName(e.target.value)} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={reporterEmail} onChange={(e) => setReporterEmail(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={step === "submitting"} size="lg" className="w-full gap-2">
                {step === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {step === "submitting" ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold">TRUCORE</span> &mdash; Speak Freely. Report Safely.
          </p>
        </div>
      </div>
    </div>
  );
}
