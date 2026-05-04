CREATE TABLE `idea_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(128) NOT NULL,
	`idea_primary_id_a` int NOT NULL,
	`idea_primary_id_b` int NOT NULL,
	`connection_type` varchar(64),
	`description` text,
	`strength` int DEFAULT 5,
	`created_at` varchar(64) NOT NULL,
	`updated_at` varchar(64) NOT NULL,
	CONSTRAINT `idea_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_connection` UNIQUE(`user_id`,`idea_primary_id_a`,`idea_primary_id_b`)
);
--> statement-breakpoint
CREATE TABLE `idea_instances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`idea_primary_id` int NOT NULL,
	`user_id` varchar(128) NOT NULL,
	`word_id` int,
	`context` text NOT NULL,
	`source` varchar(512),
	`location` varchar(255),
	`location_order` int,
	`meaning` text,
	`interpretation` text,
	`date_encountered` varchar(32),
	`created_at` varchar(64) NOT NULL,
	`updated_at` varchar(64) NOT NULL,
	CONSTRAINT `idea_instances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `idea_network_primaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`network_id` int NOT NULL,
	`idea_primary_id` int NOT NULL,
	`is_central` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `idea_network_primaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_network_idea` UNIQUE(`network_id`,`idea_primary_id`)
);
--> statement-breakpoint
CREATE TABLE `idea_networks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`primary_source` varchar(512),
	`created_at` varchar(64) NOT NULL,
	`updated_at` varchar(64) NOT NULL,
	CONSTRAINT `idea_networks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `idea_primaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(128) NOT NULL,
	`term` varchar(255) NOT NULL,
	`description` text,
	`origin_language` varchar(64) DEFAULT 'english',
	`created_at` varchar(64) NOT NULL,
	`updated_at` varchar(64) NOT NULL,
	`color` varchar(16),
	`primary_source` varchar(512),
	`pos_x` float,
	`pos_y` float,
	CONSTRAINT `idea_primaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_idea_connections_user_id` ON `idea_connections` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_idea_connections_idea_primary_id_a` ON `idea_connections` (`idea_primary_id_a`);--> statement-breakpoint
CREATE INDEX `idx_idea_connections_idea_primary_id_b` ON `idea_connections` (`idea_primary_id_b`);--> statement-breakpoint
CREATE INDEX `idx_idea_instances_idea_primary_id` ON `idea_instances` (`idea_primary_id`);--> statement-breakpoint
CREATE INDEX `idx_idea_instances_user_id` ON `idea_instances` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_idea_instances_word_id` ON `idea_instances` (`word_id`);--> statement-breakpoint
CREATE INDEX `idx_network_primaries_network_id` ON `idea_network_primaries` (`network_id`);--> statement-breakpoint
CREATE INDEX `idx_network_primaries_idea_primary_id` ON `idea_network_primaries` (`idea_primary_id`);--> statement-breakpoint
CREATE INDEX `idx_idea_networks_user_id` ON `idea_networks` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_idea_networks_created_at` ON `idea_networks` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_idea_primaries_user_id` ON `idea_primaries` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_idea_primaries_created_at` ON `idea_primaries` (`created_at`);