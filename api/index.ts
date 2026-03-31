import type { Request, Response } from "express";
import { createApp } from "../server/_core/index";

const appPromise = createApp({ includeFrontend: false });

export default async function handler(req: Request, res: Response) {
  const app = await appPromise;
  return app(req, res);
}
