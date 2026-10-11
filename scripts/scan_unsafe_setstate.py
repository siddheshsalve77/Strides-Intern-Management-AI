#!/usr/bin/env python3
"""Scan client source for setState calls fed directly from API .json() results
without an Array.isArray guard (the 't.filter is not a function' bug pattern)."""
import re, sys, pathlib

ROOT = pathlib.Path('/home/z/my-project/src')
FILES = [p for p in ROOT.rglob('*') if p.suffix in ('.tsx', '.ts') and 'api' not in str(p).split('/')[-2:]]

# patterns for json result assignment: const x = await ...json())  /  const x = await fetch(...).then(r => r.json())
JSON_ASSIGN = re.compile(
    r'(?:const|let)\s+(\w+)\s*=\s*await\s+(?:authedFetch|fetch)\([^)]*\)[^;\n]*?\.json\(\)',
    re.S)
SETCALL = re.compile(r'\b(set[A-Z]\w*)\(\s*(\w+)\s*[\),]')

hits = []
for f in sorted(set(FILES)):
    if not f.exists():
        continue
    src = f.read_text()
    # find json assignments and the window after them (up to 4 lines)
    for m in JSON_ASSIGN.finditer(src):
        var = m.group(1)
        window = src[m.end():m.end() + 600]
        for sm in SETCALL.finditer(window):
            setfn, arg = sm.group(1), sm.group(2)
            if arg != var:
                continue
            # look back from the setState to the json assignment: guard present?
            between = window[:sm.start()]
            guarded = ('Array.isArray' in between) or ('typeof' in between and 'length' in between)
            if not guarded:
                line_no = src[:m.end() + sm.start()].count('\n') + 1
                hits.append((str(f), line_no, setfn, arg))
                break  # one report per json assignment

for f, ln, fn, arg in hits:
    print(f'{f}:{ln}: {fn}({arg})  <-- unguarded')
print(f'\nTotal unguarded sites: {len(hits)}')
