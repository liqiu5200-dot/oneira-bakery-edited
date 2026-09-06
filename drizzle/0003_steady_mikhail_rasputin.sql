CREATE TABLE `oneira_app_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(80) NOT NULL,
	`settingValue` varchar(120) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oneira_app_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `oneira_app_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
ALTER TABLE `oneira_stores` ADD `loginPin` varchar(12) DEFAULT '1688' NOT NULL;