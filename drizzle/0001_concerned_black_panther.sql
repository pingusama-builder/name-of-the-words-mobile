CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `words` (
	`id` int AUTO_INCREMENT NOT NULL,
	`word` varchar(255) NOT NULL,
	`origin_language` varchar(64) NOT NULL,
	`meaning` text,
	`context` text,
	`rating_essence` int DEFAULT 0,
	`rating_beauty` int DEFAULT 0,
	`rating_subtlety` int DEFAULT 0,
	`tags` text DEFAULT ('[]'),
	`paired_word` varchar(255),
	`paired_meaning` text,
	`date_added` varchar(32) NOT NULL,
	`created_at` varchar(64) NOT NULL,
	CONSTRAINT `words_id` PRIMARY KEY(`id`)
);
