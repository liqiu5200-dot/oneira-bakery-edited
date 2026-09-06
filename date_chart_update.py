from pathlib import Path
p = Path('/home/ubuntu/oneira-bakery-edited/client/src/pages/Home.tsx')
s = p.read_text()
# Daily overview: managers/admins can choose the report date.
s = s.replace('''function DailyOverview({ data, identity }: { data: any; identity: Identity }) {\n  const [expanded, setExpanded] = useState<number | null>(null);\n  const reports = data.reports || [];\n  const stores = (data.stores || []).filter((s: any) => identity.role === "manager" || identity.role === "admin" || s.name === identity.storeName);\n  const todayReports = reports.filter((r: any) => r.reportDate === today());''', '''function DailyOverview({ data, identity }: { data: any; identity: Identity }) {\n  const [expanded, setExpanded] = useState<number | null>(null);\n  const [selectedDate, setSelectedDate] = useState(today());\n  const reports = data.reports || [];\n  const stores = (data.stores || []).filter((s: any) => identity.role === "manager" || identity.role === "admin" || s.name === identity.storeName);\n  const todayReports = reports.filter((r: any) => r.reportDate === selectedDate);''')
# Only alter the DailyOverview header badge in its segment.
start = s.index('function DailyOverview(')
end = s.index('function DailyReviewPanel', start)
seg = s[start:end]
seg = seg.replace('<Badge tone="green">已提交 {submitted.length} / {stores.length} 店</Badge>', '<div className="flex items-center gap-2"><input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} disabled={identity.role === "store"} className="h-10 rounded-xl border border-[#eadbca] bg-white px-3 text-xs text-[#654439]" /><Badge tone="green">已提交 {submitted.length} / {stores.length} 店</Badge></div>', 1)
s = s[:start] + seg + s[end:]
# Weekly: choose the week start date and use that seven-day interval.
s = s.replace('''function Weekly({ data, identity }: { data: any; identity: Identity }) {\n  const [store, setStore] = useState(identity.role === "store" ? identity.storeName || "" : "全部门店");\n  const reports = (data.reports || []).filter((r: any) => !store || store === "全部门店" || r.storeName === store).filter((r: any) => r.reportDate >= new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10));''', '''function Weekly({ data, identity }: { data: any; identity: Identity }) {\n  const [store, setStore] = useState(identity.role === "store" ? identity.storeName || "" : "全部门店");\n  const [weekStart, setWeekStart] = useState(() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); });\n  const weekEnd = new Date(`${weekStart}T00:00:00`); weekEnd.setDate(weekEnd.getDate() + 6);\n  const weekEndText = weekEnd.toISOString().slice(0, 10);\n  const reports = (data.reports || []).filter((r: any) => !store || store === "全部门店" || r.storeName === store).filter((r: any) => r.reportDate >= weekStart && r.reportDate <= weekEndText);''')
s = s.replace('''  const bars = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() - (6 - i) * 86400000); const date = d.toISOString().slice(0, 10); return { date, value: reports.filter((r: any) => r.reportDate === date).reduce((s: number, r: any) => s + n(r.revenue), 0) }; });''', '''  const bars = Array.from({ length: 7 }, (_, i) => { const d = new Date(`${weekStart}T00:00:00`); d.setDate(d.getDate() + i); const date = d.toISOString().slice(0, 10); return { date, value: reports.filter((r: any) => r.reportDate === date).reduce((s: number, r: any) => s + n(r.revenue), 0) }; });''', 1)
# Add week start selector in Weekly header only.
start = s.index('function Weekly(')
end = s.index('function ProductManager', start)
seg = s[start:end]
seg = seg.replace('<select value={store}', '<input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} disabled={identity.role === "store"} className="h-10 rounded-xl border border-[#eadbca] bg-white px-3 text-xs text-[#654439]" /><select value={store}', 1)
seg = seg.replace('<span className="text-[10px] text-[#a38a7c]">{bar.date.slice(5)}</span>', '<span className="mb-1 text-[9px] font-bold text-[#9a5a38]">{money(bar.value)}</span><span className="text-[10px] text-[#a38a7c]">{bar.date.slice(5)}</span>', 1)
seg = seg.replace('本周每日门店合计', '所选周每日门店合计', 1)
s = s[:start] + seg + s[end:]
# Monthly: choose the month.
s = s.replace('''function Monthly({ data, identity, onRefresh }: { data: any; identity: Identity; onRefresh: () => void }) {\n  const currentMonth = month();''', '''function Monthly({ data, identity, onRefresh }: { data: any; identity: Identity; onRefresh: () => void }) {\n  const [selectedMonth, setSelectedMonth] = useState(month());\n  const currentMonth = selectedMonth;''')
start = s.index('function Monthly(')
end = s.index('function Summary(', start)
seg = s[start:end]
seg = seg.replace('<Badge tone="orange">{currentMonth}</Badge>', '<div className="flex items-center gap-2"><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} disabled={identity.role === "store"} className="h-10 rounded-xl border border-[#eadbca] bg-white px-3 text-xs text-[#654439]" /><Badge tone="orange">{currentMonth}</Badge></div>', 1)
s = s[:start] + seg + s[end:]
p.write_text(s)
print('added daily, weekly, monthly selectors and visible chart amounts')
