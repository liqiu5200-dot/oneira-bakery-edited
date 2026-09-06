CREATE TABLE IF NOT EXISTS `oneira_store_issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeName` varchar(120) NOT NULL,
	`authorName` varchar(80) NOT NULL,
	`title` varchar(160) NOT NULL,
	`content` text NOT NULL,
	`status` enum('待处理','处理中','已解决') NOT NULL DEFAULT '待处理',
	`solver` varchar(80),
	`solution` text,
	`deadline` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oneira_store_issues_id` PRIMARY KEY(`id`)
);
