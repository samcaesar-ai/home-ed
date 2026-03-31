import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { BookOpen, Calculator, GraduationCap, Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SUBJECT_COLOURS = {
  maths: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "bg-amber-100" },
  english: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "bg-emerald-100" },
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function Home() {
  const [, navigate] = useLocation();
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);

  const { data: students, isLoading } = trpc.students.list.useQuery();

  const today = new Date();

  function handleSubject(studentId: number, subject: "maths" | "english") {
    navigate(`/tasks/${studentId}/${subject}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800" style={{ fontFamily: "Nunito, sans-serif" }}>
                Daily Worksheets
              </h1>
              <p className="text-xs text-slate-500">{formatDate(today)}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/parent")}
            className="text-slate-500 hover:text-slate-700"
          >
            <Settings className="w-4 h-4 mr-1.5" />
            Parent
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="container max-w-4xl mx-auto px-4 py-10">
        {/* Step 1: Choose student */}
        <div className="mb-10">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Step 1 — Who are you?
          </p>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-slate-200 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {students?.map((student) => {
                const isSelected = selectedStudent === student.id;
                const colourClass = student.name.toLowerCase() === "samson" ? "student-samson" : "student-apollo";
                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(isSelected ? null : student.id)}
                    className={`${colourClass} relative rounded-2xl border-2 p-6 text-left transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isSelected
                        ? "border-[var(--student-border)] bg-[var(--student-bg)] shadow-md scale-[1.02]"
                        : "border-slate-200 bg-white hover:border-[var(--student-border)] hover:bg-[var(--student-bg)]"
                    }`}
                    style={{ focusRingColor: "var(--student-color)" } as React.CSSProperties}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-sm"
                        style={{ backgroundColor: "var(--student-color)" }}
                      >
                        {student.name[0]}
                      </div>
                      <div>
                        <p className="text-xl font-black text-slate-800" style={{ fontFamily: "Nunito, sans-serif" }}>
                          {student.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          Year {student.yearGroup} · Age {student.age}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div
                        className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: "var(--student-color)" }}
                      >
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Choose subject */}
        {selectedStudent && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Step 2 — Choose your subject
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Maths card */}
              <button
                onClick={() => handleSubject(selectedStudent, "maths")}
                className={`${SUBJECT_COLOURS.maths.bg} ${SUBJECT_COLOURS.maths.border} border-2 rounded-2xl p-6 text-left hover:shadow-lg hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2`}
              >
                <div className={`w-12 h-12 rounded-xl ${SUBJECT_COLOURS.maths.icon} flex items-center justify-center mb-4`}>
                  <Calculator className={`w-6 h-6 ${SUBJECT_COLOURS.maths.text}`} />
                </div>
                <p className={`text-xl font-black ${SUBJECT_COLOURS.maths.text}`} style={{ fontFamily: "Nunito, sans-serif" }}>
                  Maths
                </p>
                <p className="text-sm text-slate-500 mt-1">10–30 questions · British curriculum</p>
                <Badge variant="secondary" className="mt-3 text-xs">Today's worksheet</Badge>
              </button>

              {/* English card */}
              <button
                onClick={() => handleSubject(selectedStudent, "english")}
                className={`${SUBJECT_COLOURS.english.bg} ${SUBJECT_COLOURS.english.border} border-2 rounded-2xl p-6 text-left hover:shadow-lg hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2`}
              >
                <div className={`w-12 h-12 rounded-xl ${SUBJECT_COLOURS.english.icon} flex items-center justify-center mb-4`}>
                  <BookOpen className={`w-6 h-6 ${SUBJECT_COLOURS.english.text}`} />
                </div>
                <p className={`text-xl font-black ${SUBJECT_COLOURS.english.text}`} style={{ fontFamily: "Nunito, sans-serif" }}>
                  English
                </p>
                <p className="text-sm text-slate-500 mt-1">Creative writing prompt · Expressive language</p>
                <Badge variant="secondary" className="mt-3 text-xs">Today's worksheet</Badge>
              </button>
            </div>
          </div>
        )}

        {/* Footer hint */}
        {!selectedStudent && !isLoading && (
          <p className="text-center text-slate-400 text-sm mt-16">
            Select your name above to get started with today's worksheet.
          </p>
        )}
      </main>
    </div>
  );
}
