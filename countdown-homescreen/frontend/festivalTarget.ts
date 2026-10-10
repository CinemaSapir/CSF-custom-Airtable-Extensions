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
    /** v0.4.9: statuses for the clock target. v0.4.10: empty = `statuses` (Option_List_1, default משובץ); «*» / «כל סטטוס» = any but cancelled */
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
// v0.4.10 (the owner 14:45, wrong reference on PROD): Day N also via Notes «יום 0» and Date_2 (31.10) before «earliest»;
// slots belong to the day by their Israel Start date; status defaults back to משובץ; בוטל and all-day slots never count.
// ---------------------------------------------------------------------------
export type FestivalDayInput = {id: string; name: string; dayNum: number | null; dateIso: string | null; /** v0.4.10: Notes text (DEMO keeps «יום 0» there) */ note?: string};
export const DAY_TABLE_ALIASES = ['Festival Days', 'Festival_Days', 'FestivalDays', 'Festival Day', 'ימי פסטיבל', 'ימי הפסטיבל', 'ימים'];
export const DAY_NUM_ALIASES = ['Day Number', 'Day_Number', 'Day Num', 'Day No', 'Day #', 'Day', 'Number', 'No', 'מספר יום', 'יום', 'מס׳ יום'];
export const DAY_DATE_ALIASES = ['Date', 'Day Date', 'תאריך'];
/** v0.4.10: free-text field that may carry «יום 0» (DEMO: Festival Days.Notes = «DEMO · הכנות · יום 0, ערב הפסטיבל») */
export const DAY_NOTE_ALIASES = ['Notes', 'Note', 'Description', 'הערות', 'תיאור'];
export const SLOT_DAY_LINK_ALIASES = ['Festival Days', 'Festival Day', 'Festival_Days', 'Festival_Day', 'Day', 'Days', 'יום', 'ימי פסטיבל'];
export const DEFAULT_TARGET_DAY = 0;
/** v0.4.10: a clock status list of exactly one of these = every status except cancelled */
export const ANY_STATUS_WORDS = ['*', 'any', 'all', 'כל סטטוס', 'הכל', 'כל'];
export const RUNNERS_UP = 3;

/**
 * Number in a day name / note: «Day 0», «day-3», «יום 0», «יום #2», a bare «0», and (v0.4.10) signed «יום -15» / «יום +8».
 * Dates («יום 01.11», «יום א׳ 18.10.26») are not day numbers.
 */
export function dayNumberInName(name: string): number | null {
    const s = String(name ?? '').normalize('NFKC').replace(/\p{Cf}/gu, '').trim();
    if (/^[+\-−]?\d{1,3}$/.test(s)) return Number(s.replace('−', '-'));
    const m = /(?:^|[^\p{L}\d])(?:day|יום)(\s*)([-#:№+−]?)(\s*)(\d{1,3})(?![\d./\-:])/iu.exec(s);
    if (!m) return null;
    const n = Number(m[4]);
    // «יום -15» (space before the sign, digits right after it) is negative; «day-3» is just a separator
    const neg = (m[2] === '−' || (m[2] === '-' && m[1] !== '')) && m[3] === '';
    return neg ? -n : n;
}
/** Parse the configured day number («0», « 2 », 0). Bad / empty → default 0. */
export function parseDayNumber(v: unknown, d = DEFAULT_TARGET_DAY): number {
    if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
    const s = String(v ?? '').replace(/\p{Cf}/gu, '').trim();
    return /^-?\d+$/.test(s) ? Number(s) : d;
}
/** Israel calendar date + n days (YYYY-MM-DD, no time zone involved). */
export function addDaysIso(iso: string, n: number): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
export type DayVia = 'number' | 'name' | 'note' | 'date' | 'earliest';
export type DayPick = {day: FestivalDayInput; via: DayVia; wanted: number; /** every rule tried, in order, with its outcome (status panel) */ tried: string[]};
/**
 * v0.4.10 order: (1) day-number field = N · (2) «Day N» / «יום N» in the day's name · (3) … in its Notes ·
 * (4) the day whose Date = Date_2 (+N days; Date_2 default 31.10 = the owner's 9.10 ask) · (5) the earliest dated day.
 */
export function pickTargetDay(days: readonly FestivalDayInput[], wanted: number, firstDay?: string | null): DayPick | null {
    const tried: string[] = [];
    const hasNum = days.some(d => d.dayNum !== null);
    const byNum = days.find(d => d.dayNum !== null && d.dayNum === wanted);
    if (byNum) return {day: byNum, via: 'number', wanted, tried: [...tried, `שדה מספר יום = ${wanted} ✓`]};
    tried.push(hasNum ? `שדה מספר יום: אין יום ${wanted}` : 'שדה מספר יום: אין / ריק');
    const byName = days.find(d => d.dayNum === null && dayNumberInName(d.name) === wanted) ?? days.find(d => dayNumberInName(d.name) === wanted);
    if (byName) return {day: byName, via: 'name', wanted, tried: [...tried, `«יום ${wanted}» בשם היום ✓`]};
    tried.push(`«יום ${wanted}» בשם: לא נמצא`);
    const byNote = days.find(d => d.note && dayNumberInName(d.note) === wanted);
    if (byNote) return {day: byNote, via: 'note', wanted, tried: [...tried, `«יום ${wanted}» בהערות (Notes) ✓`]};
    tried.push(`«יום ${wanted}» בהערות: לא נמצא`);
    if (firstDay && /^\d{4}-\d{2}-\d{2}$/.test(firstDay)) {
        const iso = addDaysIso(firstDay, wanted);
        const byDate = days.find(d => d.dateIso === iso);
        if (byDate) return {day: byDate, via: 'date', wanted, tried: [...tried, `תאריך = Date_2${wanted ? ` + ${wanted}` : ''} (${iso}) ✓`]};
        tried.push(`תאריך ${iso}: אין יום כזה`);
    }
    const dated = days.filter(d => d.dateIso).sort((a, b) => (a.dateIso! < b.dateIso! ? -1 : a.dateIso! > b.dateIso! ? 1 : 0));
    return dated.length ? {day: dated[0], via: 'earliest', wanted, tried: [...tried, 'היום המוקדם ביותר (גיבוי אחרון)']} : null;
}
/**
 * v0.4.10: a slot is ON the day when its Start falls on that Israel date (what the clock counts to).
 * The Festival Days link only decides when the day has no Date. Link ≠ date is reported, not trusted.
 */
export function slotOnDay(s: SlotInput, day: FestivalDayInput): boolean {
    if (day.dateIso) return s.startMs !== null && israelDate(s.startMs) === day.dateIso;
    return !!(s.dayIds && s.dayIds.includes(day.id));
}
/** 00:00 Israel start with no end or ≥ 20 h long = an all-day / placeholder slot, never the clock target. */
export function isAllDaySlot(s: SlotInput): boolean {
    if (s.startMs === null) return false;
    const t = formatSlotWhen(s.startMs).slice(-5);
    return t === '00:00' && (s.endMs === null || s.endMs - s.startMs >= 20 * 3600000);
}
export type SlotBrief = {name: string; startMs: number; status: string | null};
/** What the status panel shows about the clock target (v0.4.10: every step). */
export type TargetInfo = {
    dayLabel: string | null;
    dayDate: string | null;
    dayVia: DayVia | null;
    dayTried: string[];
    wanted: number;
    slotName: string | null;
    slotStartMs: number | null;
    slotStatus: string | null;
    statusFilter: string;
    onDay: number;
    runnersUp: SlotBrief[];
    skipped: {status: number; cancelled: number; allDay: number; noStart: number; linkMismatch: number};
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
    if (source.kind === 'noFields') return fb(`חסרים שדות ב־Slots_Events: ${source.missing.join(', ')} — מוסתרים באלמנט או לא קיימים (v0.4.11)`);

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

/** v0.4.10 path: Day N's first slot. Status default = Option_List_1 (משובץ); «בוטל» never counts. Same before / live / ended phases. */
function dayTarget(slots: readonly SlotInput[], nowMs: number, opts: TargetOptions, fb: (hint: string | null) => TargetResult): TargetResult {
    const wanted = typeof opts.targetDay === 'number' ? opts.targetDay : DEFAULT_TARGET_DAY;
    const own = (opts.clockStatuses ?? []).map(x => x.trim()).filter(Boolean);
    const any = own.length === 1 && ANY_STATUS_WORDS.includes(normalizeStatus(own[0]).toLowerCase());
    const st = any ? [] : own.length ? own : opts.statuses && opts.statuses.length ? [...opts.statuses] : [SCHEDULED_STATUS];
    const statusFilter = any ? 'כל סטטוס (חוץ מבוטל)' : st.join(' | ');
    const pick = pickTargetDay(opts.days ?? [], wanted, opts.firstDay ?? FESTIVAL_FIRST_DAY);
    const info: TargetInfo = {
        dayLabel: pick ? pick.day.name || pick.day.dateIso : null,
        dayDate: pick?.day.dateIso ?? null,
        dayVia: pick?.via ?? null,
        dayTried: pick?.tried ?? ['אין ימים עם תאריך'],
        wanted,
        slotName: null,
        slotStartMs: null,
        slotStatus: null,
        statusFilter,
        onDay: 0,
        runnersUp: [],
        skipped: {status: 0, cancelled: 0, allDay: 0, noStart: 0, linkMismatch: 0},
    };
    const withInfo = (r: TargetResult): TargetResult => ({...r, info});
    if (!pick) return withInfo(fb(`לא נמצא יום ${wanted} בטבלת Festival Days (וגם אין ימים עם תאריך)`));
    const day = pick.day;
    const cands: SlotInput[] = [];
    for (const s of slots) {
        const linked = !!(s.dayIds && s.dayIds.includes(day.id));
        if (s.startMs === null) {
            if (linked) info.skipped.noStart++;
            continue;
        }
        const on = slotOnDay(s, day);
        if (s.dayIds && s.dayIds.length && linked !== on && day.dateIso) info.skipped.linkMismatch++;
        if (isCancelledStatus(s.status)) {
            if (on) info.skipped.cancelled++;
            continue;
        }
        if (st.length && !isScheduledStatus(s.status, st)) {
            if (on) info.skipped.status++;
            continue;
        }
        if (on && isAllDaySlot(s)) {
            info.skipped.allDay++;
            continue;
        }
        cands.push(s);
    }
    const onDay = cands.filter(s => slotOnDay(s, day)).sort((a, b) => (a.startMs as number) - (b.startMs as number));
    info.onDay = onDay.length;
    if (!onDay.length) return withInfo(fb(`אין משבצות ב«${info.dayLabel}» בסטטוס ${statusFilter}`));
    const first = onDay[0];
    const firstStart = first.startMs as number;
    info.slotName = first.name || 'משבצת ללא שם';
    info.slotStartMs = firstStart;
    info.slotStatus = first.status;
    info.runnersUp = onDay.slice(1, 1 + RUNNERS_UP).map(s => ({name: s.name || 'משבצת ללא שם', startMs: s.startMs as number, status: s.status}));
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
