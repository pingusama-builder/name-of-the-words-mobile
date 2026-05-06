CREATE TABLE `idea_network_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(128) NOT NULL,
	`network_id_a` int NOT NULL,
	`network_id_b` int NOT NULL,
	`connection_type` varchar(64) DEFAULT 'related',
	`description` text,
	`strength` int DEFAULT 5,
	`created_at` varchar(64) NOT NULL,
	`updated_at` varchar(64) NOT NULL,
	CONSTRAINT `idea_network_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_network_connection` UNIQUE(`user_id`,`network_id_a`,`network_id_b`)
);
--> statement-breakpoint
CREATE INDEX `idx_network_connections_user_id` ON `idea_network_connections` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_network_connections_network_id_a` ON `idea_network_connections` (`network_id_a`);--> statement-breakpoint
CREATE INDEX `idx_network_connections_network_id_b` ON `idea_network_connections` (`network_id_b`);