import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getDb, ensureOneiraSeedData } from "./db";
import { appSettings, dailyReports, monthlyTargets, openingNodes, operationSummaries, productRanks, stores, storeSuggestions } from "../drizzle/schema";

const identitySchema = z.object({ role: z.enum(["manager", "admin", "store"]), storeName: z.string().optional() });
const managerGuard = (role: string) => {
  if (role !== "manager" && role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员或运营经理可以执行此操作" });
};
export const canStoreAccess = (role: string, identityStoreName: string | undefined, targetStoreName: string) => role === "manager" || role === "admin" || identityStoreName === targetStoreName;
const dbOrThrow = async () => {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "云端数据库暂不可用。请确认已登录官方 App 或网络已恢复，然后点击重试。" });
  return db;
};
const ensureManagerPin = async (db: Awaited<ReturnType<typeof dbOrThrow>>) => {
  const existing = await db.select({ settingValue: appSettings.settingValue }).from(appSettings).where(eq(appSettings.settingKey, "managerPin")).limit(1);
  if (existing[0]) return existing[0].settingValue;
  await db.insert(appSettings).values({ settingKey: "managerPin", settingValue: "1688" });
  return "1688";
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  ops: router({
    publicStores: publicProcedure.query(async () => {
      await ensureOneiraSeedData();
      const db = await dbOrThrow();
      await ensureManagerPin(db);
      return db.select({ id: stores.id, name: stores.name, managerName: stores.managerName, status: stores.status }).from(stores).orderBy(stores.name);
    }),
    verifyAccess: publicProcedure.input(z.object({ role: z.enum(["manager", "admin", "store"]), pin: z.string().min(1), storeName: z.string().optional() })).mutation(async ({ input }) => {
      const db = await dbOrThrow();
      if (input.role === "admin") return { success: input.pin === "1688", message: input.pin === "1688" ? undefined : "管理员口令不正确" };
      if (input.role === "manager") {
        const managerPin = await ensureManagerPin(db);
        return { success: input.pin === managerPin, message: input.pin === managerPin ? undefined : "运营经理口令不正确" };
      }
      if (!input.storeName) return { success: false, message: "请选择门店" };
      const store = await db.select({ loginPin: stores.loginPin }).from(stores).where(eq(stores.name, input.storeName)).limit(1);
      const success = !!store[0] && input.pin === store[0].loginPin;
      return { success, message: success ? undefined : "门店口令不正确" };
    }),
    accessSettings: publicProcedure.input(z.object({ role: z.literal("admin") })).query(async () => {
      const db = await dbOrThrow();
      const managerPin = await ensureManagerPin(db);
      const storeRows = await db.select({ id: stores.id, name: stores.name, managerName: stores.managerName, status: stores.status }).from(stores).orderBy(stores.name);
      return { managerPin, stores: storeRows };
    }),
    updateManagerPin: publicProcedure.input(z.object({ role: z.literal("admin"), pin: z.string().regex(/^\d{4,12}$/, "口令需为 4-12 位数字") })).mutation(async ({ input }) => {
      const db = await dbOrThrow();
      await ensureManagerPin(db);
      await db.update(appSettings).set({ settingValue: input.pin }).where(eq(appSettings.settingKey, "managerPin"));
      return { success: true };
    }),
    updateStorePin: publicProcedure.input(z.object({ role: z.literal("admin"), storeId: z.coerce.number().int().positive(), pin: z.string().regex(/^\d{4,12}$/, "口令需为 4-12 位数字") })).mutation(async ({ input }) => {
      const db = await dbOrThrow();
      const result = await db.update(stores).set({ loginPin: input.pin }).where(eq(stores.id, input.storeId));
      if (result[0]?.affectedRows === 0) throw new TRPCError({ code: "NOT_FOUND", message: "门店不存在或口令未更新" });
      return { success: true };
    }),

    listSuggestions: publicProcedure.input(identitySchema.extend({ identityName: z.string().optional() })).query(async ({ input }) => {
      const db = await dbOrThrow();
      const isStore = input.role === "store" && input.storeName;
      return isStore
        ? db.select().from(storeSuggestions).where(eq(storeSuggestions.storeName, input.storeName!)).orderBy(desc(storeSuggestions.createdAt))
        : db.select().from(storeSuggestions).orderBy(desc(storeSuggestions.createdAt));
    }),

    submitSuggestion: publicProcedure.input(z.object({ role: z.literal("store"), identityName: z.string().min(1), storeName: z.string().min(1), title: z.string().min(1).max(160), content: z.string().min(1) })).mutation(async ({ input }) => {
      const db = await dbOrThrow();
      const store = await db.select({ name: stores.name }).from(stores).where(eq(stores.name, input.storeName)).limit(1);
      if (!store[0]) throw new TRPCError({ code: "NOT_FOUND", message: "绑定门店不存在，请重新选择门店" });
      const inserted = await db.insert(storeSuggestions).values({ storeName: input.storeName, authorName: input.identityName, title: input.title, content: input.content, status: "待查看" });
      return { success: true, id: Number(inserted[0].insertId) };
    }),

    updateSuggestion: publicProcedure.input(z.object({ role: z.enum(["manager", "admin"]), id: z.number(), status: z.enum(["待查看", "处理中", "已采纳", "已回复"]), reply: z.string().optional() })).mutation(async ({ input }) => {
      managerGuard(input.role);
      const db = await dbOrThrow();
      await db.update(storeSuggestions).set({ status: input.status, reply: input.reply || null }).where(eq(storeSuggestions.id, input.id));
      return { success: true };
    }),

    editSuggestion: publicProcedure.input(z.object({ role: z.enum(["manager", "admin", "store"]), identityName: z.string().min(1), identityStoreName: z.string().optional(), id: z.number(), title: z.string().min(1).max(160), content: z.string().min(1) })).mutation(async ({ input }) => {
      const db = await dbOrThrow();
      const old = await db.select().from(storeSuggestions).where(eq(storeSuggestions.id, input.id)).limit(1);
      if (!old[0]) throw new TRPCError({ code: "NOT_FOUND", message: "建议不存在，可能已被其他人删除" });
      if (input.role === "store" && (old[0].authorName !== input.identityName || old[0].storeName !== input.identityStoreName)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "只能编辑自己提交的建议" });
      }
      await db.update(storeSuggestions).set({ title: input.title.trim(), content: input.content.trim() }).where(eq(storeSuggestions.id, input.id));
      return { success: true };
    }),

    deleteSuggestion: publicProcedure.input(z.object({ role: z.enum(["manager", "admin", "store"]), identityName: z.string().min(1), identityStoreName: z.string().optional(), id: z.number() })).mutation(async ({ input }) => {
      const db = await dbOrThrow();
      const old = await db.select().from(storeSuggestions).where(eq(storeSuggestions.id, input.id)).limit(1);
      if (!old[0]) return { success: true };
      if (input.role === "store" && (old[0].authorName !== input.identityName || old[0].storeName !== input.identityStoreName)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "只能删除自己提交的建议" });
      }
      await db.delete(storeSuggestions).where(eq(storeSuggestions.id, input.id));
      return { success: true };
    }),

    bootstrap: publicProcedure.input(identitySchema).query(async ({ input }) => {
      await ensureOneiraSeedData();
      const db = await dbOrThrow();
      const isStore = input.role === "store" && input.storeName;
      const visibleStores = isStore
        ? await db.select().from(stores).where(eq(stores.name, input.storeName!))
        : await db.select().from(stores).orderBy(stores.name);
      const reports = isStore
        ? await db.select().from(dailyReports).where(eq(dailyReports.storeName, input.storeName!)).orderBy(desc(dailyReports.reportDate))
        : await db.select().from(dailyReports).orderBy(desc(dailyReports.reportDate));
      const nodes = isStore
        ? await db.select().from(openingNodes).where(eq(openingNodes.storeName, input.storeName!)).orderBy(openingNodes.planDate)
        : await db.select().from(openingNodes).orderBy(openingNodes.planDate);
      const targets = isStore
        ? await db.select().from(monthlyTargets).where(eq(monthlyTargets.storeName, input.storeName!)).orderBy(desc(monthlyTargets.month))
        : await db.select().from(monthlyTargets).orderBy(desc(monthlyTargets.month));
      const products = isStore
        ? await db.select().from(productRanks).where(eq(productRanks.storeName, input.storeName!)).orderBy(desc(productRanks.sales))
        : await db.select().from(productRanks).orderBy(desc(productRanks.sales));
      const summaries = isStore
        ? await db.select().from(operationSummaries).where(eq(operationSummaries.storeName, input.storeName!)).orderBy(desc(operationSummaries.period))
        : await db.select().from(operationSummaries).orderBy(desc(operationSummaries.period));
      return { stores: visibleStores, reports, openingNodes: nodes, targets, products, summaries, syncedAt: new Date() };
    }),

    upsertReport: publicProcedure.input(z.object({
      role: z.enum(["manager", "admin", "store"]), identityName: z.string().min(1), identityStoreName: z.string().optional(), id: z.number().optional(), storeName: z.string().min(1), reportDate: z.string().min(1),
      weather: z.enum(["晴", "阴", "雨", "雪"]), avgTicket: z.number(), revenue: z.number(), traffic: z.number(), wasteAmount: z.number(), wasteQty: z.number(),
      tastingQty: z.number(), tastingAmount: z.number(), storedCount: z.number(), storedAmount: z.number(), praiseCount: z.number(), issue: z.string().optional(),
      issueStatus: z.enum(["待处理", "处理中", "已解决"]).default("待处理"), solver: z.string().optional(), solution: z.string().optional(), deadline: z.string().optional(),
      todayDone: z.string().optional(), nextPlan: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await dbOrThrow();
      if (!canStoreAccess(input.role, input.identityStoreName, input.storeName)) throw new TRPCError({ code: "FORBIDDEN", message: "店长只能查看和填报绑定门店" });
      const reporter = input.role === "manager" ? "运营经理" : input.role === "admin" ? "管理员" : input.identityName;
      const values = {
        storeName: input.storeName, reportDate: input.reportDate, weather: input.weather, avgTicket: input.avgTicket, revenue: input.revenue, traffic: input.traffic,
        wasteAmount: input.wasteAmount, wasteQty: input.wasteQty, tastingQty: input.tastingQty, tastingAmount: input.tastingAmount, storedCount: input.storedCount,
        storedAmount: input.storedAmount, praiseCount: input.praiseCount, issue: input.issue || null, issueStatus: input.issue ? input.issueStatus : "已解决" as const,
        solver: input.solver || null, solution: input.solution || null, deadline: input.deadline || null, todayDone: input.todayDone || null, nextPlan: input.nextPlan || null,
        submitted: true, reporter,
      };
      if (input.id) {
        const old = await db.select().from(dailyReports).where(eq(dailyReports.id, input.id)).limit(1);
        if (!old[0]) throw new TRPCError({ code: "NOT_FOUND", message: "日报不存在，可能已被其他人修改" });
        if (input.role === "store" && old[0].reporter !== input.identityName) throw new TRPCError({ code: "FORBIDDEN", message: "店长只能修改自己填报的日报" });
        await db.update(dailyReports).set(values).where(eq(dailyReports.id, input.id));
        return { id: input.id, mode: "updated" as const };
      }
      const existing = await db.select({ id: dailyReports.id, reporter: dailyReports.reporter }).from(dailyReports).where(and(eq(dailyReports.storeName, input.storeName), eq(dailyReports.reportDate, input.reportDate))).limit(1);
      if (existing[0]) {
        if (input.role === "store" && existing[0].reporter !== input.identityName) throw new TRPCError({ code: "CONFLICT", message: "该门店当天已有其他人提交的日报，请联系运营经理处理" });
        await db.update(dailyReports).set(values).where(eq(dailyReports.id, existing[0].id));
        return { id: existing[0].id, mode: "updated" as const };
      }
      const inserted = await db.insert(dailyReports).values(values);
      return { id: Number(inserted[0].insertId), mode: "created" as const };
    }),

    deleteReport: publicProcedure.input(z.object({ role: z.enum(["manager", "admin", "store"]), identityName: z.string(), identityStoreName: z.string().optional(), id: z.number() })).mutation(async ({ input }) => {
      const db = await dbOrThrow();
      const old = await db.select().from(dailyReports).where(eq(dailyReports.id, input.id)).limit(1);
      if (!old[0]) return { success: true };
      if (input.role === "store" && old[0].reporter !== input.identityName) throw new TRPCError({ code: "FORBIDDEN", message: "店长只能删除自己填报的日报" });
      await db.delete(dailyReports).where(eq(dailyReports.id, input.id));
      return { success: true };
    }),

    updateIssue: publicProcedure.input(z.object({ role: z.enum(["manager", "admin"]), id: z.number(), issueStatus: z.enum(["待处理", "处理中", "已解决"]), solver: z.string().optional(), solution: z.string().optional(), deadline: z.string().optional() })).mutation(async ({ input }) => {
      managerGuard(input.role);
      const db = await dbOrThrow();
      await db.update(dailyReports).set({ issueStatus: input.issueStatus, solver: input.solver || null, solution: input.solution || null, deadline: input.deadline || null }).where(eq(dailyReports.id, input.id));
      return { success: true };
    }),

    upsertStore: publicProcedure.input(z.object({ role: z.enum(["manager", "admin"]), id: z.number().optional(), originalName: z.string().optional(), name: z.string().min(1), managerName: z.string().min(1), monthlyTargetWan: z.number(), status: z.enum(["正常运营", "筹备中", "装修中"]), openingDate: z.string().optional() })).mutation(async ({ input }) => {
      managerGuard(input.role);
      const db = await dbOrThrow();
      if (input.id) {
        const oldName = input.originalName || input.name;
        await db.update(stores).set({ name: input.name, managerName: input.managerName, monthlyTargetWan: input.monthlyTargetWan, status: input.status, openingDate: input.openingDate || null }).where(eq(stores.id, input.id));
        if (oldName !== input.name) {
          await db.update(dailyReports).set({ storeName: input.name }).where(eq(dailyReports.storeName, oldName));
          await db.update(openingNodes).set({ storeName: input.name }).where(eq(openingNodes.storeName, oldName));
          await db.update(monthlyTargets).set({ storeName: input.name }).where(eq(monthlyTargets.storeName, oldName));
          await db.update(productRanks).set({ storeName: input.name }).where(eq(productRanks.storeName, oldName));
          await db.update(operationSummaries).set({ storeName: input.name }).where(eq(operationSummaries.storeName, oldName));
        }
        return { success: true, mode: "updated" as const };
      }
      await db.insert(stores).values({ name: input.name, managerName: input.managerName, monthlyTargetWan: input.monthlyTargetWan, status: input.status, openingDate: input.openingDate || null });
      return { success: true, mode: "created" as const };
    }),

    upsertNode: publicProcedure.input(z.object({ role: z.enum(["manager", "admin"]), id: z.number().optional(), storeName: z.string().min(1), nodeName: z.string().min(1), planDate: z.string().min(1), status: z.enum(["未开始", "进行中", "已完成"]), owner: z.string().min(1), completed: z.boolean() })).mutation(async ({ input }) => {
      managerGuard(input.role);
      const db = await dbOrThrow();
      const values = { storeName: input.storeName, nodeName: input.nodeName, planDate: input.planDate, status: input.status, owner: input.owner, completed: input.completed };
      if (input.id) await db.update(openingNodes).set(values).where(eq(openingNodes.id, input.id));
      else await db.insert(openingNodes).values(values);
      return { success: true };
    }),

    deleteNode: publicProcedure.input(z.object({ role: z.enum(["manager", "admin"]), id: z.number() })).mutation(async ({ input }) => {
      managerGuard(input.role);
      const db = await dbOrThrow();
      await db.delete(openingNodes).where(eq(openingNodes.id, input.id));
      return { success: true };
    }),

    upsertTarget: publicProcedure.input(z.object({ role: z.literal("manager"), storeName: z.string().min(1), month: z.string().min(7), monthlyTarget: z.number(), week1: z.number(), week2: z.number(), week3: z.number(), week4: z.number(), week5: z.number() })).mutation(async ({ input }) => {
      managerGuard(input.role);
      const db = await dbOrThrow();
      const old = await db.select({ id: monthlyTargets.id }).from(monthlyTargets).where(and(eq(monthlyTargets.storeName, input.storeName), eq(monthlyTargets.month, input.month))).limit(1);
      const values = { storeName: input.storeName, month: input.month, monthlyTarget: input.monthlyTarget, week1: input.week1, week2: input.week2, week3: input.week3, week4: input.week4, week5: input.week5 };
      if (old[0]) await db.update(monthlyTargets).set(values).where(eq(monthlyTargets.id, old[0].id));
      else await db.insert(monthlyTargets).values(values);
      return { success: true };
    }),

    upsertProduct: publicProcedure.input(z.object({ role: z.enum(["manager", "admin"]), id: z.number().optional(), storeName: z.string().min(1), month: z.string().min(7), productName: z.string().min(1), sales: z.number(), category: z.enum(["畅销", "滞销"]) })).mutation(async ({ input }) => {
      managerGuard(input.role);
      const db = await dbOrThrow();
      const values = { storeName: input.storeName, month: input.month, productName: input.productName, sales: input.sales, category: input.category };
      if (input.id) await db.update(productRanks).set(values).where(eq(productRanks.id, input.id));
      else await db.insert(productRanks).values(values);
      return { success: true };
    }),

    upsertSummary: publicProcedure.input(z.object({ role: z.enum(["manager", "admin", "store"]), identityName: z.string().min(1), identityStoreName: z.string().optional(), storeName: z.string().min(1), period: z.string().min(7), type: z.enum(["周报", "月报"]), summary: z.string(), plan: z.string() })).mutation(async ({ input }) => {
      const db = await dbOrThrow();
      if (!canStoreAccess(input.role, input.identityStoreName, input.storeName)) throw new TRPCError({ code: "FORBIDDEN", message: "店长只能为绑定门店保存总结" });
      const old = await db.select({ id: operationSummaries.id }).from(operationSummaries).where(and(eq(operationSummaries.storeName, input.storeName), eq(operationSummaries.period, input.period), eq(operationSummaries.type, input.type))).limit(1);
      const values = { storeName: input.storeName, period: input.period, type: input.type, summary: input.summary, plan: input.plan };
      if (old[0]) await db.update(operationSummaries).set(values).where(eq(operationSummaries.id, old[0].id));
      else await db.insert(operationSummaries).values(values);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
