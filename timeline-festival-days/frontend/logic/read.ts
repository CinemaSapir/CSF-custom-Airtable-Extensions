/**
 * Records → timeline items. Pure: works on a small RecView interface so the same code runs on SDK records
 * (frontend/index.tsx adapter) and on test / harness fixtures.
 */
import {cellToMs, cleanName, dayIndex, isJunk, israelParts, toM, type Day, type Item, type TzMode} from './core';
import {STAMP_MIN, TABLE_SPECS, type TableSpec} from './tables';

export type RecView = {
    id: string;
    name: string;
    /** raw cell value of the first existing alias field; undefined when none of the fields exist */
    raw: (aliases?: string[]) => unknown;
    /** cell as string ('' when missing) */
    str: (aliases?: string[]) => string;
    /** does any alias field exist */
    has: (aliases?: string[]) => boolean;
    /** v0.2.2: time-zone mode of the dateTime field (from its timeZone / isUsingGMT options); absent → 'instant' */
    tz?: (aliases?: string[]) => TzMode;
};
export type TableInput = {key: string; recs: RecView[]};

/** link / collaborator / lookup / select / text → list of display names */
export function names(v: unknown): string[] {
    if (v === null || v === undefined || v === '') return [];
    if (Array.isArray(v)) return v.flatMap(x => names(x));
    if (typeof v === 'object') {
        const o = v as {name?: unknown; value?: unknown};
        if (typeof o.name === 'string') return [o.name];
        if ('value' in o) return names(o.value);
        return [];
    }
    return [String(v)];
}
export function ids(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.map(x => (x && typeof x === 'object' ? String((x as {id?: unknown; linkedRecordId?: unknown}).id ?? (x as {linkedRecordId?: unknown}).linkedRecordId ?? '') : '')).filter(Boolean);
}
const dateOnly = (v: unknown): string | null => {
    const s = names(v)[0];
    return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};
const instant = (v: unknown, mode: TzMode = 'instant'): number | null => {
    const s = names(v)[0];
    if (!s) return null;
    return cellToMs(s, mode);
};
const ils = (v: unknown): string => {
    const n = typeof v === 'number' ? v : Number(names(v)[0]);
    return Number.isFinite(n) && names(v).length ? `₪${Math.round(n).toLocaleString('en-US')}` : '';
};
const uniq = (a: string[]) => [...new Set(a.filter(Boolean))];

export type ReadOptions = {
    days: Day[];
    /** Festival Days record id → date */
    dayDateById?: {[id: string]: string};
    lodge: {in: string; out: string};
    /** raw status → label (Option_List_7) */
    statusLabel: (raw: string) => string;
    excludeTypes?: string[];
    excludeStatus?: {[table: string]: string[]};
    clean?: boolean;
};
export type ReadResult = {items: Item[]; hidden: number; hiddenByTable: {[t: string]: number}};

const hm = (s: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
    return m ? +m[1] * 60 + +m[2] : 0;
};

export function readItems(input: TableInput[], o: ReadOptions): ReadResult {
    const idx = dayIndex(o.days);
    const clean = o.clean !== false ? cleanName : (s: string) => s;
    const spec = (k: string) => TABLE_SPECS.find(s => s.key === k) as TableSpec;
    const mOfInstant = (ms: number | null) => {
        if (ms === null) return null;
        const p = israelParts(ms);
        return toM(idx, p.date, p.min);
    };
    const fdDate = (r: RecView, sp: TableSpec) => {
        if (!sp.festivalDays || !o.dayDateById) return null;
        const ds = ids(r.raw(sp.festivalDays))
            .map(id => o.dayDateById?.[id])
            .filter((x): x is string => !!x)
            .sort();
        return ds[0] ?? null;
    };

    // pass 1: slots (others borrow their time, hall and films)
    type Slot = {s: number | null; e: number | null; hall: string[]; films: string[]; name: string; item?: Item};
    const slots = new Map<string, Slot>();
    const raw: Array<{item: Item; type: string | null}> = [];
    for (const t of input) {
        const sp = spec(t.key);
        if (!sp) continue;
        for (const r of t.recs) {
            const status = sp.status ? names(r.raw(sp.status))[0] ?? null : null;
            const base: Item = {
                table: t.key,
                id: r.id,
                name: clean((r.name || '').trim()),
                s: null,
                e: null,
                date: null,
                dateEnd: null,
                sub: '',
                inherited: false,
                flag: null,
                hall: [],
                people: [],
                films: [],
                status,
                st: status ? o.statusLabel(status) : null,
                slots: sp.slots ? ids(r.raw(sp.slots)) : [],
            };
            let type: string | null = null;
            if (sp.time === 'own') {
                base.s = mOfInstant(instant(r.raw(sp.start), r.tz?.(sp.start)));
                base.e = mOfInstant(instant(r.raw(sp.end), r.tz?.(sp.end)));
                if (base.s !== null && (base.e === null || base.e <= base.s)) base.e = base.s + 60;
                if (base.s === null) base.e = null;
                base.hall = uniq(names(r.raw(sp.hall)).map(clean));
                base.films = uniq(names(r.raw(sp.films)));
                type = sp.type ? names(r.raw(sp.type))[0] ?? null : null;
                base.sub = [base.hall[0] ? shortHall(base.hall[0]) : '', type || ''].filter(Boolean).join(' · ');
                base.flag = status;
                if (/בוטל/.test(status || '')) base.flag = 'cancel';
                slots.set(r.id, {s: base.s, e: base.e, hall: base.hall, films: base.films, name: base.name, item: base});
                // a slot with no Start stays out (hidden fixed filter Filter_6); fall back to its Festival Days date? no — not placeable
            } else if (sp.time === 'date') {
                base.date = dateOnly(r.raw(sp.date)) ?? (sp.dateEnd ? dateOnly(r.raw(sp.dateEnd)) : null) ?? fdDate(r, sp);
                base.dateEnd = sp.dateEnd ? dateOnly(r.raw(sp.dateEnd)) : null;
                if (base.date && base.dateEnd && base.dateEnd < base.date) base.dateEnd = null;
                base.sub = [base.st, sp.amount ? ils(r.raw(sp.amount)) : ''].filter(Boolean).join(' · ');
                if (sp.people) base.people = uniq(names(r.raw(sp.people)));
            } else if (sp.time === 'stamp') {
                const s = mOfInstant(instant(r.raw(sp.start), r.tz?.(sp.start)));
                if (s !== null) {
                    base.s = s;
                    base.e = s + STAMP_MIN;
                } else base.date = dateOnly(r.raw(sp.date));
                const amt = sp.amount ? ils(r.raw(sp.amount)) : '';
                if (/^\d+$/.test(base.name)) base.name = `אישור #${base.name}${amt ? ' ' + amt : ''}`;
                base.sub = base.st || '';
            } else if (sp.time === 'lodging') {
                const a = dateOnly(r.raw(sp.start)),
                    b = dateOnly(r.raw(sp.end));
                base.guest = clean(names(r.raw(sp.guest))[0] || '');
                base.hotel = clean(names(r.raw(sp.hotel))[0] || '');
                if (a) {
                    base.s = toM(idx, a, hm(o.lodge.in));
                    base.e = b ? toM(idx, b, hm(o.lodge.out)) : null;
                    // stays that start/end outside the programme are clipped to it
                    if (base.s === null && b && a < (o.days[0]?.date ?? '')) base.s = 0;
                    if (base.e === null && base.s !== null && b && b > (o.days[o.days.length - 1]?.date ?? '')) base.e = o.days.length * 1440;
                    if (base.s !== null && (base.e === null || base.e <= base.s)) base.e = base.s + 20 * 60;
                }
                base.defT = true;
                base.hall = base.hotel ? [base.hotel] : [];
                base.people = base.guest ? [base.guest] : [];
                base.sub = base.hotel;
                if (!base.guest) base.guest = base.name;
                if (!base.hotel) base.hotel = '—';
            }
            raw.push({item: base, type});
        }
    }
    // pass 2: borrowed time (Staffing / Invitations / Itinerary) + people
    for (const {item} of raw) {
        const sp = spec(item.table);
        const r = input.find(t => t.key === item.table)?.recs.find(x => x.id === item.id) as RecView;
        if (sp.time === 'borrow') {
            const ls = item.slots.map(id => slots.get(id)).filter((x): x is Slot => !!x && x.s !== null);
            if (ls.length) {
                item.s = Math.min(...ls.map(x => x.s as number));
                item.e = Math.max(...ls.map(x => x.e as number));
                item.inherited = true;
                item.hall = uniq(ls.flatMap(x => x.hall));
                item.films = uniq(ls.flatMap(x => x.films));
            } else if (sp.date) item.date = null; // borrowed-time record with no timed slot → hidden (junk rule)
            const pp = uniq(names(r.raw(sp.people)).map(clean));
            const fromName = item.name.split(' · ')[0];
            item.people = item.table === 'Staffing' ? uniq([fromName.startsWith('DEMO') ? '' : fromName]) : pp.length ? pp : [fromName];
            if (item.table === 'Staffing' && !item.people.length) item.people = pp.map(p => p.split(/ [·|-] /)[0]);
            if (item.table === 'Invitations') item.sub = item.st || '';
            else if (item.table === 'Itinerary') {
                const f = r.str(sp.from),
                    t2 = r.str(sp.to);
                item.sub = f || t2 ? `נסיעה: ${f || '?'}→${t2 || '?'}` : '';
            } else item.sub = [item.st || '', 'זמן לפי המשבצת'].filter(Boolean).join(' · ');
        }
    }
    // slots inherit people from linked staffing / invitations / itinerary
    for (const {item} of raw)
        for (const sid of item.slots) {
            const s = slots.get(sid)?.item;
            if (s) s.people = uniq([...s.people, ...item.people]);
        }
    const items: Item[] = [];
    const hiddenByTable: {[t: string]: number} = {};
    for (const {item, type} of raw) {
        const junk = isJunk(item, {type, excludeTypes: o.excludeTypes, excludeStatus: o.excludeStatus});
        if (junk) hiddenByTable[item.table] = (hiddenByTable[item.table] || 0) + 1;
        else items.push(item);
    }
    return {items, hidden: raw.length - items.length, hiddenByTable};
}
function shortHall(h: string): string {
    return h.replace(/^אולם\s+/, '').replace(/^.*—\s*/, '');
}
