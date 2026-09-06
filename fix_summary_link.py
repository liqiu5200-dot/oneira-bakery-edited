from pathlib import Path
p = Path('/home/ubuntu/oneira-bakery-edited/client/src/pages/Home.tsx')
s = p.read_text()
s = s.replace('<Summary data={data} identity={identity} />', '<Summary data={data} identity={identity} onRefresh={refresh} />')
start = s.index('function Summary(')
end = s.index('function AdminAccessConsole', start)
segment = s[start:end]
needle = 'return <div className="space-y-5">'
if needle not in segment:
    raise SystemExit('summary return not found')
segment = segment.replace(needle, 'return <div className="space-y-5">{identity.role === "store" && <DailyReviewPanel data={data} identity={identity} onRefresh={onRefresh} />}', 1)
s = s[:start] + segment + s[end:]
s = s.replace('''<div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f0e4d8]"><div className="h-full rounded-full bg-gradient-to-r from-[#e68149] to-[#f4b56a]" style={{ width: `${Math.min(100, store.progress)}%` }} />''', '''<div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f0e4d8]" title={`${store.name} 已完成 ${money(store.revenue)}，目标达成 ${percent(store.progress)}`}><div className="h-full rounded-full bg-gradient-to-r from-[#e68149] to-[#f4b56a]" style={{ width: `${Math.min(100, store.progress)}%` }} />''')
p.write_text(s)
print('linked summary refresh, daily review, and progress tooltip')
