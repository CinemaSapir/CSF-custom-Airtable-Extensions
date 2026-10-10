// v0.4.9 (the owner 13:59): clock → start of the FIRST slot on festival Day 0 (configurable N).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../frontend/festivalTarget.ts';

const ms = (s: string) => Date.parse(s);
const day = (id: string, name: string, dayNum: number | null, dateIso: string | null) => ({id, name, dayNum, dateIso});
const DAYS = [day('d1', 'יום 1 · 1.11', 1, '2026-11-01'), day('d0', 'פתיחה', 0, '2026-10-31'), day('dm', 'הקמה', -1, '2026-10-30')];
const slot = (name: string, start: string, status = 'טיוטה', dayIds?: string[], end?: string) => ({name, startMs: ms(start), endMs: end ? ms(end) : null, status, dayIds});
const NOW = ms('2026-10-10T10:00:00Z');

test('day-number parsing: «Day 0», «יום 0», «0», number; dates are not day numbers', () => {
    for (const [s, n] of [['Day 0', 0], ['day-3', 3], ['יום 0', 0], ['יום #2', 2], ['0', 0], [' 0\u200F', 0], ['Festival Day 0 (opening)', 0]] as const) assert.equal(T.dayNumberInName(s), n, s);
    for (const s of ['יום 01.11', 'יום א׳ 18.10.26', 'Opening', 'יום 31/10']) assert.equal(T.dayNumberInName(s), null, s);
    assert.equal(T.parseDayNumber(''), 0);
    assert.equal(T.parseDayNumber(' 2 '), 2);
    assert.equal(T.parseDayNumber('x'), 0);
    assert.equal(T.parseDayNumber(3), 3);
});
test('pickTargetDay: by number, then by name, else earliest day', () => {
    assert.equal(T.pickTargetDay(DAYS, 0)!.day.id, 'd0');
    assert.equal(T.pickTargetDay(DAYS, 0)!.via, 'number');
    const named = [day('a', 'Day 1', null, '2026-11-01'), day('b', 'Day 0', null, '2026-10-31')];
    assert.deepEqual([T.pickTargetDay(named, 0)!.day.id, T.pickTargetDay(named, 0)!.via], ['b', 'name']);
    assert.deepEqual([T.pickTargetDay(named, 7)!.day.id, T.pickTargetDay(named, 7)!.via], ['b', 'earliest']);
    assert.equal(T.pickTargetDay([], 0), null);
});
test('clock target = earliest Start on Day 0 (v0.4.10: «*» = any status but cancelled; default = Option_List_1)', () => {
    const src = {kind: 'ok' as const, slots: [
        slot('late on day 0', '2026-10-31T18:00:00+02:00'),
        slot('first on day 0', '2026-10-31T10:30:00+02:00', 'טיוטה'),
        slot('day -1', '2026-10-30T09:00:00+02:00', 'משובץ'),
        slot('just before midnight 30.10 IL', '2026-10-30T23:30:00+02:00'),
        slot('day 1', '2026-11-01T08:00:00+02:00', 'משובץ'),
    ]};
    const t = T.computeTarget(src, NOW, {days: DAYS, targetDay: 0, clockStatuses: ['*']});
    assert.equal(t.phase, 'before');
    assert.equal(t.targetMs, ms('2026-10-31T10:30:00+02:00'));
    assert.equal(t.info!.slotName, 'first on day 0');
    assert.equal(t.info!.dayLabel, 'פתיחה');
    assert.equal(t.info!.statusFilter, 'כל סטטוס (חוץ מבוטל)');
    assert.equal(t.info!.onDay, 2);
});
test('status filter configurable; Day N configurable; v0.4.10: Israel Start date beats the link', () => {
    const src = {kind: 'ok' as const, slots: [
        slot('draft', '2026-10-31T09:00:00+02:00', 'טיוטה'),
        slot('sched', '2026-10-31T11:00:00+02:00', 'משובץ'),
        slot('linked to day 1 but dated 31.10', '2026-10-31T07:00:00+02:00', 'טיוטה', ['d1']),
        slot('day 1 first', '2026-11-01T08:00:00+02:00'),
    ]};
    assert.equal(T.computeTarget(src, NOW, {days: DAYS, targetDay: 0, clockStatuses: ['משובץ']}).info!.slotName, 'sched');
    assert.equal(T.computeTarget(src, NOW, {days: DAYS, targetDay: 0}).info!.slotName, 'sched'); // v0.4.10 default = משובץ
    assert.equal(T.computeTarget(src, NOW, {days: DAYS, targetDay: 0, clockStatuses: ['*']}).info!.slotName, 'linked to day 1 but dated 31.10');
    assert.equal(T.computeTarget(src, NOW, {days: DAYS, targetDay: 1, clockStatuses: ['*']}).info!.slotName, 'day 1 first');
    assert.equal(T.computeTarget(src, NOW, {days: DAYS, targetDay: 1, clockStatuses: ['*']}).info!.skipped.linkMismatch, 1);
    const none = T.computeTarget(src, NOW, {days: DAYS, targetDay: 0, clockStatuses: ['בוטל']});
    assert.equal(none.phase, 'fallback');
    assert.match(none.hint!, /אין משבצות ב«פתיחה»/);
});
test('no Festival Days table → the pre-v0.4.9 rule (Date_2 + Option_List_1) is unchanged', () => {
    const src = {kind: 'ok' as const, slots: [slot('draft', '2026-10-31T09:00:00+02:00', 'טיוטה'), slot('s', '2026-10-31T12:00:00+02:00', 'משובץ')]};
    const t = T.computeTarget(src, NOW, {firstDay: '2026-10-31'});
    assert.equal(t.targetMs, ms('2026-10-31T12:00:00+02:00'));
    assert.equal(t.info, undefined);
});
test('index: pane + Extension_Config wiring and the status-panel line', () => {
    const src = readFileSync(new URL('../frontend/index.tsx', import.meta.url), 'utf8');
    assert.match(src, /key: TARGET_DAY_KEY/);
    assert.match(src, /key: CLOCK_STATUS_KEY/);
    assert.match(src, /cfg\.raw\('Number_1'\)/);
    assert.match(src, /cfg\.options\('Option_List_4'\)/);
    assert.match(src, /שעון 1 · יום \$\{ti\.wanted\}/);
    assert.match(src, /readDays\(dayRecs, dayNumF, dayDateF, dayNoteF\)/);
    const cfg = readFileSync(new URL('../frontend/config.ts', import.meta.url), 'utf8');
    assert.match(cfg, /Number_1: 0,/);
    assert.match(cfg, /Option_List_4: '',/);
    assert.match(cfg, /Source_Table_7: 'Festival Days'/);
});
