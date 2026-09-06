from pathlib import Path
p=Path('/home/ubuntu/oneira-bakery-edited/client/src/pages/Home.tsx')
s=p.read_text().replace('grid-cols-6 px-2 py-2', 'grid-cols-7 px-2 py-2')
p.write_text(s)
print('updated nav grid')
