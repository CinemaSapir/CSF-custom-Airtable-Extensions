// v0.4.10 candidate (the owner 14:45: PROD v0.4.9 counts to the wrong reference). Real DEMO snapshot, not a hand-made fixture.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../frontend/festivalTarget.ts';

const FX = JSON.parse(readFileSync(new URL('./fixtures/demo-days-slots-2026-10-10.json', import.meta.url), 'utf8'));
const days = FX.days.map((d: any) => ({id: d.id, name: d.name, dayNum: null, dateIso: d.date, note: d.note}));
const slots = FX.slots.map((s: any) => ({name: s.name, startMs: T.parseDateMs(s.start), endMs: T.parseDateMs(s.end), status: s.status, dayIds: s.days}));
const NOW = Date.parse('2026-10-10T14:50:00+03:00');
const OPTS = {fallbackMs: Date.parse('2026-10-24T17:00:00.000Z'), firstDay: '2026-10-31', statuses: ['משובץ']};
const R = (o: object) => T.computeTarget({kind: 'ok', slots}, NOW, {...OPTS, days, ...o});

test('DEMO root cause: no day-number field and no «Day 0» in any Name → v0.4.9 fell to the earliest day (16.10, no slots)', () => {
    assert.equal(days.filter((d: any) => T.dayNumberInName(d.name) !== null).length, 0);
    const v049 = T.pickTargetDay(days.map((d: any) => ({...d, note: ''})), 0, null); // v0.4.9 had no Notes and no Date_2 step
    assert.equal(v049!.via, 'earliest');
    assert.equal(v049!.day.dateIso, '2026-10-16');
});
test('signed day numbers in Notes: «יום -15» = -15, «יום +8» = 8, «יום 0, ערב הפסטיבל» = 0; «day-3» still 3', () => {
    assert.equal(T.dayNumberInName('DEMO · הכנות · יום -15'), -15);
    assert.equal(T.dayNumberInName('DEMO · פירוק וסיכום · יום +8'), 8);
    assert.equal(T.dayNumberInName('DEMO · הכנות · יום 0, ערב הפסטיבל'), 0);
    assert.equal(T.dayNumberInName('day-3'), 3);
});
test('Day 0 on DEMO = 31.10 (by Notes; by Date_2 when Notes are hidden) → first משובץ slot 31.10 16:00', () => {
    const t = R({targetDay: 0});
    assert.equal(t.phase, 'before');
    assert.equal(t.info!.dayDate, '2026-10-31');
    assert.equal(t.info!.dayVia, 'note');
    assert.equal(t.info!.slotName, 'חזרה גנרלית לטקס הפתיחה');
    assert.equal(t.targetMs, Date.parse('2026-10-31T16:00:00+02:00'));
    assert.equal(t.info!.statusFilter, 'משובץ');
    const noNotes = T.computeTarget({kind: 'ok', slots}, NOW, {...OPTS, days: days.map((d: any) => ({...d, note: ''})), targetDay: 0});
    assert.equal(noNotes.info!.dayVia, 'date');
    assert.equal(noNotes.targetMs, t.targetMs);
    // same as the owner's original 9.10 rule (first משובץ slot from 31.10)
    assert.equal(T.computeTarget({kind: 'ok', slots}, NOW, OPTS).targetMs, t.targetMs);
});
test('Day 1 = 1.11: first משובץ = 10:00 workshop; runners-up listed; מתוכנן skipped and counted', () => {
    const t = R({targetDay: 1});
    assert.equal(t.info!.slotName, 'סדנת תסריט לנוער');
    assert.deepEqual(t.info!.runnersUp.map(x => x.name), ['הקרנה: בין הקווים', 'קבלת פנים לאורחי הפתיחה', 'טקס פתיחה']);
    assert.equal(t.info!.skipped.status, 3);
});
test('cancelled never counts (even with «*»); all-day 00:00 slots are skipped', () => {
    const extra = [
        {name: 'cancelled early', startMs: Date.parse('2026-10-31T08:00:00+02:00'), endMs: null, status: 'בוטל', dayIds: []},
        {name: 'all day', startMs: Date.parse('2026-10-31T00:00:00+02:00'), endMs: null, status: 'משובץ', dayIds: []},
    ];
    const t = T.computeTarget({kind: 'ok', slots: [...slots, ...extra]}, NOW, {...OPTS, days, targetDay: 0, clockStatuses: ['*']});
    assert.equal(t.info!.slotName, 'חזרה גנרלית לטקס הפתיחה');
    assert.equal(t.info!.skipped.cancelled, 1);
    assert.equal(t.info!.skipped.allDay, 1);
});
test('index: status panel prints every step (day + why, tries, filter + skips, slot + start + status, runners-up)', () => {
    const src = readFileSync(new URL('../frontend/index.tsx', import.meta.url), 'utf8');
    for (const n of [1, 2, 3, 4, 5]) assert.match(src, new RegExp(`שעון ${n} · `));
    assert.match(src, /DAY_NOTE_ALIASES/);
});
