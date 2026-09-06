from pathlib import Path
root=Path('/home/ubuntu/oneira-bakery-edited')
r=root/'server/routers.ts'
s=r.read_text()
s=s.replace('upsertTarget: publicProcedure.input(z.object({ role: z.literal("manager"),', 'upsertTarget: publicProcedure.input(z.object({ role: z.enum(["manager", "admin"]),')
r.write_text(s)
h=root/'client/src/pages/Home.tsx'
s=h.read_text()
s=s.replace('identity.role === "store" ? <DailyReports data={data} identity={identity} onRefresh={refresh} /> : <DailyOverview data={data} identity={identity} />', 'identity.role === "store" || identity.role === "admin" ? <DailyReports data={data} identity={identity} onRefresh={refresh} /> : <DailyOverview data={data} identity={identity} />')
s=s.replace('const canEdit = identity.role === "manager" || report.reporter === identity.name;', 'const canEdit = identity.role === "manager" || identity.role === "admin" || report.reporter === identity.name;')
h.write_text(s)
print('admin report permissions updated')
