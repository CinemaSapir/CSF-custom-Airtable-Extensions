// v0.4.5 — per-pill aggregation + the ONE computed pill result shared by the pill and «מצב חיבור».
// Pure (no Airtable / React imports; tests/v045.test.mts).
import type {StatusFilter} from './statusCore';
//
// the owner 10:29: the panel said «סרטים 67 / 303» but the pill showed another number — the pill ran the phase-aware
// "films left to schedule" math (counts.ts) over the filtered films, the panel showed the filter match count.
// Fix: computePill() is the single source of truth; the pill renders .value and the panel renders the same object.
//
// Modes (right pane «צבירה» → Extension_Config Option_List_2 → code default):
//   count     = number of records that pass the pill's filter (DEFAULT for every pill)
//   sum       = sum of a number field over the records that pass the filter (tickets default: Invitations.«Tickets Given»)
//   remaining = v0.4.4 phase logic (before: not yet משובץ / during: still to come) over the filtered set — opt-in,
//               only films / events / projects.
// Option_List_2 (one line per pill):  tickets = sum: Tickets Given   ·   films = count   ·   events = remaining
//   pill name = key (films, events, projects, invitations, tickets, sold) or its Hebrew label; field optional.

export type AggMode = 'count' | 'sum' | 'remaining';

export const AGG_OPS: ReadonlyArray<{value: 'auto' | AggMode; label: string}> = [
    {value: 'auto', label: 'לפי Extension_Config / ברירת מחדל'},
    {value: 'count', label: 'ספירת רשומות (count)'},
    {value: 'sum', label: 'סכום שדה מספרי (sum)'},
    {value: 'remaining', label: 'נותרו לפי שלב הפסטיבל (remaining)'},
];
export const AGG_LABEL: Record<AggMode, string> = {count: 'ספירה', sum: 'סכום', remaining: 'נותרו (לפי שלב)'};

const loose = (s: unknown) =>
    String(s ?? '')
        .normalize('NFC')
        .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u00A0]/g, '')
        .toLowerCase()
        .replace(/[\s_\-.]+/g, '');

/** "sum" / "Sum" / «סכום» / "count" / «ספירה» / "remaining" / «נותרו» / pasted label «… (sum)» → mode; auto/empty/unknown → null. */
export function parseAggMode(s: unknown): AggMode | null {
    let raw = String(s ?? '').trim();
    const paren = /\(([^)]+)\)\s*$/.exec(raw);
    if (paren) raw = paren[1];
    const k = loose(raw);
    if (['count', 'ספירה', 'ספירת', 'ספירתרשומות', 'מספר'].includes(k)) return 'count';
    if (['sum', 'סכום', 'סך', 'סה"כ', 'סהכ', 'total'].includes(k)) return 'sum';
    if (['remaining', 'left', 'נותרו', 'נותר', 'phase'].includes(k)) return 'remaining';
    return null;
}

export type AggLine = {mode: AggMode; field: string; line: number};
/** Option_List_2 text → per-pill line, keyed by loose pill name. Bad lines are reported, never thrown. */
export function parseAggList(text: string, pillNames: Record<string, readonly string[]>): {byPill: Map<string, AggLine>; bad: number[]} {
    const byPill = new Map<string, AggLine>();
    const bad: number[] = [];
    String(text ?? '')
        .split(/\r?\n/)
        .forEach((rawLine, i) => {
            const line = rawLine.trim();
            if (!line) return;
            const m = /^([^=:]+?)\s*[=:]\s*([^:]+?)(?:\s*:\s*(.+))?$/.exec(line);
            const pill = m ? Object.keys(pillNames).find(k => pillNames[k].some(n => loose(n) === loose(m[1]))) : undefined;
            const mode = m ? parseAggMode(m[2]) : null;
            if (!m || !pill || !mode) {
                bad.push(i + 1);
                return;
            }
            if (!byPill.has(pill)) byPill.set(pill, {mode, field: (m[3] ?? '').trim(), line: i + 1});
        });
    return {byPill, bad};
}

export type AggPick = {mode: AggMode; field: string; via: string};
/** Right pane → Option_List_2 line → code default. Field: pane → line → Source_Field_N → code default (sum only). */
export function pickAgg(
    pane: {mode: unknown; field: string},
    line: AggLine | undefined,
    slotField: string,
    dflt: {mode: AggMode; field: string},
    allowRemaining: boolean,
): AggPick {
    const paneMode = parseAggMode(pane.mode);
    let mode: AggMode;
    let via: string;
    if (paneMode) {
        mode = paneMode;
        via = 'חלונית';
    } else if (line) {
        mode = line.mode;
        via = `Option_List_2 שורה ${line.line}`;
    } else {
        mode = dflt.mode;
        via = 'ברירת מחדל';
    }
    if (mode === 'remaining' && !allowRemaining) mode = 'count';
    const field = mode === 'sum' ? pane.field.trim() || line?.field || slotField.trim() || dflt.field : '';
    return {mode, field, via};
}

/** Number cell / lookup / rollup / "12" / "1,200" → number; anything else null. */
export function cellNumber(raw: unknown, text?: string): number | null {
    if (typeof raw === 'number') return isFinite(raw) ? raw : null;
    if (Array.isArray(raw)) {
        const ns = raw.map(x => cellNumber(x && typeof x === 'object' && 'value' in x ? (x as {value: unknown}).value : x)).filter((n): n is number => n !== null);
        return ns.length ? ns.reduce((a, b) => a + b, 0) : null;
    }
    if (raw && typeof raw === 'object' && 'value' in raw) return cellNumber((raw as {value: unknown}).value);
    const s = typeof raw === 'string' ? raw : (text ?? '');
    const t = s.replace(/[,\s\u00A0]/g, '');
    if (!t || !/^-?\d+(\.\d+)?$/.test(t)) return null;
    return Number(t);
}

/** Inputs for ONE pill, all already resolved by the reader. */
export type PillCalcInput = {
    /** all record ids of the pill's table; null = table missing / not loaded */
    ids: readonly string[] | null;
    /** filter pass-set; null = no active filter */
    pass: ReadonlySet<string> | null;
    agg: AggPick;
    /** sum mode: is the sum field resolved? */
    sumFieldOk: boolean;
    /** sum mode: id → numeric value (only for resolvable rows) */
    numbers?: ReadonlyMap<string, number | null>;
    /** remaining mode: the phase logic run over the filtered set (counts.ts), null = not computable */
    remaining?: number | null;
};
export type PillResult = {
    /** THE number on the pill (null → «—») */
    value: number | null;
    /** records that pass the filter (null = table missing) */
    matched: number | null;
    total: number | null;
    mode: AggMode;
    /** «ספירה» / «סכום Tickets Given» / «נותרו (לפי שלב)» */
    aggText: string;
    /** sum mode: rows whose cell was empty / not a number */
    skipped: number;
    problem: string | null;
};

export function computePill(i: PillCalcInput): PillResult {
    const total = i.ids ? i.ids.length : null;
    const kept = i.ids ? (i.pass ? i.ids.filter(id => i.pass!.has(id)) : [...i.ids]) : null;
    const matched = kept ? kept.length : null;
    const base = {matched, total, mode: i.agg.mode, skipped: 0, problem: null as string | null};
    if (!kept) return {...base, value: null, aggText: AGG_LABEL[i.agg.mode]};
    if (i.agg.mode === 'sum') {
        const aggText = `${AGG_LABEL.sum} ${i.agg.field || '—'}`;
        if (!i.agg.field) return {...base, value: null, aggText, problem: 'לא נבחר שדה לסכום'};
        if (!i.sumFieldOk) return {...base, value: null, aggText, problem: `שדה הסכום «${i.agg.field}» לא נמצא / לא מופעל לאלמנט`};
        let sum = 0;
        let skipped = 0;
        for (const id of kept) {
            const n = i.numbers?.get(id) ?? null;
            if (n === null) skipped++;
            else sum += n;
        }
        return {...base, value: sum, aggText, skipped};
    }
    if (i.agg.mode === 'remaining') {
        const v = i.remaining ?? null;
        return {...base, value: v, aggText: AGG_LABEL.remaining, problem: v === null ? 'לא ניתן לחשב «נותרו» (חסר קישור / שדה התחלה)' : null};
    }
    return {...base, value: matched, aggText: AGG_LABEL.count};
}

/** 1830 → "1,830"; null → «—» (same as counts.ts formatCount). */
function fmt(n: number | null | undefined): string {
    return typeof n === 'number' && isFinite(n) ? n.toLocaleString('en-US') : '—';
}

// ---- v0.4.5: the pill row and the «מצב חיבור» row are built from the SAME PillResult (single source of truth) ----


export type PillFilterDiag = {table: string | null; field: string | null; via: string; op: string; values: string[]};
export type PillPrep = {
    key: string;
    label: string;
    calc: PillCalcInput;
    filter: PillFilterDiag;
    filterTitle: string | null;
    hint: string | null;
    /** reserved pill (sold tickets) not configured yet: «—» without a red hint */
    reserved?: boolean;
};
export type BuiltPill = {
    key: string;
    label: string;
    value: number | null;
    filterTitle: string | null;
    hint: string | null;
    result: PillResult;
    row: StatusFilter;
};

/** remainingByKey: phase logic results (counts.ts) over the filtered sets, used only in 'remaining' mode. */
export function buildPills(preps: readonly PillPrep[], remainingByKey: Readonly<Record<string, number | null>>): BuiltPill[] {
    return preps.map(p => {
        const result = computePill({...p.calc, remaining: remainingByKey[p.key] ?? null});
        const hint = [p.hint, !p.reserved ? result.problem : null].filter(Boolean).join(' · ') || null;
        const skipped = result.mode === 'sum' && result.skipped ? ` (${result.skipped} ריקות)` : '';
        const title = [p.filterTitle, result.mode !== 'count' ? `${result.aggText}${skipped}` : null].filter(Boolean).join(' · ') || null;
        return {
            key: p.key,
            label: p.label,
            value: result.value,
            filterTitle: title,
            hint,
            result,
            row: {
                label: p.label,
                table: p.filter.table,
                field: p.filter.field,
                via: p.filter.via,
                op: p.filter.op,
                values: p.filter.values,
                matched: result.matched,
                total: result.total,
                extra: p.reserved && !p.calc.ids ? '— (שמור, לא הוגדר)' : `${fmt(result.value)} · ${result.aggText}${skipped}`,
                bad: !p.reserved && (!!result.problem || p.filter.via.includes('✗')),
            },
        };
    });
}
