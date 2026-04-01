/**
 * Multi-provider LLM abstraction layer.
 *
 * Supports OpenAI, Anthropic Claude, and Google Gemini.
 * Each provider normalises its response into a common shape so the rest of
 * the application never needs to know which provider was used.
 */

import { ENV } from "./_core/env";

// ─── Common types ─────────────────────────────────────────────────────────────

export type ProviderName = "openai" | "claude" | "gemini";

export interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderRequest {
  messages: ProviderMessage[];
  /** JSON schema to enforce on the response */
  jsonSchema?: {
    name: string;
    schema: Record<string, unknown>;
  };
  maxTokens?: number;
}

export interface ProviderResponse {
  content: string;
  provider: ProviderName;
  model: string;
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function callOpenAI(req: ProviderRequest): Promise<ProviderResponse> {
  const apiKey = ENV.openaiApiKey;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const baseUrl = resolveOpenAIChatCompletionsUrl(ENV.openaiApiUrl);

  const model = "gpt-4o-mini";
  const payload: Record<string, unknown> = {
    model,
    messages: req.messages,
    max_tokens: req.maxTokens ?? 4096,
  };

  if (req.jsonSchema) {
    payload.response_format = {
      type: "json_schema",
      json_schema: {
        name: req.jsonSchema.name,
        strict: true,
        schema: req.jsonSchema.schema,
      },
    };
  }

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `OpenAI ${res.status}: ${text} (url=${baseUrl}). Check OPENAI_API_URL format and OPENAI_API_KEY/OPENAPI_API_KEY.`
    );
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "";
  return { content, provider: "openai", model };
}

function resolveOpenAIChatCompletionsUrl(rawUrl?: string): string {
  if (!rawUrl || rawUrl.trim().length === 0) {
    return "https://api.openai.com/v1/chat/completions";
  }

  const normalized = rawUrl.trim().replace(/\/+$/, "");

  if (normalized.endsWith("/chat/completions")) {
    return normalized;
  }

  if (normalized.endsWith("/v1")) {
    return `${normalized}/chat/completions`;
  }

  return `${normalized}/v1/chat/completions`;
}

// ─── Claude ───────────────────────────────────────────────────────────────────

async function callClaude(req: ProviderRequest): Promise<ProviderResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const model = "claude-haiku-4-5-20251001";

  // Claude uses a separate system message field
  const systemMsg = req.messages.find((m) => m.role === "system")?.content ?? "";
  const userMessages = req.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  // Append JSON instruction to the last user message if schema is required
  const messagesWithInstruction = userMessages.map((m, i) => {
    if (i === userMessages.length - 1 && req.jsonSchema) {
      return {
        ...m,
        content: `${m.content}\n\nIMPORTANT: Return ONLY valid JSON matching the schema. No markdown, no extra text.`,
      };
    }
    return m;
  });

  const payload: Record<string, unknown> = {
    model,
    max_tokens: req.maxTokens ?? 4096,
    system: systemMsg,
    messages: messagesWithInstruction,
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude ${res.status}: ${text}`);
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const content = data.content?.find((b) => b.type === "text")?.text ?? "";
  return { content, provider: "claude", model };
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function callGemini(req: ProviderRequest): Promise<ProviderResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Gemini uses a different message format
  const systemMsg = req.messages.find((m) => m.role === "system")?.content ?? "";
  const userMessages = req.messages.filter((m) => m.role !== "system");

  const contents = userMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Append JSON instruction
  if (req.jsonSchema && contents.length > 0) {
    const last = contents[contents.length - 1];
    last.parts[0].text += "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no extra text.";
  }

  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: req.maxTokens ?? 4096,
      responseMimeType: req.jsonSchema ? "application/json" : "text/plain",
    },
  };

  if (systemMsg) {
    payload.systemInstruction = { parts: [{ text: systemMsg }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text}`);
  }

  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { content, provider: "gemini", model };
}

// ─── Provider registry ────────────────────────────────────────────────────────

const PROVIDERS: Array<{ name: ProviderName; call: (r: ProviderRequest) => Promise<ProviderResponse> }> = [
  { name: "openai", call: callOpenAI },
  { name: "claude", call: callClaude },
  { name: "gemini", call: callGemini },
];

// ─── Fallback orchestrator ────────────────────────────────────────────────────

export interface FallbackResult {
  content: string;
  providerUsed: ProviderName;
  providerAttempted: ProviderName[];
  modelUsed: string;
  fallbackUsed: boolean;
}

/**
 * Attempt generation across all providers in order.
 * Returns the first successful response, recording which providers were tried.
 */
export async function invokeWithFallback(
  req: ProviderRequest,
  validate?: (content: string) => { ok: boolean; errors: string[] }
): Promise<FallbackResult> {
  const attempted: ProviderName[] = [];
  const allErrors: string[] = [];

  for (let i = 0; i < PROVIDERS.length; i++) {
    const { name, call } = PROVIDERS[i];
    attempted.push(name);

    try {
      const result = await call(req);
      const raw = result.content.trim();

      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

      // Run caller-supplied validation if provided
      if (validate) {
        const { ok, errors } = validate(cleaned);
        if (!ok) {
          console.warn(`[LLM:${name}] Validation failed:`, errors);
          allErrors.push(...errors.map((e) => `[${name}] ${e}`));
          // Only retry once on the same provider for transient issues, then move on
          continue;
        }
      }

      return {
        content: cleaned,
        providerUsed: name,
        providerAttempted: attempted,
        modelUsed: result.model,
        fallbackUsed: i > 0,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[LLM:${name}] Failed:`, msg);
      allErrors.push(`[${name}] ${msg}`);
    }
  }

  throw new Error(
    `All LLM providers failed.\n${allErrors.join("\n")}`
  );
}
