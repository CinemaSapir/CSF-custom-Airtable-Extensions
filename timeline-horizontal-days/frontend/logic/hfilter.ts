/**
 * «טיימליין אופקי» v0.1.2 — per-table configurable filters (the owner 05:22, item 10). Horizontal-only (core.ts stays byte-identical
 * with the vertical); a later vertical port can move this file over as-is.
 *  - ops: הוא (is any of) · אינו (is none of) · מכיל (contains) · לא מכיל · ריק (is empty) · לא ריק (is not empty)
 *  - a table's filter list comes from the right pane (field / op / values + «more» lines) or Extension_Config Filter_N cells written
 *    `Table.Field <op> v1|v2` (one per line, Hebrew or English op words, loose table/field names); a line with no op/values only
 *    DECLARES the field as a dropdown in that table's funnel. No list → sensible defaults (status / type / location-like fields).
 *  - the configured conditions are the DEFAULT of each table's funnel (per user, «ברירת מחדל» resets) and filter the timeline AND
 *    the cross-section window (the window's own filters add on top — existing rule).
 */
import {FACETS, dimValues, isFacetDim, type FacetKey, type Item} from './core';

export type HOp = 'any' | 'none' | 'contains' | 'ncontains' | 'empty' | 'notempty';
export const H_OPS: HOp[] = ['any', 'none', 'contains', 'ncontains', 'empty', 'notempty'];
export const OP_HE: {[k in HOp]: string} = {any: 'הוא', none: 'אינו', contains: 'מכיל', ncontains: 'לא מכיל', empty: 'ריק', notempty: 'לא ריק'};
export const OP_FULL: {[k in HOp]: string} = {
    any: 'הוא אחד מ (is any of)',
    none: 'אינו אחד מ (is none of)',
    contains: 'מכיל (contains)',
    ncontains: 'לא מכיל (does not contain)',
    empty: 'ריק (is empty)',
    notempty: 'לא ריק (is not empty)',
};
/** ops that need no values */
export const noVals = (op: HOp) => op === 'empty' || op === 'notempty';

const norm = (s: unknown) =>
    String(s ?? '')
        .normalize('NFC')
        .replace(/[\u0591-\u05C7\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

/** operator words (EN / HE / symbols), longest first so «is not empty» never reads as «is not» */
const OP_WORDS: Array<[string, HOp]> = (
    [
        ['is not empty', 'notempty'],
        ['isnotempty', 'notempty'],
        ['not empty', 'notempty'],
        ['is filled', 'notempty'],
        ['אינו ריק', 'notempty'],
        ['איננו ריק', 'notempty'],
        ['לא ריק', 'notempty'],
        ['לא ריקה', 'notempty'],
        ['מלא', 'notempty'],
        ['קיים', 'notempty'],
        ['is empty', 'empty'],
        ['isempty', 'empty'],
        ['empty', 'empty'],
        ['ריק', 'empty'],
        ['ריקה', 'empty'],
        ['does not contain', 'ncontains'],
        ["doesn't contain", 'ncontains'],
        ['not contains', 'ncontains'],
        ['not contain', 'ncontains'],
        ['ncontains', 'ncontains'],
        ['אינו מכיל', 'ncontains'],
        ['לא מכיל', 'ncontains'],
        ['לא כולל', 'ncontains'],
        ['אינו כולל', 'ncontains'],
        ['contains', 'contains'],
        ['contain', 'contains'],
        ['includes', 'contains'],
        ['like', 'contains'],
        ['מכיל', 'contains'],
        ['כולל', 'contains'],
        ['is none of', 'none'],
        ['none of', 'none'],
        ['is not', 'none'],
        ["isn't", 'none'],
        ['isnt', 'none'],
        ['not in', 'none'],
        ['not', 'none'],
        ['אינו אחד מ', 'none'],
        ['אינו אחד', 'none'],
        ['אינו', 'none'],
        ['איננו', 'none'],
        ['אינה', 'none'],
        ['לא שווה', 'none'],
        ['לא', 'none'],
        ['is any of', 'any'],
        ['any of', 'any'],
        ['is one of', 'any'],
        ['equals', 'any'],
        ['is', 'any'],
        ['הוא אחד מ', 'any'],
        ['אחד מ', 'any'],
        ['הוא', 'any'],
        ['היא', 'any'],
        ['שווה', 'any'],
        ['שווה ל', 'any'],
    ] as Array<[string, HOp]>
).sort((a, b) => b[0].length - a[0].length);
const OP_SYMS: Array<[string, HOp]> = [
    ['!~', 'ncontains'],
    ['!=', 'none'],
    ['<>', 'none'],
    ['≠', 'none'],
    ['==', 'any'],
    ['~', 'contains'],
    ['=', 'any'],
    [':', 'any'],
];

/** an operator cell (right-pane enum value, Filter_Operator_N text in English or Hebrew, a symbol) → HOp; unknown/empty → any */
export function parseHOp(s: unknown): HOp {
    const v = norm(s);
    if (!v) return 'any';
    if ((H_OPS as string[]).includes(v)) return v as HOp;
    for (const [w, op] of OP_SYMS) if (v === w) return op;
    for (const [w, op] of OP_WORDS) if (v === w || v.startsWith(w + ' ') || v.startsWith(w + '…') || v.startsWith(w + '...')) return op;
    return 'any';
}
export const splitList = (s: unknown) =>
    String(s ?? '')
        .split(/[|;\n]/)
        .map(x => x.trim())
        .filter(Boolean);

/** a record's values vs the condition (empty value list = no filter, except ריק / לא ריק) */
export function passH(have: string[] | undefined, op: HOp, want: string[]): boolean {
    const h = (have ?? []).map(x => String(x).trim()).filter(Boolean);
    if (op === 'empty') return h.length === 0;
    if (op === 'notempty') return h.length > 0;
    if (!want.length) return true;
    if (op === 'contains' || op === 'ncontains') {
        const hn = h.map(norm);
        const hit = want.map(norm).some(w => !!w && hn.some(x => x.includes(w)));
        return op === 'contains' ? hit : !hit;
    }
    const hs = new Set(h);
    const hn = new Set(h.map(norm));
    const hit = want.some(w => hs.has(w) || hn.has(norm(w)));
    return op === 'any' ? hit : !hit;
}

export type HDim = {op: HOp; vals: string[]};
export type HColFilter = {[dim: string]: HDim};
export type HColFilters = {[table: string]: HColFilter};
export const dimActive = (d?: HDim) => !!d && (noVals(d.op) || (d.vals?.length ?? 0) > 0);
export function hPassCol(i: Item, cf: HColFilters, skipDim?: string): boolean {
    const c = cf[i.table];
    if (!c) return true;
    for (const d in c) {
        if (d === skipDim || !dimActive(c[d])) continue;
        if (!passH(dimValues(i, d), c[d].op, c[d].vals)) return false;
    }
    return true;
}
/** funnel badge: picked values (+1 per ריק / לא ריק condition) */
export const hColCount = (c?: HColFilter) => Object.values(c ?? {}).reduce((n, d) => n + (!d ? 0 : noVals(d.op) ? 1 : (d.vals?.length ?? 0)), 0);
export function hEffectiveCF(user: HColFilters, defaults: HColFilters, tables: string[]): HColFilters {
    const out: HColFilters = {};
    for (const t of tables) {
        const c = Object.prototype.hasOwnProperty.call(user, t) ? user[t] : defaults[t];
        if (c && hColCount(c)) out[t] = c;
    }
    return out;
}
export function hNormalizeCF(raw: unknown, tables: string[]): HColFilters {
    const out: HColFilters = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [t, c] of Object.entries(raw as {[k: string]: unknown})) {
        if (!tables.includes(t) || !c || typeof c !== 'object') continue;
        const cc: HColFilter = {};
        for (const [d, v] of Object.entries(c as {[k: string]: unknown})) {
            const o = v as {op?: unknown; vals?: unknown};
            if (!o || !Array.isArray(o.vals)) continue;
            cc[d] = {op: parseHOp(o.op), vals: o.vals.filter((x): x is string => typeof x === 'string')};
        }
        out[t] = cc;
    }
    return out;
}
export function hToggleVal(c: HColFilter | undefined, d: string, v: string): HColFilter {
    const cur = c?.[d] ?? {op: 'any' as HOp, vals: []};
    const vals = cur.vals.includes(v) ? cur.vals.filter(x => x !== v) : [...cur.vals, v];
    return {...(c ?? {}), [d]: {op: cur.op === 'empty' || cur.op === 'notempty' ? 'any' : cur.op, vals}};
}
export function hSetOp(c: HColFilter | undefined, d: string, op: HOp): HColFilter {
    const cur = c?.[d] ?? {op: 'any' as HOp, vals: []};
    return {...(c ?? {}), [d]: {op, vals: noVals(op) ? [] : cur.vals}};
}

/** a table's funnel: configured fields first (in their order, marked `cfg`), then the facets, then every other select/link field.
 *  Each dim lists the values present (counts among items passing search + the table's OTHER dims); picked values stay at 0. */
export function hColDims(
    tableItems: Item[],
    c: HColFilter | undefined,
    facetLabel: {[K in FacetKey]: string},
    passQ: (i: Item) => boolean,
    preferred: string[] = [],
): Array<{key: string; label: string; cfg: boolean; values: Array<{v: string; n: number}>}> {
    const keys: string[] = [];
    const sets: {[d: string]: Set<string>} = {};
    const fieldNames = [...new Set(tableItems.flatMap(i => Object.keys(i.fx ?? {})))];
    const pref = preferred.map(f => 'f:' + f);
    const order = [...pref, ...FACETS, ...fieldNames.map(f => 'f:' + f).filter(d => !pref.includes(d))];
    for (const d of order) {
        if (keys.includes(d)) continue;
        const all = new Set(tableItems.flatMap(i => dimValues(i, d)).filter(Boolean));
        (c?.[d]?.vals ?? []).forEach(v => all.add(v));
        const isPref = pref.includes(d);
        if (!all.size && !isPref && !dimActive(c?.[d])) continue;
        const key = [...all].sort().join('\u0001');
        if (!isPref && d.startsWith('f:') && keys.some(k => isFacetDim(k) && [...sets[k]].sort().join('\u0001') === key)) continue;
        // a facet that just repeats a configured field (Status ↔ סטטוס, Location ↔ מיקום) → the configured field only
        if (isFacetDim(d) && keys.some(k => pref.includes(k) && sets[k].size > 0 && [...sets[k]].sort().join('\u0001') === key)) continue;
        keys.push(d);
        sets[d] = all;
    }
    return keys.map(d => {
        const n: {[v: string]: number} = {};
        for (const i of tableItems) if (passQ(i) && hPassCol(i, {[i.table]: c ?? {}}, d)) for (const v of new Set(dimValues(i, d))) n[v] = (n[v] || 0) + 1;
        return {
            key: d,
            label: isFacetDim(d) ? facetLabel[d] : d.slice(2),
            cfg: pref.includes(d),
            values: [...sets[d]].sort((a, b) => a.localeCompare(b, 'he')).map(v => ({v, n: n[v] || 0})),
        };
    });
}

// ---------------------------------------------------------------- config text → filter specs
export type HFilterLine = {table: string | null; field: string; op: HOp | null; vals: string[]};
/** one line: `Table.Field <op> v1|v2`, `Field <op> …` (table given by the context), or just `Table.Field` (declares a dropdown).
 *  Field / table names may contain spaces; the operator is found as a symbol (= != ≠ ~) or a word surrounded by spaces. */
export function parseFilterLine(line: string, tableKnown = false): HFilterLine | null {
    const s = String(line ?? '').trim();
    if (!s) return null;
    let refPart = s,
        op: HOp | null = null,
        rest = '';
    // symbols first (only outside the first «.»-separated table part — table names have no symbols)
    let best: {i: number; len: number; op: HOp} | null = null;
    for (const [w, o] of OP_SYMS) {
        if (w === ':' && /^[a-z]+:\/\//i.test(s)) continue;
        const i = s.indexOf(w);
        if (i > 0 && (!best || i < best.i || (i === best.i && w.length > best.len))) best = {i, len: w.length, op: o};
    }
    if (best) {
        refPart = s.slice(0, best.i).trim();
        rest = s.slice(best.i + best.len).trim();
        op = best.op;
        // «Status = ריק» / «Status != ריק» → empty / not empty
        const r = norm(rest);
        if (r && ['ריק', 'empty', '(empty)', '∅'].includes(r)) {
            op = op === 'none' ? 'notempty' : 'empty';
            rest = '';
        }
    } else {
        const low = ' ' + norm(s) + ' ';
        let wb: {i: number; w: string; op: HOp} | null = null;
        for (const [w, o] of OP_WORDS) {
            const i = low.indexOf(' ' + w + ' ');
            if (i > 0 && (!wb || i < wb.i || (i === wb.i && w.length > wb.w.length))) wb = {i, w, op: o};
        }
        if (wb) {
            // map back onto the original string: same normalised prefix length (norm keeps characters 1:1 except marks/space runs)
            const words = s.split(/\s+/);
            const opWords = wb.w.split(' ').length;
            const preLen = norm(low.slice(0, wb.i)).split(' ').filter(Boolean).length;
            refPart = words.slice(0, preLen).join(' ');
            rest = words.slice(preLen + opWords).join(' ');
            op = wb.op;
        }
    }
    let table: string | null = null,
        field = refPart.trim();
    const dot = field.indexOf('.');
    if (dot > 0 && dot < field.length - 1) {
        table = field.slice(0, dot).trim();
        field = field.slice(dot + 1).trim();
    } else if (!tableKnown) return null;
    field = field.replace(/^["'«]|["'»]$/g, '').trim();
    if (!field) return null;
    return {table, field, op, vals: op && noVals(op) ? [] : splitList(rest.replace(/^["'«]|["'»]$/g, ''))};
}
/** a whole cell (several lines) + optional operator / values cells (used when a line has none) */
export function parseFilterCell(cell: unknown, opCell?: unknown, valCell?: unknown, tableKnown = false): HFilterLine[] {
    const lines = String(cell ?? '')
        .split(/\r?\n/)
        .map(x => x.trim())
        .filter(Boolean);
    const out: HFilterLine[] = [];
    for (const ln of lines) {
        const p = parseFilterLine(ln, tableKnown);
        if (!p) continue;
        if (p.op === null && lines.length === 1) {
            const oc = String(opCell ?? '').trim();
            const vc = splitList(valCell);
            if (oc || vc.length) {
                p.op = parseHOp(oc);
                p.vals = noVals(p.op) ? [] : vc;
            }
        }
        out.push(p);
    }
    return out;
}
/** no configured list → the fields worth a dropdown: status / type / location-like names, select or link fields first */
const LIKE = /(status|סטטוס|מצב|type|סוג|kind|category|קטגוריה|location|מיקום|hall|אולם|venue|place|מקום|room|חדר|stage|במה|hotel|מלון|department|מחלקה|team|צוות|role|תפקיד|phase|שלב)/i;
export function defaultFilterFields(fields: ReadonlyArray<{name: string; type: string}>, max = 4): string[] {
    const sel = (t: string) => /^(singleSelect|multipleSelects)$/.test(t);
    const lnk = (t: string) => /^(multipleRecordLinks|multipleLookupValues|singleCollaborator|multipleCollaborators)$/.test(t);
    const hits = fields.filter(f => LIKE.test(f.name) && (sel(f.type) || lnk(f.type)));
    hits.sort((a, b) => (sel(a.type) ? 0 : 1) - (sel(b.type) ? 0 : 1));
    return hits.slice(0, max).map(f => f.name);
}
