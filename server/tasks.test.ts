import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock the database helpers ────────────────────────────────────────────────
vi.mock("./db", () => ({
  getAllStudents: vi.fn().mockResolvedValue([
    { id: 1, name: "Samson", yearGroup: 7, age: 12, avatarColour: "#7C3AED", active: "yes", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "Apollo", yearGroup: 6, age: 11, avatarColour: "#0891B2", active: "yes", createdAt: new Date(), updatedAt: new Date() },
  ]),
  getStudentById: vi.fn().mockImplementation((id: number) => {
    const students: Record<number, object> = {
      1: { id: 1, name: "Samson", yearGroup: 7, age: 12, avatarColour: "#7C3AED", active: "yes", createdAt: new Date(), updatedAt: new Date() },
      2: { id: 2, name: "Apollo", yearGroup: 6, age: 11, avatarColour: "#0891B2", active: "yes", createdAt: new Date(), updatedAt: new Date() },
    };
    return Promise.resolve(students[id] ?? undefined);
  }),
  getTaskForDate: vi.fn().mockResolvedValue({
    id: 1,
    studentId: 1,
    taskDate: "2026-03-31",
    subject: "maths",
    content: {
      topic: "Fractions",
      questions: [
        { id: 1, text: "What is 1/2 + 1/4?", answer: "3/4" },
        { id: 2, text: "Simplify 6/8.", answer: "3/4" },
      ],
    },
    status: "generated",
    generationModel: "built-in-llm",
    generatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getSettingsByStudentId: vi.fn().mockResolvedValue({
    id: 1,
    studentId: 1,
    mathsFocusAreas: ["Fractions", "Algebra"],
    englishWritingStyles: ["Blog Post", "Persuasive Letter"],
    questionCount: 15,
    additionalNotes: null,
    updatedAt: new Date(),
  }),
  getRecentHistory: vi.fn().mockResolvedValue([]),
  upsertDailyTask: vi.fn().mockResolvedValue(undefined),
  addTaskHistory: vi.fn().mockResolvedValue(undefined),
  updateTaskContent: vi.fn().mockResolvedValue(undefined),
  updateTaskStatus: vi.fn().mockResolvedValue(undefined),
  upsertStudentSettings: vi.fn().mockResolvedValue(undefined),
  createStudent: vi.fn().mockResolvedValue(undefined),
  updateStudent: vi.fn().mockResolvedValue(undefined),
  getTasksForDateRange: vi.fn().mockResolvedValue([]),
  getDb: vi.fn().mockResolvedValue(null),
}));

// ─── Mock AI generation ───────────────────────────────────────────────────────
vi.mock("./aiGeneration", () => ({
  generateMathsTask: vi.fn().mockResolvedValue({
    topic: "Fractions",
    questions: Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      text: `Question ${i + 1}`,
      answer: `Answer ${i + 1}`,
    })),
  }),
  generateEnglishTask: vi.fn().mockResolvedValue({
    promptType: "Blog Post",
    title: "A Day at the Museum",
    prompt: "Write a blog post about your visit to a museum.",
    hints: ["Use descriptive language", "Include your feelings"],
    vocabularyWords: ["fascinating", "artefact", "exhibition"],
  }),
  regenerateSingleQuestion: vi.fn().mockResolvedValue({
    text: "What is 3/4 of 20?",
    answer: "15",
  }),
  regenerateEnglishPrompt: vi.fn().mockResolvedValue({
    promptType: "Persuasive Letter",
    title: "Save the Library",
    prompt: "Write a persuasive letter to the council.",
    hints: ["Use rhetorical questions", "Include statistics"],
    vocabularyWords: ["essential", "community", "invaluable"],
  }),
}));

// ─── Shared context helpers ───────────────────────────────────────────────────
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "parent@example.com",
      name: "Parent",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("students.list", () => {
  it("returns all active students", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const students = await caller.students.list();
    expect(students).toHaveLength(2);
    expect(students[0].name).toBe("Samson");
    expect(students[1].name).toBe("Apollo");
  });
});

describe("students.get", () => {
  it("returns a student by id", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const student = await caller.students.get({ id: 1 });
    expect(student.name).toBe("Samson");
    expect(student.yearGroup).toBe(7);
  });

  it("throws NOT_FOUND for unknown student", async () => {
    const { getStudentById } = await import("./db");
    vi.mocked(getStudentById).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.students.get({ id: 999 })).rejects.toThrow("Student not found");
  });
});

describe("tasks.getForDate", () => {
  it("returns the task for a given date and subject", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const task = await caller.tasks.getForDate({ studentId: 1, date: "2026-03-31", subject: "maths" });
    expect(task).not.toBeNull();
    expect(task?.subject).toBe("maths");
  });

  it("returns null when no task exists", async () => {
    const { getTaskForDate } = await import("./db");
    vi.mocked(getTaskForDate).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(createPublicContext());
    const task = await caller.tasks.getForDate({ studentId: 1, date: "2026-01-01", subject: "maths" });
    expect(task).toBeNull();
  });
});

describe("tasks.generate (admin)", () => {
  it("generates a maths task for a student", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.tasks.generate({ studentId: 1, subject: "maths", date: "2026-03-31" });
    expect(result.success).toBe(true);
    expect(result.taskDate).toBe("2026-03-31");
  });

  it("generates an english task for a student", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.tasks.generate({ studentId: 2, subject: "english", date: "2026-03-31" });
    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.tasks.generate({ studentId: 1, subject: "maths", date: "2026-03-31" })
    ).rejects.toThrow();
  });
});

describe("settings.get", () => {
  it("returns settings for a student", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const settings = await caller.settings.get({ studentId: 1 });
    expect(settings.questionCount).toBe(15);
    expect(settings.mathsFocusAreas).toContain("Fractions");
  });
});

describe("settings.update (admin)", () => {
  it("updates settings for a student", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.settings.update({
      studentId: 1,
      mathsFocusAreas: ["Geometry", "Algebra"],
      englishWritingStyles: ["Blog Post"],
      questionCount: 20,
      additionalNotes: "Focus on word problems",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.settings.update({
        studentId: 1,
        mathsFocusAreas: [],
        englishWritingStyles: [],
        questionCount: 10,
      })
    ).rejects.toThrow();
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
