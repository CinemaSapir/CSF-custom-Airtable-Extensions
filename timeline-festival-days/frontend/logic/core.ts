/**
 * Pure timeline logic (no SDK, no DOM) — ported from the frozen A-v7 mockup
 * (/workspace/csf-days-screens-2026-10-09/mockups/A-v7-timeline.template.html).
 * Time model: m = dayIndex*1440 + minutes-of-day in Israel local time (day 0 = first programme day).
 */

export type Day = {date: string; name: string; n: number};
export type Item = {
    table: string;
    id: string;
    name: string;
    /** v0.2.4: values of the table's filter field (right pane / Extension_Config) */
    fv?: string[];
    /** v0.2.5: values of every select/link field of the record's table (column filter menu field chooser) */
    fx?: {[field: string]: string[]};
    /** timeline minutes, null = all-day / date-only */
    s: number | null;
    e: number | null;
    /** date-only span (YYYY-MM-DD) for all-day chips */
    date: string | null;
    dateEnd: string | null;
    sub: string;
    inherited: boolean;
    flag: string | null;
    hall: string[];
    people: string[];
    films: string[];
    /** raw status value */
    status: string | null;
    /** status label (status map) */
    st: string | null;
    guest?: string;
    hotel?: string;
    /** lodging time came from the default check-in/out times (date-only fields) */
    defT?: boolean;
    slots: string[];
};

export const DAY_MIN = 1440;

// ---------------------------------------------------------------- dates / Israel time
const TZ = 'Asia/Jerusalem';
const pad2 = (n: number) => String(n).padStart(2, '0');

/** UTC instant → Israel local date + minutes of day */
export function israelParts(ms: number): {date: string; min: number} {
    const p: {[k: string]: string} = {};
    for (const x of new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date(ms)))
        p[x.type] = x.value;
    return {date: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute)};
}

/** Israel local date + minutes → UTC instant (ms). Handles DST by re-checking the offset. */
export function israelToUtc(date: string, min: number): number {
    const [y, mo, d] = date.split('-').map(Number);
    const guess = Date.UTC(y, mo - 1, d, 0, min);
    let t = guess - 2 * 3600e3;
    for (let i = 0; i < 3; i++) {
        const p = israelParts(t);
        const got = Date.UTC(+p.date.slice(0, 4), +p.date.slice(5, 7) - 1, +p.date.slice(8, 10), 0, p.min);
        t += guess - got;
    }
    return t;
}

export function addDays(date: string, n: number): string {
    const [y, m, d] = date.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}
export function daysBetween(a: string, b: string): number {
    const p = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
    return Math.round((p(b) - p(a)) / 864e5);
}

const WD = ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת'];
export function defaultDayName(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return `${WD[wd]} ${d}.${m}.${String(y).slice(2)}`;
}

/**
 * Consecutive days first..last (inclusive). n = day number relative to festival day 1 (day1 → 1, the day before → 0).
 * Names come from Festival Days records when present, else a generated «יום ו׳ 16.10.26».
 */
export function buildDays(first: string, last: string, day1: string, names: {[date: string]: string} = {}): Day[] {
    const out: Day[] = [];
    const len = daysBetween(first, last);
    if (!(len >= 0) || len > 400) return out;
    for (let k = 0; k <= len; k++) {
        const date = addDays(first, k);
        out.push({date, name: (names[date] || '').trim() || defaultDayName(date), n: daysBetween(day1, date) + 1});
    }
    return out;
}

export type Phase = 'prep' | 'fest' | 'wrap';
export function phase(n: number, festLen = 7): Phase {
    return n <= 0 ? 'prep' : n <= festLen ? 'fest' : 'wrap';
}

/** Day separator: title = festival day, subtitle = weekday · date (A-v7 dayBar) */
export function dayBar(d: Day, festLen = 7, words = {prep: 'הכנות', fest: 'פסטיבל', wrap: 'פירוק'}): {t: string; s: string} {
    const p = phase(d.n, festLen);
    const [a, ...rest] = d.name.split(' · ');
    const dt = a.split(' ').pop() || '';
    const wd = a.slice(0, a.length - dt.length).trim();
    const t =
        p === 'prep'
            ? d.n === 0
                ? `${words.prep} · ערב הפסטיבל`
                : `${words.prep} · עוד ${1 - d.n === 1 ? 'יום' : `${1 - d.n} ימים`}`
            : p === 'fest'
              ? `יום ${d.n} · ${words.fest}${rest.length ? ' · ' + rest.join(' · ') : ''}`
              : `${words.wrap} · יום ${d.n - festLen}`;
    return {t, s: wd ? `${wd} · ${dt}` : dt};
}

export function dayIndex(days: Day[]): {[date: string]: number} {
    const o: {[date: string]: number} = {};
    days.forEach((d, k) => (o[d.date] = k));
    return o;
}
/** Israel local date + minutes → timeline minutes; null when the date is outside the programme */
export function toM(idx: {[date: string]: number}, date: string, min: number): number | null {
    const k = idx[date];
    return k === undefined ? null : k * DAY_MIN + min;
}
/** UTC ms → timeline minutes (null outside the programme) */
export function msToM(idx: {[date: string]: number}, ms: number): number | null {
    const p = israelParts(ms);
    return toM(idx, p.date, p.min);
}
export function fmt(m: number): string {
    const r = Math.round(m);
    const x = ((r % DAY_MIN) + DAY_MIN) % DAY_MIN;
    return `${pad2(Math.floor(x / 60))}:${pad2(x % 60)}`;
}
export function dayOf(days: Day[], m: number): Day {
    return days[Math.max(0, Math.min(days.length - 1, Math.floor(m / DAY_MIN)))];
}
export function parseHHMM(s: string): number | null {
    const mm = /^\s*(\d{1,2})[:.]?(\d{2})?\s*$/.exec(s || '');
    if (!mm) return null;
    const h = +mm[1],
        mi = +(mm[2] || 0);
    return h < 24 && mi < 60 ? h * 60 + mi : null;
}

// ---------------------------------------------------------------- resolution
export type ResStep = {min: number; label: string};
export const DEFAULT_RES: ResStep[] = [
    {min: 60, label: 'שעה'},
    {min: 180, label: '3 שעות'},
    {min: 360, label: '6 שעות'},
    {min: 720, label: '12 שעות'},
    {min: 1440, label: 'יממה'},
];
/** Option_List_3 rows (value = minutes) → steps; bad rows dropped; falls back to the A-v7 steps */
export function parseRes(rows: Array<{value: string; label: string}>): ResStep[] {
    const out = rows
        .map(r => ({min: Math.round(Number(r.value)), label: r.label || r.value}))
        .filter(r => Number.isFinite(r.min) && r.min >= 15 && r.min <= 2880);
    return out.length ? out : DEFAULT_RES;
}
export function pickRes(steps: ResStep[], wanted: number | string | null | undefined, fallback = 360): number {
    const w = Number(wanted);
    if (steps.some(s => s.min === w)) return w;
    if (steps.some(s => s.min === fallback)) return fallback;
    return steps[0].min;
}
/** ONE resolution = how much time the whole visible timeline spans → px per hour */
export function pxPerHour(viewportH: number, resMin: number): number {
    return Math.max(14, viewportH / (resMin / 60));
}
/** hour labels: every 30 min when zoomed in, every 3h when zoomed out */
export function labelMode(pxh: number): 1 | 2 | 3 {
    return pxh >= 90 ? 2 : pxh < 24 ? 3 : 1;
}

// ---------------------------------------------------------------- layout + compress
export type Seg =
    | {kind: 'day'; k: number; t0: number; t1: number; y: number; h: number}
    | {kind: 'all'; k: number; per: {[table: string]: Array<Item & {part: string}>}; t0: number; t1: number; y: number; h: number}
    | {kind: 'cmp'; t0: number; t1: number; y: number; h: number; n: number}
    | {kind: 'hr'; t0: number; t1: number; y: number; h: number};

export const DAY_HEAD_H = 54;
export const CHIP_ROW_H = 21;
export const BREATH = 0.07; // compressed empty stretch keeps 7% of its height

export function allDayOn(i: Item, date: string): boolean {
    return !!i.date && date >= i.date && date <= (i.dateEnd || i.date);
}

/** per hour of day k: does any shown timed item touch it? (lodging only marks its check-in/out hours) */
export function busyHours(k: number, timed: Item[], shown: Set<string>, lodgingTable = 'Lodging'): boolean[] {
    const base = k * DAY_MIN;
    const busy = new Array<boolean>(24).fill(false);
    for (const i of timed) {
        if (!shown.has(i.table) || i.s === null || i.e === null) continue;
        if (i.table === lodgingTable) {
            for (const m of [i.s, i.e - 1]) if (m >= base && m < base + DAY_MIN) busy[Math.floor((m - base) / 60)] = true;
            continue;
        }
        for (let h = 0; h < 24; h++) {
            const hs = base + h * 60;
            if (i.s < hs + 60 && i.e > hs) busy[h] = true;
        }
    }
    return busy;
}

export function layout(
    days: Day[],
    timed: Item[],
    allday: Item[],
    tables: string[],
    opts: {compress: boolean; pxh: number; lodgingTable?: string},
): {segs: Seg[]; height: number} {
    const segs: Seg[] = [];
    const shown = new Set(tables);
    let y = 0;
    days.forEach((d, k) => {
        const base = k * DAY_MIN;
        const per: {[t: string]: Array<Item & {part: string}>} = {};
        tables.forEach(t => (per[t] = []));
        for (const i of allday) {
            if (!shown.has(i.table) || !allDayOn(i, d.date) || !i.date) continue;
            const tot = daysBetween(i.date, i.dateEnd || i.date) + 1;
            const idx = daysBetween(i.date, d.date) + 1;
            per[i.table].push({...i, part: tot > 1 ? ` (${idx}/${tot})` : ''});
        }
        const mx = Math.max(0, ...Object.values(per).map(a => a.length));
        segs.push({kind: 'day', k, t0: base, t1: base, y, h: DAY_HEAD_H});
        y += DAY_HEAD_H;
        if (mx) {
            const h = mx * CHIP_ROW_H + 6;
            segs.push({kind: 'all', k, per, t0: base, t1: base, y, h});
            y += h;
        }
        const busy = busyHours(k, timed, shown, opts.lodgingTable);
        let h = 0;
        while (h < 24) {
            if (opts.compress && !busy[h]) {
                let j = h;
                while (j < 24 && !busy[j]) j++;
                if (j - h >= 2) {
                    const ch = compressedHeight(j - h, opts.pxh);
                    segs.push({kind: 'cmp', t0: base + h * 60, t1: base + j * 60, y, h: ch, n: j - h});
                    y += ch;
                    h = j;
                    continue;
                }
            }
            segs.push({kind: 'hr', t0: base + h * 60, t1: base + h * 60 + 60, y, h: opts.pxh});
            y += opts.pxh;
            h++;
        }
    });
    return {segs, height: y};
}
export function compressedHeight(hours: number, pxh: number): number {
    return Math.max(16, Math.round(hours * pxh * BREATH));
}

export function yOf(segs: Seg[], m: number): number {
    for (const s of segs) if (s.t1 > s.t0 && m >= s.t0 && m <= s.t1) return s.y + ((m - s.t0) / (s.t1 - s.t0)) * s.h;
    const l = segs[segs.length - 1];
    return l ? l.y + l.h : 0;
}
export function mOf(segs: Seg[], y: number): number {
    for (const s of segs) if (y >= s.y && y < s.y + s.h) return s.t1 > s.t0 ? s.t0 + ((y - s.y) / s.h) * (s.t1 - s.t0) : s.t0;
    const l = segs[segs.length - 1];
    return l ? l.t1 : 0;
}

// ---------------------------------------------------------------- cross-section
/** the cross-section = the middle `frac` (default 20%) of the visible timeline */
export function band(segs: Seg[], scrollTop: number, viewportH: number, frac = 0.2): [number, number] {
    const f = Math.min(0.9, Math.max(0.02, frac));
    const top = (1 - f) / 2;
    return [mOf(segs, scrollTop + viewportH * top), mOf(segs, scrollTop + viewportH * (top + f))];
}
export function bandPx(viewportH: number, frac = 0.2): {top: number; height: number} {
    const f = Math.min(0.9, Math.max(0.02, frac));
    return {top: viewportH * ((1 - f) / 2), height: viewportH * f};
}
export function overlaps(i: Item, a: number, b: number): boolean {
    return i.s !== null && i.e !== null && i.s < b && i.e > a;
}
/** text inside the cross-section gets +30% */
export const MAG = 1.3;

// ---------------------------------------------------------------- lanes (overlapping cards side by side)
export function assignLanes(items: Item[]): Array<{item: Item; lane: number; lanes: number}> {
    const its = items.filter(i => i.s !== null && i.e !== null).sort((a, b) => (a.s as number) - (b.s as number));
    const ends: number[] = [];
    const lane = new Map<Item, number>();
    for (const i of its) {
        let l = ends.findIndex(e => e <= (i.s as number));
        if (l < 0) {
            l = ends.length;
            ends.push(0);
        }
        ends[l] = i.e as number;
        lane.set(i, l);
    }
    return its.map(i => {
        const ov = its.filter(o => (o.s as number) < (i.e as number) && (o.e as number) > (i.s as number));
        return {item: i, lane: lane.get(i) as number, lanes: Math.max(...ov.map(o => lane.get(o) as number)) + 1};
    });
}

// ---------------------------------------------------------------- lodging merge
export type LodgeSeg = {a: number; b: number; guests: Item[]; checkins: number};
export type LodgeCluster = {hotel: string; s: number; e: number; stays: Item[]; segs: LodgeSeg[]; times: number[]};
/** merge overlapping stays per hotel into ONE bar; a segment per stretch with a constant guest list */
export function mergeLodging(stays: Item[]): LodgeCluster[] {
    const hotels = [...new Set(stays.map(i => i.hotel || ''))].sort();
    const out: LodgeCluster[] = [];
    for (const ho of hotels) {
        const st = stays.filter(i => (i.hotel || '') === ho && i.s !== null && i.e !== null).sort((a, b) => (a.s as number) - (b.s as number));
        const cl: Array<{s: number; e: number; st: Item[]}> = [];
        for (const i of st) {
            const c = cl[cl.length - 1];
            if (c && (i.s as number) < c.e) {
                c.st.push(i);
                c.e = Math.max(c.e, i.e as number);
            } else cl.push({s: i.s as number, e: i.e as number, st: [i]});
        }
        for (const c of cl) {
            const times = [...new Set(c.st.flatMap(i => [i.s as number, i.e as number]))].sort((a, b) => a - b);
            const segs: LodgeSeg[] = [];
            for (let k = 0; k < times.length - 1; k++) {
                const a = times[k],
                    b = times[k + 1];
                const guests = c.st
                    .filter(i => (i.s as number) < b && (i.e as number) > a)
                    .sort((x, y) => (x.s as number) - (y.s as number) || (x.guest || '').localeCompare(y.guest || '', 'he'));
                segs.push({a, b, guests, checkins: c.st.filter(i => i.s === a).length});
            }
            out.push({hotel: ho, s: c.s, e: c.e, stays: c.st, segs, times});
        }
    }
    return out;
}
/** people in the hotel at minute m */
export function inHouse(stays: Item[], hotel: string, m: number): number {
    return stays.filter(i => i.hotel === hotel && i.s !== null && i.e !== null && i.s <= m && i.e > m).length;
}

// ---------------------------------------------------------------- junk / placeholder filter + cosmetic names
const JUNK_NAME = /^DEMO (Staffing|Booking Resources|Resources|Slot|Person|Lodging|Invitations|Itinerary) \d+$/;
export const BORROW_DEFAULT = ['Staffing', 'Itinerary', 'Invitations'];
/**
 * Hidden fixed filters: bare placeholder names, borrowed-time records with no timed linked slot,
 * records with neither a time nor a date, excluded slot types / task statuses.
 */
export function isJunk(
    i: Item,
    opts: {borrow?: string[]; excludeTypes?: string[]; excludeStatus?: {[table: string]: string[]}; type?: string | null} = {},
): boolean {
    const borrow = opts.borrow ?? BORROW_DEFAULT;
    if (!i.name.trim() || JUNK_NAME.test(i.name.trim())) return true;
    if (i.s === null && !i.date) return true;
    if (borrow.includes(i.table) && i.s === null) return true; // unlinked / slot without a time
    if (opts.type && (opts.excludeTypes ?? []).some(x => norm(x) === norm(opts.type as string))) return true;
    const ex = opts.excludeStatus?.[i.table];
    if (ex && i.status && ex.some(x => norm(x) === norm(i.status as string))) return true;
    return false;
}
const norm = (s: string) => s.normalize('NFC').replace(/[\u0591-\u05C7]/g, '').trim().toLowerCase();
export function cleanName(n: string): string {
    return n
        .replace(/DEMO Person (\d+)/g, 'אורח/ת $1')
        .replace(/DEMO-TX-(\d+)/g, 'תשלום $1')
        .replace(/^DEMO Resources (\d+)/, 'ציוד $1')
        .replace(/^DEMO Locations (\d+)$/, 'מלון $1');
}

// ---------------------------------------------------------------- filters + search
export type FacetKey = 'hall' | 'person' | 'film' | 'status';
export const FACETS: FacetKey[] = ['hall', 'person', 'film', 'status'];
export function facetValues(i: Item, k: FacetKey): string[] {
    return k === 'hall' ? i.hall : k === 'person' ? i.people : k === 'film' ? i.films : i.st ? [i.st] : [];
}
export type FilterState = {[K in FacetKey]: Set<string>};
export const emptyFilters = (): FilterState => ({hall: new Set(), person: new Set(), film: new Set(), status: new Set()});
export function passes(i: Item, f: FilterState, q: string, tableLabel = '', skip?: FacetKey): boolean {
    for (const k of FACETS) {
        if (k === skip || !f[k].size) continue;
        if (!facetValues(i, k).some(v => f[k].has(v))) return false;
    }
    if (q.trim()) {
        const hay = [i.name, i.sub, tableLabel, ...i.hall, ...i.people, ...i.films, i.st || ''].join(' ').toLowerCase();
        if (
            !q
                .toLowerCase()
                .split(/\s+/)
                .filter(Boolean)
                .every(w => hay.includes(w))
        )
            return false;
    }
    return true;
}
export function anyFilter(f: FilterState, q: string): boolean {
    return FACETS.some(k => f[k].size > 0) || !!q.trim();
}
/** facet menu: every value + count among items passing the OTHER facets */
export function facetCounts(items: Item[], k: FacetKey, f: FilterState, q: string, shown: Set<string>, label: (t: string) => string) {
    const counts: {[v: string]: number} = {};
    const all = new Set<string>();
    for (const i of items) {
        facetValues(i, k).forEach(v => all.add(v));
        if (!shown.has(i.table) || !passes(i, f, q, label(i.table), k)) continue;
        facetValues(i, k).forEach(v => (counts[v] = (counts[v] || 0) + 1));
    }
    const values = [...all].sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b, 'he'));
    return values.map(v => ({value: v, count: counts[v] || 0}));
}

// ---------------------------------------------------------------- columns: per-day collapse + live counts
export type ColState = {collapsed: boolean; manual: boolean; auto: boolean; allDayOnly: boolean; /** v0.2.3: collapsed because its only items are all-day chips scrolled out of view */ adHidden: boolean; count: number; grow: number; /** max overlapping cards that day (lodging = hotels) */ lanes: number};
export function columnStates(
    k: number,
    days: Day[],
    tables: string[],
    timed: Item[],
    allday: Item[],
    o: {closed: Set<string>; forceOpen: Set<string>; collapseEmpty: boolean; lodgingTable?: string; hotels?: number; /** v0.2.3: is this day's all-day row on screen? (default true) */ allDayInView?: boolean},
): {[t: string]: ColState} {
    const a = k * DAY_MIN,
        b = a + DAY_MIN,
        d = days[k];
    const vis: {[t: string]: boolean} = {},
        tv: {[t: string]: boolean} = {},
        n: {[t: string]: number} = {},
        lanes: {[t: string]: number} = {};
    tables.forEach(t => {
        vis[t] = false;
        n[t] = 0;
    });
    for (const i of timed) {
        if (!(i.table in vis) || !overlaps(i, a, b)) continue;
        vis[i.table] = tv[i.table] = true;
        n[i.table]++;
        const c = timed.filter(x => x.table === i.table && (x.s as number) <= (i.s as number) && (x.e as number) > (i.s as number)).length;
        lanes[i.table] = Math.max(lanes[i.table] || 1, c);
    }
    const lt = o.lodgingTable ?? 'Lodging';
    if (lanes[lt]) lanes[lt] = Math.max(2, o.hotels ?? 2);
    if (d)
        for (const i of allday)
            if (i.table in vis && allDayOn(i, d.date)) {
                vis[i.table] = true;
                n[i.table]++;
            }
    const out: {[t: string]: ColState} = {};
    for (const t of tables) {
        const manual = o.closed.has(t);
        // v0.2.3: a column with only all-day chips this day has NOTHING on screen once the all-day row scrolls away
        // (its live count reads 0), so it goes to the side strips too instead of keeping a 118px empty column.
        const adHidden = !manual && o.collapseEmpty && vis[t] && !tv[t] && o.allDayInView === false && !o.forceOpen.has(t);
        const auto = !manual && o.collapseEmpty && (!vis[t] || adHidden) && !o.forceOpen.has(t); // v0.2.2: also on a fully empty day (was: all stayed open)
        const collapsed = manual || auto;
        out[t] = {
            collapsed,
            manual,
            auto,
            adHidden,
            allDayOnly: o.collapseEmpty && !collapsed && !tv[t],
            count: n[t],
            grow: !collapsed && tv[t] ? (t === lt ? 3.4 : Math.min(3, lanes[t] || 1)) : 1,
            lanes: lanes[t] || 1,
        };
    }
    return out;
}
/** records of each column inside the scrolled viewport (timed + all-day chips of visible strips) */
export function liveCounts(segs: Seg[], timed: Item[], y0: number, y1: number): {[t: string]: number} {
    const m0 = mOf(segs, y0),
        m1 = mOf(segs, y1);
    const c: {[t: string]: number} = {};
    for (const i of timed) if (overlaps(i, m0, m1)) c[i.table] = (c[i.table] || 0) + 1;
    for (const s of segs) if (s.kind === 'all' && s.y < y1 && s.y + s.h > y0) for (const t in s.per) c[t] = (c[t] || 0) + s.per[t].length;
    return c;
}

// ---------------------------------------------------------------- sticky names
/** how far to push a long card's title down so it stays visible at the top of the viewport */
export function stickyOffset(cardTop: number, cardH: number, viewTop: number, nameH: number, pad = 3): number {
    if (cardTop >= viewTop || cardTop + cardH <= viewTop) return 0;
    return Math.max(0, Math.min(viewTop - cardTop - pad + 2, cardH - nameH - pad - 4));
}

// ---------------------------------------------------------------- now / jump
export function nowTarget(days: Day[], nowMs: number): {m: number; note?: 'before' | 'after'} {
    const p = israelParts(nowMs);
    const idx = dayIndex(days);
    const m = toM(idx, p.date, p.min);
    if (m !== null) return {m};
    if (!days.length) return {m: 0};
    return p.date < days[0].date ? {m: 9 * 60, note: 'before'} : {m: (days.length - 1) * DAY_MIN + 9 * 60, note: 'after'};
}
/** value of <input type="datetime-local"> → timeline minutes, or null outside the programme */
export function jumpTarget(days: Day[], v: string): number | null {
    const mm = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(v || '');
    if (!mm) return null;
    return toM(dayIndex(days), mm[1], +mm[2] * 60 + +mm[3]);
}
export function snap(m: number, step = 15): number {
    return Math.round(m / step) * step;
}

// ---------------------------------------------------------------- cross-section window
export type WindowState = {link: boolean; tables: Set<string>; hall: Set<string>; person: Set<string>; status: Set<string>};
export function windowPass(i: Item, w: WindowState, timelinePass: (i: Item) => boolean, shown: Set<string>, ignoreTables = false): boolean {
    if (w.link) return timelinePass(i) && shown.has(i.table);
    if (!ignoreTables && !w.tables.has(i.table)) return false;
    for (const k of ['hall', 'person', 'status'] as const) if (w[k].size && !facetValues(i, k).some(v => w[k].has(v))) return false;
    return true;
}
export type WinCard = {table: string; name: string; s: number; e: number; agg?: boolean; /** v0.2.2: record to open (not for the lodging aggregate) */ id?: string};
/** timed items inside [a,b] in table order; lodging aggregated per hotel */
export function windowHits(src: Item[], a: number, b: number, order: string[], pass: (i: Item) => boolean, lodgingTable = 'Lodging'): WinCard[] {
    const hit = src.filter(i => overlaps(i, a, b) && pass(i));
    const rest: WinCard[] = hit.filter(i => i.table !== lodgingTable).map(i => ({table: i.table, name: i.name, s: i.s as number, e: i.e as number, id: i.id}));
    const lg = hit.filter(i => i.table === lodgingTable);
    for (const ho of [...new Set(lg.map(i => i.hotel || ''))].sort()) {
        const g = lg.filter(i => (i.hotel || '') === ho);
        rest.push({
            table: lodgingTable,
            name: `${ho} · ${g.length} במלון: ${g.map(i => i.guest || i.name).join(', ')}`,
            s: Math.min(...g.map(i => i.s as number)),
            e: Math.max(...g.map(i => i.e as number)),
            agg: true,
        });
    }
    return rest.sort((x, y) => order.indexOf(x.table) - order.indexOf(y.table) || x.s - y.s);
}

// ---------------------------------------------------------------- column order (per user)
export function normalizeOrder(saved: unknown, all: string[]): string[] {
    const arr = Array.isArray(saved) ? saved.filter((x): x is string => typeof x === 'string' && all.includes(x)) : [];
    const uniq = [...new Set(arr)];
    for (const t of all) if (!uniq.includes(t)) uniq.push(t);
    return uniq;
}

// ---------------------------------------------------------------- v0.1.1: column widths (px), shared by header + canvas
export const COL_MIN = 140; // narrowest timed column
export const LANE_MIN = 120; // overlapping cards get this much each before they stack
export const AD_W = 150; // v0.2.6: was 118 — every header now carries the same 5 controls // fixed width of a column that only has all-day chips that day
export const MAX_LANES_W = 3;
/**
 * Strips → strip px; all-day-only → AD_W; timed columns share the rest by weight, each at least
 * max(COL_MIN, lanes × LANE_MIN). When the minimums don't fit, they keep their minimum (the canvas scrolls sideways).
 */
export function colWidths(
    tables: string[],
    cs: {[t: string]: ColState},
    totalW: number,
    o: {axis?: number; strip?: number; ad?: number; min?: number; laneMin?: number; fixed?: {[t: string]: number}} = {},
): {w: {[t: string]: number}; total: number} {
    const axis = o.axis ?? 58,
        strip = o.strip ?? 30,
        ad = o.ad ?? AD_W,
        mn = o.min ?? COL_MIN,
        lm = o.laneMin ?? LANE_MIN;
    const w: {[t: string]: number} = {};
    let rest = totalW - axis;
    const flex: string[] = [];
    for (const t of tables) {
        const st = cs[t];
        const fx = o.fixed?.[t];
        if (!st || st.collapsed) w[t] = strip;
        else if (fx !== undefined && Number.isFinite(fx)) w[t] = Math.max(mn, Math.round(fx)); // v0.2.1: user-set width (per user)
        else if (st.allDayOnly) w[t] = ad;
        else {
            flex.push(t);
            continue;
        }
        rest -= w[t];
    }
    const want = (t: string) => Math.max(mn, Math.min(MAX_LANES_W, cs[t].lanes || 1) * lm);
    // if the lane minimums don't fit, shrink the extra lane width first (never below COL_MIN) — strips must stay on screen
    const sumWant = flex.reduce((a, t) => a + want(t), 0);
    const floor = flex.length * mn;
    const f = sumWant <= rest || sumWant === floor ? 1 : Math.max(0, (rest - floor) / (sumWant - floor));
    const minOf = (t: string) => mn + (want(t) - mn) * f;
    const weight = (t: string) => Math.max(1, cs[t].grow || 1);
    // water-filling: give each its weighted share, pin the ones below their minimum, redistribute
    let free = [...flex];
    let room = rest;
    for (let guard = 0; guard < flex.length + 1; guard++) {
        const sw = free.reduce((a, t) => a + weight(t), 0);
        const low = free.filter(t => (room * weight(t)) / sw < minOf(t));
        if (!low.length) {
            for (const t of free) w[t] = (room * weight(t)) / sw;
            free = [];
            break;
        }
        for (const t of low) {
            w[t] = minOf(t);
            room -= w[t];
        }
        free = free.filter(t => !low.includes(t));
        if (!free.length) break;
    }
    for (const t of flex) w[t] = Math.floor(w[t]);
    const total = axis + tables.reduce((a, t) => a + w[t], 0);
    return {w, total};
}

/** v0.1.1: the magnifier applies only to the part of a card inside the band → that slice in card-local px (null = none) */
export function bandSlice(cardTop: number, cardH: number, bandTop: number, bandBottom: number): {top: number; height: number} | null {
    const a = Math.max(cardTop, bandTop),
        b = Math.min(cardTop + cardH, bandBottom);
    return b - a >= 4 ? {top: a - cardTop, height: b - a} : null;
}

/** v0.1.1: the cross-section window fits its content — rows of cards (min 1) */
export function windowRows(cards: number, cols = 3): number {
    return Math.max(1, Math.ceil(cards / Math.max(1, cols)));
}

// ---------------------------------------------------------------- v0.2.1: user column width (drag the header edge)
export const COL_MAX = 1600;
/** RTL header: the resize handle sits on the column's LEFT edge → dragging left (dx < 0 in screen px) widens */
export function resizeWidth(startW: number, dxScreen: number, min = COL_MIN, max = COL_MAX): number {
    return Math.round(Math.max(min, Math.min(max, startW - dxScreen)));
}
/** saved widths → only known tables, finite, ≥ min */
export function normalizeWidths(saved: unknown, all: string[], min = COL_MIN): {[t: string]: number} {
    const out: {[t: string]: number} = {};
    if (!saved || typeof saved !== 'object') return out;
    for (const [t, v] of Object.entries(saved as {[k: string]: unknown}))
        if (all.includes(t) && typeof v === 'number' && Number.isFinite(v)) out[t] = Math.max(min, Math.min(COL_MAX, Math.round(v)));
    return out;
}
/** wheel → pixels (deltaMode 0 px, 1 lines, 2 pages) */
export function wheelPx(deltaY: number, deltaMode: number, pageH: number): number {
    return deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * pageH : deltaY;
}
/** v0.2.1: the height the resolution is measured against — independent of the cross-section window's content height */
export const WIN_REF_H = 88;
export function gridHeight(vpClientH: number, winH: number): number {
    return Math.max(120, vpClientH + winH - (winH > 0 ? WIN_REF_H : 0));
}

// ---------------------------------------------------------------- v0.2.2
/** the canvas (and so the day separators) is never narrower than the viewport */
export function canvasWidth(total: number, vpW: number): number {
    return Math.max(total, vpW);
}
export function allCollapsed(cs: {[t: string]: ColState}, tables: string[]): boolean {
    return tables.length > 0 && tables.every(t => cs[t]?.collapsed);
}

/** time-scale ticks: ONE list drives both the grid lines and the labels → same count, same y, at every resolution */
export type Tick = {y: number; m: number; label: string; hour: boolean};
export const TICK_STEPS = [15, 30, 60, 120, 180, 360, 720];
export function tickStep(pxh: number, minGap = 36): number {
    for (const st of TICK_STEPS) if ((st / 60) * pxh >= minGap) return st;
    return 720;
}
export function axisTicks(segs: Seg[], pxh: number, minGap = 36): Tick[] {
    const st = tickStep(pxh, minGap);
    const out: Tick[] = [];
    for (const s of segs) {
        if (s.kind !== 'hr') continue;
        const dayMin = s.t0 % DAY_MIN;
        for (let off = 0; off < 60; off += Math.min(st, 60)) {
            const mm = dayMin + off;
            if (mm % st !== 0) continue;
            out.push({y: s.y + (off / 60) * s.h, m: s.t0 + off, label: `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`, hour: off === 0});
        }
    }
    return out;
}

/** day shown on open: <festival year>-10-31; if Festival Days has no such day, the nearest Festival Days date (ties → earlier);
 *  without Festival Days dates, the nearest timeline day. Centred so the first item of that day sits near the top. */
export const OPEN_MD = '10-31';
const dnum = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5;
export function openDate(days: Day[], fdDates: string[], md = OPEN_MD): string | null {
    if (!days.length) return null;
    const year = (days.find(d => d.n === 1) ?? days[0]).date.slice(0, 4);
    const want = `${year}-${md}`;
    const inRange = new Set(days.map(d => d.date));
    const pool = [...new Set(fdDates.filter(d => inRange.has(d)))];
    const cands = pool.length ? pool : days.map(d => d.date);
    if (cands.includes(want)) return want;
    return [...cands].sort((a, b) => Math.abs(dnum(a) - dnum(want)) - Math.abs(dnum(b) - dnum(want)) || (a < b ? -1 : 1))[0];
}
export function openTarget(days: Day[], fdDates: string[], starts: number[], resH: number, md = OPEN_MD): {m: number; date: string | null} {
    const date = openDate(days, fdDates, md);
    if (!date) return {m: 0, date: null};
    const k = days.findIndex(d => d.date === date);
    const a = k * DAY_MIN;
    const first = starts.filter(x => x >= a && x < a + DAY_MIN).sort((x, y) => x - y)[0];
    const half = (resH * 60) / 2;
    if (first === undefined) return {m: a + 12 * 60, date};
    return {m: Math.min(a + DAY_MIN - 1, Math.max(a + half, first - 30 + half)), date};
}

/** jump-to control: <input type=date> + <input type=time> → timeline minutes, or null when outside / invalid */
export function jumpFrom(days: Day[], date: string, time: string): number | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
    const t = /^(\d{1,2}):(\d{2})/.exec(time || '') ? time : '00:00';
    return jumpTarget(days, `${date}T${t.padStart(5, '0')}`);
}

// ---- time zones: values come as UTC ISO; ALWAYS shown/computed in Asia/Jerusalem (DST-aware)
/** 'instant' = the cell is a real moment (field tz 'client' / unset / a named zone) → convert to Israel time.
 *  'wall' = the field shows the same GMT clock to everyone (timeZone 'utc' / isUsingGMT) → that clock IS the Israel wall time. */
export type TzMode = 'instant' | 'wall';
export function tzModeOf(opts: unknown): TzMode {
    if (!opts || typeof opts !== 'object') return 'instant';
    const o = opts as {timeZone?: unknown; isUsingGMT?: unknown; isUsingGmt?: unknown};
    if (o.isUsingGMT === true || o.isUsingGmt === true) return 'wall';
    const tz = typeof o.timeZone === 'string' ? o.timeZone.trim().toLowerCase() : '';
    return tz === 'utc' || tz === 'gmt' || tz === 'etc/utc' || tz === 'etc/gmt' ? 'wall' : 'instant';
}
/** cell ISO → the instant whose Israel wall time is what the team means */
export function cellToMs(v: string, mode: TzMode): number | null {
    const t = Date.parse(v);
    if (!Number.isFinite(t)) return null;
    if (mode === 'instant') return t;
    const d = new Date(t);
    const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    return israelToUtc(date, d.getUTCHours() * 60 + d.getUTCMinutes());
}
/** instant → cell ISO for the field's mode (inverse of cellToMs) */
export function msToCell(ms: number, mode: TzMode): string {
    if (mode === 'instant') return new Date(ms).toISOString();
    const p = israelParts(ms);
    return `${p.date}T${String(Math.floor(p.min / 60)).padStart(2, '0')}:${String(p.min % 60).padStart(2, '0')}:00.000Z`;
}
/** «עכשיו» outside the programme: nearest edge day at the SAME Israel clock time (not a fixed 09:00) */
export function nowTarget2(days: Day[], nowMs: number): {m: number; note?: 'before' | 'after'; date: string; clock: string} {
    const p = israelParts(nowMs);
    const clock = `${String(Math.floor(p.min / 60)).padStart(2, '0')}:${String(p.min % 60).padStart(2, '0')}`;
    const m = toM(dayIndex(days), p.date, p.min);
    if (m !== null || !days.length) return {m: m ?? 0, date: p.date, clock};
    return p.date < days[0].date ? {m: p.min, note: 'before', date: p.date, clock} : {m: (days.length - 1) * DAY_MIN + p.min, note: 'after', date: p.date, clock};
}
/** the now line: Israel minutes of an instant, or null outside the programme */
export function nowLineM(days: Day[], nowMs: number): number | null {
    const p = israelParts(nowMs);
    return toM(dayIndex(days), p.date, p.min);
}

// ---- palette (Countdown Homescreen v0.4.2: soft rose, gold, green, teal, lavender on cream; teal hover)
export function contrast(a: string, b: string): number {
    const L = (h: string) => {
        const x = h.replace('#', '');
        const c = [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const [hi, lo] = [L(a), L(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------- v0.2.3 palette (Airtable SDK colours)
/** resolves an SDK colour name (e.g. 'tealLight2') to hex: in the block this is colorUtils.getHexForColor; null = not an SDK colour */
export type HexOf = (name: string) => string | null;
const HEXRE = /^#[0-9a-f]{6}$/i;
/** 'tealLight2' → 'teal' (also Light1 / Dark1 / Bright) */
export const sdkHue = (c: string) => c.replace(/(Light[12]|Dark1|Bright)$/, '');
/** the line colour of a table (3px top bar, 4px card border, header dot, strip tint): <hue>Dark1 of the SDK fill name; a legacy #hex is used as is */
export function lineOf(c: string, hex: HexOf, fallback = 'grayDark1'): string {
    const v = (c || '').trim();
    if (hex(v)) return hex(sdkHue(v) + 'Dark1') ?? (hex(v) as string);
    if (HEXRE.test(v)) return v;
    return hex(fallback) ?? '#444444';
}
/** the card fill: the SDK colour itself; a legacy #hex keeps the old behaviour (hex + 1c alpha) */
export function fillOf(c: string, hex: HexOf, fallback = 'grayLight2'): string {
    const v = (c || '').trim();
    const h = hex(v);
    if (h) return h;
    if (HEXRE.test(v)) return v + '1c';
    return hex(fallback) ?? '#eeeeee';
}
/** a phase colour cell (Color_1–3): an SDK name or a #hex */
export function colourOf(c: string | undefined, hex: HexOf, fallback: string): string {
    const v = (c || '').trim();
    return hex(v) ?? (HEXRE.test(v) ? v : (hex(fallback) ?? fallback));
}
/** the chrome colours the CSS reads as var(--sdk-<name>) — set on the root at runtime from colorUtils */
export const SDK_CHROME = ['gray', 'grayDark1', 'grayLight1', 'grayLight2', 'greenDark1', 'greenLight2', 'purpleDark1', 'purpleLight2', 'redDark1', 'redLight1', 'cyanLight2', 'yellowLight2'];
export function sdkVars(hex: HexOf): {[k: string]: string} {
    const o: {[k: string]: string} = {};
    for (const n of SDK_CHROME) {
        const h = hex(n);
        if (h) o['--sdk-' + n] = h;
    }
    return o;
}

// ---------------------------------------------------------------- v0.2.3: the magnifier never repeats a visible title
/** px at the top of a card that hold its title + time */
export const TITLE_ZONE = 40;
/**
 * Where the +30% lens sits inside a card. When the band reaches the card's title area (slice starts in the
 * top TITLE_ZONE px), the lens takes over the card head: it starts at the card top, grows to fit its text
 * (never past the card) and the card's own title/time are hidden, so the name shows ONCE. Otherwise the
 * lens is just the band slice, far below the card's own title, and carries only the magnified time (no second name).
 */
export function lensPlan(sl: {top: number; height: number} | null, cardH: number, zone = TITLE_ZONE): {top: number; minH: number; maxH: number; head: boolean} | null {
    if (!sl) return null;
    if (sl.top < zone) return {top: 0, minH: Math.min(cardH, sl.top + sl.height), maxH: cardH, head: true};
    // lower down the card's own title is already on screen (at its top or pinned) → the lens shows only the time,
    // and a sliver too thin for one magnified line is not drawn at all
    if (sl.height < 22) return null;
    return {top: sl.top, minH: sl.height, maxH: sl.height, head: false};
}

// ---------------------------------------------------------------- v0.2.4: cross-section table pills + in-flow window
/** the window follows the timeline (filters + shown tables) minus the tables this user switched off in the window */
export function winPass(i: Item, timelinePass: (i: Item) => boolean, shown: Set<string>, off: Set<string>): boolean {
    return shown.has(i.table) && !off.has(i.table) && timelinePass(i);
}
/** pills: every shown table with something in the slice (on or off), in column order, with its count */
/** (v0.2.4b: `keep` = tables with an active value filter, listed even at 0 so the filter can be undone) */
export function winPills(inSlice: Item[], order: string[], shown: Set<string>, off: Set<string>, keep: Set<string> = new Set()): Array<{t: string; n: number; on: boolean}> {
    const n: {[t: string]: number} = {};
    for (const i of inSlice) if (shown.has(i.table)) n[i.table] = (n[i.table] || 0) + 1;
    return order.filter(t => n[t] || (keep.has(t) && shown.has(t))).map(t => ({t, n: n[t] || 0, on: !off.has(t)}));
}
export function toggleIn(set: Set<string>, t: string): Set<string> {
    const s = new Set(set);
    if (s.has(t)) s.delete(t);
    else s.add(t);
    return s;
}
/** saved list → a clean set of known tables */
export function normalizeOff(v: unknown, known: string[]): Set<string> {
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && known.includes(x)) : []);
}
/** v0.2.4 window card rows are FIXED while it's on (the grid below must not jump while scrolling): the rows Number_2 cards need */
export function winGridRows(maxCards: number, cols = 3): number {
    return windowRows(Math.max(1, maxCards), cols);
}
/** keep the time at the viewport centre when the viewport height changes (window slides open/closed): new scrollTop */
export function keepCentre(scrollTop: number, oldH: number, newH: number): number {
    return Math.max(0, scrollTop + (oldH - newH) / 2);
}

// ---------------------------------------------------------------- v0.2.4: per-table value filters (right pane / Extension_Config / in-UI)
export type FilterOp = 'any' | 'none';
/** right-pane enum value or Extension_Config Filter_Operator_N wording → any / none */
export function parseOp(s: unknown): FilterOp {
    const v = String(s ?? '').trim().toLowerCase();
    return /^(none|is not|is none of|isn'?t|does not contain|not|≠|אינו|לא)/.test(v) ? 'none' : 'any';
}
export const splitVals = (s: unknown) =>
    String(s ?? '')
        .split('|')
        .map(x => x.trim())
        .filter(Boolean);
/** a record's values vs the wanted list: empty list = no filter; any = at least one match; none = no match */
export function passValues(have: string[] | undefined, op: FilterOp, want: string[]): boolean {
    if (!want.length) return true;
    const h = new Set((have ?? []).map(x => x.trim()));
    const hit = want.some(w => h.has(w));
    return op === 'any' ? hit : !hit;
}
/** field type → what the in-UI dropdown can offer (multi-select checkboxes only for select / link-like fields) */
export function filterKind(type: string): 'select' | 'link' | 'text' {
    if (/^(singleSelect|multipleSelects)$/.test(type)) return 'select';
    if (/^(multipleRecordLinks|singleCollaborator|multipleCollaborators|multipleLookupValues)$/.test(type)) return 'link';
    return 'text';
}
/** distinct values present (sorted, Hebrew collation) */
export function distinctVals(lists: Array<string[] | undefined>): string[] {
    return [...new Set(lists.flatMap(l => l ?? []).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he'));
}
/** in-UI per-table selection (saved per user) */
export function passPicked(i: {table: string; fv?: string[]}, picked: {[t: string]: string[]}): boolean {
    const w = picked[i.table];
    return !w?.length || passValues(i.fv, 'any', w);
}
/** the Extension_Config fallback: Filter_N = 'Table.Field' (free slots only; 6/7/9 are the fixed ones) */
export const FILTER_SLOTS = [1, 2, 3, 4, 5, 8, 10];
export function parseRef(s: unknown): {table: string; field: string} | null {
    const v = String(s ?? '').trim();
    const k = v.indexOf('.');
    return k > 0 && k < v.length - 1 ? {table: v.slice(0, k).trim(), field: v.slice(k + 1).trim()} : null;
}

// ===================== v0.2.5: per-column filters (funnel on each header tab) =====================
/** a dimension is a global facet that now lives per column ('hall' | 'person' | 'film' | 'status') or a raw field 'f:<field name>' */
export type ColDim = {op: FilterOp; vals: string[]};
export type ColFilter = {[dim: string]: ColDim};
export type ColFilters = {[table: string]: ColFilter};
export const isFacetDim = (d: string): d is FacetKey => (FACETS as string[]).includes(d);
export function dimValues(i: Item, d: string): string[] {
    if (d.startsWith('f:')) return i.fx?.[d.slice(2)] ?? [];
    return isFacetDim(d) ? facetValues(i, d) : [];
}
/** item passes its own column's filter (other columns' filters never touch it) */
export function passCol(i: Item, cf: ColFilters, skipDim?: string): boolean {
    const c = cf[i.table];
    if (!c) return true;
    for (const d in c) {
        if (d === skipDim || !c[d]?.vals?.length) continue;
        if (!passValues(dimValues(i, d), c[d].op, c[d].vals)) return false;
    }
    return true;
}
/** icon badge: how many values are picked across the column's dimensions */
export const colCount = (c?: ColFilter) => Object.values(c ?? {}).reduce((n, d) => n + (d?.vals?.length ?? 0), 0);
/** user choice wins per table (even an explicit empty one); otherwise the right-pane / Filter_N default */
export function effectiveCF(user: ColFilters, defaults: ColFilters, tables: string[]): ColFilters {
    const out: ColFilters = {};
    for (const t of tables) {
        const c = Object.prototype.hasOwnProperty.call(user, t) ? user[t] : defaults[t];
        if (c && colCount(c)) out[t] = c;
    }
    return out;
}
/** saved state → clean ColFilters (unknown tables / bad shapes dropped) */
export function normalizeCF(raw: unknown, tables: string[]): ColFilters {
    const out: ColFilters = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [t, c] of Object.entries(raw as {[k: string]: unknown})) {
        if (!tables.includes(t) || !c || typeof c !== 'object') continue;
        const cc: ColFilter = {};
        for (const [d, v] of Object.entries(c as {[k: string]: unknown})) {
            const o = v as {op?: unknown; vals?: unknown};
            if (!o || !Array.isArray(o.vals)) continue;
            cc[d] = {op: parseOp(o.op), vals: o.vals.filter((x): x is string => typeof x === 'string')};
        }
        out[t] = cc;
    }
    return out;
}
/** one column's menu: the dimensions that have values in this table, each with value counts among the items that pass
 *  search + this column's OTHER dimensions; picked values stay listed even at 0. Field dims that just repeat a facet are dropped. */
export function colDims(
    tableItems: Item[],
    c: ColFilter | undefined,
    facetLabel: {[K in FacetKey]: string},
    passQ: (i: Item) => boolean,
): Array<{key: string; label: string; values: Array<{v: string; n: number}>}> {
    const keys: string[] = [];
    const sets: {[d: string]: Set<string>} = {};
    const fieldNames = [...new Set(tableItems.flatMap(i => Object.keys(i.fx ?? {})))];
    for (const d of [...FACETS, ...fieldNames.map(f => 'f:' + f)]) {
        const all = new Set(tableItems.flatMap(i => dimValues(i, d)).filter(Boolean));
        (c?.[d]?.vals ?? []).forEach(v => all.add(v));
        if (!all.size) continue;
        const key = [...all].sort().join('\u0001');
        if (d.startsWith('f:') && keys.some(k => isFacetDim(k) && [...sets[k]].sort().join('\u0001') === key)) continue;
        keys.push(d);
        sets[d] = all;
    }
    return keys.map(d => {
        const n: {[v: string]: number} = {};
        for (const i of tableItems) if (passQ(i) && passCol(i, {[i.table]: c ?? {}}, d)) for (const v of new Set(dimValues(i, d))) n[v] = (n[v] || 0) + 1;
        return {
            key: d,
            label: isFacetDim(d) ? facetLabel[d] : d.slice(2),
            values: [...sets[d]].sort((a, b) => a.localeCompare(b, 'he')).map(v => ({v, n: n[v] || 0})),
        };
    });
}
/** tick / untick one value of one dimension */
export function toggleColVal(c: ColFilter | undefined, d: string, v: string): ColFilter {
    const cur = c?.[d] ?? {op: 'any' as FilterOp, vals: []};
    const vals = cur.vals.includes(v) ? cur.vals.filter(x => x !== v) : [...cur.vals, v];
    return {...(c ?? {}), [d]: {op: cur.op, vals}};
}

// ===================== v0.2.6: band label (the owner 10:36) =====================
/** the part of a card inside the cross-section band shows ONLY the name, magnified. Horizontal when it fits (single lane,
 *  ≤ 2 lines, longest word fits); otherwise vertical (writing-mode) and smaller; ellipsis (full name on hover) only when even
 *  the smallest vertical size can't hold it. Widths are estimated: Hebrew bold ≈ 0.6em per character. */
export const BAND_FS = 16.25;
export const BAND_MIN_FS = 9;
const CH = 0.6,
    LH = 1.18;
export type BandLabel = {mode: 'h' | 'v'; fs: number; lines: number; clip: boolean};
export function bandLabel(name: string, w: number, h: number, lanes: number, base = BAND_FS, min = BAND_MIN_FS): BandLabel {
    const n = Math.max(1, name.trim().length);
    const longest = Math.max(1, ...name.trim().split(/\s+/).map(x => x.length));
    const iw = Math.max(1, w - 10),
        ih = Math.max(1, h - 6);
    const fitH = (fs: number) => {
        const lines = Math.ceil((n * CH * fs) / iw);
        return longest * CH * fs <= iw && lines <= 2 && lines * fs * LH <= ih ? lines : 0;
    };
    if (lanes <= 1) {
        const l = fitH(base);
        if (l) return {mode: 'h', fs: base, lines: l, clip: false};
    }
    // vertical: a "line" runs down the slice height; lines stack across the width
    const fitV = (fs: number) => {
        const lines = Math.ceil((n * CH * fs) / ih);
        return longest * CH * fs <= ih && lines * fs * LH <= iw ? lines : 0;
    };
    for (let fs = Math.min(base, 14); fs >= min; fs -= 0.5) {
        const l = fitV(fs);
        if (l) return {mode: 'v', fs, lines: l, clip: false};
    }
    // a short, wide slice: vertical can't hold a word → smaller horizontal lines (as many as the height takes)
    for (let fs = Math.min(base, 14); fs >= min; fs -= 0.5) {
        const lines = Math.ceil((n * CH * fs) / iw);
        if (longest * CH * fs <= iw && lines * fs * LH <= ih) return {mode: 'h', fs, lines, clip: false};
    }
    // last resort: whichever orientation holds more characters at the minimum size, clipped with an ellipsis
    const capV = Math.floor(iw / (min * LH)) * Math.floor(ih / (min * CH));
    const capH = Math.floor(ih / (min * LH)) * Math.floor(iw / (min * CH));
    return capV >= capH ? {mode: 'v', fs: min, lines: Math.max(1, Math.floor(iw / (min * LH))), clip: true} : {mode: 'h', fs: min, lines: Math.max(1, Math.floor(ih / (min * LH))), clip: true};
}
/** v0.2.6: «כווץ שעות ריקות» default ON; keep a real user choice (old builds saved the default as if chosen) */
export function keptCompress(saved: {compress?: unknown; compressUser?: unknown}, def: boolean): boolean {
    if (typeof saved.compress !== 'boolean') return def;
    if (saved.compressUser === true) return saved.compress;
    return saved.compress === true ? true : def;
}

// ===================== v0.2.8: cross-section time snaps to 5 minutes (the owner 12:17) =====================
export const XS_STEP = 5;
/** nearest step on the timeline's wall-clock minutes (13:07 → 13:05, 13:08 → 13:10, x:x7.5 → up); 1440 is a multiple of 5,
 *  so day boundaries stay exact (23:58 → 00:00 of the next day) */
export const roundTo = (m: number, step = XS_STEP) => Math.round(m / step) * step;
/** the cross-section for a scroll position: the rounded time, the band moved so its centre sits exactly on that time,
 *  and the minute range [a, b] the window picks items from (same pixels as the drawn band) */
export function xsPlan(segs: Seg[], scrollTop: number, vpH: number, frac: number, centreM: number, step = XS_STEP): {t: number; yc: number; top: number; height: number; a: number; b: number} {
    const t = roundTo(centreM, step);
    const {height} = bandPx(vpH, frac);
    const yc = segs.length ? yOf(segs, t) - scrollTop : vpH / 2;
    const top = yc - height / 2;
    return {t, yc, top, height, a: segs.length ? mOf(segs, scrollTop + top) : 0, b: segs.length ? mOf(segs, scrollTop + top + height) : 0};
}
