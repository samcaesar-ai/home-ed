// Stub for serverless environment - vite is not needed
import type { Express } from "express";
import type { Server } from "http";

export async function setupVite(_app: Express, _server: Server): Promise<void> {
  throw new Error("setupVite is not available in serverless environment");
}

export function serveStatic(_app: Express): void {
  // In serverless mode, static files are served by Vercel CDN from dist/public
  // This function is intentionally a no-op
}
