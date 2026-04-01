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

function registerAppRoutes(app: ReturnType<typeof express>) {
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerAuthRoutes(app);

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
    createExpressMiddleware({ router: appRouter, createContext })
  );
}

const app = express();
app.set("trust proxy", true);
registerAppRoutes(app);

export default async function handler(req: any, res: any) {
  return app(req, res);
}
