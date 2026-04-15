ALTER TABLE `words` MODIFY COLUMN `tags` text;--> statement-breakpoint
ALTER TABLE `words` ADD `user_id` varchar(128);