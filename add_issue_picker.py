from pathlib import Path

p = Path('/home/ubuntu/oneira-bakery-edited/client/src/pages/Home.tsx')
s = p.read_text()
component = r'''
function IssuePicker({ issues, onSelect, onClose }: { issues: any[]; onSelect: (issue: any) => void; onClose: () => void }) {
  const pending = issues.filter((item: any) => item.issueStatus !== "已解决");
  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button onClick={onClose} className="absolute inset-0 bg-[#3f281f]/40 backdrop-blur-sm" /><div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-[#f8f0e5] p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#bd8462]">ISSUE QUEUE</div><div className="text-lg font-extrabold text-[#58372c]">选择要处理的问题</div><div className="mt-1 text-xs text-[#9b8172]">共 {pending.length} 条待跟进问题，点击任意一条展开处理</div></div><button onClick={onClose} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#987d6e]">关闭</button></div><div className="space-y-2">{pending.map((item: any) => <button key={item.id} onClick={() => onSelect(item)} className="flex w-full items-center gap-3 rounded-2xl border border-[#f0e3d7] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffe9e3] text-[#c65044]"><MessageCircleWarning size={17} /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-sm font-extrabold text-[#58372c]">{item.storeName}</span><Badge tone={item.issueStatus === "处理中" ? "orange" : "red"}>{item.issueStatus}</Badge></div><div className="mt-1 line-clamp-2 text-xs leading-5 text-[#71574b]">{item.issue}</div><div className="mt-1 text-[10px] text-[#a18778]">{item.reportDate} · {item.reporter}</div></div><ChevronRight size={16} className="shrink-0 text-[#c1a697]" /></button>)}{pending.length === 0 && <div className="rounded-2xl bg-[#f0faf2] p-8 text-center text-sm text-[#4e805d]">当前没有待处理问题</div>}</div></div></div>;
}
'''
if 'function IssuePicker' not in s:
    s = s.replace('function FollowupSummary(', component + '\nfunction FollowupSummary(', 1)
s = s.replace('''  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);\n  const issues =''', '''  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);\n  const [issuePickerOpen, setIssuePickerOpen] = useState(false);\n  const issues =''', 1)
s = s.replace('''<button onClick={() => setSelectedIssue(issues[0] || null)} className="soft-card flex items-center''', '''<button onClick={() => setIssuePickerOpen(true)} className="soft-card flex items-center''', 1)
needle = '''</div>{selectedIssue && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">'''
replacement = '''</div>{issuePickerOpen && <IssuePicker issues={issues} onClose={() => setIssuePickerOpen(false)} onSelect={issue => { setIssuePickerOpen(false); setSelectedIssue(issue); }} />}{selectedIssue && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">'''
if needle not in s:
    raise SystemExit('followup modal insertion point not found')
s = s.replace(needle, replacement, 1)
p.write_text(s)
print('added issue picker')
