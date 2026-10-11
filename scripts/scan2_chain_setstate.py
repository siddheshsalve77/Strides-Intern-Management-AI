#!/usr/bin/env python3
"""Scan 2: promise-chain form .then(x => setX(x)) / .then(setX) and
two-step form (await r.json() assigned then setX) without Array.isArray guard."""
import re, pathlib

ROOT = pathlib.Path('/home/z/my-project/src')
FILES = sorted(set(p for p in ROOT.rglob('*') if p.suffix in ('.tsx', '.ts')))

hits = []
for f in FILES:
    src = f.read_text()
    # Form A: .then((d) => setX(d)) or .then(d => setX(d)) — chained off json()
    for m in re.finditer(r'\.json\(\)\s*\)\s*\.then\(\s*\(?(\w+)\)?\s*=>\s*(set[A-Z]\w*)\(\s*\1\s*\)', src):
        ln = src[:m.start()].count('\n') + 1
        hits.append((str(f), ln, m.group(0)[:80]))
    # Form B: .then(setX) directly after json
    for m in re.finditer(r'\.json\(\)\s*\)\s*\.then\(\s*(set[A-Z]\w*)\s*\)', src):
        ln = src[:m.start()].count('\n') + 1
        hits.append((str(f), ln, m.group(0)[:80]))
    # Form C: two-step — const data = await resp.json(); ... setX(data)
    for m in re.finditer(r'=\s*await\s+[\w.]+\(\)\s*\n\s*(?:const|let)?\s*', src):
        pass
    for m in re.finditer(r'(?:const|let)\s+(\w+)\s*=\s*await\s+(\w+)\.json\(\)', src):
        var = m.group(1)
        window = src[m.end():m.end() + 300]
        for sm in re.finditer(r'\b(set[A-Z]\w*)\(\s*' + re.escape(var) + r'\s*\)', window):
            between = window[:sm.start()]
            if 'Array.isArray' not in between:
                ln = src[:m.end() + sm.start()].count('\n') + 1
                hits.append((str(f), ln, sm.group(0)[:80]))
            break

for f, ln, ctx in hits:
    print(f'{f}:{ln}: {ctx}')
print(f'\nTotal: {len(hits)}')
