"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Loading } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Shield, MessageSquare, Paperclip } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CASE_STATUS_COLORS } from "@/lib/constants";
import Link from "next/link";

export default function CasesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const memberships = (session?.user as any)?.memberships || [];
  const orgId = memberships[0]?.organizationId;

  useEffect(() => {
    if (!orgId) return;
    fetchCases();
  }, [orgId, statusFilter]);

  async function fetchCases() {
    try {
      const params = new URLSearchParams({ organizationId: orgId });
      if (statusFilter) params.append("status", statusFilter);
      const res = await fetch(`/api/cases?${params}`);
      if (res.ok) setCases(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return <Loading text="Loading cases..." />;

  return (
    <div>
      <PageHeader
        title="Whistleblowing Cases"
        description="Manage confidential reports and cases"
        actions={
          <Link href="/dashboard/cases/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Report
            </Button>
          </Link>
        }
      />

      <div className="mb-6">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setLoading(true); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="ESCALATED">Escalated</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {cases.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No cases yet"
          description="No whistleblowing reports have been submitted yet."
          action={{ label: "Submit Report", onClick: () => router.push("/dashboard/cases/new") }}
        />
      ) : (
        <div className="grid gap-4">
          {cases.map((caseItem) => (
            <Link key={caseItem.id} href={`/dashboard/cases/${caseItem.id}`}>
              <Card className="premium-card hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">{caseItem.caseId}</span>
                        <Badge className={CASE_STATUS_COLORS[caseItem.status]}>
                          {caseItem.status.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{caseItem.priority}</Badge>
                      </div>
                      <h3 className="font-semibold">{caseItem.title}</h3>
                      {caseItem.category && (
                        <p className="text-sm text-muted-foreground">{caseItem.category}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {caseItem._count?.messages || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        {caseItem._count?.attachments || 0}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Created {formatDate(caseItem.createdAt)}</span>
                    {caseItem.assignedTo && (
                      <span>Assigned to {caseItem.assignedTo.name}</span>
                    )}
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
