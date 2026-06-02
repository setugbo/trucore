"use client";

import { useState, useEffect } from "react";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { useOrgId } from "@/lib/use-org";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Loading } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, EyeOff, Eye, Copy, Globe, GlobeLock, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const statusBadge = (status: string) => {
  const variants: Record<string, "default" | "success" | "warning" | "secondary"> = {
    DRAFT: "secondary", PUBLISHED: "success", CLOSED: "warning",
  };
  return <Badge variant={variants[status] || "default"}>{status === "PUBLISHED" ? "Published" : status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
};

function AnonymousSurveysPageContent() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const orgId = useOrgId();

  useEffect(() => { if (!orgId) return; fetchSurveys(); }, [orgId]);

  async function fetchSurveys() {
    try {
      const res = await fetch(`/api/anonymous-surveys?organizationId=${orgId}`);
      if (res.ok) setSurveys(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function copyLink(publicLink: string | null) {
    if (!publicLink) { toast.error("No public link"); return; }
    await navigator.clipboard.writeText(`${window.location.origin}/survey/anonymous/${publicLink}`);
    toast.success("Link copied");
  }

  async function toggleStatus(surveyId: string, newStatus: string, wasPublic?: boolean) {
    try {
      const res = await fetch(`/api/anonymous-surveys/${surveyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) { toast.success(`Survey ${newStatus === "PUBLISHED" ? "published" : "closed"}`); fetchSurveys(); }
      else { const err = await res.json(); toast.error(err.error || "Failed"); }
    } catch { toast.error("Failed"); }
  }

  async function duplicateSurvey(survey: any) {
    try {
      const res = await fetch("/api/anonymous-surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId, title: survey.title + " (copy)", description: survey.description,
          category: survey.category, formStyle: survey.formStyle,
          questions: survey.questions?.map((q: any, i: number) => ({
            type: q.type, title: q.title, description: q.description, required: q.required, order: i, options: q.options,
          })) || [],
        }),
      });
      if (res.ok) { const data = await res.json(); toast.success("Survey duplicated"); router.push(`/dashboard/anonymous-surveys/${data.id}/edit`); }
      else { const err = await res.json(); toast.error(err.error || "Failed"); }
    } catch { toast.error("Failed to duplicate"); }
  }

  if (loading) return <Loading text="Loading surveys..." />;

  return (
    <div>
      <PageHeader title="Anonymous Surveys" description="Collect completely anonymous feedback"
        actions={<Link href="/dashboard/anonymous-surveys/new"><Button className="gap-2"><Plus className="h-4 w-4" /> New Survey</Button></Link>} />

      {surveys.length === 0 ? (
        <EmptyState icon={EyeOff} title="No anonymous surveys yet" description="Create anonymous surveys to collect honest, confidential feedback."
          action={{ label: "Create Anonymous Survey", onClick: () => router.push("/dashboard/anonymous-surveys/new") }} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <Card key={survey.id} className="premium-card hover:border-brand-300 dark:hover:border-brand-700">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{survey.title}</CardTitle>
                    {survey.description && <CardDescription className="line-clamp-2">{survey.description}</CardDescription>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {survey.status === "DRAFT" && (
                        <DropdownMenuItem onClick={() => toggleStatus(survey.id, "PUBLISHED")} className="gap-2">
                          <Globe className="h-4 w-4" /> Publish
                        </DropdownMenuItem>
                      )}
                      {survey.status === "PUBLISHED" && (
                        <DropdownMenuItem onClick={() => toggleStatus(survey.id, "CLOSED")} className="gap-2">
                          <GlobeLock className="h-4 w-4" /> Close
                        </DropdownMenuItem>
                      )}
                      {survey.status === "CLOSED" && (
                        <DropdownMenuItem onClick={() => toggleStatus(survey.id, "DRAFT")} className="gap-2">
                          <EyeOff className="h-4 w-4" /> Reopen as Draft
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => duplicateSurvey(survey)} className="gap-2">
                        <Copy className="h-4 w-4" /> Duplicate
                      </DropdownMenuItem>
                      {survey.publicLink && (
                        <DropdownMenuItem onClick={() => copyLink(survey.publicLink)} className="gap-2">
                          <Copy className="h-4 w-4" /> Copy Link
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-2">{statusBadge(survey.status)}</div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span>{survey._count?.responses || 0} responses</span>
                  <span>{survey.questions?.length || 0} questions</span>
                </div>
                <Link href={`/dashboard/anonymous-surveys/${survey.id}`}>
                  <Button variant="outline" size="sm" className="w-full gap-1"><Eye className="h-3.5 w-3.5" /> View Details</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnonymousSurveysPage() {
  return (
    <ErrorBoundary>
      <AnonymousSurveysPageContent />
    </ErrorBoundary>
  );
}
