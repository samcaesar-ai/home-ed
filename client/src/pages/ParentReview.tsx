import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useState, useMemo } from "react";
import {
  ArrowLeft, RefreshCw, CheckCircle2, Edit3, Save, X, Calculator, BookOpen, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { EnglishContent, MathsContent } from "../../../drizzle/schema";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}
function formatDate(s: string) {
  const d = new Date(s + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function EditableQuestion({
  question,
  onSave,
  onRegenerate,
  isRegenerating,
}: {
  question: { id: number; text: string; answer?: string };
  onSave: (id: number, text: string) => void;
  onRegenerate: (id: number) => void;
  isRegenerating: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(question.text);

  function handleSave() {
    onSave(question.id, draft);
    setEditing(false);
  }

  return (
    <div className="py-3 flex gap-3 group">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold mt-0.5">
        {question.id}
      </span>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              className="text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-3 h-3 mr-1" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setDraft(question.text); setEditing(false); }} className="h-7 text-xs">
                <X className="w-3 h-3 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-slate-700 leading-relaxed">{question.text}</p>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                title="Edit question"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onRegenerate(question.id)}
                disabled={isRegenerating}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-amber-600 disabled:opacity-50"
                title="Regenerate this question"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        )}
        {question.answer && !editing && (
          <p className="text-xs text-slate-400 mt-0.5">
            <span className="font-medium">Answer:</span> {question.answer}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ParentReview() {
  const params = useParams<{ studentId: string }>();
  const [, navigate] = useLocation();
  const studentId = parseInt(params.studentId ?? "0", 10);
  const [date] = useState(() => todayString());
  const [activeSubject, setActiveSubject] = useState<"maths" | "english">("maths");
  const [regeneratingQId, setRegeneratingQId] = useState<number | null>(null);

  const { data: student } = trpc.students.get.useQuery({ id: studentId });
  const { data: task, refetch } = trpc.tasks.getForDate.useQuery(
    { studentId, date, subject: activeSubject },
    { enabled: !!studentId }
  );

  const utils = trpc.useUtils();
  const colourClass = useMemo(
    () => (student?.name?.toLowerCase() === "samson" ? "student-samson" : "student-apollo"),
    [student]
  );

  const regenerateQMutation = trpc.tasks.regenerateQuestion.useMutation({
    onSuccess: () => {
      toast.success("Question regenerated");
      setRegeneratingQId(null);
      refetch();
    },
    onError: (e) => { toast.error(`Failed: ${e.message}`); setRegeneratingQId(null); },
  });

  const regenerateEnglishMutation = trpc.tasks.regenerateEnglish.useMutation({
    onSuccess: () => { toast.success("English prompt regenerated"); refetch(); },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const updateContentMutation = trpc.tasks.updateContent.useMutation({
    onSuccess: () => { toast.success("Question updated"); refetch(); },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const markReviewedMutation = trpc.tasks.markReviewed.useMutation({
    onSuccess: () => { toast.success("Marked as reviewed"); refetch(); },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const generateMutation = trpc.tasks.generate.useMutation({
    onSuccess: () => {
      toast.success("Worksheet generated");
      utils.tasks.getForDate.invalidate({ studentId, date, subject: activeSubject });
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  function handleSaveQuestion(questionId: number, newText: string) {
    if (!task) return;
    const content = task.content as MathsContent;
    const updated: MathsContent = {
      ...content,
      questions: content.questions.map((q) => q.id === questionId ? { ...q, text: newText } : q),
    };
    updateContentMutation.mutate({ taskId: task.id, content: updated });
  }

  function handleRegenerateQuestion(questionId: number) {
    if (!task) return;
    setRegeneratingQId(questionId);
    regenerateQMutation.mutate({ taskId: task.id, questionId });
  }

  function handleDownloadPDF() {
    window.open(`/api/pdf/${studentId}/${activeSubject}/${date}`, "_blank");
  }

  const mathsContent = task?.subject === "maths" ? task.content as MathsContent : null;
  const englishContent = task?.subject === "english" ? task.content as EnglishContent : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="container max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/parent")} className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className={`${colourClass} flex items-center gap-2`}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black"
                style={{ backgroundColor: "var(--student-color)" }}
              >
                {student?.name?.[0] ?? "?"}
              </div>
              <h1 className="text-xl font-black text-slate-800" style={{ fontFamily: "Nunito, sans-serif" }}>
                {student?.name} — Review
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            {task && (
              <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
                <Download className="w-3.5 h-3.5 mr-1" />
                PDF
              </Button>
            )}
            {task && task.status !== "reviewed" && (
              <Button
                size="sm"
                onClick={() => markReviewedMutation.mutate({ taskId: task.id })}
                disabled={markReviewedMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Approve
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-6">
        {/* Date & subject tabs */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-500">{formatDate(date)}</p>
          <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white">
            <button
              onClick={() => setActiveSubject("maths")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors ${
                activeSubject === "maths" ? "bg-amber-500 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Calculator className="w-3.5 h-3.5" /> Maths
            </button>
            <button
              onClick={() => setActiveSubject("english")}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors ${
                activeSubject === "english" ? "bg-emerald-500 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> English
            </button>
          </div>
        </div>

        {/* No task state */}
        {!task ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <p className="text-slate-500 mb-4">No {activeSubject} worksheet for {formatDate(date)}.</p>
            <Button
              onClick={() => generateMutation.mutate({ studentId, subject: activeSubject, date })}
              disabled={generateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {generateMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              Generate Now
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Task header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                {activeSubject === "maths" && mathsContent && (
                  <h2 className="font-black text-slate-800" style={{ fontFamily: "Nunito, sans-serif" }}>
                    {mathsContent.topic ?? "Maths Worksheet"}
                  </h2>
                )}
                {activeSubject === "english" && englishContent && (
                  <>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mb-1">{englishContent.promptType}</Badge>
                    <h2 className="font-black text-slate-800" style={{ fontFamily: "Nunito, sans-serif" }}>
                      {englishContent.title}
                    </h2>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {task.status === "reviewed" && (
                  <Badge className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />Reviewed
                  </Badge>
                )}
                {activeSubject === "english" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => regenerateEnglishMutation.mutate({ taskId: task.id })}
                    disabled={regenerateEnglishMutation.isPending}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1 ${regenerateEnglishMutation.isPending ? "animate-spin" : ""}`} />
                    Regenerate
                  </Button>
                )}
              </div>
            </div>

            {/* Maths questions */}
            {activeSubject === "maths" && mathsContent && (
              <div className="p-5 divide-y divide-slate-100">
                {mathsContent.questions.map((q) => (
                  <EditableQuestion
                    key={q.id}
                    question={q}
                    onSave={handleSaveQuestion}
                    onRegenerate={handleRegenerateQuestion}
                    isRegenerating={regeneratingQId === q.id && regenerateQMutation.isPending}
                  />
                ))}
              </div>
            )}

            {/* English content */}
            {activeSubject === "english" && englishContent && (
              <div className="p-5 space-y-5">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-slate-700 leading-relaxed">{englishContent.prompt}</p>
                </div>
                {englishContent.hints && englishContent.hints.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-2">Writing hints:</p>
                    <ul className="space-y-1.5">
                      {englishContent.hints.map((hint, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold mt-0.5">{i + 1}</span>
                          {hint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {englishContent.vocabularyWords && englishContent.vocabularyWords.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-600 mb-2">Vocabulary:</p>
                    <div className="flex flex-wrap gap-2">
                      {englishContent.vocabularyWords.map((w, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm border border-indigo-100">{w}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
