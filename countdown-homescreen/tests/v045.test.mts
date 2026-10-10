// v0.4.5 — the owner 10:29: panel «סרטים · Accepted to CSF is יוצג בפסטיבל · 67 / 303» but the pill showed another number.
// Cause: the pill ran the phase-aware "films not yet scheduled" math over the 67 filtered films; the panel showed the
// filter match count. Now ONE PillResult feeds both. Plus: tickets = SUM Invitations.«Tickets Given», reserved sold pill.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {computeCounts, type CountSlot, type LinkedRec} from '../frontend/counts.ts';
import {cellNumber, computePill, parseAggList, parseAggMode, pickAgg} from '../frontend/aggregate.ts';
import {buildPills, type PillPrep} from '../frontend/aggregate.ts';
import {applyFilters, evaluateFilter, type FilterSpec} from '../frontend/filters.ts';
import {formatCount} from '../frontend/counts.ts';
import {STATUS_TOGGLE_LABEL, statusToggleProperty} from '../frontend/statusCore.ts';

const NAMES = {films: ['films', 'סרטים'], events: ['events', 'אירועים'], projects: ['projects'], invitations: ['invitations', 'הזמנות'], tickets: ['tickets', 'כרטיסי הזמנה'], sold: ['sold', 'כרטיסים שנמכרו']};

// 303 films, 67 «יוצג בפסטיבל»; 50 of those already have a משובץ slot
const films = Array.from({length: 303}, (_, i) => ({id: `f${i}`, accepted: i < 67 ? 'יוצג בפסטיבל' : 'נדחה', slotIds: i < 50 ? [`s${i}`] : []}));
const slots: CountSlot[] = Array.from({length: 50}, (_, i) => ({id: `s${i}`, startMs: Date.parse('2026-10-31T10:00:00Z'), scheduled: true, cancelled: false, filmIds: [`f${i}`], projectIds: []}));
const spec: FilterSpec = {fieldName: 'Accepted to CSF', op: 'is', values: ['יוצג בפסטיבל'], source: 'pane'};
const filmFilter = applyFilters(films, [spec], () => 'Accepted to CSF', (r, _f) => ({raw: {name: r.accepted}, text: r.accepted}), 'Films');

test('REPRO: v0.4.4 pill path ≠ panel (67) — the phase math over the filtered films', () => {
    assert.equal(filmFilter.pass!.size, 67);
    const kept: LinkedRec[] = films.filter(f => filmFilter.pass!.has(f.id)).map(f => ({id: f.id, slotIds: f.slotIds}));
    const old = computeCounts({slots, hasStart: true, films: kept, filmsLinked: true, projects: null, projectsLinked: false, invitations: null, tickets: null}, 'before', Date.parse('2026-10-10T08:00:00Z'));
    assert.equal(old.films, 17); // what PROD showed: films still without a משובץ slot — not 67
});

const prep = (key: string, extra: Partial<PillPrep['calc']> = {}, p: Partial<PillPrep> = {}): PillPrep => ({
    key,
    label: key,
    calc: {ids: films.map(f => f.id), pass: filmFilter.pass, agg: {mode: 'count', field: '', via: 'ברירת מחדל'}, sumFieldOk: false, ...extra},
    filter: {table: 'Films', field: 'Accepted to CSF', via: 'חלונית', op: 'שווה ל (is)', values: ['יוצג בפסטיבל']},
    filterTitle: null,
    hint: null,
    ...p,
});

test('FIX: films pill value == panel matched == 67 (one computed result)', () => {
    const [b] = buildPills([prep('films')], {films: 17});
    assert.equal(b.value, 67);
    assert.equal(b.row.matched, 67);
    assert.equal(b.row.total, 303);
    assert.equal(b.value, b.row.matched);
    assert.ok(b.row.extra!.startsWith('67 '));
});

test('every pill, every mode: pill value == value shown in the panel row; count mode == matched', () => {
    const inv = Array.from({length: 10}, (_, i) => ({id: `i${i}`, given: i % 3 === 0 ? null : i}));
    const numbers = new Map(inv.map(x => [x.id, x.given]));
    const passInv = new Set(inv.filter((_, i) => i < 6).map(x => x.id));
    const preps: PillPrep[] = [
        prep('films'),
        prep('events', {ids: ['a', 'b', 'c'], pass: null}),
        prep('projects', {ids: ['p1', 'p2'], pass: new Set(['p1']), agg: {mode: 'remaining', field: '', via: 'חלונית'}}),
        prep('invitations', {ids: inv.map(x => x.id), pass: passInv}),
        prep('tickets', {ids: inv.map(x => x.id), pass: passInv, agg: {mode: 'sum', field: 'Tickets Given', via: 'ברירת מחדל'}, sumFieldOk: true, numbers}),
        prep('sold', {ids: null, pass: null}, {reserved: true}),
    ];
    const built = buildPills(preps, {films: 17, events: 1, projects: 1});
    for (const b of built) {
        assert.ok(b.row.extra!.startsWith(b.key === 'sold' ? '—' : formatCount(b.value)), `${b.key}: ${b.row.extra} vs ${b.value}`);
        if (b.result.mode === 'count') assert.equal(b.value, b.row.matched, b.key);
    }
    const by = Object.fromEntries(built.map(b => [b.key, b]));
    assert.equal(by.events.value, 3);
    assert.equal(by.invitations.value, 6);
    assert.equal(by.tickets.value, 1 + 2 + 4 + 5); // i0,i3 empty; filter keeps i0–i5
    assert.equal(by.tickets.row.matched, 6);
    assert.match(by.tickets.row.extra!, /^12 · סכום Tickets Given \(2 ריקות\)$/);
    assert.equal(by.projects.value, 1);
    assert.equal(by.sold.value, null);
    assert.equal(by.sold.hint, null);
});

test('tickets: sum field missing → «—» + hint (not a silent 0)', () => {
    const r = computePill({ids: ['a'], pass: null, agg: {mode: 'sum', field: 'Tickets Given', via: 'ברירת מחדל'}, sumFieldOk: false});
    assert.equal(r.value, null);
    assert.match(r.problem!, /Tickets Given/);
});

test('aggregation config: right pane → Option_List_2 → code default', () => {
    const {byPill, bad} = parseAggList('tickets = sum: Tickets Given\nסרטים = count\nevents: remaining\nnonsense\nsold = sum: Sales.Qty', NAMES);
    assert.deepEqual(bad, [4]);
    assert.deepEqual(byPill.get('tickets'), {mode: 'sum', field: 'Tickets Given', line: 1});
    assert.equal(byPill.get('films')!.mode, 'count');
    assert.equal(byPill.get('events')!.mode, 'remaining');
    assert.equal(byPill.get('sold')!.field, 'Sales.Qty');
    const d = {mode: 'sum' as const, field: 'Tickets Given'};
    assert.deepEqual(pickAgg({mode: 'auto', field: ''}, undefined, 'Tickets Given', d, false), {mode: 'sum', field: 'Tickets Given', via: 'ברירת מחדל'});
    assert.equal(pickAgg({mode: 'count', field: ''}, byPill.get('tickets'), '', d, false).mode, 'count');
    assert.equal(pickAgg({mode: 'auto', field: ''}, {mode: 'sum', field: 'Guests', line: 2}, 'X', d, false).field, 'Guests');
    assert.equal(pickAgg({mode: 'sum', field: 'Picked'}, undefined, 'X', d, false).field, 'Picked');
    assert.equal(pickAgg({mode: 'remaining', field: ''}, undefined, '', {mode: 'count', field: ''}, false).mode, 'count');
    assert.equal(parseAggMode('סכום שדה מספרי (sum)'), 'sum');
    assert.equal(parseAggMode('auto'), null);
});

test('cellNumber: number, lookup array, rollup text, junk', () => {
    assert.equal(cellNumber(4), 4);
    assert.equal(cellNumber([2, 3]), 5);
    assert.equal(cellNumber([{value: 2}]), 2);
    assert.equal(cellNumber(null, ''), null);
    assert.equal(cellNumber('1,200'), 1200);
    assert.equal(cellNumber('abc'), null);
    assert.equal(evaluateFilter({name: 'x'}, {op: 'none', values: []}), true);
});

test('status toggle: exact label, default OFF; index.tsx wires it and feeds the panel from the pill objects', () => {
    assert.equal(STATUS_TOGGLE_LABEL, 'show מצב חיבור · Extension_Config');
    assert.equal(statusToggleProperty().defaultValue, false);
    const src = readFileSync(new URL('../frontend/index.tsx', import.meta.url), 'utf8');
    assert.match(src, /statusToggleProperty\(\)/);
    assert.match(src, /filters=\{pills\.map\(p => p\.row\)\}/);
    assert.doesNotMatch(src, /countPass\(/);
    const view = readFileSync(new URL('../frontend/view.tsx', import.meta.url), 'utf8');
    assert.doesNotMatch(view, /DiagToggle|editMode/);
});

test('obsolete Content_Text_1 «כרטיסים שנמכרו» is mapped to «כרטיסי הזמנה» (tickets pill = invitation tickets)', () => {
    const src = readFileSync(new URL('../frontend/index.tsx', import.meta.url), 'utf8');
    assert.match(src, /OLD_TICKETS_LABEL = 'כרטיסים שנמכרו'/);
    const cfg = readFileSync(new URL('../frontend/config.ts', import.meta.url), 'utf8');
    assert.match(cfg, /Content_Text_1: 'כרטיסי הזמנה'/);
    assert.match(cfg, /Content_Text_10: 'כרטיסים שנמכרו'/);
    assert.match(cfg, /Source_Table_1: 'Invitations'/);
    assert.match(cfg, /Source_Field_1: 'Invitations.Tickets Given'/);
});
