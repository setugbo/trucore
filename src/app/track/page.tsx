"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { Loading } from "@/components/shared/loading";
import { toast } from "sonner";
import { Search, Shield, Clock, CheckCircle, AlertTriangle, MessageSquare, Loader2, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { CASE_STATUS_COLORS } from "@/lib/constants";
import Link from "next/link";

export default function TrackPage() {
  const [token, setToken] = useState("");
  const [caseItem, setCaseItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) { toast.error("Enter your access token"); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/cases/track/${token.trim()}`);
      if (res.ok) setCaseItem(await res.json());
      else setCaseItem(null);
    } catch { setCaseItem(null); }
    finally { setLoading(false); }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "SUBMITTED": return <Clock className="h-5 w-5 text-yellow-600" />;
      case "UNDER_REVIEW": return <Search className="h-5 w-5 text-blue-600" />;
      case "ESCALATED": return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "RESOLVED": return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "CLOSED": return <Shield className="h-5 w-5 text-gray-600" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen py-16 px-4 bg-gradient-to-b from-brand-50 to-white dark:from-brand-950 dark:to-background">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="text-center mb-8">
          <Logo className="justify-center mb-4" />
          <h1 className="text-3xl font-bold">Track Your Report</h1>
          <p className="text-muted-foreground mt-2">Enter your access token to check the status of your report.</p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1">
                <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste your access token here..." className="font-mono" />
              </div>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Track
              </Button>
            </form>
          </CardContent>
        </Card>

        {searched && loading && <Loading text="Looking up your report..." />}

        {searched && !loading && !caseItem && (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold">Report Not Found</h2>
              <p className="text-sm text-muted-foreground mt-2">
                No report found with that token. Please check your token and try again.
              </p>
            </CardContent>
          </Card>
        )}

        {caseItem && (
          <div className="space-y-6 animate-fade-in">
            {/* Status Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="font-mono text-sm text-muted-foreground">{caseItem.caseId}</span>
                    <h2 className="text-xl font-bold mt-1">{caseItem.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusIcon(caseItem.status)}
                    <Badge className={CASE_STATUS_COLORS[caseItem.status] || ""}>
                      {caseItem.status?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Category</span><p className="font-medium">{caseItem.category || "Not specified"}</p></div>
                  <div><span className="text-muted-foreground">Priority</span><p className="font-medium capitalize">{caseItem.priority}</p></div>
                  <div><span className="text-muted-foreground">Submitted</span><p className="font-medium">{formatDateTime(caseItem.createdAt)}</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-brand-600" />
                  <CardTitle>Case Updates</CardTitle>
                </div>
                <CardDescription>Communications from the review team</CardDescription>
              </CardHeader>
              <CardContent>
                {caseItem.messages?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No updates yet. Check back later.</p>
                ) : (
                  <div className="space-y-4">
                    {caseItem.messages?.map((msg: any) => (
                      <div key={msg.id} className={`rounded-lg p-4 ${msg.isFromReporter ? "bg-muted ml-8" : "bg-brand-50 dark:bg-brand-950/30 mr-8"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{msg.isFromReporter ? "You" : "Review Team"}</span>
                          <span className="text-xs text-muted-foreground">{formatDateTime(msg.createdAt)}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Evidence */}
            {caseItem.attachments?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Attached Evidence</CardTitle></CardHeader>
                <CardContent>
                  {caseItem.attachments.map((att: any) => (
                    <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                      📎 {att.fileName}
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
