// v0.2.1 — resizable column width + vertical scrolling
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COL_MAX, COL_MIN, WIN_REF_H, colWidths, gridHeight, normalizeWidths, resizeWidth, wheelPx, type ColState} from '../frontend/logic/core';

const st = (o: Partial<ColState>): ColState => ({collapsed: false, manual: false, auto: false, allDayOnly: false, count: 1, grow: 1, lanes: 1, ...o});

test('width: RTL edge drag — left widens, right narrows, min 140, max cap', () => {
    assert.equal(resizeWidth(200, -60), 260);
    assert.equal(resizeWidth(200, 30), 170);
    assert.equal(resizeWidth(200, 500), COL_MIN);
    assert.equal(resizeWidth(200, -5000), COL_MAX);
    assert.equal(resizeWidth(200.4, -0.3), 201);
});
test('width: a user width is honoured, the others shrink to share the rest', () => {
    const cs = {A: st({lanes: 2}), B: st({}), C: st({}), D: st({collapsed: true})};
    const auto = colWidths(['A', 'B', 'C', 'D'], cs, 1000, {strip: 30});
    const wide = colWidths(['A', 'B', 'C', 'D'], cs, 1000, {strip: 30, fixed: {A: auto.w.A + 120}});
    assert.equal(wide.w.A, auto.w.A + 120);
    assert.ok(wide.w.B < auto.w.B && wide.w.B >= COL_MIN);
    assert.equal(wide.w.D, 30); // strips untouched
    assert.ok(wide.total <= 1000); // still fits → no sideways scroll
});
test('width: when the others cannot go below 140, the total overflows (grid scrolls sideways)', () => {
    const cs = {A: st({}), B: st({}), C: st({})};
    const r = colWidths(['A', 'B', 'C'], cs, 700, {fixed: {A: 600}});
    assert.equal(r.w.A, 600);
    assert.equal(r.w.B, COL_MIN);
    assert.equal(r.w.C, COL_MIN);
    assert.ok(r.total > 700);
});
test('width: fixed below the minimum is lifted to 140; a collapsed column stays a strip; all-day-only honours the user width', () => {
    const cs = {A: st({}), B: st({collapsed: true}), C: st({allDayOnly: true})};
    const r = colWidths(['A', 'B', 'C'], cs, 1000, {strip: 30, fixed: {A: 50, B: 400, C: 300}});
    assert.ok(r.w.A >= COL_MIN);
    assert.equal(r.w.B, 30);
    assert.equal(r.w.C, 300);
});
test('width: saved per-user widths are sanitised (unknown tables, junk, clamps)', () => {
    assert.deepEqual(normalizeWidths({A: 300, Z: 400, B: 'x', C: 20, D: 99999}, ['A', 'B', 'C', 'D']), {A: 300, C: COL_MIN, D: COL_MAX});
    assert.deepEqual(normalizeWidths(null, ['A']), {});
    assert.deepEqual(normalizeWidths('junk', ['A']), {});
});
test('scroll: wheel deltas in px / lines / pages', () => {
    assert.equal(wheelPx(100, 0, 700), 100);
    assert.equal(wheelPx(3, 1, 700), 48);
    assert.equal(wheelPx(-1, 2, 700), -700);
});
test('scroll: the zoom height ignores the cross-section window growing or shrinking', () => {
    // grid+window share a fixed area; whatever the window height, the reference height is the same
    const area = 700;
    const a = gridHeight(area - 88, 88),
        b = gridHeight(area - 40, 40),
        c = gridHeight(area - 160, 160);
    assert.equal(a, b);
    assert.equal(b, c);
    assert.equal(a, area - WIN_REF_H);
    assert.equal(gridHeight(700, 0), 700); // window switched off → full height
    assert.equal(gridHeight(10, 0), 120); // floor
});
