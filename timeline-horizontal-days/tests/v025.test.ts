// v0.2.5 — per-column filters (funnel on each header), top-bar facet pills removed
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {colCount, colDims, dimValues, effectiveCF, normalizeCF, passCol, toggleColVal, type ColFilters, type Item} from '../frontend/logic/core';
import {CSS} from '../frontend/styles';

const it = (table: string, id: string, o: Partial<Item> = {}): Item =>
    ({table, id, name: id, s: 0, e: 60, date: null, dateEnd: null, sub: '', inherited: false, flag: null, hall: [], people: [], films: [], status: null, st: null, slots: [], ...o}) as Item;
const L = {hall: 'מיקום', person: 'אדם', film: 'סרט', status: 'סטטוס'};

test('dimValues: global facets per column + raw fields (f:<name>)', () => {
    const i = it('Slots_Events', 'a', {hall: ['ספיר א׳'], st: 'מאושר', fx: {Type: ['הקרנה']}});
    assert.deepEqual(dimValues(i, 'hall'), ['ספיר א׳']);
    assert.deepEqual(dimValues(i, 'status'), ['מאושר']);
    assert.deepEqual(dimValues(i, 'f:Type'), ['הקרנה']);
    assert.deepEqual(dimValues(i, 'f:Nope'), []);
});
test('passCol: a column filter narrows only its own table; any / none; dims AND', () => {
    const a = it('Slots_Events', 'a', {hall: ['A'], fx: {Type: ['הקרנה']}});
    const b = it('Slots_Events', 'b', {hall: ['B'], fx: {Type: ['פאנל']}});
    const s = it('Staffing', 's', {hall: ['B']});
    const cf: ColFilters = {Slots_Events: {hall: {op: 'any', vals: ['A']}}};
    assert.deepEqual([a, b, s].filter(i => passCol(i, cf)).map(i => i.id), ['a', 's']);
    assert.deepEqual([a, b].filter(i => passCol(i, {Slots_Events: {hall: {op: 'none', vals: ['A']}}})).map(i => i.id), ['b']);
    assert.deepEqual([a, b].filter(i => passCol(i, {Slots_Events: {hall: {op: 'any', vals: ['A', 'B']}, 'f:Type': {op: 'any', vals: ['פאנל']}}})).map(i => i.id), ['b']);
    assert.equal(passCol(a, {Slots_Events: {hall: {op: 'any', vals: []}}}), true);
});
test('icon count = picked values across dimensions', () => {
    assert.equal(colCount(undefined), 0);
    assert.equal(colCount({hall: {op: 'any', vals: ['A', 'B']}, 'f:Type': {op: 'none', vals: ['x']}}), 3);
});
test('right-pane default behind the menu; the user choice (even «נקה» = {}) wins, saved per user', () => {
    const def: ColFilters = {Slots_Events: {'f:Type': {op: 'none', vals: ['הקרנה']}}};
    assert.deepEqual(effectiveCF({}, def, ['Slots_Events']), def);
    assert.deepEqual(effectiveCF({Slots_Events: {}}, def, ['Slots_Events']), {});
    const u: ColFilters = {Slots_Events: {hall: {op: 'any', vals: ['A']}}};
    assert.deepEqual(effectiveCF(u, def, ['Slots_Events']), u);
    assert.deepEqual(effectiveCF({}, def, ['Staffing']), {});
});
test('normalizeCF drops unknown tables and bad shapes', () => {
    const n = normalizeCF({Slots_Events: {hall: {op: 'none', vals: ['A', 3]}, bad: 1}, Gone: {hall: {vals: ['x']}}, Staffing: {}}, ['Slots_Events', 'Staffing']);
    assert.deepEqual(n, {Slots_Events: {hall: {op: 'none', vals: ['A']}}, Staffing: {}});
    assert.deepEqual(normalizeCF(null, ['x']), {});
});
test('toggleColVal ticks / unticks, keeps the operator', () => {
    let c = toggleColVal(undefined, 'hall', 'A');
    assert.deepEqual(c, {hall: {op: 'any', vals: ['A']}});
    c = toggleColVal({hall: {op: 'none', vals: ['A']}}, 'hall', 'B');
    assert.deepEqual(c.hall, {op: 'none', vals: ['A', 'B']});
    assert.deepEqual(toggleColVal(c, 'hall', 'A').hall.vals, ['B']);
});
test('colDims: only dims with values; field that repeats a facet is dropped; counts respect the other dims', () => {
    const rows = [
        it('Slots_Events', 'a', {hall: ['A'], st: 'x', fx: {Location: ['A'], Type: ['הקרנה']}}),
        it('Slots_Events', 'b', {hall: ['B'], st: 'x', fx: {Location: ['B'], Type: ['פאנל']}}),
        it('Slots_Events', 'c', {hall: ['A'], st: 'y', fx: {Location: ['A'], Type: ['פאנל']}}),
    ];
    const d = colDims(rows, {'f:Type': {op: 'any', vals: ['פאנל']}}, L, () => true);
    assert.deepEqual(d.map(x => x.key), ['hall', 'status', 'f:Type']); // Location = hall → dropped; no person/film values
    assert.deepEqual(d.find(x => x.key === 'hall')?.values, [{v: 'A', n: 1}, {v: 'B', n: 1}]); // counts within Type=פאנל
    assert.deepEqual(d.find(x => x.key === 'f:Type')?.values, [{v: 'הקרנה', n: 1}, {v: 'פאנל', n: 2}]); // own dim ignored for counts
    assert.equal(d[0].label, 'מיקום');
    // a picked value stays listed even when no row has it any more
    assert.ok(colDims(rows, {hall: {op: 'any', vals: ['Z']}}, L, () => true)[0].values.some(v => v.v === 'Z' && v.n === 0));
});
test('top bar has no facet pills; header has the funnel; no dot', () => {
    const src = readFileSync('frontend/HTimeline.tsx', 'utf8');
    assert.ok(!/facetDd\(/.test(src), 'facet pills removed');
    assert.ok(/className=\{`cf2 /.test(src), 'funnel on the header');
    assert.ok(!/C\(t\)\}\} \/>\s*<span className="nmh">/.test(src), 'no dot in the header tab');
    assert.ok(/\.cols>div \.cf2\.act\{[^}]*background:var\(--sdk-grayDark1\)/.test(CSS), 'active funnel highlighted');
});
