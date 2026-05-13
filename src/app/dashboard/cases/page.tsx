"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Loading } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Shield, MessageSquare, Paperclip } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CASE_STATUS_COLORS } from "@/lib/constants";
import { useOrgId } from "@/lib/use-org";
import Link from "next/link";

function CasesContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const orgId = useOrgId();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (!orgId) return;
    fetchCases();
  }, [orgId, statusFilter]);

  async function fetchCases() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ organizationId: orgId! });
      if (statusFilter) params.append("status", statusFilter);
      const res = await fetch(`/api/cases?${params}`);
      if (!res.ok) { setError("Failed to load cases"); return; }
      setCases(await res.json());
    } catch (err: any) { setError(err.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  if (!orgId) return <Loading text="Loading organization..." />;
  if (loading) return <Loading text="Loading cases..." />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Shield className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Error loading cases</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-4">{error}</p>
        <Button onClick={fetchCases}>Retry</Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Whistleblowing Cases" description="Manage confidential reports and cases"
        actions={<Link href="/dashboard/cases/new"><Button className="gap-2"><Plus className="h-4 w-4" /> New Report</Button></Link>} />

      <div className="mb-6">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All statuses</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="ESCALATED">Escalated</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {cases.length === 0 ? (
        <EmptyState icon={Shield} title="No cases yet" description="No whistleblowing reports submitted yet."
          action={{ label: "Submit Report", onClick: () => router.push("/dashboard/cases/new") }} />
      ) : (
        <div className="grid gap-4">
          {cases.map((caseItem: any) => (
            <Link key={caseItem.id} href={`/dashboard/cases/${caseItem.id}`}>
              <Card className="premium-card hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-muted-foreground">{caseItem.caseId}</span>
                        <Badge className={CASE_STATUS_COLORS[caseItem.status] || ""}>{caseItem.status?.replace(/_/g, " ") || "Unknown"}</Badge>
                        <Badge variant="outline" className="text-xs">{caseItem.priority || "normal"}</Badge>
                      </div>
                      <h3 className="font-semibold">{caseItem.title}</h3>
                      {caseItem.category && <p className="text-sm text-muted-foreground">{caseItem.category}</p>}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground shrink-0">
                      <div className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{caseItem._count?.messages || 0}</div>
                      <div className="flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" />{caseItem._count?.attachments || 0}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>Created {formatDate(caseItem.createdAt)}</span>
                    {caseItem.assignedTo?.name && <span>Assigned to {caseItem.assignedTo.name}</span>}
                    <span>{caseItem.isAnonymous ? "Anonymous" : "Identified"}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CasesPage() {
  return <ErrorBoundary><CasesContent /></ErrorBoundary>;
}
