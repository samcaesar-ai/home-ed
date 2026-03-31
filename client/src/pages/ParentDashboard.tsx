import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  ArrowLeft, Settings, Eye, Zap, CheckCircle2, Clock, AlertCircle,
  Calculator, BookOpen, RefreshCw, GraduationCap, LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { LOGIN_PATH } from "@/const";
import type { MathsContent, EnglishContent } from "../../../drizzle/schema";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}
function formatDate(s: string) {
  const d = new Date(s + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <Badge variant="outline" className="text-slate-400 border-slate-200"><Clock className="w-3 h-3 mr-1" />Not generated</Badge>;
  if (status === "generated") return <Badge className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle2 className="w-3 h-3 mr-1" />Generated</Badge>;
  if (status === "reviewed") return <Badge className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Reviewed</Badge>;
  return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
}

function StudentCard({ student }: { student: { id: number; name: string; yearGroup: number; age: number } }) {
  const [, navigate] = useLocation();
  const today = todayString();
  const colourClass = student.name.toLowerCase() === "samson" ? "student-samson" : "student-apollo";

  const { data: mathsTask } = trpc.tasks.getForDate.useQuery({ studentId: student.id, date: today, subject: "maths" });
  const { data: englishTask } = trpc.tasks.getForDate.useQuery({ studentId: student.id, date: today, subject: "english" });

  const generateMutation = trpc.tasks.generate.useMutation({
    onSuccess: () => toast.success(`Generated successfully`),
    onError: (e) => toast.error(`Generation failed: ${e.message}`),
  });

  const utils = trpc.useUtils();

  async function handleGenerate(subject: "maths" | "english") {
    await generateMutation.mutateAsync({ studentId: student.id, subject, date: today });
    utils.tasks.getForDate.invalidate({ studentId: student.id, date: today, subject });
  }

  const mathsQCount = mathsTask ? (mathsTask.content as MathsContent).questions?.length ?? 0 : 0;
  const englishTitle = englishTask ? (englishTask.content as EnglishContent).title ?? "" : "";

  return (
    <div className={`${colourClass} bg-white rounded-2xl border-2 border-[var(--student-border)] shadow-sm overflow-hidden`}>
      {/* Student header */}
      <div className="p-5 border-b border-[var(--student-border)]" style={{ backgroundColor: "var(--student-bg)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-sm"
              style={{ backgroundColor: "var(--student-color)" }}
            >
              {student.name[0]}
            </div>
            <div>
              <p className="text-lg font-black text-slate-800" style={{ fontFamily: "Nunito, sans-serif" }}>{student.name}</p>
              <p className="text-xs text-slate-500">Year {student.yearGroup} · Age {student.age}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate(`/parent/settings/${student.id}`)}>
              <Settings className="w-3.5 h-3.5 mr-1" />
              Settings
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate(`/parent/review/${student.id}`)}>
              <Eye className="w-3.5 h-3.5 mr-1" />
              Review
            </Button>
          </div>
        </div>
      </div>

      {/* Task status rows */}
      <div className="p-5 space-y-4">
        {/* Maths row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Calculator className="w-4 h-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-700 text-sm">Maths</p>
              {mathsTask && <p className="text-xs text-slate-400 truncate">{mathsQCount} questions · {(mathsTask.content as MathsContent).topic}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={mathsTask?.status} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleGenerate("maths")}
              disabled={generateMutation.isPending}
              className="h-7 px-2"
            >
              {generateMutation.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* English row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-700 text-sm">English</p>
              {englishTask && <p className="text-xs text-slate-400 truncate">{englishTitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={englishTask?.status} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleGenerate("english")}
              disabled={generateMutation.isPending}
              className="h-7 px-2"
            >
              {generateMutation.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ParentDashboard() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const { data: students, isLoading: studentsLoading } = trpc.students.list.useQuery();
  const today = todayString();

  const generateAllMutation = trpc.tasks.generateAll.useMutation({
    onSuccess: (data) => {
      const successes = data.results.filter((r) => r.success).length;
      toast.success(`Generated ${successes}/${data.results.length} worksheets for ${formatDate(data.taskDate)}`);
    },
    onError: (e) => toast.error(`Generation failed: ${e.message}`),
  });

  // Show login prompt if not admin
  if (!loading && (!isAuthenticated || user?.role !== "admin")) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2" style={{ fontFamily: "Nunito, sans-serif" }}>
            Parent Dashboard
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            This area is for parents only. Please sign in with your parent account to continue.
          </p>
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={() => window.location.href = LOGIN_PATH}
          >
            <LogIn className="w-4 h-4 mr-2" />
            Sign In
          </Button>
          <button
            onClick={() => navigate("/")}
            className="mt-4 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Back to student view
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-800" style={{ fontFamily: "Nunito, sans-serif" }}>
                Parent Dashboard
              </h1>
              <p className="text-xs text-slate-500">{formatDate(today)}</p>
            </div>
          </div>
          <Button
            onClick={() => generateAllMutation.mutate({ date: today })}
            disabled={generateAllMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {generateAllMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Generate All Today
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Automatic daily generation</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Worksheets are automatically generated at 3:00 AM every morning using each student's saved settings.
              Use the buttons below to regenerate or review individual worksheets.
            </p>
          </div>
        </div>

        {/* Student cards */}
        {studentsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1].map((i) => <div key={i} className="h-52 rounded-2xl bg-slate-200 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {students?.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        )}

        {/* Cron info */}
        <div className="mt-10 p-5 rounded-xl bg-white border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-2 text-sm">Cron Schedule</h3>
          <p className="text-xs text-slate-500">
            Daily generation runs at <strong>3:00 AM</strong> every morning via a scheduled cron job.
            The job calls the <code className="bg-slate-100 px-1 rounded text-xs">/api/trpc/cron.triggerDaily</code> endpoint
            using a shared secret. You can also trigger generation manually using the buttons above.
          </p>
        </div>
      </main>
    </div>
  );
}
