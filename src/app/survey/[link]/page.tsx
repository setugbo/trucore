"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/shared/logo";
import { Loading } from "@/components/shared/loading";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function PublicSurveyPage() {
  const params = useParams();
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSurvey();
  }, [params.link]);

  async function fetchSurvey() {
    try {
      const res = await fetch(`/api/general-surveys/${params.link}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setSurvey(data);
    } catch {
      setSurvey(null);
    } finally {
      setLoading(false);
    }
  }

  function handleAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function submitSurvey() {
    const missing = survey.questions?.filter((q: any) => q.required && !answers[q.id]);
    if (missing?.length > 0) {
      toast.error("Please answer all required questions");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/general-surveys/${params.link}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
        }),
      });

      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
      toast.success("Response submitted successfully!");
    } catch {
      toast.error("Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loading text="Loading survey..." />
    </div>
  );

  if (!survey) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Survey not found</h1>
        <p className="text-muted-foreground mt-2">This survey may be closed or doesn't exist.</p>
      </div>
    </div>
  );

  if (survey.status === "CLOSED") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Survey Closed</CardTitle>
            <CardDescription className="text-base mt-2">This survey is no longer accepting responses.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (survey.endDate && new Date(survey.endDate) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Survey Ended</CardTitle>
            <CardDescription className="text-base mt-2">This survey ended on {new Date(survey.endDate).toLocaleDateString()}.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (survey.startDate && new Date(survey.startDate) > new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Not Yet Open</CardTitle>
            <CardDescription className="text-base mt-2">This survey will open on {new Date(survey.startDate).toLocaleDateString()}.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-2xl">Thank You!</CardTitle>
            <CardDescription className="text-base mt-2">
              Your response has been recorded successfully.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const renderQuestion = (question: any, index: number) => {
    const isNotion = survey.formStyle === "NOTION";
    const wrapperClass = isNotion ? "mb-8" : "mb-0";

    return (
      <div key={question.id} className={wrapperClass}>
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Q{index + 1}</span>
            <h3 className="font-medium">
              {question.title}
              {question.required && <span className="text-destructive ml-1">*</span>}
            </h3>
          </div>
          {question.description && (
            <p className="text-sm text-muted-foreground mt-1">{question.description}</p>
          )}
        </div>

        {question.type === "SHORT_TEXT" && (
          <Input value={answers[question.id] || ""} onChange={(e) => handleAnswer(question.id, e.target.value)} placeholder="Your answer..." />
        )}

        {question.type === "LONG_TEXT" && (
          <Textarea value={answers[question.id] || ""} onChange={(e) => handleAnswer(question.id, e.target.value)} placeholder="Your answer..." rows={4} />
        )}

        {question.type === "YES_NO" && (
          <RadioGroup value={answers[question.id]} onValueChange={(v) => handleAnswer(question.id, v)}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="Yes" id={`${question.id}-yes`} />
                <Label htmlFor={`${question.id}-yes`}>Yes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="No" id={`${question.id}-no`} />
                <Label htmlFor={`${question.id}-no`}>No</Label>
              </div>
            </div>
          </RadioGroup>
        )}

        {question.type === "MULTIPLE_CHOICE" && question.options && (
          <RadioGroup value={answers[question.id]} onValueChange={(v) => handleAnswer(question.id, v)}>
            {question.options.split("\n").filter(Boolean).map((opt: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <RadioGroupItem value={opt.trim()} id={`${question.id}-${i}`} />
                <Label htmlFor={`${question.id}-${i}`}>{opt.trim()}</Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.type === "CHECKBOX" && question.options && (
          <div className="space-y-2">
            {question.options.split("\n").filter(Boolean).map((opt: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox
                  id={`${question.id}-${i}`}
                  checked={(answers[question.id] || "").split(", ").includes(opt.trim())}
                  onCheckedChange={(checked) => {
                    const current = (answers[question.id] || "").split(", ").filter(Boolean);
                    const updated = checked ? [...current, opt.trim()] : current.filter((v) => v !== opt.trim());
                    handleAnswer(question.id, updated.join(", "));
                  }}
                />
                <Label htmlFor={`${question.id}-${i}`}>{opt.trim()}</Label>
              </div>
            ))}
          </div>
        )}

        {question.type === "DROPDOWN" && question.options && (
          <Select value={answers[question.id]} onValueChange={(v) => handleAnswer(question.id, v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options.split("\n").filter(Boolean).map((opt: string, i: number) => (
                <SelectItem key={i} value={opt.trim()}>{opt.trim()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {question.type === "RATING_SCALE" && (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button key={rating} variant={answers[question.id] === String(rating) ? "default" : "outline"} size="sm" className="h-10 w-10" onClick={() => handleAnswer(question.id, String(rating))}>{rating}</Button>
            ))}
          </div>
        )}

        {question.type === "FILE_UPLOAD" && (
          <Input type="file" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleAnswer(question.id, file.name); }} />
        )}
      </div>
    );
  };

  if (survey.formStyle === "TYPEFORM") {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const question = survey.questions?.[currentQuestion];

    if (!question) return null;

    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-brand-50 to-white dark:from-brand-950 dark:to-background">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <Logo className="justify-center mb-4" />
            <h1 className="text-2xl font-bold">{survey.title}</h1>
            {survey.description && <p className="text-muted-foreground mt-2">{survey.description}</p>}
          </div>

          <Card className="animate-fade-in-up">
            <CardContent className="p-8">
              <div className="text-xs text-muted-foreground mb-4">
                Question {currentQuestion + 1} of {survey.questions.length}
              </div>
              {renderQuestion(question, currentQuestion)}
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
                  disabled={currentQuestion === 0}>
                  Previous
                </Button>
                {currentQuestion < survey.questions.length - 1 ? (
                  <Button onClick={() => setCurrentQuestion((p) => p + 1)}>
                    Next
                  </Button>
                ) : (
                  <Button onClick={submitSurvey} disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <Logo className="justify-center mb-4" />
          <h1 className="text-3xl font-bold">{survey.title}</h1>
          {survey.description && <p className="text-muted-foreground mt-2">{survey.description}</p>}
          {survey.questions && (
            <p className="text-sm text-muted-foreground mt-1">{survey.questions.length} questions</p>
          )}
        </div>

        <Card>
          <CardContent className="p-8 space-y-6">
            {survey.questions?.map((q: any, i: number) => renderQuestion(q, i))}

            <Button onClick={submitSurvey} disabled={submitting} size="lg" className="w-full mt-6">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit Response
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
