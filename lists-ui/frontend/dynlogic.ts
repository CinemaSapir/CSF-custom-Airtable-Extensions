/**
 * Dynamic lists – pure logic (unit-tested in scripts/logic-test.mjs).
 * v0.3.0: ONE source table + 1–3 AND conditions (structured on the Lists record, never free text).
 * v0.4.0: the source tables and their curated tracking fields come from the DEMO config table `List_Sources`
 *         (one row per table: Table · Hebrew label · Icon · Active · Sort · Title field · Picture field · Field 1..6 + label).
 *         The in-code map below is ONLY a fallback when that table is missing or empty.
 *         Field types are read from the real Airtable field at runtime, so a new table needs no code change.
 * v0.4.1: trackGate distinguishes List_Sources-thin (<3 filled refs) vs element not-enabled (≥3 filled, <3 usable).
 */
import {type Field, type Record as AirtableRecord, type Table} from '@airtable/blocks/interface/models';
import {type Kind} from './kinds';

export type FType = 'select' | 'multi' | 'link' | 'date' | 'number' | 'checkbox' | 'text';
export type Op =
    | 'is'
    | 'is not'
    | 'contains'
    | 'does not contain'
    | 'is empty'
    | 'is not empty'
    | 'is on'
    | 'is before'
    | 'is after'
    | 'greater than'
    | 'less than'
    | 'is checked'
    | 'is not checked';

export const OP_HE: {[o in Op]: string} = {
    is: 'הוא',
    'is not': 'אינו',
    contains: 'כולל',
    'does not contain': 'לא כולל',
    'is empty': 'ריק',
    'is not empty': 'לא ריק',
    'is on': 'בתאריך',
    'is before': 'לפני',
    'is after': 'אחרי',
    'greater than': 'גדול מ־',
    'less than': 'קטן מ־',
    'is checked': 'מסומן',
    'is not checked': 'לא מסומן',
};
export const OPS_BY_TYPE: {[t in FType]: Op[]} = {
    select: ['is', 'is not', 'is empty', 'is not empty'],
    multi: ['contains', 'does not contain', 'is empty', 'is not empty'],
    link: ['contains', 'does not contain', 'is empty', 'is not empty'],
    date: ['is on', 'is before', 'is after', 'is empty', 'is not empty'],
    number: ['is', 'greater than', 'less than', 'is empty', 'is not empty'],
    checkbox: ['is checked', 'is not checked'],
    text: ['is', 'is not', 'contains', 'does not contain', 'is empty', 'is not empty'],
};
const NO_VALUE: Op[] = ['is empty', 'is not empty', 'is checked', 'is not checked'];
export const needsValue = (op: Op) => !NO_VALUE.includes(op);

// ---------- field typing + sensitivity (Airtable field type → condition type) ----------
const TYPE_MAP: {[airtableType: string]: FType} = {
    singleSelect: 'select',
    singleCollaborator: 'select',
    multipleSelects: 'multi',
    multipleCollaborators: 'multi',
    multipleLookupValues: 'multi',
    multipleRecordLinks: 'link',
    date: 'date',
    dateTime: 'date',
    createdTime: 'date',
    lastModifiedTime: 'date',
    number: 'number',
    currency: 'number',
    percent: 'number',
    count: 'number',
    rating: 'number',
    autoNumber: 'number',
    duration: 'number',
    checkbox: 'checkbox',
    singleLineText: 'text',
    multilineText: 'text',
    richText: 'text',
    url: 'text',
    formula: 'text',
    rollup: 'text',
};
/** null = not usable in a condition (attachments, buttons, AI text, barcode …) */
export const ftypeOf = (airtableType: string): FType | null => TYPE_MAP[airtableType] ?? null;
/** never offered, never filtered on, never shown – whatever the config row says (Critic gate) */
export const SENSITIVE_TYPES = ['email', 'phoneNumber'];
export const SENSITIVE_NAME =
    /phone|e-?mail|\bmail\b|טלפון|נייד|מייל|דוא["״']?ל|id.?number|teudat|תעודת.?זהות|ת["״']ז|passport|דרכון|\bcar\b|have a car|רכב|plate|לוחית|address|כתובת|birth|לידה|bank|בנק|iban|password|סיסמ|wi-?fi|salary|שכר|school year|medical|health|רפואי|בריאות|minor|קטינ|child|ילד|bio|קורות|cv\b|resume|תעודה|identity|מזהה/i;
export const sensitiveField = (name: string, airtableType?: string) => SENSITIVE_NAME.test(name) || (airtableType ? SENSITIVE_TYPES.includes(airtableType) : false);

/** Critic hard-DENY: never offer these as Dynamic sources, even if someone adds a List_Sources row. */
export const HARD_DENY =
    /^(Petty Cash|Budgets|Budget_lines|Approvals|transactions|transactions_follow_up|finance_team_approval|KPIs|Notebook|Fillout Write-Path Test|Documents|Files and Links|Media|Chat|Doors|TEMP|archive)/i;
export const hardDenied = (tableName: string) => HARD_DENY.test(tableName.trim());
/** Legacy Cond Field select choice names that must never appear in the Dynamic condition picker (MCP cannot drop them). */
export const DENIED_COND_CHOICES = new Set(['Do you have a car?', 'Email_Personal', 'Phone_Personal', 'Home address']);

// ---------- config (List_Sources) ----------
/** one List_Sources row as plain data (cells already read) */
export type RawSource = {
    rowId: string;
    table: string;
    he: string;
    icon: string;
    active: boolean;
    sort: number | null;
    title: string;
    picture: string;
    fields: Array<{ref: string; he: string}>;
};
export type FieldIssue = null | 'missing' | 'sensitive' | 'unsupported';
export type SourceField = {ref: string; he: string; field: Field | null; type: FType | null; issue: FieldIssue};
export type Source = {
    /** resolved table id, else "ref:<Table cell>" */
    key: string;
    ref: string;
    rowId: string;
    table: Table | null;
    he: string;
    icon: string;
    active: boolean;
    sort: number;
    titleField: Field | null;
    picField: Field | null;
    /** every configured field (blocked / missing ones carry an issue and are never used) */
    fields: SourceField[];
    /** film / slot / person when the table is one of the three built-in ones (nicer pictures + subtitles) */
    kind: Kind | null;
    origin: 'config' | 'fallback';
};
export type Catalog = {sources: Source[]; origin: 'config' | 'fallback'; reason: null | 'no-table' | 'empty'};
export const MAX_FIELDS = 6;

/** in-code fallback when List_Sources is missing/empty. People = CISO allow-list only (role / applicant / access). */
export const FALLBACK: RawSource[] = [
    {
        rowId: 'fallback-films',
        table: 'tbleQDxV820WtLJYf|Films',
        he: 'סרטים',
        icon: '🎬',
        active: true,
        sort: 10,
        title: 'fldnNNYgdTgXc1c7o|Film_name_HEB',
        picture: 'fld0SoeYu0brBNEdT|Poster',
        fields: [
            {ref: 'fldO8jqYjg52cLe61|Accepted to CSF', he: 'סטטוס קבלה לפסטיבל'},
            {ref: 'fld6y1Yy4fXY7yTq9|Contest_Program', he: 'מסלול / תוכנית'},
            {ref: 'fldOr9KwbO5oYMnBw|Genre_Hebrew', he: 'ז׳אנר'},
            {ref: 'fldfofhma9esYgIm7|Trailer Stage', he: 'שלב טריילר'},
            {ref: 'fldBtZh0Y6ZywRrgF|DCP arrived', he: 'הגעת עותק הקרנה'},
            {ref: 'fldMGUj964ZtiYjVv|Year', he: 'שנת הפקה'},
        ],
    },
    {
        rowId: 'fallback-slots',
        table: 'tblHbwkDkWEKmX9OT|Slots_Events',
        he: 'משבצות',
        icon: '📅',
        active: true,
        sort: 20,
        title: 'fldTfMQmhZuGYDcyU|Slot',
        picture: 'fld4dQ6y3WBYeEWWq|Pics for website',
        fields: [
            {ref: 'fldxTZHOwfcvbWCIi|Type', he: 'סוג אירוע'},
            {ref: 'fld89nh2HtTuBNpoN|Status', he: 'סטטוס משבצת'},
            {ref: 'fldtmiazhhykZjx2J|Start', he: 'מועד התחלה'},
            {ref: 'fldIgvJCk5xikmZ5s|Location', he: 'אולם / מיקום'},
            {ref: 'fldLUAU76CKC6YA9z|Project', he: 'פרויקט'},
        ],
    },
    {
        rowId: 'fallback-people',
        table: 'tblDETcBuaBMTeUmH|People',
        he: 'אנשים',
        icon: '👤',
        active: true,
        sort: 30,
        title: 'fldVySoRplNHsjeBW|Full Name',
        picture: 'fldXti4SNzyVMvUb2|Pic',
        fields: [
            {ref: 'fldOC4ckUgO9iqKQo|Access', he: 'הרשאת גישה'},
            {ref: 'fldu0prqClfZQUBRL|Preferred role', he: 'תפקיד מועדף'},
            {ref: 'fld7PTpExUBXWEYsQ|Roles', he: 'תפקידים'},
            {ref: 'fldAbgUNb5rN7hfce|Applicant', he: 'מועמד/ת להתנדבות'},
        ],
    },
];

/** v0.5.7: a ref may carry alternatives "fldDEMOid|English name" (fallback map) – id first, then the name, so PROD resolves too */
const fieldBy = (t: Table, ref: string): Field | null => {
    for (const part of ref.split('|')) {
        const r = part.trim();
        if (!r) continue;
        const f = t.getFieldByIdIfExists(r) ?? t.getFieldByNameIfExists(r);
        if (f) return f;
    }
    return null;
};
const lookupAlt = (lookup: (ref: string) => Table | null, ref: string): Table | null => {
    for (const part of ref.split('|')) {
        const t = part.trim() ? lookup(part.trim()) : null;
        if (t) return t;
    }
    return null;
};
export function resolveSourceField(t: Table | null, ref: string, he: string): SourceField {
    const label = he.trim() || ref.trim();
    if (sensitiveField(ref) || DENIED_COND_CHOICES.has(ref.trim()) || DENIED_COND_CHOICES.has(label)) return {ref, he: label, field: null, type: null, issue: 'sensitive'};
    const f = t ? fieldBy(t, ref) : null;
    if (!f) return {ref, he: label, field: null, type: null, issue: 'missing'};
    const at = String((f as unknown as {type: string}).type);
    if (sensitiveField(f.name, at) || DENIED_COND_CHOICES.has(f.name)) return {ref, he: label, field: null, type: null, issue: 'sensitive'};
    const type = ftypeOf(at);
    return {ref, he: label, field: type ? f : null, type, issue: type ? null : 'unsupported'};
}

/**
 * Build the runtime catalog. raw === null → the config table isn't bound to the element (fallback);
 * no row with a Table value → empty config (fallback). Otherwise ONLY the config rows count.
 */
export function buildCatalog(raw: RawSource[] | null, lookup: (ref: string) => Table | null, kindOf: (t: Table) => Kind | null): Catalog {
    const rows = raw?.filter((r) => r.table.trim()) ?? [];
    const origin: Catalog['origin'] = rows.length ? 'config' : 'fallback';
    const reason: Catalog['reason'] = rows.length ? null : raw === null ? 'no-table' : 'empty';
    const use = rows.length ? rows : FALLBACK;
    const seen = new Set<string>();
    const sources: Source[] = [];
    for (const r of use) {
        const ref = r.table.trim();
        const table = lookupAlt(lookup, ref);
        const denyName = table?.name ?? ref;
        if (hardDenied(denyName)) continue; // Critic hard-DENY – never offer
        const key = table ? table.id : `ref:${ref}`;
        if (seen.has(key)) continue; // first row wins for a table
        seen.add(key);
        const fields = r.fields
            .filter((x) => x.ref.trim())
            .slice(0, MAX_FIELDS)
            .map((x) => resolveSourceField(table, x.ref, x.he));
        const title = table && r.title.trim() ? fieldBy(table, r.title) : null;
        const pic = table && r.picture.trim() ? fieldBy(table, r.picture) : null;
        sources.push({
            key,
            ref,
            rowId: r.rowId,
            table,
            he: r.he.trim() || table?.name || ref,
            icon: r.icon.trim() || '📄',
            active: r.active,
            sort: r.sort ?? 999,
            titleField: title && !sensitiveField(title.name, String((title as unknown as {type: string}).type)) ? title : null,
            picField: pic,
            fields,
            kind: table ? kindOf(table) : null,
            origin,
        });
    }
    sources.sort((a, b) => a.sort - b.sort || a.he.localeCompare(b.he, 'he'));
    return {sources, origin, reason};
}
/** a Lists record's stored source (table id, table name or legacy select name) → catalog entry */
export function findSource(cat: Catalog, ref: string): Source | null {
    const r = ref.trim();
    if (!r) return null;
    const low = r.toLowerCase();
    return cat.sources.find((s) => s.key === r || s.table?.id === r || s.ref.toLowerCase() === low || s.ref.toLowerCase().split('|').includes(low) || s.table?.name?.toLowerCase() === low) ?? null;
}
/** sources offered in the table picker */
export const pickable = (cat: Catalog) => cat.sources.filter((s) => s.active);
/** usable condition fields for a source */
export const usableFields = (s: Source) => s.fields.filter((f) => !f.issue && f.field && f.type) as Array<SourceField & {field: Field; type: FType}>;
/** filled tracking refs on the List_Sources row (already filtered at catalog build) */
export const configuredFieldCount = (s: Source) => s.fields.length;
/**
 * Why a source can't be picked for a new Dynamic list (tracking capacity).
 * (a) List_Sources filled refs < 3 → config-thin (fill Field 1–6 on the row).
 * (b) ≥3 filled but usableFields < 3 → not-enabled (enable those fields on the element Data / פאנל שדות).
 */
export type TrackGate =
    | {kind: 'ok'; configured: number; usable: number; why: ''; hint: ''}
    | {kind: 'config-thin'; configured: number; usable: number; why: string; hint: string}
    | {kind: 'not-enabled'; configured: number; usable: number; why: string; hint: string};
export function trackGate(s: Source): TrackGate {
    const configured = configuredFieldCount(s);
    const usable = usableFields(s).length;
    if (configured < 3) {
        const why = configured === 0 ? ' (אין שדות מעקב)' : ' (חסרים שדות מעקב – צריך 3–6)';
        const hint =
            configured === 0
                ? 'ב־List_Sources חובה למלא 3–6 שדות מעקב לטבלה פעילה.'
                : `ב־List_Sources חובה למלא 3–6 שדות מעקב לטבלה פעילה (כרגע ${configured}).`;
        return {kind: 'config-thin', configured, usable, why, hint};
    }
    if (usable < 3) {
        return {
            kind: 'not-enabled',
            configured,
            usable,
            why: ' (שדות המעקב לא מופעלים באלמנט)',
            hint: `שדות המעקב מוגדרים ב־List_Sources (${configured}) אך לא מופעלים על האלמנט – יש להפעיל אותם בפאנל השדות / Data של האלמנט (כרגע זמינים ${usable}).`,
        };
    }
    return {kind: 'ok', configured, usable, why: '', hint: ''};
}

/** 1–3 tracking values for a matched record (Hebrew label + cell text), for home/list cards and dynamic rows */
export function trackPreview(source: Source, r: AirtableRecord, max = 3): Array<{he: string; value: string}> {
    const out: Array<{he: string; value: string}> = [];
    for (const sf of usableFields(source)) {
        if (out.length >= max) break;
        const raw = r.getCellValue(sf.field);
        if (raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0)) continue;
        const value = cellNames(raw).join(', ') || (typeof raw === 'number' || typeof raw === 'boolean' ? String(raw) : r.getCellValueAsString(sf.field));
        const v = value.trim();
        if (!v) continue;
        out.push({he: sf.he, value: v});
    }
    return out;
}

// ---------- spec ----------
/** key = field id (v0.4.0 "CondN Field ID") or the legacy curated English name ("CondN Field" select) */
export type Cond = {key: string; op: string; value: string};
export type DynSpec = {sourceRef: string; conds: Cond[]};
export function condField(s: Source, key: string): SourceField | null {
    const k = key.trim();
    if (!k) return null;
    return s.fields.find((f) => f.field?.id === k || f.ref === k || f.ref.split('|').includes(k) || f.field?.name === k) ?? null;
}

// ---------- values ----------
const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
const dayFmt = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit'});
/** calendar day in Asia/Jerusalem ("YYYY-MM-DD"); date-only cells are already a calendar day */
export function jerusalemDay(v: string): string | null {
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : dayFmt.format(d);
}
const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
/** names in a select / multi / link / lookup / collaborator cell */
export function cellNames(v: unknown): string[] {
    if (v == null) return [];
    if (Array.isArray(v)) return v.flatMap((x) => cellNames(x));
    if (typeof v === 'object') {
        const o = v as {name?: unknown; value?: unknown; email?: unknown};
        if (typeof o.name === 'string') return [o.name];
        if ('value' in o) return cellNames(o.value);
        return [];
    }
    return [String(v)];
}
const isEmptyCell = (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0);
/** choice names of a select field (for the value dropdown and for writing legacy selects) */
export function choiceNames(f: Field | null): string[] {
    if (!f) return [];
    const cfg = (f as unknown as {config?: {options?: {choices?: Array<{name: string}>} | null}}).config;
    return (cfg?.options?.choices ?? []).map((c) => c.name);
}

export function condValid(type: FType, op: string, value: string): boolean {
    if (!(OPS_BY_TYPE[type] as string[]).includes(op)) return false;
    if (!needsValue(op as Op)) return true;
    const v = value.trim();
    if (!v) return false;
    if (type === 'date') return isDay(v);
    if (type === 'number') return Number.isFinite(Number(v));
    return true;
}
export function evalCond(type: FType, op: Op, value: string, cell: unknown): boolean {
    const v = value.trim();
    switch (op) {
        case 'is empty':
            return type === 'checkbox' ? !cell : isEmptyCell(cell);
        case 'is not empty':
            return type === 'checkbox' ? Boolean(cell) : !isEmptyCell(cell);
        case 'is checked':
            return Boolean(cell);
        case 'is not checked':
            return !cell;
        case 'is':
            if (type === 'number') return typeof cell === 'number' && cell === Number(v);
            if (type === 'text') return norm(cellNames(cell).join(', ')) === norm(v);
            return cellNames(cell).some((n) => norm(n) === norm(v));
        case 'is not':
            if (type === 'text') return norm(cellNames(cell).join(', ')) !== norm(v);
            return !cellNames(cell).some((n) => norm(n) === norm(v));
        case 'contains':
            if (type === 'text') return norm(cellNames(cell).join(' ')).includes(norm(v));
            return cellNames(cell).some((n) => norm(n) === norm(v));
        case 'does not contain':
            if (type === 'text') return !norm(cellNames(cell).join(' ')).includes(norm(v));
            return !cellNames(cell).some((n) => norm(n) === norm(v));
        case 'greater than':
            return typeof cell === 'number' && cell > Number(v);
        case 'less than':
            return typeof cell === 'number' && cell < Number(v);
        case 'is on':
        case 'is before':
        case 'is after': {
            if (typeof cell !== 'string' || !cell) return false;
            const day = jerusalemDay(cell);
            if (!day) return false;
            return op === 'is on' ? day === v : op === 'is before' ? day < v : day > v;
        }
    }
}

// ---------- run a spec against the loaded source records ----------
/** why a dynamic list can't be computed at all */
export type TableIssue = null | 'unknown' | 'inactive' | 'unavailable' | 'limit';
export type DynResult = {
    records: AirtableRecord[];
    source: Source | null;
    tableIssue: TableIssue;
    /** fields used by a condition that aren't exposed to the element ('not-enabled') or aren't in the table's config row ('not-curated') */
    missing: Array<{he: string; ref: string; why: 'not-enabled' | 'not-curated'}>;
    /** sensitive fields referenced by a condition – never evaluated */
    blocked: Array<{he: string; ref: string}>;
    /** 1-based condition numbers that are incomplete / invalid (ignored) */
    incomplete: number[];
    applied: Array<{sf: SourceField; op: Op; value: string}>;
};
/** records === null → the source's records aren't loaded (over the table limit) */
export function runSpec(spec: DynSpec, source: Source | null, records: AirtableRecord[] | null): DynResult {
    const res: DynResult = {records: [], source, tableIssue: null, missing: [], blocked: [], incomplete: [], applied: []};
    if (!source) res.tableIssue = 'unknown';
    else if (!source.active) res.tableIssue = 'inactive';
    else if (!source.table) res.tableIssue = 'unavailable';
    else if (!records) res.tableIssue = 'limit';
    if (res.tableIssue || !source) return res;
    const applied: Array<{sf: SourceField; f: Field; op: Op; value: string}> = [];
    spec.conds.forEach((cd, i) => {
        if (!cd.key && !cd.op && !cd.value) return; // unused slot
        const sf = condField(source, cd.key);
        if (!sf) {
            if (sensitiveField(cd.key)) res.blocked.push({he: cd.key, ref: cd.key});
            else if (cd.key) res.missing.push({he: cd.key, ref: cd.key, why: 'not-curated'});
            else res.incomplete.push(i + 1);
            return;
        }
        if (sf.issue === 'sensitive') {
            if (!res.blocked.some((b) => b.ref === sf.ref)) res.blocked.push({he: sf.he, ref: sf.ref});
            return;
        }
        if (sf.issue === 'missing') {
            if (!res.missing.some((m) => m.ref === sf.ref)) res.missing.push({he: sf.he, ref: sf.ref, why: 'not-enabled'});
            return;
        }
        if (!sf.field || !sf.type || !condValid(sf.type, cd.op, cd.value)) {
            res.incomplete.push(i + 1);
            return;
        }
        applied.push({sf, f: sf.field, op: cd.op as Op, value: cd.value});
    });
    res.applied = applied.map(({sf, op, value}) => ({sf, op, value}));
    if (res.missing.length || res.blocked.length) return res; // can't compute honestly → show nothing + a Hebrew notice
    res.records = (records ?? []).filter((r) => applied.every((a) => evalCond(a.sf.type!, a.op, a.value, r.getCellValue(a.f))));
    return res;
}

// ---------- Hebrew texts ----------
export const heDay = (d: string) => (isDay(d) ? d.split('-').reverse().join('.') : d);
export function condHe(sf: SourceField, op: Op, value: string): string {
    const v = !needsValue(op) ? '' : sf.type === 'date' ? ` ${heDay(value)}` : ` ״${value.trim()}״`;
    return `${sf.he} ${OP_HE[op]}${v}`;
}
/** "עמודי אתר · סטטוס פרסום עמוד לא ריק וגם סטטוס פרסום עמוד אינו ״פורסם״" (gender-neutral for any configured table) */
export function summaryHe(spec: DynSpec, source: Source | null): string {
    if (!source) return spec.sourceRef ? `טבלה לא מוגדרת (${spec.sourceRef})` : 'לא נבחרה טבלת מקור';
    const parts: string[] = [];
    for (const cd of spec.conds) {
        const sf = condField(source, cd.key);
        if (sf && !sf.issue && sf.type && condValid(sf.type, cd.op, cd.value)) parts.push(condHe(sf, cd.op as Op, cd.value));
    }
    return parts.length ? `${source.he} · ${parts.join(' וגם ')}` : `${source.he} · ללא תנאים (כל הרשומות)`;
}
const ONE: Partial<{[k in Kind]: string}> = {film: 'סרט אחד', slot: 'משבצת אחת', person: 'אדם אחד'};
/** "6 סרטים", "סרט אחד", "3 עמודי אתר", "רשומה אחת (עמודי אתר)" */
export function countHe(source: Source | null, n: number): string {
    if (!source) return n === 1 ? 'פריט אחד' : `${n} פריטים`;
    if (n === 1) return (source.kind && ONE[source.kind]) || `רשומה אחת (${source.he})`;
    return `${n} ${source.he}`;
}
