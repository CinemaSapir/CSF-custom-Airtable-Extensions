import {createContext, useContext, useMemo} from 'react';
import {colorUtils, expandRecord, initializeBlock, useBase, useCustomProperties, useGlobalConfig, useRecords, useSession} from '@airtable/blocks/interface/ui';
import type {Base, Field, Record as AirtableRecord, Table} from '@airtable/blocks/interface/models';
import pkg from '../package.json';
import {CONFIG_SLUG, CONFIG_VARIANT, TABLE_LIST, TIMELINE_DEFAULTS, TIMELINE_DOCS, pickConfigKey, type ConfigKey} from './config';
import {CONFIG_TABLE_NAME, ExtensionConfigProvider, looseName, optionLabel, useExtensionConfig, type Slot} from './useExtensionConfig';
import {Timeline, type ColumnDef} from './Timeline';
import {StatusPanel} from './StatusPanel';
import {MappingPanel} from './MappingPanel';
import {ConfigEditor} from './ConfigEdit';
import {EDIT_TOGGLE_KEY, MAPPING_TOGGLE_KEY, STATUS_TOGGLE_KEY, editToggleProperty, isEditOn, isMappingOn, isStatusOn, mappingToggleProperty, statusToggleProperty, type StatusFilter, type StatusSource} from './statusCore';
import type {Writer} from './EditUi';
import {mapFields, type FieldLike} from './logic/edit';
import {FILTER_SLOTS, buildDays, passCol, distinctVals, filterKind, israelParts, parseOp, parseRef, parseRes, pickRes, splitVals, tzModeOf, type Day, type FilterOp, type ColFilters} from './logic/core';
import {names as namesOf, readItems, type RecView, type TableInput} from './logic/read';
import {FESTIVAL_DAY_FIELDS, LOOKUP_TABLES, TABLE_SPECS, type TableSpec} from './logic/tables';

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
export const fkey = (k: string, part: 'field' | 'op' | 'vals') => `f_${k.replace(/[^A-Za-z0-9]/g, '_')}_${part}`;
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
            {key: fkey(sp.key, 'op'), label: `סינון ${he} · תנאי`, type: 'enum', possibleValues: [{value: 'any', label: 'הוא אחד מ… (is any of)'}, {value: 'none', label: 'אינו אחד מ… (is none of)'}], defaultValue: 'any'},
            {key: fkey(sp.key, 'vals'), label: `סינון ${he} · ערכים (מופרדים ב-|, ריק = בלי סינון)`, type: 'string', defaultValue: ''},
        );
    }
    return props as unknown as Parameters<typeof useCustomProperties>[0] extends (b: Base) => infer R ? R : never;
}

/** v0.2.10: the resolved Extension_Config key (Extension «timeline-festival-days»; fallbacks «timeline», program-by-day [timeline]) */
const KeyCtx = createContext<ConfigKey>({slug: CONFIG_SLUG, variant: CONFIG_VARIANT, legacy: false});
export const useConfigKey = () => useContext(KeyCtx);

function Root() {
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
    const ext = p.table.getFieldByNameIfExists('Extension');
    const vf = p.table.getFieldByNameIfExists('Variant');
    const rows = recs && ext ? recs.map(r => ({extension: r.getCellValueAsString(ext), variant: vf ? r.getCellValueAsString(vf) : ''})) : null;
    const k = pickConfigKey(rows, p.paneVariant);
    return <Configured k={k} cp={p.cp} configTable={p.configTable} />;
}
function Configured({k, cp, configTable}: {k: ConfigKey; cp: {[k: string]: unknown}; configTable: Table | null}) {
    const base = useBase();
    const variant = k.variant;
    return (
        <KeyCtx.Provider value={k}>
        <CpCtx.Provider value={cp as {[k: string]: unknown}}>
        <ExtensionConfigProvider
            base={base}
            configTable={configTable}
            slug={k.slug}
            variant={variant}
            version={VERSION}
            displayName="טיימליין ימים"
            defaults={TIMELINE_DEFAULTS}
            docs={TIMELINE_DOCS}
            door2={false}
        >
            <Loader variant={variant} paneConfigTable={configTable} />
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
    const tableRows = cfg.options('Option_List_6');
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

type StatusCtx = {variant: string; paneConfigTable: Table | null; missingTables: string[]; fdTable: Table | null; wanted: string[]};
function Screen({loaded, notices: n0, hasDays, st}: {loaded: Loaded[]; notices: string[]; hasDays: boolean; st: StatusCtx}) {
    const ckey = useConfigKey();
    const cfg = useExtensionConfig();
    const session = useSession();
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
                const ds = String(v.raw(FESTIVAL_DAY_FIELDS.date) ?? '').slice(0, 10);
                if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) continue;
                byId[r.id] = ds;
                if (!names[ds]) names[ds] = v.name;
            }
        }
        return {names, dayDateById: byId};
    }, [daysRec]);
    const days: Day[] = useMemo(() => buildDays(first, last, day1, names), [first, last, day1, names]);

    const statusRows = cfg.options('Option_List_7');
    const lodge = {in: cfg.text('Table_Heading_2') || '15:00', out: cfg.text('Table_Heading_3') || '11:00'};
    const split = (s: string) => s.split('|').map(x => x.trim()).filter(Boolean);
    const excludeTypes = split(cfg.raw('Filter_Value_7'));
    const excludeTasks = split(cfg.raw('Filter_Value_9'));

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
        excludeStatus: {Tasks: excludeTasks},
    });

    // ---- v0.2.4 per-table filters: right pane first, else Extension_Config Filter_N ('Table.Field' + Filter_Operator_N + Filter_Value_N)
    const cp = useContext(CpCtx);
    const tableFilters: {[t: string]: {field: string; kind: 'select' | 'link' | 'text'; op: FilterOp; values: string[]; source: string; options: string[]}} = {};
    for (const l of tableData) {
        let f: Field | null = null,
            op: FilterOp = 'any',
            vals: string[] = [],
            source = '';
        const pf = cp[fkey(l.key, 'field')] as Field | undefined;
        if (pf && typeof pf === 'object' && 'id' in pf) {
            f = l.table.getFieldByIdIfExists(pf.id) ?? null;
            op = parseOp(cp[fkey(l.key, 'op')]);
            vals = splitVals(cp[fkey(l.key, 'vals')]);
            source = 'right pane';
        } else {
            for (const n of FILTER_SLOTS) {
                const ref = parseRef(cfg.raw(`Filter_${n}` as never));
                if (!ref || looseName(ref.table) !== looseName(l.key)) continue;
                f = findLoose(l.table.fields, [ref.field]);
                op = parseOp(cfg.raw(`Filter_Operator_${n}` as never));
                vals = splitVals(cfg.raw(`Filter_Value_${n}` as never));
                source = `Extension_Config Filter_${n}`;
                if (!f) notices.push(`${l.key}: שדה הסינון ${ref.field} לא נמצא (Filter_${n})`);
                break;
            }
        }
        // v0.2.5: every select / link field of the table feeds the column menu's field chooser
        const ff = l.table.fields.filter(x => filterKind(String(x.type)) !== 'text');
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
        if (!f) continue;
        const byId: {[id: string]: string[]} = {};
        for (const r of l.records) {
            let v: unknown;
            try {
                v = r.getCellValue(f);
            } catch {
                v = undefined;
            }
            byId[r.id] = namesOf(v);
        }
        const kind = filterKind(String(f.type));
        tableFilters[l.key] = {field: f.name, kind, op, values: vals, source, options: []};
        for (const it of res.items) if (it.table === l.key) {
            it.fv = byId[it.id] ?? [];
            if (it.fx && !it.fx[f.name] && it.fv.length) it.fx[f.name] = it.fv; // text fields too (right pane allows them)
        }
    }
    // v0.2.5: the right pane / Filter_N value list is the DEFAULT behind each column's funnel menu (users can change it, saved per user)
    const colDefaults: ColFilters = {};
    for (const t in tableFilters) {
        const tf = tableFilters[t];
        if (tf.values.length) colDefaults[t] = {['f:' + tf.field]: {op: tf.op, vals: tf.values}};
        tableFilters[t].options = tf.kind !== 'text' ? distinctVals(res.items.filter(i => i.table === t).map(i => i.fv)) : [];
    }

    const foundKeys = new Set(tableData.map(l => l.key));
    const columns: ColumnDef[] = cfg.options('Option_List_6').map(r => {
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
              ? `הגדרות: Extension_Config · ${ckey.slug}${ckey.variant ? ` [${ckey.variant}]` : ''}${ckey.legacy ? ' (שורה ישנה — לשנות ל-Extension = timeline-festival-days)' : ''}`
              : `הגדרות: ${cfg.status}`;
    const num = (slot: 'Number_1' | 'Number_2' | 'Number_3' | 'Number_4', d: number) => cfg.number(slot) ?? d;
    return (
        <>
        <Timeline
            days={days}
            items={res.items}
            columns={columns}
            hiddenJunk={res.hidden}
            notices={notices}
            texts={Object.fromEntries(Object.keys(TIMELINE_DEFAULTS).map(k => [k, cfg.raw(k as never)]))}
            res={{steps, def: pickRes(steps, cfg.raw('Dropdown_Default_3')), label: cfg.raw('Dropdown_Label_3') || 'רזולוציה'}}
            toggles={{
                collapse: {label: cfg.toggleSpec(1).label, def: cfg.toggle('Toggle_1')},
                compress: {label: cfg.toggleSpec(2).label, def: cfg.toggle('Toggle_2')},
                xs: {def: cfg.toggle('Toggle_3')},
                link: {def: cfg.toggle('Toggle_4')},
            }}
            facetLabels={{hall: cfg.raw('Filter_Label_1') || 'מיקום', person: cfg.raw('Filter_Label_2') || 'אדם', film: cfg.raw('Filter_Label_3') || 'סרט', status: cfg.raw('Filter_Label_4') || 'סטטוס'}}
            quickTimes={cfg.options('Option_List_8').map(r => ({value: r.value, label: r.label}))}
            lodge={lodge}
            numbers={{bandFrac: num('Number_1', 0.2), maxCards: Math.max(2, Math.round(num('Number_2', 6))), strip: num('Number_3', 30), festLen: Math.max(1, Math.round(num('Number_4', 7)))}}
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
        />
        <TimelineStatus st={st} loaded={tableData} items={res.items} tableFilters={tableFilters} colDefaults={colDefaults} />
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
    colDefaults: ColFilters;
}) {
    const ckey = useConfigKey();
    const {st, loaded, items, tableFilters, colDefaults} = props;
    const base = useBase();
    const cfg = useExtensionConfig();
    const cp = useContext(CpCtx);
    const globalConfig = useGlobalConfig();
    const statusOn = isStatusOn(cp[STATUS_TOGGLE_KEY]);
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
    sources.push({label: 'Festival Days (שמות ימים)', table: st.fdTable?.name ?? null, via: st.fdTable ? 'Source_Table_3 / לפי שם' : 'לא נמצאה', ok: true, note: st.fdTable ? null : 'רשות — שמות ימים כלליים'});
    const filters: StatusFilter[] = Object.entries(tableFilters).map(([t, f]) => {
        const mine = items.filter(i => i.table === t);
        const active = !!colDefaults[t];
        return {
            label: HE_LABEL[t] || t,
            table: loaded.find(l => l.key === t)?.table.name ?? t,
            field: f.field,
            via: f.source,
            op: f.op === 'none' ? 'אינו אחד מ (is none of)' : 'הוא אחד מ (is any of)',
            values: f.values,
            matched: active ? mine.filter(i => passCol(i as never, colDefaults)).length : mine.length,
            total: mine.length,
            extra: active ? 'ברירת מחדל של המשפך (המשתמש יכול לשנות)' : 'ללא סינון',
        };
    });
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
                filtersTitle="סינון לפי טבלה (חלונית ימנית → Filter_N)"
                extraTitle="הערה"
                notes={[`טבלאות מבוקשות (Option_List_6): ${st.wanted.join(' · ') || '—'}`]}
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

initializeBlock({interface: () => <Root />});
