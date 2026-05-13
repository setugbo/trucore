"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Loading } from "@/components/shared/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#5B21B6", "#7C3AED", "#C4B5FD", "#8B5CF6", "#A78BFA"];

export default function SurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [survey, setSurvey] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSurvey(); }, [params.id]);

  async function fetchSurvey() {
    try {
      const [surveyRes, responsesRes] = await Promise.all([
        fetch(`/api/general-surveys/${params.id}`),
        fetch(`/api/general-surveys/${params.id}/responses`),
      ]);
      if (surveyRes.ok) setSurvey(await surveyRes.json());
      if (responsesRes.ok) setResponses(await responsesRes.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function copyLink() {
    if (!survey?.publicLink) { toast.error("Survey is not public"); return; }
    const url = `${window.location.origin}/survey/${survey.publicLink}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  }

  async function deleteSurvey() {
    if (!confirm("Delete this survey?")) return;
    try {
      const res = await fetch(`/api/general-surveys/${params.id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Survey deleted"); router.push("/dashboard/general-surveys"); }
    } catch { toast.error("Failed to delete"); }
  }

  function getChartData(questionId: string) {
    const answerCounts: Record<string, number> = {};
    responses.forEach((r) => {
      r.answers?.forEach((a: any) => {
        if (a.questionId === questionId) {
          answerCounts[a.value] = (answerCounts[a.value] || 0) + 1;
        }
      });
    });
    return Object.entries(answerCounts).map(([name, value]) => ({ name, value }));
  }

  if (loading) return <Loading text="Loading survey..." />;
  if (!survey) return <div className="text-center py-16">Survey not found</div>;

  return (
    <div>
      <PageHeader
        title={survey.title}
        description={survey.description || "No description"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-1">
              <Copy className="h-4 w-4" /> Copy Link
            </Button>
            <Button variant="outline" size="sm" onClick={deleteSurvey} className="gap-1 text-destructive">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
            <Link href="/dashboard/general-surveys">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex gap-4 mb-6">
        <Badge>{survey.status}</Badge>
        <Badge variant="secondary">{survey.formStyle}</Badge>
        {survey.category && <Badge variant="outline">{survey.category}</Badge>}
        <span className="text-sm text-muted-foreground">
          {survey._count?.responses || 0} responses &middot; {survey.questions?.length || 0} questions
        </span>
      </div>

      <Tabs defaultValue="responses">
        <TabsList>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="responses" className="mt-6">
          {responses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No responses yet</div>
          ) : (
            <div className="space-y-4">
              {responses.map((response) => (
                <Card key={response.id}>
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {response.user?.name || response.user?.email}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">{formatDate(response.submittedAt)}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {response.answers?.map((answer: any) => (
                        <div key={answer.id} className="text-sm">
                          <span className="font-medium">{answer.question?.title}: </span>
                          <span className="text-muted-foreground">{answer.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {responses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No data to analyze</div>
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
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#5B21B6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                              {data.map((_, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
                            </Pie>
                            <Tooltip />
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

        <TabsContent value="questions" className="mt-6">
          <div className="space-y-4">
            {survey.questions?.map((question: any, index: number) => (
              <Card key={question.id}>
                <CardHeader className="py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Q{index + 1}</span>
                    <CardTitle className="text-sm">{question.title}</CardTitle>
                    {question.required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <Badge variant="outline">{question.type.replace(/_/g, " ")}</Badge>
                    {question.description && <span>{question.description}</span>}
                  </div>
                  {question.options && (
                    <div className="mt-2 text-sm text-muted-foreground">Options: {question.options}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
