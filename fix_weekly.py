from pathlib import Path
p = Path('/home/ubuntu/oneira-bakery-edited/client/src/pages/Home.tsx')
s = p.read_text()
block = '''{dimension === "custom" && <div className="flex items-center gap-1.5"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-10 rounded-xl border border-[#eadbca] bg-white px-2 text-xs" /><span className="text-xs text-[#a08677]">至</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-10 rounded-xl border border-[#eadbca] bg-white px-2 text-xs" /></div>}'''
if s.count(block) != 2:
    raise SystemExit(f'expected two date blocks, found {s.count(block)}')
s = s.replace(block, '', 1)
p.write_text(s)
print('removed first accidental weekly date block')
