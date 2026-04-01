import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addTaskHistory,
  getAllStudents,
  getRecentHistory,
  getSettingsByStudentId,
  getStudentById,
  getTaskForDate,
  getTasksForDateRange,
  updateTaskContent,
  updateTaskStatus,
  upsertDailyTask,
  upsertStudentSettings,
  createStudent,
  updateStudent,
} from "./db";
import {
  generateEnglishTask,
  generateMathsTask,
  regenerateEnglishPrompt,
  regenerateSingleQuestion,
  type GenerationMeta,
} from "./aiGeneration";
import type { EnglishContent, MathsContent } from "../drizzle/schema";

// ─── Helper: today's date as YYYY-MM-DD ──────────────────────────────────────
function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Helper: build history context string ────────────────────────────────────
async function buildHistoryContext(studentId: number, subject: "maths" | "english"): Promise<string> {
  const history = await getRecentHistory(studentId, subject, 5);
  if (!history.length) return "";
  return history
    .map((h) => `${h.taskDate}: ${h.summary}`)
    .join("\n");
}

// ─── Helper: run generation and save to DB with full metadata ─────────────────
async function generateAndSave(params: {
  studentId: number;
  studentName: string;
  yearGroup: number;
  age: number;
  subject: "maths" | "english";
  taskDate: string;
  settings: { mathsFocusAreas: unknown; englishWritingStyles: unknown; questionCount: number; additionalNotes?: string | null };
  historyContext: string;
}): Promise<{ content: MathsContent | EnglishContent; meta: GenerationMeta; summary: string }> {
  const { subject, studentName, yearGroup, age, settings, historyContext } = params;

  if (subject === "maths") {
    const result = await generateMathsTask({
      studentName,
      yearGroup,
      age,
      focusAreas: settings.mathsFocusAreas as string[],
      questionCount: settings.questionCount,
      additionalNotes: settings.additionalNotes,
      recentHistory: historyContext,
    });
    const mc = result.content;
    const summary = `Topic: ${mc.topic ?? "Mixed"} — ${mc.questions.length} questions`;
    await upsertDailyTask({
      studentId: params.studentId,
      taskDate: params.taskDate,
      subject,
      content: mc,
      status: "generated",
      generationModel: result.meta.modelUsed,
      generatedAt: new Date(),
      ...(result.meta as any),
    } as any);
    await addTaskHistory(params.studentId, subject, params.taskDate, summary);
    return { content: mc, meta: result.meta, summary };
  } else {
    const result = await generateEnglishTask({
      studentName,
      yearGroup,
      age,
      writingStyles: settings.englishWritingStyles as string[],
      additionalNotes: settings.additionalNotes,
      recentHistory: historyContext,
    });
    const ec = result.content;
    const summary = `${ec.promptType}: "${ec.title}"`;
    await upsertDailyTask({
      studentId: params.studentId,
      taskDate: params.taskDate,
      subject,
      content: ec,
      status: "generated",
      generationModel: result.meta.modelUsed,
      generatedAt: new Date(),
      ...(result.meta as any),
    } as any);
    await addTaskHistory(params.studentId, subject, params.taskDate, summary);
    return { content: ec, meta: result.meta, summary };
  }
}

// ─── Admin guard middleware ───────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Parent access required." });
  }
  return next({ ctx });
});

// ─── Students router ─────────────────────────────────────────────────────────
const studentsRouter = router({
  list: publicProcedure.query(async () => {
    return getAllStudents();
  }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const student = await getStudentById(input.id);
      if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found." });
      return student;
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        yearGroup: z.number().int().min(1).max(13),
        age: z.number().int().min(4).max(18),
        avatarColour: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createStudent({
        name: input.name,
        yearGroup: input.yearGroup,
        age: input.age,
        avatarColour: input.avatarColour ?? "#4F46E5",
        active: "yes",
      });
      return { success: true };
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        yearGroup: z.number().int().min(1).max(13).optional(),
        age: z.number().int().min(4).max(18).optional(),
        avatarColour: z.string().optional(),
        active: z.enum(["yes", "no"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateStudent(id, data);
      return { success: true };
    }),
});

// ─── Settings router ──────────────────────────────────────────────────────────
const settingsRouter = router({
  get: publicProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async ({ input }) => {
      const settings = await getSettingsByStudentId(input.studentId);
      if (!settings) throw new TRPCError({ code: "NOT_FOUND", message: "Settings not found." });
      return settings;
    }),

  update: adminProcedure
    .input(
      z.object({
        studentId: z.number(),
        mathsFocusAreas: z.array(z.string()),
        englishWritingStyles: z.array(z.string()),
        questionCount: z.number().int().min(10).max(30),
        additionalNotes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await upsertStudentSettings({
        studentId: input.studentId,
        mathsFocusAreas: input.mathsFocusAreas,
        englishWritingStyles: input.englishWritingStyles,
        questionCount: input.questionCount,
        additionalNotes: input.additionalNotes ?? null,
      });
      return { success: true };
    }),
});

// ─── Tasks router ─────────────────────────────────────────────────────────────
const tasksRouter = router({
  getForDate: publicProcedure
    .input(
      z.object({
        studentId: z.number(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        subject: z.enum(["maths", "english"]),
      })
    )
    .query(async ({ input }) => {
      const task = await getTaskForDate(input.studentId, input.date, input.subject);
      return task ?? null;
    }),

  getDateRange: adminProcedure
    .input(
      z.object({
        studentId: z.number(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .query(async ({ input }) => {
      return getTasksForDateRange(input.studentId, input.startDate, input.endDate);
    }),

  generate: adminProcedure
    .input(
      z.object({
        studentId: z.number(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        subject: z.enum(["maths", "english"]),
      })
    )
    .mutation(async ({ input }) => {
      const taskDate = input.date ?? todayString();
      const student = await getStudentById(input.studentId);
      if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found." });
      const settings = await getSettingsByStudentId(input.studentId);
      if (!settings) throw new TRPCError({ code: "NOT_FOUND", message: "Student settings not found." });
      const historyContext = await buildHistoryContext(input.studentId, input.subject);
      const { meta } = await generateAndSave({
        studentId: input.studentId,
        studentName: student.name,
        yearGroup: student.yearGroup,
        age: student.age,
        subject: input.subject,
        taskDate,
        settings,
        historyContext,
      });
      return { success: true, taskDate, meta };
    }),

  generateAll: adminProcedure
    .input(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const taskDate = input.date ?? todayString();
      const allStudents = await getAllStudents();
      const results: { studentId: number; subject: string; success: boolean; meta?: GenerationMeta; error?: string }[] = [];

      for (const student of allStudents) {
        for (const subject of ["maths", "english"] as const) {
          try {
            const settings = await getSettingsByStudentId(student.id);
            if (!settings) { results.push({ studentId: student.id, subject, success: false, error: "No settings" }); continue; }
            const historyContext = await buildHistoryContext(student.id, subject);
            const { meta } = await generateAndSave({
              studentId: student.id,
              studentName: student.name,
              yearGroup: student.yearGroup,
              age: student.age,
              subject,
              taskDate,
              settings,
              historyContext,
            });
            results.push({ studentId: student.id, subject, success: true, meta });
          } catch (err) {
            results.push({ studentId: student.id, subject, success: false, error: String(err) });
          }
        }
      }
      return { results, taskDate };
    }),

  regenerateQuestion: adminProcedure
    .input(
      z.object({
        taskId: z.number(),
        questionId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await import("./db");
      const { getDb } = db;
      const drizzleDb = await getDb();
      if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { dailyTasks } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await drizzleDb.select().from(dailyTasks).where(eq(dailyTasks.id, input.taskId)).limit(1);
      const task = rows[0];
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });

      const student = await getStudentById(task.studentId);
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });

      const mathsContent = task.content as MathsContent;
      const existingTexts = mathsContent.questions.map((q) => q.text);

      const newQ = await regenerateSingleQuestion({
        studentName: student.name,
        yearGroup: student.yearGroup,
        questionNumber: input.questionId,
        topic: mathsContent.topic ?? "Mixed",
        existingQuestions: existingTexts,
      });

      const updatedQuestions = mathsContent.questions.map((q) =>
        q.id === input.questionId ? { ...q, text: newQ.text, answer: newQ.answer } : q
      );
      const updatedContent: MathsContent = { ...mathsContent, questions: updatedQuestions };
      await updateTaskContent(input.taskId, updatedContent);
      return { success: true, question: { id: input.questionId, ...newQ } };
    }),

  regenerateEnglish: adminProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await import("./db");
      const { getDb } = db;
      const drizzleDb = await getDb();
      if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { dailyTasks } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await drizzleDb.select().from(dailyTasks).where(eq(dailyTasks.id, input.taskId)).limit(1);
      const task = rows[0];
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });

      const student = await getStudentById(task.studentId);
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });
      const settings = await getSettingsByStudentId(task.studentId);
      if (!settings) throw new TRPCError({ code: "NOT_FOUND" });

      const newContent = await regenerateEnglishPrompt({
        studentName: student.name,
        yearGroup: student.yearGroup,
        age: student.age,
        writingStyles: settings.englishWritingStyles as string[],
        additionalNotes: settings.additionalNotes,
      });

      await updateTaskContent(input.taskId, newContent);
      return { success: true, content: newContent };
    }),

  updateContent: adminProcedure
    .input(
      z.object({
        taskId: z.number(),
        content: z.unknown(),
      })
    )
    .mutation(async ({ input }) => {
      await updateTaskContent(input.taskId, input.content);
      return { success: true };
    }),

  markReviewed: adminProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input }) => {
      await updateTaskStatus(input.taskId, "reviewed");
      return { success: true };
    }),
});

// ─── Cron router (called by scheduled job) ───────────────────────────────────
const cronRouter = router({
  triggerDaily: publicProcedure
    .input(z.object({ secret: z.string() }))
    .mutation(async ({ input }) => {
      // Simple shared secret guard for the cron endpoint
      const expectedSecret = process.env.CRON_SECRET ?? "daily-tasks-cron";
      if (input.secret !== expectedSecret) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid cron secret." });
      }
      const taskDate = todayString();
      const allStudents = await getAllStudents();
      const results: { studentId: number; subject: string; success: boolean; meta?: GenerationMeta; error?: string }[] = [];

      for (const student of allStudents) {
        for (const subject of ["maths", "english"] as const) {
          try {
            const settings = await getSettingsByStudentId(student.id);
            if (!settings) { results.push({ studentId: student.id, subject, success: false, error: "No settings" }); continue; }
            const historyContext = await buildHistoryContext(student.id, subject);
            const { meta } = await generateAndSave({
              studentId: student.id,
              studentName: student.name,
              yearGroup: student.yearGroup,
              age: student.age,
              subject,
              taskDate,
              settings,
              historyContext,
            });
            results.push({ studentId: student.id, subject, success: true, meta });
          } catch (err) {
            results.push({ studentId: student.id, subject, success: false, error: String(err) });
          }
        }
      }
      return { success: true, taskDate, results };
    }),
});

// ─── App router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  students: studentsRouter,
  settings: settingsRouter,
  tasks: tasksRouter,
  cron: cronRouter,
});

export type AppRouter = typeof appRouter;
