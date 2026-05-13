"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Loading } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, EyeOff, Eye, Copy } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AnonymousSurveysPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const memberships = (session?.user as any)?.memberships || [];
  const orgId = memberships[0]?.organizationId;

  useEffect(() => {
    if (!orgId) return;
    fetchSurveys();
  }, [orgId]);

  async function fetchSurveys() {
    try {
      const res = await fetch(`/api/anonymous-surveys?organizationId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setSurveys(data);
      }
    } catch (err) {
      console.error("Failed to fetch surveys", err);
    } finally {
      setLoading(false);
    }
  }

  async function copyLink(surveyId: string, publicLink: string | null) {
    if (!publicLink) {
      toast.error("No public link available");
      return;
    }
    const url = `${window.location.origin}/survey/anonymous/${publicLink}`;
    await navigator.clipboard.writeText(url);
    toast.success("Survey link copied to clipboard");
  }

  const statusBadge = (status: string) => {
    const variants: Record<string, "default" | "success" | "warning" | "secondary"> = {
      DRAFT: "secondary",
      PUBLISHED: "success",
      CLOSED: "warning",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) return <Loading text="Loading surveys..." />;

  return (
    <div>
      <PageHeader
        title="Anonymous Surveys"
        description="Collect completely anonymous feedback"
        actions={
          <Link href="/dashboard/anonymous-surveys/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Survey
            </Button>
          </Link>
        }
      />

      {surveys.length === 0 ? (
        <EmptyState
          icon={EyeOff}
          title="No anonymous surveys yet"
          description="Create anonymous surveys to collect honest, confidential feedback."
          action={{
            label: "Create Anonymous Survey",
            onClick: () => router.push("/dashboard/anonymous-surveys/new"),
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <Card key={survey.id} className="premium-card hover:border-brand-300 dark:hover:border-brand-700">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{survey.title}</CardTitle>
                    {survey.description && (
                      <CardDescription className="line-clamp-2">{survey.description}</CardDescription>
                    )}
                  </div>
                  {statusBadge(survey.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span>{survey._count.responses} responses</span>
                  <span>{survey.questions.length} questions</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/anonymous-surveys/${survey.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-1">
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyLink(survey.id, survey.publicLink)}
                    className="gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
