"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, Copy, Info } from "lucide-react";
import { QUESTION_TYPE_GUIDES } from "@/lib/constants";

export interface Question {
  id: string;
  type: string;
  title: string;
  description: string;
  required: boolean;
  options: string;
  conditionalLogic?: string;
}

const questionTypes = [
  { value: "SHORT_TEXT", label: "Short Text" },
  { value: "LONG_TEXT", label: "Long Text" },
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "CHECKBOX", label: "Checkbox" },
  { value: "DROPDOWN", label: "Dropdown" },
  { value: "RATING_SCALE", label: "Rating Scale" },
  { value: "FILE_UPLOAD", label: "File Upload" },
  { value: "YES_NO", label: "Yes/No" },
];

interface SortableQuestionProps {
  question: Question;
  index: number;
  onUpdate: (id: string, field: string, value: any) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function SortableQuestion({ question, index, onUpdate, onRemove, onDuplicate }: SortableQuestionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const scaleMin = question.options ? parseInt(question.options.split("-")[0]) || 1 : 1;
  const scaleMax = question.options ? parseInt(question.options.split("-")[1]) || 5 : 5;

  return (
    <Card ref={setNodeRef} style={style} className="premium-card">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-muted-foreground">Q{index + 1}</span>
          <div className="flex-1" />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onDuplicate(question.id)} title="Duplicate question">
            <Copy className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onRemove(question.id)} className="text-destructive" title="Remove question">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select value={question.type} onValueChange={(v) => onUpdate(question.id, "type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {questionTypes.map((qt) => (<SelectItem key={qt.value} value={qt.value}>{qt.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={question.required} onCheckedChange={(v) => onUpdate(question.id, "required", v)} id={`req-${question.id}`} />
              <Label htmlFor={`req-${question.id}`}>Required</Label>
            </div>
          </div>
        </div>

        {QUESTION_TYPE_GUIDES[question.type] && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{QUESTION_TYPE_GUIDES[question.type]}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label>Question Title *</Label>
          <Input value={question.title} onChange={(e) => onUpdate(question.id, "title", e.target.value)} placeholder="Enter your question..." />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Input value={question.description} onChange={(e) => onUpdate(question.id, "description", e.target.value)} placeholder="Additional context..." />
        </div>

        {(question.type === "MULTIPLE_CHOICE" || question.type === "CHECKBOX" || question.type === "DROPDOWN") && (
          <div className="space-y-2">
            <Label>Options (one per line)</Label>
            <Textarea value={question.options} onChange={(e) => onUpdate(question.id, "options", e.target.value)} placeholder={`Option 1\nOption 2\nOption 3`} rows={3} />
          </div>
        )}

        {question.type === "RATING_SCALE" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scale Start</Label>
              <Input type="number" value={scaleMin} min={0} max={scaleMax - 1}
                onChange={(e) => {
                  const min = Math.max(0, parseInt(e.target.value) || 0);
                  const max = Math.max(min + 1, scaleMax);
                  onUpdate(question.id, "options", `${min}-${max}`);
                }} />
            </div>
            <div className="space-y-2">
              <Label>Scale End</Label>
              <Input type="number" value={scaleMax} min={scaleMin + 1} max={100}
                onChange={(e) => {
                  const max = Math.max(scaleMin + 1, parseInt(e.target.value) || (scaleMin + 1));
                  onUpdate(question.id, "options", `${scaleMin}-${max}`);
                }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SortableQuestionListProps {
  questions: Question[];
  setQuestions: (questions: Question[]) => void;
  removeQuestion: (id: string) => void;
  updateQuestion: (id: string, field: string, value: any) => void;
}

export function SortableQuestionList({ questions, setQuestions, removeQuestion, updateQuestion }: SortableQuestionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function addQuestion() {
    setQuestions([...questions, { id: String(Date.now()), type: "SHORT_TEXT", title: "", description: "", required: false, options: "" }]);
  }

  function duplicateQuestion(id: string) {
    const q = questions.find((q) => q.id === id);
    if (!q) return;
    const idx = questions.indexOf(q);
    const clone = { ...q, id: String(Date.now()), title: q.title + " (copy)" };
    const updated = [...questions];
    updated.splice(idx + 1, 0, clone);
    setQuestions(updated);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      setQuestions(arrayMove(questions, oldIndex, newIndex));
    }
  }

  function parseCSV(text: string) {
    const lines = text.split("\n").filter((l) => l.trim());
    const imports: Question[] = [];
    for (const line of lines) {
      const [qtype, title, desc, required, ...optsArr] = line.split(",").map((s) => s.trim());
      if (!title) continue;
      const type = questionTypes.find((t) => t.value === qtype || t.label.toLowerCase() === qtype.toLowerCase())?.value || "SHORT_TEXT";
      imports.push({
        id: String(Date.now()) + Math.random().toString(36),
        type,
        title,
        description: desc || "",
        required: required?.toLowerCase() === "yes" || required === "true",
        options: optsArr.join(", ") || "",
      });
    }
    return imports;
  }

  function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const imported = parseCSV(text);
      if (imported.length > 0) {
        setQuestions([...questions, ...imported]);
      }
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const template = [
      "SHORT_TEXT,Your question here,Optional description,No",
      "MULTIPLE_CHOICE,Choose an option,,Yes,Option 1,Option 2,Option 3",
      "YES_NO,Do you agree?,,Yes",
      "RATING_SCALE,Rate your experience,,No,1,5",
    ].join("\n");
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} title="Download CSV template">
            Download Template
          </Button>
          <label className="cursor-pointer">
            <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
              <span>Import CSV</span>
            </Button>
            <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
          </label>
          <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="gap-2">
            <Plus className="h-4 w-4" /> Add Question
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          {questions.map((question, index) => (
            <SortableQuestion key={question.id} question={question} index={index} onUpdate={updateQuestion} onRemove={removeQuestion} onDuplicate={duplicateQuestion} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
