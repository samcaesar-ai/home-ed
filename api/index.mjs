import { createApp } from "../dist/index.js";

const appPromise = createApp({ includeFrontend: false }).catch((err) => {
  console.error("[Serverless] createApp failed:", err);
  throw err;
});

export default async function handler(req, res) {
  try {
    const app = await appPromise;
    return app(req, res);
  } catch (err) {
    console.error("[Serverless] Handler error:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err?.message ?? err) }));
  }
}
