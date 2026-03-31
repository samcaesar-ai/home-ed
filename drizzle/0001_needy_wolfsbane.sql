CREATE TABLE `daily_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`taskDate` date NOT NULL,
	`subject` enum('maths','english') NOT NULL,
	`content` json NOT NULL,
	`status` enum('pending','generated','reviewed') NOT NULL DEFAULT 'pending',
	`generationModel` varchar(100),
	`generatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`mathsFocusAreas` json NOT NULL,
	`englishWritingStyles` json NOT NULL,
	`questionCount` int NOT NULL DEFAULT 15,
	`additionalNotes` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`yearGroup` int NOT NULL,
	`age` int NOT NULL,
	`avatarColour` varchar(20) DEFAULT '#4F46E5',
	`active` enum('yes','no') NOT NULL DEFAULT 'yes',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`subject` enum('maths','english') NOT NULL,
	`taskDate` date NOT NULL,
	`summary` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_history_id` PRIMARY KEY(`id`)
);
