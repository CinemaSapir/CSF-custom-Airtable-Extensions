/**
 * v3.4 (countdown v0.4.8, 13:22): Extension / Variant fields and values matched even more loosely (see looseName).
 * csf-countdown copy (v0.4.1): Door 2 is OPT-IN (`writes: true`) and OFF here → strictly read-only (the owner 23:58);
 *   the provider also finds the table loosely (findConfigTable). Otherwise identical to csf-extension-config v3.
 *
 * useExtensionConfig v3 — shared "two-door" config hook for CSF Airtable interface extensions.
 *
 * v3 (Critic's timeline config-fit review): Toggle_Label_1–10, Filter_6–10, Me_Field, Dropdown_6–10, Option_List_6–10,
 *   multi-field filters ("A.x | B.y"), value tokens (@me @today @now @Date_N±Nd/h), Advanced_JSON filter map,
 *   icon/colour parts of Option_List optional (blank = render nothing).
 *
 * Table: Extension_Config (269 fields). One DEFAULT row per extension (Variant empty) + optional
 * VARIANT rows (same Extension, Variant = page/mode key, e.g. "mine", "by-day").
 *
 *   Door 1 (table → extension, live): value = variant cell → default-row cell → code default.
 *   Door 2 (extension → table, once per page load when Code_Version changed / row missing, user may write):
 *       - default row missing → create it with every code default,
 *       - variant row missing → create it with identity only (empty cells inherit the default row),
 *       - fill ONLY empty cells, ONLY for slots new in this version (not listed in the row's old Slot_Map),
 *         toggles of a variant row are materialised with the value currently in effect,
 *       - NEVER overwrite a non-empty cell (the owner's rule),
 *       - rewrite the code-owned fields: Slot_Map, Code_Version, Last_Synced, Sync_Note (+ Block_ID if empty).
 *
 * Reference rule (everywhere in the table): "Table.Field" — e.g. "Slots_Events.Status".
 *   - "Table" alone = a table; "Field" alone = a field in the slot's own table (Source_Table_N / Source_Table_1);
 *   - names match loosely (case, spaces, _ - . and nikud ignored), exact names first;
 *   - ids also accepted: "tbl…", "fld…", "tbl….fld…".
 *
 * Toggle_N = the DEFAULT state of an in-page toggle (checked = starts ON). A user's own flip is remembered by
 *   the extension (use initialToggle()) and wins over the default. Toggle_Label_N = its label in the page.
 * Dropdown_N / Filter_N / Toggle_N with an empty *_Label_N are NOT shown: they act as a fixed setting / fixed filter.
 *
 * Filters (Filter_1–10 + Advanced_JSON "filters"):
 *   - Filter_N may name SEVERAL fields joined by "|" — one per table, e.g.
 *       "Slots_Events.Location | Staffing.Location (from Slot) | Tasks.Location".
 *     A record of table T is tested against the part whose table is T. Records of a table with no part are KEPT
 *     (unmatched: "keep"), unless Advanced_JSON filterMap says "hide". The hook never follows links: to filter a
 *     table by a linked record's field, add a lookup field in that table and name it here.
 *   - Filter_Value_N: several values joined by "|". is / contains = any of them; is not / does not contain = none of them.
 *   - Value tokens: @me (signed-in user, see Me_Field), @today, @now, @Date_N with optional offset
 *     (@Date_1-1d, @now+2h). Tokens are case-insensitive. A date token that can't be resolved drops the filter.
 *   - Me_Field (one per row): Table.Field that maps the signed-in Airtable user to a person record, e.g. People.User
 *     (collaborator) or People.Email. "@me" on a collaborator field compares to the user directly; on a link to that
 *     table it compares to the matched person records' ids (component loads them: meRecordIds()).
 *   - Advanced_JSON filter map (all keys optional; anything else in the JSON is the extension's own business):
 *       {
 *         "filters":   [{"field": "Tasks.Status", "operator": "is not", "value": "בוטלה|הועברה לאחר", "label": ""}],
 *         "filterMap": {"1": {"fields": ["Staffing.Location (from Slot)"], "unmatched": "hide"}}
 *       }
 *     "filters" = extra filters after Filter_10 (n = 11, 12, …; same rules, label empty = hidden fixed).
 *     "filterMap"."N" = more fields for Filter_N (added to the "|" list) and what to do with tables it doesn't name.
 *     Malformed keys are ignored and reported in Sync_Note.
 *
 * Option_List line: "value | label | colour | icon" — only value is required. Blank label = value; blank colour /
 *   icon = render NOTHING (no placeholder dot or emoji). A trailing "|" is fine. "#" lines are comments.
 *
 * Drop this file into <ext>/frontend/ and add custom properties:
 *   {key: 'configTable',   label: 'טבלת הגדרות (Extension_Config)', type: 'table', defaultValue: base.getTableByNameIfExists(CONFIG_TABLE_NAME) ?? undefined}
 *   {key: 'configSlug',    label: 'מפתח הגדרות (Extension)',        type: 'string', defaultValue: '<default-slug>'}
 *   {key: 'configVariant', label: 'גרסת עמוד (Variant, ריק = ברירת מחדל)', type: 'string', defaultValue: ''}
 * Enable Extension_Config + ALL its fields on the element. Door 2 also needs record create/edit on it.
 */
import {createContext, createElement, useContext, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {useRecords} from '@airtable/blocks/interface/ui';
import type {Base, Field, Record as AirtableRecord, Table} from '@airtable/blocks/interface/models';

export const CONFIG_TABLE_NAME = 'Extension_Config';

// ---------------------------------------------------------------------------
// Slot catalogue — MUST match the Omni prompt (FIELD_ORDER.length === 269)
// ---------------------------------------------------------------------------
type N2 = 1 | 2;
type N3 = N2 | 3;
type N5 = N3 | 4 | 5;
type N10 = N5 | 6 | 7 | 8 | 9 | 10;
type N15 = N10 | 11 | 12 | 13 | 14 | 15;
type N20 = N15 | 16 | 17 | 18 | 19 | 20;

const range = (prefix: string, n: number) => Array.from({length: n}, (_, i) => `${prefix}_${i + 1}`);

export type TextSlot =
    | 'Title'
    | `Heading_${N5}`
    | `Table_Heading_${N10}`
    | `Helper_Text_${N10}`
    | `Content_Text_${N15}`
    | `Tab_Label_${N10}`
    | `Button_Text_${N10}`
    | `Empty_State_Text_${N5}`
    | `Error_Text_${N5}`
    | `Toggle_Label_${N10}`
    | `Filter_Value_${N10}`
    | `Filter_Label_${N10}`
    | `Dropdown_Label_${N10}`
    | `Dropdown_Default_${N10}`
    | `Color_${N10}`
    | `Icon_${N10}`
    | `URL_${N5}`;
export type TableSlot = `Source_Table_${N10}`;
/** cells holding a "Table.Field" reference */
export type RefSlot = `Source_Field_${N20}` | `Filter_${N10}` | `Sort_${N2}` | `Dropdown_${N10}` | 'Me_Field';
export type SelectSlot = `Filter_Operator_${N10}` | `Sort_Direction_${N2}`;
export type OptionSlot = `Option_List_${N10}`;
export type DateSlot = `Date_${N5}`;
export type NumberSlot = `Number_${N10}` | `Goal_${N5}`;
export type ToggleSlot = `Toggle_${N10}`;
/** stored in seconds */
export type DurationSlot = `Duration_${N3}`;
export type AttachmentSlot = `Attachment_${N3}`;
export type JsonSlot = 'Advanced_JSON';
export type Slot =
    | TextSlot
    | TableSlot
    | RefSlot
    | SelectSlot
    | OptionSlot
    | DateSlot
    | NumberSlot
    | ToggleSlot
    | DurationSlot
    | AttachmentSlot
    | JsonSlot;

/** Identity / code-owned / human-only fields */
export const F = {
    extension: 'Extension',
    variant: 'Variant',
    displayName: 'Display_Name',
    blockId: 'Block_ID',
    useDefaultsOnly: 'Use_Defaults_Only',
    owner: 'Owner',
    slotMap: 'Slot_Map',
    codeVersion: 'Code_Version',
    lastSynced: 'Last_Synced',
    syncNote: 'Sync_Note',
    notes: 'Notes',
} as const;

/** v3.2 (2026-10-10): human-maintained reference fields, read-only (the code never writes them). Deliberately NOT part of the
 *  269-slot FIELD_ORDER, so the Omni prompt order, FIELD_ORDER.length and the Slot_Map sort stay exactly as they were. */
export const EXTRA_FIELDS = {mappingImage: 'Attachment_Mapping_Image', githubUrl: 'GitHub_URL'} as const;
/** v3.3 (2026-10-10 12:57): the mapping field was renamed Mapping_Image → Attachment_Mapping_Image; the old name is still read
 *  (loose) as a fallback so tables that were not renamed yet keep working. Not part of KNOWN_FIELDS. */
export const LEGACY_FIELDS = {mappingImage: 'Mapping_Image'} as const;

const triple = (n: number, ...prefixes: string[]) =>
    Array.from({length: n}, (_, i) => prefixes.map(p => (p.includes('#') ? p.replace('#', String(i + 1)) : `${p}_${i + 1}`))).flat();

/** Exact field order of the table (= Omni prompt order). */
export const FIELD_ORDER: readonly string[] = [
    // 1 identity & control (6)
    F.extension, F.variant, F.displayName, F.blockId, F.useDefaultsOnly, F.owner,
    // 2 the owner's stencil (41)
    'Title', ...range('Heading', 5), ...range('Table_Heading', 10), ...range('Helper_Text', 10), ...range('Content_Text', 15),
    // 3 interface texts (30)
    ...range('Tab_Label', 10), ...range('Button_Text', 10), ...range('Empty_State_Text', 5), ...range('Error_Text', 5),
    // 4 sources (30)
    ...range('Source_Table', 10), ...range('Source_Field', 20),
    // 5 filters & sort (45)
    ...triple(10, 'Filter', 'Filter_Operator', 'Filter_Value', 'Filter_Label'), ...triple(2, 'Sort', 'Sort_Direction'), 'Me_Field',
    // 6 dropdowns & option lists (40)
    ...triple(10, 'Dropdown', 'Dropdown_Label', 'Dropdown_Default'), ...range('Option_List', 10),
    // 7 look (20)
    ...range('Color', 10), ...range('Icon', 10),
    // 8 links & media (8)
    ...range('URL', 5), ...range('Attachment', 3),
    // 9 values (43)
    ...range('Date', 5), ...range('Number', 10), ...range('Goal', 5), ...range('Toggle', 10), ...range('Toggle_Label', 10), ...range('Duration', 3),
    // 10 advanced (1)
    'Advanced_JSON',
    // 11 code-owned (4)
    F.slotMap, F.codeVersion, F.lastSynced, F.syncNote,
    // 12 free (1)
    F.notes,
];
/** Every field name the hook knows: the 269 slots in table order, then the v3.2 read-only extras (appended, never sorted in). */
export const KNOWN_FIELDS: readonly string[] = [...FIELD_ORDER, ...Object.values(EXTRA_FIELDS).filter(n => !FIELD_ORDER.includes(n))];

type Kind = 'text' | 'table' | 'ref' | 'select' | 'options' | 'date' | 'number' | 'toggle' | 'duration' | 'attachment' | 'json';
function kindOf(slot: string): Kind {
    if (/^Source_Table_\d+$/.test(slot)) return 'table';
    if (/^(Source_Field|Filter|Sort|Dropdown)_\d+$/.test(slot) || slot === 'Me_Field') return 'ref';
    if (/^(Filter_Operator|Sort_Direction)_\d+$/.test(slot)) return 'select';
    if (/^Option_List_\d+$/.test(slot)) return 'options';
    if (/^Date_\d+$/.test(slot)) return 'date';
    if (/^(Number|Goal)_\d+$/.test(slot)) return 'number';
    if (/^Toggle_\d+$/.test(slot)) return 'toggle';
    if (/^Duration_\d+$/.test(slot)) return 'duration';
    if (/^Attachment_\d+$/.test(slot)) return 'attachment';
    if (slot === 'Advanced_JSON') return 'json';
    return 'text';
}

export const FILTER_OPERATORS = [
    'is', 'is not', 'contains', 'does not contain', 'is empty', 'is not empty',
    'is before', 'is after', 'greater than', 'less than', 'is checked', 'is not checked',
] as const;
export type FilterOperator = (typeof FILTER_OPERATORS)[number];

/**
 * Code defaults per slot. Texts/tables/refs/selects/options/dates(ISO with offset): string.
 * Numbers/Goals: number. Durations: seconds. Toggles: boolean (= default ON/OFF of the in-page toggle).
 * Advanced_JSON: any JSON value. Attachments have no code default.
 */
export type ConfigDefaults = {
    [K in Exclude<Slot, AttachmentSlot>]?: K extends NumberSlot | DurationSlot
        ? number
        : K extends ToggleSlot
          ? boolean
          : K extends JsonSlot
            ? unknown
            : string;
};
/** What each slot means on THIS screen; written to Slot_Map. For hidden dropdowns list the allowed values here. */
export type SlotDocs = Partial<Record<Slot, string>>;

export type ConfigStatus =
    | 'no-table' // Extension_Config not enabled on the element → pure code defaults
    | 'loading'
    | 'no-record' // no default row yet (and this user can't create it) → code defaults
    | 'ok'
    | 'defaults-only' // default row has Use_Defaults_Only ticked → code defaults everywhere
    | 'duplicate'; // >1 row with the same Extension+Variant → first one used

/** color / icon are '' when blank → render nothing */
export type OptionRow = {value: string; label: string; color: string; icon: string};
export type ResolvedRef = {table: Table | null; field: Field | null; raw: string};
/** table/field/raw = the FIRST part (back-compat); refs = every part (Filter_N "|" list + filterMap). */
export type FilterSpec = ResolvedRef & {
    n: number;
    /** 'slot' = Filter_N cells; 'json' = Advanced_JSON "filters" (n ≥ 11) */
    from: 'slot' | 'json';
    refs: ResolvedRef[];
    /** what to do with a record whose table has no part in refs */
    unmatched: 'keep' | 'hide';
    operator: FilterOperator;
    /** raw cell text (tokens unexpanded) */
    value: string;
    /** "|"-split values; @today/@now/@Date_N tokens expanded to ISO instants; "@me" kept as the literal '@me' */
    values: string[];
    /** true when values include @me (component compares with currentUser / meRecordIds) */
    me: boolean;
    label: string;
    shown: boolean;
    /** the part that applies to a record of `table`, or null (→ apply `unmatched`) */
    refFor: (table: Table) => ResolvedRef | null;
};
export type ToggleSpec = {n: number; slot: ToggleSlot; label: string; shown: boolean; defaultOn: boolean};
/** Typed view of the documented Advanced_JSON keys. Other keys are free per extension. */
export type AdvancedJson = {
    filters?: Array<{field: string; operator?: string; value?: string; label?: string}>;
    filterMap?: {[n: string]: {fields?: string[]; unmatched?: 'keep' | 'hide'}};
    [key: string]: unknown;
};
export type SortSpec = ResolvedRef & {n: number; direction: 'asc' | 'desc'};
export type DropdownSpec = ResolvedRef & {
    n: number;
    label: string;
    shown: boolean;
    defaultValue: string;
    /** 'records' → choose among records of `table` (component calls useRecords(table));
     *  'field-options' → select field choices (already in `options`);
     *  'field-values' → distinct cell values of `field` (use distinctValues(records, field));
     *  'option-list' → Option_List_N lines (already in `options`); 'none' → nothing configured / not found */
    source: 'records' | 'field-options' | 'field-values' | 'option-list' | 'none';
    options: OptionRow[];
};

export type ExtensionConfig = {
    status: ConfigStatus;
    record: AirtableRecord | null;
    variantRecord: AirtableRecord | null;
    text: (slot: TextSlot) => string;
    date: (slot: DateSlot) => Date | null;
    number: (slot: NumberSlot) => number | null;
    /** seconds */
    duration: (slot: DurationSlot) => number | null;
    /** DEFAULT state of the in-page toggle */
    toggle: (slot: ToggleSlot) => boolean;
    table: (slot: TableSlot) => Table | null;
    /** Source_Field_N (or any ref slot) resolved with the Table.Field rule */
    ref: (slot: RefSlot) => ResolvedRef;
    options: (slot: OptionSlot) => OptionRow[];
    attachments: (slot: AttachmentSlot) => Array<{url: string; filename: string}>;
    /** v3.2/v3.3: Attachment_Mapping_Image (old name Mapping_Image as fallback; Variant row → default row) + GitHub_URL, read-only. imageField/githubField = field visible to the element */
    mapping: () => {
        files: Array<{url: string; filename: string; thumb: string | null; type: string}>;
        from: 'variant' | 'default' | null;
        github: string;
        imageField: boolean;
        githubField: boolean;
    };
    json: <T = unknown>() => T | null;
    /** Filter_1–10 then Advanced_JSON "filters" (n = 11…) */
    filters: () => FilterSpec[];
    sorts: () => SortSpec[];
    dropdown: (n: N10) => DropdownSpec;
    /** Toggle_N + Toggle_Label_N (label empty = not shown, the default is a fixed setting) */
    toggleSpec: (n: N10) => ToggleSpec;
    /** Me_Field resolved (e.g. People.User) */
    meRef: () => ResolvedRef;
    /** raw string of any slot (after variant/default/code fallback) */
    raw: (slot: Slot) => string;
    /** v0.4.3 diagnostics («מצב חיבור») */
    debug: {tableName: string | null; rowCount: number | null; extensionValues: string[]; visibleFields: string[]; matchedExtension: string | null};
};

// ---------------------------------------------------------------------------
// name matching + Table.Field parser (exported for reuse / tests)
// ---------------------------------------------------------------------------
const NIKUD_RE = /[\u0591-\u05C7]/g;
export function looseName(s: string): string {
    // v3.4: = status-panel v4 looseKey — trim, NFKC, every format/bidi/zero-width char (\p{Cf}), nikud/combining marks,
    // case, any whitespace / dash / _ / . ignored → «countdown homescreen» = «Countdown-Homescreen» = «countdown_homescreen».
    return String(s ?? '')
        .normalize('NFKC')
        .replace(/\p{Cf}|\u034F|\u180E|\u115F|\u1160|\u3164|\uFFA0/gu, '')
        .replace(NIKUD_RE, '')
        .replace(/\p{Mn}/gu, '')
        .trim()
        .toLowerCase()
        .replace(/[\s\p{Z}\p{Pd}_.\u05BE\u2010-\u2015\u2212]+/gu, '');
}
const DEFAULT_VARIANT_KEYS = new Set(['', 'default', 'ברירתמחדל', 'ברירתהמחדל', 'base', 'main', '—']);
function findLoose<T extends {id: string; name: string}>(items: readonly T[], ref: string): T | null {
    const r = ref.trim();
    if (!r) return null;
    return (
        items.find(it => it.id === r) ??
        items.find(it => it.name === r) ??
        items.find(it => it.name.trim().toLowerCase() === r.toLowerCase()) ??
        items.find(it => looseName(it.name) === looseName(r)) ??
        null
    );
}

/**
 * Resolve a config reference.
 *  "Table.Field" | "Table" | "Field" (in contextTable) | "tbl…" | "fld…" | "tbl….fld…".
 *  Names with dots work: every dot is tried as the split point, left to right; first full match wins.
 */
export function resolveRef(base: Base, rawRef: string, contextTable: Table | null): ResolvedRef {
    const raw = (rawRef || '').trim();
    const out: ResolvedRef = {table: null, field: null, raw};
    if (!raw) return out;
    const tables = base.tables;
    // ids
    const ids = /^(tbl[A-Za-z0-9]{14})(?:\.(fld[A-Za-z0-9]{14}))?$/.exec(raw);
    if (ids) {
        const t = base.getTableByIdIfExists(ids[1]);
        return {table: t, field: t && ids[2] ? t.getFieldByIdIfExists(ids[2]) : null, raw};
    }
    if (/^fld[A-Za-z0-9]{14}$/.test(raw)) {
        for (const t of [contextTable, ...tables]) {
            const f = t?.getFieldByIdIfExists(raw);
            if (t && f) return {table: t, field: f, raw};
        }
        return out;
    }
    // Table.Field — try every dot as split point
    for (let i = raw.indexOf('.'); i > 0; i = raw.indexOf('.', i + 1)) {
        const t = findLoose(tables, raw.slice(0, i));
        if (!t) continue;
        const f = findLoose(t.fields, raw.slice(i + 1));
        if (f) return {table: t, field: f, raw};
    }
    // a field of the context table (exact/loose), then a whole table
    if (contextTable) {
        const f = findLoose(contextTable.fields, raw);
        if (f) return {table: contextTable, field: f, raw};
    }
    const t = findLoose(tables, raw);
    if (t) return {table: t, field: null, raw};
    // "Table.Field" where Table exists but Field not enabled → keep the table for a clear error
    const dot = raw.indexOf('.');
    if (dot > 0) out.table = findLoose(tables, raw.slice(0, dot));
    return out;
}

/** Split a multi-field cell "A.x | B.y" into parts (a "|" never appears in Airtable field refs we use). */
export function splitRefs(cell: string): string[] {
    return (cell || '').split('|').map(s => s.trim()).filter(Boolean);
}

/** Label for a value from an Option_List (e.g. status map "Todo | לביצוע"); unknown value → itself. */
export function optionLabel(rows: readonly OptionRow[], value: string): string {
    const v = (value || '').trim();
    return rows.find(o => o.value === v)?.label ?? rows.find(o => looseName(o.value) === looseName(v))?.label ?? v;
}

/**
 * Parse Advanced_JSON. Returns the typed object (unknown keys kept) + problems with the documented keys.
 * Broken JSON → {json: null, problems: ['…']}.
 */
export function parseAdvancedJson(text: string): {json: AdvancedJson | null; problems: string[]} {
    const s = (text || '').trim();
    if (!s) return {json: null, problems: []};
    let v: unknown;
    try {
        v = JSON.parse(s);
    } catch {
        return {json: null, problems: ['Advanced_JSON לא תקין (מתעלמים)']};
    }
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {json: null, problems: ['Advanced_JSON חייב להיות אובייקט {…}']};
    const j = {...(v as AdvancedJson)};
    const problems: string[] = [];
    if (j.filters !== undefined) {
        if (!Array.isArray(j.filters)) {
            problems.push('filters חייב להיות מערך');
            delete j.filters;
        } else {
            const ok = j.filters.filter(f => f && typeof f === 'object' && typeof (f as {field?: unknown}).field === 'string');
            if (ok.length !== j.filters.length) problems.push(`filters: ${j.filters.length - ok.length} פריטים בלי field`);
            j.filters = ok;
        }
    }
    if (j.filterMap !== undefined) {
        if (!j.filterMap || typeof j.filterMap !== 'object' || Array.isArray(j.filterMap)) {
            problems.push('filterMap חייב להיות אובייקט');
            delete j.filterMap;
        } else {
            const clean: NonNullable<AdvancedJson['filterMap']> = {};
            for (const [k, e] of Object.entries(j.filterMap)) {
                if (!/^\d+$/.test(k) || !e || typeof e !== 'object') {
                    problems.push(`filterMap.${k} לא תקין`);
                    continue;
                }
                const fields = Array.isArray(e.fields) ? e.fields.filter((x): x is string => typeof x === 'string') : [];
                clean[k] = {fields, unmatched: e.unmatched === 'hide' ? 'hide' : 'keep'};
            }
            j.filterMap = clean;
        }
    }
    return {json: j, problems};
}

const TOKEN_RE = /^@(today|now|date_(\d+))\s*(?:([+-])\s*(\d+(?:\.\d+)?)\s*([dhm]))?$/i;
/** true for "@me" (any case) */
export function isMeToken(v: string): boolean {
    return /^@me$/i.test((v || '').trim());
}
/**
 * Expand a date token: @today (Israel midnight), @now, @Date_N, each with optional ±Nd / ±Nh / ±Nm.
 * Not a token → the input unchanged. A token that can't be resolved (empty Date_N) → null.
 */
export function expandToken(v: string, ctx: {now: Date; date: (n: number) => Date | null}): string | null {
    const raw = (v || '').trim();
    const m = TOKEN_RE.exec(raw);
    if (!m) return raw;
    const kind = m[1].toLowerCase();
    let base: Date | null;
    if (kind === 'now') base = ctx.now;
    else if (kind === 'today') base = israelMidnight(ctx.now);
    else base = ctx.date(Number(m[2]));
    if (!base) return null;
    let ms = base.getTime();
    if (m[3]) {
        const unit = m[5].toLowerCase() === 'd' ? 86400000 : m[5].toLowerCase() === 'h' ? 3600000 : 60000;
        ms += (m[3] === '-' ? -1 : 1) * Number(m[4]) * unit;
    }
    return new Date(ms).toISOString();
}
/** 00:00 Israel time of the Israel calendar day containing `d` */
function israelMidnight(d: Date): Date {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'}).formatToParts(d);
    const g = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
    const sinceMidnight = ((g('hour') * 60 + g('minute')) * 60 + g('second')) * 1000 + d.getMilliseconds();
    return new Date(d.getTime() - sinceMidnight);
}

/**
 * Ids of the person records that are "me": rows of the Me_Field table whose Me_Field cell is (or contains) the
 * signed-in user — collaborator id/email, or the email as text. Component: useRecords(cfg.meRef().table).
 */
export function meRecordIds(
    records: readonly AirtableRecord[] | null,
    meField: Field | null,
    user: {id: string; email?: string | null} | null,
): string[] {
    if (!records || !meField || !user) return [];
    const email = (user.email || '').trim().toLowerCase();
    const isMe = (c: unknown): boolean => {
        if (!c) return false;
        if (typeof c === 'string') return !!email && c.trim().toLowerCase() === email;
        if (Array.isArray(c)) return c.some(isMe);
        if (typeof c === 'object') {
            const o = c as {id?: unknown; email?: unknown};
            return o.id === user.id || (!!email && typeof o.email === 'string' && o.email.toLowerCase() === email);
        }
        return false;
    };
    return records.filter(r => isMe(r.getCellValue(meField))).map(r => r.id);
}

export function parseOptionList(text: string): OptionRow[] {
    return (text || '')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(l => {
            const [value = '', label = '', color = '', icon = ''] = l.split('|').map(p => p.trim());
            return {value, label: label || value, color, icon};
        })
        .filter(o => o.value);
}

/** distinct non-empty display values of a field across records (for 'field-values' dropdowns) */
export function distinctValues(records: readonly AirtableRecord[] | null, field: Field | null): string[] {
    if (!records || !field) return [];
    const set = new Set<string>();
    for (const r of records) {
        const s = r.getCellValueAsString(field).trim();
        if (s) set.add(s);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'he'));
}

/** Initial value of an in-page toggle: the user's remembered choice wins, else the config default. */
export function initialToggle(remembered: boolean | null | undefined, configDefault: boolean): boolean {
    return typeof remembered === 'boolean' ? remembered : configDefault;
}

// ---------------------------------------------------------------------------
// cell helpers
// ---------------------------------------------------------------------------
function isEmpty(v: unknown): boolean {
    return v === null || v === undefined || v === '' || v === false || (Array.isArray(v) && v.length === 0);
}
function cellString(rec: AirtableRecord | null, name: string, t: Table | null): string {
    if (!rec || !t || !t.getFieldByNameIfExists(name)) return '';
    return rec.getCellValueAsString(name).trim();
}
function cellRaw(rec: AirtableRecord | null, name: string, t: Table | null): unknown {
    if (!rec || !t || !t.getFieldByNameIfExists(name)) return null;
    return rec.getCellValue(name);
}
/** Slot_Map line format: "Content_Text_1 = תווית אריח 1 (default: כרטיסים שנמכרו)" */
function slotsListedIn(slotMap: string): Set<string> {
    const out = new Set<string>();
    for (const line of slotMap.split('\n')) {
        const m = /^\s*([A-Za-z_]+\d*)\s*=/.exec(line);
        if (m) out.add(m[1]);
    }
    return out;
}
function buildSlotMap(slug: string, variant: string, version: string, defaults: ConfigDefaults, docs: SlotDocs): string {
    const keys = Array.from(new Set([...Object.keys(docs), ...Object.keys(defaults)]));
    keys.sort((a, b) => FIELD_ORDER.indexOf(a) - FIELD_ORDER.indexOf(b));
    const lines = keys.map(k => {
        const d = (defaults as {[k: string]: unknown})[k];
        const shown = d === undefined ? '' : typeof d === 'object' ? JSON.stringify(d) : String(d);
        const def = d === undefined ? '' : ` (default: ${shown.replace(/\n/g, ' ⏎ ')})`;
        return `${k} = ${(docs as {[k: string]: string | undefined})[k] ?? '—'}${def}`;
    });
    const who = variant ? `${slug} [${variant}]` : slug;
    return [`# ${who} v${version} — נכתב אוטומטית ע״י הקוד, לא לערוך ידנית`, ...lines].join('\n');
}
/** value to write for a code default, per field type */
function toCell(slot: string, v: unknown): unknown {
    const k = kindOf(slot);
    if (k === 'select') return {name: String(v)};
    if (k === 'json') return typeof v === 'string' ? v : JSON.stringify(v, null, 2);
    if (k === 'date') return new Date(String(v)).toISOString();
    return v;
}

/** module-level guard: one sync attempt per row per version per page load */
const syncedOnce = new Set<string>();

// ---------------------------------------------------------------------------
// the provider + hook
//   <ExtensionConfigProvider base={base} configTable={cp.configTable} slug="countdown-homescreen" variant={cp.configVariant}
//        version={VERSION} blockId="blk…" displayName="…" defaults={DEFAULTS} docs={DOCS}>
//       <App/>            ← inside: const cfg = useExtensionConfig();
//   </ExtensionConfigProvider>
// The provider only calls useRecords() with a real table (older interface SDKs crash on useRecords(null)).
// ---------------------------------------------------------------------------
export type ConfigOptions = {
    base: Base;
    configTable: Table | null | undefined;
    slug: string;
    /** '' = default row */
    variant?: string;
    version: string;
    blockId?: string;
    displayName?: string;
    defaults: ConfigDefaults;
    docs: SlotDocs;
    /** Door 2 (extension → table writes). Default OFF = read-only. */
    writes?: boolean;
};

/** Extension_Config by exact name, then loose (case / spaces / _ - . / nikud ignored). */
export function findConfigTable(base: Base): Table | null {
    return base.getTableByNameIfExists(CONFIG_TABLE_NAME) ?? findLoose(base.tables, CONFIG_TABLE_NAME);
}

const Ctx = createContext<ExtensionConfig | null>(null);

function WithTable(props: ConfigOptions & {table: Table; children?: ReactNode}) {
    const records = useRecords(props.table);
    const cfg = useConfigCore(props, props.table, records);
    return createElement(Ctx.Provider, {value: cfg}, props.children);
}
function WithoutTable(props: ConfigOptions & {children?: ReactNode}) {
    const cfg = useConfigCore(props, null, null);
    return createElement(Ctx.Provider, {value: cfg}, props.children);
}
export function ExtensionConfigProvider(props: ConfigOptions & {children?: ReactNode}) {
    // null = explicitly none (read nothing); undefined = find by name
    const table = props.configTable === null ? null : (props.configTable ?? findConfigTable(props.base));
    return table ? createElement(WithTable, {...props, table, key: table.id}) : createElement(WithoutTable, props);
}
/** Read the config inside <ExtensionConfigProvider>. */
export function useExtensionConfig(): ExtensionConfig {
    const cfg = useContext(Ctx);
    if (!cfg) throw new Error('useExtensionConfig() must be used inside <ExtensionConfigProvider>');
    return cfg;
}

function useConfigCore(opts: ConfigOptions, table: Table | null, records: readonly AirtableRecord[] | null): ExtensionConfig {
    const {base, slug, version, blockId, displayName, defaults, docs} = opts;
    const variant = (opts.variant ?? '').trim();
    const [syncError, setSyncError] = useState<string | null>(null);
    const busy = useRef(false);

    // v0.4.3 (countdown copy): Extension / Variant matched LOOSELY (case, spaces, _ - ., bidi marks); exact first.
    // A Variant of «default» / «ברירת מחדל» / «-» counts as the default row.
    const slugKey = looseName(slug);
    // v3.4: the Extension / Variant FIELDS are found loosely too («Extension », «extension») — exact name first.
    const fieldLoose = (name: string) => (table ? (table.getFieldByNameIfExists(name) ?? table.fields.find(f => looseName(f.name) === looseName(name)) ?? null) : null);
    const extField = fieldLoose(F.extension);
    const varField = fieldLoose(F.variant);
    const cellStr = (r: AirtableRecord, f: NonNullable<typeof extField>) => {
        try {
            return r.getCellValueAsString(f.name); // by the real (visible) name — same as the rest of the hook
        } catch {
            return '';
        }
    };
    const variantKey = (r: AirtableRecord) => {
        if (!varField) return '';
        const k = looseName(cellStr(r, varField));
        return DEFAULT_VARIANT_KEYS.has(k) ? '' : k;
    };
    const rowsFor = (v: string) => {
        if (!table || !records || !extField) return [];
        const vk = DEFAULT_VARIANT_KEYS.has(looseName(v)) ? '' : looseName(v);
        const hits = records.filter(r => looseName(cellStr(r, extField)) === slugKey && variantKey(r) === vk);
        const exact = hits.filter(r => cellStr(r, extField).trim() === slug);
        return [...exact, ...hits.filter(r => !exact.includes(r))];
    };
    const baseMatches = useMemo(() => rowsFor(''), [table, records, slug]); // eslint-disable-line react-hooks/exhaustive-deps
    const varMatches = useMemo(() => (variant ? rowsFor(variant) : []), [table, records, slug, variant]); // eslint-disable-line react-hooks/exhaustive-deps
    const record = baseMatches[0] ?? null;
    const variantRecord = varMatches[0] ?? null;

    // ---------------- Door 1 layers ----------------
    const status: ConfigStatus = !table
        ? 'no-table'
        : !records
          ? 'loading'
          : !record
            ? 'no-record'
            : cellRaw(record, F.useDefaultsOnly, table) === true
              ? 'defaults-only'
              : baseMatches.length > 1 || varMatches.length > 1
                ? 'duplicate'
                : 'ok';
    const live = status === 'ok' || status === 'duplicate';
    const vRow = live && variantRecord && cellRaw(variantRecord, F.useDefaultsOnly, table) !== true ? variantRecord : null;
    const bRow = live ? record : null;
    const listedV = slotsListedIn(cellString(vRow, F.slotMap, table));
    const listedB = slotsListedIn(cellString(bRow, F.slotMap, table));
    const dflt = (slot: string): unknown => (defaults as {[k: string]: unknown})[slot];

    const rawOf = (slot: Slot): string => {
        const v = cellString(vRow, slot, table) || cellString(bRow, slot, table);
        if (v) return v;
        const d = dflt(slot);
        return d === undefined || d === null ? '' : typeof d === 'object' ? JSON.stringify(d) : String(d);
    };
    const rawCell = (slot: Slot): unknown => {
        const v = cellRaw(vRow, slot, table);
        if (!isEmpty(v)) return v;
        const b = cellRaw(bRow, slot, table);
        return isEmpty(b) ? null : b;
    };
    const toggleOf = (slot: ToggleSlot): boolean => {
        if (vRow && listedV.has(slot)) return cellRaw(vRow, slot, table) === true;
        if (bRow && listedB.has(slot)) return cellRaw(bRow, slot, table) === true;
        return dflt(slot) === true;
    };

    // ---------------- Door 2: extension → table ----------------
    useEffect(() => {
        if (!opts.writes) return; // read-only unless explicitly enabled
        if (!table || !records || busy.current) return;
        if (record && cellRaw(record, F.useDefaultsOnly, table) === true) return; // emergency switch: no writes either

        type Job = {row: AirtableRecord | null; isVariant: boolean; key: string};
        const jobs: Job[] = [{row: record, isVariant: false, key: `${slug}||${version}`}];
        if (variant) jobs.push({row: variantRecord, isVariant: true, key: `${slug}|${variant}|${version}`});

        const has = (name: string) => !!table.getFieldByNameIfExists(name);
        const writes: Array<{row: AirtableRecord | null; fields: {[name: string]: unknown}}> = [];
        for (const job of jobs) {
            if (syncedOnce.has(job.key)) continue;
            if (job.row && cellString(job.row, F.codeVersion, table) === version) {
                syncedOnce.add(job.key);
                continue;
            }
            if (job.isVariant && !record) continue; // default row first (next render, once it exists)
            const missing: string[] = [];
            const fields: {[name: string]: unknown} = {};
            const put = (name: string, v: unknown) => {
                if (has(name)) fields[name] = v;
                else missing.push(name);
            };
            const prevListed = slotsListedIn(cellString(job.row, F.slotMap, table));
            const slots = Array.from(new Set([...Object.keys(defaults), ...Object.keys(docs)])) as Slot[];
            for (const slot of slots) {
                const isNewSlot = !job.row || !prevListed.has(slot);
                if (!isNewSlot) continue; // the owner cleared it on purpose → stays empty (= inherited/default at read time)
                if (!isEmpty(cellRaw(job.row, slot, table))) continue; // NEVER overwrite a non-empty cell
                const k = kindOf(slot);
                if (k === 'attachment') continue;
                if (job.isVariant) {
                    // variant rows inherit; only checkboxes must be materialised (a checkbox can't be "empty")
                    if (k === 'toggle' && toggleOf(slot as ToggleSlot)) put(slot, true);
                    continue;
                }
                const d = dflt(slot);
                if (d === undefined || d === null || d === '' || d === false) continue;
                put(slot, toCell(slot, d));
            }
            put(F.slotMap, buildSlotMap(slug, job.isVariant ? variant : '', version, defaults, docs));
            put(F.codeVersion, version);
            put(F.lastSynced, new Date().toISOString());
            if (blockId && isEmpty(cellRaw(job.row, F.blockId, table))) put(F.blockId, blockId);
            if (!job.row) {
                put(F.extension, slug);
                if (job.isVariant) put(F.variant, variant);
                if (displayName) put(F.displayName, job.isVariant ? `${displayName} · ${variant}` : displayName);
            }
            const jsonProblems = parseAdvancedJson(cellString(job.row, 'Advanced_JSON', table)).problems;
            const jsonNote = jsonProblems.length ? ` · ${jsonProblems.join(' · ')}` : '';
            put(F.syncNote, (missing.length ? `שדות חסרים/לא מאופשרים באלמנט: ${missing.join(', ')}` : '✓') + jsonNote);
            const allowed = job.row ? table.hasPermissionToUpdateRecord(job.row, fields) : table.hasPermissionToCreateRecord(fields);
            syncedOnce.add(job.key); // one attempt per load, even for viewers → no retry storm
            if (allowed) writes.push({row: job.row, fields});
        }
        if (!writes.length) return;
        busy.current = true;
        (async () => {
            for (const w of writes) {
                if (w.row) await table.updateRecordAsync(w.row, w.fields);
                else await table.createRecordAsync(w.fields);
            }
        })()
            .then(() => setSyncError(null))
            .catch((e: unknown) => setSyncError(e instanceof Error ? e.message : String(e)))
            .finally(() => {
                busy.current = false;
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opts.writes, table, records, record, variantRecord, slug, variant, version, blockId, displayName, defaults, docs]);

    // ---------------- Door 1 accessors ----------------
    const text = (slot: TextSlot) => rawOf(slot);
    const date = (slot: DateSlot) => {
        const v = rawCell(slot);
        const s = typeof v === 'string' && v ? v : String(dflt(slot) ?? '');
        const d = s ? new Date(s) : null;
        return d && !Number.isNaN(d.getTime()) ? d : null;
    };
    const number = (slot: NumberSlot) => {
        const v = rawCell(slot);
        const d = dflt(slot);
        return typeof v === 'number' ? v : typeof d === 'number' ? d : null;
    };
    const duration = (slot: DurationSlot) => {
        const v = rawCell(slot);
        const d = dflt(slot);
        return typeof v === 'number' ? v : typeof d === 'number' ? d : null;
    };
    const resolveTable = (slot: TableSlot): Table | null => {
        const r = resolveRef(base, rawOf(slot), null);
        return r.field ? null : r.table;
    };
    const contextFor = (slot: RefSlot): Table | null => {
        const n = Number(/_(\d+)$/.exec(slot)?.[1] ?? '1');
        return slot.startsWith('Source_Field_') && n <= 10 ? resolveTable(`Source_Table_${n as N10}`) : resolveTable('Source_Table_1');
    };
    const ref = (slot: RefSlot) => resolveRef(base, rawOf(slot), contextFor(slot));
    const options = (slot: OptionSlot) => parseOptionList(rawOf(slot));
    const mapping = () => {
        const has = (n: string) => !!table && !!table.getFieldByNameIfExists(n);
        // Attachment_Mapping_Image exact → loose → the old Mapping_Image exact → loose
        const mapName = (() => {
            if (!table) return EXTRA_FIELDS.mappingImage as string;
            for (const want of [EXTRA_FIELDS.mappingImage, LEGACY_FIELDS.mappingImage]) {
                const f = table.getFieldByNameIfExists(want) ?? table.fields.find(x => looseName(x.name) === looseName(want));
                if (f) return f.name;
            }
            return EXTRA_FIELDS.mappingImage as string;
        })();
        const files = (r: AirtableRecord | null) => {
            const v = cellRaw(r, mapName, table);
            return Array.isArray(v)
                ? (v as Array<{url?: unknown; filename?: unknown; type?: unknown; thumbnails?: {large?: {url?: unknown}}}>).map(a => ({
                      url: String(a.url ?? ''),
                      filename: String(a.filename ?? ''),
                      thumb: a.thumbnails?.large?.url ? String(a.thumbnails.large.url) : null,
                      type: String(a.type ?? ''),
                  }))
                : [];
        };
        const fv = files(variantRecord);
        const fd = files(record);
        const gv = cellString(variantRecord, EXTRA_FIELDS.githubUrl, table);
        return {
            files: fv.length ? fv : fd,
            from: fv.length ? ('variant' as const) : fd.length ? ('default' as const) : null,
            github: gv || cellString(record, EXTRA_FIELDS.githubUrl, table),
            imageField: has(mapName),
            githubField: has(EXTRA_FIELDS.githubUrl),
        };
    };
    const attachments = (slot: AttachmentSlot) => {
        const v = rawCell(slot);
        return Array.isArray(v)
            ? (v as Array<{url?: unknown; filename?: unknown}>).map(a => ({url: String(a.url ?? ''), filename: String(a.filename ?? '')}))
            : [];
    };
    const advanced = (): AdvancedJson | null => parseAdvancedJson(rawOf('Advanced_JSON')).json;
    const json = <T = unknown,>(): T | null => advanced() as T | null;
    const ctxTable = () => resolveTable('Source_Table_1');
    const tokenCtx = () => ({now: new Date(), date: (n: number) => (n >= 1 && n <= 5 ? date(`Date_${n as N5}`) : null)});
    const makeFilter = (n: number, from: 'slot' | 'json', fieldCell: string, opRaw: string, value: string, label: string): FilterSpec | null => {
        const map = advanced()?.filterMap?.[String(n)];
        const parts = [...splitRefs(fieldCell), ...(map?.fields ?? [])];
        if (!parts.length) return null;
        const refs = parts.map(p => resolveRef(base, p, ctxTable()));
        const tc = tokenCtx();
        let dropped = false;
        const values = splitRefs(value).flatMap(v => {
            if (isMeToken(v)) return ['@me'];
            const e = expandToken(v, tc);
            if (e === null) dropped = true;
            return e === null ? [] : [e];
        });
        if (dropped && !values.length) return null; // date token without a date → filter off, never "match nothing"
        const first = refs[0];
        return {
            ...first,
            n,
            from,
            refs,
            unmatched: map?.unmatched === 'hide' ? 'hide' : 'keep',
            operator: (FILTER_OPERATORS as readonly string[]).includes(opRaw) ? (opRaw as FilterOperator) : 'is',
            value,
            values,
            me: values.includes('@me'),
            label,
            shown: !!label,
            refFor: (t: Table) => refs.find(r => r.table?.id === t.id) ?? null,
        };
    };
    const filters = (): FilterSpec[] => {
        const out: FilterSpec[] = [];
        for (let n = 1; n <= 10; n++) {
            const k = n as N10;
            const f = makeFilter(n, 'slot', rawOf(`Filter_${k}`), rawOf(`Filter_Operator_${k}`), rawOf(`Filter_Value_${k}`), rawOf(`Filter_Label_${k}`));
            if (f) out.push(f);
        }
        (advanced()?.filters ?? []).forEach((x, i) => {
            const f = makeFilter(11 + i, 'json', x.field, x.operator ?? '', x.value ?? '', x.label ?? '');
            if (f) out.push(f);
        });
        return out;
    };
    const toggleSpec = (n: N10): ToggleSpec => {
        const label = rawOf(`Toggle_Label_${n}`);
        return {n, slot: `Toggle_${n}`, label, shown: !!label, defaultOn: toggleOf(`Toggle_${n}`)};
    };
    const meRef = () => ref('Me_Field');
    const sorts = (): SortSpec[] => {
        const out: SortSpec[] = [];
        for (let n = 1; n <= 2; n++) {
            const k = n as N2;
            const r = ref(`Sort_${k}`);
            if (!r.raw) continue;
            out.push({...r, n, direction: rawOf(`Sort_Direction_${k}`) === 'desc' ? 'desc' : 'asc'});
        }
        return out;
    };
    const dropdown = (n: N10): DropdownSpec => {
        const r = ref(`Dropdown_${n}`);
        const label = rawOf(`Dropdown_Label_${n}`);
        const common = {n, label, shown: !!label, defaultValue: rawOf(`Dropdown_Default_${n}`)};
        if (!r.raw) {
            const list = options(`Option_List_${n}`);
            return {...common, ...r, source: list.length ? 'option-list' : 'none', options: list};
        }
        if (r.field) {
            const cfg = r.field.config as unknown as {type: string; options?: {choices?: Array<{name: string; color?: string}>}};
            const choices = cfg.options?.choices;
            if ((cfg.type === 'singleSelect' || cfg.type === 'multipleSelects') && choices) {
                return {...common, ...r, source: 'field-options', options: choices.map(c => ({value: c.name, label: c.name, color: c.color ?? '', icon: ''}))};
            }
            return {...common, ...r, source: 'field-values', options: []};
        }
        return {...common, ...r, source: r.table ? 'records' : 'none', options: []};
    };

    if (syncError && typeof console !== 'undefined') console.warn(`[Extension_Config] ${slug}${variant ? `[${variant}]` : ''}: ${syncError}`);
    return {
        status,
        record,
        variantRecord,
        text,
        date,
        number,
        duration,
        toggle: toggleOf,
        table: resolveTable,
        ref,
        options,
        attachments,
        mapping,
        json,
        filters,
        sorts,
        dropdown,
        toggleSpec,
        meRef,
        raw: rawOf,
        debug: {
            tableName: table ? table.name : null,
            rowCount: records ? records.length : null,
            extensionValues: records && extField ? records.slice(0, 20).map(r => cellStr(r, extField)) : [],
            visibleFields: table ? table.fields.map(f => f.name) : [],
            matchedExtension: record && extField ? cellStr(record, extField) : null,
        },
    };
}

// ---------------------------------------------------------------------------
// Example — csf-countdown (next version with Critic's layout)
// ---------------------------------------------------------------------------
export const COUNTDOWN_DEFAULTS: ConfigDefaults = {
    Title: 'יאללה היידה!',
    Heading_1: 'עד תחילת הפסטיבל',
    Heading_2: 'עד סוף הפסטיבל',
    Heading_3: 'הפסטיבל הסתיים',
    Content_Text_1: 'כרטיסים שנמכרו',
    Content_Text_2: 'הזמנות שנשלחו',
    Content_Text_6: 'ימים',
    Content_Text_7: 'שעות',
    Content_Text_8: 'דקות',
    Content_Text_9: 'הפסטיבל חי',
    Source_Table_1: 'Tickets',
    Source_Table_2: 'Invitations',
    Source_Table_3: 'Slots_Events',
    Source_Field_3: 'Slots_Events.Status',
    Source_Field_4: 'Slots_Events.Start',
    Source_Field_5: 'Slots_Events.End',
    Option_List_1: 'משובץ',
    Date_1: '2026-10-24T20:00:00+03:00',
    Date_2: '2026-10-31T00:00:00+02:00', // Israel winter time (DST ends 25.10)
    Duration_1: 3600,
    Toggle_1: true,
    Error_Text_1: 'לא נמצאה הטבלה Slots_Events (או שלא הופעלה בחלונית הימנית)',
    Error_Text_2: 'לא נמצאו משבצות בסטטוס משובץ',
    Empty_State_Text_1: '—',
    Color_1: '#dc043b',
    Color_2: '#f5f5f7',
};
export const COUNTDOWN_DOCS: SlotDocs = {
    Title: 'שורת הכיף מעל השעון',
    Heading_1: 'שורת «עד מה» לפני הפסטיבל',
    Heading_2: 'שורת «עד מה» בזמן הפסטיבל',
    Heading_3: 'אחרי הסיום',
    Content_Text_1: 'תווית אריח 1',
    Content_Text_2: 'תווית אריח 2',
    Content_Text_3: 'תווית אריח 3',
    Content_Text_4: 'תווית אריח 4',
    Content_Text_5: 'תווית אריח 5',
    Content_Text_6: 'יחידה: ימים',
    Content_Text_7: 'יחידה: שעות',
    Content_Text_8: 'יחידה: דקות',
    Content_Text_9: 'תגית בזמן הפסטיבל',
    Source_Table_1: 'טבלה לספירת אריח 1',
    Source_Table_2: 'טבלה לספירת אריח 2',
    Source_Table_3: 'טבלת המשבצות לשעון',
    Source_Field_3: 'שדה הסטטוס (Table.Field)',
    Source_Field_4: 'שדה התחלה (Table.Field)',
    Source_Field_5: 'שדה סיום (Table.Field)',
    Option_List_1: 'סטטוסים שנחשבים «משובץ» (שורה לכל ערך)',
    Date_1: 'יעד גיבוי בלבד, אם אין משבצות משובץ (שעון ישראל)',
    Date_2: 'היום הראשון של הפסטיבל — משבצות לפניו לא נספרות',
    Goal_1: 'Y של אריח 1 («X מתוך Y») — ריק = בלי «מתוך»',
    Goal_2: 'Y של אריח 2',
    Duration_1: 'בחלון הזה לפני היעד מציגים גם שניות',
    Toggle_1: 'ברירת מחדל: שניות בשעה האחרונה (מסומן = פועל)',
    Toggle_Label_1: 'תווית המתג «שניות» במסך — ריק = אין מתג במסך, Toggle_1 קבוע',
    Error_Text_1: 'אין טבלת משבצות',
    Error_Text_2: 'אין משבצות משובץ',
    Empty_State_Text_1: 'מה מוצג באריח כשהטבלה לא זמינה',
    Color_1: 'צבע מותג (כותרת, פסים, נקודת «חי») — משפחת הארגמן של הבסיס',
    Color_2: 'צבע רקע',
};
