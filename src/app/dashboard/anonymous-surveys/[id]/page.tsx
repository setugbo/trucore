"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Loading } from "@/components/shared/loading";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Copy, Trash2, Download, Edit3, Files } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { exportToCSV } from "@/lib/export";
import { toast } from "sonner";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#5B21B6", "#7C3AED", "#C4B5FD", "#8B5CF6", "#A78BFA"];

function AnonSurveyDetailContent() {
  const params = useParams();
  const router = useRouter();
  const [survey, setSurvey] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSurvey(); }, [params.id]);

  async function fetchSurvey() {
    try {
      const [surveyRes, responsesRes] = await Promise.all([
        fetch(`/api/anonymous-surveys/${params.id}`),
        fetch(`/api/anonymous-surveys/${params.id}/responses`),
      ]);
      if (surveyRes.ok) setSurvey(await surveyRes.json());
      if (responsesRes.ok) setResponses(await responsesRes.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function copyLink() {
    if (!survey?.publicLink) { toast.error("No link available"); return; }
    await navigator.clipboard.writeText(`${window.location.origin}/survey/anonymous/${survey.publicLink}`);
    toast.success("Link copied!");
  }

  async function duplicateSurvey() {
    try {
      const res = await fetch("/api/anonymous-surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: survey.organizationId, title: survey.title + " (copy)", description: survey.description,
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

  async function deleteSurvey() {
    if (!confirm("Delete this survey?")) return;
    try {
      const res = await fetch(`/api/anonymous-surveys/${params.id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Survey deleted"); router.push("/dashboard/anonymous-surveys"); }
    } catch { toast.error("Failed to delete"); }
  }

  function exportAnonResponses() {
    if (responses.length === 0) { toast.error("No responses to export"); return; }
    const questions = survey?.questions || [];
    const csvData = responses.map((r: any, idx: number) => {
      const row: Record<string, any> = { "#": idx + 1, Token: r.token?.substring(0, 8) + "...", Submitted: formatDate(r.submittedAt) };
      questions.forEach((q: any) => {
        const answer = r.answers?.find((a: any) => a.questionId === q.id);
        row[q.title] = answer?.value || "";
      });
      return row;
    });
    exportToCSV(csvData, `${survey?.title?.replace(/\s+/g, "-")}-anonymous-responses`);
    toast.success("Responses exported (no identifying data)");
  }

  function getChartData(questionId: string) {
    const answerCounts: Record<string, number> = {};
    responses.forEach((r) => r.answers?.forEach((a: any) => { if (a.questionId === questionId) answerCounts[a.value] = (answerCounts[a.value] || 0) + 1; }));
    return Object.entries(answerCounts).map(([name, value]) => ({ name, value }));
  }

  if (loading) return <Loading text="Loading survey..." />;
  if (!survey) return <div className="text-center py-16">Survey not found</div>;

  return (
    <div>
      <PageHeader title={survey.title} description={survey.description || "Anonymous survey"}
        actions={
          <div className="flex gap-2">
            {responses.length > 0 && <Button variant="outline" size="sm" onClick={exportAnonResponses} className="gap-1"><Download className="h-4 w-4" /> Export CSV</Button>}
            {survey.status === "DRAFT" && <Link href={`/dashboard/anonymous-surveys/${survey.id}/edit`}><Button variant="outline" size="sm" className="gap-1"><Edit3 className="h-4 w-4" /> Edit</Button></Link>}
            <Button variant="outline" size="sm" onClick={duplicateSurvey} className="gap-1"><Files className="h-4 w-4" /> Duplicate</Button>
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-1"><Copy className="h-4 w-4" /> Copy Link</Button>
            <Button variant="outline" size="sm" onClick={deleteSurvey} className="gap-1 text-destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
            <Link href="/dashboard/anonymous-surveys"><Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
          </div>
        } />

      <div className="flex gap-4 mb-6">
        <Badge>{survey.status}</Badge>
        <Badge variant="secondary">{survey.formStyle}</Badge>
        <span className="text-sm text-muted-foreground">{survey._count?.responses || 0} anonymous responses &middot; {survey.questions?.length || 0} questions</span>
      </div>

      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="responses">Responses {responses.length > 0 && `(${responses.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          {responses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No data to analyze yet</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {survey.questions?.map((question: any) => {
                const data = getChartData(question.id);
                if (data.length === 0) return null;
                return (
                  <Card key={question.id}>
                    <CardHeader><CardTitle className="text-sm">{question.title}</CardTitle></CardHeader>
                    <CardContent>
                      {data.length <= 5 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis /><Tooltip />
                            <Bar dataKey="value" fill="#5B21B6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                              {data.map((_, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
                            </Pie><Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="responses" className="mt-6">
          {responses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No anonymous responses yet</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={exportAnonResponses} className="gap-2"><Download className="h-4 w-4" /> Export All Responses (CSV)</Button>
              </div>
              {responses.map((response: any, i: number) => (
                <Card key={response.id}>
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Response #{i + 1}</CardTitle>
                      <span className="text-xs text-muted-foreground">{formatDate(response.submittedAt)}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {response.answers?.map((answer: any) => (
                        <div key={answer.id} className="text-sm"><span className="font-medium">{answer.question?.title}: </span><span className="text-muted-foreground">{answer.value}</span></div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AnonSurveyDetailPage() {
  return <ErrorBoundary><AnonSurveyDetailContent /></ErrorBoundary>;
}
