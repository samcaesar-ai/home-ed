import {
  boolean,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const activeEnum = pgEnum("active", ["yes", "no"]);
export const subjectEnum = pgEnum("subject", ["maths", "english"]);
export const statusEnum = pgEnum("status", ["pending", "generated", "reviewed"]);
export const providerEnum = pgEnum("provider", ["openai", "claude", "gemini", "emergency"]);
export const generationStatusEnum = pgEnum("generation_status", ["success", "fallback", "emergency", "failed"]);

// ─── Core auth table ──────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Students ─────────────────────────────────────────────────────────────────
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  yearGroup: integer("yearGroup").notNull(), // e.g. 6 or 7
  age: integer("age").notNull(),
  avatarColour: varchar("avatarColour", { length: 20 }).default("#4F46E5"),
  active: activeEnum("active").default("yes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

// ─── Student Settings ─────────────────────────────────────────────────────────
// focusAreas and writingStyles stored as JSON arrays of strings
export const studentSettings = pgTable("student_settings", {
  id: serial("id").primaryKey(),
  studentId: integer("studentId").notNull(),
  // Maths focus areas e.g. ["Geometry","Mental Arithmetic","Fractions"]
  mathsFocusAreas: json("mathsFocusAreas").$type<string[]>().notNull(),
  // English writing styles e.g. ["Blog Post","Persuasive Letter","Recipe"]
  englishWritingStyles: json("englishWritingStyles").$type<string[]>().notNull(),
  // Number of maths questions to generate (10–30)
  questionCount: integer("questionCount").default(15).notNull(),
  // Additional notes for the AI prompt
  additionalNotes: text("additionalNotes"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type StudentSettings = typeof studentSettings.$inferSelect;
export type InsertStudentSettings = typeof studentSettings.$inferInsert;

// ─── Daily Tasks ──────────────────────────────────────────────────────────────
// One row per student × date × subject
// content is stored as JSON — structure differs by subject:
//   Maths:   { questions: Array<{ id: number; text: string; answer?: string }> }
//   English: { promptType: string; title: string; prompt: string; hints: string[] }
export const dailyTasks = pgTable("daily_tasks", {
  id: serial("id").primaryKey(),
  studentId: integer("studentId").notNull(),
  taskDate: varchar("taskDate", { length: 10 }).notNull(), // YYYY-MM-DD
  subject: subjectEnum("subject").notNull(),
  content: json("content").notNull(),
  status: statusEnum("status").default("pending").notNull(),
  generationModel: varchar("generationModel", { length: 100 }),
  generatedAt: timestamp("generatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  // ─── Provider metadata ────────────────────────────────────────────────────
  providerAttempted: json("providerAttempted").$type<string[]>().default([]),
  providerUsed: providerEnum("providerUsed"),
  fallbackUsed: boolean("fallbackUsed").default(false),
  generationStatus: generationStatusEnum("generationStatus"),
  validationPassed: boolean("validationPassed").default(false),
  validationErrors: json("validationErrors").$type<string[]>().default([]),
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
export const taskHistory = pgTable("task_history", {
  id: serial("id").primaryKey(),
  studentId: integer("studentId").notNull(),
  subject: subjectEnum("subject").notNull(),
  taskDate: varchar("taskDate", { length: 10 }).notNull(),
  // Short summary stored for AI context window (topics covered, difficulty notes)
  summary: text("summary").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskHistory = typeof taskHistory.$inferSelect;
