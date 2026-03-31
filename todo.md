# Daily Task Generator — Samson & Apollo — TODO

## Phase 1: Database Schema
- [x] students table (id, name, yearGroup, age)
- [x] student_settings table (focusAreas, writingStyles, difficulty, questionCount)
- [x] daily_tasks table (studentId, date, subject, content JSON, status, generatedAt)
- [x] task_history table (for AI context / progression tracking)
- [x] Run Drizzle migration

## Phase 2: Backend API
- [x] students.list / students.get procedure
- [x] settings.get / settings.update procedure
- [x] tasks.getForDate procedure (by student + date + subject)
- [x] tasks.generate procedure (AI call with structured JSON output)
- [x] tasks.regenerateQuestion procedure (single question regeneration)
- [x] tasks.regeneratePrompt procedure (English prompt regeneration)
- [x] tasks.updateContent procedure (parent edits)
- [x] cron.trigger procedure (protected, triggers daily generation)
- [x] Cron job scheduled at 3:00 AM daily

## Phase 3: Kids Front-End
- [x] Landing page with Samson / Apollo name cards
- [x] Subject toggle (Maths / English)
- [x] Daily task view — Maths (numbered questions, clean textbook layout)
- [x] Daily task view — English (writing prompt with type badge)
- [x] Loading skeleton while tasks are fetched
- [x] Empty state when no tasks generated yet

## Phase 4: Parent Dashboard
- [x] Parent login gate (admin role check)
- [x] Dashboard overview — today's generation status per student
- [x] Per-student settings editor (focus areas, writing styles, difficulty)
- [x] Task review page — view full Maths/English content for any date
- [x] Regenerate single question button
- [x] Regenerate English prompt button
- [x] Inline edit for individual questions
- [x] Manual trigger "Generate Now" button

## Phase 5: PDF Generation
- [x] Install pdfkit (server-side PDF generation)
- [x] Maths A4 PDF template (numbered questions, student name, date, logo area)
- [x] English A4 PDF template (prompt, writing lines, student name, date)
- [x] Download PDF button on task view page
- [x] PDF uses British English formatting

## Phase 6: Polish & Tests
- [x] Global CSS theme (clean educational palette, Inter + Nunito fonts)
- [x] Responsive layout (mobile-friendly)
- [x] Vitest unit tests for AI generation procedures (13 tests passing)
- [x] Vitest unit tests for settings CRUD
- [x] Error handling and toast notifications
- [x] British English validation in AI prompts
