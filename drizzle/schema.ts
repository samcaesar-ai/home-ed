import {
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Core auth table ──────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Students ─────────────────────────────────────────────────────────────────
export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  yearGroup: int("yearGroup").notNull(), // e.g. 6 or 7
  age: int("age").notNull(),
  avatarColour: varchar("avatarColour", { length: 20 }).default("#4F46E5"),
  active: mysqlEnum("active", ["yes", "no"]).default("yes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

// ─── Student Settings ─────────────────────────────────────────────────────────
// focusAreas and writingStyles stored as JSON arrays of strings
export const studentSettings = mysqlTable("student_settings", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  // Maths focus areas e.g. ["Geometry","Mental Arithmetic","Fractions"]
  mathsFocusAreas: json("mathsFocusAreas").$type<string[]>().notNull(),
  // English writing styles e.g. ["Blog Post","Persuasive Letter","Recipe"]
  englishWritingStyles: json("englishWritingStyles").$type<string[]>().notNull(),
  // Number of maths questions to generate (10–30)
  questionCount: int("questionCount").default(15).notNull(),
  // Additional notes for the AI prompt
  additionalNotes: text("additionalNotes"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentSettings = typeof studentSettings.$inferSelect;
export type InsertStudentSettings = typeof studentSettings.$inferInsert;

// ─── Daily Tasks ──────────────────────────────────────────────────────────────
// One row per student × date × subject
// content is stored as JSON — structure differs by subject:
//   Maths:   { questions: Array<{ id: number; text: string; answer?: string }> }
//   English: { promptType: string; title: string; prompt: string; hints: string[] }
export const dailyTasks = mysqlTable("daily_tasks", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  taskDate: varchar("taskDate", { length: 10 }).notNull(), // YYYY-MM-DD
  subject: mysqlEnum("subject", ["maths", "english"]).notNull(),
  content: json("content").notNull(),
  status: mysqlEnum("status", ["pending", "generated", "reviewed"]).default("pending").notNull(),
  generationModel: varchar("generationModel", { length: 100 }),
  generatedAt: timestamp("generatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyTask = typeof dailyTasks.$inferSelect;
export type InsertDailyTask = typeof dailyTasks.$inferInsert;

// ─── Typed content shapes (shared between server and client) ──────────────────
export interface MathsQuestion {
  id: number;
  text: string;
  answer?: string;
}

export interface MathsContent {
  questions: MathsQuestion[];
  topic?: string;
}

export interface EnglishContent {
  promptType: string; // "Blog Post" | "Review" | "Instructional" | "Persuasive Letter" | etc.
  title: string;
  prompt: string;
  hints: string[];
  vocabularyWords?: string[];
}

// ─── Task History (for AI progression context) ────────────────────────────────
// Lightweight summary of past tasks so the AI can build on prior work
export const taskHistory = mysqlTable("task_history", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  subject: mysqlEnum("subject", ["maths", "english"]).notNull(),
  taskDate: varchar("taskDate", { length: 10 }).notNull(),
  // Short summary stored for AI context window (topics covered, difficulty notes)
  summary: text("summary").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskHistory = typeof taskHistory.$inferSelect;
