/**
 * «טיימליין אופקי» — pure layout logic for the HORIZONTAL right-to-left view (v0.1.0).
 * Time runs right → left (earlier on the right); rows are tables. The time axis reuses the vertical Seg model:
 * a Seg's `y`/`h` are the distance from the right edge of the time area (`u`) and the width, so yOf / mOf /
 * xsPlan / axisTicks from core.ts work unchanged on the horizontal axis.
 */
import {DAY_MIN, NO_DAY, allDayOn, assignLanes, busyHours, compressedHeight, mergeLodging, type Day, type Item, type LodgeCluster, type Seg} from './core';

/** sizes (px) — row header width, lane pitch, bar height, day separator width */
export const HW = 200;
export const LANE = 26;
export const BAR = 22;
export const ROW_PAD = 6;
export const ROW_MIN = 44;
export const GROUP_GAP = 6;
export const SEP_W = 26;
export const RULER_H = 34;
/** v0.1.2 (the owner 05:20 #8): a row shrinks all the way down; text never scales — it is clipped, and hidden below one line */
export const LANE_MIN = 4;
/** below this lane height bars show no text (one 12.5px line needs ~16px) */
export const TEXT_MIN = 16;
export const LANE_MAX = 64;
export const LODGE_HEAD = 18;
export const LODGE_ROW = 17;

/** the horizontal time axis: [day separator][24 hours, empty stretches ≥ 2 h compressed to 7% (min 16px)] per day */
export function hAxis(days: Day[], timed: Item[], tables: string[], opts: {compress: boolean; pxh: number; sepW?: number; lodgingTable?: string}): {segs: Seg[]; width: number} {
    const segs: Seg[] = [];
    const shown = new Set(tables);
    const sw = opts.sepW ?? SEP_W;
    let u = 0;
    days.forEach((_d, k) => {
        const base = k * DAY_MIN;
        segs.push({kind: 'day', k, t0: base, t1: base, y: u, h: sw});
        u += sw;
        const busy = busyHours(k, timed, shown, opts.lodgingTable);
        let h = 0;
        while (h < 24) {
            if (opts.compress && !busy[h]) {
                let j = h;
                while (j < 24 && !busy[j]) j++;
                if (j - h >= 2) {
                    const w = compressedHeight(j - h, opts.pxh);
                    segs.push({kind: 'cmp', t0: base + h * 60, t1: base + j * 60, y: u, h: w, n: j - h});
                    u += w;
                    h = j;
                    continue;
                }
            }
            segs.push({kind: 'hr', t0: base + h * 60, t1: base + h * 60 + 60, y: u, h: opts.pxh});
            u += opts.pxh;
            h++;
        }
    });
    return {segs, width: u};
}

/** RTL scroll: Chrome reports scrollLeft 0 at the right end and negative to the left; sl = distance scrolled from the right */
export const slOf = (scrollLeft: number) => Math.max(0, -scrollLeft);
export const scrollLeftFor = (sl: number) => -Math.max(0, sl);

/** rough text width (pure fallback for tests; the UI measures with canvas) */
export function estW(s: string, fs: number, bold = true): number {
    return [...s].reduce((w, ch) => w + (/\s/.test(ch) ? 0.28 : /[0-9:–\-.]/.test(ch) ? 0.55 : bold ? 0.6 : 0.56) * fs, 0);
}
export type Measure = (s: string, fs: number, bold?: boolean) => number;

/** date-only items become whole-day bars (00:00 of the first day → 24:00 of the last) */
export function spanOf(i: Item, days: Day[]): {s: number; e: number; ad: boolean} | null {
    if (i.s !== null && i.e !== null) return {s: i.s, e: Math.max(i.e, i.s + 1), ad: false};
    if (!i.date) return null;
    const a = days.findIndex(d => d.date === i.date);
    const b = days.findIndex(d => d.date === (i.dateEnd || i.date));
    if (a < 0 && b < 0) return null;
    const k0 = a < 0 ? 0 : a,
        k1 = b < 0 ? days.length - 1 : b;
    return {s: k0 * DAY_MIN, e: (Math.max(k0, k1) + 1) * DAY_MIN, ad: true};
}

/** a bar with its lane; the lane reserves the label's width too, so a name never gets squeezed by its neighbour */
export type HBar = {item: Item; s: number; e: number; ad: boolean; u0: number; u1: number; lab: number; ext: number; lane: number};
export const LABEL_FS = 12.5;
/** label padding (2 × 7px) + the 👁 hide button (≈ 18px + 5px gap) + 3px slack */
export const LAB_PAD = 40;
export function packBars(items: Item[], days: Day[], uOf: (m: number) => number, measure: Measure = estW, gap = 4): {bars: HBar[]; lanes: number} {
    const bars: HBar[] = [];
    for (const i of items) {
        const sp = spanOf(i, days);
        if (!sp) continue;
        const u0 = uOf(sp.s),
            u1 = Math.max(uOf(sp.e), u0 + 4);
        const lab = Math.ceil(measure(i.name, LABEL_FS, true)) + LAB_PAD;
        bars.push({item: i, ...sp, u0, u1, lab, ext: Math.max(u1, u0 + lab), lane: 0});
    }
    bars.sort((a, b) => a.u0 - b.u0 || b.ext - a.ext);
    const ends: number[] = [];
    for (const b of bars) {
        let l = ends.findIndex(x => x + gap <= b.u0);
        if (l < 0) {
            l = ends.length;
            ends.push(0);
        }
        ends[l] = b.ext;
        b.lane = l;
    }
    return {bars, lanes: Math.max(1, ends.length)};
}

/** rows group their bars: משבצות by hall, לינה by hotel, every other table in one group */
export type HGroup = {key: string; y: number; h: number; lanes: number; bars: HBar[]; lodge?: HLodge[]};
export type HLodge = {c: LodgeCluster; rows: number; rowOf: Map<string, number>; u0: number; u1: number};
export const groupKey = (t: string, i: Item, lodgingTable = 'Lodging', hallTable = 'Slots_Events') => (t === lodgingTable ? i.hotel || '—' : t === hallTable ? i.hall[0] || '—' : '');
export function sortGroups(keys: string[]): string[] {
    return [...new Set(keys)].sort((a, b) => (a === '—' ? 1 : 0) - (b === '—' ? 1 : 0) || a.localeCompare(b, 'he'));
}

export type HRow = {t: string; h: number; groups: HGroup[]; laneH: number};
/** one table row: groups stacked, lanes of `laneH` px (row height resize = taller lanes), min ROW_MIN */
export function rowLayout(t: string, items: Item[], days: Day[], uOf: (m: number) => number, opts: {laneH?: number; measure?: Measure; lodgingTable?: string} = {}): HRow {
    const laneH = Math.max(LANE_MIN, Math.min(LANE_MAX, opts.laneH ?? LANE));
    // v0.1.2: shrunk below the default → no minimum row height, padding shrinks with the lanes
    const tiny = laneH < LANE;
    const pad = tiny ? Math.max(1, Math.round(laneH / 4)) : ROW_PAD;
    const lt = opts.lodgingTable ?? 'Lodging';
    const keys = sortGroups(items.map(i => groupKey(t, i, lt)));
    const groups: HGroup[] = [];
    let y = pad;
    keys.forEach((k, gi) => {
        const mine = items.filter(i => groupKey(t, i, lt) === k);
        if (gi) y += tiny ? Math.min(GROUP_GAP, pad * 2) : GROUP_GAP;
        if (t === lt) {
            const lodge: HLodge[] = mergeLodging(mine).map(c => {
                const lanes = assignLanes(c.stays);
                const rowOf = new Map(lanes.map(x => [x.item.id, x.lane]));
                const rows = Math.max(1, ...lanes.map(x => x.lane + 1));
                return {c, rows, rowOf, u0: uOf(c.s), u1: uOf(c.e)};
            });
            // clusters of one hotel never overlap in time → they share the group's height
            const rows = Math.max(1, ...lodge.map(l => l.rows));
            const h = LODGE_HEAD + rows * LODGE_ROW + 4;
            groups.push({key: k, y, h, lanes: rows, bars: [], lodge});
            y += h;
            return;
        }
        const {bars, lanes} = packBars(mine, days, uOf, opts.measure);
        const h = lanes * laneH;
        groups.push({key: k, y, h, lanes, bars});
        y += h;
    });
    return {t, h: tiny ? Math.max(LANE_MIN + 2, y + pad) : Math.max(ROW_MIN, y + ROW_PAD - 2), groups, laneH};
}

/** per row: open, or closed into the chip row — by hand (⇤ / ✕ shrink) or quiet (no items on the centre day, «כווץ שורות ריקות») */
export type HRowState = {open: boolean; manual: boolean; quiet: boolean; count: number};
export function hRowStates(k: number, days: Day[], tables: string[], items: Item[], o: {closed: Set<string>; forceOpen: Set<string>; collapseEmpty: boolean}): {[t: string]: HRowState} {
    const d = days[k] ?? NO_DAY; // v0.1.1
    const a = k * DAY_MIN,
        b = a + DAY_MIN;
    const out: {[t: string]: HRowState} = {};
    for (const t of tables) {
        const count = d ? items.filter(i => i.table === t && (i.s !== null && i.e !== null ? i.s < b && i.e > a : allDayOn(i, d.date))).length : 0;
        const manual = o.closed.has(t);
        const quiet = !manual && !o.forceOpen.has(t) && o.collapseEmpty && count === 0;
        out[t] = {open: !manual && !quiet, manual, quiet, count};
    }
    return out;
}

/** ⠿ row drag: the row the pointer is above (null = after the last) */
export function rowDropTarget(boxes: Array<{t: string; top: number; bottom: number}>, y: number): string | null {
    for (const b of boxes) if (y < (b.top + b.bottom) / 2) return b.t;
    return null;
}
/** row height resize: drag the header's bottom edge → lane height (per user), clamped */
export function resizeLane(laneH0: number, dy: number, lanes: number): number {
    // v0.1.2: down to LANE_MIN (4px); text keeps its size (clipped / hidden below TEXT_MIN)
    return Math.round(Math.max(LANE_MIN, Math.min(LANE_MAX, laneH0 + dy / Math.max(1, lanes))));
}

/** lens = the part of a bar inside the cross-section strip: name only, enlarged; smaller when the strip is crowded; ellipsis last */
export const LENS_FS = 16.25;
export const LENS_CROWD_FS = 14;
export const LENS_MIN_FS = 9;
export function hLens(name: string, w: number, crowded: boolean, measure: Measure = estW): {fs: number; full: boolean; clip: boolean} | null {
    if (w < 30) return null;
    const avail = w - 10;
    const nat = measure(name, 12.5, true);
    const mx = crowded ? LENS_CROWD_FS : LENS_FS;
    const fit = (12.5 * avail) / Math.max(1, nat);
    const fs = Math.max(LENS_MIN_FS, Math.min(mx, fit));
    const clip = fit < LENS_MIN_FS;
    return {fs: Math.round(fs * 4) / 4, full: !clip && fs >= 10.5, clip};
}
/** crowded = more than 3 lanes of one group cross the strip */
export function crowdedIn(bars: HBar[], a: number, b: number): boolean {
    return new Set(bars.filter(x => x.u0 < b && x.u1 > a).map(x => x.lane)).size > 3;
}
/** sticky name: a long bar's label slides along so it stays at the visible right edge */
export function stickyU(u0: number, u1: number, viewU: number, labW: number): number {
    if (u0 >= viewU || u1 <= viewU) return 0;
    return Math.max(0, Math.min(viewU - u0 + 2, u1 - u0 - labW - 4));
}

/** live count per table: records crossing the visible time range */
export function hLiveCounts(items: Item[], days: Day[], m0: number, m1: number): {[t: string]: number} {
    const c: {[t: string]: number} = {};
    for (const i of items) {
        const sp = spanOf(i, days);
        if (sp && sp.s < m1 && sp.e > m0) c[i.table] = (c[i.table] || 0) + 1;
    }
    return c;
}

/** v0.1.2: bar height inside a lane (thin lanes keep a visible coloured bar) */
export const barH = (laneH: number) => (laneH >= 12 ? laneH - 4 : Math.max(2, laneH - 1));
/** v0.1.2 (#9): the ruler's day pill sticks to the visible right edge while its day is on screen (same text as the vertical) */
export function dayPillU(dayU0: number, dayU1: number, viewU: number, pillW: number): number | null {
    if (dayU1 - dayU0 < pillW + 8) return dayU1 - dayU0 >= 30 ? dayU0 + 4 : null;
    return Math.max(dayU0 + 4, Math.min(viewU + 6, dayU1 - pillW - 4));
}
