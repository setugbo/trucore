"use client";

import { useState, useEffect } from "react";
import { useOrgId } from "@/lib/use-org";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { Loading } from "@/components/shared/loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, EyeOff, Shield, BarChart3, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const orgId = useOrgId();

  useEffect(() => {
    if (!orgId) return;

    async function fetchData() {
      try {
        const res = await fetch(`/api/reports?organizationId=${orgId}&type=overview`);
        if (res.ok) {
          const json = await res.json();
          setData(json.overview);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgId]);

  if (loading) return <Loading text="Loading dashboard..." />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome to TRUCORE. Here's your organization overview."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="General Surveys"
          value={data?.totalGeneralSurveys || 0}
          icon={ClipboardList}
          description="Total surveys created"
        />
        <StatsCard
          title="Anonymous Surveys"
          value={data?.totalAnonymousSurveys || 0}
          icon={EyeOff}
          description="Anonymous feedback forms"
        />
        <StatsCard
          title="Total Responses"
          value={(data?.totalGeneralResponses || 0) + (data?.totalAnonymousResponses || 0)}
          icon={Users}
          description="Across all surveys"
        />
        <StatsCard
          title="Open Cases"
          value={data?.openCases || 0}
          icon={Shield}
          description="Cases needing attention"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/dashboard/general-surveys/new">
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <ClipboardList className="h-5 w-5 text-brand-600" />
                  <div className="text-left">
                    <div className="font-medium">New General Survey</div>
                    <div className="text-xs text-muted-foreground">Create a standard survey</div>
                  </div>
                </Button>
              </Link>
              <Link href="/dashboard/anonymous-surveys/new">
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <EyeOff className="h-5 w-5 text-brand-600" />
                  <div className="text-left">
                    <div className="font-medium">New Anonymous Survey</div>
                    <div className="text-xs text-muted-foreground">Collect anonymous feedback</div>
                  </div>
                </Button>
              </Link>
              <Link href="/dashboard/cases/new">
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <Shield className="h-5 w-5 text-brand-600" />
                  <div className="text-left">
                    <div className="font-medium">New Case Report</div>
                    <div className="text-xs text-muted-foreground">File a confidential report</div>
                  </div>
                </Button>
              </Link>
              <Link href="/dashboard/reports">
                <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                  <BarChart3 className="h-5 w-5 text-brand-600" />
                  <div className="text-left">
                    <div className="font-medium">View Reports</div>
                    <div className="text-xs text-muted-foreground">Analytics and insights</div>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">General Responses</span>
                <span className="font-semibold">{data?.totalGeneralResponses || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Anonymous Responses</span>
                <span className="font-semibold">{data?.totalAnonymousResponses || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Cases</span>
                <span className="font-semibold">{data?.totalCases || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Resolved Cases</span>
                <span className="font-semibold">{data?.resolvedCases || 0}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Resolution Rate</span>
                  <span className="font-semibold text-emerald-600">
                    {data?.totalCases > 0
                      ? Math.round((data.resolvedCases / data.totalCases) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
