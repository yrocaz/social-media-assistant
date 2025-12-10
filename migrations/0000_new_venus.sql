CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`pillar` text NOT NULL,
	`main_idea` text NOT NULL,
	`hook` text NOT NULL,
	`caption` text NOT NULL,
	`hashtags` text,
	`image_style` text NOT NULL,
	`image_prompt` text NOT NULL,
	`image_url` text,
	`image_key` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`batch_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `posts_batch_id_idx` ON `posts` (`batch_id`);--> statement-breakpoint
CREATE INDEX `posts_status_idx` ON `posts` (`status`);--> statement-breakpoint
CREATE INDEX `posts_created_at_idx` ON `posts` (`created_at`);