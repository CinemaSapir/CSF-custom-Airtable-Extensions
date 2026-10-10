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
    TICKETS_TABLE_ALIASES,
    computeCounts,
    linkIds,
    type CountSlot,
    type CountsInput,
    type LinkedRec,
} from './counts';
import {CountdownView, safeHex, type DiagData, type DiagPill, type PillData, type ViewColors} from './view';
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
    tickets: TICKETS_TABLE_ALIASES,
};
const PILL_LABEL: Record<PillKey, string> = {
    films: D.Content_Text_3,
    events: D.Content_Text_4,
    projects: D.Content_Text_5,
    invitations: D.Content_Text_2,
    tickets: D.Content_Text_1,
};
const defaultTableName = (k: PillKey) => PILLS.find(p => p.key === k)!.defaultTable;

/** Right-pane properties (top-level → stable identity). Per pill: table · field · operator · value. */
function getCustomProperties(base: Base) {
    try {
        const cfgT = findConfigTable(base);
        const cfgProp = {
            key: 'configTable',
            label: 'טבלת הגדרות (Extension_Config) — גיבוי לחלונית',
            type: 'table' as const,
            defaultValue: cfgT ?? undefined,
        };
        return [cfgProp, ...PILLS.flatMap(p => {
            const keys = propKeys(p.key);
            const labels = propLabels(PILL_LABEL[p.key], p.key);
            const t = findTable(base, p.defaultTable, PILL_TABLE_ALIASES[p.key]);
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
            ];
        })];
    } catch {
        return [];
    }
}

/** CONFIG_DEFAULTS as the hook's code-default layer (Date_2 = Israel midnight of the first day). */
// v0.4.4: DST-aware — 31.10 00:00 Israel = 30.10 22:00Z (UTC+2 after 25.10); v0.4.1–0.4.3 used +03:00 → 30.10 23:00 Israel.
const HOOK_DEFAULTS: ConfigDefaults = {...D, Date_2: new Date(israelMidnightMs(D.Date_2)).toISOString()} as ConfigDefaults;
const HOOK_DOCS: SlotDocs = {
    Title: 'כותרת מעל השעון',
    Content_Text_1: 'תווית אריח כרטיסים',
    Content_Text_2: 'תווית אריח הזמנות',
    Content_Text_3: 'תווית אריח סרטים',
    Content_Text_4: 'תווית אריח אירועים',
    Content_Text_5: 'תווית אריח מסגרות תוכן',
    Content_Text_6: 'יחידה: ימים',
    Content_Text_7: 'יחידה: שעות',
    Content_Text_8: 'יחידה: דקות',
    Source_Table_1: 'טבלת כרטיסים (ספירה)',
    Source_Table_2: 'טבלת הזמנות (ספירה)',
    Source_Table_3: 'טבלת המשבצות (שעון + אירועים)',
    Source_Table_4: 'טבלת סרטים',
    Source_Table_5: 'טבלת מסגרות תוכן',
    Source_Field_3: 'סטטוס משבצת',
    Source_Field_4: 'התחלה',
    Source_Field_5: 'סיום',
    Source_Field_6: 'קישור סרט↔משבצת',
    Source_Field_8: 'קישור משבצת↔פרויקט',
    Option_List_1: 'סטטוסים שנחשבים «משובץ» (שורה לכל ערך)',
    Date_1: 'יעד גיבוי',
    Date_2: 'היום הראשון של הפסטיבל',
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
        try {
            const raw = globalConfig.get(propKeys(p.key).field);
            P[`${p.key}__rawField`] = typeof raw === 'string' ? raw : null;
        } catch {
            P[`${p.key}__rawField`] = null;
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
            <CountdownScreen P={P} cfgSrc={cfgSrc} configError={error} />
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
    ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => `Content_Text_${n}`),
    ...[1, 2, 3, 4, 5].map(n => `Source_Table_${n}`),
    ...[3, 4, 5, 6, 8].map(n => `Source_Field_${n}`),
    'Option_List_1', 'Date_1', 'Date_2',
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
            tickets: t('Content_Text_1', D.Content_Text_1),
        },
        units: [t('Content_Text_6', D.Content_Text_6), t('Content_Text_7', D.Content_Text_7), t('Content_Text_8', D.Content_Text_8)],
        statuses,
        targetOpts: {fallbackMs: dms('Date_1'), firstDay: d2 !== null ? israelDate(d2) : null, statuses},
        colors: {accent: c('Color_1'), bg: c('Color_2'), wave: [c('Color_3'), c('Color_4'), c('Color_5'), c('Color_6'), c('Color_7')]},
        configNote: STATUS_NOTE[cfg.status] ?? String(cfg.status),
    };
}

const PILL_SOURCE_TABLE: Record<PillKey, 'Source_Table_1' | 'Source_Table_2' | 'Source_Table_3' | 'Source_Table_4' | 'Source_Table_5'> = {
    films: 'Source_Table_4',
    events: 'Source_Table_3',
    projects: 'Source_Table_5',
    invitations: 'Source_Table_2',
    tickets: 'Source_Table_1',
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

function CountdownScreen({P, cfgSrc, configError}: {P: {[key: string]: unknown}; cfgSrc: ConfigSource; configError: string | null}) {
    const base = useBase();
    const cfg = useExtensionConfig();
    const live = readLive(cfg);
    /** Right pane → Extension_Config Source_Table_N (cell, else code default) → aliases. */
    const pillTable = (k: PillKey): Table | null => {
        const id = idOf(P[propKeys(k).table], 'tbl');
        const pane = id ? base.getTableByIdIfExists(id) : null;
        if (pane) return pane;
        let fromCfg: Table | null = null;
        try {
            fromCfg = cfg.table(PILL_SOURCE_TABLE[k]);
        } catch {
            fromCfg = null;
        }
        return fromCfg ?? findTable(base, defaultTableName(k), PILL_TABLE_ALIASES[k]);
    };
    /** Source_Field_N (Table.Field) → field name part; a bad/empty cell falls back to the code default. */
    const fp = (slot: 'Source_Field_3' | 'Source_Field_4' | 'Source_Field_5' | 'Source_Field_6' | 'Source_Field_8') => {
        try {
            return fieldPart(cfg.raw(slot) || D[slot]);
        } catch {
            return fieldPart(D[slot]);
        }
    };
    const slotsT = pillTable('events');
    const filmsT = pillTable('films');
    const projectsT = pillTable('projects');
    const invitesT = pillTable('invitations');
    const ticketsT = pillTable('tickets');
    const tablesByPill: Record<PillKey, Table | null> = {
        films: filmsT,
        events: slotsT,
        projects: projectsT,
        invitations: invitesT,
        tickets: ticketsT,
    };

    const f = slotsT
        ? {
              start: findByLooseName(slotsT.fields, [fp('Source_Field_4'), ...FIELD_ALIASES.start]),
              end: findByLooseName(slotsT.fields, [fp('Source_Field_5'), ...FIELD_ALIASES.end]),
              status: findByLooseName(slotsT.fields, [fp('Source_Field_3'), ...FIELD_ALIASES.status]),
              films: findLink(slotsT, SLOT_FILM_LINK_ALIASES),
              project: findLink(slotsT, [fp('Source_Field_8'), ...SLOT_PROJECT_LINK_ALIASES]),
          }
        : null;
    const filmSlotsF = findLink(filmsT, [fp('Source_Field_6'), ...FILM_SLOT_LINK_ALIASES]);
    const projectSlotsF = findLink(projectsT, PROJECT_SLOT_LINK_ALIASES);

    return (
        <AllRecs tables={[slotsT, filmsT, projectsT, invitesT, ticketsT]}>
            {([slotRecs, filmRecs, projectRecs, inviteRecs, ticketRecs]) => {
                const recsByPill: Record<PillKey, readonly AtRecord[] | null> = {
                    films: filmRecs,
                    events: slotRecs,
                    projects: projectRecs,
                    invitations: inviteRecs,
                    tickets: ticketRecs,
                };
                const cfgFilters = readConfigFilters(cfg);
                const pass = {} as Record<PillKey, ReadonlySet<string> | null>;
                const meta = {} as Record<PillKey, Pick<PillData, 'filterTitle' | 'hint'>>;
                const schema = editSchema(base);
                const diagPills: DiagPill[] = [];
                for (const p of PILLS) {
                    const r = pillFilter(p.key, tablesByPill[p.key], recsByPill[p.key], P, cfgFilters, schema);
                    pass[p.key] = r.pass;
                    meta[p.key] = {filterTitle: r.title, hint: r.hint};
                    diagPills.push({...r.diag, key: p.key, label: live.labels[p.key]});
                }
                const visibleCfg = cfg.debug?.visibleFields ?? [];
                const diag: DiagData = {
                    editMode: cfgSrc.editMode,
                    config: {
                        found: !!cfg.debug?.tableName,
                        via: cfgSrc.via,
                        tableName: cfg.debug?.tableName ?? null,
                        hiddenInBase: cfgSrc.hiddenInBase,
                        status: cfg.status,
                        rowCount: cfg.debug?.rowCount ?? null,
                        matched: cfg.debug?.matchedExtension ?? null,
                        extensionValues: cfg.debug?.extensionValues ?? [],
                        missingFields: cfg.debug?.tableName ? CONFIG_FIELDS_USED.filter(n => !visibleCfg.includes(n)) : [],
                        visibleFields: visibleCfg,
                        title: live.title,
                        error: configError,
                    },
                    tables: {
                        visible: base.tables.map(t => `${t.name} (${t.fields.length})`),
                        hidden: schema
                            ? Object.values(schema)
                                  .filter(t => !base.getTableByIdIfExists(t.id))
                                  .map(t => t.name)
                            : [],
                    },
                    pills: diagPills,
                };
                const source = readSource(slotsT, f, slotRecs);
                const allSlots = f?.status && slotRecs ? readCountSlots(slotRecs, f, live.statuses) : null;
                const input: CountsInput = {
                    slots: allSlots,
                    eventSlots: keepIds(allSlots, pass.events),
                    hasStart: !!f?.start,
                    films: keepIds(filmRecs ? readLinked(filmRecs, filmSlotsF) : null, pass.films),
                    filmsLinked: !!(f?.films || filmSlotsF),
                    projects: keepIds(projectRecs ? readLinked(projectRecs, projectSlotsF) : null, pass.projects),
                    projectsLinked: !!(f?.project || projectSlotsF),
                    invitations: inviteRecs ? countPass(inviteRecs, pass.invitations) : null,
                    tickets: ticketRecs ? countPass(ticketRecs, pass.tickets) : null,
                };
                return <Screen source={source} input={input} meta={meta} live={live} diag={diag} />;
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

function countPass(recs: readonly AtRecord[], pass: ReadonlySet<string> | null): number {
    return pass ? recs.filter(r => pass.has(r.id)).length : recs.length;
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
    diag: Omit<DiagPill, 'key' | 'label'>;
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
        return {pass: null, title: null, hint, diag: {...baseDiag, table: `${want} ✗`}};
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

type SlotFields = {start: Field | null; end: Field | null; status: Field | null; films: Field | null; project: Field | null};

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
                }),
            ),
        };
    } catch {
        return {kind: 'ok', slots: []};
    }
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
    meta,
    live,
    diag,
}: {
    source: SlotsSource;
    input: CountsInput;
    meta: Record<PillKey, Pick<PillData, 'filterTitle' | 'hint'>>;
    live: Live;
    diag: DiagData;
}) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const t = computeTarget(source, now, live.targetOpts);
    const clock = t.zero ? {days: 0, hours: 0, minutes: 0} : splitDuration(t.targetMs - now);
    const c = computeCounts(input, t.phase, now);

    return (
        <CountdownView
            title={live.title}
            clock={clock}
            unitLabels={live.units}
            clockTitle={clockTitle(t)}
            endedLine={t.phase === 'ended' ? t.label : null}
            programme={[
                {key: 'films', ...meta.films, label: live.labels.films, value: c.films},
                {key: 'events', ...meta.events, label: live.labels.events, value: c.events},
                {key: 'projects', ...meta.projects, label: live.labels.projects, value: c.projects},
            ]}
            people={[
                {key: 'invitations', ...meta.invitations, label: live.labels.invitations, value: c.invitations},
                {key: 'tickets', ...meta.tickets, label: live.labels.tickets, value: c.tickets},
            ]}
            version={VERSION}
            colors={live.colors}
            configNote={live.configNote}
            diag={diag}
        />
    );
}

initializeBlock({interface: () => <Root />});
