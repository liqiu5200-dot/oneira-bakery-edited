CREATE TABLE `oneira_daily_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeName` varchar(120) NOT NULL,
	`reportDate` varchar(10) NOT NULL,
	`weather` enum('晴','阴','雨','雪') NOT NULL DEFAULT '晴',
	`avgTicket` double NOT NULL DEFAULT 0,
	`revenue` double NOT NULL DEFAULT 0,
	`traffic` double NOT NULL DEFAULT 0,
	`wasteAmount` double NOT NULL DEFAULT 0,
	`wasteQty` double NOT NULL DEFAULT 0,
	`tastingQty` double NOT NULL DEFAULT 0,
	`tastingAmount` double NOT NULL DEFAULT 0,
	`storedCount` double NOT NULL DEFAULT 0,
	`storedAmount` double NOT NULL DEFAULT 0,
	`praiseCount` double NOT NULL DEFAULT 0,
	`issue` text,
	`issueStatus` enum('待处理','处理中','已解决') NOT NULL DEFAULT '待处理',
	`solver` varchar(80),
	`solution` text,
	`deadline` varchar(10),
	`todayDone` text,
	`nextPlan` text,
	`submitted` boolean NOT NULL DEFAULT true,
	`reporter` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oneira_daily_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `oneira_store_date_unique` UNIQUE(`storeName`,`reportDate`)
);
--> statement-breakpoint
CREATE TABLE `oneira_monthly_targets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeName` varchar(120) NOT NULL,
	`month` varchar(7) NOT NULL,
	`monthlyTarget` double NOT NULL DEFAULT 0,
	`week1` double NOT NULL DEFAULT 0,
	`week2` double NOT NULL DEFAULT 0,
	`week3` double NOT NULL DEFAULT 0,
	`week4` double NOT NULL DEFAULT 0,
	`week5` double NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oneira_monthly_targets_id` PRIMARY KEY(`id`),
	CONSTRAINT `oneira_target_store_month_unique` UNIQUE(`storeName`,`month`)
);
--> statement-breakpoint
CREATE TABLE `oneira_opening_nodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeName` varchar(120) NOT NULL,
	`nodeName` varchar(160) NOT NULL,
	`planDate` varchar(10) NOT NULL,
	`status` enum('未开始','进行中','已完成') NOT NULL DEFAULT '未开始',
	`owner` varchar(80) NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oneira_opening_nodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oneira_operation_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeName` varchar(120) NOT NULL,
	`period` varchar(20) NOT NULL,
	`type` enum('周报','月报') NOT NULL,
	`summary` text NOT NULL,
	`plan` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oneira_operation_summaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `oneira_summary_unique` UNIQUE(`storeName`,`period`,`type`)
);
--> statement-breakpoint
CREATE TABLE `oneira_product_ranks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeName` varchar(120) NOT NULL,
	`month` varchar(7) NOT NULL,
	`productName` varchar(160) NOT NULL,
	`sales` double NOT NULL DEFAULT 0,
	`category` enum('畅销','滞销') NOT NULL DEFAULT '畅销',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oneira_product_ranks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `oneira_stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`managerName` varchar(80) NOT NULL,
	`monthlyTargetWan` double NOT NULL DEFAULT 0,
	`status` enum('正常运营','筹备中','装修中') NOT NULL DEFAULT '正常运营',
	`openingDate` varchar(10),
	`attachmentUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `oneira_stores_id` PRIMARY KEY(`id`),
	CONSTRAINT `oneira_stores_name_unique` UNIQUE(`name`)
);
