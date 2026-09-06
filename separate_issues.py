from pathlib import Path

root = Path('/home/ubuntu/oneira-bakery-edited')

schema = root / 'drizzle/schema.ts'
s = schema.read_text()
insert = '''\nexport const storeIssues = mysqlTable("oneira_store_issues", {\n  id: int("id").autoincrement().primaryKey(),\n  storeName: varchar("storeName", { length: 120 }).notNull(),\n  authorName: varchar("authorName", { length: 80 }).notNull(),\n  title: varchar("title", { length: 160 }).notNull(),\n  content: text("content").notNull(),\n  status: mysqlEnum("status", ["待处理", "处理中", "已解决"]).default("待处理").notNull(),\n  solver: varchar("solver", { length: 80 }),\n  solution: text("solution"),\n  deadline: varchar("deadline", { length: 10 }),\n  createdAt: timestamp("createdAt").defaultNow().notNull(),\n  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),\n});\n'''
if 'export const storeIssues' not in s:
    s = s.replace('export type User = typeof users.$inferSelect;', insert + '\nexport type User = typeof users.$inferSelect;')
if 'export type StoreIssue' not in s:
    s = s.replace('export type StoreSuggestion = typeof storeSuggestions.$inferSelect;\n', 'export type StoreSuggestion = typeof storeSuggestions.$inferSelect;\nexport type StoreIssue = typeof storeIssues.$inferSelect;\n')
schema.write_text(s)

router = root / 'server/routers.ts'
s = router.read_text()
s = s.replace('productSuggestions as productSuggestionsTable, stores, storeSuggestions }', 'productSuggestions as productSuggestionsTable, stores, storeIssues, storeSuggestions }')
# Add issue listing to bootstrap result.
old = '''      const dailyReviews = isStore\n        ? await db.select().from(dailyReviewsTable).where(eq(dailyReviewsTable.storeName, input.storeName!)).orderBy(desc(dailyReviewsTable.reviewDate))\n        : [];\n      return { stores: visibleStores, reports, openingNodes: nodes, targets, products, summaries, productSuggestions, dailyReviews, syncedAt: new Date() };'''
new = '''      const dailyReviews = isStore\n        ? await db.select().from(dailyReviewsTable).where(eq(dailyReviewsTable.storeName, input.storeName!)).orderBy(desc(dailyReviewsTable.reviewDate))\n        : [];\n      const issues = isStore\n        ? await db.select().from(storeIssues).where(eq(storeIssues.storeName, input.storeName!)).orderBy(desc(storeIssues.createdAt))\n        : await db.select().from(storeIssues).orderBy(desc(storeIssues.createdAt));\n      return { stores: visibleStores, reports, openingNodes: nodes, targets, products, summaries, productSuggestions, dailyReviews, issues, syncedAt: new Date() };'''
if 'const issues = isStore' not in s:
    if old not in s:
        raise SystemExit('bootstrap insertion point missing')
    s = s.replace(old, new)
# Insert procedures before submitSuggestion.
marker = '    submitSuggestion: publicProcedure.input('
proc = '''    listIssues: publicProcedure.input(identitySchema.extend({ identityName: z.string().optional() })).query(async ({ input }) => {\n      const db = await dbOrThrow();\n      const isStore = input.role === "store" && input.storeName;\n      return isStore\n        ? db.select().from(storeIssues).where(eq(storeIssues.storeName, input.storeName!)).orderBy(desc(storeIssues.createdAt))\n        : db.select().from(storeIssues).orderBy(desc(storeIssues.createdAt));\n    }),\n\n    submitIssue: publicProcedure.input(z.object({ role: z.literal("store"), identityName: z.string().min(1), storeName: z.string().min(1), title: z.string().min(1).max(160), content: z.string().min(1) })).mutation(async ({ input }) => {\n      const db = await dbOrThrow();\n      const store = await db.select({ name: stores.name }).from(stores).where(eq(stores.name, input.storeName)).limit(1);\n      if (!store[0]) throw new TRPCError({ code: "NOT_FOUND", message: "绑定门店不存在，请重新选择门店" });\n      const inserted = await db.insert(storeIssues).values({ storeName: input.storeName, authorName: input.identityName, title: input.title, content: input.content, status: "待处理" });\n      return { success: true, id: Number(inserted[0].insertId) };\n    }),\n\n    updateStoreIssue: publicProcedure.input(z.object({ role: z.enum(["manager", "admin"]), id: z.number(), status: z.enum(["待处理", "处理中", "已解决"]), solver: z.string().optional(), solution: z.string().optional(), deadline: z.string().optional() })).mutation(async ({ input }) => {\n      managerGuard(input.role);\n      const db = await dbOrThrow();\n      await db.update(storeIssues).set({ status: input.status, solver: input.solver || null, solution: input.solution || null, deadline: input.deadline || null }).where(eq(storeIssues.id, input.id));\n      return { success: true };\n    }),\n\n    deleteIssue: publicProcedure.input(z.object({ role: z.enum(["manager", "admin", "store"]), identityName: z.string().min(1), identityStoreName: z.string().optional(), id: z.number() })).mutation(async ({ input }) => {\n      const db = await dbOrThrow();\n      const old = await db.select().from(storeIssues).where(eq(storeIssues.id, input.id)).limit(1);\n      if (!old[0]) return { success: true };\n      if (!canManageSuggestion(input.role, input.identityName, input.identityStoreName, old[0])) throw new TRPCError({ code: "FORBIDDEN", message: "只能删除自己提交的问题" });\n      await db.delete(storeIssues).where(eq(storeIssues.id, input.id));\n      return { success: true };\n    }),\n\n'''
if 'listIssues:' not in s:
    s = s.replace(marker, proc + marker)
router.write_text(s)

home = root / 'client/src/pages/Home.tsx'
s = home.read_text()
# Add an issues tab and navigation entry.
s = s.replace('type Tab = "dashboard" | "daily" | "weekly" | "monthly" | "summary" | "suggestions";', 'type Tab = "dashboard" | "daily" | "weekly" | "monthly" | "summary" | "suggestions" | "issues";')
s = s.replace('''const icons = { dashboard: LayoutDashboard, daily: ClipboardCheck, weekly: BarChart3, monthly: CalendarDays, summary: PackageSearch, suggestions: MessageCircleWarning };''', '''const icons = { dashboard: LayoutDashboard, daily: ClipboardCheck, weekly: BarChart3, monthly: CalendarDays, summary: PackageSearch, suggestions: MessageCircleWarning, issues: AlertTriangle };''')
s = s.replace('''const title = { dashboard: "驾驶舱", daily: "日汇报", weekly: "周汇报", monthly: "月汇报", summary: "汇总查询", suggestions: "店长建议" }[tab];''', '''const title = { dashboard: "驾驶舱", daily: "日汇报", weekly: "周汇报", monthly: "月汇报", summary: "汇总查询", suggestions: "店长建议", issues: "问题处理" }[tab];''')
s = s.replace('''{tab === "suggestions" && <Suggestions identity={identity} />}''', '''{tab === "suggestions" && <Suggestions identity={identity} />} {tab === "issues" && <Issues data={data} identity={identity} onRefresh={refresh} />}''')
s = s.replace('''summary: "汇总", suggestions: "建议"''', '''summary: "汇总", suggestions: "建议", issues: "问题"''')
# Remove daily issue input section but retain daily completion and next-plan notes.
start = s.find('      <div className="my-5 flex items-center gap-3 text-[11px] font-bold text-[#bf7c55]"><span className="h-px flex-1 bg-[#f0e3d7]" /> 问题与总结')
if start < 0:
    raise SystemExit('daily issue form not found')
end = s.find('<div className="mt-4 flex items-center justify-between', start)
if end < 0:
    raise SystemExit('daily form end not found')
replacement = '      <div className="my-5 flex items-center gap-3 text-[11px] font-bold text-[#bf7c55]"><span className="h-px flex-1 bg-[#f0e3d7]" /> 工作小结 <span className="h-px flex-1 bg-[#f0e3d7]" /></div><div className="grid gap-3 md:grid-cols-2"><Field label="今日完成" value={form.todayDone} onChange={v => set("todayDone", v)} placeholder="重点事项 / 发现" /><Field label="下一步计划" value={form.nextPlan} onChange={v => set("nextPlan", v)} placeholder="明日重点" /></div>\n'
s = s[:start] + replacement + s[end:]
# Make dashboard issue tile navigate to independent issue tab.
s = s.replace('''<button onClick={() => setSelectedIssue(issues[0] || null)} className="soft-card flex items-center''', '''<button onClick={() => setTab("issues")} className="soft-card flex items-center''', 1)
# Make IssueAction reusable for independent issues.
start = s.index('function IssueAction(')
end = s.index('function OpeningNodeModal', start)
issue_action = r'''function IssueAction({ issue, identity, onRefresh, source = "report" }: { issue: any; identity: Identity; onRefresh: () => void; source?: "report" | "store" }) {
  const [status, setStatus] = useState(issue.status || issue.issueStatus || "待处理");
  const [solver, setSolver] = useState(issue.solver || "");
  const [solution, setSolution] = useState(issue.solution || "");
  const updateReport = trpc.ops.updateIssue.useMutation({ onSuccess: () => { toast.success("问题已更新，处理闭环已同步"); onRefresh(); }, onError: e => toast.error(e.message) });
  const updateStore = trpc.ops.updateStoreIssue.useMutation({ onSuccess: () => { toast.success("问题已更新，处理闭环已同步"); onRefresh(); }, onError: e => toast.error(e.message) });
  const canHandle = identity.role === "manager" || identity.role === "admin";
  if (!canHandle) return issue.solution ? <div className="mt-2 rounded-xl bg-[#f0faf2] p-3 text-[11px] text-[#4e805d]">处理措施：{issue.solution}{issue.solver ? ` · 处理人：${issue.solver}` : ""}</div> : null;
  const save = () => source === "store" ? updateStore.mutate({ role: identity.role as "manager" | "admin", id: issue.id, status: status as any, solver, solution, deadline: issue.deadline || "" }) : updateReport.mutate({ role: identity.role as "manager" | "admin", id: issue.id, issueStatus: status as any, solver, solution, deadline: issue.deadline || "" });
  const pending = updateReport.isPending || updateStore.isPending;
  return <div className="mt-3 border-t border-[#f1e6dc] pt-3"><div className="mb-2 text-[11px] font-bold text-[#9a7563]">问题处理</div><div className="grid gap-2 sm:grid-cols-3"><select value={status} onChange={e => setStatus(e.target.value)} className="h-9 rounded-lg border border-[#eadbca] bg-white px-2 text-xs"><option>待处理</option><option>处理中</option><option>已解决</option></select><input value={solver} onChange={e => setSolver(e.target.value)} placeholder="处理人" className="h-9 rounded-lg border border-[#eadbca] bg-white px-2 text-xs" /><input value={solution} onChange={e => setSolution(e.target.value)} placeholder="处理措施 / 解决结果" className="h-9 rounded-lg border border-[#eadbca] bg-white px-2 text-xs" /></div><button disabled={pending} onClick={save} className="mt-2 rounded-lg bg-[#6b8dbd] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-60">{pending ? "保存中…" : status === "已解决" ? "完成闭环" : "保存处理"}</button></div>;
}

'''
s = s[:start] + issue_action + s[end:]
# Add independent Issues page before Suggestions.
issues_component = r'''
function Issues({ data, identity, onRefresh }: { data: any; identity: Identity; onRefresh: () => void }) {
  const isManager = identity.role === "manager" || identity.role === "admin";
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const issues = (data.issues || []).filter((item: any) => isManager || item.authorName === identity.name);
  const submit = trpc.ops.submitIssue.useMutation({ onSuccess: () => { toast.success("问题已提交，经理和管理员可以查看"); setTitle(""); setContent(""); onRefresh(); }, onError: e => toast.error(e.message) });
  const remove = trpc.ops.deleteIssue.useMutation({ onSuccess: () => { toast.success("问题已删除"); setSelected(null); onRefresh(); }, onError: e => toast.error(e.message) });
  return <div className="space-y-5"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#bd8462]">ISSUE CENTER</div><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#4c2d24]">问题处理</h1><p className="mt-1 text-sm text-[#977a69]">只有遇到问题时再提交，不需要每天填写。</p></div>{!isManager && <div className="soft-card p-5"><SectionTitle title="提交一个问题" /><div className="grid gap-3"><Field label="问题标题" value={title} onChange={setTitle} placeholder="例如：冷柜温度异常" required /><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#75594b]">问题描述</span><textarea value={content} onChange={e => setContent(e.target.value)} placeholder="请描述发生时间、现象和影响" className="min-h-[120px] w-full rounded-xl border border-[#eadbca] bg-white p-3 text-sm" /></label><button disabled={submit.isPending || !title.trim() || !content.trim()} onClick={() => submit.mutate({ role: "store", identityName: identity.name, storeName: identity.storeName || "", title: title.trim(), content: content.trim() })} className="h-11 rounded-xl bg-[#e47943] text-sm font-bold text-white disabled:opacity-50">{submit.isPending ? "提交中…" : "提交问题"}</button></div></div>}<div className="grid gap-3 md:grid-cols-2">{issues.map((item: any) => <button key={item.id} onClick={() => setSelected(item)} className="soft-card flex items-start gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffe9e3] text-[#c65044]"><AlertTriangle size={17} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-sm font-extrabold text-[#58372c]">{item.title}</span><Badge tone={item.status === "已解决" ? "green" : item.status === "处理中" ? "orange" : "red"}>{item.status}</Badge></div><div className="mt-1 text-[11px] text-[#a18778]">{item.storeName} · {item.authorName}</div><div className="mt-2 line-clamp-2 text-xs leading-5 text-[#71574b]">{item.content}</div></div><ChevronRight size={16} className="shrink-0 text-[#c1a697]" /></button>)}{issues.length === 0 && <div className="soft-card p-10 text-center text-sm text-[#a58d7e]">暂无问题记录</div>}</div>{selected && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button onClick={() => setSelected(null)} className="absolute inset-0 bg-[#3f281f]/40 backdrop-blur-sm" /><div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-[#f8f0e5] p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#bd8462]">ISSUE DETAIL</div><div className="text-lg font-extrabold text-[#58372c]">{selected.title}</div></div><button onClick={() => setSelected(null)} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#987d6e]">关闭</button></div><div className="soft-card p-4"><div className="text-xs leading-6 text-[#71574b] whitespace-pre-wrap">{selected.content}</div><div className="mt-2 text-[11px] text-[#a18778]">{selected.storeName} · {selected.authorName}</div>{isManager && <IssueAction issue={selected} identity={identity} source="store" onRefresh={() => { setSelected(null); onRefresh(); }} />}{!isManager && <button onClick={() => window.confirm("确认删除这条问题吗？删除后无法恢复。") && remove.mutate({ role: "store", identityName: identity.name, identityStoreName: identity.storeName, id: selected.id })} className="mt-4 rounded-xl border border-[#f0c9c1] bg-[#fff3f0] px-4 py-2 text-xs font-bold text-[#c65044]">删除问题</button>}</div></div></div>}</div>;
}
'''
if 'function Issues({ data' not in s:
    s = s.replace('function Suggestions({ identity }: { identity: Identity })', issues_component + '\nfunction Suggestions({ identity }: { identity: Identity })', 1)
home.write_text(s)
print('separated daily issue entry into independent issue center')
