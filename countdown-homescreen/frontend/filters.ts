// Fixed per-pill filters (v0.4.0). Pure logic, no Airtable / React imports (unit-tested in tests/filters.test.mts).
// Precedence (the owner 23:48): element RIGHT PANE first → Extension_Config row (Filter_N, only if that table exists)
// → code default = no filter. A filter whose field is missing is IGNORED (pill counts unfiltered + small hint); never throws.

export type PillKey = 'films' | 'events' | 'projects' | 'invitations' | 'tickets' | 'sold';

export type FilterOp = 'none' | 'is' | 'is_not' | 'contains' | 'is_empty' | 'is_not_empty' | 'is_checked' | 'is_not_checked';

/** Right-pane operator dropdown, in this order. Labels = what the owner sees. */
export const FILTER_OPS: ReadonlyArray<{value: FilterOp; label: string}> = [
    {value: 'none', label: 'ללא סינון'},
    {value: 'is', label: 'שווה ל (is)'},
    {value: 'is_not', label: 'שונה מ (is not)'},
    {value: 'contains', label: 'מכיל (contains)'},
    {value: 'is_empty', label: 'ריק (is empty)'},
    {value: 'is_not_empty', label: 'לא ריק (is not empty)'},
    {value: 'is_checked', label: 'מסומן (is checked)'},
    {value: 'is_not_checked', label: 'לא מסומן (is not checked)'},
];

const NEEDS_VALUE: ReadonlySet<FilterOp> = new Set(['is', 'is_not', 'contains']);

/** On-screen order; table = code default (Source_Table_N), labelSlot = Content_Text_N. */
export const PILLS: ReadonlyArray<{key: PillKey; tableSlot: string; defaultTable: string; labelSlot: string}> = [
    {key: 'films', tableSlot: 'Source_Table_4', defaultTable: 'Films', labelSlot: 'Content_Text_3'},
    {key: 'events', tableSlot: 'Source_Table_3', defaultTable: 'Slots_Events', labelSlot: 'Content_Text_4'},
    {key: 'projects', tableSlot: 'Source_Table_5', defaultTable: 'Projects', labelSlot: 'Content_Text_5'},
    {key: 'invitations', tableSlot: 'Source_Table_2', defaultTable: 'Invitations', labelSlot: 'Content_Text_2'},
    // v0.4.5: there is NO Tickets table — invitation tickets = SUM of Invitations.«Tickets Given» (Source_Field_1).
    {key: 'tickets', tableSlot: 'Source_Table_1', defaultTable: 'Invitations', labelSlot: 'Content_Text_1'},
    // v0.4.5: reserved for future SOLD tickets (another table / field). No default table → «—» until it's set.
    {key: 'sold', tableSlot: 'Source_Table_6', defaultTable: '', labelSlot: 'Content_Text_10'},
];

/** Custom-property keys per pill (stable — stored in the element's config; never rename). */
export const propKeys = (k: PillKey) => ({
    table: `${k}_table`,
    field: `${k}_filterField`,
    fieldName: `${k}_filterFieldName`,
    op: `${k}_filterOp`,
    value: `${k}_filterValue`,
    // v0.4.5 aggregation
    agg: `${k}_agg`,
    sumField: `${k}_sumField`,
    sumFieldName: `${k}_sumFieldName`,
});

/** Right-pane labels (Hebrew). */
export const propLabels = (pillLabel: string, key: PillKey) => ({
    table: key === 'events' ? `${pillLabel} · טבלה (גם מקור הטיימר)` : `${pillLabel} · טבלה`,
    field: `${pillLabel} · שדה סינון`,
    fieldName: `${pillLabel} · שדה סינון (שם השדה)`,
    op: `${pillLabel} · תנאי סינון`,
    value: `${pillLabel} · ערך סינון (כמה ערכים: א|ב)`,
    agg: `${pillLabel} · צבירה (ספירה / סכום)`,
    sumField: `${pillLabel} · שדה לסכום`,
    sumFieldName: `${pillLabel} · שדה לסכום (שם השדה)`,
});

export type FilterSpec = {
    /** Field name (for display / fallback lookup); fieldId if picked in the pane. */
    fieldName: string;
    fieldId?: string;
    op: FilterOp;
    values: string[];
    source: 'pane' | 'config';
};

/** "is not" / "is_not" / "IS NOT" / "" → FilterOp; unknown → null. Empty = 'is' (config rule "ריק = is"). */
const HEBREW_OPS: Record<string, FilterOp> = {
    'ללא סינון': 'none', ללא: 'none',
    'שווה ל': 'is', שווה: 'is', הוא: 'is', היא: 'is', '=': 'is',
    'שונה מ': 'is_not', שונה: 'is_not', 'אינו': 'is_not', 'איננו': 'is_not', 'לא שווה': 'is_not', '!=': 'is_not',
    מכיל: 'contains', מכילה: 'contains', כולל: 'contains',
    ריק: 'is_empty', 'לא ריק': 'is_not_empty',
    מסומן: 'is_checked', 'לא מסומן': 'is_not_checked',
};
export function parseOp(s: unknown, emptyAs: FilterOp = 'is'): FilterOp | null {
    let raw = String(s ?? '').trim();
    if (!raw) return emptyAs;
    const paren = /\(([^)]+)\)\s*$/.exec(raw); // a pasted label «שווה ל (is)» → "is"
    if (paren) raw = paren[1];
    const he = HEBREW_OPS[raw.replace(/\s+/g, ' ')];
    if (he) return he;
    const t = raw.toLowerCase().replace(/[\s-]+/g, '_');
    if (t === 'equals' || t === 'eq') return 'is';
    if (t === 'not' || t === 'isnt' || t === 'is_not_equal') return 'is_not';
    return (FILTER_OPS.find(o => o.value === t)?.value as FilterOp | undefined) ?? null;
}

/** Values for matching: "|" list; if there is no "|" but there are commas, the whole text AND each comma part (any-of). */
export function matchValues(s: unknown): string[] {
    const raw = String(s ?? '');
    const base = splitValues(raw);
    if (raw.includes('|') || !/[,،]/.test(raw)) return base;
    const parts = raw.split(/[,،]/).map(x => x.trim()).filter(Boolean);
    return Array.from(new Set([...base, ...parts]));
}

/** "a | b ||c" → ["a","b","c"] */
export function splitValues(s: unknown): string[] {
    return String(s ?? '')
        .split('|')
        .map(x => x.trim())
        .filter(Boolean);
}

/**
 * Comparable form. v0.4.3: strips invisible bidi / zero-width marks that an RTL properties panel inserts
 * (U+200E/F, U+202A–E, U+2066–9, U+200B–D, U+FEFF), folds NBSP, gershayim/geresh → ASCII quotes, dash variants → "-".
 */
export const norm = (s: string) =>
    String(s ?? '')
        .normalize('NFC')
        .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u061C]/g, '')
        .replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '')
        .replace(/[\u05F4\u201C\u201D\u201E\u05F3\u2018\u2019\u0060\u00B4]/g, c => ('\u05F4\u201C\u201D\u201E'.includes(c) ? '"' : "'"))
        .replace(/[\u2010-\u2015\u05BE\u2212]/g, '-')
        .replace(/[\s\u00A0]+/g, ' ')
        .trim()
        .toLowerCase();

/**
 * Cell → list of comparable names. Linked records / selects / collaborators / attachments by NAME
 * ({name}, then {email}, {filename}), lookups ({value}) recursively, numbers as text, booleans as "true".
 */
export function cellNames(raw: unknown, text?: string): string[] {
    const out: string[] = [];
    const walk = (v: unknown, depth: number) => {
        if (v === null || v === undefined || depth > 4) return;
        if (typeof v === 'string') {
            if (v.trim()) out.push(v);
        } else if (typeof v === 'number') {
            if (isFinite(v)) out.push(String(v));
        } else if (typeof v === 'boolean') {
            if (v) out.push('true');
        } else if (Array.isArray(v)) {
            for (const x of v) walk(x, depth + 1);
        } else if (typeof v === 'object') {
            const o = v as {name?: unknown; email?: unknown; filename?: unknown; value?: unknown};
            if (typeof o.name === 'string' && o.name.trim()) out.push(o.name);
            else if (typeof o.email === 'string' && o.email.trim()) out.push(o.email);
            else if (typeof o.filename === 'string' && o.filename.trim()) out.push(o.filename);
            else if ('value' in o) walk(o.value, depth + 1);
        }
    };
    walk(raw, 0);
    if (!out.length && text && text.trim() && raw !== null && raw !== undefined && raw !== false) out.push(text);
    return out;
}

function isChecked(raw: unknown): boolean {
    if (raw === true) return true;
    if (Array.isArray(raw)) return raw.some(isChecked); // lookup of a checkbox
    if (raw && typeof raw === 'object' && 'value' in raw) return isChecked((raw as {value: unknown}).value);
    if (typeof raw === 'number') return raw !== 0;
    if (typeof raw === 'string') return ['true', '1', '✓', '✔', 'v', 'yes', 'כן'].includes(norm(raw));
    return false;
}

/** Does this cell pass the filter? raw = getCellValue, text = getCellValueAsString (optional). */
export function evaluateFilter(raw: unknown, f: Pick<FilterSpec, 'op' | 'values'>, text?: string): boolean {
    const names = cellNames(raw, text).map(norm);
    // is / contains also try the SDK's own display string (getCellValueAsString): covers any type cellNames misses.
    const cands = text && text.trim() && !names.includes(norm(text)) ? [...names, norm(text)] : names;
    const vals = f.values.map(norm).filter(Boolean);
    switch (f.op) {
        case 'none':
            return true;
        case 'is_empty':
            return names.length === 0;
        case 'is_not_empty':
            return names.length > 0;
        case 'is_checked':
            return isChecked(raw);
        case 'is_not_checked':
            return !isChecked(raw);
        case 'is':
            return !vals.length || cands.some(n => vals.includes(n));
        case 'is_not':
            return !vals.length || !cands.some(n => vals.includes(n));
        case 'contains': {
            if (!vals.length) return true;
            const joined = names.join(', ');
            return vals.some(v => cands.some(n => n.includes(v)) || joined.includes(v));
        }
        default:
            return true;
    }
}

export type PaneFilterInput = {
    /** Picked field (right-pane field picker): id + name, or null. */
    field: {id: string; name: string} | null;
    /** Typed field name (shown only when the pill's table isn't available to the picker). */
    fieldName: string;
    /** Raw stored field id (globalConfig) — set while `field` is null = picked in the pane but NOT enabled on the element. */
    pickedButHiddenId?: string | null;
    op: unknown;
    value: unknown;
};

/** Extension_Config Filter_N cell group, already split per pill by the reader. */
export type ConfigFilterInput = {n: number; field: string; op: unknown; value: unknown};

export type PickResult = {filters: FilterSpec[]; hint: string | null};

/** Right pane first; config only when the pane has no filter for this pill; else none. */
export function pickFilters(pane: PaneFilterInput | null, config: readonly ConfigFilterInput[]): PickResult {
    const paneOp = pane ? parseOp(pane.op, 'none') : 'none';
    if (pane && paneOp !== 'none') {
        if (paneOp === null) return {filters: [], hint: `תנאי סינון לא מוכר «${String(pane.op)}» — הסינון לא הופעל`};
        const fieldName = pane.field?.name || pane.fieldName.trim();
        if (!fieldName && pane.pickedButHiddenId)
            return {
                filters: [],
                hint: `השדה שנבחר בחלונית (${pane.pickedButHiddenId}) לא מאופשר באלמנט — יש להפעיל אותו ברשימת השדות של הטבלה ולפרסם. הסינון לא הופעל`,
            };
        if (!fieldName) return {filters: [], hint: 'לא נבחר שדה סינון — הסינון לא הופעל'};
        const values = matchValues(pane.value);
        if (NEEDS_VALUE.has(paneOp) && !values.length) return {filters: [], hint: 'חסר ערך סינון — הסינון לא הופעל'};
        return {filters: [{fieldName, fieldId: pane.field?.id, op: paneOp, values, source: 'pane'}], hint: null};
    }
    const out: FilterSpec[] = [];
    const bad: string[] = [];
    for (const c of config) {
        const op = parseOp(c.op, 'is');
        const values = matchValues(c.value);
        if (op === null || op === 'none' || !c.field.trim() || (NEEDS_VALUE.has(op) && !values.length)) {
            if (op !== 'none') bad.push(`Filter_${c.n}`);
            continue;
        }
        out.push({fieldName: c.field.trim(), op, values, source: 'config'});
    }
    return {filters: out, hint: bad.length ? `${bad.join(', ')} לא תקין — דולג` : null};
}

/** "Films.Status" → {table:"Films", field:"Status"}; no dot → table "" */
export function splitRef(ref: string): {table: string; field: string} {
    const s = ref.trim();
    const i = s.indexOf('.');
    return i > 0 ? {table: s.slice(0, i).trim(), field: s.slice(i + 1).trim()} : {table: '', field: s};
}

/**
 * Extension_Config row → per-table config filters. Filter_N may list several "Table.Field" joined by "|":
 * each part goes to the pill whose table it names. Parts without a table are skipped (ambiguous on this screen).
 */
export function configFiltersByTable(get: (slot: string) => string): Map<string, ConfigFilterInput[]> {
    const m = new Map<string, ConfigFilterInput[]>();
    for (let n = 1; n <= 10; n++) {
        const refs = splitValues(get(`Filter_${n}`));
        for (const r of refs) {
            const {table, field} = splitRef(r);
            if (!table || !field) continue;
            const k = norm(table);
            if (!m.has(k)) m.set(k, []);
            m.get(k)!.push({n, field, op: get(`Filter_Operator_${n}`), value: get(`Filter_Value_${n}`)});
        }
    }
    return m;
}

/** Human line for the pill tooltip: «Status שווה ל (is) משובץ | מתוכנן». */
export function describeFilter(f: FilterSpec): string {
    const op = FILTER_OPS.find(o => o.value === f.op)?.label ?? f.op;
    const src = f.source === 'pane' ? 'חלונית' : 'Extension_Config';
    return `${f.fieldName} ${op}${f.values.length ? ' ' + f.values.join(' | ') : ''} (${src})`;
}

/** Filter a list by id with a pass-set; null set = no filter. */
export function keepIds<T extends {id: string}>(items: readonly T[] | null, pass: ReadonlySet<string> | null): T[] | null {
    if (!items) return null;
    return pass ? items.filter(x => pass.has(x.id)) : [...items];
}

export type ApplyResult = {pass: Set<string> | null; title: string | null; hints: string[]};

/**
 * Resolve each spec's field (findField → null = missing / not enabled → that filter is IGNORED with a hint),
 * then AND the live filters over the records. A read that throws counts as "passes". Never throws.
 */
export function applyFilters<R extends {id: string}, Fd>(
    recs: readonly R[] | null,
    specs: readonly FilterSpec[],
    findField: (s: FilterSpec) => Fd | null,
    read: (r: R, f: Fd) => {raw: unknown; text?: string},
    tableName: string,
): ApplyResult {
    const hints: string[] = [];
    const live: {spec: FilterSpec; field: Fd}[] = [];
    for (const spec of specs) {
        let field: Fd | null = null;
        try {
            field = findField(spec);
        } catch {
            field = null;
        }
        if (field) live.push({spec, field});
        else hints.push(`שדה הסינון «${spec.fieldName}» לא נמצא או לא מאופשר בטבלה ${tableName} — הסינון לא הופעל`);
    }
    if (!live.length) return {pass: null, title: null, hints};
    const title = live.map(x => describeFilter(x.spec)).join(' AND ');
    if (!recs) return {pass: null, title, hints};
    const pass = new Set<string>();
    for (const r of recs) {
        const ok = live.every(({spec, field}) => {
            try {
                const c = read(r, field);
                return evaluateFilter(c.raw, spec, c.text);
            } catch {
                return true;
            }
        });
        if (ok) pass.add(r.id);
    }
    return {pass, title, hints};
}

/**
 * v0.4.3: the SDK returns the right-pane field object ONLY when that field is visible to the element; on any
 * mismatch (not enabled, table model re-created, repointed table) it returns undefined although the id is stored.
 * Resolve ourselves: stored id → typed/picked name (loose) → else a Hebrew hint naming the missing field.
 */
export function resolveFilterField<Fd extends {id: string; name: string}>(
    table: {name: string; fields: readonly Fd[]},
    want: {fieldId?: string | null; fieldName?: string | null; schemaName?: string | null},
): {field: Fd | null; via: 'id' | 'name' | null; hint: string | null} {
    const id = (want.fieldId ?? '').trim();
    if (id) {
        const f = table.fields.find(x => x.id === id);
        if (f) return {field: f, via: 'id', hint: null};
    }
    for (const n of [want.fieldName, want.schemaName]) {
        const k = norm(n ?? '');
        if (!k) continue;
        const f = table.fields.find(x => x.name === n) ?? table.fields.find(x => norm(x.name) === k);
        if (f) return {field: f, via: 'name', hint: null};
    }
    const label = (want.schemaName || want.fieldName || id || '').trim();
    return {
        field: null,
        via: null,
        hint: label
            ? `השדה «${label}» לא מופעל לאלמנט בטבלה ${table.name} — הסינון לא הופעל`
            : `לא נבחר שדה סינון — הסינון לא הופעל`,
    };
}
