var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activeEnum: () => activeEnum,
  dailyTasks: () => dailyTasks,
  generationStatusEnum: () => generationStatusEnum,
  providerEnum: () => providerEnum,
  roleEnum: () => roleEnum,
  statusEnum: () => statusEnum,
  studentSettings: () => studentSettings,
  students: () => students,
  subjectEnum: () => subjectEnum,
  taskHistory: () => taskHistory,
  users: () => users
});
import {
  boolean,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";
var roleEnum, activeEnum, subjectEnum, statusEnum, providerEnum, generationStatusEnum, users, students, studentSettings, dailyTasks, taskHistory;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    roleEnum = pgEnum("role", ["user", "admin"]);
    activeEnum = pgEnum("active", ["yes", "no"]);
    subjectEnum = pgEnum("subject", ["maths", "english"]);
    statusEnum = pgEnum("status", ["pending", "generated", "reviewed"]);
    providerEnum = pgEnum("provider", ["openai", "claude", "gemini", "emergency"]);
    generationStatusEnum = pgEnum("generation_status", ["success", "fallback", "emergency", "failed"]);
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: roleEnum("role").default("user").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    students = pgTable("students", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 100 }).notNull(),
      yearGroup: integer("yearGroup").notNull(),
      // e.g. 6 or 7
      age: integer("age").notNull(),
      avatarColour: varchar("avatarColour", { length: 20 }).default("#4F46E5"),
      active: activeEnum("active").default("yes").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    studentSettings = pgTable("student_settings", {
      id: serial("id").primaryKey(),
      studentId: integer("studentId").notNull(),
      // Maths focus areas e.g. ["Geometry","Mental Arithmetic","Fractions"]
      mathsFocusAreas: json("mathsFocusAreas").$type().notNull(),
      // English writing styles e.g. ["Blog Post","Persuasive Letter","Recipe"]
      englishWritingStyles: json("englishWritingStyles").$type().notNull(),
      // Number of maths questions to generate (10–30)
      questionCount: integer("questionCount").default(15).notNull(),
      // Additional notes for the AI prompt
      additionalNotes: text("additionalNotes"),
      updatedAt: timestamp("updatedAt").defaultNow().notNull()
    });
    dailyTasks = pgTable("daily_tasks", {
      id: serial("id").primaryKey(),
      studentId: integer("studentId").notNull(),
      taskDate: varchar("taskDate", { length: 10 }).notNull(),
      // YYYY-MM-DD
      subject: subjectEnum("subject").notNull(),
      content: json("content").notNull(),
      status: statusEnum("status").default("pending").notNull(),
      generationModel: varchar("generationModel", { length: 100 }),
      generatedAt: timestamp("generatedAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().notNull(),
      // ─── Provider metadata ────────────────────────────────────────────────────
      providerAttempted: json("providerAttempted").$type().default([]),
      providerUsed: providerEnum("providerUsed"),
      fallbackUsed: boolean("fallbackUsed").default(false),
      generationStatus: generationStatusEnum("generationStatus"),
      validationPassed: boolean("validationPassed").default(false),
      validationErrors: json("validationErrors").$type().default([])
    });
    taskHistory = pgTable("task_history", {
      id: serial("id").primaryKey(),
      studentId: integer("studentId").notNull(),
      subject: subjectEnum("subject").notNull(),
      taskDate: varchar("taskDate", { length: 10 }).notNull(),
      // Short summary stored for AI context window (topics covered, difficulty notes)
      summary: text("summary").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  addTaskHistory: () => addTaskHistory,
  createStudent: () => createStudent,
  getAllStudents: () => getAllStudents,
  getDb: () => getDb,
  getRecentHistory: () => getRecentHistory,
  getSettingsByStudentId: () => getSettingsByStudentId,
  getStudentById: () => getStudentById,
  getTaskForDate: () => getTaskForDate,
  getTasksForDateRange: () => getTasksForDateRange,
  getUserByOpenId: () => getUserByOpenId,
  updateStudent: () => updateStudent,
  updateTaskContent: () => updateTaskContent,
  updateTaskStatus: () => updateTaskStatus,
  upsertDailyTask: () => upsertDailyTask,
  upsertStudentSettings: () => upsertStudentSettings,
  upsertUser: () => upsertUser
});
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const dbUrl = process.env.DATABASE_URL;
      const needsSsl = dbUrl.includes("neon.tech") || dbUrl.includes("supabase") || dbUrl.includes("tidbcloud") || dbUrl.includes("sslmode=require") || dbUrl.includes("amazonaws.com") || dbUrl.includes("cockroachlabs");
      const client = postgres(dbUrl, needsSsl ? { ssl: "require" } : {});
      console.log("[Database] Connecting, SSL:", needsSsl, "URL prefix:", dbUrl.substring(0, 30));
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  const values = { openId: user.openId };
  const updateSet = {};
  const textFields = ["name", "email", "loginMethod"];
  const assignNullable = (field) => {
    const value = user[field];
    if (value === void 0) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== void 0) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getAllStudents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(students).where(eq(students.active, "yes")).orderBy(students.name);
}
async function getStudentById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return result[0];
}
async function createStudent(data) {
  const db = await getDb();
  if (!db) return;
  await db.insert(students).values(data);
}
async function updateStudent(id, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(students).set(data).where(eq(students.id, id));
}
async function getSettingsByStudentId(studentId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(studentSettings).where(eq(studentSettings.studentId, studentId)).limit(1);
  return result[0];
}
async function upsertStudentSettings(data) {
  const db = await getDb();
  if (!db) return;
  const existing = await getSettingsByStudentId(data.studentId);
  if (existing) {
    await db.update(studentSettings).set({
      mathsFocusAreas: data.mathsFocusAreas,
      englishWritingStyles: data.englishWritingStyles,
      questionCount: data.questionCount,
      additionalNotes: data.additionalNotes
    }).where(eq(studentSettings.studentId, data.studentId));
  } else {
    await db.insert(studentSettings).values(data);
  }
}
async function getTaskForDate(studentId, taskDate, subject) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(dailyTasks).where(
    and(
      eq(dailyTasks.studentId, studentId),
      eq(dailyTasks.taskDate, taskDate),
      eq(dailyTasks.subject, subject)
    )
  ).limit(1);
  return result[0];
}
async function getTasksForDateRange(studentId, startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailyTasks).where(
    and(
      eq(dailyTasks.studentId, studentId),
      gte(dailyTasks.taskDate, startDate),
      lte(dailyTasks.taskDate, endDate)
    )
  ).orderBy(desc(dailyTasks.taskDate));
}
async function upsertDailyTask(data) {
  const db = await getDb();
  if (!db) return;
  const existing = await getTaskForDate(data.studentId, data.taskDate, data.subject);
  if (existing) {
    await db.update(dailyTasks).set({
      content: data.content,
      status: data.status ?? "generated",
      generationModel: data.generationModel,
      generatedAt: data.generatedAt ?? /* @__PURE__ */ new Date(),
      providerAttempted: data.providerAttempted ?? [],
      providerUsed: data.providerUsed ?? null,
      fallbackUsed: data.fallbackUsed ?? false,
      generationStatus: data.generationStatus ?? null,
      validationPassed: data.validationPassed ?? false,
      validationErrors: data.validationErrors ?? []
    }).where(eq(dailyTasks.id, existing.id));
  } else {
    await db.insert(dailyTasks).values({
      ...data,
      status: data.status ?? "generated",
      generatedAt: data.generatedAt ?? /* @__PURE__ */ new Date()
    });
  }
}
async function updateTaskContent(id, content) {
  const db = await getDb();
  if (!db) return;
  await db.update(dailyTasks).set({ content, status: "reviewed" }).where(eq(dailyTasks.id, id));
}
async function updateTaskStatus(id, status) {
  const db = await getDb();
  if (!db) return;
  await db.update(dailyTasks).set({ status }).where(eq(dailyTasks.id, id));
}
async function getRecentHistory(studentId, subject, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskHistory).where(and(eq(taskHistory.studentId, studentId), eq(taskHistory.subject, subject))).orderBy(desc(taskHistory.taskDate)).limit(limit);
}
async function addTaskHistory(studentId, subject, taskDate, summary) {
  const db = await getDb();
  if (!db) return;
  await db.insert(taskHistory).values({ studentId, subject, taskDate, summary });
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    _db = null;
  }
});

// api/serverless-entry.ts
import "dotenv/config";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z2 } from "zod";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    // Browsers reject SameSite=None cookies unless Secure=true.
    // Fall back to Lax when requests are not HTTPS (e.g., local HTTP dev).
    sameSite: secure ? "none" : "lax",
    secure
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
var ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  authPassword: process.env.AUTH_PASSWORD ?? "",
  isProduction: process.env.NODE_ENV === "production",
  openaiApiUrl: process.env.OPENAI_API_URL ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  // Aliases used by core proxy modules (dataApi, imageGeneration, map, storage, etc.)
  get forgeApiUrl() {
    return this.openaiApiUrl;
  },
  get forgeApiKey() {
    return this.openaiApiKey;
  }
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
init_db();

// server/emergencyTemplates.ts
var MATHS_YEAR_6 = [
  {
    topic: "Arithmetic and Number",
    questions: [
      { id: 1, text: "Calculate 348 + 276", answer: "624" },
      { id: 2, text: "Calculate 503 \u2212 187", answer: "316" },
      { id: 3, text: "Calculate 24 \xD7 7", answer: "168" },
      { id: 4, text: "Calculate 144 \xF7 12", answer: "12" },
      { id: 5, text: "What is 50% of 240?", answer: "120" },
      { id: 6, text: "Round 3,847 to the nearest hundred.", answer: "3,800" },
      { id: 7, text: "Write the next two numbers in the sequence: 4, 8, 16, 32, __, __", answer: "64, 128" },
      { id: 8, text: "What is 3/4 of 48?", answer: "36" },
      { id: 9, text: "A bag of apples costs \xA31.35. How much do 4 bags cost?", answer: "\xA35.40" },
      { id: 10, text: "Write 0.75 as a fraction in its simplest form.", answer: "3/4" },
      { id: 11, text: "What is 25% of 160?", answer: "40" },
      { id: 12, text: "Calculate 1,000 \u2212 364", answer: "636" },
      { id: 13, text: "A rectangle has a length of 9 cm and a width of 5 cm. What is its area?", answer: "45 cm\xB2" },
      { id: 14, text: "List all the factors of 24.", answer: "1, 2, 3, 4, 6, 8, 12, 24" },
      { id: 15, text: "A train journey takes 1 hour 45 minutes. If the train departs at 09:20, when does it arrive?", answer: "11:05" }
    ]
  },
  {
    topic: "Fractions and Decimals",
    questions: [
      { id: 1, text: "Add: 1/4 + 1/2", answer: "3/4" },
      { id: 2, text: "Subtract: 3/4 \u2212 1/4", answer: "1/2" },
      { id: 3, text: "Write 2/5 as a decimal.", answer: "0.4" },
      { id: 4, text: "Write 0.6 as a fraction in its simplest form.", answer: "3/5" },
      { id: 5, text: "Order these decimals from smallest to largest: 0.7, 0.07, 0.71, 0.17", answer: "0.07, 0.17, 0.7, 0.71" },
      { id: 6, text: "What is 1/3 of 90?", answer: "30" },
      { id: 7, text: "Calculate 0.4 \xD7 5", answer: "2.0" },
      { id: 8, text: "A pizza is cut into 8 equal slices. Sam eats 3 slices. What fraction is left?", answer: "5/8" },
      { id: 9, text: "Write 3/10 as a percentage.", answer: "30%" },
      { id: 10, text: "Calculate 2.5 + 1.75", answer: "4.25" },
      { id: 11, text: "What is 10% of 350?", answer: "35" },
      { id: 12, text: "Simplify 6/9 to its lowest terms.", answer: "2/3" },
      { id: 13, text: "Calculate 4.8 \u2212 2.3", answer: "2.5" },
      { id: 14, text: "Write 7/20 as a decimal.", answer: "0.35" },
      { id: 15, text: "A jug holds 1.5 litres. How many 250 ml glasses can be filled from it?", answer: "6" }
    ]
  }
];
var MATHS_YEAR_7 = [
  {
    topic: "Algebra and Number",
    questions: [
      { id: 1, text: "Simplify: 3x + 5x", answer: "8x" },
      { id: 2, text: "Solve: x + 7 = 15", answer: "x = 8" },
      { id: 3, text: "Solve: 3x = 21", answer: "x = 7" },
      { id: 4, text: "Calculate: (\u22123) + (\u22125)", answer: "\u22128" },
      { id: 5, text: "Calculate: (\u22124) \xD7 3", answer: "\u221212" },
      { id: 6, text: "Find the value of 2x + 3 when x = 4", answer: "11" },
      { id: 7, text: "Write 48 as a product of its prime factors.", answer: "2\xB3 \xD7 3 (or 2 \xD7 2 \xD7 2 \xD7 3)" },
      { id: 8, text: "Find the HCF of 12 and 18.", answer: "6" },
      { id: 9, text: "Find the LCM of 4 and 6.", answer: "12" },
      { id: 10, text: "Calculate 15% of 200.", answer: "30" },
      { id: 11, text: "A shirt costs \xA340 and is reduced by 20%. What is the sale price?", answer: "\xA332" },
      { id: 12, text: "Expand: 3(x + 4)", answer: "3x + 12" },
      { id: 13, text: "Solve: 2x \u2212 3 = 11", answer: "x = 7" },
      { id: 14, text: "Calculate: 2\xB3 + 3\xB2", answer: "17" },
      { id: 15, text: "A car travels 120 km in 2 hours. What is its average speed?", answer: "60 km/h" },
      { id: 16, text: "Simplify: 4a + 2b \u2212 a + 3b", answer: "3a + 5b" },
      { id: 17, text: "What is the square root of 144?", answer: "12" },
      { id: 18, text: "Convert 3/8 to a decimal.", answer: "0.375" },
      { id: 19, text: "A rectangle has a perimeter of 36 cm and a length of 11 cm. What is its width?", answer: "7 cm" },
      { id: 20, text: "Calculate the area of a triangle with base 10 cm and height 6 cm.", answer: "30 cm\xB2" }
    ]
  },
  {
    topic: "Geometry and Measurement",
    questions: [
      { id: 1, text: "What do the angles in a triangle add up to?", answer: "180\xB0" },
      { id: 2, text: "What do the angles in a quadrilateral add up to?", answer: "360\xB0" },
      { id: 3, text: "Find the missing angle in a triangle where the other two angles are 65\xB0 and 72\xB0.", answer: "43\xB0" },
      { id: 4, text: "A square has a side of 8 cm. What is its perimeter?", answer: "32 cm" },
      { id: 5, text: "A square has a side of 8 cm. What is its area?", answer: "64 cm\xB2" },
      { id: 6, text: "Calculate the circumference of a circle with diameter 10 cm. (Use \u03C0 \u2248 3.14)", answer: "31.4 cm" },
      { id: 7, text: "Calculate the area of a circle with radius 5 cm. (Use \u03C0 \u2248 3.14)", answer: "78.5 cm\xB2" },
      { id: 8, text: "Convert 3.5 km to metres.", answer: "3,500 m" },
      { id: 9, text: "Convert 2,400 ml to litres.", answer: "2.4 litres" },
      { id: 10, text: "A cuboid has length 5 cm, width 3 cm, and height 4 cm. What is its volume?", answer: "60 cm\xB3" },
      { id: 11, text: "Name the type of triangle with all sides equal.", answer: "Equilateral triangle" },
      { id: 12, text: "What is the name of an angle greater than 90\xB0 but less than 180\xB0?", answer: "Obtuse angle" },
      { id: 13, text: "Two angles on a straight line add up to how many degrees?", answer: "180\xB0" },
      { id: 14, text: "A parallelogram has a base of 9 cm and a height of 5 cm. What is its area?", answer: "45 cm\xB2" },
      { id: 15, text: "How many faces does a triangular prism have?", answer: "5" },
      { id: 16, text: "Convert 450 cm\xB2 to m\xB2.", answer: "0.045 m\xB2" },
      { id: 17, text: "What is the sum of interior angles of a pentagon?", answer: "540\xB0" },
      { id: 18, text: "A map has a scale of 1:50,000. A distance of 4 cm on the map represents how many km in real life?", answer: "2 km" },
      { id: 19, text: "Calculate the area of a trapezium with parallel sides of 6 cm and 10 cm and a height of 4 cm.", answer: "32 cm\xB2" },
      { id: 20, text: "A cylinder has radius 3 cm and height 10 cm. Calculate its volume. (Use \u03C0 \u2248 3.14)", answer: "282.6 cm\xB3" }
    ]
  }
];
var ENGLISH_YEAR_6 = [
  {
    promptType: "Creative storytelling",
    title: "The Door at the End of the Garden",
    prompt: "At the bottom of your garden, hidden behind overgrown ivy, you discover a small wooden door you have never noticed before. When you push it open, you step into a world that is completely different from your own. Describe what you see, hear, and feel as you explore this mysterious place \u2014 and what happens when you realise you are not alone.",
    hints: [
      "Use your senses \u2014 what do you see, hear, smell, and feel?",
      "Build tension by describing the door before opening it.",
      "Give your world a clear and vivid atmosphere (magical, eerie, peaceful).",
      "Include at least one unexpected discovery.",
      "End with a moment that makes the reader want to know what happens next."
    ],
    vocabularyWords: ["iridescent", "labyrinthine", "ethereal", "luminescent", "trepidation"]
  },
  {
    promptType: "Descriptive writing",
    title: "A Market at Dawn",
    prompt: "Describe the scene as a busy market comes to life at dawn. Traders are setting up their stalls, the smell of fresh bread drifts through the air, and the first customers are beginning to arrive. Use vivid language to bring the sights, sounds, and smells of the market to life for your reader.",
    hints: [
      "Open with a strong image that sets the scene immediately.",
      "Use a variety of sentence lengths for effect.",
      "Include specific details \u2014 colours, textures, sounds.",
      "Use figurative language such as similes and metaphors.",
      "End with a detail that captures the energy of the market."
    ],
    vocabularyWords: ["bustling", "aromatic", "cacophony", "vibrant", "pungent"]
  }
];
var ENGLISH_YEAR_7 = [
  {
    promptType: "Persuasive writing",
    title: "Should Schools Teach Financial Skills?",
    prompt: "Write a persuasive article for your school newspaper arguing that all secondary schools should teach students how to manage money, understand debt, and plan for the future. Use evidence, examples, and persuasive techniques to convince your readers.",
    hints: [
      "Open with a powerful statement or rhetorical question.",
      "Use the rule of three for emphasis.",
      "Include a counter-argument and then dismiss it.",
      "Use statistics or examples to support your points.",
      "End with a strong call to action."
    ],
    vocabularyWords: ["indispensable", "fiscal", "prudent", "empowerment", "consequence"]
  },
  {
    promptType: "Descriptive writing",
    title: "The Abandoned Fairground",
    prompt: "You are standing at the entrance of an old fairground that has been closed for twenty years. Rusted rides creak in the wind, faded signs hang at angles, and weeds push through the cracked tarmac. Write a vivid description of the scene, capturing the atmosphere of a place that was once full of joy but is now forgotten.",
    hints: [
      "Use pathetic fallacy \u2014 let the weather reflect the mood.",
      "Contrast what the place is now with what it once was.",
      "Use personification to bring the decaying objects to life.",
      "Vary your sentence structure for dramatic effect.",
      "Choose precise, evocative vocabulary rather than generic words."
    ],
    vocabularyWords: ["desolate", "dilapidated", "melancholy", "spectral", "corroded"]
  }
];
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function getEmergencyMathsTemplate(yearGroup, questionCount) {
  const bank = yearGroup >= 7 ? MATHS_YEAR_7 : MATHS_YEAR_6;
  const template = pickRandom(bank);
  const questions = template.questions.slice(0, questionCount);
  return {
    topic: template.topic,
    questions
  };
}
function getEmergencyEnglishTemplate(yearGroup) {
  const bank = yearGroup >= 7 ? ENGLISH_YEAR_7 : ENGLISH_YEAR_6;
  return pickRandom(bank);
}

// server/providers.ts
async function callOpenAI(req) {
  const apiKey = ENV.openaiApiKey;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const baseUrl = ENV.openaiApiUrl ? `${ENV.openaiApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://api.openai.com/v1/chat/completions";
  const model = "gpt-4o-mini";
  const payload = {
    model,
    messages: req.messages,
    max_tokens: req.maxTokens ?? 4096
  };
  if (req.jsonSchema) {
    payload.response_format = {
      type: "json_schema",
      json_schema: {
        name: req.jsonSchema.name,
        strict: true,
        schema: req.jsonSchema.schema
      }
    };
  }
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25e3)
  });
  if (!res.ok) {
    const text2 = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text2}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return { content, provider: "openai", model };
}
async function callClaude(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
  const model = "claude-haiku-4-5-20251001";
  const systemMsg = req.messages.find((m) => m.role === "system")?.content ?? "";
  const userMessages = req.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }));
  const messagesWithInstruction = userMessages.map((m, i) => {
    if (i === userMessages.length - 1 && req.jsonSchema) {
      return {
        ...m,
        content: `${m.content}

IMPORTANT: Return ONLY valid JSON matching the schema. No markdown, no extra text.`
      };
    }
    return m;
  });
  const payload = {
    model,
    max_tokens: req.maxTokens ?? 4096,
    system: systemMsg,
    messages: messagesWithInstruction
  };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25e3)
  });
  if (!res.ok) {
    const text2 = await res.text();
    throw new Error(`Claude ${res.status}: ${text2}`);
  }
  const data = await res.json();
  const content = data.content?.find((b) => b.type === "text")?.text ?? "";
  return { content, provider: "claude", model };
}
async function callGemini(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const systemMsg = req.messages.find((m) => m.role === "system")?.content ?? "";
  const userMessages = req.messages.filter((m) => m.role !== "system");
  const contents = userMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  if (req.jsonSchema && contents.length > 0) {
    const last = contents[contents.length - 1];
    last.parts[0].text += "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no extra text.";
  }
  const payload = {
    contents,
    generationConfig: {
      maxOutputTokens: req.maxTokens ?? 4096,
      responseMimeType: req.jsonSchema ? "application/json" : "text/plain"
    }
  };
  if (systemMsg) {
    payload.systemInstruction = { parts: [{ text: systemMsg }] };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25e3)
  });
  if (!res.ok) {
    const text2 = await res.text();
    throw new Error(`Gemini ${res.status}: ${text2}`);
  }
  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { content, provider: "gemini", model };
}
var PROVIDERS = [
  { name: "openai", call: callOpenAI },
  { name: "claude", call: callClaude },
  { name: "gemini", call: callGemini }
];
async function invokeWithFallback(req, validate) {
  const attempted = [];
  const allErrors = [];
  for (let i = 0; i < PROVIDERS.length; i++) {
    const { name, call } = PROVIDERS[i];
    attempted.push(name);
    try {
      const result = await call(req);
      const raw = result.content.trim();
      const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      if (validate) {
        const { ok, errors } = validate(cleaned);
        if (!ok) {
          console.warn(`[LLM:${name}] Validation failed:`, errors);
          allErrors.push(...errors.map((e) => `[${name}] ${e}`));
          continue;
        }
      }
      return {
        content: cleaned,
        providerUsed: name,
        providerAttempted: attempted,
        modelUsed: result.model,
        fallbackUsed: i > 0
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[LLM:${name}] Failed:`, msg);
      allErrors.push(`[${name}] ${msg}`);
    }
  }
  throw new Error(
    `All LLM providers failed.
${allErrors.join("\n")}`
  );
}

// server/validation.ts
var AMERICAN_SPELLINGS = {
  "math ": "maths ",
  "math.": "maths.",
  "math,": "maths,",
  "math\n": "maths\n",
  "color": "colour",
  "flavor": "flavour",
  "honor": "honour",
  "humor": "humour",
  "neighbor": "neighbour",
  "center": "centre",
  "theater": "theatre",
  "meter ": "metre ",
  "liter": "litre",
  "organize": "organise",
  "recognize": "recognise",
  "analyze": "analyse",
  "apologize": "apologise",
  "realize": "realise",
  "traveling": "travelling",
  "canceled": "cancelled",
  "labeled": "labelled",
  "modeled": "modelled",
  "defense": "defence",
  "offense": "offence",
  "license ": "licence ",
  "practice ": "practise ",
  // verb form
  "gray": "grey",
  "program ": "programme ",
  "aluminum": "aluminium",
  "catalog": "catalogue",
  "dialog ": "dialogue ",
  "fulfill": "fulfil",
  "skillful": "skilful",
  "enrollment": "enrolment",
  "jewelry": "jewellery",
  "pajamas": "pyjamas",
  "tire ": "tyre ",
  "curb ": "kerb ",
  "mom ": "mum ",
  "mom,": "mum,",
  "mom.": "mum.",
  "mom!": "mum!",
  "mom?": "mum?",
  "gotten": "got",
  "fall ": "autumn "
  // seasonal context
};
function checkBritishEnglish(text2) {
  const lower = text2.toLowerCase();
  const errors = [];
  for (const [american] of Object.entries(AMERICAN_SPELLINGS)) {
    if (lower.includes(american.toLowerCase())) {
      errors.push(`American spelling detected: "${american.trim()}"`);
    }
  }
  return errors;
}
function validateMathsAnswer(question) {
  const text2 = question.text.toLowerCase();
  const answer = (question.answer ?? "").toLowerCase().trim();
  const angleMatch = text2.match(/angles?\s+(?:of|in)\s+a\s+triangle/i);
  if (angleMatch) {
    const nums = text2.match(/\d+/g)?.map(Number) ?? [];
    if (nums.length >= 2) {
      const knownSum = nums.reduce((a, b) => a + b, 0);
      if (knownSum > 180) {
        return `Triangle angles sum to ${knownSum}\xB0 which exceeds 180\xB0`;
      }
    }
  }
  const addMatch = text2.match(/(\d+)\s*\+\s*(\d+)/);
  if (addMatch) {
    const expected = parseInt(addMatch[1]) + parseInt(addMatch[2]);
    const answerNum = parseInt(answer);
    if (!isNaN(answerNum) && answerNum !== expected) {
      return `Addition error: ${addMatch[1]} + ${addMatch[2]} should be ${expected}, got ${answer}`;
    }
  }
  const subMatch = text2.match(/(\d+)\s*[-−]\s*(\d+)/);
  if (subMatch) {
    const expected = parseInt(subMatch[1]) - parseInt(subMatch[2]);
    const answerNum = parseInt(answer);
    if (!isNaN(answerNum) && answerNum !== expected) {
      return `Subtraction error: ${subMatch[1]} - ${subMatch[2]} should be ${expected}, got ${answer}`;
    }
  }
  const mulMatch = text2.match(/(\d+)\s*[×x\*]\s*(\d+)/);
  if (mulMatch) {
    const expected = parseInt(mulMatch[1]) * parseInt(mulMatch[2]);
    const answerNum = parseInt(answer);
    if (!isNaN(answerNum) && answerNum !== expected) {
      return `Multiplication error: ${mulMatch[1]} \xD7 ${mulMatch[2]} should be ${expected}, got ${answer}`;
    }
  }
  return null;
}
function detectDuplicates(items) {
  const seen = /* @__PURE__ */ new Set();
  const duplicates = [];
  for (const item of items) {
    const normalised = item.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(normalised)) {
      duplicates.push(`Duplicate detected: "${item.substring(0, 60)}..."`);
    }
    seen.add(normalised);
  }
  return duplicates;
}
function validateMathsContent(content, expectedCount, yearGroup) {
  const errors = [];
  const warnings = [];
  if (!content.questions || !Array.isArray(content.questions)) {
    errors.push("Missing questions array");
    return { ok: false, errors, warnings };
  }
  if (content.questions.length === 0) {
    errors.push("Questions array is empty");
    return { ok: false, errors, warnings };
  }
  if (content.questions.length < Math.floor(expectedCount * 0.8)) {
    errors.push(
      `Too few questions: expected ~${expectedCount}, got ${content.questions.length}`
    );
  }
  for (const q of content.questions) {
    if (!q.text || q.text.trim().length < 5) {
      errors.push(`Question ${q.id} has missing or too-short text`);
    }
    if (!q.answer || q.answer.trim().length === 0) {
      errors.push(`Question ${q.id} has no answer`);
    }
  }
  for (const q of content.questions) {
    const mathError = validateMathsAnswer(q);
    if (mathError) errors.push(mathError);
  }
  const questionTexts = content.questions.map((q) => q.text);
  const dupes = detectDuplicates(questionTexts);
  errors.push(...dupes);
  const allText = content.questions.map((q) => q.text + " " + (q.answer ?? "")).join(" ");
  const britishErrors = checkBritishEnglish(allText);
  if (britishErrors.length > 0) {
    warnings.push(...britishErrors);
  }
  if (!content.topic || content.topic.trim().length === 0) {
    warnings.push("Missing topic field");
  }
  return { ok: errors.length === 0, errors, warnings };
}
function validateEnglishContent(content, yearGroup) {
  const errors = [];
  const warnings = [];
  if (!content.promptType || content.promptType.trim().length === 0) {
    errors.push("Missing promptType");
  }
  if (!content.title || content.title.trim().length < 3) {
    errors.push("Missing or too-short title");
  }
  if (!content.prompt || content.prompt.trim().length < 20) {
    errors.push("Missing or too-short prompt");
  }
  if (!content.hints || !Array.isArray(content.hints) || content.hints.length < 2) {
    errors.push("Missing hints (need at least 2)");
  }
  if (!content.vocabularyWords || content.vocabularyWords.length < 3) {
    warnings.push("Fewer than 3 vocabulary words provided");
  }
  if (content.hints) {
    const dupes = detectDuplicates(content.hints);
    errors.push(...dupes);
  }
  const allText = [
    content.title,
    content.prompt,
    ...content.hints ?? [],
    ...content.vocabularyWords ?? []
  ].join(" ");
  const britishErrors = checkBritishEnglish(allText);
  if (britishErrors.length > 0) {
    warnings.push(...britishErrors);
  }
  const lowerPrompt = content.prompt?.toLowerCase() ?? "";
  if (lowerPrompt.includes("example answer:") || lowerPrompt.includes("model answer:") || lowerPrompt.includes("sample answer:")) {
    errors.push("Prompt contains a sample/model answer which is not allowed");
  }
  return { ok: errors.length === 0, errors, warnings };
}
function safeParseJSON(raw) {
  try {
    const data = JSON.parse(raw);
    return { data, error: null };
  } catch (e) {
    return { data: null, error: `JSON parse error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// server/aiGeneration.ts
var MATHS_JSON_SCHEMA = {
  name: "maths_task",
  schema: {
    type: "object",
    properties: {
      topic: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            text: { type: "string" },
            answer: { type: "string" }
          },
          required: ["id", "text", "answer"],
          additionalProperties: false
        }
      }
    },
    required: ["topic", "questions"],
    additionalProperties: false
  }
};
var ENGLISH_JSON_SCHEMA = {
  name: "english_task",
  schema: {
    type: "object",
    properties: {
      promptType: { type: "string" },
      title: { type: "string" },
      prompt: { type: "string" },
      hints: { type: "array", items: { type: "string" } },
      vocabularyWords: { type: "array", items: { type: "string" } }
    },
    required: ["promptType", "title", "prompt", "hints", "vocabularyWords"],
    additionalProperties: false
  }
};
async function generateMathsTask(params) {
  const focusStr = params.focusAreas.join(", ");
  const historySection = params.recentHistory ? `

RECENT HISTORY (use this to build on prior work and avoid repetition):
${params.recentHistory}` : "";
  const systemPrompt = `You are an expert UK primary and secondary school Maths teacher creating daily worksheets.
CRITICAL RULES:
- Use BRITISH ENGLISH spelling throughout (e.g. "colour", "recognise", "practise", "maths", "metre", "litre").
- All questions must be appropriate for Year ${params.yearGroup} (age ${params.age}) of the UK National Curriculum.
- Verify ALL mathematical logic rigorously: angles in a triangle must sum to 180 degrees, arithmetic must be correct, fractions must be properly formed.
- Format questions clearly for A4 PDF printing -- keep each question concise and on one logical line where possible.
- Vary question difficulty within the set: start accessible, build to challenging.
- Include a mix of calculation, reasoning, and word problems.
- NEVER include the answer in the question text itself.
- Return ONLY valid JSON matching the schema -- no markdown, no extra text.`;
  const userPrompt = `Generate exactly ${params.questionCount} maths questions for ${params.studentName} (Year ${params.yearGroup}, age ${params.age}).
Focus areas today: ${focusStr}.
${params.additionalNotes ? `Teacher notes: ${params.additionalNotes}` : ""}${historySection}
Return JSON in this exact schema:
{
  "topic": "Brief topic description e.g. 'Fractions and Decimals'",
  "questions": [
    { "id": 1, "text": "Question text here", "answer": "Correct answer here" },
    ...
  ]
}`;
  const validate = (raw) => {
    const { data: data2, error: error2 } = safeParseJSON(raw);
    if (error2 || !data2) return { ok: false, errors: [error2 ?? "JSON parse failed"] };
    const result = validateMathsContent(data2, params.questionCount, params.yearGroup);
    return { ok: result.ok, errors: result.errors };
  };
  let fallbackResult = null;
  try {
    fallbackResult = await invokeWithFallback(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        jsonSchema: MATHS_JSON_SCHEMA
      },
      validate
    );
  } catch (err) {
    console.error("[Generation] All providers failed for maths, using emergency template:", err);
    const emergency = getEmergencyMathsTemplate(params.yearGroup, params.questionCount);
    return {
      content: emergency,
      meta: {
        providerUsed: "emergency",
        providerAttempted: ["openai", "claude", "gemini"],
        fallbackUsed: true,
        generationStatus: "emergency",
        validationPassed: true,
        validationErrors: [],
        modelUsed: "emergency-template"
      }
    };
  }
  const { data, error } = safeParseJSON(fallbackResult.content);
  if (error || !data) {
    const emergency = getEmergencyMathsTemplate(params.yearGroup, params.questionCount);
    return {
      content: emergency,
      meta: {
        providerUsed: "emergency",
        providerAttempted: fallbackResult.providerAttempted,
        fallbackUsed: true,
        generationStatus: "emergency",
        validationPassed: true,
        validationErrors: [error ?? "Post-parse failed"],
        modelUsed: "emergency-template"
      }
    };
  }
  const validation = validateMathsContent(data, params.questionCount, params.yearGroup);
  return {
    content: data,
    meta: {
      providerUsed: fallbackResult.providerUsed,
      providerAttempted: fallbackResult.providerAttempted,
      fallbackUsed: fallbackResult.fallbackUsed,
      generationStatus: fallbackResult.fallbackUsed ? "fallback" : "success",
      validationPassed: validation.ok,
      validationErrors: [...validation.errors, ...validation.warnings],
      modelUsed: fallbackResult.modelUsed
    }
  };
}
async function generateEnglishTask(params) {
  const style = params.writingStyles[Math.floor(Math.random() * params.writingStyles.length)];
  const historySection = params.recentHistory ? `

RECENT HISTORY (vary the topic and style to build on prior work):
${params.recentHistory}` : "";
  const systemPrompt = `You are an expert UK primary and secondary school English teacher creating daily creative writing prompts.
CRITICAL RULES:
- Use BRITISH ENGLISH spelling and vocabulary throughout (e.g. "colour", "favourite", "practise", "organise", "travelling").
- All prompts must be appropriate for Year ${params.yearGroup} (age ${params.age}) of the UK National Curriculum.
- Encourage expressive, descriptive language with varied sentence structures.
- The prompt must be engaging, imaginative, and age-appropriate.
- Provide 3-5 vocabulary hints that are ambitious but achievable for the year group.
- Format the output clearly for A4 PDF printing.
- NEVER include a sample answer or model text -- only the prompt and hints.
- Return ONLY valid JSON matching the schema -- no markdown, no extra text.`;
  const userPrompt = `Generate a ${style} creative writing prompt for ${params.studentName} (Year ${params.yearGroup}, age ${params.age}).
${params.additionalNotes ? `Teacher notes: ${params.additionalNotes}` : ""}${historySection}
Return JSON in this exact schema:
{
  "promptType": "${style}",
  "title": "Engaging title for the task",
  "prompt": "Full writing prompt (2-4 sentences) that sets the scene and task clearly",
  "hints": ["hint 1", "hint 2", "hint 3", "hint 4"],
  "vocabularyWords": ["word1", "word2", "word3", "word4", "word5"]
}`;
  const validate = (raw) => {
    const { data: data2, error: error2 } = safeParseJSON(raw);
    if (error2 || !data2) return { ok: false, errors: [error2 ?? "JSON parse failed"] };
    const result = validateEnglishContent(data2, params.yearGroup);
    return { ok: result.ok, errors: result.errors };
  };
  let fallbackResult = null;
  try {
    fallbackResult = await invokeWithFallback(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        jsonSchema: ENGLISH_JSON_SCHEMA
      },
      validate
    );
  } catch (err) {
    console.error("[Generation] All providers failed for english, using emergency template:", err);
    const emergency = getEmergencyEnglishTemplate(params.yearGroup);
    return {
      content: emergency,
      meta: {
        providerUsed: "emergency",
        providerAttempted: ["openai", "claude", "gemini"],
        fallbackUsed: true,
        generationStatus: "emergency",
        validationPassed: true,
        validationErrors: [],
        modelUsed: "emergency-template"
      }
    };
  }
  const { data, error } = safeParseJSON(fallbackResult.content);
  if (error || !data) {
    const emergency = getEmergencyEnglishTemplate(params.yearGroup);
    return {
      content: emergency,
      meta: {
        providerUsed: "emergency",
        providerAttempted: fallbackResult.providerAttempted,
        fallbackUsed: true,
        generationStatus: "emergency",
        validationPassed: true,
        validationErrors: [error ?? "Post-parse failed"],
        modelUsed: "emergency-template"
      }
    };
  }
  const validation = validateEnglishContent(data, params.yearGroup);
  return {
    content: data,
    meta: {
      providerUsed: fallbackResult.providerUsed,
      providerAttempted: fallbackResult.providerAttempted,
      fallbackUsed: fallbackResult.fallbackUsed,
      generationStatus: fallbackResult.fallbackUsed ? "fallback" : "success",
      validationPassed: validation.ok,
      validationErrors: [...validation.errors, ...validation.warnings],
      modelUsed: fallbackResult.modelUsed
    }
  };
}
async function regenerateSingleQuestion(params) {
  const systemPrompt = `You are a UK Maths teacher. Generate one replacement question using British English. 
Verify all mathematical logic. Return ONLY valid JSON.`;
  const userPrompt = `Generate one new maths question for ${params.studentName} (Year ${params.yearGroup}).
Topic: ${params.topic}
Question number: ${params.questionNumber}
Existing questions to avoid duplicating: ${params.existingQuestions.join(" | ")}
Return JSON: { "text": "question text", "answer": "correct answer" }`;
  try {
    const result = await invokeWithFallback({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });
    const { data } = safeParseJSON(result.content);
    if (data?.text && data?.answer) return data;
  } catch (_) {
  }
  return { text: "Calculate 12 x 12", answer: "144" };
}
async function regenerateEnglishPrompt(params) {
  const result = await generateEnglishTask(params);
  return result.content;
}

// server/routers.ts
function todayString() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
async function buildHistoryContext(studentId, subject) {
  const history = await getRecentHistory(studentId, subject, 5);
  if (!history.length) return "";
  return history.map((h) => `${h.taskDate}: ${h.summary}`).join("\n");
}
async function generateAndSave(params) {
  const { subject, studentName, yearGroup, age, settings, historyContext } = params;
  if (subject === "maths") {
    const result = await generateMathsTask({
      studentName,
      yearGroup,
      age,
      focusAreas: settings.mathsFocusAreas,
      questionCount: settings.questionCount,
      additionalNotes: settings.additionalNotes,
      recentHistory: historyContext
    });
    const mc = result.content;
    const summary = `Topic: ${mc.topic ?? "Mixed"} \u2014 ${mc.questions.length} questions`;
    await upsertDailyTask({
      studentId: params.studentId,
      taskDate: params.taskDate,
      subject,
      content: mc,
      status: "generated",
      generationModel: result.meta.modelUsed,
      generatedAt: /* @__PURE__ */ new Date(),
      ...result.meta
    });
    await addTaskHistory(params.studentId, subject, params.taskDate, summary);
    return { content: mc, meta: result.meta, summary };
  } else {
    const result = await generateEnglishTask({
      studentName,
      yearGroup,
      age,
      writingStyles: settings.englishWritingStyles,
      additionalNotes: settings.additionalNotes,
      recentHistory: historyContext
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
      generatedAt: /* @__PURE__ */ new Date(),
      ...result.meta
    });
    await addTaskHistory(params.studentId, subject, params.taskDate, summary);
    return { content: ec, meta: result.meta, summary };
  }
}
var adminProcedure2 = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError3({ code: "FORBIDDEN", message: "Parent access required." });
  }
  return next({ ctx });
});
var studentsRouter = router({
  list: publicProcedure.query(async () => {
    return getAllStudents();
  }),
  get: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
    const student = await getStudentById(input.id);
    if (!student) throw new TRPCError3({ code: "NOT_FOUND", message: "Student not found." });
    return student;
  }),
  create: adminProcedure2.input(
    z2.object({
      name: z2.string().min(1).max(100),
      yearGroup: z2.number().int().min(1).max(13),
      age: z2.number().int().min(4).max(18),
      avatarColour: z2.string().optional()
    })
  ).mutation(async ({ input }) => {
    await createStudent({
      name: input.name,
      yearGroup: input.yearGroup,
      age: input.age,
      avatarColour: input.avatarColour ?? "#4F46E5",
      active: "yes"
    });
    return { success: true };
  }),
  update: adminProcedure2.input(
    z2.object({
      id: z2.number(),
      name: z2.string().min(1).max(100).optional(),
      yearGroup: z2.number().int().min(1).max(13).optional(),
      age: z2.number().int().min(4).max(18).optional(),
      avatarColour: z2.string().optional(),
      active: z2.enum(["yes", "no"]).optional()
    })
  ).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateStudent(id, data);
    return { success: true };
  })
});
var settingsRouter = router({
  get: publicProcedure.input(z2.object({ studentId: z2.number() })).query(async ({ input }) => {
    const settings = await getSettingsByStudentId(input.studentId);
    if (!settings) throw new TRPCError3({ code: "NOT_FOUND", message: "Settings not found." });
    return settings;
  }),
  update: adminProcedure2.input(
    z2.object({
      studentId: z2.number(),
      mathsFocusAreas: z2.array(z2.string()),
      englishWritingStyles: z2.array(z2.string()),
      questionCount: z2.number().int().min(10).max(30),
      additionalNotes: z2.string().nullable().optional()
    })
  ).mutation(async ({ input }) => {
    await upsertStudentSettings({
      studentId: input.studentId,
      mathsFocusAreas: input.mathsFocusAreas,
      englishWritingStyles: input.englishWritingStyles,
      questionCount: input.questionCount,
      additionalNotes: input.additionalNotes ?? null
    });
    return { success: true };
  })
});
var tasksRouter = router({
  getForDate: publicProcedure.input(
    z2.object({
      studentId: z2.number(),
      date: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      subject: z2.enum(["maths", "english"])
    })
  ).query(async ({ input }) => {
    const task = await getTaskForDate(input.studentId, input.date, input.subject);
    return task ?? null;
  }),
  getDateRange: adminProcedure2.input(
    z2.object({
      studentId: z2.number(),
      startDate: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    })
  ).query(async ({ input }) => {
    return getTasksForDateRange(input.studentId, input.startDate, input.endDate);
  }),
  generate: adminProcedure2.input(
    z2.object({
      studentId: z2.number(),
      date: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      subject: z2.enum(["maths", "english"])
    })
  ).mutation(async ({ input }) => {
    const taskDate = input.date ?? todayString();
    const student = await getStudentById(input.studentId);
    if (!student) throw new TRPCError3({ code: "NOT_FOUND", message: "Student not found." });
    const settings = await getSettingsByStudentId(input.studentId);
    if (!settings) throw new TRPCError3({ code: "NOT_FOUND", message: "Student settings not found." });
    const historyContext = await buildHistoryContext(input.studentId, input.subject);
    const { meta } = await generateAndSave({
      studentId: input.studentId,
      studentName: student.name,
      yearGroup: student.yearGroup,
      age: student.age,
      subject: input.subject,
      taskDate,
      settings,
      historyContext
    });
    return { success: true, taskDate, meta };
  }),
  generateAll: adminProcedure2.input(
    z2.object({
      date: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    })
  ).mutation(async ({ input }) => {
    const taskDate = input.date ?? todayString();
    const allStudents = await getAllStudents();
    const results = [];
    for (const student of allStudents) {
      for (const subject of ["maths", "english"]) {
        try {
          const settings = await getSettingsByStudentId(student.id);
          if (!settings) {
            results.push({ studentId: student.id, subject, success: false, error: "No settings" });
            continue;
          }
          const historyContext = await buildHistoryContext(student.id, subject);
          const { meta } = await generateAndSave({
            studentId: student.id,
            studentName: student.name,
            yearGroup: student.yearGroup,
            age: student.age,
            subject,
            taskDate,
            settings,
            historyContext
          });
          results.push({ studentId: student.id, subject, success: true, meta });
        } catch (err) {
          results.push({ studentId: student.id, subject, success: false, error: String(err) });
        }
      }
    }
    return { results, taskDate };
  }),
  regenerateQuestion: adminProcedure2.input(
    z2.object({
      taskId: z2.number(),
      questionId: z2.number()
    })
  ).mutation(async ({ input }) => {
    const db = await Promise.resolve().then(() => (init_db(), db_exports));
    const { getDb: getDb2 } = db;
    const drizzleDb = await getDb2();
    if (!drizzleDb) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
    const { dailyTasks: dailyTasks2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq2 } = await import("drizzle-orm");
    const rows = await drizzleDb.select().from(dailyTasks2).where(eq2(dailyTasks2.id, input.taskId)).limit(1);
    const task = rows[0];
    if (!task) throw new TRPCError3({ code: "NOT_FOUND" });
    const student = await getStudentById(task.studentId);
    if (!student) throw new TRPCError3({ code: "NOT_FOUND" });
    const mathsContent = task.content;
    const existingTexts = mathsContent.questions.map((q) => q.text);
    const newQ = await regenerateSingleQuestion({
      studentName: student.name,
      yearGroup: student.yearGroup,
      questionNumber: input.questionId,
      topic: mathsContent.topic ?? "Mixed",
      existingQuestions: existingTexts
    });
    const updatedQuestions = mathsContent.questions.map(
      (q) => q.id === input.questionId ? { ...q, text: newQ.text, answer: newQ.answer } : q
    );
    const updatedContent = { ...mathsContent, questions: updatedQuestions };
    await updateTaskContent(input.taskId, updatedContent);
    return { success: true, question: { id: input.questionId, ...newQ } };
  }),
  regenerateEnglish: adminProcedure2.input(z2.object({ taskId: z2.number() })).mutation(async ({ input }) => {
    const db = await Promise.resolve().then(() => (init_db(), db_exports));
    const { getDb: getDb2 } = db;
    const drizzleDb = await getDb2();
    if (!drizzleDb) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR" });
    const { dailyTasks: dailyTasks2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { eq: eq2 } = await import("drizzle-orm");
    const rows = await drizzleDb.select().from(dailyTasks2).where(eq2(dailyTasks2.id, input.taskId)).limit(1);
    const task = rows[0];
    if (!task) throw new TRPCError3({ code: "NOT_FOUND" });
    const student = await getStudentById(task.studentId);
    if (!student) throw new TRPCError3({ code: "NOT_FOUND" });
    const settings = await getSettingsByStudentId(task.studentId);
    if (!settings) throw new TRPCError3({ code: "NOT_FOUND" });
    const newContent = await regenerateEnglishPrompt({
      studentName: student.name,
      yearGroup: student.yearGroup,
      age: student.age,
      writingStyles: settings.englishWritingStyles,
      additionalNotes: settings.additionalNotes
    });
    await updateTaskContent(input.taskId, newContent);
    return { success: true, content: newContent };
  }),
  updateContent: adminProcedure2.input(
    z2.object({
      taskId: z2.number(),
      content: z2.unknown()
    })
  ).mutation(async ({ input }) => {
    await updateTaskContent(input.taskId, input.content);
    return { success: true };
  }),
  markReviewed: adminProcedure2.input(z2.object({ taskId: z2.number() })).mutation(async ({ input }) => {
    await updateTaskStatus(input.taskId, "reviewed");
    return { success: true };
  })
});
var cronRouter = router({
  triggerDaily: publicProcedure.input(z2.object({ secret: z2.string() })).mutation(async ({ input }) => {
    const expectedSecret = process.env.CRON_SECRET ?? "daily-tasks-cron";
    if (input.secret !== expectedSecret) {
      throw new TRPCError3({ code: "UNAUTHORIZED", message: "Invalid cron secret." });
    }
    const taskDate = todayString();
    const allStudents = await getAllStudents();
    const results = [];
    for (const student of allStudents) {
      for (const subject of ["maths", "english"]) {
        try {
          const settings = await getSettingsByStudentId(student.id);
          if (!settings) {
            results.push({ studentId: student.id, subject, success: false, error: "No settings" });
            continue;
          }
          const historyContext = await buildHistoryContext(student.id, subject);
          const { meta } = await generateAndSave({
            studentId: student.id,
            studentName: student.name,
            yearGroup: student.yearGroup,
            age: student.age,
            subject,
            taskDate,
            settings,
            historyContext
          });
          results.push({ studentId: student.id, subject, success: true, meta });
        } catch (err) {
          results.push({ studentId: student.id, subject, success: false, error: String(err) });
        }
      }
    }
    return { success: true, taskDate, results };
  })
});
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  students: studentsRouter,
  settings: settingsRouter,
  tasks: tasksRouter,
  cron: cronRouter
});

// api/serverless-entry.ts
init_db();

// server/pdfGenerator.ts
import PDFDocument from "pdfkit";
function formatDate(s) {
  const d = /* @__PURE__ */ new Date(s + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
var PAGE_W = 595;
var PAGE_H = 842;
var MARGIN = 50;
var CONTENT_W = PAGE_W - MARGIN * 2;
function drawHeader(doc, studentName, subject, date, accentColor) {
  doc.rect(0, 0, PAGE_W, 70).fill(accentColor);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(20).text(`${studentName}'s ${subject === "maths" ? "Maths" : "English"} Worksheet`, MARGIN, 18, { width: CONTENT_W - 120 });
  doc.fillColor("rgba(255,255,255,0.85)").font("Helvetica").fontSize(9).text(formatDate(date), MARGIN, 44, { width: CONTENT_W });
  const badgeX = PAGE_W - MARGIN - 90;
  doc.roundedRect(badgeX, 18, 90, 28, 6).fillAndStroke("rgba(255,255,255,0.2)", "rgba(255,255,255,0.4)");
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11).text(subject === "maths" ? "MATHS" : "ENGLISH", badgeX, 26, { width: 90, align: "center" });
  doc.fillColor("#1E293B");
}
function drawFooter(doc, pageNum, accentColor) {
  const y = PAGE_H - 35;
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor("#E2E8F0").lineWidth(0.5).stroke();
  doc.fillColor("#94A3B8").font("Helvetica").fontSize(8).text("Daily Worksheets \xB7 Generated by AI \xB7 British Curriculum", MARGIN, y + 8, { width: CONTENT_W - 60, align: "left" });
  doc.text(`Page ${pageNum}`, MARGIN, y + 8, { width: CONTENT_W, align: "right" });
}
function generateMathsPDF(res, studentName, date, content) {
  const accentColor = studentName.toLowerCase() === "samson" ? "#7C3AED" : "#0891B2";
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${studentName}-Maths-${date}.pdf"`
  );
  doc.pipe(res);
  let pageNum = 1;
  drawHeader(doc, studentName, "maths", date, accentColor);
  let y = 90;
  if (content.topic) {
    doc.fillColor(accentColor).font("Helvetica-Bold").fontSize(13).text(`Topic: ${content.topic}`, MARGIN, y);
    y += 22;
  }
  doc.fillColor("#64748B").font("Helvetica-Oblique").fontSize(9).text(
    "Answer all questions. Show your working out clearly. Check your answers when you have finished.",
    MARGIN,
    y,
    { width: CONTENT_W }
  );
  y += 22;
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor("#E2E8F0").lineWidth(0.5).stroke();
  y += 12;
  const questions = content.questions ?? [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qText = `${q.id}.  ${q.text}`;
    doc.fontSize(11);
    const textHeight = doc.heightOfString(qText, { width: CONTENT_W - 30 });
    const rowHeight = Math.max(textHeight + 8, 28);
    const answerLineH = 22;
    const totalH = rowHeight + answerLineH + 6;
    if (y + totalH > PAGE_H - 60) {
      drawFooter(doc, pageNum, accentColor);
      doc.addPage();
      pageNum++;
      drawHeader(doc, studentName, "maths", date, accentColor);
      y = 90;
    }
    if (i % 2 === 0) {
      doc.rect(MARGIN - 6, y - 4, CONTENT_W + 12, rowHeight + 4).fill("#F8FAFC");
    }
    doc.circle(MARGIN + 10, y + 8, 9).fill(accentColor);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8).text(String(q.id), MARGIN + 4, y + 4, { width: 14, align: "center" });
    doc.fillColor("#1E293B").font("Helvetica").fontSize(11).text(q.text, MARGIN + 26, y, { width: CONTENT_W - 30 });
    y += rowHeight;
    doc.moveTo(MARGIN + 26, y + 14).lineTo(PAGE_W - MARGIN, y + 14).strokeColor("#CBD5E1").lineWidth(0.4).stroke();
    doc.fillColor("#94A3B8").font("Helvetica").fontSize(7).text("Answer:", MARGIN + 26, y + 6);
    y += answerLineH + 10;
  }
  drawFooter(doc, pageNum, accentColor);
  doc.end();
}
function generateEnglishPDF(res, studentName, date, content) {
  const accentColor = studentName.toLowerCase() === "samson" ? "#7C3AED" : "#0891B2";
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${studentName}-English-${date}.pdf"`
  );
  doc.pipe(res);
  let pageNum = 1;
  drawHeader(doc, studentName, "english", date, accentColor);
  let y = 90;
  doc.roundedRect(MARGIN, y, 120, 20, 4).fill(accentColor + "20");
  doc.fillColor(accentColor).font("Helvetica-Bold").fontSize(9).text(content.promptType.toUpperCase(), MARGIN + 6, y + 5, { width: 108 });
  y += 30;
  doc.fillColor("#1E293B").font("Helvetica-Bold").fontSize(16).text(content.title, MARGIN, y, { width: CONTENT_W });
  y += doc.heightOfString(content.title, { width: CONTENT_W }) + 14;
  doc.fontSize(11);
  const promptH = doc.heightOfString(content.prompt, { width: CONTENT_W - 20 }) + 20;
  doc.roundedRect(MARGIN, y, CONTENT_W, promptH, 8).fill("#F0FDF4");
  doc.roundedRect(MARGIN, y, 4, promptH, 2).fill("#10B981");
  doc.fillColor("#1E293B").font("Helvetica").fontSize(11).text(content.prompt, MARGIN + 14, y + 10, { width: CONTENT_W - 20 });
  y += promptH + 16;
  if (content.hints && content.hints.length > 0) {
    doc.fillColor("#475569").font("Helvetica-Bold").fontSize(10).text("Writing Hints:", MARGIN, y);
    y += 16;
    for (const hint of content.hints) {
      doc.fontSize(10);
      const hintH = doc.heightOfString(`\u2022 ${hint}`, { width: CONTENT_W - 16 });
      doc.fillColor("#64748B").font("Helvetica").fontSize(10).text(`\u2022  ${hint}`, MARGIN + 8, y, { width: CONTENT_W - 16 });
      y += hintH + 6;
    }
    y += 8;
  }
  if (content.vocabularyWords && content.vocabularyWords.length > 0) {
    doc.fillColor("#475569").font("Helvetica-Bold").fontSize(10).text("Vocabulary to use:", MARGIN, y);
    y += 14;
    let vx = MARGIN;
    for (const word of content.vocabularyWords) {
      doc.fontSize(9);
      const ww = doc.widthOfString(word) + 16;
      if (vx + ww > PAGE_W - MARGIN) {
        vx = MARGIN;
        y += 22;
      }
      doc.roundedRect(vx, y, ww, 18, 4).fill(accentColor + "15");
      doc.fillColor(accentColor).font("Helvetica-Bold").fontSize(9).text(word, vx + 8, y + 4, { width: ww - 16 });
      vx += ww + 6;
    }
    y += 28;
  }
  if (y + 60 > PAGE_H - 60) {
    drawFooter(doc, pageNum, accentColor);
    doc.addPage();
    pageNum++;
    y = MARGIN;
  }
  doc.fillColor("#94A3B8").font("Helvetica-Oblique").fontSize(9).text("Write your response below:", MARGIN, y);
  y += 18;
  const lineSpacing = 28;
  const linesAvailable = Math.floor((PAGE_H - 60 - y) / lineSpacing);
  const totalLines = Math.max(linesAvailable, 14);
  for (let i = 0; i < totalLines; i++) {
    if (y + lineSpacing > PAGE_H - 60) {
      drawFooter(doc, pageNum, accentColor);
      doc.addPage();
      pageNum++;
      y = MARGIN;
    }
    doc.moveTo(MARGIN, y + lineSpacing - 4).lineTo(PAGE_W - MARGIN, y + lineSpacing - 4).strokeColor("#E2E8F0").lineWidth(0.4).stroke();
    y += lineSpacing;
  }
  drawFooter(doc, pageNum, accentColor);
  doc.end();
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var SDKServer = class {
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, name } = payload;
      if (typeof openId !== "string" || openId.length === 0 || typeof name !== "string") {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return { openId, name };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const user = await getUserByOpenId(session.openId);
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: /* @__PURE__ */ new Date()
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/oauth.ts
init_db();
function registerAuthRoutes(app2) {
  app2.post("/api/auth/login", async (req, res) => {
    const { password } = req.body ?? {};
    if (!ENV.authPassword) {
      res.status(500).json({ error: "Server configuration error: missing AUTH_PASSWORD" });
      return;
    }
    if (!ENV.cookieSecret) {
      res.status(500).json({ error: "Server configuration error: missing JWT_SECRET" });
      return;
    }
    if (!password || password !== ENV.authPassword) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }
    try {
      if (!ENV.databaseUrl) {
        res.status(500).json({ error: "Server configuration error: missing DATABASE_URL" });
        return;
      }
      let user = await getUserByOpenId("admin");
      if (!user) {
        await upsertUser({
          openId: "admin",
          name: "Parent",
          email: null,
          loginMethod: "password",
          lastSignedIn: /* @__PURE__ */ new Date()
        });
        user = await getUserByOpenId("admin");
      }
      if (!user) {
        res.status(500).json({ error: "Failed to create user in database" });
        return;
      }
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "Parent",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ ok: true });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed due to a server error" });
    }
  });
}

// api/serverless-entry.ts
function registerAppRoutes(app2) {
  app2.use(express.json({ limit: "50mb" }));
  app2.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerAuthRoutes(app2);
  app2.get("/api/debug/providers", async (req, res) => {
    const results = {};
    const testPayload = JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Reply with the single word: hello" }],
      max_tokens: 10
    });
    try {
      const baseUrl = ENV.openaiApiUrl ? `${ENV.openaiApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://api.openai.com/v1/chat/completions";
      const r = await fetch(baseUrl, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${ENV.openaiApiKey}` },
        body: testPayload,
        signal: AbortSignal.timeout(15e3)
      });
      const text2 = await r.text();
      results.openai = r.ok ? { ok: true, response: text2.slice(0, 200) } : { ok: false, error: `HTTP ${r.status}: ${text2.slice(0, 300)}` };
    } catch (e) {
      results.openai = { ok: false, error: String(e) };
    }
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 10, messages: [{ role: "user", content: "Reply with the single word: hello" }] }),
        signal: AbortSignal.timeout(15e3)
      });
      const text2 = await r.text();
      results.claude = r.ok ? { ok: true, response: text2.slice(0, 200) } : { ok: false, error: `HTTP ${r.status}: ${text2.slice(0, 300)}` };
    } catch (e) {
      results.claude = { ok: false, error: String(e) };
    }
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY ?? ""}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Reply with the single word: hello" }] }] }),
        signal: AbortSignal.timeout(15e3)
      });
      const text2 = await r.text();
      results.gemini = r.ok ? { ok: true, response: text2.slice(0, 200) } : { ok: false, error: `HTTP ${r.status}: ${text2.slice(0, 300)}` };
    } catch (e) {
      results.gemini = { ok: false, error: String(e) };
    }
    res.json({ version: "68c965d-claude-haiku-4-5-gemini-2.5-flash", envKeys: { openai: !!ENV.openaiApiKey, claude: !!process.env.ANTHROPIC_API_KEY, gemini: !!process.env.GEMINI_API_KEY, openaiUrl: ENV.openaiApiUrl || "(default)" }, results });
  });
  app2.get("/api/pdf/:studentId/:subject/:date", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId, 10);
      const subject = req.params.subject;
      const date = req.params.date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ error: "Invalid date" });
        return;
      }
      const student = await getStudentById(studentId);
      if (!student) {
        res.status(404).json({ error: "Student not found" });
        return;
      }
      const task = await getTaskForDate(studentId, date, subject);
      if (!task) {
        res.status(404).json({ error: "No task found for this date" });
        return;
      }
      if (subject === "maths") {
        generateMathsPDF(res, student.name, date, task.content);
      } else {
        generateEnglishPDF(res, student.name, date, task.content);
      }
    } catch (err) {
      console.error("[PDF] Error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "PDF generation failed" });
      }
    }
  });
  app2.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path }) {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          const cause = error.cause?.cause ?? error.cause;
          console.error(`[tRPC] ${path} error:`, error.message, cause ? `
Cause: ${String(cause)}` : "");
        }
      }
    })
  );
}
var app = express();
app.set("trust proxy", true);
registerAppRoutes(app);
async function handler(req, res) {
  return app(req, res);
}
export {
  handler as default
};
