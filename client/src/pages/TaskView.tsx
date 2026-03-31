import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { ArrowLeft, Download, RefreshCw, BookOpen, Calculator, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { EnglishContent, MathsContent } from "../../../drizzle/schema";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(s: string) {
  const d = new Date(s + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function MathsWorksheet({ content, studentName }: { content: MathsContent; studentName: string }) {
  return (
    <div className="worksheet-body">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800" style={{ fontFamily: "Nunito, sans-serif" }}>
            {content.topic ?? "Maths Worksheet"}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{content.questions.length} questions</p>
        </div>
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-sm px-3 py-1">
          <Calculator className="w-3.5 h-3.5 mr-1.5" />
          Maths
        </Badge>
      </div>

      <div className="space-y-0 divide-y divide-slate-100">
        {content.questions.map((q) => (
          <div key={q.id} className="py-4 flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
              {q.id}
            </span>
            <p className="text-slate-700 leading-relaxed pt-1">{q.text}</p>
          </div>
        ))}
      </div>

      {/* Answer space hint */}
      <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <p className="text-xs text-slate-400 text-center">
          Show all your working out clearly. Remember to check your answers!
        </p>
      </div>
    </div>
  );
}

function EnglishWorksheet({ content }: { content: EnglishContent }) {
  return (
    <div className="worksheet-body">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mb-3">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            {content.promptType}
          </Badge>
          <h2 className="text-2xl font-black text-slate-800" style={{ fontFamily: "Nunito, sans-serif" }}>
            {content.title}
          </h2>
        </div>
      </div>

      {/* Main prompt */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6">
        <p className="text-slate-700 leading-relaxed text-base">{content.prompt}</p>
      </div>

      {/* Hints */}
      {content.hints && content.hints.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold text-slate-600 mb-3">Writing hints:</p>
          <ul className="space-y-2">
            {content.hints.map((hint, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </span>
                {hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vocabulary words */}
      {content.vocabularyWords && content.vocabularyWords.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-semibold text-slate-600 mb-3">Vocabulary to use:</p>
          <div className="flex flex-wrap gap-2">
            {content.vocabularyWords.map((word, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Writing lines */}
      <div className="mt-8">
        <p className="text-xs text-slate-400 mb-4 text-center">Write your response below or on lined paper.</p>
        <div className="space-y-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="border-b border-slate-200 h-8" />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ studentName, subject, date }: { studentName: string; subject: string; date: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <Clock className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-700 mb-2">No worksheet yet for today</h3>
      <p className="text-slate-500 text-sm max-w-sm mx-auto">
        {studentName}'s {subject} worksheet for {formatDate(date)} hasn't been generated yet.
        Worksheets are automatically prepared at 3:00 AM each morning.
      </p>
      <p className="text-slate-400 text-xs mt-4">Ask a parent to generate it manually from the Parent Dashboard.</p>
    </div>
  );
}

export default function TaskView() {
  const params = useParams<{ studentId: string; subject: string }>();
  const [, navigate] = useLocation();
  const [date] = useState(() => todayString());

  const studentId = parseInt(params.studentId ?? "0", 10);
  const subject = (params.subject ?? "maths") as "maths" | "english";

  const { data: student } = trpc.students.get.useQuery({ id: studentId });
  const { data: task, isLoading } = trpc.tasks.getForDate.useQuery(
    { studentId, date, subject },
    { enabled: !!studentId }
  );

  const colourClass = useMemo(
    () => (student?.name?.toLowerCase() === "samson" ? "student-samson" : "student-apollo"),
    [student]
  );

  const subjectColour = subject === "maths"
    ? { header: "bg-amber-500", badge: "bg-amber-100 text-amber-700" }
    : { header: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" };

  function handleDownloadPDF() {
    window.open(`/api/pdf/${studentId}/${subject}/${date}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="container max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className={`${colourClass} flex items-center gap-2`}>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black"
              style={{ backgroundColor: "var(--student-color)" }}
            >
              {student?.name?.[0] ?? "?"}
            </div>
            <span className="font-bold text-slate-700 text-sm">{student?.name}</span>
            <span className="text-slate-400">·</span>
            <span className="text-sm text-slate-500 capitalize">{subject}</span>
          </div>

          <Button
            size="sm"
            onClick={handleDownloadPDF}
            disabled={!task}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            PDF
          </Button>
        </div>
      </header>

      {/* Date banner */}
      <div className="bg-white border-b border-slate-100">
        <div className="container max-w-3xl mx-auto px-4 py-2">
          <p className="text-xs text-slate-400">{formatDate(date)}</p>
        </div>
      </div>

      {/* Content */}
      <main className="container max-w-3xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !task ? (
          <EmptyState
            studentName={student?.name ?? "Student"}
            subject={subject}
            date={date}
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            {subject === "maths" ? (
              <MathsWorksheet
                content={task.content as MathsContent}
                studentName={student?.name ?? ""}
              />
            ) : (
              <EnglishWorksheet content={task.content as EnglishContent} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
