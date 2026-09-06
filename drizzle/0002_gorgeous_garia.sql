CREATE TABLE `oneira_store_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeName` varchar(120) NOT NULL,
	`authorName` varchar(80) NOT NULL,
	`title` varchar(160) NOT NULL,
	`content` text NOT NULL,
	`status` enum('待查看','处理中','已采纳','已回复') NOT NULL DEFAULT '待查看',
	`reply` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oneira_store_suggestions_id` PRIMARY KEY(`id`)
);
