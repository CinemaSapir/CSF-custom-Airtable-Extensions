// Pure logic for the Countdown Homescreen target (no Airtable / React imports, unit-tested in tests/).
//
// the owner (2026-10-09): count down to the first slot from 31.10 whose status is משובץ,
// then (once it has started) to the end of the last such slot by date.

export const TZ = 'Asia/Jerusalem';
/** Fixed v0.1.0 target, used whenever the slots can't be read. */
export const FALLBACK_TARGET_MS = Date.parse('2026-10-24T20:00:00+03:00');
/** First festival day (Israel date). Slots before it (press conference, tech checks…) are ignored. */
export const FESTIVAL_FIRST_DAY = '2026-10-31';
export const SCHEDULED_STATUS = 'משובץ';

export const TABLE_ALIASES = ['Slots_Events', 'Slots Events', 'SlotsEvents', 'Slots', 'משבצות', 'משבצות אירועים'];
export const FIELD_ALIASES = {
    start: ['Start', 'Start Time', 'Start DateTime', 'Start Date', 'התחלה', 'שעת התחלה', 'מועד התחלה', 'תאריך התחלה'],
    end: ['End', 'End Time', 'End DateTime', 'End Date', 'סיום', 'שעת סיום', 'מועד סיום', 'תאריך סיום'],
    status: ['Status', 'סטטוס', 'מצב'],
} as const;
export type FieldKey = keyof typeof FIELD_ALIASES;

// Hebrew points + cantillation (U+0591–U+05C7), geresh/gershayim and ASCII/typographic quotes.
const NIKUD_RE = /[\u0591-\u05C7]/g;
const QUOTES_RE = /[\u05F3\u05F4'"`\u00B4\u2018\u2019\u201C\u201D]/g;

/** Loose name key: case-, space-, underscore-, dash- and nikud-insensitive. "Start B" stays distinct from "Start". */
export function normalizeName(s: string): string {
    return (s || '').normalize('NFC').replace(NIKUD_RE, '').toLowerCase().replace(/[\s_\-.]+/g, '');
}

/** Loose status key: trim, collapse spaces, drop nikud and geresh/quotes. */
export function normalizeStatus(s: string | null | undefined): string {
    return (s || '').normalize('NFC').replace(NIKUD_RE, '').replace(QUOTES_RE, '').replace(/\s+/g, ' ').trim();
}

/** Also drops matres lectionis (ו/י) so pointed spelling «מְשֻׁבָּץ» (= משבץ) still matches «משובץ». */
function skeleton(s: string): string {
    return s.replace(/[\u05D5\u05D9]/g, '');
}

/** v0.4.1: `statuses` = Option_List_1 values (Extension_Config); empty/undefined = «משובץ». */
export function isScheduledStatus(s: string | null | undefined, statuses?: readonly string[]): boolean {
    const a = normalizeStatus(s);
    if (a === '') return false;
    const list = statuses && statuses.length ? statuses : [SCHEDULED_STATUS];
    return list.some(x => {
        const b = normalizeStatus(x);
        return b !== '' && (a === b || skeleton(a) === skeleton(b));
    });
}

/** v0.4.1: config overrides (Date_1 fallback, Date_2 first day, Option_List_1 statuses). Missing = code default. */
export type TargetOptions = {
    fallbackMs?: number | null;
    firstDay?: string | null;
    statuses?: readonly string[];
    /** v0.4.9: Festival Days rows (null = table not found → the pre-v0.4.9 Date_2 rule) */
    days?: readonly FestivalDayInput[] | null;
    /** v0.4.9: Number_1 / pane — default 0 */
    targetDay?: number;
    /** v0.4.9: statuses for the clock target; empty = any status */
    clockStatuses?: readonly string[];
};

export const CANCELLED_STATUSES = ['בוטל', 'בוטלה'];

/** «בוטל» / «בוטלה» (loose: nikud, spaces, quotes, ו/י spelling). */
export function isCancelledStatus(s: string | null | undefined): boolean {
    const a = normalizeStatus(s);
    if (!a) return false;
    return CANCELLED_STATUSES.some(c => {
        const b = normalizeStatus(c);
        return a === b || skeleton(a) === skeleton(b);
    });
}

/** Exact name first (in alias order), then loose match (in alias order). */
export function findByLooseName<T extends {name: string}>(items: readonly T[], aliases: readonly string[]): T | null {
    for (const a of aliases) {
        const hit = items.find(it => it.name === a);
        if (hit) return hit;
    }
    for (const a of aliases) {
        const key = normalizeName(a);
        const hit = items.find(it => normalizeName(it.name) === key);
        if (hit) return hit;
    }
    return null;
}

/** dateTime cell → epoch ms. Accepts ISO string, number, Date, or an array (lookup) of those. */
export function parseDateMs(v: unknown): number | null {
    if (Array.isArray(v)) return v.length ? parseDateMs(v[0]) : null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v.getTime();
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'string' && v.trim()) {
        const ms = Date.parse(v);
        return isNaN(ms) ? null : ms;
    }
    return null;
}

function israelParts(ms: number) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date(ms));
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
    return {y: get('year'), m: get('month'), d: get('day'), hh: get('hour'), mm: get('minute')};
}

/** UTC offset of Asia/Jerusalem at that instant, in minutes (+180 summer, +120 winter). */
export function israelOffsetMin(ms: number): number {
    const p = israelParts(ms);
    const asUtc = Date.UTC(Number(p.y), Number(p.m) - 1, Number(p.d), Number(p.hh), Number(p.mm));
    return Math.round((asUtc - Math.floor(ms / 60000) * 60000) / 60000);
}

/** 00:00 Israel time on an Israel calendar date (YYYY-MM-DD), DST-aware (v0.4.4: 31.10 is UTC+2, not +3). */
export function israelMidnightMs(date: string): number {
    const [y, m, d] = date.split('-').map(Number);
    const utcMidnight = Date.UTC(y, m - 1, d);
    let ms = utcMidnight - israelOffsetMin(utcMidnight - 120 * 60000) * 60000;
    ms = utcMidnight - israelOffsetMin(ms) * 60000; // re-check with the offset valid at the result
    return ms;
}

/** Israel calendar date, YYYY-MM-DD. */
export function israelDate(ms: number): string {
    const p = israelParts(ms);
    return `${p.y}-${p.m}-${p.d}`;
}

/** e.g. "31.10 · 16:00" (Israel time). */
export function formatSlotWhen(ms: number): string {
    const p = israelParts(ms);
    return `${Number(p.d)}.${p.m} · ${p.hh}:${p.mm}`;
}

export type SlotInput = {
    name: string;
    startMs: number | null;
    endMs: number | null;
    status: string | null;
    /** v0.4.9: linked Festival Days record ids (Slots_Events → Festival Days), when the link field exists */
    dayIds?: readonly string[];
};

// ---------------------------------------------------------------------------
// v0.4.9 (the owner 13:59): the clock counts down to the start of the FIRST slot on festival Day N (default 0).
// Day N = the Festival Days record whose day number (or name: «Day 0», «יום 0», «0») is N; none → the earliest day.
// First slot = earliest Slots_Events.Start on that day (by the Festival Days link, else by the Israel date).
// Status filter for the clock: any status unless a pane / Extension_Config status list is set.
// ---------------------------------------------------------------------------
export type FestivalDayInput = {id: string; name: string; dayNum: number | null; dateIso: string | null};
export const DAY_TABLE_ALIASES = ['Festival Days', 'Festival_Days', 'FestivalDays', 'Festival Day', 'ימי פסטיבל', 'ימי הפסטיבל', 'ימים'];
export const DAY_NUM_ALIASES = ['Day Number', 'Day_Number', 'Day Num', 'Day No', 'Day #', 'Day', 'Number', 'No', 'מספר יום', 'יום', 'מס׳ יום'];
export const DAY_DATE_ALIASES = ['Date', 'Day Date', 'תאריך'];
export const SLOT_DAY_LINK_ALIASES = ['Festival Days', 'Festival Day', 'Festival_Days', 'Festival_Day', 'Day', 'Days', 'יום', 'ימי פסטיבל'];
export const DEFAULT_TARGET_DAY = 0;

/** Number in a day name: «Day 0», «day-3», «יום 0», «יום #2», or a bare «0». Dates («יום 01.11») are not day numbers. */
export function dayNumberInName(name: string): number | null {
    const s = String(name ?? '').normalize('NFKC').replace(/\p{Cf}/gu, '').trim();
    if (/^\d{1,3}$/.test(s)) return Number(s);
    const m = /(?:^|[^\p{L}\d])(?:day|יום)\s*[-#:№]?\s*(\d{1,3})(?![\d./\-:])/iu.exec(s);
    return m ? Number(m[1]) : null;
}
/** Parse the configured day number («0», « 2 », 0). Bad / empty → default 0. */
export function parseDayNumber(v: unknown, d = DEFAULT_TARGET_DAY): number {
    if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
    const s = String(v ?? '').replace(/\p{Cf}/gu, '').trim();
    return /^-?\d+$/.test(s) ? Number(s) : d;
}
export type DayPick = {day: FestivalDayInput; via: 'number' | 'name' | 'earliest'; wanted: number};
export function pickTargetDay(days: readonly FestivalDayInput[], wanted: number): DayPick | null {
    const byNum = days.find(d => d.dayNum !== null && d.dayNum === wanted);
    if (byNum) return {day: byNum, via: 'number', wanted};
    const byName = days.find(d => d.dayNum === null && dayNumberInName(d.name) === wanted) ?? days.find(d => dayNumberInName(d.name) === wanted);
    if (byName) return {day: byName, via: 'name', wanted};
    const dated = days.filter(d => d.dateIso).sort((a, b) => (a.dateIso! < b.dateIso! ? -1 : a.dateIso! > b.dateIso! ? 1 : 0));
    return dated.length ? {day: dated[0], via: 'earliest', wanted} : null;
}
/** Slot belongs to the day: by the Festival Days link when the slot has one, else by its Israel start date. */
export function slotOnDay(s: SlotInput, day: FestivalDayInput): boolean {
    if (s.dayIds && s.dayIds.length) return s.dayIds.includes(day.id);
    return !!day.dateIso && s.startMs !== null && israelDate(s.startMs) === day.dateIso;
}
/** What the status panel shows about the clock target. */
export type TargetInfo = {
    dayLabel: string | null;
    dayVia: DayPick['via'] | null;
    wanted: number;
    slotName: string | null;
    slotStartMs: number | null;
    statusFilter: string;
    onDay: number;
};

export type SlotsSource =
    | {kind: 'ok'; slots: readonly SlotInput[]}
    | {kind: 'loading'}
    | {kind: 'noTable'}
    | {kind: 'noFields'; missing: readonly string[]};

export type Phase = 'before' | 'live' | 'ended' | 'fallback';

export type TargetResult = {
    phase: Phase;
    /** v0.4.9: matched day + slot (status panel) */
    info?: TargetInfo;
    /** Time the dials count to (ended: last end; dials show zeros). */
    targetMs: number;
    /** Big label under the title, null in fallback (same as v0.1.0). */
    label: string | null;
    /** Small line: slot name and date. */
    slotLine: string | null;
    /** Small grey hint naming what's missing (fallback only). */
    hint: string | null;
    /** Pulse dials + «הפסטיבל חי» tag. */
    live: boolean;
    /** Dials show zeros (phase 3). */
    zero: boolean;
};

function fallback(nowMs: number, hint: string | null, fbMs: number = FALLBACK_TARGET_MS): TargetResult {
    const past = nowMs >= fbMs;
    return {phase: 'fallback', targetMs: fbMs, label: null, slotLine: null, hint, live: past, zero: false};
}

export function computeTarget(source: SlotsSource, nowMs: number, opts: TargetOptions = {}): TargetResult {
    const fbMs = typeof opts.fallbackMs === 'number' && isFinite(opts.fallbackMs) ? opts.fallbackMs : FALLBACK_TARGET_MS;
    const firstDay = opts.firstDay && /^\d{4}-\d{2}-\d{2}$/.test(opts.firstDay) ? opts.firstDay : FESTIVAL_FIRST_DAY;
    const fb = (hint: string | null) => fallback(nowMs, hint, fbMs);
    if (source.kind === 'loading') return fb('טוען משבצות…');
    if (source.kind === 'noTable') return fb('לא נמצאה הטבלה Slots_Events (או שלא הופעלה בחלונית הימנית)');
    if (source.kind === 'noFields') return fb(`חסרים שדות ב־Slots_Events: ${source.missing.join(', ')}`);

    if (opts.days) return dayTarget(source.slots, nowMs, opts, fb);
    const scheduled = source.slots.filter(s => isScheduledStatus(s.status, opts.statuses) && s.startMs !== null);
    if (!scheduled.length) return fb('לא נמצאו משבצות בסטטוס משובץ');

    const festival = scheduled.filter(s => israelDate(s.startMs as number) >= firstDay);
    if (!festival.length) return fb(`לא נמצאו משבצות בסטטוס משובץ מ־${firstDay.slice(8, 10)}.${firstDay.slice(5, 7)} ואילך`);

    const endOf = (s: SlotInput) => {
        const start = s.startMs as number;
        return s.endMs !== null && s.endMs >= start ? s.endMs : start;
    };
    let first = festival[0];
    let last = festival[0];
    for (const s of festival) {
        if ((s.startMs as number) < (first.startMs as number)) first = s;
        if (endOf(s) > endOf(last)) last = s;
    }
    const firstStart = first.startMs as number;
    const lastEnd = Math.max(endOf(last), firstStart);

    if (nowMs < firstStart) {
        return {
            phase: 'before',
            targetMs: firstStart,
            label: 'עד תחילת הפסטיבל',
            slotLine: `${first.name || 'משבצת ללא שם'} · ${formatSlotWhen(firstStart)}`,
            hint: null,
            live: false,
            zero: false,
        };
    }
    if (nowMs < lastEnd) {
        return {
            phase: 'live',
            targetMs: lastEnd,
            label: 'עד סוף הפסטיבל',
            slotLine: `${last.name || 'משבצת ללא שם'} · ${formatSlotWhen(lastEnd)}`,
            hint: null,
            live: true,
            zero: false,
        };
    }
    return {phase: 'ended', targetMs: lastEnd, label: 'הפסטיבל הסתיים', slotLine: null, hint: null, live: false, zero: true};
}

/** v0.4.9 path: Day N's first slot (any status unless clockStatuses). Same before / live / ended phases. */
function dayTarget(slots: readonly SlotInput[], nowMs: number, opts: TargetOptions, fb: (hint: string | null) => TargetResult): TargetResult {
    const wanted = typeof opts.targetDay === 'number' ? opts.targetDay : DEFAULT_TARGET_DAY;
    const st = (opts.clockStatuses ?? []).filter(x => x.trim());
    const statusFilter = st.length ? st.join(' | ') : 'כל סטטוס';
    const pick = pickTargetDay(opts.days ?? [], wanted);
    const info: TargetInfo = {dayLabel: pick ? pick.day.name || pick.day.dateIso : null, dayVia: pick?.via ?? null, wanted, slotName: null, slotStartMs: null, statusFilter, onDay: 0};
    const withInfo = (r: TargetResult): TargetResult => ({...r, info});
    if (!pick) return withInfo(fb(`לא נמצא יום ${wanted} בטבלת Festival Days (וגם אין ימים עם תאריך)`));
    const cands = slots.filter(s => s.startMs !== null && (!st.length || isScheduledStatus(s.status, st)));
    const onDay = cands.filter(s => slotOnDay(s, pick.day));
    info.onDay = onDay.length;
    if (!onDay.length) return withInfo(fb(`אין משבצות ב«${info.dayLabel}»${st.length ? ` בסטטוס ${statusFilter}` : ''}`));
    let first = onDay[0];
    for (const s of onDay) if ((s.startMs as number) < (first.startMs as number)) first = s;
    const firstStart = first.startMs as number;
    info.slotName = first.name || 'משבצת ללא שם';
    info.slotStartMs = firstStart;
    const endOf = (s: SlotInput) => (s.endMs !== null && s.endMs >= (s.startMs as number) ? s.endMs : (s.startMs as number));
    let last = first;
    for (const s of cands) if ((s.startMs as number) >= firstStart && endOf(s) > endOf(last)) last = s;
    const lastEnd = Math.max(endOf(last), firstStart);
    if (nowMs < firstStart)
        return withInfo({phase: 'before', targetMs: firstStart, label: 'עד תחילת הפסטיבל', slotLine: `${info.slotName} · ${formatSlotWhen(firstStart)}`, hint: null, live: false, zero: false});
    if (nowMs < lastEnd)
        return withInfo({phase: 'live', targetMs: lastEnd, label: 'עד סוף הפסטיבל', slotLine: `${last.name || 'משבצת ללא שם'} · ${formatSlotWhen(lastEnd)}`, hint: null, live: true, zero: false});
    return withInfo({phase: 'ended', targetMs: lastEnd, label: 'הפסטיבל הסתיים', slotLine: null, hint: null, live: false, zero: true});
}

/** Remaining (or elapsed) time split into dial units. */
export function splitDuration(ms: number): {days: number; hours: number; minutes: number} {
    const diff = Math.max(0, Math.abs(ms));
    return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
    };
}
