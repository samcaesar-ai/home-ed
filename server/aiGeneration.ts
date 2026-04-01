/**
 * AI generation pipeline with multi-provider fallback.
 *
 * Flow for each worksheet:
 *   1. Build normalised prompt payload
 *   2. Attempt OpenAI → Claude → Gemini in order
 *   3. Parse and validate strict JSON schema after each attempt
 *   4. Run content validation (maths correctness, British English, duplicates, etc.)
 *   5. If all providers fail, fall back to local emergency templates
 *
 * The child-facing interface never sees a provider error — it always receives
 * a complete, valid worksheet.
 */

import type { EnglishContent, MathsContent } from "../drizzle/schema";
import { getEmergencyEnglishTemplate, getEmergencyMathsTemplate } from "./emergencyTemplates";
import { invokeWithFallback, type FallbackResult, type ProviderName } from "./providers";
import {
  safeParseJSON,
  validateEnglishContent,
  validateMathsContent,
} from "./validation";

// ─── Result types ─────────────────────────────────────────────────────────────

export interface GenerationMeta {
  providerUsed: ProviderName | "emergency";
  providerAttempted: string[];
  fallbackUsed: boolean;
  generationStatus: "success" | "fallback" | "emergency" | "failed";
  validationPassed: boolean;
  validationErrors: string[];
  modelUsed: string;
}

export interface MathsGenerationResult {
  content: MathsContent;
  meta: GenerationMeta;
}

export interface EnglishGenerationResult {
  content: EnglishContent;
  meta: GenerationMeta;
}

// ─── JSON schemas for structured output ──────────────────────────────────────

const MATHS_JSON_SCHEMA = {
  name: "maths_task",
  schema: {
    type: "object",
    properties: {
      topic: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "integer" },
            text: { type: "string" },
            answer: { type: "string" },
          },
          required: ["id", "text", "answer"],
          additionalProperties: false,
        },
      },
    },
    required: ["topic", "questions"],
    additionalProperties: false,
  },
};

const ENGLISH_JSON_SCHEMA = {
  name: "english_task",
  schema: {
    type: "object",
    properties: {
      promptType: { type: "string" },
      title: { type: "string" },
      prompt: { type: "string" },
      hints: { type: "array", items: { type: "string" } },
      vocabularyWords: { type: "array", items: { type: "string" } },
    },
    required: ["promptType", "title", "prompt", "hints", "vocabularyWords"],
    additionalProperties: false,
  },
};

// ─── Maths generation ─────────────────────────────────────────────────────────

export async function generateMathsTask(params: {
  studentName: string;
  yearGroup: number;
  age: number;
  focusAreas: string[];
  questionCount: number;
  additionalNotes?: string | null;
  recentHistory?: string;
}): Promise<MathsGenerationResult> {
  const focusStr = params.focusAreas.join(", ");
  const historySection = params.recentHistory
    ? `\n\nRECENT HISTORY (use this to build on prior work and avoid repetition):\n${params.recentHistory}`
    : "";

  const systemPrompt = `You are an expert UK primary and secondary school Maths teacher creating daily worksheets.
CRITICAL RULES:
- Use BRITISH ENGLISH spelling throughout (e.g. "colour", "recognise", "practise", "maths", "metre", "litre").
- All questions must be appropriate for Year ${params.yearGroup} (age ${params.age}) of the UK National Curriculum.
- Verify ALL mathematical logic rigorously: angles in a triangle must sum to 180 degrees, arithmetic must be correct, fractions must be properly formed.
- Format questions clearly for A4 PDF printing -- keep each question concise and on one logical line where possible.
- Vary question difficulty within the set: start accessible, build to challenging.
- Include a mix of calculation, reasoning, and word problems.
- NEVER include the answer in the question text itself.
- Return ONLY valid JSON matching the schema -- no markdown, no extra text.`;

  const userPrompt = `Generate exactly ${params.questionCount} maths questions for ${params.studentName} (Year ${params.yearGroup}, age ${params.age}).
Focus areas today: ${focusStr}.
${params.additionalNotes ? `Teacher notes: ${params.additionalNotes}` : ""}${historySection}
Return JSON in this exact schema:
{
  "topic": "Brief topic description e.g. 'Fractions and Decimals'",
  "questions": [
    { "id": 1, "text": "Question text here", "answer": "Correct answer here" },
    ...
  ]
}`;

  const validate = (raw: string): { ok: boolean; errors: string[] } => {
    const { data, error } = safeParseJSON<MathsContent>(raw);
    if (error || !data) return { ok: false, errors: [error ?? "JSON parse failed"] };
    const result = validateMathsContent(data, params.questionCount, params.yearGroup);
    return { ok: result.ok, errors: result.errors };
  };

  let fallbackResult: FallbackResult | null = null;

  try {
    fallbackResult = await invokeWithFallback(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        jsonSchema: MATHS_JSON_SCHEMA,
      },
      validate
    );
  } catch (err) {
    console.error("[Generation] All providers failed for maths, using emergency template:", err);
    const emergency = getEmergencyMathsTemplate(params.yearGroup, params.questionCount);
    return {
      content: emergency,
      meta: {
        providerUsed: "emergency",
        providerAttempted: ["openai", "claude", "gemini"],
        fallbackUsed: true,
        generationStatus: "emergency",
        validationPassed: true,
        validationErrors: [],
        modelUsed: "emergency-template",
      },
    };
  }

  const { data, error } = safeParseJSON<MathsContent>(fallbackResult.content);
  if (error || !data) {
    const emergency = getEmergencyMathsTemplate(params.yearGroup, params.questionCount);
    return {
      content: emergency,
      meta: {
        providerUsed: "emergency",
        providerAttempted: fallbackResult.providerAttempted,
        fallbackUsed: true,
        generationStatus: "emergency",
        validationPassed: true,
        validationErrors: [error ?? "Post-parse failed"],
        modelUsed: "emergency-template",
      },
    };
  }

  const validation = validateMathsContent(data, params.questionCount, params.yearGroup);

  return {
    content: data,
    meta: {
      providerUsed: fallbackResult.providerUsed,
      providerAttempted: fallbackResult.providerAttempted,
      fallbackUsed: fallbackResult.fallbackUsed,
      generationStatus: fallbackResult.fallbackUsed ? "fallback" : "success",
      validationPassed: validation.ok,
      validationErrors: [...validation.errors, ...validation.warnings],
      modelUsed: fallbackResult.modelUsed,
    },
  };
}

// ─── English generation ───────────────────────────────────────────────────────

export async function generateEnglishTask(params: {
  studentName: string;
  yearGroup: number;
  age: number;
  writingStyles: string[];
  additionalNotes?: string | null;
  recentHistory?: string;
}): Promise<EnglishGenerationResult> {
  const style = params.writingStyles[Math.floor(Math.random() * params.writingStyles.length)];
  const historySection = params.recentHistory
    ? `\n\nRECENT HISTORY (vary the topic and style to build on prior work):\n${params.recentHistory}`
    : "";

  const systemPrompt = `You are an expert UK primary and secondary school English teacher creating daily creative writing prompts.
CRITICAL RULES:
- Use BRITISH ENGLISH spelling and vocabulary throughout (e.g. "colour", "favourite", "practise", "organise", "travelling").
- All prompts must be appropriate for Year ${params.yearGroup} (age ${params.age}) of the UK National Curriculum.
- Encourage expressive, descriptive language with varied sentence structures.
- The prompt must be engaging, imaginative, and age-appropriate.
- Provide 3-5 vocabulary hints that are ambitious but achievable for the year group.
- Format the output clearly for A4 PDF printing.
- NEVER include a sample answer or model text -- only the prompt and hints.
- Return ONLY valid JSON matching the schema -- no markdown, no extra text.`;

  const userPrompt = `Generate a ${style} creative writing prompt for ${params.studentName} (Year ${params.yearGroup}, age ${params.age}).
${params.additionalNotes ? `Teacher notes: ${params.additionalNotes}` : ""}${historySection}
Return JSON in this exact schema:
{
  "promptType": "${style}",
  "title": "Engaging title for the task",
  "prompt": "Full writing prompt (2-4 sentences) that sets the scene and task clearly",
  "hints": ["hint 1", "hint 2", "hint 3", "hint 4"],
  "vocabularyWords": ["word1", "word2", "word3", "word4", "word5"]
}`;

  const validate = (raw: string): { ok: boolean; errors: string[] } => {
    const { data, error } = safeParseJSON<EnglishContent>(raw);
    if (error || !data) return { ok: false, errors: [error ?? "JSON parse failed"] };
    const result = validateEnglishContent(data, params.yearGroup);
    return { ok: result.ok, errors: result.errors };
  };

  let fallbackResult: FallbackResult | null = null;

  try {
    fallbackResult = await invokeWithFallback(
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        jsonSchema: ENGLISH_JSON_SCHEMA,
      },
      validate
    );
  } catch (err) {
    console.error("[Generation] All providers failed for english, using emergency template:", err);
    const emergency = getEmergencyEnglishTemplate(params.yearGroup);
    return {
      content: emergency,
      meta: {
        providerUsed: "emergency",
        providerAttempted: ["openai", "claude", "gemini"],
        fallbackUsed: true,
        generationStatus: "emergency",
        validationPassed: true,
        validationErrors: [],
        modelUsed: "emergency-template",
      },
    };
  }

  const { data, error } = safeParseJSON<EnglishContent>(fallbackResult.content);
  if (error || !data) {
    const emergency = getEmergencyEnglishTemplate(params.yearGroup);
    return {
      content: emergency,
      meta: {
        providerUsed: "emergency",
        providerAttempted: fallbackResult.providerAttempted,
        fallbackUsed: true,
        generationStatus: "emergency",
        validationPassed: true,
        validationErrors: [error ?? "Post-parse failed"],
        modelUsed: "emergency-template",
      },
    };
  }

  const validation = validateEnglishContent(data, params.yearGroup);

  return {
    content: data,
    meta: {
      providerUsed: fallbackResult.providerUsed,
      providerAttempted: fallbackResult.providerAttempted,
      fallbackUsed: fallbackResult.fallbackUsed,
      generationStatus: fallbackResult.fallbackUsed ? "fallback" : "success",
      validationPassed: validation.ok,
      validationErrors: [...validation.errors, ...validation.warnings],
      modelUsed: fallbackResult.modelUsed,
    },
  };
}

// ─── Regeneration helpers ─────────────────────────────────────────────────────

export async function regenerateSingleQuestion(params: {
  studentName: string;
  yearGroup: number;
  questionNumber: number;
  topic: string;
  existingQuestions: string[];
}): Promise<{ text: string; answer: string }> {
  const systemPrompt = `You are a UK Maths teacher. Generate one replacement question using British English. 
Verify all mathematical logic. Return ONLY valid JSON.`;
  const userPrompt = `Generate one new maths question for ${params.studentName} (Year ${params.yearGroup}).
Topic: ${params.topic}
Question number: ${params.questionNumber}
Existing questions to avoid duplicating: ${params.existingQuestions.join(" | ")}
Return JSON: { "text": "question text", "answer": "correct answer" }`;

  try {
    const result = await invokeWithFallback({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const { data } = safeParseJSON<{ text: string; answer: string }>(result.content);
    if (data?.text && data?.answer) return data;
  } catch (_) {
    // fall through to default
  }
  return { text: "Calculate 12 x 12", answer: "144" };
}

export async function regenerateEnglishPrompt(params: {
  studentName: string;
  yearGroup: number;
  age: number;
  writingStyles: string[];
  additionalNotes?: string | null;
}): Promise<EnglishContent> {
  const result = await generateEnglishTask(params);
  return result.content;
}
