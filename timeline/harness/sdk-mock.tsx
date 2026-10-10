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

function makeTable(t: TableJ) {
    if (dropFd && t.name === 'Festival Days') t.records = t.records.filter(r => r.cells.Date !== dropFd);
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
        updateRecordAsync: async (id: string, map: {[id: string]: unknown}) => {
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
// v0.2.9: ?cfgmap=1 adds an Extension_Config table (default row with Mapping_Image + GitHub_URL, empty «timeline» Variant row →
// the mapping panel falls back to the default row). ?mf=0 → the two fields are not enabled on the element. Other runs: unchanged.
const cfgJ: TableJ[] = QS.get('cfgmap')
    ? [
          {
              id: 'tblEXTCONFIG0001',
              name: 'Extension_Config',
              fields: [
                  {id: 'fldCfgExt', name: 'Extension', type: 'singleLineText'},
                  {id: 'fldCfgVar', name: 'Variant', type: 'singleLineText'},
                  ...(QS.get('mf') === '0'
                      ? []
                      : [
                            {id: 'fldCfgMap', name: 'Mapping_Image', type: 'multipleAttachments'},
                            {id: 'fldCfgGit', name: 'GitHub_URL', type: 'url'},
                        ]),
              ] as FieldJ[],
              records: [
                  {
                      id: 'recCfgDefault',
                      cells: {
                          Extension: 'program-by-day',
                          Variant: '',
                          Mapping_Image: [{id: 'attTL1', url: 'http://127.0.0.1:8765/timeline-map.png', filename: 'timeline-v0.2.7-config-map.png', type: 'image/png', thumbnails: {large: {url: 'http://127.0.0.1:8765/timeline-map-large.png'}}}],
                          GitHub_URL: 'https://github.com/csf-demo/CSF-custom-Airtable-Extensions/tree/main/timeline',
                      },
                  },
                  {id: 'recCfgTimeline', cells: {Extension: 'program-by-day', Variant: 'timeline'}},
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
    const pf = QS.get('pf');
    if (pf) {
        const [ref, op = 'any', vals = ''] = pf.split('~');
        const [tn, fnm] = [ref.slice(0, ref.indexOf('.')), ref.slice(ref.indexOf('.') + 1)];
        const t = tables.find(x => x.name === tn);
        const f = t?.fields.find(x => x.name === fnm);
        const k = tn.replace(/[^A-Za-z0-9]/g, '_');
        if (f) Object.assign(v, {[`f_${k}_field`]: f, [`f_${k}_op`]: op, [`f_${k}_vals`]: vals});
    }
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
