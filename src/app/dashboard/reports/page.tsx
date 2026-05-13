"use client";

import { useState, useEffect } from "react";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { useOrgId } from "@/lib/use-org";
import { PageHeader } from "@/components/layout/page-header";
import { Loading } from "@/components/shared/loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, BarChart3, Printer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { exportToCSV, printWindow } from "@/lib/export";
import { toast } from "sonner";

const COLORS = ["#5B21B6", "#7C3AED", "#C4B5FD", "#8B5CF6", "#A78BFA", "#DDD6FE"];

function ReportsPageContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const orgId = useOrgId();

  useEffect(() => { if (!orgId) return; fetchReports(); }, [orgId]);

  async function fetchReports() {
    try {
      const res = await fetch(`/api/reports?organizationId=${orgId}`);
      if (res.ok) setData(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function handleCSVExport() {
    const overview = data?.overview || {};
    const csvData = [
      { Metric: "General Surveys", Count: overview.totalGeneralSurveys || 0 },
      { Metric: "General Responses", Count: overview.totalGeneralResponses || 0 },
      { Metric: "Anonymous Surveys", Count: overview.totalAnonymousSurveys || 0 },
      { Metric: "Anonymous Responses", Count: overview.totalAnonymousResponses || 0 },
      { Metric: "Total Cases", Count: overview.totalCases || 0 },
      { Metric: "Open Cases", Count: overview.openCases || 0 },
      { Metric: "Resolved Cases", Count: overview.resolvedCases || 0 },
    ];
    const surveys = data?.surveys || [];
    const allData = [
      ...csvData,
      ...surveys.map((s: any) => ({ Metric: `Survey: ${s.title}`, Count: s.responseCount })),
    ];
    exportToCSV(allData, "trucore-report");
    toast.success("CSV exported");
  }

  function handlePrint() {
    printWindow("TRUCORE Report");
    toast.success("Print window opened");
  }

  if (loading) return <Loading text="Loading reports..." />;

  const overview = data?.overview || {};
  const caseStatusData = data?.caseStatuses?.map((s: any) => ({ name: s.status.replace(/_/g, " "), value: s.count })) || [];
  const surveyData = data?.surveys?.slice(0, 10).map((s: any) => ({ name: s.title.substring(0, 20), responses: s.responseCount })) || [];

  const trendMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    return d.toLocaleString("default", { month: "short" });
  });
  const trendData = trendMonths.map((month, i) => ({
    month,
    surveys: data?.trends?.surveys?.[i] || (i < 3 && data?.overview?.totalGeneralSurveys ? 1 : 0),
    responses: data?.trends?.responses?.[i] || (i < 3 && data?.overview?.totalGeneralResponses ? Math.floor(data.overview.totalGeneralResponses / 3) : 0),
    cases: data?.trends?.cases?.[i] || (i < 3 && data?.overview?.totalCases ? 1 : 0),
  }));

  return (
    <div id="print-content">
      <PageHeader
        title="Reports & Analytics"
        description="Insights across all modules"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleCSVExport}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="cases">Cases</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
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
              <CardContent>{surveyData.length === 0 ? <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">No data</div> :
                <ResponsiveContainer width="100%" height={250}><BarChart data={surveyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip />
                  <Bar dataKey="responses" fill="#5B21B6" radius={[4, 4, 0, 0]} />
                </BarChart></ResponsiveContainer>}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Case Status Distribution</CardTitle></CardHeader>
              <CardContent>{caseStatusData.length === 0 ? <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">No data</div> :
                <ResponsiveContainer width="100%" height={250}><PieChart>
                  <Pie data={caseStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {caseStatusData.map((_: any, index: number) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
                  </Pie><Tooltip />
                </PieChart></ResponsiveContainer>}</CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="surveys" className="mt-6">
          <Card><CardHeader><CardTitle>Survey Performance</CardTitle></CardHeader>
            <CardContent>{surveyData.length === 0 ? <div className="text-center py-16 text-muted-foreground">No survey data available</div> :
              <ResponsiveContainer width="100%" height={400}><BarChart data={surveyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip />
                <Bar dataKey="responses" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart></ResponsiveContainer>}</CardContent></Card>
        </TabsContent>

        <TabsContent value="cases" className="mt-6">
          <Card><CardHeader><CardTitle>Case Analytics</CardTitle></CardHeader>
            <CardContent>{caseStatusData.length === 0 ? <div className="text-center py-16 text-muted-foreground">No case data available</div> :
              <div className="grid gap-6 md:grid-cols-2">
                <ResponsiveContainer width="100%" height={300}><PieChart>
                  <Pie data={caseStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {caseStatusData.map((_: any, index: number) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
                  </Pie><Tooltip />
                </PieChart></ResponsiveContainer>
                <div className="space-y-3"><h3 className="font-semibold">Status Breakdown</h3>
                  {caseStatusData.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="text-sm">{item.name}</span></div>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>))}</div>
              </div>}</CardContent></Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <Card><CardHeader><CardTitle>Monthly Trends</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="surveys" stroke="#5B21B6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="responses" stroke="#7C3AED" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="cases" stroke="#C4B5FD" strokeWidth={2} dot={{ r: 4 }} />
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
  return (
    <ErrorBoundary>
      <ReportsPageContent />
    </ErrorBoundary>
  );
}
