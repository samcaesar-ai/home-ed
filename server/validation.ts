/**
 * Content validation layer.
 *
 * All generated content must pass these checks before being saved to the DB.
 * Validation is intentionally strict — any failure triggers a provider fallback.
 */

import type { EnglishContent, MathsContent, MathsQuestion } from "../drizzle/schema";

// ─── British English spot-check ───────────────────────────────────────────────

const AMERICAN_SPELLINGS: Record<string, string> = {
  "math ": "maths ",
  "math.": "maths.",
  "math,": "maths,",
  "math\n": "maths\n",
  "color": "colour",
  "flavor": "flavour",
  "honor": "honour",
  "humor": "humour",
  "neighbor": "neighbour",
  "center": "centre",
  "theater": "theatre",
  "meter ": "metre ",
  "liter": "litre",
  "organize": "organise",
  "recognize": "recognise",
  "analyze": "analyse",
  "apologize": "apologise",
  "realize": "realise",
  "traveling": "travelling",
  "canceled": "cancelled",
  "labeled": "labelled",
  "modeled": "modelled",
  "defense": "defence",
  "offense": "offence",
  "license ": "licence ",
  "practice ": "practise ",  // verb form
  "gray": "grey",
  "program ": "programme ",
  "aluminum": "aluminium",
  "catalog": "catalogue",
  "dialog ": "dialogue ",
  "fulfill": "fulfil",
  "skillful": "skilful",
  "enrollment": "enrolment",
  "jewelry": "jewellery",
  "pajamas": "pyjamas",
  "tire ": "tyre ",
  "curb ": "kerb ",
  "mom ": "mum ",
  "mom,": "mum,",
  "mom.": "mum.",
  "mom!": "mum!",
  "mom?": "mum?",
  "gotten": "got",
  "fall ": "autumn ",  // seasonal context
};

function checkBritishEnglish(text: string): string[] {
  const lower = text.toLowerCase();
  const errors: string[] = [];
  for (const [american] of Object.entries(AMERICAN_SPELLINGS)) {
    if (lower.includes(american.toLowerCase())) {
      errors.push(`American spelling detected: "${american.trim()}"`);
    }
  }
  return errors;
}

// ─── Maths correctness checks ─────────────────────────────────────────────────

function validateMathsAnswer(question: MathsQuestion): string | null {
  const text = question.text.toLowerCase();
  const answer = (question.answer ?? "").toLowerCase().trim();

  // Check triangle angle sum
  const angleMatch = text.match(/angles?\s+(?:of|in)\s+a\s+triangle/i);
  if (angleMatch) {
    const nums = text.match(/\d+/g)?.map(Number) ?? [];
    if (nums.length >= 2) {
      const knownSum = nums.reduce((a, b) => a + b, 0);
      if (knownSum > 180) {
        return `Triangle angles sum to ${knownSum}° which exceeds 180°`;
      }
    }
  }

  // Basic arithmetic: "X + Y = ?" or "X × Y = ?"
  const addMatch = text.match(/(\d+)\s*\+\s*(\d+)/);
  if (addMatch) {
    const expected = parseInt(addMatch[1]) + parseInt(addMatch[2]);
    const answerNum = parseInt(answer);
    if (!isNaN(answerNum) && answerNum !== expected) {
      return `Addition error: ${addMatch[1]} + ${addMatch[2]} should be ${expected}, got ${answer}`;
    }
  }

  const subMatch = text.match(/(\d+)\s*[-−]\s*(\d+)/);
  if (subMatch) {
    const expected = parseInt(subMatch[1]) - parseInt(subMatch[2]);
    const answerNum = parseInt(answer);
    if (!isNaN(answerNum) && answerNum !== expected) {
      return `Subtraction error: ${subMatch[1]} - ${subMatch[2]} should be ${expected}, got ${answer}`;
    }
  }

  const mulMatch = text.match(/(\d+)\s*[×x\*]\s*(\d+)/);
  if (mulMatch) {
    const expected = parseInt(mulMatch[1]) * parseInt(mulMatch[2]);
    const answerNum = parseInt(answer);
    if (!isNaN(answerNum) && answerNum !== expected) {
      return `Multiplication error: ${mulMatch[1]} × ${mulMatch[2]} should be ${expected}, got ${answer}`;
    }
  }

  return null;
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

function detectDuplicates(items: string[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const item of items) {
    const normalised = item.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(normalised)) {
      duplicates.push(`Duplicate detected: "${item.substring(0, 60)}..."`);
    }
    seen.add(normalised);
  }
  return duplicates;
}

// ─── Maths validation ─────────────────────────────────────────────────────────

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function validateMathsContent(
  content: MathsContent,
  expectedCount: number,
  yearGroup: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema completeness
  if (!content.questions || !Array.isArray(content.questions)) {
    errors.push("Missing questions array");
    return { ok: false, errors, warnings };
  }

  if (content.questions.length === 0) {
    errors.push("Questions array is empty");
    return { ok: false, errors, warnings };
  }

  if (content.questions.length < Math.floor(expectedCount * 0.8)) {
    errors.push(
      `Too few questions: expected ~${expectedCount}, got ${content.questions.length}`
    );
  }

  // Field completeness
  for (const q of content.questions) {
    if (!q.text || q.text.trim().length < 5) {
      errors.push(`Question ${q.id} has missing or too-short text`);
    }
    if (!q.answer || q.answer.trim().length === 0) {
      errors.push(`Question ${q.id} has no answer`);
    }
  }

  // Maths correctness
  for (const q of content.questions) {
    const mathError = validateMathsAnswer(q);
    if (mathError) errors.push(mathError);
  }

  // Duplicate detection
  const questionTexts = content.questions.map((q) => q.text);
  const dupes = detectDuplicates(questionTexts);
  errors.push(...dupes);

  // British English
  const allText = content.questions.map((q) => q.text + " " + (q.answer ?? "")).join(" ");
  const britishErrors = checkBritishEnglish(allText);
  if (britishErrors.length > 0) {
    warnings.push(...britishErrors);
  }

  // Topic field
  if (!content.topic || content.topic.trim().length === 0) {
    warnings.push("Missing topic field");
  }

  return { ok: errors.length === 0, errors, warnings };
}

// ─── English validation ───────────────────────────────────────────────────────

export function validateEnglishContent(
  content: EnglishContent,
  yearGroup: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema completeness
  if (!content.promptType || content.promptType.trim().length === 0) {
    errors.push("Missing promptType");
  }
  if (!content.title || content.title.trim().length < 3) {
    errors.push("Missing or too-short title");
  }
  if (!content.prompt || content.prompt.trim().length < 20) {
    errors.push("Missing or too-short prompt");
  }
  if (!content.hints || !Array.isArray(content.hints) || content.hints.length < 2) {
    errors.push("Missing hints (need at least 2)");
  }
  if (!content.vocabularyWords || content.vocabularyWords.length < 3) {
    warnings.push("Fewer than 3 vocabulary words provided");
  }

  // Duplicate hints
  if (content.hints) {
    const dupes = detectDuplicates(content.hints);
    errors.push(...dupes);
  }

  // British English
  const allText = [
    content.title,
    content.prompt,
    ...(content.hints ?? []),
    ...(content.vocabularyWords ?? []),
  ].join(" ");
  const britishErrors = checkBritishEnglish(allText);
  if (britishErrors.length > 0) {
    warnings.push(...britishErrors);
  }

  // Check for sample answers (should never be included)
  const lowerPrompt = content.prompt?.toLowerCase() ?? "";
  if (
    lowerPrompt.includes("example answer:") ||
    lowerPrompt.includes("model answer:") ||
    lowerPrompt.includes("sample answer:")
  ) {
    errors.push("Prompt contains a sample/model answer which is not allowed");
  }

  return { ok: errors.length === 0, errors, warnings };
}

// ─── JSON parse helper ────────────────────────────────────────────────────────

export function safeParseJSON<T>(raw: string): { data: T | null; error: string | null } {
  try {
    const data = JSON.parse(raw) as T;
    return { data, error: null };
  } catch (e) {
    return { data: null, error: `JSON parse error: ${e instanceof Error ? e.message : String(e)}` };
  }
}
