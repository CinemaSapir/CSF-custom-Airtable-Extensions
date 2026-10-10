// v0.2.0 (CUT 2) — a test per feature
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildDays, fmt, type Item} from '../frontend/logic/core';
import {Countdown, UNDO_MS, canEdit, dragRange, dropColumn, dropTarget, mapFields, moveColumn, moveRange, planFields, resizeEnd, slotChoices, unitOf, type FieldLike} from '../frontend/logic/edit';

const days = buildDays('2026-10-16', '2026-11-10', '2026-11-01');
const D = (date: string) => days.findIndex(d => d.date === date) * 1440;
const it = (o: Partial<Item>): Item => ({table: 'Slots_Events', id: Math.random().toString(36), name: 'x', s: null, e: null, date: null, dateEnd: null, sub: '', inherited: false, flag: null, hall: [], people: [], films: [], status: null, st: null, slots: [], ...o});

test('drag-create: snaps both ends to 15 min, any direction, min 15', () => {
    const d = D('2026-11-02');
    assert.deepEqual(dragRange(d + 13 * 60 + 4, d + 14 * 60 + 34), {s: d + 780, e: d + 870});
    assert.deepEqual(dragRange(d + 14 * 60 + 34, d + 13 * 60 + 4), {s: d + 780, e: d + 870}); // upward drag
    assert.deepEqual(dragRange(d + 600, d + 603), {s: d + 600, e: d + 615});
    assert.equal(fmt(dragRange(d + 7, d + 52).e), '00:45');
});
test('drag-create: field plan per table (UTC ISO across DST, dates, festival-day auto-link)', () => {
    const d = D('2026-11-02');
    const p = planFields('Slots_Events', {s: d + 780, e: d + 870, name: 'סדנה', dayId: 'recFD'}, days, 'create');
    assert.ok('fields' in p);
    if ('fields' in p) assert.deepEqual(p.fields, {name: 'סדנה', festivalDays: [{id: 'recFD'}], start: '2026-11-02T11:00:00.000Z', end: '2026-11-02T12:30:00.000Z'});
    const pre = planFields('Slots_Events', {s: D('2026-10-21') + 660, e: D('2026-10-21') + 720}, days, 'create'); // UTC+3 before 25.10
    if ('fields' in pre) assert.equal(pre.fields.start, '2026-10-21T08:00:00.000Z');
    const task = planFields('Social Posts', {s: d + 600, e: d + 660}, days, 'create'); // v0.2.11: Tasks removed
    if ('fields' in task) assert.deepEqual(task.fields, {date: '2026-11-02'});
    const lodge = planFields('Lodging', {s: d + 900, e: d + 1000}, days, 'create');
    if ('fields' in lodge) assert.deepEqual(lodge.fields, {start: '2026-11-02', end: '2026-11-03'});
});
test('drag-create: borrowed-time tables need a slot; slot picker offers overlapping slots of that day first', () => {
    const d = D('2026-11-02');
    assert.deepEqual(planFields('Staffing', {s: d + 600, e: d + 660}, days, 'create'), {error: 'בחרו משבצת — הזמן נלקח ממנה'});
    const ok = planFields('Staffing', {s: d + 600, e: d + 660, slotIds: ['recS']}, days, 'create');
    assert.ok('fields' in ok && ok.needsSlot && JSON.stringify(ok.fields) === JSON.stringify({slots: [{id: 'recS'}]}));
    const a = it({id: 'a', s: d + 900, e: d + 960}),
        b = it({id: 'b', s: d + 600, e: d + 700}),
        c = it({id: 'c', s: d + 1440 + 600, e: d + 1440 + 660}),
        x = it({id: 'x', table: 'Staffing', s: d + 610, e: d + 620});
    assert.deepEqual(slotChoices([a, b, c, x], d + 620, d + 680).map(i => i.id), ['b', 'a']);
});
test('move / resize: snapped deltas, min duration, lodging moves in whole days', () => {
    assert.deepEqual(moveRange(960, 1035, 58), {s: 1020, e: 1095});
    assert.deepEqual(moveRange(960, 1035, -22), {s: 945, e: 1020});
    assert.deepEqual(resizeEnd(960, 1062), {s: 960, e: 1065});
    assert.deepEqual(resizeEnd(960, 900), {s: 960, e: 975}); // never shorter than 15
    assert.equal(unitOf('Lodging'), 1440);
    assert.deepEqual(moveRange(900, 3540, 1000, unitOf('Lodging')), {s: 900 + 1440, e: 3540 + 1440});
    const mv = planFields('Slots_Events', {s: D('2026-11-02') + 1020, e: D('2026-11-02') + 1095}, days, 'move');
    if ('fields' in mv) assert.deepEqual(mv.fields, {start: '2026-11-02T15:00:00.000Z', end: '2026-11-02T16:15:00.000Z'});
});
test('move / resize: what each table allows, with the reason', () => {
    assert.equal(canEdit('Slots_Events', 'move').ok, true);
    assert.equal(canEdit('Slots_Events', 'resize').ok, true);
    const st = canEdit('Staffing', 'move');
    assert.ok(!st.ok && /המשבצת/.test(st.reason));
    assert.equal(canEdit('Staffing', 'create').ok, true);
    // v0.2.11: Approvals / Tasks removed; date-only = Social Posts
    const sp = canEdit('Social Posts', 'move');
    assert.ok(!sp.ok && /תאריך בלבד/.test(sp.reason));
    assert.equal(canEdit('Tasks', 'move').ok, false);
    assert.ok('error' in planFields('Staffing', {s: 0, e: 60}, days, 'move'));
});
test('undo toast: 6 s, pauses on hover, resumes', () => {
    assert.equal(UNDO_MS, 6000);
    const c = new Countdown(UNDO_MS, 0);
    assert.equal(c.remaining(2000), 4000);
    c.pause(2000);
    assert.equal(c.paused, true);
    assert.equal(c.remaining(60000), 4000); // hovering: frozen
    c.resume(60000);
    assert.equal(c.expired(63999), false);
    assert.equal(c.expired(64000), true);
});
test('permissions/fields before every write: missing or computed fields give a reason, optional ones are skipped', () => {
    const F: FieldLike[] = [
        {id: 'f1', name: 'Name', type: 'formula', isComputed: true},
        {id: 'f2', name: 'Slots_Events', type: 'multipleRecordLinks', isComputed: false},
        {id: 'f3', name: 'Start', type: 'dateTime', isComputed: false},
        {id: 'f4', name: 'end', type: 'date', isComputed: false},
    ];
    const st = mapFields('Staffing', F, 'f1', {name: 'x', slots: [{id: 'r'}]});
    assert.ok('map' in st);
    if ('map' in st) {
        assert.deepEqual(st.map, {f2: [{id: 'r'}]});
        assert.deepEqual(st.skipped, ['name']); // formula primary → name not written
    }
    const sl = mapFields('Slots_Events', F, 'f1', {start: '2026-11-02T11:00:00.000Z', end: '2026-11-02T23:30:00.000Z'});
    if ('map' in sl) assert.deepEqual(sl.map, {f3: '2026-11-02T11:00:00.000Z', f4: '2026-11-03'}); // loose «end», date-only → Israel date
    assert.deepEqual(mapFields('Lodging', F, 'f1', {start: '2026-11-02'}), {error: 'חסר השדה «Check-in date» בטבלה (או שלא הופעל באלמנט)'});
    const comp = mapFields('Slots_Events', [{id: 'f9', name: 'Start', type: 'formula', isComputed: true}], 'f9', {start: 'x'});
    assert.ok('error' in comp && /מחושב/.test(comp.error));
});
test('column reorder: menu top/up/down/bottom + drag ⠿ drop target (RTL)', () => {
    const o = ['A', 'B', 'C', 'D'];
    assert.deepEqual(moveColumn(o, 'C', 'top'), ['C', 'A', 'B', 'D']);
    assert.deepEqual(moveColumn(o, 'C', 'up'), ['A', 'C', 'B', 'D']);
    assert.deepEqual(moveColumn(o, 'B', 'down'), ['A', 'C', 'B', 'D']);
    assert.deepEqual(moveColumn(o, 'A', 'bottom'), ['B', 'C', 'D', 'A']);
    assert.deepEqual(moveColumn(o, 'A', 'up'), o);
    assert.deepEqual(moveColumn(o, 'Z', 'top'), o);
    assert.deepEqual(dropColumn(o, 'D', 'A'), ['D', 'A', 'B', 'C']);
    assert.deepEqual(dropColumn(o, 'A', null), ['B', 'C', 'D', 'A']);
    // RTL header: A is rightmost (x 300–400), B 200–300, C 100–200
    const bx = [
        {t: 'A', left: 300, right: 400},
        {t: 'B', left: 200, right: 300},
        {t: 'C', left: 100, right: 200},
    ];
    assert.equal(dropTarget(bx, 390), 'A'); // right half of A → before A
    assert.equal(dropTarget(bx, 310), 'B'); // left half of A → before B
    assert.equal(dropTarget(bx, 110), null); // left half of the last → at the end
    assert.equal(dropTarget(bx, 50), null);
});
