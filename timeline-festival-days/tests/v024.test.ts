// v0.2.4 — cross-section window in the flow, title+table pills, table filter pills (saved per user)
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gridHeight, keepCentre, normalizeOff, toggleIn, winGridRows, winPass, winPills, type Item} from '../frontend/logic/core';
import {CSS} from '../frontend/styles';
import {TIMELINE_DEFAULTS} from '../frontend/config';
import {readFileSync} from 'node:fs';

const base = {table: 'Slots_Events', id: 'x', name: 'x', s: 0, e: 60, date: null, dateEnd: null, sub: '', inherited: false, flag: null, hall: [], people: [], films: [], status: null, st: null, slots: []};
const it = (table: string, id: string): Item => ({...base, table, id}) as Item;
const order = ['Slots_Events', 'Staffing', 'Lodging', 'Tasks'];

test('1: window in the flow — the cards area slides (0fr ↔ 1fr), header row fixed, never an overlay over the headers', () => {
    const v24 = CSS.slice(CSS.indexOf('v0.2.4: cross-section window IN the flow'));
    assert.match(v24, /\.tl \.win,\.tl\.nox \.win,\.tl\.wempty \.win\{display:flex;height:auto!important/);
    assert.match(v24, /\.win \.wslide\{display:grid;grid-template-rows:1fr;transition:grid-template-rows \.22s ease\}/);
    assert.match(v24, /\.tl\.nox \.win \.wslide\{grid-template-rows:0fr\}/);
    assert.match(v24, /position:static;z-index:auto/); // the cards grid no longer floats over the column headers
    assert.ok(!/position:absolute/.test(v24.split('table filter pills')[0]));
});

test('1: no jumping on scroll — card rows are fixed by Number_2, not by how many cards are in the slice', () => {
    assert.equal(winGridRows(6), 2);
    assert.equal(winGridRows(3), 1);
    assert.equal(winGridRows(7), 3);
    assert.equal(winGridRows(0), 1);
    // the zoom stays the same when the window opens/closes: viewport + window height is constant
    assert.equal(gridHeight(600, 102), gridHeight(660, 42));
});

test('1: the centre time is kept when the viewport height changes (toggle slide)', () => {
    assert.equal(keepCentre(1000, 600, 540), 1030); // window opened: viewport 60px shorter → scroll 30px further
    assert.equal(keepCentre(1030, 540, 600), 1000); // and back
    assert.equal(keepCentre(10, 500, 600), 0); // never negative
});

test('2/3: pills = table tag + title only (no time), 20% smaller text, less padding and gap', () => {
    const src = readFileSync('frontend/Timeline.tsx', 'utf8');
    const win = src.slice(src.indexOf('<div className="wslide">'), src.indexOf('column headers ----'));
    assert.ok(!/className="tm/.test(win) && !/<Rng/.test(win), 'no time in the window pills');
    assert.match(CSS, /\.wc \.nm\{font-size:13\.6px\}/); // 17 × 0.8
    assert.match(CSS, /\.wc \.tg\{font-size:9\.2px/); // 11.5 × 0.8
    assert.match(CSS, /\.wc\{gap:6px;padding:2px 7px/);
    assert.match(CSS, /gap:4px 6px/);
});

test('4: table pills list the shown tables with items in the slice (on and off), in column order, with counts', () => {
    const items = [it('Lodging', 'l1'), it('Lodging', 'l2'), it('Slots_Events', 's1'), it('Tasks', 't1'), it('Staffing', 'x1')];
    const shown = new Set(['Slots_Events', 'Lodging', 'Staffing']);
    const off = new Set(['Lodging']);
    assert.deepEqual(winPills(items, order, shown, off), [
        {t: 'Slots_Events', n: 1, on: true},
        {t: 'Staffing', n: 1, on: true},
        {t: 'Lodging', n: 2, on: false},
    ]);
    assert.deepEqual(winPills([], order, shown, off), []);
});

test('4: the window follows the timeline minus the tables switched off here; toggle + saved state', () => {
    const shown = new Set(['Slots_Events', 'Staffing']);
    const all = () => true;
    assert.equal(winPass(it('Slots_Events', 'a'), all, shown, new Set()), true);
    assert.equal(winPass(it('Slots_Events', 'a'), all, shown, new Set(['Slots_Events'])), false);
    assert.equal(winPass(it('Tasks', 'a'), all, shown, new Set()), false); // hidden on the timeline → not in the window
    assert.equal(winPass(it('Staffing', 'a'), () => false, shown, new Set()), false); // timeline filters apply
    assert.deepEqual([...toggleIn(new Set(['A']), 'B')].sort(), ['A', 'B']);
    assert.deepEqual([...toggleIn(new Set(['A']), 'A')], []);
    assert.deepEqual([...normalizeOff(['Staffing', 'Ghost', 3], order)], ['Staffing']);
    assert.deepEqual([...normalizeOff(undefined, order)], []);
    assert.equal(TIMELINE_DEFAULTS.Content_Text_9, 'טבלאות בחתך:');
});

test('4: pills use the SDK palette — on = table fill, off = struck gray', () => {
    assert.match(CSS, /\.wh \.wp1\.on\{background:var\(--f\)/);
    assert.match(CSS, /\.wh \.wp1\.off\{color:var\(--sdk-gray\);text-decoration:line-through\}/);
    const v24 = CSS.slice(CSS.indexOf('v0.2.4: cross-section window IN the flow'));
    assert.deepEqual([...new Set(v24.toLowerCase().match(/#[0-9a-f]{3,8}\b/g) ?? [])], ['#fff']);
});

// ---- v0.2.4b: per-table filters (right pane / Extension_Config Filter_N) + window value picks ----
import {parseOp, splitVals, passValues, filterKind, distinctVals, passPicked, parseRef, FILTER_SLOTS} from '../frontend/logic/core';

test('filters: operator parsing (enum value or Airtable-style words)', () => {
    for (const s of ['any', 'is any of', 'is', '', undefined]) assert.equal(parseOp(s), 'any');
    for (const s of ['none', 'is none of', 'is not', 'אינו']) assert.equal(parseOp(s), 'none');
});
test('filters: values string split on |, trimmed, empties dropped', () => {
    assert.deepEqual(splitVals(' הקרנה | פאנל||'), ['הקרנה', 'פאנל']);
    assert.deepEqual(splitVals(''), []);
});
test('filters: any / none / empty list = no filter', () => {
    assert.equal(passValues(['הקרנה'], 'any', ['הקרנה', 'פאנל']), true);
    assert.equal(passValues(['סדנה'], 'any', ['הקרנה']), false);
    assert.equal(passValues(['הקרנה'], 'none', ['הקרנה']), false);
    assert.equal(passValues(undefined, 'none', ['הקרנה']), true);
    assert.equal(passValues(undefined, 'any', []), true);
});
test('filters: checkbox list only for select / link fields', () => {
    assert.equal(filterKind('singleSelect'), 'select');
    assert.equal(filterKind('multipleSelects'), 'select');
    assert.equal(filterKind('multipleRecordLinks'), 'link');
    assert.equal(filterKind('singleLineText'), 'text');
    assert.deepEqual(distinctVals([['ב', 'א'], undefined, ['א']]), ['א', 'ב']);
});
test('window picks narrow the window only, per table; cleared = everything', () => {
    const i = {table: 'Slots_Events', fv: ['פאנל']};
    assert.equal(passPicked(i, {}), true);
    assert.equal(passPicked(i, {Slots_Events: []}), true);
    assert.equal(passPicked(i, {Slots_Events: ['הקרנה']}), false);
    assert.equal(passPicked(i, {Staffing: ['x']}), true);
});
test('window = timeline AND window filters (the owner 09:21)', () => {
    const it = (table: string, ok: boolean, fv: string[]) => ({table, ok, fv});
    const items = [it('A', true, ['x']), it('A', false, ['x']), it('A', true, ['y']), it('B', true, [])];
    const tl = (i: {ok: boolean}) => i.ok;
    const shown = new Set(['A', 'B']);
    const win = (off: Set<string>, pk: {[t: string]: string[]}) => items.filter(i => winPass(i as never, tl as never, shown, off) && passPicked(i, pk));
    assert.deepEqual(win(new Set(), {}), items.filter(tl)); // cleared → exactly the timeline
    assert.equal(win(new Set(), {A: ['x']}).length, 2);
    assert.equal(win(new Set(['B']), {A: ['x']}).length, 1);
    assert.ok(win(new Set(['B']), {A: ['x']}).every(tl)); // never more than the timeline
});
test('Extension_Config fallback: Filter_N = Table.Field, free slots only', () => {
    assert.deepEqual(parseRef('Slots_Events.Type'), {table: 'Slots_Events', field: 'Type'});
    assert.equal(parseRef('Slots_Events'), null);
    assert.equal(parseRef(''), null);
    assert.ok(!FILTER_SLOTS.includes(6) && !FILTER_SLOTS.includes(7) && !FILTER_SLOTS.includes(9));
});
