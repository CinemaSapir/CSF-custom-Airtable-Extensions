#!/usr/bin/env python3
"""Extension_Config row for «timeline-horizontal-days» from the code defaults: config/demo-row.json (Airtable cell values by
field name) + config/populate-timeline-horizontal-days.csv (one CSV line, same columns/format as the shared DEMO CSV)."""
import json, csv, os
from datetime import datetime
from zoneinfo import ZoneInfo
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
j = json.load(open(f'{H}/config/defaults.json')); d, docs = j['d'], j['docs']
VER = json.load(open(f'{H}/package.json'))['version']
UNUSED = {s for s, doc in docs.items() if 'לא בשימוש' in str(doc)}
UNUSED |= {'Toggle_Label_4'} if 'Toggle_4' in UNUSED else set()
cells = {'Extension': 'timeline-horizontal-days', 'Variant': '', 'Display_Name': 'טיימליין אופקי', 'Block_ID': '<block-id-redacted>',
         'GitHub_URL': 'https://github.com/CinemaSapir/CSF-custom-Airtable-Extensions/tree/main/timeline-horizontal-days'}
cells.update({k: v for k, v in d.items() if k not in UNUSED})
cells['Notes'] = f'שורה אחת לטיימליין האופקי (Extension = timeline-horizontal-days, Variant ריק; בלוק <block-id-redacted>). מולא 2026-10-10 מברירות המחדל בקוד של «טיימליין אופקי» v{VER}. תא ריק = ברירת המחדל בקוד.'
IL = ZoneInfo('Asia/Jerusalem')
def api(k, v):
    if k.startswith('Date_'): return datetime.fromisoformat(v).astimezone(ZoneInfo('UTC')).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    return v
json.dump({k: api(k, v) for k, v in cells.items() if v != ''}, open(f'{H}/config/demo-row.json', 'w'), ensure_ascii=False, indent=1)
def fmt_csv(k, v):
    if isinstance(v, bool): return 'checked' if v else ''
    if k.startswith('Date_'): return f'{datetime.fromisoformat(v).astimezone(IL):%Y-%m-%d %H:%M}'
    if isinstance(v, float): return f'{v:g}'
    return str(v)
shared = '/workspace/csf-extension-config/Extension_Config-DEMO-2026-10-10.csv'
hdr = next(csv.reader(open(shared, encoding='utf-8-sig')))
assert len(hdr) == 271 and all(k in hdr for k in cells), [k for k in cells if k not in hdr]
with open(f'{H}/config/populate-timeline-horizontal-days.csv', 'w', newline='', encoding='utf-8-sig') as fh:
    w = csv.writer(fh); w.writerow(hdr); w.writerow([fmt_csv(c, cells[c]) if c in cells else '' for c in hdr])
print(len(cells), 'cells; unused skipped:', sorted(UNUSED))
