CREATE TYPE "public"."active" AS ENUM('yes', 'no');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'generated', 'reviewed');--> statement-breakpoint
CREATE TYPE "public"."subject" AS ENUM('maths', 'english');--> statement-breakpoint
CREATE TABLE "daily_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"studentId" integer NOT NULL,
	"taskDate" varchar(10) NOT NULL,
	"subject" "subject" NOT NULL,
	"content" json NOT NULL,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"generationModel" varchar(100),
	"generatedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"studentId" integer NOT NULL,
	"mathsFocusAreas" json NOT NULL,
	"englishWritingStyles" json NOT NULL,
	"questionCount" integer DEFAULT 15 NOT NULL,
	"additionalNotes" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"yearGroup" integer NOT NULL,
	"age" integer NOT NULL,
	"avatarColour" varchar(20) DEFAULT '#4F46E5',
	"active" "active" DEFAULT 'yes' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"studentId" integer NOT NULL,
	"subject" "subject" NOT NULL,
	"taskDate" varchar(10) NOT NULL,
	"summary" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
