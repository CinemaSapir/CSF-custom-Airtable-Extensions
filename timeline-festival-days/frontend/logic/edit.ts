/**
 * v0.2.0 (CUT 2) — pure edit logic: drag-create ranges, move/resize, what each table may write, field plans,
 * column reorder, undo countdown. No SDK here; index.tsx maps the logical fields to real Field ids + permission checks.
 */
import {DAY_MIN, israelParts, israelToUtc, msToCell, snap, type Day, type Item, type TzMode} from './core';
import {TABLE_SPECS, type TableSpec} from './tables';

export const STEP = 15;
export const UNDO_MS = 6000;

/** drag on empty space: snap both ends to 15 min, order them, at least one step */
export function dragRange(m0: number, m1: number, step = STEP): {s: number; e: number} {
    const a = snap(Math.min(m0, m1), step);
    let b = snap(Math.max(m0, m1), step);
    if (b - a < step) b = a + step;
    return {s: a, e: b};
}
/** move: whole range shifts by a snapped delta (lodging: whole days) */
export function moveRange(s: number, e: number, dm: number, unit = STEP): {s: number; e: number} {
    const d = snap(dm, unit);
    return {s: s + d, e: e + d};
}
/** resize from the bottom edge: end snaps, never shorter than one step (unit) */
export function resizeEnd(s: number, newE: number, unit = STEP): {s: number; e: number} {
    return {s, e: Math.max(s + unit, snap(newE, unit))};
}

export type Op = 'create' | 'move' | 'resize';
export type Can = {ok: true} | {ok: false; reason: string};
const no = (reason: string): Can => ({ok: false, reason});
export function specOf(table: string): TableSpec | undefined {
    return TABLE_SPECS.find(s => s.key === table);
}
/** structural rules (before any permission check): which tables can be created / moved / resized from the timeline */
export function canEdit(table: string, op: Op): Can {
    const sp = specOf(table);
    if (!sp) return no('טבלה לא מוכרת');
    switch (sp.time) {
        case 'own':
            return {ok: true};
        case 'lodging':
            return {ok: true}; // whole days (date-only check-in / check-out)
        case 'stamp':
            return op === 'resize' ? no('לאישור יש רק חותמת זמן — אין משך לשנות') : {ok: true};
        case 'borrow':
            return op === 'create' ? {ok: true} : no('הזמן נקבע לפי המשבצת המקושרת — הזיזו את המשבצת');
        case 'date':
            return op === 'create' ? {ok: true} : no('בטבלה הזו יש תאריך בלבד — שינוי התאריך דרך הרשומה');
    }
}
/** move/resize unit per table (lodging = whole days) */
export const unitOf = (table: string) => (specOf(table)?.time === 'lodging' ? DAY_MIN : STEP);

export type LogicalKey = 'name' | 'start' | 'end' | 'date' | 'dateEnd' | 'slots' | 'festivalDays';
export type Plan = {fields: Partial<Record<LogicalKey, unknown>>; needsSlot: boolean};
const partsOf = (days: Day[], m: number) => {
    const k = Math.max(0, Math.min(days.length - 1, Math.floor(m / DAY_MIN)));
    return {date: days[k]?.date ?? '', min: m - k * DAY_MIN};
};
const iso = (days: Day[], m: number) => {
    const p = partsOf(days, m);
    return new Date(israelToUtc(p.date, p.min)).toISOString();
};
/** the end minute of a lodging stay belongs to the check-out day even at 00:00 of the next */
const dateOf = (days: Day[], m: number) => partsOf(days, m).date;

/** logical field values to write for a create / move / resize. Times → UTC ISO, dates → YYYY-MM-DD, links → [{id}] */
export function planFields(
    table: string,
    r: {s: number; e: number; name?: string; slotIds?: string[]; dayId?: string | null},
    days: Day[],
    op: Op,
): Plan | {error: string} {
    if (!days.length) return {error: 'אין ימים בציר הזמן (Date_1 / Date_2)'}; // v0.2.13
    const sp = specOf(table);
    const c = canEdit(table, op);
    if (!sp || !c.ok) return {error: c.ok ? 'טבלה לא מוכרת' : c.reason};
    const f: Plan['fields'] = {};
    if (op === 'create' && r.name?.trim()) f.name = r.name.trim();
    if (op === 'create' && r.dayId && sp.festivalDays) f.festivalDays = [{id: r.dayId}]; // «קישור אוטומטי» to the festival day
    switch (sp.time) {
        case 'own':
            f.start = iso(days, r.s);
            f.end = iso(days, r.e);
            break;
        case 'stamp':
            f.start = iso(days, r.s);
            break;
        case 'lodging':
            f.start = dateOf(days, r.s);
            f.end = dateOf(days, r.e);
            if (f.end === f.start) f.end = dateOf(days, r.s + DAY_MIN);
            break;
        case 'date':
            f.date = dateOf(days, r.s);
            if (sp.dateEnd && dateOf(days, r.e - 1) !== f.date) f.dateEnd = dateOf(days, r.e - 1);
            break;
        case 'borrow':
            if (!r.slotIds?.length) return {error: 'בחרו משבצת — הזמן נלקח ממנה'};
            f.slots = r.slotIds.map(id => ({id}));
            break;
    }
    return {fields: f, needsSlot: sp.time === 'borrow'};
}
/** slots to offer when creating on a borrowed-time table: those overlapping the drag first, then the rest of that day */
export function slotChoices(slots: Item[], s: number, e: number): Item[] {
    const day = Math.floor(s / DAY_MIN);
    const same = slots.filter(i => i.table === 'Slots_Events' && i.s !== null && i.e !== null && Math.floor((i.s as number) / DAY_MIN) === day);
    const ov = (i: Item) => (i.s as number) < e && (i.e as number) > s;
    return same.sort((a, b) => Number(ov(b)) - Number(ov(a)) || Math.abs((a.s as number) - s) - Math.abs((b.s as number) - s));
}

// ---------------------------------------------------------------- column reorder (per user)
export type MoveTo = 'top' | 'up' | 'down' | 'bottom';
/** menu fallback: move t within `order` (top = first = rightmost in RTL) */
export function moveColumn(order: string[], t: string, to: MoveTo): string[] {
    const i = order.indexOf(t);
    if (i < 0) return order;
    const o = order.filter(x => x !== t);
    const j = to === 'top' ? 0 : to === 'bottom' ? o.length : to === 'up' ? Math.max(0, i - 1) : Math.min(o.length, i + 1);
    o.splice(j, 0, t);
    return o;
}
/** drag ⠿: drop t before `before` (null = at the end) */
export function dropColumn(order: string[], t: string, before: string | null): string[] {
    if (t === before) return order;
    const o = order.filter(x => x !== t);
    const j = before === null ? o.length : o.indexOf(before);
    o.splice(j < 0 ? o.length : j, 0, t);
    return o;
}
/** which column the pointer is over → insert before it, given header column boxes [left,right] in screen px (RTL: right side = earlier) */
export function dropTarget(boxes: Array<{t: string; left: number; right: number}>, x: number): string | null {
    for (const b of boxes) if (x >= b.left && x <= b.right) return x > (b.left + b.right) / 2 ? b.t : nextOf(boxes, b.t);
    return null;
}
const nextOf = (boxes: Array<{t: string}>, t: string) => {
    const i = boxes.findIndex(b => b.t === t);
    return i >= 0 && i + 1 < boxes.length ? boxes[i + 1].t : null;
};

// ---------------------------------------------------------------- undo toast countdown (6s, pauses on hover)
export class Countdown {
    private left: number;
    private since: number | null;
    constructor(ms: number, now: number) {
        this.left = ms;
        this.since = now;
    }
    pause(now: number) {
        if (this.since !== null) {
            this.left -= now - this.since;
            this.since = null;
        }
    }
    resume(now: number) {
        if (this.since === null) this.since = now;
    }
    remaining(now: number) {
        return Math.max(0, this.since === null ? this.left : this.left - (now - this.since));
    }
    expired(now: number) {
        return this.remaining(now) <= 0;
    }
    get paused() {
        return this.since === null;
    }
}

// ---------------------------------------------------------------- logical → real fields (loose names), before the permission check
export type FieldLike = {id: string; name: string; type: string; isComputed: boolean; /** v0.2.2 */ tz?: TzMode};
const OPTIONAL: LogicalKey[] = ['name', 'festivalDays', 'dateEnd'];
const looseN = (s: string) => s.normalize('NFC').toLowerCase().replace(/[\s_\-.]+/g, '');
export function findField(fields: FieldLike[], aliases: string[] | undefined): FieldLike | null {
    if (!aliases) return null;
    for (const a of aliases) {
        const f = fields.find(x => x.name === a);
        if (f) return f;
    }
    for (const a of aliases) {
        const f = fields.find(x => looseN(x.name) === looseN(a));
        if (f) return f;
    }
    return null;
}
/** → {fieldId: value}; a missing / computed required field is an error with the reason in Hebrew; optional ones are skipped */
export function mapFields(table: string, fields: FieldLike[], primaryId: string, logical: Plan['fields']): {map: {[fieldId: string]: unknown}; skipped: string[]} | {error: string} {
    const sp = specOf(table);
    if (!sp) return {error: 'טבלה לא מוכרת'};
    const map: {[id: string]: unknown} = {};
    const skipped: string[] = [];
    for (const k of Object.keys(logical) as LogicalKey[]) {
        const f = k === 'name' ? fields.find(x => x.id === primaryId) ?? null : findField(fields, sp[k === 'festivalDays' ? 'festivalDays' : k] as string[] | undefined);
        const label = k === 'name' ? 'שדה השם' : ((sp[k] as string[] | undefined)?.[0] ?? k);
        if (!f || f.isComputed) {
            if (OPTIONAL.includes(k)) {
                skipped.push(k);
                continue;
            }
            return {error: f ? `השדה «${f.name}» מחושב — אי אפשר לכתוב אליו` : `חסר השדה «${label}» בטבלה (או שלא הופעל באלמנט)`};
        }
        let v = logical[k];
        // a dateTime value into a date-only field → its Israel date
        if (f.type === 'date' && typeof v === 'string' && v.includes('T')) v = israelParts(Date.parse(v)).date;
        // v0.2.2: a GMT-clock field ('utc' / isUsingGMT) stores the Israel wall time as its UTC clock
        else if (f.type === 'dateTime' && typeof v === 'string' && v.includes('T')) v = msToCell(Date.parse(v), f.tz ?? 'instant');
        map[f.id] = v;
    }
    return {map, skipped};
}
