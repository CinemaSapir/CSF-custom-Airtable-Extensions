import {Component, useEffect, useState, type ReactNode} from 'react';
import {initializeBlock, useBase, useCustomProperties, useGlobalConfig, useRecords} from '@airtable/blocks/interface/ui';
import type {Base, Field, Record as AtRecord, Table} from '@airtable/blocks/interface/models';
import pkg from '../package.json';
import {CONFIG_DEFAULTS as D, CONFIG_EXTENSION, fieldPart} from './config';
import {
    ExtensionConfigProvider,
    findConfigTable,
    useExtensionConfig,
    type ConfigDefaults,
    type ExtensionConfig,
    type Slot,
    type SlotDocs,
} from './useExtensionConfig';
import {
    FIELD_ALIASES,
    TABLE_ALIASES,
    computeTarget,
    findByLooseName,
    formatSlotWhen,
    isCancelledStatus,
    isScheduledStatus,
    israelDate,
    israelMidnightMs,
    parseDateMs,
    splitDuration,
    type SlotInput,
    type SlotsSource,
    type FestivalDayInput,
    DAY_DATE_ALIASES,
    DAY_NOTE_ALIASES,
    DAY_NUM_ALIASES,
    DAY_TABLE_ALIASES,
    SLOT_DAY_LINK_ALIASES,
    dayNumberInName,
    parseDayNumber,
    type TargetResult,
} from './festivalTarget';
import {
    FILMS_TABLE_ALIASES,
    FILM_SLOT_LINK_ALIASES,
    INVITATIONS_TABLE_ALIASES,
    PROJECTS_TABLE_ALIASES,
    PROJECT_SLOT_LINK_ALIASES,
    SLOT_FILM_LINK_ALIASES,
    SLOT_PROJECT_LINK_ALIASES,
    computeCounts,
    linkIds,
    type CountSlot,
    type CountsInput,
    type LinkedRec,
} from './counts';
import {CountdownView, safeHex, type ViewColors} from './view';
import {AGG_OPS, buildPills, cellNumber, parseAggList, pickAgg, type AggMode, type PillFilterDiag, type PillPrep} from './aggregate';

import {StatusPanel} from './StatusPanel';
import {MappingPanel} from './MappingPanel';
import {ConfigEditor} from './ConfigEdit';
import {EDIT_TOGGLE_KEY, MAPPING_TOGGLE_KEY, STATUS_TOGGLE_KEY, editToggleProperty, isEditOn, isMappingOn, isStatusOn, mappingToggleProperty, statusToggleProperty, type StatusSource} from './statusCore';
import {
    FILTER_OPS,
    PILLS,
    applyFilters,
    configFiltersByTable,
    keepIds,
    norm,
    parseOp,
    pickFilters,
    resolveFilterField,
    matchValues,
    propKeys,
    propLabels,
    type PillKey,
} from './filters';

const VERSION = pkg.version;

// v0.4.3: «מצב חיבור» diagnostics, loose Extension/Variant, self-resolved pane fields, non-sticky config boundary.
// v0.4.1: right pane (custom properties) → Extension_Config row countdown-homescreen (Variant empty, live, READ-ONLY via
// useExtensionConfig, Door 2 writes OFF) → CONFIG_DEFAULTS. Pane: per-pill table + ONE fixed filter + the config table.

const PILL_TABLE_ALIASES: Record<PillKey, readonly string[]> = {
    films: FILMS_TABLE_ALIASES,
    events: TABLE_ALIASES,
    projects: PROJECTS_TABLE_ALIASES,
    invitations: INVITATIONS_TABLE_ALIASES,
    // v0.4.5: invitation tickets live on Invitations («Tickets Given»); there is no Tickets table
    tickets: INVITATIONS_TABLE_ALIASES,
    // v0.4.5: reserved for sold tickets — NO default / aliases: «—» until the owner sets a table
    sold: [],
};
const PILL_LABEL: Record<PillKey, string> = {
    films: D.Content_Text_3,
    events: D.Content_Text_4,
    projects: D.Content_Text_5,
    invitations: D.Content_Text_2,
    tickets: D.Content_Text_1,
    sold: D.Content_Text_10,
};
/** v0.3–0.4.4 default of Content_Text_1; a config cell still holding it is read as the new default «כרטיסי הזמנה». */
const OLD_TICKETS_LABEL = 'כרטיסים שנמכרו';
/** Code-default aggregation per pill (Option_List_2 / right pane override). */
const AGG_DEFAULT: Record<PillKey, {mode: AggMode; field: string}> = {
    films: {mode: 'count', field: ''},
    events: {mode: 'count', field: ''},
    projects: {mode: 'count', field: ''},
    invitations: {mode: 'count', field: ''},
    tickets: {mode: 'sum', field: fieldPart(D.Source_Field_1)},
    sold: {mode: 'count', field: ''},
};
/** Source_Field_N that holds the sum field per pill (Table.Field; empty = none). */
const AGG_SLOT: Partial<Record<PillKey, 'Source_Field_1' | 'Source_Field_9'>> = {tickets: 'Source_Field_1', sold: 'Source_Field_9'};
const PHASE_PILLS: ReadonlySet<PillKey> = new Set(['films', 'events', 'projects']);
/** Option_List_2 pill names: key + code label (+ a few spellings). */
const AGG_NAMES: Record<PillKey, readonly string[]> = {
    films: ['films', 'סרטים', D.Content_Text_3],
    events: ['events', 'slots', 'אירועים', D.Content_Text_4],
    projects: ['projects', 'מסגרות תוכן', 'פרויקטים', D.Content_Text_5],
    invitations: ['invitations', 'הזמנות', D.Content_Text_2],
    tickets: ['tickets', 'invitation tickets', 'כרטיסים', 'כרטיסי הזמנה', D.Content_Text_1],
    sold: ['sold', 'sold tickets', 'כרטיסים שנמכרו', D.Content_Text_10],
};
const defaultTableName = (k: PillKey) => PILLS.find(p => p.key === k)!.defaultTable;

/** Right-pane properties (top-level → stable identity). Per pill: table · field · operator · value. */
/** v0.4.9: right-pane clock target (pane → Extension_Config → code default). */
const TARGET_DAY_KEY = 'clockTargetDay';
const CLOCK_STATUS_KEY = 'clockStatuses';

function getCustomProperties(base: Base) {
    try {
        const cfgT = findConfigTable(base);
        const cfgProp = {
            key: 'configTable',
            label: 'טבלת הגדרות (Extension_Config) — גיבוי לחלונית',
            type: 'table' as const,
            defaultValue: cfgT ?? undefined,
        };
        const clockProps = [
            {key: TARGET_DAY_KEY, label: 'שעון: מספר יום היעד ב-Festival Days (ריק = Extension_Config Number_1 / 0)', type: 'string' as const, defaultValue: ''},
            {key: CLOCK_STATUS_KEY, label: 'שעון: סטטוסים למשבצת היעד (| בין ערכים; ריק = Option_List_4 / כל סטטוס)', type: 'string' as const, defaultValue: ''},
        ];
        return [cfgProp, statusToggleProperty(), mappingToggleProperty(), editToggleProperty(), ...clockProps, ...PILLS.flatMap(p => {
            const keys = propKeys(p.key);
            const labels = propLabels(PILL_LABEL[p.key], p.key);
            const t = p.defaultTable ? findTable(base, p.defaultTable, PILL_TABLE_ALIASES[p.key]) : null;
            const sumDefault = t && AGG_DEFAULT[p.key].field ? findByLooseName(t.fields, [AGG_DEFAULT[p.key].field]) : null;
            const aggProps = [
                {
                    key: keys.agg,
                    label: labels.agg,
                    type: 'enum' as const,
                    possibleValues: AGG_OPS.filter(o => o.value !== 'remaining' || PHASE_PILLS.has(p.key)).map(o => ({value: o.value, label: o.label})),
                    defaultValue: 'auto',
                },
                t
                    ? {key: keys.sumField, label: labels.sumField, type: 'field' as const, table: t, ...(sumDefault ? {defaultValue: sumDefault} : {})}
                    : {key: keys.sumFieldName, label: labels.sumFieldName, type: 'string' as const, defaultValue: ''},
            ];
            return [
                {key: keys.table, label: labels.table, type: 'table' as const, defaultValue: t ?? undefined},
                t
                    ? {key: keys.field, label: labels.field, type: 'field' as const, table: t}
                    : {key: keys.fieldName, label: labels.fieldName, type: 'string' as const, defaultValue: ''},
                {
                    key: keys.op,
                    label: labels.op,
                    type: 'enum' as const,
                    possibleValues: FILTER_OPS.map(o => ({value: o.value, label: o.label})),
                    defaultValue: 'none',
                },
                {key: keys.value, label: labels.value, type: 'string' as const, defaultValue: ''},
                ...aggProps,
            ];
        })];
    } catch {
        return [];
    }
}

/** CONFIG_DEFAULTS as the hook's code-default layer (Date_2 = Israel midnight of the first day). */
// v0.4.4: DST-aware — 31.10 00:00 Israel = 30.10 22:00Z (UTC+2 after 25.10); v0.4.1–0.4.3 used +03:00 → 30.10 23:00 Israel.
const HOOK_DEFAULTS: ConfigDefaults = {...D, Date_2: new Date(israelMidnightMs(D.Date_2)).toISOString()} as ConfigDefaults;
/** v0.4.7: slots offered by «עריכה ישירה» (the code defaults' keys; ConfigEditor keeps only text + Option_List slots) */
const EDIT_SLOTS: readonly string[] = Object.keys(D);
const HOOK_DOCS: SlotDocs = {
    Title: 'כותרת מעל השעון',
    Content_Text_1: 'תווית אריח כרטיסי הזמנה (סכום Tickets Given)',
    Content_Text_10: 'תווית אריח כרטיסים שנמכרו (שמור, «—» עד שמוגדר)',
    Source_Field_1: 'שדה מספרי לסכום כרטיסי הזמנה (Invitations.Tickets Given)',
    Source_Table_6: 'טבלת כרטיסים שנמכרו (שמור, ריק = «—»)',
    Source_Field_9: 'שדה לסכום כרטיסים שנמכרו (ריק = ספירת רשומות)',
    Option_List_2: 'צבירה לכל אריח, שורה לכל אריח: tickets = sum: Tickets Given · films = count · events = remaining',
    Content_Text_2: 'תווית אריח הזמנות',
    Content_Text_3: 'תווית אריח סרטים',
    Content_Text_4: 'תווית אריח אירועים',
    Content_Text_5: 'תווית אריח מסגרות תוכן',
    Content_Text_6: 'יחידה: ימים',
    Content_Text_7: 'יחידה: שעות',
    Content_Text_8: 'יחידה: דקות',
    Source_Table_1: 'טבלת כרטיסי הזמנה (ברירת מחדל Invitations)',
    Source_Table_2: 'טבלת הזמנות (ספירה)',
    Source_Table_3: 'טבלת המשבצות (שעון + אירועים)',
    Source_Table_4: 'טבלת סרטים',
    Source_Table_5: 'טבלת מסגרות תוכן',
    Source_Field_3: 'סטטוס משבצת',
    Source_Field_4: 'התחלה',
    Source_Field_5: 'סיום',
    Source_Field_6: 'קישור סרט↔משבצת',
    Source_Field_8: 'קישור משבצת↔פרויקט',
    Option_List_1: 'סטטוסים שנחשבים «משובץ» לספירות (שורה לכל ערך)',
    Option_List_4: 'סטטוסים למשבצת היעד של השעון (שורה לכל ערך; ריק = כל סטטוס)',
    Number_1: 'מספר יום היעד של השעון ב-Festival Days (ברירת מחדל 0)',
    Source_Table_7: 'טבלת ימי הפסטיבל (Festival Days)',
    Source_Field_10: 'שדה מספר היום ב-Festival Days',
    Source_Field_11: 'קישור משבצת↔יום (ריק = לפי תאריך)',
    Date_1: 'יעד גיבוי',
    Date_2: 'היום הראשון של הפסטיבל (רק בלי Festival Days)',
    Color_1: 'צבע הדגשה',
    Color_2: 'רקע',
    Color_3: 'גל 1',
    Color_4: 'גל 2',
    Color_5: 'גל 3',
    Color_6: 'גל 4',
    Color_7: 'גל 5',
};

/** Root: Extension_Config (right-pane picker → loose name) feeds the hook, READ-ONLY (writes OFF). */
function Root() {
    const base = useBase();
    const {customPropertyValueByKey: P0} = useCustomProperties(getCustomProperties);
    const globalConfig = useGlobalConfig();
    // The SDK returns a picked field ONLY if it is enabled on the element (else undefined). Keep the raw stored id
    // so the pill can say "picked but not enabled" instead of silently not filtering.
    const P: {[key: string]: unknown} = {...P0};
    for (const p of PILLS) {
        for (const [suffix, key] of [['__rawField', propKeys(p.key).field], ['__rawSumField', propKeys(p.key).sumField], ['__rawTable', propKeys(p.key).table]] as const) {
            try {
                const raw = globalConfig.get(key);
                P[`${p.key}${suffix}`] = typeof raw === 'string' ? raw : null;
            } catch {
                P[`${p.key}${suffix}`] = null;
            }
        }
    }
    const id = idOf(P.configTable, 'tbl');
    const rawCfgId = (() => {
        try {
            const v = globalConfig.get('configTable');
            return typeof v === 'string' ? v : null;
        } catch {
            return null;
        }
    })();
    // only a table the owner actually picked counts as "from the pane" (the property's default is the by-name table)
    const paneCfgT = rawCfgId ? ((id ? base.getTableByIdIfExists(id) : null) ?? base.getTableByIdIfExists(rawCfgId)) : null;
    const cfgT = paneCfgT ?? findConfigTable(base);
    const schema = editSchema(base);
    const cfgSrc: ConfigSource = {
        via: paneCfgT ? 'pane' : cfgT ? 'name' : 'none',
        hiddenInBase: !cfgT && !!schema && Object.values(schema).some(t => looseKey(t.name) === looseKey('Extension_Config')),
        editMode: !!schema,
    };
    const withConfig = (t: Table | null, error: string | null) => (
        <ExtensionConfigProvider
            base={base}
            configTable={t}
            slug={CONFIG_EXTENSION}
            variant=""
            version={VERSION}
            defaults={HOOK_DEFAULTS}
            docs={HOOK_DOCS}
            writes={false}
        >
            <CountdownScreen P={P} cfgSrc={cfgSrc} configError={error} cfgTable={t} />
        </ExtensionConfigProvider>
    );
    // A broken config table must never take the countdown down: fall back to code defaults — but NOT forever
    // (v0.4.2 bug: the boundary stayed in fallback for the whole session after one error, so later config edits
    // never showed). Keyed on the table id + retried on the next config change; the error is shown in «מצב חיבור».
    return (
        <ConfigBoundary key={cfgT?.id ?? 'none'} fallback={err => withConfig(null, err)}>
            {withConfig(cfgT, null)}
        </ConfigBoundary>
    );
}

type ConfigSource = {via: 'pane' | 'name' | 'none'; hiddenInBase: boolean; editMode: boolean};

class ConfigBoundary extends Component<{fallback: (err: string) => ReactNode; children: ReactNode}, {error: string | null; at: number}> {
    override state = {error: null as string | null, at: 0};
    static getDerivedStateFromError(e: unknown) {
        return {error: e instanceof Error ? e.message : String(e), at: Date.now()};
    }
    override componentDidUpdate() {
        // retry the real config path 5 s after a failure (a cell edit that fixed it will then show)
        if (this.state.error && !this.timer) {
            this.timer = setTimeout(() => {
                this.timer = null;
                this.setState({error: null});
            }, 5000);
        }
    }
    override componentWillUnmount() {
        if (this.timer) clearTimeout(this.timer);
    }
    private timer: ReturnType<typeof setTimeout> | null = null;
    override render() {
        return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
    }
}

type EditSchema = Record<string, {id: string; name: string; fieldsById: Record<string, {id: string; name: string}>}>;
/** Full base schema the SDK keeps for the properties panel (edit mode only; null in the published view). Read-only, names only. */
function editSchema(base: Base): EditSchema | null {
    try {
        const fn = (base as unknown as {_getAllTableDataForEditModeConfiguration?: () => unknown})._getAllTableDataForEditModeConfiguration;
        const v = typeof fn === 'function' ? fn.call(base) : null;
        return v && typeof v === 'object' ? (v as EditSchema) : null;
    } catch {
        return null;
    }
}
function schemaFieldName(schema: EditSchema | null, fieldId: string | null): string | null {
    if (!schema || !fieldId) return null;
    for (const t of Object.values(schema)) {
        const f = t.fieldsById?.[fieldId];
        if (f) return f.name;
    }
    return null;
}
const looseKey = (s: string) => norm(s).replace(/[\s_\-.]+/g, '');

/** Extension_Config fields this screen reads (for the «מצב חיבור» missing list). */
const CONFIG_FIELDS_USED = [
    'Extension', 'Variant', 'Title',
    ...[1, 2, 3, 4, 5, 6, 7, 8, 10].map(n => `Content_Text_${n}`),
    ...[1, 2, 3, 4, 5, 6, 7].map(n => `Source_Table_${n}`),
    ...[1, 3, 4, 5, 6, 8, 9, 10, 11].map(n => `Source_Field_${n}`),
    'Option_List_1', 'Option_List_2', 'Option_List_4', 'Number_1', 'Date_1', 'Date_2',
    ...[1, 2, 3, 4, 5, 6, 7].map(n => `Color_${n}`),
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].flatMap(n => [`Filter_${n}`, `Filter_Operator_${n}`, `Filter_Value_${n}`]),
    'Use_Defaults_Only',
];

type Live = {
    title: string;
    labels: Record<PillKey, string>;
    units: [string, string, string];
    statuses: string[];
    targetOpts: {fallbackMs: number | null; firstDay: string | null; statuses: string[]};
    colors: ViewColors;
    configNote: string;
};

/** Every config-driven value: Extension_Config cell → code default (the hook does the layering). */
function readLive(cfg: ExtensionConfig): Live {
    const t = (slot: Parameters<ExtensionConfig['text']>[0], d: string) => {
        try {
            return cfg.text(slot) || d;
        } catch {
            return d;
        }
    };
    let statuses: string[] = [];
    try {
        statuses = cfg.options('Option_List_1').map(o => o.value).filter(Boolean);
    } catch {
        statuses = [];
    }
    if (!statuses.length) statuses = [D.Option_List_1];
    const dms = (slot: 'Date_1' | 'Date_2') => {
        try {
            const d = cfg.date(slot);
            return d ? d.getTime() : null;
        } catch {
            return null;
        }
    };
    const d2 = dms('Date_2');
    const c = (slot: 'Color_1' | 'Color_2' | 'Color_3' | 'Color_4' | 'Color_5' | 'Color_6' | 'Color_7') =>
        safeHex(t(slot, D[slot]), D[slot]);
    const STATUS_NOTE: Record<string, string> = {
        'no-table': 'Extension_Config לא נמצאה / לא מאופשרת → ברירות מחדל בקוד',
        loading: 'Extension_Config נטענת…',
        'no-record': `אין שורה ${CONFIG_EXTENSION} (Variant ריק) → ברירות מחדל בקוד`,
        ok: `Extension_Config · ${CONFIG_EXTENSION} ✓ (קריאה בלבד)`,
        'defaults-only': 'Use_Defaults_Only מסומן → ברירות מחדל בקוד',
        duplicate: `יותר משורה אחת ${CONFIG_EXTENSION} — נעשה שימוש בראשונה`,
    };
    return {
        title: t('Title', D.Title),
        labels: {
            films: t('Content_Text_3', D.Content_Text_3),
            events: t('Content_Text_4', D.Content_Text_4),
            projects: t('Content_Text_5', D.Content_Text_5),
            invitations: t('Content_Text_2', D.Content_Text_2),
            // v0.4.5: the pre-v0.4.5 default «כרטיסים שנמכרו» on this pill is obsolete (it is invitation tickets now)
            tickets: ((x: string) => (x.trim() === OLD_TICKETS_LABEL ? D.Content_Text_1 : x))(t('Content_Text_1', D.Content_Text_1)),
            sold: t('Content_Text_10', D.Content_Text_10),
        },
        units: [t('Content_Text_6', D.Content_Text_6), t('Content_Text_7', D.Content_Text_7), t('Content_Text_8', D.Content_Text_8)],
        statuses,
        targetOpts: {fallbackMs: dms('Date_1'), firstDay: d2 !== null ? israelDate(d2) : null, statuses},
        colors: {accent: c('Color_1'), bg: c('Color_2'), wave: [c('Color_3'), c('Color_4'), c('Color_5'), c('Color_6'), c('Color_7')]},
        configNote: STATUS_NOTE[cfg.status] ?? String(cfg.status),
    };
}

const PILL_SOURCE_TABLE: Record<PillKey, 'Source_Table_1' | 'Source_Table_2' | 'Source_Table_3' | 'Source_Table_4' | 'Source_Table_5' | 'Source_Table_6'> = {
    films: 'Source_Table_4',
    events: 'Source_Table_3',
    projects: 'Source_Table_5',
    invitations: 'Source_Table_2',
    tickets: 'Source_Table_1',
    sold: 'Source_Table_6',
};

function idOf(v: unknown, prefix: string): string | null {
    if (v && typeof v === 'object' && 'id' in v) {
        const id = (v as {id: unknown}).id;
        if (typeof id === 'string' && id.startsWith(prefix)) return id;
    }
    return null;
}
function nameOf(v: unknown): string {
    if (v && typeof v === 'object' && 'name' in v) {
        const n = (v as {name: unknown}).name;
        if (typeof n === 'string') return n;
    }
    return '';
}

/** Exact name via getTableByNameIfExists first, then loose aliases. Disabled tables are simply absent → null. */
function findTable(base: Base, primary: string, aliases: readonly string[]): Table | null {
    return base.getTableByNameIfExists(primary) ?? findByLooseName(base.tables, [primary, ...aliases]);
}

/** Link field by loose name, only if it really is a link (skips text copies like «Films copy»). */
function findLink(table: Table | null, aliases: readonly string[]): Field | null {
    if (!table) return null;
    const links = table.fields.filter(f => String(f.type) === 'multipleRecordLinks');
    return findByLooseName(links, aliases);
}

/** useRecords only with a real table (the interface SDK crashes on useRecords(null)). */
function Recs({table, children}: {table: Table | null; children: (r: readonly AtRecord[] | null) => ReactNode}) {
    if (!table) return <>{children(null)}</>;
    return <LiveRecs table={table}>{children}</LiveRecs>;
}
function LiveRecs({table, children}: {table: Table; children: (r: readonly AtRecord[] | null) => ReactNode}) {
    const records = useRecords(table);
    return <>{children(records ?? null)}</>;
}

function safeName(r: AtRecord): string {
    try {
        return (r.name || '').trim();
    } catch {
        return '';
    }
}

function CountdownScreen({P, cfgSrc, configError, cfgTable}: {P: {[key: string]: unknown}; cfgSrc: ConfigSource; configError: string | null; cfgTable: Table | null}) {
    const base = useBase();
    const cfg = useExtensionConfig();
    const live = readLive(cfg);
    const tableVia: Partial<Record<PillKey, string>> = {};
    /** Right pane → Extension_Config Source_Table_N (cell, else code default) → aliases. */
    const pillTable = (k: PillKey): Table | null => {
        const id = idOf(P[propKeys(k).table], 'tbl');
        const pane = id ? base.getTableByIdIfExists(id) : null;
        if (pane) {
            // the property's default is the by-name table: only a table the owner actually picked counts as «חלונית»
            tableVia[k] = typeof P[`${k}__rawTable`] === 'string' ? 'חלונית' : 'לפי שם (ברירת מחדל)';
            return pane;
        }
        let fromCfg: Table | null = null;
        try {
            fromCfg = cfg.raw(PILL_SOURCE_TABLE[k]).trim() ? cfg.table(PILL_SOURCE_TABLE[k]) : null;
        } catch {
            fromCfg = null;
        }
        if (fromCfg) {
            tableVia[k] = cfg.status === 'ok' || cfg.status === 'duplicate' ? `Extension_Config ${PILL_SOURCE_TABLE[k]}` : 'ברירת מחדל';
            return fromCfg;
        }
        const def = defaultTableName(k);
        const t = def ? findTable(base, def, PILL_TABLE_ALIASES[k]) : null;
        tableVia[k] = t ? 'לפי שם (ברירת מחדל)' : def ? 'לא נמצאה ✗' : 'לא הוגדר (שמור)';
        return t;
    };
    /** Source_Field_N (Table.Field) → field name part; a bad/empty cell falls back to the code default. */
    const fp = (slot: 'Source_Field_1' | 'Source_Field_3' | 'Source_Field_4' | 'Source_Field_5' | 'Source_Field_6' | 'Source_Field_8' | 'Source_Field_9' | 'Source_Field_10' | 'Source_Field_11') => {
        try {
            return fieldPart(cfg.raw(slot) || D[slot]);
        } catch {
            return fieldPart(D[slot]);
        }
    };
    const tablesByPill = {} as Record<PillKey, Table | null>;
    for (const p of PILLS) tablesByPill[p.key] = pillTable(p.key);
    const slotsT = tablesByPill.events;
    const filmsT = tablesByPill.films;
    const projectsT = tablesByPill.projects;

    const f = slotsT
        ? {
              start: findByLooseName(slotsT.fields, [fp('Source_Field_4'), ...FIELD_ALIASES.start]),
              end: findByLooseName(slotsT.fields, [fp('Source_Field_5'), ...FIELD_ALIASES.end]),
              status: findByLooseName(slotsT.fields, [fp('Source_Field_3'), ...FIELD_ALIASES.status]),
              films: findLink(slotsT, SLOT_FILM_LINK_ALIASES),
              project: findLink(slotsT, [fp('Source_Field_8'), ...SLOT_PROJECT_LINK_ALIASES]),
              days: findLink(slotsT, [fp('Source_Field_11'), ...SLOT_DAY_LINK_ALIASES]),
          }
        : null;
    // v0.4.9: Festival Days (Source_Table_7 → by name) for the clock's Day N
    const daysT: Table | null = (() => {
        try {
            const c = cfg.raw('Source_Table_7').trim() ? cfg.table('Source_Table_7') : null;
            return c ?? findTable(base, D.Source_Table_7, DAY_TABLE_ALIASES);
        } catch {
            return findTable(base, D.Source_Table_7, DAY_TABLE_ALIASES);
        }
    })();
    const dayNumF = daysT ? findByLooseName(daysT.fields, [fp('Source_Field_10'), ...DAY_NUM_ALIASES]) : null;
    const dayDateF = daysT ? findByLooseName(daysT.fields, DAY_DATE_ALIASES) : null;
    const dayNoteF = daysT ? findByLooseName(daysT.fields, DAY_NOTE_ALIASES) : null;
    const paneDay = String(P[TARGET_DAY_KEY] ?? '').trim();
    const targetDay = parseDayNumber(paneDay || (() => { try { return cfg.raw('Number_1'); } catch { return ''; } })());
    const targetDayVia = paneDay && /^-?\d+$/.test(paneDay) ? 'חלונית' : cfg.status === 'ok' && cfg.raw('Number_1').trim() && cfg.raw('Number_1').trim() !== String(D.Number_1) ? 'Extension_Config Number_1' : 'ברירת מחדל';
    const clockStatuses = (() => {
        const pane = String(P[CLOCK_STATUS_KEY] ?? '').split(/[|\n]/).map(x => x.trim()).filter(Boolean);
        if (pane.length) return {list: pane, via: 'חלונית'};
        try {
            const c = cfg.options('Option_List_4').map(o => o.value.trim()).filter(Boolean);
            if (c.length) return {list: c, via: 'Extension_Config Option_List_4'};
        } catch {
            /* default */
        }
        return {list: [] as string[], via: 'ברירת מחדל = Option_List_1 (משובץ)'};
    })();
    const filmSlotsF = findLink(filmsT, [fp('Source_Field_6'), ...FILM_SLOT_LINK_ALIASES]);
    const projectSlotsF = findLink(projectsT, PROJECT_SLOT_LINK_ALIASES);
    const aggLines = (() => {
        try {
            return parseAggList(cfg.status === 'ok' || cfg.status === 'duplicate' ? cfg.raw('Option_List_2') : '', AGG_NAMES);
        } catch {
            return parseAggList('', AGG_NAMES);
        }
    })();

    return (
        <AllRecs tables={[...PILLS.map(p => tablesByPill[p.key]), daysT]}>
            {recList => {
                const dayRecs = recList[PILLS.length];
                const days = daysT && dayRecs ? readDays(dayRecs, dayNumF, dayDateF, dayNoteF) : null;
                const recsByPill = {} as Record<PillKey, readonly AtRecord[] | null>;
                PILLS.forEach((p, i) => (recsByPill[p.key] = recList[i]));
                const cfgFilters = readConfigFilters(cfg);
                const schema = editSchema(base);
                const pass = {} as Record<PillKey, ReadonlySet<string> | null>;
                const preps: PillPrep[] = [];
                const sources: StatusSource[] = [];
                for (const p of PILLS) {
                    const k = p.key;
                    const table = tablesByPill[k];
                    const recs = recsByPill[k];
                    const r = pillFilter(k, table, recs, P, cfgFilters, schema);
                    pass[k] = r.pass;
                    // aggregation: right pane → Option_List_2 → code default; field: pane → line → Source_Field_N → default
                    const keys = propKeys(k);
                    const pickedSum = P[keys.sumField];
                    const pickedSumId = idOf(pickedSum, 'fld') ?? (typeof P[`${k}__rawSumField`] === 'string' ? (P[`${k}__rawSumField`] as string) : null);
                    const typedSum = typeof P[keys.sumFieldName] === 'string' ? (P[keys.sumFieldName] as string) : '';
                    const slot = AGG_SLOT[k];
                    const agg = pickAgg(
                        {mode: P[keys.agg], field: nameOf(pickedSum) || typedSum || schemaFieldName(schema, pickedSumId) || ''},
                        aggLines.byPill.get(k),
                        slot ? fp(slot) : '',
                        AGG_DEFAULT[k],
                        PHASE_PILLS.has(k),
                    );
                    let sumField: Field | null = null;
                    if (agg.mode === 'sum' && table) {
                        sumField = resolveFilterField(table, {fieldId: idOf(pickedSum, 'fld') ? pickedSumId : null, fieldName: agg.field}).field;
                        if (!sumField && pickedSumId) sumField = table.getFieldIfExists(pickedSumId);
                    }
                    const numbers = new Map<string, number | null>();
                    if (sumField && recs) {
                        for (const rec of recs) {
                            try {
                                numbers.set(rec.id, cellNumber(rec.getCellValue(sumField), rec.getCellValueAsString(sumField)));
                            } catch {
                                numbers.set(rec.id, null);
                            }
                        }
                    }
                    const reserved = k === 'sold' && !table;
                    preps.push({
                        key: k,
                        label: live.labels[k],
                        calc: {ids: table && recs ? recs.map(x => x.id) : null, pass: r.pass, agg: {...agg, field: sumField?.name ?? agg.field}, sumFieldOk: !!sumField, numbers},
                        filter: r.diag,
                        filterTitle: r.title,
                        hint: r.hint,
                        reserved,
                    });
                    sources.push({
                        label: `${live.labels[k]} · טבלה`,
                        table: table?.name ?? (p.defaultTable || null),
                        via: tableVia[k] ?? '—',
                        ok: !!table || reserved,
                        note: reserved ? `שמור לכרטיסים שנמכרו — «—» עד שתוגדר טבלה (חלונית / ${p.tableSlot})` : null,
                    });
                    if (agg.mode !== 'count')
                        sources.push({
                            label: `${live.labels[k]} · צבירה`,
                            table: table?.name ?? null,
                            field: agg.mode === 'sum' ? (sumField?.name ?? agg.field) || null : null,
                            via: `${agg.mode === 'sum' ? 'סכום' : 'נותרו'} · ${agg.via}`,
                            ok: reserved || agg.mode !== 'sum' || !!sumField,
                            note: agg.mode === 'sum' && !sumField && !reserved ? 'שדה הסכום לא נמצא / לא מופעל לאלמנט' : null,
                        });
                }
                if (slotsT) {
                    const sf: [string, Field | null | undefined, string, boolean][] = [
                        ['משבצות · התחלה (שעון)', f?.start, fp('Source_Field_4'), true],
                        ['משבצות · סטטוס', f?.status, fp('Source_Field_3'), true],
                        ['משבצות · סיום', f?.end, fp('Source_Field_5'), false],
                        ['קישור סרט↔משבצת', f?.films ?? filmSlotsF, fp('Source_Field_6'), false],
                        ['קישור משבצת↔פרויקט', f?.project ?? projectSlotsF, fp('Source_Field_8'), false],
                        ['שעון: קישור משבצת↔יום', f?.days, fp('Source_Field_11'), false],
                    ];
                    for (const [label, fld, want, required] of sf)
                        sources.push({label, table: slotsT.name, field: fld?.name ?? want, via: fld ? 'לפי שם' : 'לא נמצא', ok: !!fld || !required, note: !fld ? (required ? 'חובה לשעון' : 'רשות') : null});
                }
                sources.push({label: 'שעון: Festival Days · טבלה', table: daysT?.name ?? null, via: daysT ? 'Source_Table_7 / לפי שם' : 'לא נמצאה', ok: true, note: daysT ? null : 'בלי הטבלה: היום הראשון = Date_2 (כלל ישן)'});
                if (daysT) {
                    sources.push({label: 'שעון: מספר יום', table: daysT.name, field: dayNumF?.name ?? fp('Source_Field_10'), via: dayNumF ? 'לפי שם' : 'לא נמצא → לפי השם («Day 0» / «יום 0»)', ok: true, note: null});
                    sources.push({label: 'שעון: הערות היום («יום 0»)', table: daysT.name, field: dayNoteF?.name ?? 'Notes', via: dayNoteF ? 'לפי שם' : 'לא נמצא', ok: true, note: null});
                    sources.push({label: 'שעון: תאריך היום', table: daysT.name, field: dayDateF?.name ?? 'Date', via: dayDateF ? 'לפי שם' : 'לא נמצא', ok: !!dayDateF || !!f?.days, note: !dayDateF && !f?.days ? 'אין תאריך ואין קישור — אי אפשר לשייך משבצות ליום' : null});
                }
                if (aggLines.bad.length)
                    sources.push({label: 'Option_List_2', table: null, via: 'Extension_Config', ok: false, note: `שורות לא תקינות: ${aggLines.bad.join(', ')} (פורמט: tickets = sum: Tickets Given)`});
                const status = {
                    base,
                    on: isStatusOn(P[STATUS_TOGGLE_KEY]),
                    configTable: cfgTable,
                    configVia: cfgSrc.via,
                    slug: CONFIG_EXTENSION,
                    variant: '',
                    status: String(cfg.status),
                    record: cfg.record,
                    variantRecord: cfg.variantRecord,
                    fieldsUsed: CONFIG_FIELDS_USED,
                    sources,
                    filtersTitle: 'אריחים: סינון + צבירה (אותו חישוב שמוצג באריח)',
                    extraTitle: 'באריח',
                    error: configError,
                    notes: [`כותרת בפועל: ${live.title}`],
                    version: VERSION,
                };
                const source = readSource(slotsT, f, recsByPill.events);
                const allSlots = f?.status && recsByPill.events ? readCountSlots(recsByPill.events, f, live.statuses) : null;
                const input: CountsInput = {
                    slots: allSlots,
                    eventSlots: keepIds(allSlots, pass.events),
                    hasStart: !!f?.start,
                    films: keepIds(recsByPill.films ? readLinked(recsByPill.films, filmSlotsF) : null, pass.films),
                    filmsLinked: !!(f?.films || filmSlotsF),
                    projects: keepIds(recsByPill.projects ? readLinked(recsByPill.projects, projectSlotsF) : null, pass.projects),
                    projectsLinked: !!(f?.project || projectSlotsF),
                    invitations: null,
                    tickets: null,
                };
                const target = {days, targetDay, targetDayVia, clockStatuses: clockStatuses.list, clockStatusesVia: clockStatuses.via};
                return <Screen source={source} input={input} preps={preps} live={live} status={status} target={target} mappingOn={isMappingOn(P[MAPPING_TOGGLE_KEY])} edit={{on: isEditOn(P[EDIT_TOGGLE_KEY]), valueOf: s => cfg.raw(s as Slot)}} />;
            }}
        </AllRecs>
    );
}

/** Nested Recs for a fixed list of tables (each useRecords lives in its own component). */
function AllRecs({
    tables,
    children,
    acc = [],
}: {
    tables: readonly (Table | null)[];
    children: (r: (readonly AtRecord[] | null)[]) => ReactNode;
    acc?: (readonly AtRecord[] | null)[];
}) {
    if (acc.length === tables.length) return <>{children(acc)}</>;
    return (
        <Recs key={tables[acc.length]?.id ?? 'none'} table={tables[acc.length]}>
            {r => (
                <AllRecs tables={tables} acc={[...acc, r]}>
                    {children}
                </AllRecs>
            )}
        </Recs>
    );
}

/** Extension_Config Filter_N / Filter_Operator_N / Filter_Value_N (via the hook) → by table. No table/row → empty map. */
function readConfigFilters(cfg: ExtensionConfig) {
    if (cfg.status !== 'ok' && cfg.status !== 'duplicate') return configFiltersByTable(() => '');
    try {
        return configFiltersByTable(slot => cfg.raw(slot as Parameters<ExtensionConfig['raw']>[0]));
    } catch {
        return configFiltersByTable(() => '');
    }
}

type PillFilterResult = {
    pass: ReadonlySet<string> | null;
    title: string | null;
    hint: string | null;
    diag: PillFilterDiag & {matched?: number | null; total?: number | null};
};

const OP_LABEL = (op: unknown) => FILTER_OPS.find(o => o.value === op)?.label ?? (op ? String(op) : 'ללא סינון');

/** Resolve + apply the pill's fixed filter(s) on its own table. Missing field → ignored + Hebrew hint; never throws. */
function pillFilter(
    k: PillKey,
    table: Table | null,
    recs: readonly AtRecord[] | null,
    P: {[key: string]: unknown},
    cfg: ReturnType<typeof configFiltersByTable>,
    schema: EditSchema | null,
): PillFilterResult {
    const keys = propKeys(k);
    const opRaw = P[keys.op];
    const baseDiag = {
        table: table ? table.name : null,
        field: null as string | null,
        via: '—',
        op: OP_LABEL(opRaw),
        values: matchValues(P[keys.value]),
        matched: null as number | null,
        total: recs ? recs.length : null,
    };
    if (!table) {
        const want = defaultTableName(k);
        const inBase = schema ? Object.values(schema).some(t => looseKey(t.name) === looseKey(want)) : false;
        const hint = parseOp(opRaw, 'none') !== 'none' ? `הטבלה ${want} לא מופעלת לאלמנט${inBase ? ' (קיימת בבסיס)' : ''} — הסינון לא הופעל` : null;
        return {pass: null, title: null, hint, diag: {...baseDiag, table: want ? `${want} ✗` : null, via: want ? '—' : 'לא הוגדר (שמור)'}};
    }
    try {
        const picked = P[keys.field];
        const pickedId = idOf(picked, 'fld');
        const rawId = typeof P[`${k}__rawField`] === 'string' ? (P[`${k}__rawField`] as string) : null;
        const typed = typeof P[keys.fieldName] === 'string' ? (P[keys.fieldName] as string) : '';
        let field: {id: string; name: string} | null = pickedId ? {id: pickedId, name: nameOf(picked)} : null;
        let via = pickedId ? 'חלונית' : '—';
        let hiddenHint: string | null = null;
        if (!field && (rawId || typed.trim())) {
            // SDK gave no field object although one was saved → resolve it ourselves (id, then name)
            const r = resolveFilterField(table, {fieldId: rawId, fieldName: typed, schemaName: schemaFieldName(schema, rawId)});
            if (r.field) {
                field = {id: r.field.id, name: r.field.name};
                via = r.via === 'id' ? 'חלונית (לפי מזהה)' : 'חלונית (לפי שם)';
            } else hiddenHint = r.hint;
        }
        const paneActive = parseOp(opRaw, 'none') !== 'none';
        if (paneActive && !field && hiddenHint) {
            return {pass: null, title: null, hint: hiddenHint, diag: {...baseDiag, field: schemaFieldName(schema, rawId) ?? rawId ?? typed, via: 'לא מופעל ✗'}};
        }
        const pane = {field, fieldName: '', op: opRaw, value: P[keys.value]};
        const conf = cfg.get(norm(table.name)) ?? cfg.get(norm(defaultTableName(k))) ?? [];
        const picks = pickFilters(pane, conf);
        const res = applyFilters(
            recs,
            picks.filters,
            spec =>
                (spec.fieldId ? table.getFieldIfExists(spec.fieldId) : null) ??
                resolveFilterField(table, {fieldName: spec.fieldName}).field,
            (r, fl: Field) => ({raw: r.getCellValue(fl), text: r.getCellValueAsString(fl)}),
            table.name,
        );
        const hints = [...(picks.hint ? [picks.hint] : []), ...res.hints];
        const first = picks.filters[0];
        return {
            pass: res.pass,
            title: res.title,
            hint: hints.length ? hints.join(' · ') : null,
            diag: {
                ...baseDiag,
                field: first ? first.fieldName : field?.name ?? null,
                via: first ? (first.source === 'config' ? 'Extension_Config' : via) : via,
                op: first ? OP_LABEL(first.op) : baseDiag.op,
                values: first ? first.values : baseDiag.values,
                matched: res.pass ? res.pass.size : recs ? recs.length : null,
            },
        };
    } catch (e) {
        return {pass: null, title: null, hint: null, diag: {...baseDiag, via: `שגיאה: ${e instanceof Error ? e.message : String(e)}`}};
    }
}

type SlotFields = {start: Field | null; end: Field | null; status: Field | null; films: Field | null; project: Field | null; days?: Field | null};

function readSource(table: Table | null, f: SlotFields | null, recs: readonly AtRecord[] | null): SlotsSource {
    if (!table || !f) return {kind: 'noTable'};
    const missing = (['start', 'status'] as const).filter(k => !f[k]).map(k => FIELD_ALIASES[k][0]);
    if (missing.length) return {kind: 'noFields', missing};
    if (!recs) return {kind: 'loading'};
    try {
        return {
            kind: 'ok',
            slots: recs.map(
                (r): SlotInput => ({
                    name: safeName(r),
                    startMs: f.start ? parseDateMs(r.getCellValue(f.start)) : null,
                    endMs: f.end ? parseDateMs(r.getCellValue(f.end)) : null,
                    status: f.status ? r.getCellValueAsString(f.status) : null,
                    dayIds: f.days ? linkIds(r.getCellValue(f.days)) : undefined,
                }),
            ),
        };
    } catch {
        return {kind: 'ok', slots: []};
    }
}

/** v0.4.9: Festival Days rows → {id, name, dayNum, dateIso}. Day number: number cell, else «Day N» in the cell text. */
function readDays(recs: readonly AtRecord[], numF: Field | null, dateF: Field | null, noteF: Field | null = null): FestivalDayInput[] {
    const out: FestivalDayInput[] = [];
    for (const r of recs) {
        try {
            let dayNum: number | null = null;
            if (numF) {
                const v = r.getCellValue(numF);
                dayNum = typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : dayNumberInName(r.getCellValueAsString(numF));
            }
            let dateIso: string | null = null;
            if (dateF) {
                const v = r.getCellValue(dateF);
                const sv = typeof v === 'string' ? v : '';
                dateIso = /^\d{4}-\d{2}-\d{2}$/.test(sv) ? sv : sv ? (Number.isFinite(Date.parse(sv)) ? israelDate(Date.parse(sv)) : null) : null;
            }
            const note = noteF ? r.getCellValueAsString(noteF) : '';
            out.push({id: r.id, name: safeName(r), dayNum, dateIso, note});
        } catch {
            /* skip unreadable row */
        }
    }
    return out;
}

function readCountSlots(recs: readonly AtRecord[], f: SlotFields, statuses: readonly string[]): CountSlot[] | null {
    try {
        return recs.map(r => {
            const status = f.status ? r.getCellValueAsString(f.status) : '';
            return {
                id: r.id,
                startMs: f.start ? parseDateMs(r.getCellValue(f.start)) : null,
                scheduled: isScheduledStatus(status, statuses),
                cancelled: isCancelledStatus(status),
                filmIds: f.films ? linkIds(r.getCellValue(f.films)) : [],
                projectIds: f.project ? linkIds(r.getCellValue(f.project)) : [],
            };
        });
    } catch {
        return null;
    }
}

function readLinked(recs: readonly AtRecord[], link: Field | null): LinkedRec[] | null {
    try {
        return recs.map(r => ({id: r.id, slotIds: link ? linkIds(r.getCellValue(link)) : []}));
    } catch {
        return null;
    }
}

function clockTitle(t: TargetResult): string {
    const parts = [t.label, t.slotLine, t.hint].filter(Boolean);
    if (t.phase === 'fallback') parts.unshift(`יעד קבוע · ${formatSlotWhen(t.targetMs)}`);
    return parts.join(' — ');
}

function Screen({
    source,
    input,
    preps,
    live,
    status,
    mappingOn,
    edit,
    target,
}: {
    /** v0.4.9: Day N target inputs */
    target: {days: FestivalDayInput[] | null; targetDay: number; targetDayVia: string; clockStatuses: string[]; clockStatusesVia: string};
    source: SlotsSource;
    input: CountsInput;
    preps: readonly PillPrep[];
    live: Live;
    status: Omit<Parameters<typeof StatusPanel>[0], 'filters'>;
    /** v0.4.6: right-pane «show mapping · Extension_Config.Attachment_Mapping_Image» */
    mappingOn: boolean;
    /** v0.4.7: right-pane «עריכה ישירה · Extension_Config» — writes ONLY the matched config row's cell */
    edit: {on: boolean; valueOf: (slot: string) => string};
}) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const t = computeTarget(source, now, {...live.targetOpts, days: target.days, targetDay: target.targetDay, clockStatuses: target.clockStatuses});
    const ti = t.info;
    const viaHe: Record<string, string> = {number: 'לפי שדה מספר יום', name: 'לפי שם היום', note: 'לפי הערות היום', date: 'לפי התאריך (Date_2)', earliest: 'גיבוי: היום המוקדם ביותר'};
    const brief = (x: {name: string; startMs: number; status: string | null}) => `«${x.name}» ${formatSlotWhen(x.startMs)} · ${x.status || 'ללא סטטוס'}`;
    // v0.4.10: every step of the clock target, one line each (the owner 14:45)
    const targetNotes: string[] = target.days
        ? ti
            ? [
                  `שעון 1 · יום ${ti.wanted} (${target.targetDayVia}) → ${ti.dayLabel ? `«${ti.dayLabel}»${ti.dayDate ? ` (${ti.dayDate.slice(8, 10)}.${ti.dayDate.slice(5, 7)})` : ''} — ${viaHe[ti.dayVia ?? ''] ?? ''}` : 'לא נמצא'}`,
                  `שעון 2 · ניסיונות: ${ti.dayTried.join(' → ')}`,
                  `שעון 3 · סטטוס: ${ti.statusFilter} (${target.clockStatusesVia}) · ${ti.onDay} משבצות מתאימות ביום · דולגו: ${ti.skipped.status} סטטוס אחר, ${ti.skipped.cancelled} בוטל, ${ti.skipped.allDay} כל-היום, ${ti.skipped.noStart} מקושרות בלי Start${ti.skipped.linkMismatch ? ` · ⚠ ${ti.skipped.linkMismatch} משבצות שהקישור ליום לא תואם לתאריך ה-Start (נקבע לפי Start)` : ''}`,
                  `שעון 4 · משבצת נבחרת: ${ti.slotName && ti.slotStartMs !== null ? brief({name: ti.slotName, startMs: ti.slotStartMs, status: ti.slotStatus}) : `— (${t.hint ?? ''})`}`,
                  `שעון 5 · הבאות בתור: ${ti.runnersUp.length ? ti.runnersUp.map(brief).join(' ; ') : '—'}`,
              ]
            : [`שעון: ${t.hint ?? t.label ?? ''}`]
        : ['שעון: אין טבלת Festival Days → כלל ישן (Date_2 + Option_List_1)'];
    const statusWithTarget = {...status, notes: [...(status.notes ?? []), ...targetNotes]};
    const clock = t.zero ? {days: 0, hours: 0, minutes: 0} : splitDuration(t.targetMs - now);
    // 'remaining' mode only (opt-in): v0.4.4 phase logic over the filtered sets
    const c = computeCounts(input, t.phase, now);
    // ONE computed result per pill → the pill AND the «מצב חיבור» row (v0.4.5, the owner 10:29)
    const pills = buildPills(preps, {films: c.films, events: c.events, projects: c.projects});
    const byKey = new Map(pills.map(p => [p.key, p]));
    const pill = (k: PillKey) => {
        const x = byKey.get(k)!;
        return {key: k, label: x.label, value: x.value, filterTitle: x.filterTitle, hint: x.hint};
    };

    return (
        <CountdownView
            title={live.title}
            clock={clock}
            unitLabels={live.units}
            clockTitle={clockTitle(t)}
            endedLine={t.phase === 'ended' ? t.label : null}
            programme={[pill('films'), pill('events'), pill('projects')]}
            people={[pill('invitations'), pill('tickets'), pill('sold')]}
            version={VERSION}
            colors={live.colors}
            configNote={live.configNote}
            statusPanel={
                <>
                    <StatusPanel {...statusWithTarget} filters={pills.map(p => p.row)} />
                    <MappingPanel on={mappingOn} configTable={status.configTable} record={status.record} variantRecord={status.variantRecord} slug={status.slug} />
                    <ConfigEditor
                        on={edit.on}
                        configTable={status.configTable}
                        record={status.record}
                        variantRecord={status.variantRecord}
                        slug={status.slug}
                        variant={status.variant}
                        slots={EDIT_SLOTS}
                        valueOf={edit.valueOf}
                        docs={HOOK_DOCS as {[slot: string]: string | undefined}}
                    />
                </>
            }
        />
    );
}

initializeBlock({interface: () => <Root />});
