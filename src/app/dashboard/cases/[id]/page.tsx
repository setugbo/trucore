"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Loading } from "@/components/shared/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { CASE_STATUS_COLORS } from "@/lib/constants";
import { toast } from "sonner";
import Link from "next/link";

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [caseItem, setCaseItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => { fetchCase(); }, [params.id]);

  async function fetchCase() {
    try {
      const res = await fetch(`/api/cases/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setCaseItem(data);
        setNewStatus(data.status);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function sendMessage() {
    if (!message.trim()) return;
    try {
      const res = await fetch(`/api/cases/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message, isFromReporter: false }),
      });
      if (res.ok) { setMessage(""); fetchCase(); toast.success("Message sent"); }
    } catch { toast.error("Failed to send message"); }
  }

  async function updateStatus() {
    try {
      const res = await fetch(`/api/cases/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) { toast.success("Status updated"); fetchCase(); }
    } catch { toast.error("Failed to update status"); }
  }

  if (loading) return <Loading text="Loading case..." />;
  if (!caseItem) return <div className="text-center py-16">Case not found</div>;

  return (
    <div>
      <PageHeader
        title={`Case ${caseItem.caseId}`}
        description={caseItem.title}
        actions={
          <Link href="/dashboard/cases">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{caseItem.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Messages ({caseItem.messages?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {caseItem.messages?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet</p>
              ) : (
                caseItem.messages?.map((msg: any) => (
                  <div key={msg.id} className={`rounded-lg p-4 ${msg.isFromReporter ? "bg-muted ml-8" : "bg-brand-50 dark:bg-brand-950/30 mr-8"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{msg.isFromReporter ? "Reporter" : msg.sender?.name || "Team"}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(msg.createdAt)}</span>
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))
              )}
              <div className="flex gap-2 pt-2">
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message..." className="min-h-[60px]"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                <Button size="icon" onClick={sendMessage} disabled={!message.trim()}><Send className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><span className="text-xs text-muted-foreground">Status</span>
                <Badge className={CASE_STATUS_COLORS[caseItem.status]}>{caseItem.status.replace(/_/g, " ")}</Badge></div>
              <div><span className="text-xs text-muted-foreground">Category</span><p className="text-sm">{caseItem.category || "Not specified"}</p></div>
              <div><span className="text-xs text-muted-foreground">Priority</span><Badge variant="outline">{caseItem.priority}</Badge></div>
              <div><span className="text-xs text-muted-foreground">Submitted</span><p className="text-sm">{formatDateTime(caseItem.createdAt)}</p></div>
              <div><span className="text-xs text-muted-foreground">Type</span><p className="text-sm">{caseItem.isAnonymous ? "Anonymous" : "Identified"}</p></div>
              {caseItem.reporterToken && caseItem.isAnonymous && (
                <div><span className="text-xs text-muted-foreground">Tracking Code</span><p className="text-sm font-mono text-brand-600 select-all">{caseItem.reporterToken}</p></div>
              )}
              {caseItem.assignedTo && <div><span className="text-xs text-muted-foreground">Assigned To</span><p className="text-sm">{caseItem.assignedTo.name}</p></div>}
              <div className="pt-4 border-t space-y-3">
                <span className="text-xs text-muted-foreground">Update Status</span>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="ESCALATED">Escalated</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="w-full" onClick={updateStatus}>Update</Button>
              </div>
            </CardContent>
          </Card>
          {caseItem.attachments?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Attachments</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {caseItem.attachments.map((att: any) => (
                  <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                    <Paperclip className="h-3.5 w-3.5" />{att.fileName}</a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
