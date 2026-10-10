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
export type TargetOptions = {fallbackMs?: number | null; firstDay?: string | null; statuses?: readonly string[]};

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

export type SlotInput = {name: string; startMs: number | null; endMs: number | null; status: string | null};

export type SlotsSource =
    | {kind: 'ok'; slots: readonly SlotInput[]}
    | {kind: 'loading'}
    | {kind: 'noTable'}
    | {kind: 'noFields'; missing: readonly string[]};

export type Phase = 'before' | 'live' | 'ended' | 'fallback';

export type TargetResult = {
    phase: Phase;
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

/** Remaining (or elapsed) time split into dial units. */
export function splitDuration(ms: number): {days: number; hours: number; minutes: number} {
    const diff = Math.max(0, Math.abs(ms));
    return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
    };
}
