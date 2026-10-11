#!/usr/bin/env python3
"""Port the vertical timeline (a commit of /workspace/csf-timeline) into the horizontal repo, keeping the horizontal-only files.
usage: tools/port.py <commit>   (run from /workspace/csf-timeline-horizontal)"""
import subprocess, sys, os, re, json
V = '/workspace/csf-timeline'
C = sys.argv[1]
H_VERSION = json.load(open('package.json'))['version']  # the horizontal keeps its own version
H = os.getcwd()
OWN = {'frontend/HTimeline.tsx', 'frontend/hstyles.ts', 'frontend/logic/hcore.ts', 'frontend/logic/hfilter.ts', 'tests/v012.test.ts', 'harness/cdp-h012.mjs', 'harness/map-h012.mjs'}
SKIP_PREFIX = ('evidence/', 'release/')
SKIP = {'frontend/Timeline.tsx', 'harness/overlay.js', 'harness/e2e-run.sh', 'harness/cdp-real-input.mjs', 'RELEASE-NOTES.md', '.gitignore'}
files = subprocess.run(['git', '-C', V, 'ls-tree', '-r', '--name-only', C], capture_output=True, text=True, check=True).stdout.split()
def show(f): return subprocess.run(['git', '-C', V, 'show', f'{C}:{f}'], capture_output=True, check=True).stdout
REMOVED_TESTS = ['2/3: pills = table tag + title only', 'band: lens markup has the name only', 'header: identical 5 controls in one order',
    'Timeline uses the plan for the clock', 'code default key: Extension «timeline-festival-days»', 'the new row wins over every fallback',
    'fallback 1: a row Extension «timeline»', 'fallback 2 (PROD today)', '17:01 #1: header ✕ shrinks', '17:01 #4/#5: window funnel',
    'header: identical controls in one order on every table']
def tests_tx(s):
    s = s.replace("idx.indexOf('<Timeline\\n')", "idx.indexOf('<HTimeline\\n')").replace("טיימליין ימים v", "טיימליין אופקי v")
    s = s.replace('frontend/Timeline.tsx', 'frontend/HTimeline.tsx').replace("'Timeline.tsx'", "'HTimeline.tsx'").replace("from '../frontend/Timeline'", "from '../frontend/HTimeline'")
    for n in REMOVED_TESTS:
        i = s.find("test('" + n)
        if i < 0: continue
        j = s.find("\ntest(", i + 5); j = len(s) if j < 0 else j + 1
        s = s[:i] + "// (removed in the horizontal repo: vertical-only source check «" + n + "…»; horizontal equivalent in tests/h010.test.ts)\n" + s[j:]
    return s
CFG_REP = [("    Title: 'טיימליין',", "    Title: 'טיימליין אופקי',"),
 ("    Table_Heading_1: 'שעה',", "    Table_Heading_1: 'טבלה',"),
 ("    Helper_Text_4: 'סגור · לחצו לפתיחה',", "    Helper_Text_4: 'סגרתם את השורה · לחצו לפתיחה',"),
 ("    Helper_Text_5: 'ריק ביום הזה · לחצו לפתיחה',", "    Helper_Text_5: 'אין פריטים ביום הזה · לחצו לפתיחה',"),
 ("    Content_Text_12: 'להתחלה|הזז ימינה|הזז שמאלה|לסוף|סגור עמודה',", "    Content_Text_12: 'לראש|הזז למעלה|הזז למטה|לתחתית|סגור שורה',\n    Content_Text_13: 'בלינה',\n    Content_Text_14: 'טבלאות סגורות',"),
 ("    Helper_Text_7: 'גררו לשינוי הסדר · חיצים: הזזה',", "    Helper_Text_7: 'גררו למעלה/למטה לשינוי סדר השורות · חיצים: הזזה',"),
 ("    Helper_Text_8: 'גררו לשינוי רוחב · לחיצה כפולה: איפוס · חיצים: ±20px',", "    Helper_Text_8: 'גררו לשינוי גובה השורה · לחיצה כפולה: איפוס · חיצים: ±4px',"),
 ("    Toggle_Label_1: 'כווץ עמודות ריקות',", "    Toggle_Label_1: 'סגור טבלאות שקטות',"),
 ("    Table_Heading_1: 'כותרת ציר הזמן',", "    Table_Heading_1: 'כותרת עמודת שמות השורות (מעל הטבלאות)',"),
 ("    Helper_Text_4: 'טולטיפ פס עמודה סגורה',", "    Helper_Text_4: 'טולטיפ שבב של שורה שנסגרה ידנית',"),
 ("    Helper_Text_5: 'טולטיפ פס עמודה ריקה',", "    Helper_Text_5: 'טולטיפ שבב של טבלה שקטה (אין פריטים ביום)',"),
 ("    Content_Text_12: 'תפריט עמודה: להתחלה|ימינה|שמאלה|לסוף|סגור (מופרד ב-|)',", "    Content_Text_12: 'תפריט שורה ⋯: לראש|למעלה|למטה|לתחתית|סגור (מופרד ב-|)',\n    Content_Text_13: 'תווית ספירת הלינה («N בלינה»)',\n    Content_Text_14: 'כותרת שורת הטבלאות הסגורות',"),
 ("    Helper_Text_7: 'טולטיפ ידית ⠿ לגרירת עמודה',", "    Helper_Text_7: 'טולטיפ ידית ⠿ לגרירת שורה',"),
 ("    Helper_Text_8: 'טולטיפ קצה כותרת לשינוי רוחב עמודה (נשמר לכל משתמש)',", "    Helper_Text_8: 'טולטיפ הקצה התחתון של כותרת שורה לשינוי גובה (נשמר לכל משתמש)',"),
 ("    Number_3: 'רוחב פס עמודה סגורה (px)',", "    Number_3: 'לא בשימוש באופקי (שמור)',"),
 ("    Tab_Label_2: 'טולטיפ כפתור ⋯ של עמודה',", "    Tab_Label_2: 'טולטיפ כפתור ⋯ של שורה',"),
 ("    Tab_Label_2: 'אפשרויות עמודה',", "    Tab_Label_2: 'אפשרויות שורה',"),
 ("    Toggle_1: 'ברירת מחדל: כווץ עמודות ריקות לכל יום',", "    Toggle_1: 'ברירת מחדל: טבלה בלי פריטים ביום המוצג נסגרת לשורת השבבים',"),
]
def config_tx(s):
    head = open(os.path.join(H, 'tools/h-config-head.ts')).read()
    s = head + s[s.index('/** A-v7 COLORS'):]
    for a, b in CFG_REP:
        if a not in s: print('  (config: not found, skipped)', a[:60])
        s = s.replace(a, b, 1)
    return s
IDX_REP = [("import {Timeline, type ColumnDef} from './Timeline';", "import {HTimeline, type ColumnDef} from './HTimeline';"),
 ("        <Timeline\n", "        <HTimeline\n"),
 ('displayName="טיימליין ימים"', 'displayName="טיימליין אופקי"'),
 ("(שורה ישנה — לשנות ל-Extension = timeline-festival-days)", "(כינוי — מומלץ לשנות ל-Extension = timeline-horizontal-days)"),
 ("טיימליין ימים v{VERSION}", "טיימליין אופקי v{VERSION}"),
 ("\\nטיימליין ימים v${VERSION}`}", "\\nטיימליין אופקי v${VERSION}`}"),
]
def index_tx(s):
    for a, b in IDX_REP:
        if a not in s: print('  (index: not found)', a[:60])
        s = s.replace(a, b)
    # guard: read every identity cell; a winning row that is not ours → read no config row (code defaults)
    a = s.index('function KeyFromRows(')
    b = s.index('function Configured(')
    s = s[:a] + '''function KeyFromRows(p: {table: Table; paneVariant: string; cp: {[k: string]: unknown}; configTable: Table | null}) {
    const recs = useRecords(p.table);
    const ext = looseField(p.table.fields, 'Extension');
    const vf = looseField(p.table.fields, 'Variant');
    const dn = looseField(p.table.fields, 'Display_Name');
    const gh = looseField(p.table.fields, 'GitHub_URL');
    const rows = recs
        ? recs.map(r => ({id: r.id, extension: ext ? r.getCellValueAsString(ext) : '', variant: vf ? r.getCellValueAsString(vf) : '', primary: r.name, displayName: dn ? r.getCellValueAsString(dn) : '', github: gh ? r.getCellValueAsString(gh) : ''}))
        : null;
    const k = pickConfigKey(rows, p.paneVariant);
    // horizontal guard: never read (or edit) another extension's row — the vertical timeline's «timeline» row scores 45 here
    return <Configured k={k} cp={p.cp} configTable={k.blocked ? null : p.configTable} />;
}
''' + s[b:]
    s = s.replace("function Configured({k, cp, configTable}: {k: ConfigKey; cp: {[k: string]: unknown}; configTable: Table | null}) {",
                  "function Configured({k, cp, configTable}: {k: ConfigKey; cp: {[k: string]: unknown}; configTable: Table | null}) {\n    const blocked = !!k.blocked;")
    s = s.replace("            configTable={configTable ?? undefined}\n", "            configTable={blocked ? null : (configTable ?? undefined)}\n")
    return s
DENSE = "// horizontal: ?dense=1 — a busy festival afternoon (2.11, 12:00–19:00 IL): more משבצות over 4 halls + staff and invitations\n// borrowing their times (harness-only records, like the mockup's dense scene)\nif (QS.has('dense')) {\n    const tb = (n: string) => (fixture as {tables: TableJ[]}).tables.find(x => x.name === n);\n    const se = tb('Slots_Events'), stf = tb('Staffing'), inv = tb('Invitations');\n    const src = se?.records.find(r => String(r.cells.Start ?? '').startsWith('2026-11-02'));\n    const locs = [...new Map((se?.records ?? []).flatMap(r => (r.cells.Location as Array<{id: string; name: string}>) ?? []).map(l => [l.id, l])).values()].slice(0, 4);\n    const S: Array<[string, number, string, string]> = [\n        ['הקרנה: בין הגלים', 0, '10:00', '11:40'], ['שיחה עם הבמאית', 0, '11:45', '12:30'], ['הקרנה: אור אחרון', 0, '13:00', '14:50'], ['הקרנה: רחוק מהבית', 0, '15:10', '16:45'],\n        ['סדנת תסריט', 1, '09:30', '11:30'], ['פאנל: הפקה בפריפריה', 1, '12:00', '13:15'], ['הקרנת סטודנטים', 1, '13:30', '15:30'], ['מפגש קהל', 1, '15:45', '16:30'],\n        ['הקרנה: קיץ במדבר', 2, '10:30', '12:15'], ['כיתת אמן: סאונד', 2, '12:30', '14:00'], ['הקרנה: הנהר', 2, '14:15', '16:00'],\n        ['קבלת פנים לאורחים', 3, '09:00', '10:30'], ['טקס חלוקת מלגות', 3, '13:00', '14:30'], ['מסיבת סיום יום', 3, '16:00', '18:00'],\n    ];\n    const z = (hhmm: string) => {\n        const [h, m] = hhmm.split(':').map(Number);\n        return new Date(Date.UTC(2026, 10, 2, h, m)).toISOString(); // UTC; Israel is +2 on 2.11 → +2h on screen\n    };\n    if (se && src && locs.length)\n        S.forEach(([n, l, a, b], k) => {\n            if (se.records.some(r => r.id === 'recDense' + k)) return;\n            se.records.push({id: 'recDense' + k, cells: {...src.cells, Slot: n, Location: [locs[l % locs.length]], Start: z(a), End: z(b)}});\n        });\n    const P = ['מאיה כהן', 'יואב לוי', 'נועה בר', 'איתי שגיא', 'רוני דהן', 'שירה גל', 'עידו פרץ', 'טל אמיר'];\n    if (stf)\n        [0, 2, 5, 6, 9, 10, 12, 13].forEach((k, j) => {\n            if (stf.records.some(r => r.id === 'recDenseS' + j)) return;\n            stf.records.push({id: 'recDenseS' + j, cells: {Name: `${P[j]} · ${['סדרנות', 'הפקה', 'טכני במה', 'קבלת קהל'][j % 4]}`, Status: {name: 'Todo'}, Slots_Events: [{id: 'recDense' + k, name: 'recDense' + k}], Assignments: [], 'Festival Days': [{id: 'recFD20261102', name: '2026-11-02'}]}});\n        });\n    if (inv)\n        [2, 3, 10, 12].forEach((k, j) => {\n            if (inv.records.some(r => r.id === 'recDenseI' + j)) return;\n            inv.records.push({id: 'recDenseI' + j, cells: {'Invitation Name': `אורח/ת ${String(20 + j).padStart(2, '0')} · ${S[k][0].replace(/^[^:]+: /, '')}`, Status: {name: 'אישרו הגעה'}, 'Person to invite': [], Slots_Events: [{id: 'recDense' + k, name: 'recDense' + k}]}});\n        });\n}\n"
MOCK_REP = [("// v0.2.10: ?cfgkey=new", DENSE + "// v0.2.10: ?cfgkey=new"),
 ("const EXT = CK === 'new'", "// horizontal: ?cfgkey=h → a «timeline-horizontal-days» row; =hsix → + the vertical's row + 5 others (like PROD); =hv → only the vertical's «timeline» row (guard → code defaults)\nconst EXT = CK === 'h' || CK === 'hsix' ? 'timeline-horizontal-days' : CK === 'hv' ? 'timeline' : CK === 'new'"),
 ("const SIX = CK === 'varonly' || CK === 'hidext';", "const SIX = CK === 'varonly' || CK === 'hidext' || CK === 'hsix';"),
 ("                          Display_Name: 'טיימליין ימים',", "                          Display_Name: EXT === 'timeline-horizontal-days' ? 'טיימליין אופקי' : 'טיימליין ימים',"),
 ("                          GitHub_URL: 'https://github.com/csf-demo/CSF-custom-Airtable-Extensions/tree/main/timeline-festival-days',", "                          GitHub_URL: `https://github.com/csf-demo/CSF-custom-Airtable-Extensions/tree/main/${EXT === 'timeline-horizontal-days' ? 'timeline-horizontal-days' : 'timeline-festival-days'}`,"),
 ("                  ...(SIX ? OTHER_ROWS : []),", "                  ...(SIX ? OTHER_ROWS : []),\n                  ...(CK === 'hsix' ? [{id: 'recCfgVertical', cells: {Extension: 'timeline-festival-days', Variant: '', Display_Name: 'טיימליין ימים'}}] : []),"),
]
def mock_tx(s):
    for a, b in MOCK_REP:
        if a not in s: print('  (mock: not found)', a[:60])
        s = s.replace(a, b, 1)
    return s
for f in files:
    if f in OWN or f in SKIP or f.startswith(SKIP_PREFIX): continue
    if re.match(r'harness/cdp-v0\d+\.mjs$', f): continue
    data = show(f)
    if f.startswith('tests/') and f.endswith('.ts'): data = tests_tx(data.decode()).encode()
    elif f == 'frontend/config.ts': data = config_tx(data.decode()).encode()
    elif f == 'frontend/index.tsx': data = index_tx(data.decode()).encode()
    elif f == 'harness/sdk-mock.tsx': data = mock_tx(data.decode()).encode()
    elif f == 'package-lock.json':
        t = data.decode(); t = t.replace('"name": "csf-timeline",', '"name": "csf-timeline-horizontal",'); t = re.sub(r'("name": "csf-timeline-horizontal",\s*"version": )"[^"]+"', lambda m: m.group(1) + '"' + H_VERSION + '"', t); data = t.encode()
    elif f == 'package.json':
        t = data.decode(); t = re.sub(r'"name": "csf-timeline"', '"name": "csf-timeline-horizontal"', t); t = re.sub(r'"version": "[^"]+"', '"version": "' + H_VERSION + '"', t, count=1); data = t.encode()
    p = os.path.join(H, f); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'wb').write(data)
print('ported', C, len(files), 'files listed')
