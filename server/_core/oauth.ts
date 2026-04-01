import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";
export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { password } = req.body ?? {};

    if (!password || password !== ENV.authPassword) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    try {
      // Ensure an admin user exists
      let user = await db.getUserByOpenId("admin");
      if (!user) {
        await db.upsertUser({
          openId: "admin",
          name: "Parent",
          email: null,
          loginMethod: "password",
          lastSignedIn: new Date(),
        });
        user = await db.getUserByOpenId("admin");
      }

      if (!user) {
        res.status(500).json({ error: "Failed to create user" });
        return;
      }

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "Parent",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ ok: true });
    } catch (error) {
      const msg = (error as Error)?.message ?? String(error);
      console.error("[Auth] Login failed:", msg);
      res.status(500).json({ error: `Login failed: ${msg}` });
    }
  });
}
