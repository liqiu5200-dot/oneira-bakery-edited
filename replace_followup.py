from pathlib import Path
p=Path('/home/ubuntu/oneira-bakery-edited/client/src/pages/Home.tsx')
s=p.read_text()
start=s.index('function FollowupSummary(')
end=s.index('function Dashboard(', start)
fn=r'''function FollowupSummary({ data, identity, setTab }: { data: any; identity: Identity; setTab: (tab: Tab) => void }) {
  const issues = data.issues || [];
  const activeIssues = issues.filter((item: any) => item.status !== "已解决");
  const suggestions = trpc.ops.listSuggestions.useQuery({ role: identity.role, storeName: identity.storeName, identityName: identity.name }, { retry: false });
  return <div><SectionTitle eyebrow="FOLLOW-UP" title="问题与建议" /><div className="grid gap-3 md:grid-cols-2"><button onClick={() => setTab("issues")} className="soft-card flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffe9e3] text-[#c65044]"><AlertTriangle size={18} /></div><div className="min-w-0 flex-1"><div className="text-sm font-extrabold text-[#58372c]">问题处理</div><div className="mt-1 text-[11px] text-[#9b8172]">{activeIssues.length} 条待跟进 · 共 {issues.length} 条记录</div></div><ChevronRight size={16} className="text-[#c1a697]" /></button><button onClick={() => setTab("suggestions")} className="soft-card flex items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1df] text-[#b86a43]"><MessageCircleWarning size={18} /></div><div className="min-w-0 flex-1"><div className="text-sm font-extrabold text-[#58372c]">店长建议</div><div className="mt-1 text-[11px] text-[#9b8172]">{suggestions.data?.length || 0} 条建议 · 点击进入处理页面</div></div><ChevronRight size={16} className="text-[#c1a697]" /></button></div></div>;
}

'''
s=s[:start]+fn+s[end:]
s=s.replace('<FollowupSummary data={data} identity={identity} setTab={setTab} onRefresh={onRefresh} />','<FollowupSummary data={data} identity={identity} setTab={setTab} />')
p.write_text(s)
print('updated dashboard follow-up cards')
