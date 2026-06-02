"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Loading } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardList, Eye, Copy, Globe, GlobeLock, ExternalLink, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useOrgId } from "@/lib/use-org";

const statusBadge = (status: string) => {
  const v: Record<string, "default" | "success" | "warning" | "secondary"> = { DRAFT: "secondary", PUBLISHED: "success", CLOSED: "warning" };
  return <Badge variant={v[status] || "default"}>{status === "PUBLISHED" ? "Published" : status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
};

function GeneralSurveysContent() {
  const router = useRouter();
  const orgId = useOrgId();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!orgId) return; fetchSurveys(); }, [orgId]);

  async function fetchSurveys() {
    try {
      const res = await fetch(`/api/general-surveys?organizationId=${orgId}`);
      if (res.ok) setSurveys(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function copyLink(publicLink: string | null) {
    if (!publicLink) { toast.error("Survey is not public"); return; }
    await navigator.clipboard.writeText(`${window.location.origin}/survey/${publicLink}`);
    toast.success("Survey link copied");
  }

  async function toggleStatus(surveyId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/general-surveys/${surveyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) { toast.success(`Survey ${newStatus === "PUBLISHED" ? "published" : "closed"}`); fetchSurveys(); }
      else { const err = await res.json(); toast.error(err.error || "Failed"); }
    } catch { toast.error("Failed to update status"); }
  }

  async function duplicateSurvey(survey: any) {
    try {
      const res = await fetch("/api/general-surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId, title: survey.title + " (copy)", description: survey.description,
          category: survey.category, formStyle: survey.formStyle, isPublic: false,
          questions: survey.questions?.map((q: any, i: number) => ({
            type: q.type, title: q.title, description: q.description, required: q.required, order: i, options: q.options,
          })) || [],
        }),
      });
      if (res.ok) { const data = await res.json(); toast.success("Survey duplicated"); router.push(`/dashboard/general-surveys/${data.id}/edit`); }
      else { const err = await res.json(); toast.error(err.error || "Failed"); }
    } catch { toast.error("Failed to duplicate"); }
  }

  if (!orgId) return <Loading text="Loading..." />;
  if (loading) return <Loading text="Loading surveys..." />;

  return (
    <div>
      <PageHeader title="General Surveys" description="Create and manage standard internal surveys"
        actions={<Link href="/dashboard/general-surveys/new"><Button className="gap-2"><Plus className="h-4 w-4" /> New Survey</Button></Link>} />

      {surveys.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No surveys yet" description="Create your first survey."
          action={{ label: "Create Survey", onClick: () => router.push("/dashboard/general-surveys/new") }} />
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
                      {survey.status === "DRAFT" && <DropdownMenuItem onClick={() => toggleStatus(survey.id, "PUBLISHED")} className="gap-2"><Globe className="h-4 w-4" /> Publish</DropdownMenuItem>}
                      {survey.status === "PUBLISHED" && <DropdownMenuItem onClick={() => toggleStatus(survey.id, "CLOSED")} className="gap-2"><GlobeLock className="h-4 w-4" /> Close</DropdownMenuItem>}
                      {survey.status === "CLOSED" && <DropdownMenuItem onClick={() => toggleStatus(survey.id, "DRAFT")} className="gap-2"><ClipboardList className="h-4 w-4" /> Reopen as Draft</DropdownMenuItem>}
                      <DropdownMenuItem onClick={() => duplicateSurvey(survey)} className="gap-2"><Copy className="h-4 w-4" /> Duplicate</DropdownMenuItem>
                      {survey.publicLink && <DropdownMenuItem onClick={() => copyLink(survey.publicLink)} className="gap-2"><ExternalLink className="h-4 w-4" /> Copy Link</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-2">{statusBadge(survey.status)}</div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span>{survey._count?.responses || 0} responses</span>
                  <span>{survey.questions?.length || 0} questions</span>
                  {survey.formStyle && <Badge variant="outline" className="text-[10px]">{survey.formStyle}</Badge>}
                </div>
                <Link href={`/dashboard/general-surveys/${survey.id}`}>
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

export default function GeneralSurveysPage() {
  return <ErrorBoundary><GeneralSurveysContent /></ErrorBoundary>;
}
