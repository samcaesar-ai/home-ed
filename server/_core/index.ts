import "dotenv/config";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express, { type Express } from "express";
import { createServer, type Server as HttpServer } from "http";
import net from "net";
import { appRouter } from "../routers";
import { getTaskForDate, getStudentById } from "../db";
import type { EnglishContent, MathsContent } from "../../drizzle/schema";
import { generateEnglishPDF, generateMathsPDF } from "../pdfGenerator";
import { createContext } from "./context";
import { registerAuthRoutes } from "./oauth";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
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

function registerAppRoutes(app: Express) {
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Auth routes (password login)
  registerAuthRoutes(app);

  // PDF download endpoint
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

  // tRPC API
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

export async function createApp(options?: { includeFrontend?: boolean; server?: HttpServer }) {
  const app = express();
  // Required so req.protocol honors X-Forwarded-Proto on platforms like Vercel.
  app.set("trust proxy", true);
  registerAppRoutes(app);

  if (options?.includeFrontend !== false) {
    if (process.env.NODE_ENV === "development") {
      if (!options?.server) {
        throw new Error("Development mode requires an HTTP server instance");
      }
      await setupVite(app, options.server);
    } else {
      serveStatic(app);
    }
  }

  return app;
}

async function startServer() {
  const server = createServer();
  const app = await createApp({ includeFrontend: true, server });

  server.on("request", app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

if (process.env.VERCEL !== "1") {
  startServer().catch(console.error);
}
