"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle } from "lucide-react";

export default function RequestAccessPage() {
  const [step, setStep] = useState<"form" | "done">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) { toast.error("Name and email are required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, organizationName, reason }),
      });
      const data = await res.json();
      if (res.ok) { setStep("done"); }
      else { toast.error(data.error || "Request failed"); }
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  if (step === "done") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in-up text-center">
          <Logo className="justify-center mb-8" />
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
              <CardTitle>Request Submitted</CardTitle>
              <CardDescription className="mt-2">
                Your request has been sent to the platform administrator. You will be notified when your account is ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login"><Button className="w-full">Return to Sign In</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="mb-8 text-center">
          <Logo className="justify-center" />
          <p className="mt-2 text-sm text-muted-foreground">Request access to TRUCORE</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Request Account</CardTitle>
            <CardDescription>Submit your details for review. An administrator will approve your access.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work Email *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org">Organization Name</Label>
                <Input id="org" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Your company name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Access</Label>
                <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell us why you need access..." rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={loading} size="lg">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit Request
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account? <Link href="/login" className="font-medium text-brand-600 hover:text-brand-500">Sign in</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
