import { invokeLLM } from "./_core/llm";
import type { EnglishContent, MathsContent } from "../drizzle/schema";

// ─── Maths generation ─────────────────────────────────────────────────────────
export async function generateMathsTask(params: {
  studentName: string;
  yearGroup: number;
  age: number;
  focusAreas: string[];
  questionCount: number;
  additionalNotes?: string | null;
  recentHistory?: string;
}): Promise<MathsContent> {
  const focusStr = params.focusAreas.join(", ");
  const historySection = params.recentHistory
    ? `\n\nRECENT HISTORY (use this to build on prior work and avoid repetition):\n${params.recentHistory}`
    : "";

  const systemPrompt = `You are an expert UK primary and secondary school Maths teacher creating daily worksheets.
CRITICAL RULES:
- Use BRITISH ENGLISH spelling throughout (e.g. "colour", "recognise", "practise", "maths", "metre", "litre").
- All questions must be appropriate for Year ${params.yearGroup} (age ${params.age}) of the UK National Curriculum.
- Verify ALL mathematical logic rigorously: angles in a triangle must sum to 180°, arithmetic must be correct, fractions must be properly formed.
- Format questions clearly for A4 PDF printing — keep each question concise and on one logical line where possible.
- Vary question difficulty within the set: start accessible, build to challenging.
- Include a mix of calculation, reasoning, and word problems.
- NEVER include the answer in the question text itself.
- Return ONLY valid JSON matching the schema — no markdown, no extra text.`;

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

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "maths_task",
        strict: true,
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
      },
    },
  });

  const rawContent = response.choices[0]?.message?.content;
  const raw = typeof rawContent === "string" ? rawContent : "{}";
  const parsed = JSON.parse(raw) as MathsContent;
  return parsed;
}

// ─── English generation ───────────────────────────────────────────────────────
export async function generateEnglishTask(params: {
  studentName: string;
  yearGroup: number;
  age: number;
  writingStyles: string[];
  additionalNotes?: string | null;
  recentHistory?: string;
}): Promise<EnglishContent> {
  // Pick a writing style at random from the configured list
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
- Provide 3–5 vocabulary hints that are ambitious but achievable for the year group.
- Format the output clearly for A4 PDF printing.
- NEVER include a sample answer or model text — only the prompt and hints.
- Return ONLY valid JSON matching the schema — no markdown, no extra text.`;

  const userPrompt = `Generate a ${style} creative writing prompt for ${params.studentName} (Year ${params.yearGroup}, age ${params.age}).
${params.additionalNotes ? `Teacher notes: ${params.additionalNotes}` : ""}${historySection}

Return JSON in this exact schema:
{
  "promptType": "${style}",
  "title": "Engaging title for the task",
  "prompt": "Full writing prompt (2–4 sentences) that sets the scene and task clearly",
  "hints": ["hint 1", "hint 2", "hint 3", "hint 4"],
  "vocabularyWords": ["word1", "word2", "word3", "word4", "word5"]
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "english_task",
        strict: true,
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
      },
    },
  });

  const rawContent = response.choices[0]?.message?.content;
  const raw = typeof rawContent === "string" ? rawContent : "{}";
  const parsed = JSON.parse(raw) as EnglishContent;
  return parsed;
}

// ─── Regenerate a single maths question ──────────────────────────────────────
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

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "single_question",
        strict: true,
        schema: {
          type: "object",
          properties: {
            text: { type: "string" },
            answer: { type: "string" },
          },
          required: ["text", "answer"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices[0]?.message?.content;
  const raw = typeof rawContent === "string" ? rawContent : "{}";
  return JSON.parse(raw) as { text: string; answer: string };
}

// ─── Regenerate English prompt ────────────────────────────────────────────────
export async function regenerateEnglishPrompt(params: {
  studentName: string;
  yearGroup: number;
  age: number;
  writingStyles: string[];
  additionalNotes?: string | null;
}): Promise<EnglishContent> {
  return generateEnglishTask(params);
}
