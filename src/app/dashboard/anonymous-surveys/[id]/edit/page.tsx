"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { SURVEY_CATEGORIES } from "@/lib/constants";
import { SortableQuestionList, Question } from "@/components/surveys/sortable-question-list";

export default function EditAnonymousSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [formStyle, setFormStyle] = useState("NOTION");
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => { fetchSurvey(); }, [params.id]);

  async function fetchSurvey() {
    try {
      const res = await fetch(`/api/anonymous-surveys/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title);
        setDescription(data.description || "");
        setCategory(data.category || "");
        setFormStyle(data.formStyle || "NOTION");
        setQuestions((data.questions || []).map((q: any) => ({
          id: q.id, type: q.type, title: q.title, description: q.description || "", required: q.required, options: q.options || "",
        })));
      }
    } catch { toast.error("Failed to load survey"); }
    finally { setLoading(false); }
  }

  function removeQuestion(id: string) { if (questions.length > 1) setQuestions((prev) => prev.filter((q) => q.id !== id)); }
  function updateQuestion(id: string, field: string, value: any) { setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) { toast.error("Title is required"); return; }
    const filtered = questions.filter((q) => q.title.trim());
    if (filtered.length === 0) { toast.error("Add at least one question"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/anonymous-surveys/${params.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, formStyle, questions: filtered.map((q, i) => ({ type: q.type, title: q.title, description: q.description, required: q.required, order: i, options: q.options || null })) }),
      });
      if (res.ok) { toast.success("Survey updated"); router.push(`/dashboard/anonymous-surveys/${params.id}`); }
      else { const err = await res.json(); toast.error(err.error || "Failed"); }
    } catch { toast.error("Something went wrong"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;

  return (
    <div>
      <PageHeader title="Edit Anonymous Survey" description="Update your anonymous survey content"
        actions={<Link href={`/dashboard/anonymous-surveys/${params.id}`}><Button variant="outline" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>} />

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card><CardContent className="p-6 space-y-4">
          <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Select or type a custom category..." list="survey-categories" /><datalist id="survey-categories">{SURVEY_CATEGORIES.map((c) => (<option key={c} value={c} />))}</datalist></div>
            <div className="space-y-2"><Label>Form Style</Label><Select value={formStyle} onValueChange={setFormStyle}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NOTION">Notion Style</SelectItem><SelectItem value="TYPEFORM">Typeform Style</SelectItem><SelectItem value="CLASSIC">Classic Style</SelectItem></SelectContent></Select></div>
          </div>
        </CardContent></Card>

        <SortableQuestionList questions={questions} setQuestions={setQuestions} removeQuestion={removeQuestion} updateQuestion={updateQuestion} />

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} size="lg" className="gap-2">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<Save className="h-4 w-4" /> Save Changes</Button>
          <Link href={`/dashboard/anonymous-surveys/${params.id}`}><Button type="button" variant="outline" size="lg">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
