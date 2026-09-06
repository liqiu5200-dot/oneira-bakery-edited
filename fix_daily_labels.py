from pathlib import Path
p=Path('/home/ubuntu/oneira-bakery-edited/client/src/pages/Home.tsx')
s=p.read_text()
start=s.index('function DailyOverview(')
end=s.index('function DailyReviewPanel', start)
seg=s[start:end]
seg=seg.replace('今日实收', '所选日实收').replace('今日报损', '所选日报损').replace('今日客流', '所选日客流').replace('detail="今日"', 'detail={selectedDate}', 3).replace('detail="全部门店"', 'detail="所选门店"')
s=s[:start]+seg+s[end:]
p.write_text(s)
print('updated daily overview labels')
