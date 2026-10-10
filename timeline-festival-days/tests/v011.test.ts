// v0.1.1 — Critic REVISE fixes
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AD_W, COL_MIN, LANE_MIN, bandSlice, buildDays, colWidths, columnStates, windowRows, type ColState, type Item} from '../frontend/logic/core';

const days = buildDays('2026-10-16', '2026-11-10', '2026-11-01');
const it = (o: Partial<Item>): Item => ({table: 'Slots_Events', id: Math.random().toString(36), name: 'x', s: null, e: null, date: null, dateEnd: null, sub: '', inherited: false, flag: null, hall: [], people: [], films: [], status: null, st: null, slots: [], ...o});
const st = (o: Partial<ColState>): ColState => ({collapsed: false, manual: false, auto: false, allDayOnly: false, count: 1, grow: 1, lanes: 1, ...o});

test('fix 1: 0-item columns go to strips, all-day-only columns get a fixed narrow width, busy ones share the rest', () => {
    const k = 17;
    const T = ['Slots_Events', 'Staffing', 'Tasks', 'Social Posts', 'Booking Resources'];
    const timed = [it({s: k * 1440 + 600, e: k * 1440 + 700}), it({table: 'Staffing', s: k * 1440 + 600, e: k * 1440 + 700})];
    const allday = [it({table: 'Tasks', date: '2026-11-02'})];
    const cs = columnStates(k, days, T, timed, allday, {closed: new Set(), forceOpen: new Set(), collapseEmpty: true});
    assert.equal(cs['Social Posts'].collapsed, true);
    assert.equal(cs['Booking Resources'].collapsed, true);
    assert.equal(cs.Tasks.allDayOnly, true);
    const {w, total} = colWidths(T, cs, 1000, {strip: 30});
    assert.equal(w['Social Posts'], 30);
    assert.equal(w['Booking Resources'], 30);
    assert.equal(w.Tasks, AD_W);
    assert.ok(w.Slots_Events > 300 && Math.abs(w.Slots_Events - w.Staffing) <= 1);
    assert.ok(total <= 1000);
    // toggle OFF → nothing auto-collapses
    const off = columnStates(k, days, T, timed, allday, {closed: new Set(), forceOpen: new Set(), collapseEmpty: false});
    assert.equal(Object.values(off).some(c => c.collapsed), false);
});
test('fix 2: min column width 140px; overlapping cards get lane width before squeezing; strips never pushed off-screen', () => {
    const cs = {A: st({lanes: 3, grow: 3}), B: st({}), C: st({collapsed: true})};
    const roomy = colWidths(['A', 'B', 'C'], cs, 1400);
    assert.ok(roomy.w.A >= 3 * LANE_MIN);
    assert.ok(roomy.w.B >= COL_MIN);
    const tight = colWidths(['A', 'B', 'C'], cs, 58 + 30 + 300);
    assert.equal(tight.w.B, COL_MIN); // timed column floor
    assert.ok(tight.w.A >= COL_MIN && tight.w.A < 3 * LANE_MIN); // lane extra shrinks first
    assert.ok(tight.total <= 58 + 30 + 300 + 1);
    const tiny = colWidths(['A', 'B', 'C'], cs, 200);
    assert.equal(tiny.w.A, COL_MIN); // never below 140 (canvas scrolls sideways instead)
    assert.equal(tiny.w.B, COL_MIN);
});
test('fix 3: magnifier only on the slice of a card inside the band', () => {
    assert.deepEqual(bandSlice(100, 500, 300, 400), {top: 200, height: 100}); // long card: only the middle part
    assert.deepEqual(bandSlice(350, 200, 300, 400), {top: 0, height: 50});
    assert.equal(bandSlice(500, 100, 300, 400), null); // outside
    assert.equal(bandSlice(398, 100, 300, 400), null); // < 4px sliver
});
test('fix 4: the cross-section window fits its content, minimum 1 row', () => {
    assert.equal(windowRows(0), 1);
    assert.equal(windowRows(2), 1);
    assert.equal(windowRows(3), 1);
    assert.equal(windowRows(4), 2);
    assert.equal(windowRows(6), 2);
});
