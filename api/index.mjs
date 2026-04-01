import { createApp } from "../server/_core/index.js";

const appPromise = createApp({ includeFrontend: false });

export default async function handler(req, res) {
  const app = await appPromise;
  return app(req, res);
}
