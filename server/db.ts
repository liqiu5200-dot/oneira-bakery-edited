import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  dailyReports,
  InsertUser,
  openingNodes,
  operationSummaries,
  productRanks,
  stores,
  monthlyTargets,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function ensureOneiraSeedData() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const currentStores = await db.select({ id: stores.id }).from(stores).limit(1);
  if (currentStores.length > 0) return;

  const seedStores = [
    { name: "西湖店", managerName: "林晓", monthlyTargetWan: 18, status: "正常运营" as const, openingDate: "2025-03-18" },
    { name: "滨江店", managerName: "周宁", monthlyTargetWan: 15, status: "正常运营" as const, openingDate: "2025-06-12" },
    { name: "钱江新城店", managerName: "陈希", monthlyTargetWan: 22, status: "正常运营" as const, openingDate: "2024-11-08" },
    { name: "城西店", managerName: "许安", monthlyTargetWan: 16, status: "装修中" as const, openingDate: "2026-10-18" },
    { name: "未来科技城店", managerName: "沈悦", monthlyTargetWan: 20, status: "筹备中" as const, openingDate: "2026-11-06" },
    { name: "拱墅店", managerName: "韩冰", monthlyTargetWan: 14, status: "筹备中" as const, openingDate: "2026-12-01" },
  ];
  await db.insert(stores).values(seedStores);

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  await db.insert(dailyReports).values([
    {
      storeName: "西湖店", reportDate: today, weather: "晴", avgTicket: 38.6, revenue: 6820.5, traffic: 176.5,
      wasteAmount: 128.4, wasteQty: 5.5, tastingQty: 28.5, tastingAmount: 316.5, storedCount: 8.5,
      storedAmount: 1260.5, praiseCount: 12.5, issue: "晚高峰冷柜补货稍慢", issueStatus: "待处理", deadline: today,
      todayDone: "完成新品试吃陈列和会员回访", nextPlan: "优化晚高峰补货动线", submitted: true, reporter: "林晓",
    },
    {
      storeName: "滨江店", reportDate: yesterday, weather: "雨", avgTicket: 42.2, revenue: 5140.75, traffic: 118.5,
      wasteAmount: 96.25, wasteQty: 3.25, tastingQty: 18.5, tastingAmount: 185.25, storedCount: 5.5,
      storedAmount: 880.75, praiseCount: 8.5, issue: "烤箱温控已报修", issueStatus: "处理中", solver: "运营经理",
      solution: "安排工程师明日上门检修", deadline: today, todayDone: "完成周末排班", nextPlan: "跟进设备维修", submitted: true, reporter: "周宁",
    },
  ]);
  await db.insert(openingNodes).values([
    { storeName: "未来科技城店", nodeName: "施工图纸确认", planDate: "2026-09-12", status: "已完成", owner: "沈悦", completed: true },
    { storeName: "未来科技城店", nodeName: "设备进场", planDate: "2026-09-24", status: "进行中", owner: "沈悦", completed: false },
    { storeName: "未来科技城店", nodeName: "试营业", planDate: "2026-11-01", status: "未开始", owner: "沈悦", completed: false },
    { storeName: "拱墅店", nodeName: "选址签约", planDate: "2026-09-28", status: "进行中", owner: "韩冰", completed: false },
  ]);
}
