from pathlib import Path
p=Path('/home/ubuntu/oneira-bakery-edited/client/src/pages/Home.tsx')
s=p.read_text()
s=s.replace('role: "store", identityName: identity.name, storeName: identity.storeName || "", id: editing?.id, reviewDate: date', 'role: "store", identityName: identity.name, identityStoreName: identity.storeName || "", storeName: identity.storeName || "", id: editing?.id, reviewDate: date')
s=s.replace('role: "store", identityName: identity.name, storeName: identity.storeName || "", id: item.id', 'role: "store", identityName: identity.name, identityStoreName: identity.storeName || "", storeName: identity.storeName || "", id: item.id')
p.write_text(s)
print('review identity parameters added')
