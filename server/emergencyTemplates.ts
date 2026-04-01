/**
 * Emergency template bank.
 *
 * Used as a last resort when all LLM providers fail.
 * Templates are grouped by year group and subject.
 * The child always sees a complete, well-formatted worksheet — never a blank page.
 */

import type { EnglishContent, MathsContent } from "../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MathsTemplate {
  topic: string;
  questions: Array<{ id: number; text: string; answer: string }>;
}

interface EnglishTemplate {
  promptType: string;
  title: string;
  prompt: string;
  hints: string[];
  vocabularyWords: string[];
}

// ─── Maths templates ──────────────────────────────────────────────────────────

const MATHS_YEAR_6: MathsTemplate[] = [
  {
    topic: "Arithmetic and Number",
    questions: [
      { id: 1, text: "Calculate 348 + 276", answer: "624" },
      { id: 2, text: "Calculate 503 − 187", answer: "316" },
      { id: 3, text: "Calculate 24 × 7", answer: "168" },
      { id: 4, text: "Calculate 144 ÷ 12", answer: "12" },
      { id: 5, text: "What is 50% of 240?", answer: "120" },
      { id: 6, text: "Round 3,847 to the nearest hundred.", answer: "3,800" },
      { id: 7, text: "Write the next two numbers in the sequence: 4, 8, 16, 32, __, __", answer: "64, 128" },
      { id: 8, text: "What is 3/4 of 48?", answer: "36" },
      { id: 9, text: "A bag of apples costs £1.35. How much do 4 bags cost?", answer: "£5.40" },
      { id: 10, text: "Write 0.75 as a fraction in its simplest form.", answer: "3/4" },
      { id: 11, text: "What is 25% of 160?", answer: "40" },
      { id: 12, text: "Calculate 1,000 − 364", answer: "636" },
      { id: 13, text: "A rectangle has a length of 9 cm and a width of 5 cm. What is its area?", answer: "45 cm²" },
      { id: 14, text: "List all the factors of 24.", answer: "1, 2, 3, 4, 6, 8, 12, 24" },
      { id: 15, text: "A train journey takes 1 hour 45 minutes. If the train departs at 09:20, when does it arrive?", answer: "11:05" },
    ],
  },
  {
    topic: "Fractions and Decimals",
    questions: [
      { id: 1, text: "Add: 1/4 + 1/2", answer: "3/4" },
      { id: 2, text: "Subtract: 3/4 − 1/4", answer: "1/2" },
      { id: 3, text: "Write 2/5 as a decimal.", answer: "0.4" },
      { id: 4, text: "Write 0.6 as a fraction in its simplest form.", answer: "3/5" },
      { id: 5, text: "Order these decimals from smallest to largest: 0.7, 0.07, 0.71, 0.17", answer: "0.07, 0.17, 0.7, 0.71" },
      { id: 6, text: "What is 1/3 of 90?", answer: "30" },
      { id: 7, text: "Calculate 0.4 × 5", answer: "2.0" },
      { id: 8, text: "A pizza is cut into 8 equal slices. Sam eats 3 slices. What fraction is left?", answer: "5/8" },
      { id: 9, text: "Write 3/10 as a percentage.", answer: "30%" },
      { id: 10, text: "Calculate 2.5 + 1.75", answer: "4.25" },
      { id: 11, text: "What is 10% of 350?", answer: "35" },
      { id: 12, text: "Simplify 6/9 to its lowest terms.", answer: "2/3" },
      { id: 13, text: "Calculate 4.8 − 2.3", answer: "2.5" },
      { id: 14, text: "Write 7/20 as a decimal.", answer: "0.35" },
      { id: 15, text: "A jug holds 1.5 litres. How many 250 ml glasses can be filled from it?", answer: "6" },
    ],
  },
];

const MATHS_YEAR_7: MathsTemplate[] = [
  {
    topic: "Algebra and Number",
    questions: [
      { id: 1, text: "Simplify: 3x + 5x", answer: "8x" },
      { id: 2, text: "Solve: x + 7 = 15", answer: "x = 8" },
      { id: 3, text: "Solve: 3x = 21", answer: "x = 7" },
      { id: 4, text: "Calculate: (−3) + (−5)", answer: "−8" },
      { id: 5, text: "Calculate: (−4) × 3", answer: "−12" },
      { id: 6, text: "Find the value of 2x + 3 when x = 4", answer: "11" },
      { id: 7, text: "Write 48 as a product of its prime factors.", answer: "2³ × 3 (or 2 × 2 × 2 × 3)" },
      { id: 8, text: "Find the HCF of 12 and 18.", answer: "6" },
      { id: 9, text: "Find the LCM of 4 and 6.", answer: "12" },
      { id: 10, text: "Calculate 15% of 200.", answer: "30" },
      { id: 11, text: "A shirt costs £40 and is reduced by 20%. What is the sale price?", answer: "£32" },
      { id: 12, text: "Expand: 3(x + 4)", answer: "3x + 12" },
      { id: 13, text: "Solve: 2x − 3 = 11", answer: "x = 7" },
      { id: 14, text: "Calculate: 2³ + 3²", answer: "17" },
      { id: 15, text: "A car travels 120 km in 2 hours. What is its average speed?", answer: "60 km/h" },
      { id: 16, text: "Simplify: 4a + 2b − a + 3b", answer: "3a + 5b" },
      { id: 17, text: "What is the square root of 144?", answer: "12" },
      { id: 18, text: "Convert 3/8 to a decimal.", answer: "0.375" },
      { id: 19, text: "A rectangle has a perimeter of 36 cm and a length of 11 cm. What is its width?", answer: "7 cm" },
      { id: 20, text: "Calculate the area of a triangle with base 10 cm and height 6 cm.", answer: "30 cm²" },
    ],
  },
  {
    topic: "Geometry and Measurement",
    questions: [
      { id: 1, text: "What do the angles in a triangle add up to?", answer: "180°" },
      { id: 2, text: "What do the angles in a quadrilateral add up to?", answer: "360°" },
      { id: 3, text: "Find the missing angle in a triangle where the other two angles are 65° and 72°.", answer: "43°" },
      { id: 4, text: "A square has a side of 8 cm. What is its perimeter?", answer: "32 cm" },
      { id: 5, text: "A square has a side of 8 cm. What is its area?", answer: "64 cm²" },
      { id: 6, text: "Calculate the circumference of a circle with diameter 10 cm. (Use π ≈ 3.14)", answer: "31.4 cm" },
      { id: 7, text: "Calculate the area of a circle with radius 5 cm. (Use π ≈ 3.14)", answer: "78.5 cm²" },
      { id: 8, text: "Convert 3.5 km to metres.", answer: "3,500 m" },
      { id: 9, text: "Convert 2,400 ml to litres.", answer: "2.4 litres" },
      { id: 10, text: "A cuboid has length 5 cm, width 3 cm, and height 4 cm. What is its volume?", answer: "60 cm³" },
      { id: 11, text: "Name the type of triangle with all sides equal.", answer: "Equilateral triangle" },
      { id: 12, text: "What is the name of an angle greater than 90° but less than 180°?", answer: "Obtuse angle" },
      { id: 13, text: "Two angles on a straight line add up to how many degrees?", answer: "180°" },
      { id: 14, text: "A parallelogram has a base of 9 cm and a height of 5 cm. What is its area?", answer: "45 cm²" },
      { id: 15, text: "How many faces does a triangular prism have?", answer: "5" },
      { id: 16, text: "Convert 450 cm² to m².", answer: "0.045 m²" },
      { id: 17, text: "What is the sum of interior angles of a pentagon?", answer: "540°" },
      { id: 18, text: "A map has a scale of 1:50,000. A distance of 4 cm on the map represents how many km in real life?", answer: "2 km" },
      { id: 19, text: "Calculate the area of a trapezium with parallel sides of 6 cm and 10 cm and a height of 4 cm.", answer: "32 cm²" },
      { id: 20, text: "A cylinder has radius 3 cm and height 10 cm. Calculate its volume. (Use π ≈ 3.14)", answer: "282.6 cm³" },
    ],
  },
];

// ─── English templates ────────────────────────────────────────────────────────

const ENGLISH_YEAR_6: EnglishTemplate[] = [
  {
    promptType: "Creative storytelling",
    title: "The Door at the End of the Garden",
    prompt: "At the bottom of your garden, hidden behind overgrown ivy, you discover a small wooden door you have never noticed before. When you push it open, you step into a world that is completely different from your own. Describe what you see, hear, and feel as you explore this mysterious place — and what happens when you realise you are not alone.",
    hints: [
      "Use your senses — what do you see, hear, smell, and feel?",
      "Build tension by describing the door before opening it.",
      "Give your world a clear and vivid atmosphere (magical, eerie, peaceful).",
      "Include at least one unexpected discovery.",
      "End with a moment that makes the reader want to know what happens next.",
    ],
    vocabularyWords: ["iridescent", "labyrinthine", "ethereal", "luminescent", "trepidation"],
  },
  {
    promptType: "Descriptive writing",
    title: "A Market at Dawn",
    prompt: "Describe the scene as a busy market comes to life at dawn. Traders are setting up their stalls, the smell of fresh bread drifts through the air, and the first customers are beginning to arrive. Use vivid language to bring the sights, sounds, and smells of the market to life for your reader.",
    hints: [
      "Open with a strong image that sets the scene immediately.",
      "Use a variety of sentence lengths for effect.",
      "Include specific details — colours, textures, sounds.",
      "Use figurative language such as similes and metaphors.",
      "End with a detail that captures the energy of the market.",
    ],
    vocabularyWords: ["bustling", "aromatic", "cacophony", "vibrant", "pungent"],
  },
];

const ENGLISH_YEAR_7: EnglishTemplate[] = [
  {
    promptType: "Persuasive writing",
    title: "Should Schools Teach Financial Skills?",
    prompt: "Write a persuasive article for your school newspaper arguing that all secondary schools should teach students how to manage money, understand debt, and plan for the future. Use evidence, examples, and persuasive techniques to convince your readers.",
    hints: [
      "Open with a powerful statement or rhetorical question.",
      "Use the rule of three for emphasis.",
      "Include a counter-argument and then dismiss it.",
      "Use statistics or examples to support your points.",
      "End with a strong call to action.",
    ],
    vocabularyWords: ["indispensable", "fiscal", "prudent", "empowerment", "consequence"],
  },
  {
    promptType: "Descriptive writing",
    title: "The Abandoned Fairground",
    prompt: "You are standing at the entrance of an old fairground that has been closed for twenty years. Rusted rides creak in the wind, faded signs hang at angles, and weeds push through the cracked tarmac. Write a vivid description of the scene, capturing the atmosphere of a place that was once full of joy but is now forgotten.",
    hints: [
      "Use pathetic fallacy — let the weather reflect the mood.",
      "Contrast what the place is now with what it once was.",
      "Use personification to bring the decaying objects to life.",
      "Vary your sentence structure for dramatic effect.",
      "Choose precise, evocative vocabulary rather than generic words.",
    ],
    vocabularyWords: ["desolate", "dilapidated", "melancholy", "spectral", "corroded"],
  },
];

// ─── Template selector ────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getEmergencyMathsTemplate(
  yearGroup: number,
  questionCount: number
): MathsContent {
  const bank = yearGroup >= 7 ? MATHS_YEAR_7 : MATHS_YEAR_6;
  const template = pickRandom(bank);

  // Trim or pad to requested count
  const questions = template.questions.slice(0, questionCount);

  return {
    topic: template.topic,
    questions,
  };
}

export function getEmergencyEnglishTemplate(yearGroup: number): EnglishContent {
  const bank = yearGroup >= 7 ? ENGLISH_YEAR_7 : ENGLISH_YEAR_6;
  return pickRandom(bank);
}
