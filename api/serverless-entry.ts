// Serverless entry point for Vercel
// This file is the esbuild entry; it imports the server core but
// replaces the vite module with a no-op stub via the tsconfig paths trick.
import "dotenv/config";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { appRouter } from "../server/routers";
import { getTaskForDate, getStudentById } from "../server/db";
import type { EnglishContent, MathsContent } from "../drizzle/schema";
import { generateEnglishPDF, generateMathsPDF } from "../server/pdfGenerator";
import { createContext } from "../server/_core/context";
import { registerAuthRoutes } from "../server/_core/oauth";
import { ENV } from "../server/_core/env";

function registerAppRoutes(app: ReturnType<typeof express>) {
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerAuthRoutes(app);

  // Debug endpoint: test all LLM providers and return raw errors
  app.get("/api/debug/providers", async (req, res) => {
    const results: Record<string, { ok: boolean; error?: string; response?: string }> = {};
    const testPayload = JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Reply with the single word: hello" }],
      max_tokens: 10,
    });

    // Test OpenAI
    try {
      const baseUrl = ENV.openaiApiUrl
        ? `${ENV.openaiApiUrl.replace(/\/$/, "")}/v1/chat/completions`
        : "https://api.openai.com/v1/chat/completions";
      const r = await fetch(baseUrl, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${ENV.openaiApiKey}` },
        body: testPayload,
        signal: AbortSignal.timeout(15_000),
      });
      const text = await r.text();
      results.openai = r.ok ? { ok: true, response: text.slice(0, 200) } : { ok: false, error: `HTTP ${r.status}: ${text.slice(0, 300)}` };
    } catch (e) { results.openai = { ok: false, error: String(e) }; }

    // Test Claude
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 10, messages: [{ role: "user", content: "Reply with the single word: hello" }] }),
        signal: AbortSignal.timeout(15_000),
      });
      const text = await r.text();
      results.claude = r.ok ? { ok: true, response: text.slice(0, 200) } : { ok: false, error: `HTTP ${r.status}: ${text.slice(0, 300)}` };
    } catch (e) { results.claude = { ok: false, error: String(e) }; }

    // Test Gemini
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY ?? ""}`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Reply with the single word: hello" }] }] }),
        signal: AbortSignal.timeout(15_000),
      });
      const text = await r.text();
      results.gemini = r.ok ? { ok: true, response: text.slice(0, 200) } : { ok: false, error: `HTTP ${r.status}: ${text.slice(0, 300)}` };
    } catch (e) { results.gemini = { ok: false, error: String(e) }; }

    res.json({ version: "68c965d-claude-haiku-4-5-gemini-2.5-flash", envKeys: { openai: !!ENV.openaiApiKey, claude: !!process.env.ANTHROPIC_API_KEY, gemini: !!process.env.GEMINI_API_KEY, openaiUrl: ENV.openaiApiUrl || "(default)" }, results });
  });

  // Native Vercel cron endpoint — called by Vercel at 06:00 UTC daily
  app.get("/api/cron/daily", async (req, res) => {
    // Vercel passes CRON_SECRET via the Authorization header as Bearer token
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const expectedSecret = process.env.CRON_SECRET ?? "daily-tasks-cron";
    if (token !== expectedSecret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    // Fire off all generateOne calls in parallel (same logic as cron.triggerDaily)
    try {
      const { getAllStudents, getSettingsByStudentId, buildHistoryContext, generateAndSave } = await import("../server/routers").then(() => require("../server/db"));
      // Use the tRPC mutation directly via internal fetch
      const host = req.headers.host ?? "tasks.homeis.fun";
      const protocol = host.includes("localhost") ? "http" : "https";
      const baseUrl = `${protocol}://${host}`;
      const resp = await fetch(`${baseUrl}/api/trpc/cron.triggerDaily`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: { secret: expectedSecret } }),
        signal: AbortSignal.timeout(55_000),
      });
      const data = await resp.json();
      const result = (data as any)?.result?.data?.json ?? data;
      console.log("[Cron] Daily generation complete:", JSON.stringify(result));
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("[Cron] Daily generation failed:", err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.get("/api/pdf/:studentId/:subject/:date", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId, 10);
      const subject = req.params.subject as "maths" | "english";
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
        generateMathsPDF(res, student.name, date, task.content as MathsContent);
      } else {
        generateEnglishPDF(res, student.name, date, task.content as EnglishContent);
      }
    } catch (err) {
      console.error("[PDF] Error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "PDF generation failed" });
      }
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path }) {
        if (error.code === 'INTERNAL_SERVER_ERROR') {
          const cause = (error.cause as any)?.cause ?? error.cause;
          console.error(`[tRPC] ${path} error:`, error.message, cause ? `\nCause: ${String(cause)}` : '');
        }
      },
    })
  );
}

const app = express();
app.set("trust proxy", true);
registerAppRoutes(app);

export default async function handler(req: any, res: any) {
  return app(req, res);
}
