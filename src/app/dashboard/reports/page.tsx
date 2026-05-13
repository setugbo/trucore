"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/page-header";
import { Loading } from "@/components/shared/loading";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, BarChart3, Printer, FileSpreadsheet, FileBarChart, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { exportToCSV } from "@/lib/export";
import { toast } from "sonner";
import { useOrgId } from "@/lib/use-org";
import { formatDate } from "@/lib/utils";

const COLORS = ["#5B21B6", "#7C3AED", "#C4B5FD", "#8B5CF6", "#A78BFA", "#DDD6FE"];

function ReportsContent() {
  const orgId = useOrgId();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!orgId) return; fetchReports(); }, [orgId]);

  async function fetchReports() {
    try {
      const res = await fetch(`/api/reports?organizationId=${orgId}`);
      if (res.ok) setData(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // Per-module CSV exports
  function exportGeneralSurveys() {
    const surveys = data?.surveys || [];
    if (surveys.length === 0) { toast.error("No data to export"); return; }
    const csv = surveys.map((s: any) => ({
      Title: s.title,
      Status: s.status,
      Responses: s.responseCount,
      "Created Date": formatDate(s.createdAt),
    }));
    exportToCSV(csv, "general-surveys-report");
    toast.success("General surveys exported");
  }

  function exportAnonymousSurveys() {
    toast.success("Anonymous survey data is aggregate-only by design (no identifiable data)");
  }

  function exportCases() {
    const cases = data?.caseStatuses || [];
    if (cases.length === 0) { toast.error("No case data to export"); return; }
    exportToCSV(cases, "cases-status-report");
    toast.success("Case status report exported");
  }

  function exportAll() {
    const overview = data?.overview || {};
    const allData = [
      { Metric: "General Surveys", Value: overview.totalGeneralSurveys || 0 },
      { Metric: "General Responses", Value: overview.totalGeneralResponses || 0 },
      { Metric: "Anonymous Surveys", Value: overview.totalAnonymousSurveys || 0 },
      { Metric: "Anonymous Responses", Value: overview.totalAnonymousResponses || 0 },
      { Metric: "Total Cases", Value: overview.totalCases || 0 },
      { Metric: "Open Cases", Value: overview.openCases || 0 },
      { Metric: "Resolved Cases", Value: overview.resolvedCases || 0 },
      { Metric: "Resolution Rate", Value: overview.totalCases > 0 ? Math.round((overview.resolvedCases / overview.totalCases) * 100) + "%" : "0%" },
    ];
    exportToCSV(allData, "trucore-full-report");
    toast.success("Full report exported");
  }

  if (!orgId) return <Loading text="Loading..." />;
  if (loading) return <Loading text="Loading reports..." />;

  const overview = data?.overview || {};
  const caseStatusData = data?.caseStatuses?.map((s: any) => ({ name: s.status.replace(/_/g, " "), value: s.count })) || [];
  const surveyData = data?.surveys?.slice(0, 10).map((s: any) => ({ name: s.title.substring(0, 25), responses: s.responseCount })) || [];

  return (
    <div>
      <PageHeader title="Reports & Analytics" description="Comprehensive insights across all modules"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-2" onClick={exportGeneralSurveys} title="Export General Survey data">
              <FileSpreadsheet className="h-4 w-4" /> Surveys
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={exportCases} title="Export Case data">
              <FileBarChart className="h-4 w-4" /> Cases
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={exportAll} title="Export everything">
              <Download className="h-4 w-4" /> Full Report
            </Button>
          </div>
        } />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="surveys" className="gap-2"><FileSpreadsheet className="h-4 w-4" /> General Surveys</TabsTrigger>
          <TabsTrigger value="anonymous" className="gap-2"><Eye className="h-4 w-4" /> Anonymous</TabsTrigger>
          <TabsTrigger value="cases" className="gap-2"><FileBarChart className="h-4 w-4" /> Cases</TabsTrigger>
          <TabsTrigger value="trends" className="gap-2"><LineChart className="h-4 w-4" /> Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">General Surveys</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{overview.totalGeneralSurveys || 0}</p><p className="text-xs text-muted-foreground">{overview.totalGeneralResponses || 0} responses</p></CardContent></Card>
            <Card><CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">Anonymous Surveys</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{overview.totalAnonymousSurveys || 0}</p><p className="text-xs text-muted-foreground">{overview.totalAnonymousResponses || 0} responses</p></CardContent></Card>
            <Card><CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">Total Cases</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{overview.totalCases || 0}</p><p className="text-xs text-muted-foreground">{overview.openCases || 0} open</p></CardContent></Card>
            <Card><CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">Resolution Rate</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{overview.totalCases > 0 ? Math.round((overview.resolvedCases / overview.totalCases) * 100) : 0}%</p>
                <p className="text-xs text-muted-foreground">{overview.resolvedCases || 0} resolved</p></CardContent></Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-sm">Survey Responses</CardTitle></CardHeader>
              <CardContent>{surveyData.length === 0 ? <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">No survey data</div> :
                <ResponsiveContainer width="100%" height={250}><BarChart data={surveyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip />
                  <Bar dataKey="responses" fill="#5B21B6" radius={[4, 4, 0, 0]} />
                </BarChart></ResponsiveContainer>}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Case Status Distribution</CardTitle></CardHeader>
              <CardContent>{caseStatusData.length === 0 ? <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">No case data</div> :
                <ResponsiveContainer width="100%" height={250}><PieChart>
                  <Pie data={caseStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {caseStatusData.map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie><Tooltip />
                </PieChart></ResponsiveContainer>}</CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="surveys" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>General Survey Performance</CardTitle>
                <Button variant="outline" size="sm" onClick={exportGeneralSurveys} className="gap-2">
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {surveyData.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">No surveys created yet</div>
              ) : (
                <div className="space-y-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={surveyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis /><Tooltip />
                      <Bar dataKey="responses" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-muted"><th className="text-left p-3 font-medium">Survey</th><th className="text-left p-3 font-medium">Status</th><th className="text-right p-3 font-medium">Responses</th><th className="text-right p-3 font-medium">Created</th></tr></thead>
                      <tbody>
                        {(data?.surveys || []).map((s: any) => (
                          <tr key={s.id} className="border-t"><td className="p-3">{s.title}</td>
                            <td className="p-3"><Badge variant={s.status === "PUBLISHED" ? "success" : "secondary"}>{s.status}</Badge></td>
                            <td className="p-3 text-right">{s.responseCount}</td>
                            <td className="p-3 text-right text-muted-foreground">{formatDate(s.createdAt)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anonymous" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Anonymous Survey Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 mb-6">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  No identifiable data is stored for anonymous surveys. Only aggregate response counts are available.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card><CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">Anon Surveys</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold">{overview.totalAnonymousSurveys || 0}</p></CardContent></Card>
                <Card><CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">Anon Responses</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold">{overview.totalAnonymousResponses || 0}</p></CardContent></Card>
                <Card><CardHeader className="py-4"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Responses/Survey</CardTitle></CardHeader>
                  <CardContent><p className="text-3xl font-bold">{overview.totalAnonymousSurveys > 0 ? (overview.totalAnonymousResponses / overview.totalAnonymousSurveys).toFixed(1) : 0}</p></CardContent></Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Case Analytics</CardTitle>
                <Button variant="outline" size="sm" onClick={exportCases} className="gap-2">
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {caseStatusData.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">No cases filed yet</div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <ResponsiveContainer width="100%" height={300}><PieChart>
                    <Pie data={caseStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {caseStatusData.map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie><Tooltip />
                  </PieChart></ResponsiveContainer>
                  <div className="space-y-4">
                    <h3 className="font-semibold">Status Breakdown</h3>
                    {caseStatusData.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold">{item.value}</span>
                      </div>
                    ))}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Resolution Rate</span>
                        <span className="font-bold">{overview.totalCases > 0 ? Math.round((overview.resolvedCases / overview.totalCases) * 100) : 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Monthly Trends</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data?.trends?.surveys?.map((_: any, i: number) => ({
                  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i] || `M${i+1}`,
                  surveys: data.trends.surveys[i] || 0,
                  cases: data.trends.cases[i] || 0,
                })) || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="surveys" stroke="#5B21B6" strokeWidth={2} dot={{ r: 4 }} name="Surveys" />
                  <Line type="monotone" dataKey="cases" stroke="#C4B5FD" strokeWidth={2} dot={{ r: 4 }} name="Cases" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ReportsPage() {
  return <ErrorBoundary><ReportsContent /></ErrorBoundary>;
}
