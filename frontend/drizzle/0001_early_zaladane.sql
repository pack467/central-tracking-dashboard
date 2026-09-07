ALTER TABLE `handover_notes` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `handover_notes` ADD `create_request_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_handover_notes_create_request` ON `handover_notes` (`create_request_id`);