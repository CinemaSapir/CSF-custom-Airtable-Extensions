// Harness-only stand-in for @airtable/blocks/interface/ui, backed by fixture.json (DEMO-seed-shaped).
// v0.2.0: writable in memory (create / update / delete + permission checks; ?deny=<Table> denies writes there).
import {createRoot} from 'react-dom/client';
import {useSyncExternalStore, type ReactElement} from 'react';
import fixture from './fixture.json';
// v0.2.3: the REAL SDK colour utils (same module @airtable/blocks/interface/ui re-exports), so the harness renders true SDK hexes
export {default as colorUtils} from '../node_modules/@airtable/blocks/dist/esm/shared/color_utils.js';
export {default as colors} from '../node_modules/@airtable/blocks/dist/esm/shared/colors.js';

type FieldJ = {id: string; name: string; type: string};
type RecJ = {id: string; cells: {[k: string]: unknown}};
type TableJ = {id: string; name: string; fields: FieldJ[]; records: RecJ[]};

const str = (v: unknown): string =>
    v === null || v === undefined ? '' : Array.isArray(v) ? v.map(str).join(', ') : typeof v === 'object' ? String((v as {name?: unknown}).name ?? '') : String(v);
const COMPUTED = new Set(['formula', 'autoNumber', 'multipleLookupValues', 'rollup', 'count', 'createdTime', 'lastModifiedTime']);
const QS = new URLSearchParams(globalThis.location?.search ?? '');
const deny = QS.get('deny');
// v0.2.2 harness switches: ?tz=utc (dateTime fields set to GMT clock), ?noexpand (record details off), ?dropfd=YYYY-MM-DD
const tzUtc = QS.get('tz') === 'utc';
const noExpand = QS.has('noexpand');
const dropFd = QS.get('dropfd');
export const expanded: string[] = [];
(globalThis as {__expanded?: string[]}).__expanded = expanded;
const listeners = new Set<() => void>();
let version = 0;
const bump = () => {
    version++;
    listeners.forEach(l => l());
};
export const writeLog: unknown[] = [];
(globalThis as {__writes?: unknown[]}).__writes = writeLog;

// v0.2.13 crash repro: ?fdempty=1 (Festival Days without records), ?fdnodate=1 (its Date field hidden on the element),
// ?outside=1 (a slot far outside Date_1…Date_2), ?d1= / ?d2= (Date_1 / Date_2 cells on the config row; needs ?cfgmap=1)
// ?crash=screen|root → throw inside the timeline / at the root (error-boundary tests)
if (QS.get('crash')) (globalThis as {__TL_HARNESS_THROW?: string}).__TL_HARNESS_THROW = QS.get('crash') as string;
const fdEmpty = QS.has('fdempty');
const fdNoDate = QS.has('fdnodate');
const outside = QS.has('outside');
function makeTable(t: TableJ) {
    if (dropFd && t.name === 'Festival Days') t.records = t.records.filter(r => r.cells.Date !== dropFd);
    if (fdEmpty && t.name === 'Festival Days') t.records = [];
    if (fdNoDate && t.name === 'Festival Days') t.fields = t.fields.filter(f => f.name !== 'Date');
    if (outside && t.name === 'Slots_Events' && t.records.length && !t.records.some(r => r.id === 'recOutside')) {
        const src = t.records.find(r => r.cells.Start) ?? t.records[0];
        t.records.push({id: 'recOutside', cells: {...src.cells, Slot: 'מחוץ לטווח', Start: '2027-03-01T10:00:00.000Z', End: '2027-03-01T12:00:00.000Z'}});
    }
    const fields = t.fields.map(f => {
        const options = f.type === 'dateTime' && tzUtc ? {timeZone: 'utc'} : f.type === 'dateTime' ? {timeZone: 'client'} : {};
        return {...f, isComputed: COMPUTED.has(f.type), options, config: {type: f.type, options}};
    });
    const fname = (f: unknown) => {
        const k = typeof f === 'string' ? f : (f as {name: string}).name;
        return fields.find(x => x.id === k)?.name ?? k;
    };
    const wrap = (r: RecJ) => ({
        id: r.id,
        get name() {
            return str(r.cells[fields[0].name]);
        },
        getCellValue: (f: unknown) => r.cells[fname(f)] ?? null,
        getCellValueAsString: (f: unknown) => str(r.cells[fname(f)]),
    });
    const ok = {hasPermission: true};
    const no = {hasPermission: false, reasonDisplayString: `אין לך הרשאת עריכה בטבלה ${t.name} (בדיקת harness)`};
    const toCells = (map: {[id: string]: unknown}) => Object.fromEntries(Object.entries(map).map(([id, v]) => [fname(id), Array.isArray(v) ? v.map(x => ({name: (x as {id: string}).id, ...(x as object)})) : v]));
    const table = {
        id: t.id,
        name: t.name,
        fields,
        primaryField: fields[0],
        getFieldByNameIfExists: (n: string) => fields.find(f => f.name === n) ?? null,
        getFieldByIdIfExists: (id: string) => fields.find(f => f.id === id) ?? null,
        hasPermissionToExpandRecords: () => !noExpand,
        checkPermissionsForCreateRecord: () => (deny === t.name ? no : ok),
        checkPermissionsForUpdateRecord: () => (deny === t.name ? no : ok),
        checkPermissionsForDeleteRecord: () => (deny === t.name ? no : ok),
        createRecordAsync: async (map: {[id: string]: unknown}) => {
            const id = 'recNew' + Math.random().toString(36).slice(2, 10);
            t.records.push({id, cells: toCells(map)});
            writeLog.push(['create', t.name, toCells(map)]);
            cache = null;
            bump();
            return id;
        },
        updateRecordAsync: async (rid: string | {id: string}, map: {[id: string]: unknown}) => {
            const id = typeof rid === 'string' ? rid : rid.id; // v0.2.10: the SDK also takes a Record
            const r = t.records.find(x => x.id === id);
            if (r) Object.assign(r.cells, toCells(map));
            writeLog.push(['update', t.name, id, toCells(map)]);
            cache = null;
            bump();
        },
        deleteRecordAsync: async (id: string) => {
            t.records = t.records.filter(x => x.id !== id);
            writeLog.push(['delete', t.name, id]);
            cache = null;
            bump();
        },
        records: () => {
            if (!cache) cache = t.records.map(wrap);
            return cache;
        },
    };
    let cache: ReturnType<typeof wrap>[] | null = null;
    return table;
}
// v0.2.6: ?crowd=1 adds overlapping Slots_Events around 2.11 13:00–15:30 IL (a crowded band)
if (QS.has('crowd')) {
    const t = (fixture as {tables: TableJ[]}).tables.find(x => x.name === 'Slots_Events');
    const src = t?.records.find(r => String(r.cells.Start ?? '').startsWith('2026-11-02'));
    if (t && src)
        [
            ['פאנל: הקולנוע הישראלי בעידן הסטרימינג', '2026-11-02T10:00:00.000Z', '2026-11-02T12:30:00.000Z'],
            ['כיתת אמן: תאורה', '2026-11-02T10:15:00.000Z', '2026-11-02T12:00:00.000Z'],
            ['הקרנה: שבעה ימים בתל אביב', '2026-11-02T10:30:00.000Z', '2026-11-02T12:15:00.000Z'],
        ].forEach(([n, a, b], k) => {
            if (t.records.some(r => r.id === 'recCrowd' + k)) return;
            t.records.push({id: 'recCrowd' + k, cells: {...src.cells, Slot: n, Start: a, End: b}});
        });
}
// horizontal: ?dense=1 — a busy festival afternoon (2.11, 12:00–19:00 IL): more משבצות over 4 halls + staff and invitations
// borrowing their times (harness-only records, like the mockup's dense scene)
if (QS.has('dense')) {
    const tb = (n: string) => (fixture as {tables: TableJ[]}).tables.find(x => x.name === n);
    const se = tb('Slots_Events'), stf = tb('Staffing'), inv = tb('Invitations');
    const src = se?.records.find(r => String(r.cells.Start ?? '').startsWith('2026-11-02'));
    const locs = [...new Map((se?.records ?? []).flatMap(r => (r.cells.Location as Array<{id: string; name: string}>) ?? []).map(l => [l.id, l])).values()].slice(0, 4);
    const S: Array<[string, number, string, string]> = [
        ['הקרנה: בין הגלים', 0, '10:00', '11:40'], ['שיחה עם הבמאית', 0, '11:45', '12:30'], ['הקרנה: אור אחרון', 0, '13:00', '14:50'], ['הקרנה: רחוק מהבית', 0, '15:10', '16:45'],
        ['סדנת תסריט', 1, '09:30', '11:30'], ['פאנל: הפקה בפריפריה', 1, '12:00', '13:15'], ['הקרנת סטודנטים', 1, '13:30', '15:30'], ['מפגש קהל', 1, '15:45', '16:30'],
        ['הקרנה: קיץ במדבר', 2, '10:30', '12:15'], ['כיתת אמן: סאונד', 2, '12:30', '14:00'], ['הקרנה: הנהר', 2, '14:15', '16:00'],
        ['קבלת פנים לאורחים', 3, '09:00', '10:30'], ['טקס חלוקת מלגות', 3, '13:00', '14:30'], ['מסיבת סיום יום', 3, '16:00', '18:00'],
    ];
    const z = (hhmm: string) => {
        const [h, m] = hhmm.split(':').map(Number);
        return new Date(Date.UTC(2026, 10, 2, h, m)).toISOString(); // UTC; Israel is +2 on 2.11 → +2h on screen
    };
    if (se && src && locs.length)
        S.forEach(([n, l, a, b], k) => {
            if (se.records.some(r => r.id === 'recDense' + k)) return;
            se.records.push({id: 'recDense' + k, cells: {...src.cells, Slot: n, Location: [locs[l % locs.length]], Start: z(a), End: z(b)}});
        });
    const P = ['מאיה כהן', 'יואב לוי', 'נועה בר', 'איתי שגיא', 'רוני דהן', 'שירה גל', 'עידו פרץ', 'טל אמיר'];
    if (stf)
        [0, 2, 5, 6, 9, 10, 12, 13].forEach((k, j) => {
            if (stf.records.some(r => r.id === 'recDenseS' + j)) return;
            stf.records.push({id: 'recDenseS' + j, cells: {Name: `${P[j]} · ${['סדרנות', 'הפקה', 'טכני במה', 'קבלת קהל'][j % 4]}`, Status: {name: 'Todo'}, Slots_Events: [{id: 'recDense' + k, name: 'recDense' + k}], Assignments: [], 'Festival Days': [{id: 'recFD20261102', name: '2026-11-02'}]}});
        });
    if (inv)
        [2, 3, 10, 12].forEach((k, j) => {
            if (inv.records.some(r => r.id === 'recDenseI' + j)) return;
            inv.records.push({id: 'recDenseI' + j, cells: {'Invitation Name': `אורח/ת ${String(20 + j).padStart(2, '0')} · ${S[k][0].replace(/^[^:]+: /, '')}`, Status: {name: 'אישרו הגעה'}, 'Person to invite': [], Slots_Events: [{id: 'recDense' + k, name: 'recDense' + k}]}});
        });
}
// v0.2.10: ?cfgkey=new → Extension «timeline-festival-days» rows; =mid → «timeline»; default = the old program-by-day [timeline]
const CK = QS.get('cfgkey') ?? 'old';
// v0.2.11: =varonly → the only timeline row has Variant «timeline» left over; =hidext → the Extension field is hidden on the element
// (rows matched by Display_Name / GitHub_URL); both add the 5 other extensions' rows (6 rows, like PROD)
// horizontal: ?cfgkey=h → a «timeline-horizontal-days» row; =hsix → + the vertical's row + 5 others (like PROD); =hv → only the vertical's «timeline» row (guard → code defaults)
const EXT = CK === 'h' || CK === 'hsix' ? 'timeline-horizontal-days' : CK === 'hv' ? 'timeline' : CK === 'new' || CK === 'varonly' || CK === 'hidext' ? 'timeline-festival-days' : CK === 'mid' ? 'timeline' : 'program-by-day';
const SIX = CK === 'varonly' || CK === 'hidext' || CK === 'hsix';
const OTHER_ROWS = ['countdown-homescreen', 'lists-ui', 'people-roles', 'bulk-sheet', 'hospitality'].map((e, n) => ({id: `recCfgOther${n}`, cells: {Extension: e, Variant: '', Display_Name: `שורה ${e}`, GitHub_URL: `https://github.com/csf-demo/CSF-custom-Airtable-Extensions/tree/main/${e}`}}));
// v0.2.9: ?cfgmap=1 adds an Extension_Config table (default row with Mapping_Image + GitHub_URL, empty «timeline» Variant row →
// the mapping panel falls back to the default row). ?mf=0 → the two fields are not enabled on the element. Other runs: unchanged.
const cfgJ: TableJ[] = QS.get('cfgmap')
    ? [
          {
              id: 'tblEXTCONFIG0001',
              name: 'Extension_Config',
              fields: [
                  {id: 'fldCfgName', name: 'Name', type: 'singleLineText'},
                  ...(CK === 'hidext' ? [] : [{id: 'fldCfgExt', name: 'Extension', type: 'singleLineText'}]),
                  {id: 'fldCfgDisp', name: 'Display_Name', type: 'singleLineText'},
                  {id: 'fldCfgVar', name: 'Variant', type: 'singleLineText'},
                  {id: 'fldCfgTitle', name: 'Title', type: 'singleLineText'},
                  {id: 'fldCfgOL6', name: 'Option_List_6', type: 'multilineText'},
                  // horizontal v0.1.2: ?f1=<Filter_1 cell, lines «Table.Field op vals»> (needs cfgmap=1&cfgkey=h)
                  ...(QS.get('f1') ? [{id: 'fldCfgF1', name: 'Filter_1', type: 'multilineText'}] : []),
                  ...(QS.get('d1') || QS.get('d2') ? [{id: 'fldCfgD1', name: 'Date_1', type: 'dateTime'}, {id: 'fldCfgD2', name: 'Date_2', type: 'dateTime'}] : []),
                  ...(QS.get('mf') === '0'
                      ? []
                      : [
                            {id: 'fldCfgMap', name: 'Attachment_Mapping_Image', type: 'multipleAttachments'},
                            {id: 'fldCfgGit', name: 'GitHub_URL', type: 'url'},
                        ]),
              ] as FieldJ[],
              records: [
                  {
                      id: 'recCfgDefault',
                      cells: {
                          Extension: EXT,
                          Variant: CK === 'varonly' ? 'timeline' : '',
                          Display_Name: EXT === 'timeline-horizontal-days' ? 'טיימליין אופקי' : 'טיימליין ימים',
                          ...(QS.get('f1') ? {Filter_1: QS.get('f1')} : {}),
                          ...(QS.get('d1') ? {Date_1: QS.get('d1')} : {}),
                          ...(QS.get('d2') ? {Date_2: QS.get('d2')} : {}),
                          Attachment_Mapping_Image: [{id: 'attTL1', url: 'http://127.0.0.1:8765/timeline-map.png', filename: 'timeline-v0.2.7-config-map.png', type: 'image/png', thumbnails: {large: {url: 'http://127.0.0.1:8765/timeline-map-large.png'}}}],
                          GitHub_URL: `https://github.com/csf-demo/CSF-custom-Airtable-Extensions/tree/main/${EXT === 'timeline-horizontal-days' ? 'timeline-horizontal-days' : 'timeline-festival-days'}`,
                      },
                  },
                  ...(CK === 'old' ? [{id: 'recCfgTimeline', cells: {Extension: 'program-by-day', Variant: 'timeline'}}] : []),
                  ...(SIX ? OTHER_ROWS : []),
                  ...(CK === 'hsix' ? [{id: 'recCfgVertical', cells: {Extension: 'timeline-festival-days', Variant: '', Display_Name: 'טיימליין ימים'}}] : []),
              ],
          },
      ]
    : [];
const tables = [...(fixture as {tables: TableJ[]}).tables, ...cfgJ].map(makeTable);
const base = {id: 'appHarness', name: 'CSF DEMO (harness)', tables, getTableByNameIfExists: (n: string) => tables.find(t => t.name === n) ?? null};

export const useBase = () => base;
export const useRecords = (t: {records: () => unknown[]}) => {
    useSyncExternalStore(
        l => {
            listeners.add(l);
            return () => listeners.delete(l);
        },
        () => version,
    );
    return t.records();
};
// v0.2.4: ?pf=Table.Field~any|none~a|b fills the right-pane filter of that table; the real getter runs (its keys are checked)
export const useCustomProperties = (get?: (b: unknown) => Array<{key: string; type: string; table?: {name: string}}>) => {
    const v: {[k: string]: unknown} = {configVariant: 'timeline'};
    const props = get ? get(base) : [];
    (globalThis as {__TL_PROPS?: unknown}).__TL_PROPS = props.map(p => ({key: p.key, type: p.type, table: p.table?.name}));
    // v0.2.7: ?status=1 turns the shared «מצב חיבור» panel on (right-pane boolean showStatusPanel)
    if (QS.get('status')) v.showStatusPanel = true;
    if (QS.get('mapping')) v.showMappingPanel = true; // v0.2.9
    if (QS.get('edit')) v.inlineEditConfig = true; // v0.2.10
    const pf = QS.get('pf');
    if (pf) {
        const [ref, op = 'any', vals = ''] = pf.split('~');
        const [tn, fnm] = [ref.slice(0, ref.indexOf('.')), ref.slice(ref.indexOf('.') + 1)];
        const t = tables.find(x => x.name === tn);
        const f = t?.fields.find(x => x.name === fnm);
        const k = tn.replace(/[^A-Za-z0-9]/g, '_');
        if (f) Object.assign(v, {[`f_${k}_field`]: f, [`f_${k}_op`]: op, [`f_${k}_vals`]: vals});
    }
    // horizontal v0.1.2: ?pmore=Table~line1\nline2 → the right pane «שדות נוספים» of that table
    const pm = QS.get('pmore');
    if (pm) v[`f_${pm.slice(0, pm.indexOf('~')).replace(/[^A-Za-z0-9]/g, '_')}_more`] = pm.slice(pm.indexOf('~') + 1);
    return {customPropertyValueByKey: v, errorState: null};
};
// v0.2.7: status-panel v1 reads the raw right-pane value of configTable (was it really picked?)
export const useGlobalConfig = () => ({get: (_k: string): unknown => null});
export const useSession = () => ({currentUser: {id: 'usrHarness', name: 'Harness', email: 'h@example.com'}});
export const expandRecord = (r: {id: string}) => {
    expanded.push(r.id);
};
export function initializeBlock(o: {interface: () => ReactElement}) {
    createRoot(document.getElementById('root') as HTMLElement).render(o.interface());
}
