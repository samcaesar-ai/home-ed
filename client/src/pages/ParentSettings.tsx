import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const MATHS_PRESETS = [
  "Mental Arithmetic", "Fractions", "Decimals", "Percentages", "Algebra",
  "Geometry", "Measurement", "Data Handling", "Word Problems", "Number Bonds",
  "Multiplication", "Division", "Ratio & Proportion", "Negative Numbers",
];

const ENGLISH_PRESETS = [
  "Blog Post", "Persuasive Letter", "Descriptive Writing", "Narrative Story",
  "Instructional Writing", "Review", "Newspaper Report", "Diary Entry",
  "Formal Letter", "Poetry",
];

function TagInput({
  label,
  tags,
  presets,
  onChange,
}: {
  label: string;
  tags: string[];
  presets: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      <Label className="text-sm font-semibold text-slate-700 mb-2 block">{label}</Label>
      {/* Selected tags */}
      <div className="flex flex-wrap gap-2 mb-3 min-h-[2rem]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium"
          >
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-indigo-900 ml-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {presets
          .filter((p) => !tags.includes(p))
          .map((p) => (
            <button
              key={p}
              onClick={() => addTag(p)}
              className="px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 text-xs hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              + {p}
            </button>
          ))}
      </div>
      {/* Custom input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(input); } }}
          placeholder="Add custom area..."
          className="text-sm"
        />
        <Button size="sm" variant="outline" onClick={() => addTag(input)} disabled={!input.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ParentSettings() {
  const params = useParams<{ studentId: string }>();
  const [, navigate] = useLocation();
  const studentId = parseInt(params.studentId ?? "0", 10);

  const { data: student } = trpc.students.get.useQuery({ id: studentId });
  const { data: settings, isLoading } = trpc.settings.get.useQuery({ studentId });

  const [mathsFocusAreas, setMathsFocusAreas] = useState<string[]>([]);
  const [englishWritingStyles, setEnglishWritingStyles] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(15);
  const [additionalNotes, setAdditionalNotes] = useState("");

  useEffect(() => {
    if (settings) {
      setMathsFocusAreas(settings.mathsFocusAreas as string[]);
      setEnglishWritingStyles(settings.englishWritingStyles as string[]);
      setQuestionCount(settings.questionCount);
      setAdditionalNotes(settings.additionalNotes ?? "");
    }
  }, [settings]);

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => toast.success("Settings saved successfully"),
    onError: (e) => toast.error(`Failed to save: ${e.message}`),
  });

  function handleSave() {
    updateMutation.mutate({
      studentId,
      mathsFocusAreas,
      englishWritingStyles,
      questionCount,
      additionalNotes: additionalNotes || null,
    });
  }

  const colourClass = student?.name?.toLowerCase() === "samson" ? "student-samson" : "student-apollo";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
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
                {student?.name ?? "..."} — Settings
              </h1>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-8 space-y-8">
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-slate-200 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Student info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-700 mb-4">Student Profile</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Name</p>
                  <p className="font-bold text-slate-800">{student?.name}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Year Group</p>
                  <p className="font-bold text-slate-800">Year {student?.yearGroup}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Age</p>
                  <p className="font-bold text-slate-800">{student?.age}</p>
                </div>
              </div>
            </div>

            {/* Maths settings */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
              <h2 className="font-bold text-slate-700">Maths Configuration</h2>
              <TagInput
                label="Focus Areas"
                tags={mathsFocusAreas}
                presets={MATHS_PRESETS}
                onChange={setMathsFocusAreas}
              />
              <div>
                <Label className="text-sm font-semibold text-slate-700 mb-3 block">
                  Number of Questions: <span className="text-indigo-600">{questionCount}</span>
                </Label>
                <Slider
                  min={10}
                  max={30}
                  step={1}
                  value={[questionCount]}
                  onValueChange={([v]) => setQuestionCount(v)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>10</span>
                  <span>30</span>
                </div>
              </div>
            </div>

            {/* English settings */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
              <h2 className="font-bold text-slate-700">English Configuration</h2>
              <TagInput
                label="Writing Styles"
                tags={englishWritingStyles}
                presets={ENGLISH_PRESETS}
                onChange={setEnglishWritingStyles}
              />
            </div>

            {/* Additional notes */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-700 mb-4">Additional Notes for AI</h2>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="e.g. Focus on building confidence with algebra. Encourage use of diagrams. Avoid topics already covered this week."
                rows={4}
                className="text-sm"
              />
              <p className="text-xs text-slate-400 mt-2">
                These notes are included in the AI prompt to personalise content generation.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
