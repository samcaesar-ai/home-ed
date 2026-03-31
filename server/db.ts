import { and, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  DailyTask,
  InsertDailyTask,
  InsertStudent,
  InsertStudentSettings,
  InsertUser,
  Student,
  StudentSettings,
  dailyTasks,
  studentSettings,
  students,
  taskHistory,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Students ─────────────────────────────────────────────────────────────────
export async function getAllStudents(): Promise<Student[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(students).where(eq(students.active, "yes")).orderBy(students.name);
}

export async function getStudentById(id: number): Promise<Student | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return result[0];
}

export async function createStudent(data: InsertStudent): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(students).values(data);
}

export async function updateStudent(id: number, data: Partial<InsertStudent>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(students).set(data).where(eq(students.id, id));
}

// ─── Student Settings ─────────────────────────────────────────────────────────
export async function getSettingsByStudentId(studentId: number): Promise<StudentSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(studentSettings).where(eq(studentSettings.studentId, studentId)).limit(1);
  return result[0];
}

export async function upsertStudentSettings(data: InsertStudentSettings): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getSettingsByStudentId(data.studentId);
  if (existing) {
    await db.update(studentSettings)
      .set({
        mathsFocusAreas: data.mathsFocusAreas,
        englishWritingStyles: data.englishWritingStyles,
        questionCount: data.questionCount,
        additionalNotes: data.additionalNotes,
      })
      .where(eq(studentSettings.studentId, data.studentId));
  } else {
    await db.insert(studentSettings).values(data);
  }
}

// ─── Daily Tasks ──────────────────────────────────────────────────────────────
export async function getTaskForDate(
  studentId: number,
  taskDate: string,
  subject: "maths" | "english"
): Promise<DailyTask | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(dailyTasks)
    .where(
      and(
        eq(dailyTasks.studentId, studentId),
        eq(dailyTasks.taskDate, taskDate),
        eq(dailyTasks.subject, subject)
      )
    )
    .limit(1);
  return result[0];
}

export async function getTasksForDateRange(
  studentId: number,
  startDate: string,
  endDate: string
): Promise<DailyTask[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(dailyTasks)
    .where(
      and(
        eq(dailyTasks.studentId, studentId),
        gte(dailyTasks.taskDate, startDate),
        lte(dailyTasks.taskDate, endDate)
      )
    )
    .orderBy(desc(dailyTasks.taskDate));
}

export async function upsertDailyTask(data: InsertDailyTask & { taskDate: string }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getTaskForDate(data.studentId, data.taskDate, data.subject);
  if (existing) {
    await db.update(dailyTasks)
      .set({
        content: data.content,
        status: data.status ?? "generated",
        generationModel: data.generationModel,
        generatedAt: data.generatedAt ?? new Date(),
      })
      .where(eq(dailyTasks.id, existing.id));
  } else {
    await db.insert(dailyTasks).values({
      ...data,
      status: data.status ?? "generated",
      generatedAt: data.generatedAt ?? new Date(),
    });
  }
}

export async function updateTaskContent(id: number, content: unknown): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(dailyTasks).set({ content, status: "reviewed" }).where(eq(dailyTasks.id, id));
}

export async function updateTaskStatus(id: number, status: "pending" | "generated" | "reviewed"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(dailyTasks).set({ status }).where(eq(dailyTasks.id, id));
}

// ─── Task History ─────────────────────────────────────────────────────────────
export async function getRecentHistory(studentId: number, subject: "maths" | "english", limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(taskHistory)
    .where(and(eq(taskHistory.studentId, studentId), eq(taskHistory.subject, subject)))
    .orderBy(desc(taskHistory.taskDate))
    .limit(limit);
}

export async function addTaskHistory(
  studentId: number,
  subject: "maths" | "english",
  taskDate: string,
  summary: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(taskHistory).values({ studentId, subject, taskDate, summary });
}
