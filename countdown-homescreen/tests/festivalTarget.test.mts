import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    FALLBACK_TARGET_MS,
    FIELD_ALIASES,
    TABLE_ALIASES,
    computeTarget,
    findByLooseName,
    isScheduledStatus,
    israelDate,
    normalizeStatus,
    parseDateMs,
    splitDuration,
    type SlotInput,
} from '../frontend/festivalTarget.ts';

const ms = (iso: string) => Date.parse(iso);
const slot = (name: string, start: string | null, end: string | null, status: string | null): SlotInput => ({
    name,
    startMs: start ? ms(start) : null,
    endMs: end ? ms(end) : null,
    status,
});

// Mirrors DEMO Slots_Events (2026-10-09): pre-festival משובץ slots on 21.10 and 29.10.
const DEMO = [
    slot('מסיבת עיתונאים: השקת התוכניה', '2026-10-21T08:00:00Z', '2026-10-21T09:30:00Z', 'משובץ'),
    slot('בדיקת DCP והגברה', '2026-10-29T08:00:00Z', '2026-10-29T12:00:00Z', 'משובץ'),
    slot('חזרה גנרלית לטקס הפתיחה', '2026-10-31T14:00:00Z', '2026-10-31T17:00:00Z', 'משובץ'),
    slot('טקס פתיחה', '2026-11-01T17:00:00Z', '2026-11-01T17:55:00Z', 'משובץ'),
    slot('טקס נעילה והכרזת זוכים', '2026-11-07T17:30:00Z', '2026-11-07T19:00:00Z', 'משובץ'),
    slot('מסיבת נעילה', '2026-11-07T19:30:00Z', '2026-11-07T22:30:00Z', 'מתוכנן'),
    slot('הקרנה חוזרת', '2026-11-08T08:00:00Z', '2026-11-08T09:30:00Z', 'מתוכנן'),
    slot('ללא תאריך', null, null, 'משובץ'),
];
const ok = (slots: SlotInput[]) => ({kind: 'ok' as const, slots});

test('status matching is loose (trim, nikud, geresh, spaces)', () => {
    assert.equal(isScheduledStatus('משובץ'), true);
    assert.equal(isScheduledStatus('  משובץ '), true);
    assert.equal(isScheduledStatus('מְשֻׁבָּץ'), true);
    assert.equal(isScheduledStatus('משובץ׳'), true);
    assert.equal(isScheduledStatus('"משובץ"'), true);
    assert.equal(isScheduledStatus('מתוכנן'), false);
    assert.equal(isScheduledStatus('בוטל'), false);
    assert.equal(isScheduledStatus('בבדיקה'), false);
    assert.equal(isScheduledStatus('השתנה'), false);
    assert.equal(isScheduledStatus('לא משובץ'), false);
    assert.equal(isScheduledStatus(''), false);
    assert.equal(isScheduledStatus(null), false);
    assert.equal(normalizeStatus('פיצ׳ינג'), normalizeStatus("פיצ'ינג"));
});

test('table/field names match loosely, exact first, and "Start B" is not "Start"', () => {
    const fields = [{name: 'Start B'}, {name: 'start '}, {name: 'END'}, {name: 'סטטוס'}];
    assert.equal(findByLooseName(fields, FIELD_ALIASES.start)?.name, 'start ');
    assert.equal(findByLooseName(fields, FIELD_ALIASES.end)?.name, 'END');
    assert.equal(findByLooseName(fields, FIELD_ALIASES.status)?.name, 'סטטוס');
    assert.equal(findByLooseName([{name: 'Start B'}], FIELD_ALIASES.start), null);
    assert.equal(findByLooseName([{name: 'slots events'}], TABLE_ALIASES)?.name, 'slots events');
    assert.equal(findByLooseName([{name: 'Slots'}, {name: 'Slots_Events'}], TABLE_ALIASES)?.name, 'Slots_Events');
    assert.equal(findByLooseName([{name: 'שעת התחלה'}], FIELD_ALIASES.start)?.name, 'שעת התחלה');
});

test('phase 1: before the festival → earliest משובץ start from 31.10 (pre-festival slots ignored)', () => {
    const r = computeTarget(ok(DEMO), ms('2026-10-09T14:00:00Z'));
    assert.equal(r.phase, 'before');
    assert.equal(r.targetMs, ms('2026-10-31T14:00:00Z'));
    assert.equal(r.label, 'עד תחילת הפסטיבל');
    assert.equal(r.slotLine, 'חזרה גנרלית לטקס הפתיחה · 31.10 · 16:00');
    assert.equal(r.live, false);
    assert.equal(r.hint, null);
});

test('phase 2: once the first start passed → end of last משובץ slot (non-משובץ later slots ignored)', () => {
    const r = computeTarget(ok(DEMO), ms('2026-10-31T14:00:00Z'));
    assert.equal(r.phase, 'live');
    assert.equal(r.targetMs, ms('2026-11-07T19:00:00Z'));
    assert.equal(r.label, 'עד סוף הפסטיבל');
    assert.equal(r.live, true);
    assert.match(r.slotLine ?? '', /^טקס נעילה והכרזת זוכים · 7\.11 · 21:00$/);
});

test('phase 2: last slot uses Start when End is empty or before Start', () => {
    const slots = [
        slot('A', '2026-10-31T10:00:00Z', '2026-10-31T11:00:00Z', 'משובץ'),
        slot('B', '2026-11-02T10:00:00Z', null, 'משובץ'),
        slot('C', '2026-11-01T10:00:00Z', '2026-10-01T10:00:00Z', 'משובץ'),
    ];
    const r = computeTarget(ok(slots), ms('2026-11-01T00:00:00Z'));
    assert.equal(r.phase, 'live');
    assert.equal(r.targetMs, ms('2026-11-02T10:00:00Z'));
    assert.match(r.slotLine ?? '', /^B /);
});

test('phase 3: after the last end → ended, zeros, no pulse', () => {
    const r = computeTarget(ok(DEMO), ms('2026-11-07T19:00:01Z'));
    assert.equal(r.phase, 'ended');
    assert.equal(r.label, 'הפסטיבל הסתיים');
    assert.equal(r.zero, true);
    assert.equal(r.live, false);
});

test('31.10 boundary is Israel time (31.10 00:30 IST counts, 30.10 23:30 IST does not)', () => {
    assert.equal(israelDate(ms('2026-10-30T22:30:00Z')), '2026-10-31');
    const slots = [
        slot('late 30.10', '2026-10-30T21:30:00Z', null, 'משובץ'),
        slot('early 31.10', '2026-10-30T22:30:00Z', null, 'משובץ'),
        slot('later', '2026-11-01T10:00:00Z', null, 'משובץ'),
    ];
    const r = computeTarget(ok(slots), ms('2026-10-09T00:00:00Z'));
    assert.equal(r.targetMs, ms('2026-10-30T22:30:00Z'));
});

test('fallback: missing table / fields / matching slots → fixed 24.10 20:00 target plus hint', () => {
    const now = ms('2026-10-09T14:00:00Z');
    const cases = [
        [{kind: 'noTable' as const}, /Slots_Events/],
        [{kind: 'noFields' as const, missing: ['Start', 'Status']}, /Start, Status/],
        [ok([]), /לא נמצאו משבצות בסטטוס משובץ/],
        [ok([slot('x', '2026-11-01T10:00:00Z', null, 'מתוכנן')]), /לא נמצאו משבצות בסטטוס משובץ/],
        [ok([slot('x', null, null, 'משובץ')]), /לא נמצאו משבצות בסטטוס משובץ/],
        [ok([slot('x', '2026-10-21T08:00:00Z', null, 'משובץ')]), /מ־31\.10/],
        [{kind: 'loading' as const}, /טוען/],
    ] as const;
    for (const [src, re] of cases) {
        const r = computeTarget(src, now);
        assert.equal(r.phase, 'fallback');
        assert.equal(r.targetMs, FALLBACK_TARGET_MS);
        assert.equal(r.label, null);
        assert.match(r.hint ?? '', re);
        assert.equal(r.live, false);
    }
    assert.equal(FALLBACK_TARGET_MS, ms('2026-10-24T17:00:00Z'));
    assert.equal(computeTarget({kind: 'noTable'}, ms('2026-10-25T00:00:00Z')).live, true);
});

test('parseDateMs and splitDuration', () => {
    assert.equal(parseDateMs('2026-10-31T14:00:00.000Z'), ms('2026-10-31T14:00:00Z'));
    assert.equal(parseDateMs(['2026-10-31T14:00:00.000Z']), ms('2026-10-31T14:00:00Z'));
    assert.equal(parseDateMs(''), null);
    assert.equal(parseDateMs('nope'), null);
    assert.equal(parseDateMs(null), null);
    assert.equal(parseDateMs({}), null);
    assert.deepEqual(splitDuration(86400000 * 2 + 3600000 * 5 + 60000 * 7 + 59000), {days: 2, hours: 5, minutes: 7});
    assert.deepEqual(splitDuration(-60000), {days: 0, hours: 0, minutes: 1});
});
