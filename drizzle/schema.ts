import {
  boolean,
  double,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const stores = mysqlTable("oneira_stores", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  managerName: varchar("managerName", { length: 80 }).notNull(),
  loginPin: varchar("loginPin", { length: 12 }).default("1688").notNull(),
  monthlyTargetWan: double("monthlyTargetWan").default(0).notNull(),
  status: mysqlEnum("status", ["正常运营", "筹备中", "装修中"]).default("正常运营").notNull(),
  openingDate: varchar("openingDate", { length: 10 }),
  attachmentUrl: text("attachmentUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const dailyReports = mysqlTable(
  "oneira_daily_reports",
  {
    id: int("id").autoincrement().primaryKey(),
    storeName: varchar("storeName", { length: 120 }).notNull(),
    reportDate: varchar("reportDate", { length: 10 }).notNull(),
    weather: mysqlEnum("weather", ["晴", "阴", "雨", "雪"]).default("晴").notNull(),
    avgTicket: double("avgTicket").default(0).notNull(),
    revenue: double("revenue").default(0).notNull(),
    traffic: double("traffic").default(0).notNull(),
    wasteAmount: double("wasteAmount").default(0).notNull(),
    wasteQty: double("wasteQty").default(0).notNull(),
    tastingQty: double("tastingQty").default(0).notNull(),
    tastingAmount: double("tastingAmount").default(0).notNull(),
    storedCount: double("storedCount").default(0).notNull(),
    storedAmount: double("storedAmount").default(0).notNull(),
    praiseCount: double("praiseCount").default(0).notNull(),
    issue: text("issue"),
    issueStatus: mysqlEnum("issueStatus", ["待处理", "处理中", "已解决"]).default("待处理").notNull(),
    solver: varchar("solver", { length: 80 }),
    solution: text("solution"),
    deadline: varchar("deadline", { length: 10 }),
    todayDone: text("todayDone"),
    nextPlan: text("nextPlan"),
    submitted: boolean("submitted").default(true).notNull(),
    reporter: varchar("reporter", { length: 80 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    storeDateUnique: uniqueIndex("oneira_store_date_unique").on(table.storeName, table.reportDate),
  }),
);

export const appSettings = mysqlTable("oneira_app_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 80 }).notNull().unique(),
  settingValue: varchar("settingValue", { length: 120 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const openingNodes = mysqlTable("oneira_opening_nodes", {
  id: int("id").autoincrement().primaryKey(),
  storeName: varchar("storeName", { length: 120 }).notNull(),
  nodeName: varchar("nodeName", { length: 160 }).notNull(),
  planDate: varchar("planDate", { length: 10 }).notNull(),
  status: mysqlEnum("status", ["未开始", "进行中", "已完成"]).default("未开始").notNull(),
  owner: varchar("owner", { length: 80 }).notNull(),
  completed: boolean("completed").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const monthlyTargets = mysqlTable(
  "oneira_monthly_targets",
  {
    id: int("id").autoincrement().primaryKey(),
    storeName: varchar("storeName", { length: 120 }).notNull(),
    month: varchar("month", { length: 7 }).notNull(),
    monthlyTarget: double("monthlyTarget").default(0).notNull(),
    week1: double("week1").default(0).notNull(),
    week2: double("week2").default(0).notNull(),
    week3: double("week3").default(0).notNull(),
    week4: double("week4").default(0).notNull(),
    week5: double("week5").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    storeMonthUnique: uniqueIndex("oneira_target_store_month_unique").on(table.storeName, table.month),
  }),
);

export const productRanks = mysqlTable("oneira_product_ranks", {
  id: int("id").autoincrement().primaryKey(),
  storeName: varchar("storeName", { length: 120 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  productName: varchar("productName", { length: 160 }).notNull(),
  sales: double("sales").default(0).notNull(),
  category: mysqlEnum("category", ["畅销", "滞销"]).default("畅销").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const operationSummaries = mysqlTable(
  "oneira_operation_summaries",
  {
    id: int("id").autoincrement().primaryKey(),
    storeName: varchar("storeName", { length: 120 }).notNull(),
    period: varchar("period", { length: 20 }).notNull(),
    type: mysqlEnum("type", ["周报", "月报"]).notNull(),
    summary: text("summary").notNull(),
    plan: text("plan").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    summaryUnique: uniqueIndex("oneira_summary_unique").on(table.storeName, table.period, table.type),
  }),
);

export const storeSuggestions = mysqlTable("oneira_store_suggestions", {
  id: int("id").autoincrement().primaryKey(),
  storeName: varchar("storeName", { length: 120 }).notNull(),
  authorName: varchar("authorName", { length: 80 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  content: text("content").notNull(),
  status: mysqlEnum("status", ["待查看", "处理中", "已采纳", "已回复"]).default("待查看").notNull(),
  reply: text("reply"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Store = typeof stores.$inferSelect;
export type DailyReport = typeof dailyReports.$inferSelect;
export type OpeningNode = typeof openingNodes.$inferSelect;
export type MonthlyTarget = typeof monthlyTargets.$inferSelect;
export type ProductRank = typeof productRanks.$inferSelect;
export type OperationSummary = typeof operationSummaries.$inferSelect;
export type StoreSuggestion = typeof storeSuggestions.$inferSelect;
