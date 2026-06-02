"use client";

import { useState } from "react";
import { useOrgId } from "@/lib/use-org";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SURVEY_CATEGORIES } from "@/lib/constants";
import { SortableQuestionList } from "@/components/surveys/sortable-question-list";

interface Question {
  id: string;
  type: string;
  title: string;
  description: string;
  required: boolean;
  options: string;
}

export default function NewGeneralSurveyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [formStyle, setFormStyle] = useState("NOTION");
  const [isPublic, setIsPublic] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([
    { id: "1", type: "SHORT_TEXT", title: "", description: "", required: false, options: "" },
  ]);

  const orgId = useOrgId();

  function removeQuestion(id: string) {
    if (questions.length === 1) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function updateQuestion(id: string, field: string, value: any) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) { toast.error("Survey title is required"); return; }
    if (!orgId) { toast.error("No organization selected"); return; }
    const filteredQuestions = questions.filter((q) => q.title.trim());
    if (filteredQuestions.length === 0) { toast.error("Add at least one question"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/general-surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId, title, description, category, formStyle, isPublic,
          questions: filteredQuestions.map((q, i) => ({
            type: q.type, title: q.title, description: q.description, required: q.required, order: i, options: q.options || null,
          })),
        }),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err.error || "Failed"); return; }
      toast.success("Survey created successfully");
      router.push("/dashboard/general-surveys");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader title="Create General Survey" description="Design your survey with questions and settings"
        actions={<Link href="/dashboard/general-surveys"><Button variant="outline" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>} />

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Survey Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Employee Engagement Survey Q1 2026" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Help us understand how you feel..." rows={3} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Select or type a custom category..." list="survey-categories" />
                <datalist id="survey-categories">
                  {SURVEY_CATEGORIES.map((cat) => (<option key={cat} value={cat} />))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Form Style</Label>
                <Select value={formStyle} onValueChange={setFormStyle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOTION">Notion Style</SelectItem>
                    <SelectItem value="TYPEFORM">Typeform Style</SelectItem>
                    <SelectItem value="CLASSIC">Classic Style</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isPublic} onCheckedChange={setIsPublic} id="isPublic" />
              <Label htmlFor="isPublic">Make survey publicly accessible</Label>
            </div>
          </CardContent>
        </Card>

        <SortableQuestionList questions={questions} setQuestions={setQuestions} removeQuestion={removeQuestion} updateQuestion={updateQuestion} />

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} size="lg">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Survey
          </Button>
          <Link href="/dashboard/general-surveys"><Button type="button" variant="outline" size="lg">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
