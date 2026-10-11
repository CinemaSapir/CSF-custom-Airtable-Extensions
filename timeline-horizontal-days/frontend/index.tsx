import {Component, createContext, useContext, useMemo, useState, type ErrorInfo, type ReactNode} from 'react';
import {colorUtils, expandRecord, initializeBlock, useBase, useCustomProperties, useGlobalConfig, useRecords, useSession} from '@airtable/blocks/interface/ui';
import type {Base, Field, Record as AirtableRecord, Table} from '@airtable/blocks/interface/models';
import pkg from '../package.json';
import {CONFIG_SLUG, CONFIG_VARIANT, TABLE_LIST, TIMELINE_DEFAULTS, TIMELINE_DOCS, pickConfigKey, type ConfigKey} from './config';
import {CONFIG_TABLE_NAME, ExtensionConfigProvider, looseName, optionLabel, useExtensionConfig, type Slot} from './useExtensionConfig';
import {HTimeline, type ColumnDef} from './HTimeline';
import {StatusPanel} from './StatusPanel';
import {MappingPanel} from './MappingPanel';
import {ConfigEditor} from './ConfigEdit';
import {EDIT_TOGGLE_KEY, MAPPING_TOGGLE_KEY, looseField, STATUS_TOGGLE_KEY, editToggleProperty, isEditOn, isMappingOn, isStatusOn, mappingToggleProperty, statusToggleProperty, type StatusFilter, type StatusSource} from './statusCore';
import type {Writer} from './EditUi';
import {mapFields, type FieldLike} from './logic/edit';
import {FILTER_SLOTS, buildDays, daysProblem, distinctVals, filterKind, israelParts, parseRes, pickRes, tzModeOf, type Day} from './logic/core';
import {H_OPS, OP_FULL, OP_HE, defaultFilterFields, hPassCol, noVals, parseFilterCell, parseHOp, splitList, type HColFilter, type HColFilters, type HFilterLine, type HOp} from './logic/hfilter';
import {fdDate} from './logic/hcore';
import {names as namesOf, readItems, type RecView, type TableInput} from './logic/read';
import {FESTIVAL_DAY_FIELDS, LOOKUP_TABLES, REMOVED_TABLES, TABLE_SPECS, type TableSpec} from './logic/tables';
/** v0.2.11: Option_List_6 rows naming a removed table (Tasks, Petty Cash, …) are dropped silently — no notice, no ✗ */
const isRemoved = (v: string) => REMOVED_TABLES.some(t => looseName(t) === looseName(v));

/** v0.2.3: every colour comes from the SDK palette at runtime (no copied hex table) */
const hexForColor = (name: string): string | null => (name ? colorUtils.getHexForColor(name) : null);

const VERSION = pkg.version;

/** exact name first, then loose (case/space/_-./nikud) */
export function findLoose<T extends {name: string}>(list: readonly T[], aliases: readonly string[]): T | null {
    for (const a of aliases) {
        const hit = list.find(x => x.name === a);
        if (hit) return hit;
    }
    for (const a of aliases) {
        const hit = list.find(x => looseName(x.name) === looseName(a));
        if (hit) return hit;
    }
    return null;
}

/** v0.2.4: right-pane filter per table. The SDK offers boolean / string / enum (single) / field / table only — no multi-select —
 * so each table gets: a field picker (select / link / text fields), an operator enum and a values string separated by |. */
const HE_LABEL: {[k: string]: string} = Object.fromEntries(TABLE_LIST.split('\n').map(r => r.split('|').map(x => x.trim())).map(([k, l]) => [k, l]));
const FILTERABLE = /^(singleSelect|multipleSelects|multipleRecordLinks|singleCollaborator|multipleCollaborators|multipleLookupValues|singleLineText|multilineText|formula|rollup)$/;
/** custom-property keys must be plain identifiers (table names have spaces) */
export const fkey = (k: string, part: 'field' | 'op' | 'vals' | 'more') => `f_${k.replace(/[^A-Za-z0-9]/g, '_')}_${part}`;
export const CpCtx = createContext<{[k: string]: unknown}>({});
function getCustomProperties(base: Base) {
    const props: Array<Record<string, unknown> & {key: string; label: string; type: 'table' | 'string' | 'enum' | 'field' | 'boolean'}> = [
        {key: 'configTable', label: 'טבלת הגדרות (Extension_Config)', type: 'table' as const, defaultValue: base.getTableByNameIfExists(CONFIG_TABLE_NAME) ?? undefined},
        {key: 'configVariant', label: 'גרסת עמוד (Variant)', type: 'string' as const, defaultValue: CONFIG_VARIANT},
        // shared «מצב חיבור» panel (status-panel v1): default OFF; ON = always shown (published view too)
        statusToggleProperty(),
        // v0.2.9: shared mapping panel — Extension_Config.Mapping_Image + GitHub_URL (default OFF)
        mappingToggleProperty(),
        // v0.2.10: «עריכה ישירה · Extension_Config» (default OFF) — inline edit of text slots / Option_List, writes ONLY the matched config row
        editToggleProperty(),
    ];
    for (const sp of TABLE_SPECS) {
        const t = findLoose(base.tables, sp.aliases);
        if (!t) continue;
        const he = HE_LABEL[sp.key] || sp.key;
        props.push(
            {key: fkey(sp.key, 'field'), label: `סינון ${he} · שדה`, type: 'field', table: t, shouldFieldBeAllowed: (f: {config: {type: string}}) => FILTERABLE.test(String(f.config.type))},
            {key: fkey(sp.key, 'op'), label: `סינון ${he} · תנאי`, type: 'enum', possibleValues: H_OPS.map(o => ({value: o, label: OP_FULL[o]})), defaultValue: 'any'},
            {key: fkey(sp.key, 'vals'), label: `סינון ${he} · ערכים (מופרדים ב-|, ריק = רק תפריט בלי סינון)`, type: 'string', defaultValue: ''},
            // v0.1.2: more filter fields for this table, one per line: «Field <op> v1|v2» (op: הוא / אינו / מכיל / ריק / לא ריק …)
            {key: fkey(sp.key, 'more'), label: `סינון ${he} · שדות נוספים (שורה לכל שדה: «שדה הוא ערך|ערך»)`, type: 'string', defaultValue: ''},
        );
    }
    return props as unknown as Parameters<typeof useCustomProperties>[0] extends (b: Base) => infer R ? R : never;
}

/** v0.2.10: the resolved Extension_Config key (Extension «timeline-festival-days»; fallbacks «timeline», program-by-day [timeline]) */
const KeyCtx = createContext<ConfigKey>({slug: CONFIG_SLUG, variant: CONFIG_VARIANT, legacy: false});
export const useConfigKey = () => useContext(KeyCtx);

// ---------------------------------------------------------------- v0.2.13: crash safety
/** error boundary: a render error shows a Hebrew message (+ details, retry) instead of a blank element */
export class CrashBoundary extends Component<{children: ReactNode; fallback: (err: Error, reset: () => void) => ReactNode}, {err: Error | null}> {
    override state: {err: Error | null} = {err: null};
    static getDerivedStateFromError(err: unknown) {
        return {err: err instanceof Error ? err : new Error(String(err))};
    }
    override componentDidCatch(err: unknown, info: ErrorInfo) {
        console.error('[טיימליין] שגיאה', err, info?.componentStack);
    }
    override render() {
        return this.state.err ? this.props.fallback(this.state.err, () => this.setState({err: null})) : this.props.children;
    }
}
/** the status panel inside its own boundary: if it fails too, it simply disappears */
function StatusSafe({children}: {children: ReactNode}) {
    return <CrashBoundary fallback={() => null}>{children}</CrashBoundary>;
}
const BOX: React.CSSProperties = {direction: 'rtl', textAlign: 'right', maxWidth: 760, margin: '24px auto', padding: '18px 22px', border: '1px solid #e3ddd2', borderRadius: 10, background: '#fff', color: '#333', font: '14px/1.6 "Segoe UI", Heebo, Rubik, Arial, sans-serif'};
export const NO_DAYS_TEXT = 'לא נמצאו ימי פסטיבל — בדקו שטבלת Festival Days ושדה Date מופעלים באלמנט';
function NoDays(p: {reason: string; first: string; last: string; source: string; notices: string[]}) {
    return (
        <div style={BOX} data-nodays="1" role="status">
            <div style={{fontSize: 18, fontWeight: 700, marginBottom: 6}}>📅 {NO_DAYS_TEXT}</div>
            <div>
                הטווח שהתקבל: <bdi dir="ltr">{p.first || '—'}</bdi> → <bdi dir="ltr">{p.last || '—'}</bdi> ({p.source})
            </div>
            <div style={{color: '#a33', marginTop: 4}} data-reason="1">
                {p.reason}
            </div>
            <div style={{color: '#666', marginTop: 8, fontSize: 13}}>תקנו את Date_1 (יום ראשון בציר) ו-Date_2 (יום אחרון) בשורת Extension_Config, או רוקנו אותם לברירת המחדל 16.10–10.11. פרטים בפאנל «מצב חיבור» למטה.</div>
            {p.notices.length ? <div style={{color: '#666', marginTop: 6, fontSize: 12.5}}>⚠ {p.notices.join(' · ')}</div> : null}
            <div style={{color: '#999', marginTop: 8, fontSize: 11.5}}>טיימליין אופקי v{VERSION}</div>
        </div>
    );
}
function CrashView({error, onRetry}: {error: Error; onRetry?: () => void}) {
    const [open, setOpen] = useState(false);
    return (
        <div style={BOX} data-crash="1" role="alert">
            <div style={{fontSize: 18, fontWeight: 700, marginBottom: 6}}>⚠ הטיימליין נתקל בשגיאה ולא הוצג</div>
            <div>אפשר לנסות שוב; אם זה חוזר, שלחו צילום של המסך הזה (עם הפרטים) והפאנל «מצב חיבור» למטה.</div>
            <div style={{display: 'flex', gap: 8, marginTop: 10}}>
                <button type="button" data-details="1" onClick={() => setOpen(o => !o)} style={{font: 'inherit', padding: '3px 12px', borderRadius: 6, border: '1px solid #d8c28f', background: '#fffaf0', cursor: 'pointer'}}>
                    {open ? 'הסתר פרטים' : 'הצג פרטים'}
                </button>
                {onRetry ? (
                    <button type="button" onClick={onRetry} style={{font: 'inherit', padding: '3px 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer'}}>
                        נסו שוב
                    </button>
                ) : null}
            </div>
            {open ? (
                <pre dir="ltr" data-stack="1" style={{textAlign: 'left', whiteSpace: 'pre-wrap', fontSize: 11.5, background: '#f7f5f0', padding: 8, borderRadius: 6, marginTop: 8, maxHeight: 260, overflow: 'auto'}}>
                    {`${error.name}: ${error.message}\n${(error.stack || '').split('\n').filter((l, i) => !(i === 0 && l.includes(error.message))).slice(0, 12).join('\n')}\nטיימליין אופקי v${VERSION}`}
                </pre>
            ) : null}
        </div>
    );
}

function Root() {
    if ((globalThis as {__TL_HARNESS_THROW?: string}).__TL_HARNESS_THROW === 'root') throw new Error('harness: forced crash at the root');
    const base = useBase();
    const {customPropertyValueByKey: cp} = useCustomProperties(getCustomProperties);
    const configTable = (cp.configTable as Table | undefined) ?? null;
    const paneVariant = typeof cp.configVariant === 'string' ? cp.configVariant : '';
    const found = configTable ?? base.getTableByNameIfExists(CONFIG_TABLE_NAME) ?? findLoose(base.tables, [CONFIG_TABLE_NAME]);
    return found ? (
        <KeyFromRows table={found} paneVariant={paneVariant} cp={cp as {[k: string]: unknown}} configTable={configTable} />
    ) : (
        <Configured k={pickConfigKey(null, paneVariant)} cp={cp as {[k: string]: unknown}} configTable={configTable} />
    );
}
/** reads only the Extension / Variant cells of the config table to pick the row key (read-only) */
function KeyFromRows(p: {table: Table; paneVariant: string; cp: {[k: string]: unknown}; configTable: Table | null}) {
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
function Configured({k, cp, configTable}: {k: ConfigKey; cp: {[k: string]: unknown}; configTable: Table | null}) {
    const blocked = !!k.blocked;
    const base = useBase();
    const variant = k.variant;
    return (
        <KeyCtx.Provider value={k}>
        <CpCtx.Provider value={cp as {[k: string]: unknown}}>
        <ExtensionConfigProvider
            base={base}
            configTable={blocked ? null : (configTable ?? undefined)}
            slug={k.slug}
            variant={variant}
            version={VERSION}
            displayName="טיימליין אופקי"
            defaults={TIMELINE_DEFAULTS}
            docs={TIMELINE_DOCS}
            door2={false}
        >
            <CrashBoundary
                fallback={(err, reset) => (
                    <>
                        <CrashView error={err} onRetry={reset} />
                        <StatusSafe>
                            <TimelineStatus force st={{variant, paneConfigTable: configTable, missingTables: [], fdTable: null, wanted: []}} loaded={[]} items={[]} tableFilters={{}} colDefaults={{}} />
                        </StatusSafe>
                    </>
                )}
            >
                <Loader variant={variant} paneConfigTable={configTable} />
            </CrashBoundary>
        </ExtensionConfigProvider>
        </CpCtx.Provider>
        </KeyCtx.Provider>
    );
}

type Loaded = {key: string; table: Table; records: readonly AirtableRecord[]};

/** loads the found tables one hook-level at a time (useRecords never gets null) */
function Chain({list, i, acc, done}: {list: Array<{key: string; table: Table}>; i: number; acc: Loaded[]; done: (l: Loaded[]) => React.ReactNode}) {
    if (i >= list.length) return <>{done(acc)}</>;
    return <ChainStep list={list} i={i} acc={acc} done={done} />;
}
function ChainStep({list, i, acc, done}: {list: Array<{key: string; table: Table}>; i: number; acc: Loaded[]; done: (l: Loaded[]) => React.ReactNode}) {
    const records = useRecords(list[i].table);
    const next = useMemo(() => [...acc, {key: list[i].key, table: list[i].table, records: records ?? []}], [acc, records, list, i]);
    return <Chain list={list} i={i + 1} acc={next} done={done} />;
}

function Loader({variant, paneConfigTable}: {variant: string; paneConfigTable: Table | null}) {
    const base = useBase();
    const cfg = useExtensionConfig();
    const tableRows = cfg.options('Option_List_6').filter(r => !isRemoved(r.value));
    const found: Array<{key: string; table: Table}> = [];
    const notices: string[] = [];
    for (const row of tableRows) {
        const sp = TABLE_SPECS.find(s => s.key === row.value) ?? TABLE_SPECS.find(s => looseName(s.key) === looseName(row.value));
        const t = findLoose(base.tables, sp ? [row.value, ...sp.aliases] : [row.value]);
        if (t && sp) found.push({key: sp.key, table: t});
        else notices.push(`חסרה טבלה ${row.value} (או שלא הופעלה באלמנט)`);
    }
    const fdTable = cfg.table('Source_Table_3') ?? findLoose(base.tables, LOOKUP_TABLES.festivalDays);
    const list = fdTable ? [...found, {key: '__days', table: fdTable}] : found;
    const st: StatusCtx = {variant, paneConfigTable, missingTables: notices.slice(), fdTable, wanted: tableRows.map(r => r.value)};
    return <Chain list={list} i={0} acc={[]} done={l => <Screen loaded={l} notices={notices} hasDays={!!fdTable} st={st} />} />;
}

/** v0.2.2: the field's own time-zone options decide how its UTC value is read (Field.options; config.options in the harness) */
const tzOf = (f: Field | null) => {
    if (!f) return 'instant' as const;
    let o: unknown = null;
    try {
        o = (f as unknown as {options?: unknown}).options ?? (f as unknown as {config?: {options?: unknown}}).config?.options ?? null;
    } catch {
        o = null;
    }
    return tzModeOf(o);
};
function recView(table: Table, rec: AirtableRecord, cache: Map<string, Field | null>): RecView {
    const fieldOf = (aliases?: string[]) => {
        if (!aliases?.length) return null;
        const key = aliases.join('|');
        if (!cache.has(key)) cache.set(key, findLoose(table.fields, aliases));
        return cache.get(key) ?? null;
    };
    let name = '';
    try {
        name = rec.name;
    } catch {
        name = '';
    }
    return {
        id: rec.id,
        name,
        has: a => !!fieldOf(a),
        tz: a => tzOf(fieldOf(a)),
        raw: a => {
            const f = fieldOf(a);
            if (!f) return undefined;
            try {
                return rec.getCellValue(f);
            } catch {
                return undefined;
            }
        },
        str: a => {
            const f = fieldOf(a);
            if (!f) return '';
            try {
                return rec.getCellValueAsString(f);
            } catch {
                return '';
            }
        },
    };
}

const REQUIRED: {[time in TableSpec['time']]: Array<keyof TableSpec>} = {own: ['start'], borrow: ['slots'], date: [], lodging: ['start'], stamp: []};

/** v0.1.2: one configured filter of a table (resolved or not) */
export type FilterSpec = {field: string; found: boolean; kind: 'select' | 'link' | 'text'; op: HOp; vals: string[]; declared: boolean; source: string};
type TableFilterInfo = {field: string; kind: 'select' | 'link' | 'text'; op: HOp; values: string[]; source: string; options: string[]};
type StatusCtx = {variant: string; paneConfigTable: Table | null; missingTables: string[]; fdTable: Table | null; wanted: string[]};
function Screen({loaded, notices: n0, hasDays, st}: {loaded: Loaded[]; notices: string[]; hasDays: boolean; st: StatusCtx}) {
    const [hiddenN, setHiddenN] = useState(0); // v0.2.11: 👁-hidden records (from the Timeline) → «מצב חיבור»
    const ckey = useConfigKey();
    const cfg = useExtensionConfig();
    const session = useSession();
    const cp = useContext(CpCtx);
    if ((globalThis as {__TL_HARNESS_THROW?: string}).__TL_HARNESS_THROW === 'screen') throw new Error('harness: forced crash inside the timeline');
    const notices = [...n0];
    if (!hasDays) notices.push('טבלת Festival Days לא מופעלת · שמות ימים כלליים');

    const isoDay = (slot: 'Date_1' | 'Date_2' | 'Date_3') => {
        const d = cfg.date(slot);
        return d ? israelParts(d.getTime()).date : null;
    };
    const first = isoDay('Date_1') ?? '2026-10-16';
    const last = isoDay('Date_2') ?? '2026-11-10';
    const day1 = isoDay('Date_3') ?? '2026-11-01';

    const daysRec = loaded.find(l => l.key === '__days');
    const {names, dayDateById} = useMemo(() => {
        const names: {[d: string]: string} = {};
        const byId: {[id: string]: string} = {};
        if (daysRec) {
            const cache = new Map<string, Field | null>();
            for (const r of daysRec.records) {
                const v = recView(daysRec.table, r, cache);
                // v0.1.3 #4: Israel calendar date (a dateTime Date field used to slice the UTC string → the day before)
                const ds = fdDate(v.raw(FESTIVAL_DAY_FIELDS.date));
                if (!ds) continue;
                byId[r.id] = ds;
                if (!names[ds]) names[ds] = v.name;
            }
        }
        return {names, dayDateById: byId};
    }, [daysRec]);
    const days: Day[] = useMemo(() => buildDays(first, last, day1, names), [first, last, day1, names]);
    const dayNamed = useMemo(() => {
        const n = days.filter(d => (names[d.date] || '').trim()).length;
        const sm = days.find(d => (names[d.date] || '').trim());
        return {named: n, total: days.length, sample: sm ? `${sm.date} → «${names[sm.date]}»` : ''};
    }, [days, names]);

    const statusRows = cfg.options('Option_List_7');
    const lodge = {in: cfg.text('Table_Heading_2') || '15:00', out: cfg.text('Table_Heading_3') || '11:00'};
    const split = (s: string) => s.split('|').map(x => x.trim()).filter(Boolean);
    const excludeTypes = split(cfg.raw('Filter_Value_7'));

    const tableData = loaded.filter(l => l.key !== '__days');
    for (const l of tableData) {
        const sp = TABLE_SPECS.find(s => s.key === l.key) as TableSpec;
        for (const k of REQUIRED[sp.time]) {
            const al = sp[k] as string[] | undefined;
            if (al && !findLoose(l.table.fields, al)) notices.push(`${l.key}: חסר שדה ${al[0]}`);
        }
        if (sp.time === 'date' && sp.date && !findLoose(l.table.fields, sp.date) && !(sp.festivalDays && findLoose(l.table.fields, sp.festivalDays)))
            notices.push(`${l.key}: חסר שדה ${sp.date[0]}`);
    }
    const input: TableInput[] = tableData.map(l => {
        const cache = new Map<string, Field | null>();
        return {key: l.key, recs: l.records.map(r => recView(l.table, r, cache))};
    });
    const res = readItems(input, {
        days,
        dayDateById,
        lodge,
        statusLabel: raw => optionLabel(statusRows, raw),
        excludeTypes,
    });

    // v0.2.13: no days (Date_1 → Date_2 empty / reversed / > 400 days) → a friendly empty state + the status panel, never a crash
    if (!days.length)
        return (
            <>
                <NoDays reason={daysProblem(first, last) ?? 'אין ימים בטווח'} first={first} last={last} source={cfg.status === 'ok' ? `Extension_Config · ${ckey.slug}${ckey.variant ? ` [${ckey.variant}]` : ''}` : 'ברירות מחדל בקוד'} notices={notices} />
                <StatusSafe>
                    <TimelineStatus force st={st} loaded={tableData} items={[]} tableFilters={{}} colDefaults={{}} />
                </StatusSafe>
            </>
        );
    // ---- v0.1.2 (item 10) per-table filter LIST: right pane (field / op / values + «more» lines) wins per table, else every
    // Extension_Config Filter_N line `Table.Field <op> v1|v2` naming the table (loose names, Hebrew/English ops); no list → status /
    // type / location-like fields as dropdowns (no default condition). Conditions = the funnel defaults (timeline AND window).
    const tableFilters: {[t: string]: TableFilterInfo} = {};
    const filterSpecs: {[t: string]: FilterSpec[]} = {};
    for (const l of tableData) {
        const sp = TABLE_SPECS.find(s => s.key === l.key);
        const names = [l.key, HE_LABEL[l.key] || '', l.table.name, ...(sp?.aliases ?? [])].filter(Boolean).map(looseName);
        const specs: FilterSpec[] = [];
        const add = (ln: HFilterLine, source: string) => {
            let f = findLoose(l.table.fields, [ln.field]);
            // a field name that itself contains an operator word («Check in») → the whole text is the field
            if (!f && ln.op !== null) {
                const whole = [ln.field, OP_HE[ln.op], ...ln.vals].join(' ');
                const g = findLoose(l.table.fields, [whole]);
                if (g) {
                    f = g;
                    ln = {...ln, field: g.name, op: null, vals: []};
                }
            }
            specs.push({field: f?.name ?? ln.field, found: !!f, kind: f ? filterKind(String(f.type)) : 'text', op: ln.op ?? 'any', vals: ln.vals, declared: ln.op === null, source});
            if (!f) notices.push(`${l.key}: שדה הסינון ${ln.field} לא נמצא (${source}) — חסר או מוסתר מהאלמנט`);
        };
        const pf = cp[fkey(l.key, 'field')] as Field | undefined;
        const more = String(cp[fkey(l.key, 'more')] ?? '').trim();
        if ((pf && typeof pf === 'object' && 'id' in pf) || more) {
            const f0 = pf && typeof pf === 'object' && 'id' in pf ? l.table.getFieldByIdIfExists(pf.id) : null;
            if (f0) {
                const op = parseHOp(cp[fkey(l.key, 'op')]);
                const vals = noVals(op) ? [] : splitList(cp[fkey(l.key, 'vals')]);
                specs.push({field: f0.name, found: true, kind: filterKind(String(f0.type)), op, vals, declared: !vals.length && !noVals(op), source: 'right pane'});
            }
            for (const ln of parseFilterCell(more, undefined, undefined, true)) if (!ln.table || names.includes(looseName(ln.table))) add(ln, 'right pane · שורות נוספות');
        } else {
            for (const n of FILTER_SLOTS) {
                const cell = cfg.raw(`Filter_${n}` as never);
                for (const ln of parseFilterCell(cell, cfg.raw(`Filter_Operator_${n}` as never), cfg.raw(`Filter_Value_${n}` as never))) {
                    if (!ln.table || !names.includes(looseName(ln.table))) continue;
                    add(ln, `Extension_Config Filter_${n}`);
                }
            }
        }
        if (!specs.length)
            for (const name of defaultFilterFields(l.table.fields.map(x => ({name: x.name, type: String(x.type)}))))
                specs.push({field: name, found: true, kind: filterKind(String(l.table.fields.find(x => x.name === name)?.type ?? '')), op: 'any', vals: [], declared: true, source: 'ברירת מחדל (סטטוס/סוג/מיקום)'});
        filterSpecs[l.key] = specs;
        // every select / link field + every resolved filter field (text too) feeds the funnel's field chooser
        const okNames = new Set(specs.filter(x => x.found).map(x => x.field));
        const ff = l.table.fields.filter(x => filterKind(String(x.type)) !== 'text' || okNames.has(x.name));
        const fx: {[id: string]: {[field: string]: string[]}} = {};
        for (const r of l.records) {
            const o: {[field: string]: string[]} = {};
            for (const x of ff) {
                let v: unknown;
                try {
                    v = r.getCellValue(x);
                } catch {
                    v = undefined;
                }
                const nv = namesOf(v);
                if (nv.length) o[x.name] = nv;
            }
            fx[r.id] = o;
        }
        for (const it of res.items) if (it.table === l.key) it.fx = fx[it.id] ?? {};
        // the window pill ▾ (multi-select, window only) uses the first resolved select/link filter field
        const prim = specs.find(x => x.found && x.kind !== 'text') ?? specs.find(x => x.found);
        if (prim) {
            tableFilters[l.key] = {field: prim.field, kind: prim.kind, op: prim.op, values: prim.vals, source: prim.source, options: []};
            for (const it of res.items) if (it.table === l.key) it.fv = it.fx?.[prim.field] ?? [];
        }
    }
    // the conditions are the DEFAULT behind each table's funnel (users can change it, saved per user; «ברירת מחדל» resets)
    const colDefaults: HColFilters = {};
    for (const t in filterSpecs) {
        const c: HColFilter = {};
        for (const x of filterSpecs[t]) if (x.found && !x.declared && (x.vals.length || noVals(x.op))) c['f:' + x.field] = {op: x.op, vals: x.vals};
        if (Object.keys(c).length) colDefaults[t] = c;
    }
    for (const t in tableFilters) tableFilters[t].options = tableFilters[t].kind !== 'text' ? distinctVals(res.items.filter(i => i.table === t).map(i => i.fv)) : [];
    const filterFields = Object.fromEntries(Object.entries(filterSpecs).map(([t, l]) => [t, l.filter(x => x.found).map(x => x.field)]));

    const foundKeys = new Set(tableData.map(l => l.key));
    const columns: ColumnDef[] = cfg.options('Option_List_6').filter(r => !isRemoved(r.value)).map(r => {
        const sp = TABLE_SPECS.find(s => looseName(s.key) === looseName(r.value));
        return {key: sp?.key ?? r.value, label: r.label || r.value, color: r.color, available: !!sp && foundKeys.has(sp.key)};
    });
    const steps = parseRes(cfg.options('Option_List_3'));
    const tbl = (k: string) => tableData.find(l => l.key === k)?.table;
    const fl = (t: Table): FieldLike[] => t.fields.map(f => ({id: f.id, name: f.name, type: String(f.type), isComputed: f.isComputed, tz: tzOf(f)}));
    const perm = (r: {hasPermission: boolean; reasonDisplayString?: string}) => (r.hasPermission ? ({ok: true} as const) : ({ok: false, reason: r.reasonDisplayString || 'אין הרשאה'} as const));
    const toMap = (key: string, fields: {[k: string]: unknown}) => {
        const t = tbl(key);
        if (!t) return {error: `הטבלה ${key} לא מופעלת באלמנט`};
        return mapFields(key, fl(t), t.primaryField.id, fields);
    };
    const writer: Writer = {
        check: (op, key, id, fields) => {
            const t = tbl(key);
            if (!t) return {ok: false, reason: `הטבלה ${key} לא מופעלת באלמנט`};
            const m = toMap(key, fields);
            if ('error' in m) return {ok: false, reason: m.error};
            const map = Object.keys(m.map).length ? m.map : undefined;
            try {
                return op === 'create' ? perm(t.checkPermissionsForCreateRecord(map)) : perm(t.checkPermissionsForUpdateRecord(id ?? undefined, map));
            } catch (e) {
                return {ok: false, reason: String((e as Error)?.message ?? e)};
            }
        },
        create: async (key, fields) => {
            const t = tbl(key) as Table;
            const m = toMap(key, fields);
            if ('error' in m) throw new Error(m.error);
            return t.createRecordAsync(m.map);
        },
        update: async (key, id, fields) => {
            const t = tbl(key) as Table;
            const m = toMap(key, fields);
            if ('error' in m) throw new Error(m.error);
            await t.updateRecordAsync(id, m.map);
        },
        checkRemove: (key, id) => {
            const t = tbl(key);
            return t ? perm(t.checkPermissionsForDeleteRecord(id)) : {ok: false, reason: 'הטבלה לא מופעלת'};
        },
        remove: async (key, id) => {
            await (tbl(key) as Table).deleteRecordAsync(id);
        },
        nameWritable: key => {
            const t = tbl(key);
            return !!t && !t.primaryField.isComputed;
        },
    };
    const dayIdByDate = Object.fromEntries(Object.entries(dayDateById).map(([id, d]) => [d, id]));
    const onOpenRecord = (key: string, id: string) => {
        const t = tbl(key);
        if (!t) return 'הטבלה לא מופעלת באלמנט';
        if (!t.hasPermissionToExpandRecords()) return 'פתיחת רשומות לא מאופשרת באלמנט הזה (הגדרות האלמנט: הצגת פרטי רשומה)';
        const rec = tableData.find(l => l.key === key)?.records.find(r => r.id === id);
        if (!rec) return 'הרשומה לא נמצאה (אולי נמחקה)';
        expandRecord(rec);
        return null;
    };
    const statusNote =
        cfg.status === 'no-table'
            ? 'הגדרות: ברירות מחדל בקוד (Extension_Config לא קיים/לא מופעל)'
            : cfg.status === 'ok'
              ? `הגדרות: Extension_Config · ${ckey.slug}${ckey.variant ? ` [${ckey.variant}]` : ''}${ckey.legacy ? ' (כינוי — מומלץ לשנות ל-Extension = timeline-horizontal-days)' : ''}`
              : `הגדרות: ${cfg.status}`;
    const num = (slot: 'Number_1' | 'Number_2' | 'Number_3' | 'Number_4', d: number) => cfg.number(slot) ?? d;
    return (
        <>
        <HTimeline
            days={days}
            items={res.items}
            columns={columns}
            hiddenJunk={res.hidden}
            notices={notices}
            texts={Object.fromEntries(Object.keys(TIMELINE_DEFAULTS).map(k => [k, cfg.raw(k as never)]))}
            res={{steps, def: pickRes(steps, cfg.raw('Dropdown_Default_3'), 720), label: cfg.raw('Dropdown_Label_3') || 'רזולוציה'}}
            toggles={{
                collapse: {label: cfg.toggleSpec(1).label, def: cfg.toggle('Toggle_1')},
                compress: {label: cfg.toggleSpec(2).label, def: cfg.toggle('Toggle_2')},
                xs: {def: cfg.toggle('Toggle_3')},
                link: {def: cfg.toggle('Toggle_4')},
            }}
            facetLabels={{hall: cfg.raw('Filter_Label_1') || 'מיקום', person: cfg.raw('Filter_Label_2') || 'אדם', film: cfg.raw('Filter_Label_3') || 'סרט', status: cfg.raw('Filter_Label_4') || 'סטטוס'}}
            quickTimes={cfg.options('Option_List_8').map(r => ({value: r.value, label: r.label}))}
            lodge={lodge}
            numbers={{bandFrac: num('Number_1', 0.2), maxCards: Math.max(2, Math.round(num('Number_2', 12))), strip: num('Number_3', 30), festLen: Math.max(1, Math.round(num('Number_4', 7)))}}
            phaseColors={{fest: cfg.raw('Color_1') || 'grayLight2', prep: cfg.raw('Color_2') || 'cyanLight2', wrap: cfg.raw('Color_3') || 'yellowLight2'}}
            colorHex={hexForColor}
            version={VERSION}
            configNote={statusNote}
            userKey={session.currentUser?.id ?? 'anon'}
            onOpenRecord={onOpenRecord}
            festivalDates={Object.values(dayDateById)}
            initial={(globalThis as {__TL_HARNESS_AT_NOW?: boolean}).__TL_HARNESS_AT_NOW ? {atNow: true} : undefined}
            writer={writer}
            dayIdByDate={dayIdByDate}
            tableFilters={Object.fromEntries(Object.entries(tableFilters).map(([t, v]) => [t, {field: v.field, options: v.options}]))}
            colDefaults={colDefaults}
            filterFields={filterFields}
            onHiddenCount={setHiddenN}
        />
        <TimelineStatus st={st} loaded={tableData} items={res.items} dayNamed={dayNamed} tableFilters={tableFilters} filterSpecs={filterSpecs} colDefaults={colDefaults} hiddenN={hiddenN} />
        </>
    );
}

/** «מצב חיבור» (shared status-panel v1): config table, row (Extension/Variant), visible fields, every table + the fields the
 *  columns read, and per-table default filters (right pane → Filter_N) with matched / total items. Read-only. */
function TimelineStatus(props: {
    st: StatusCtx;
    loaded: Loaded[];
    items: ReadonlyArray<{table: string}>;
    tableFilters: {[t: string]: {field: string; op: string; values: string[]; source: string}};
    filterSpecs?: {[t: string]: FilterSpec[]};
    colDefaults: HColFilters;
    /** v0.2.11: records the user hid with 👁 */
    hiddenN?: number;
    /** v0.1.3: programme days that got their title from a Festival Days record (the rest show the plain date) */
    dayNamed?: {named: number; total: number; sample: string};
    /** v0.2.13: shown regardless of the right-pane toggle (empty state / crash screen) */
    force?: boolean;
}) {
    const ckey = useConfigKey();
    const {st, loaded, items, tableFilters, colDefaults} = props;
    const base = useBase();
    const cfg = useExtensionConfig();
    const cp = useContext(CpCtx);
    const globalConfig = useGlobalConfig();
    const statusOn = !!props.force || isStatusOn(cp[STATUS_TOGGLE_KEY]);
    const mappingOn = isMappingOn(cp[MAPPING_TOGGLE_KEY]);
    const editOn = isEditOn(cp[EDIT_TOGGLE_KEY]);
    if (!statusOn && !mappingOn && !editOn) return null;
    let rawCfg: unknown = null;
    try {
        rawCfg = globalConfig.get('configTable');
    } catch {
        rawCfg = null;
    }
    const cfgTable = st.paneConfigTable ?? base.getTableByNameIfExists(CONFIG_TABLE_NAME) ?? findLoose(base.tables, [CONFIG_TABLE_NAME]);
    const cfgVia = cfgTable && rawCfg === cfgTable.id ? 'pane' : cfgTable ? 'name' : 'none';
    const sources: StatusSource[] = [];
    for (const l of loaded) {
        const sp = TABLE_SPECS.find(s => s.key === l.key);
        sources.push({label: `${HE_LABEL[l.key] || l.key} · טבלה`, table: l.table.name, via: 'Option_List_6 → לפי שם', ok: true, note: `${l.records.length} רשומות`});
        if (!sp) continue;
        for (const [role, aliases] of Object.entries(sp)) {
            if (!Array.isArray(aliases) || role === 'aliases' || !aliases.every(a => typeof a === 'string')) continue;
            const f = findLoose(l.table.fields, aliases as string[]);
            const req = (REQUIRED[sp.time] as string[]).includes(role);
            sources.push({label: `${HE_LABEL[l.key] || l.key} · ${role}`, table: l.table.name, field: f?.name ?? (aliases as string[])[0] ?? null, via: f ? 'לפי שם' : req ? 'לא נמצא ✗' : 'לא נמצא', ok: !!f || !req, note: f ? null : req ? 'חובה — יש להפעיל לאלמנט' : 'רשות'});
        }
    }
    for (const m of st.missingTables) sources.push({label: 'טבלה מ-Option_List_6', table: null, via: 'לא נמצאה ✗', ok: false, note: m});
    sources.push({label: 'Festival Days (שמות ימים)', table: st.fdTable?.name ?? null, via: st.fdTable ? 'Source_Table_3 / לפי שם' : 'לא נמצאה ✗', ok: !!st.fdTable, note: st.fdTable ? null : 'כותרות הימים = התאריך בלבד — הפעילו את טבלת Festival Days לאלמנט'});
    // v0.1.3 #4: day titles = Festival Days record name (primary field) matched by its Date field (Israel date)
    if (st.fdTable) {
        const fds = st.fdTable.fields;
        const dateF = findLoose(fds, FESTIVAL_DAY_FIELDS.date);
        let prim: Field | null = null;
        try {
            prim = st.fdTable.primaryField;
        } catch {
            prim = null;
        }
        const nameOn = !!prim && fds.some(f => f.id === prim?.id);
        const dn = props.dayNamed;
        sources.push({label: 'Festival Days · Date (התאמה לתאריך)', table: st.fdTable.name, field: dateF?.name ?? 'Date', via: dateF ? 'לפי שם' : 'לא נמצא ✗', ok: !!dateF, note: dateF ? (dn ? `${dn.named} / ${dn.total} ימים קיבלו שם רשומה` : null) : 'השדה מוסתר מהאלמנט או חסר — כותרות הימים = התאריך בלבד'});
        sources.push({label: 'Festival Days · שם (כותרת היום)', table: st.fdTable.name, field: prim?.name ?? 'Name', via: nameOn ? 'שדה ראשי' : 'לא נמצא ✗', ok: nameOn, note: nameOn ? (dn?.sample ? `דוגמה: ${dn.sample}` : null) : 'השדה הראשי מוסתר מהאלמנט — כותרות הימים = התאריך בלבד'});
    }
    // v0.1.2: one line per configured filter field (resolved ✓ / not found = missing or hidden from the element ✗)
    const filters: StatusFilter[] = [];
    for (const [t, list] of Object.entries(props.filterSpecs ?? {})) {
        const mine = items.filter(i => i.table === t);
        for (const f of list) {
            const one: HColFilters = f.found && !f.declared ? {[t]: {['f:' + f.field]: {op: f.op, vals: f.vals}}} : {};
            filters.push({
                label: HE_LABEL[t] || t,
                table: loaded.find(l => l.key === t)?.table.name ?? t,
                field: f.field,
                via: `${f.source}${f.found ? '' : ' · לא נמצא ✗'}`,
                op: f.declared ? 'תפריט בלבד (בלי תנאי)' : OP_FULL[f.op],
                values: f.vals,
                matched: f.found && !f.declared ? mine.filter(i => hPassCol(i as never, one)).length : mine.length,
                total: mine.length,
                extra: !f.found ? 'השדה חסר בטבלה או מוסתר מהאלמנט — הפעילו אותו בהגדרות האלמנט' : f.declared ? 'מוצג במשפך של הטבלה' : 'ברירת מחדל של המשפך (המשתמש יכול לשנות)',
                bad: !f.found,
            });
        }
    }
    const allOn = Object.keys(colDefaults).length;
    void tableFilters;
    return (
        // the timeline fills the viewport, so the panel docks over it (bottom-left, scrolls; click the header to fold it)
        <div dir="rtl" style={{position: 'fixed', left: 8, bottom: 28, zIndex: 50, width: 'min(980px, calc(100vw - 16px))', maxHeight: '62vh', overflow: 'auto', boxShadow: '0 4px 18px rgba(0,0,0,.18)', borderRadius: 8, background: '#fff'}}>
            <StatusPanel
                base={base}
                on={statusOn}
                configTable={cfgTable}
                configVia={cfgVia}
                slug={ckey.slug}
                variant={st.variant}
                status={String(cfg.status)}
                record={cfg.record}
                variantRecord={cfg.variantRecord}
                fieldsUsed={['Extension', 'Variant', ...Object.keys(TIMELINE_DEFAULTS)]}
                sources={sources}
                filters={filters}
                filtersTitle={`סינון לפי טבלה (חלונית ימנית → Filter_N «Table.Field הוא ערך») · ${allOn} טבלאות עם תנאי ברירת מחדל`}
                extraTitle="הערה"
                notes={[`טבלאות מבוקשות (Option_List_6): ${st.wanted.join(' · ') || '—'}`, `👁 רשומות מוסתרות (למשתמש הזה): ${props.hiddenN ?? 0}${props.hiddenN ? ' · «נקה» / «נקה הכל» מחזירים' : ''}`]}
                version={VERSION}
            />
            {/* v0.2.9: Attachment_Mapping_Image of the matched row (Variant → default) + GitHub_URL, same dock, read-only */}
            <MappingPanel on={mappingOn} configTable={cfgTable} record={cfg.record} variantRecord={cfg.variantRecord} slug={ckey.slug} />
            {/* v0.2.10: «עריכה ישירה» — writes ONLY one cell of the matched Extension_Config row */}
            <ConfigEditor
                on={editOn}
                configTable={cfgTable}
                record={cfg.record}
                variantRecord={cfg.variantRecord}
                slug={ckey.slug}
                variant={ckey.variant}
                slots={EDIT_SLOTS}
                valueOf={s => cfg.raw(s as Slot)}
                docs={TIMELINE_DOCS as {[slot: string]: string | undefined}}
            />
        </div>
    );
}

const EDIT_SLOTS: readonly string[] = Object.keys(TIMELINE_DEFAULTS);

initializeBlock({
    interface: () => (
        <CrashBoundary fallback={(err, reset) => <CrashView error={err} onRetry={reset} />}>
            <Root />
        </CrashBoundary>
    ),
});
