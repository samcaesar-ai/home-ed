import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getTaskForDate } from "../db";
import { getStudentById } from "../db";
import { generateMathsPDF, generateEnglishPDF } from "../pdfGenerator";
import type { MathsContent, EnglishContent } from "../../drizzle/schema";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // ─── PDF download endpoint ──────────────────────────────────────────────────
  app.get("/api/pdf/:studentId/:subject/:date", async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId, 10);
      const subject = req.params.subject as "maths" | "english";
      const date = req.params.date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { res.status(400).json({ error: "Invalid date" }); return; }
      const student = await getStudentById(studentId);
      if (!student) { res.status(404).json({ error: "Student not found" }); return; }
      const task = await getTaskForDate(studentId, date, subject);
      if (!task) { res.status(404).json({ error: "No task found for this date" }); return; }
      if (subject === "maths") {
        generateMathsPDF(res, student.name, date, task.content as MathsContent);
      } else {
        generateEnglishPDF(res, student.name, date, task.content as EnglishContent);
      }
    } catch (err) {
      console.error("[PDF] Error:", err);
      if (!res.headersSent) res.status(500).json({ error: "PDF generation failed" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
