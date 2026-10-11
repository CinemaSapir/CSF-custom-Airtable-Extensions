// horizontal v0.1.2 (the owner 05:20 + item 10 05:22): window scroll, left strip, defaults, smaller cards, colours, thin rows, day titles, filters
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LANE, LANE_MIN, ROW_MIN, TEXT_MIN, barH, dayPillU, resizeLane, rowLayout} from '../frontend/logic/hcore';
import {buildDays, type Item} from '../frontend/logic/core';
import {defaultFilterFields, hColCount, hColDims, hEffectiveCF, hPassCol, hSetOp, hToggleVal, parseFilterCell, parseFilterLine, parseHOp, passH} from '../frontend/logic/hfilter';
import {TIMELINE_DEFAULTS} from '../frontend/config';
import {HCSS} from '../frontend/hstyles';
import {PERSIST_V, WIN_COLS, persistUpgrade} from '../frontend/HTimeline';
const src = readFileSync('frontend/HTimeline.tsx', 'utf8');
const idx = readFileSync('frontend/index.tsx', 'utf8');
const days = buildDays('2026-10-30', '2026-11-03', '2026-11-01');
const it = (o: Partial<Item>): Item => ({id: 'r', table: 'Slots_Events', name: 'n', s: 600, e: 660, hall: [], people: [], films: [], sub: '', st: null, flag: null, fx: {}, ...o}) as unknown as Item;

test('#1 wheel over the window scrolls its cards (never the timeline); every card rendered', () => {
    assert.match(src, /const win = el\.closest\('\.win'\)/);
    assert.match(src, /g\.scrollTop \+= wheelPx/);
    assert.match(src, /hits\.slice\(0, WIN_MAX\)/);
    assert.match(HCSS, /\.wbody>\.wg\{[^}]*overflow-y:auto;[^}]*overscroll-behavior:contain/);
});
test('#2 window ✕ / 👁 → vertical tabs at the window\'s left, click restores', () => {
    assert.match(src, /className="wstrip"/);
    assert.match(src, /className="wst tbl"/);
    assert.match(src, /className="wst rec"[^]*onClick=\{\(\) => unhideRec\(i\.id\)\}/);
    assert.match(HCSS, /\.htl \.wst \.wsl\{writing-mode:vertical-rl/);
});
test('#3/#5/#6 defaults: 12 h, all tables ON, collapse empty tables + hours; old saved view dropped once', () => {
    assert.equal(TIMELINE_DEFAULTS.Dropdown_Default_3, '720');
    assert.equal(TIMELINE_DEFAULTS.Toggle_1, true);
    assert.equal(TIMELINE_DEFAULTS.Toggle_2, true);
    assert.match(idx, /pickRes\(steps, cfg\.raw\('Dropdown_Default_3'\), 720\)/);
    const old = {res: 360, shown: ['Slots_Events'], closed: ['Staffing'], wOff: ['Lodging'], collapse: false, compress: false, order: ['Staffing'], laneH: {Staffing: 10}};
    const up = persistUpgrade(old);
    assert.equal(up.v, PERSIST_V);
    assert.equal(up.res, undefined);
    assert.equal(up.shown, undefined);
    assert.equal(up.closed, undefined);
    assert.equal(up.collapse, undefined);
    assert.deepEqual(up.order, ['Staffing']);
    assert.deepEqual(up.laneH, {Staffing: 10});
    const cur = {v: PERSIST_V, res: 180};
    assert.equal(persistUpgrade(cur), cur);
});
test('#4 cards ≥30% smaller (height 40→28), 8 per row (v0.1.3: the name font is back to 12.5px — see v013)', () => {
    assert.equal(WIN_COLS, 8);
    assert.match(HCSS, /\.htl\{--wcH:28px\}/);
    assert.ok(28 / 40 <= 0.7);
});
test('#7 vertical tokens: 4px start border + 1px hairline, hatch 4/8, lodging 14.9% + 2px, lens tint + redLight1', () => {
    assert.match(HCSS, /\.htl \.hb\{border:1px solid rgba\(0,0,0,\.06\);border-right:4px solid/);
    assert.match(HCSS, /rgba\(255,255,255,\.55\) 0 4px,transparent 4px 8px/);
    assert.match(HCSS, /\.htl \.hlc\{background:color-mix\(in srgb,var\(--sdk-purpleDark1\) 14\.9%,transparent\);border:2px solid/);
    assert.match(HCSS, /\.htl \.hlens\{background:var\(--f\);box-shadow:inset 0 0 0 1px var\(--sdk-redLight1\)/);
    assert.ok(!/#(?!fff\b)[0-9a-f]{3,6}\b/i.test(HCSS));
});
test('#8 rows shrink to a few px; text never scales — hidden below one line', () => {
    assert.equal(LANE_MIN, 4);
    assert.equal(resizeLane(LANE, -999, 1), 4);
    const u = (m: number) => m;
    const items = [it({id: 'a'}), it({id: 'b', s: 620, e: 700})];
    const r = rowLayout('Staffing', items, days, u, {laneH: 6});
    assert.ok(r.h < ROW_MIN && r.h >= 8, String(r.h));
    assert.equal(rowLayout('Staffing', [], days, u).h, ROW_MIN);
    assert.equal(barH(26), 22);
    assert.equal(barH(6), 5);
    assert.equal(barH(4), 3);
    assert.equal(TEXT_MIN, 16);
    assert.match(src, /const noText = row\.laneH < TEXT_MIN;/);
    assert.match(src, /if \(noText\) continue;/);
    assert.doesNotMatch(HCSS, /transform:[^;}]*scale\(/);
});
test('#9 ruler day pill: full title, never cut; sticks inside its day (v0.1.3: title = record name — see v013)', () => {
    assert.doesNotMatch(src, /b\.t\.replace\(/);
    assert.match(src, /const txt = b\.s \? `\$\{b\.t\} · \$\{b\.s\}` : b\.t;/);
    assert.equal(dayPillU(100, 1000, 0, 80), 104);
    assert.equal(dayPillU(100, 1000, 500, 80), 506);
    assert.equal(dayPillU(100, 1000, 990, 80), 916);
    assert.equal(dayPillU(100, 120, 0, 80), null);
});
test('item 10: Hebrew/English/symbol ops; Table.Field lines; declared fields; loose', () => {
    assert.equal(parseHOp('לא ריק'), 'notempty');
    assert.equal(parseHOp('is not empty'), 'notempty');
    assert.equal(parseHOp('ריק'), 'empty');
    assert.equal(parseHOp('אינו אחד מ…'), 'none');
    assert.equal(parseHOp('is none of'), 'none');
    assert.equal(parseHOp('מכיל'), 'contains');
    assert.equal(parseHOp('does not contain'), 'ncontains');
    assert.equal(parseHOp('הוא'), 'any');
    assert.equal(parseHOp(''), 'any');
    assert.deepEqual(parseFilterLine('Slots_Events.Status = משובץ'), {table: 'Slots_Events', field: 'Status', op: 'any', vals: ['משובץ']});
    assert.deepEqual(parseFilterLine('Booking Resources.Resource Type אינו מקרן|רמקול'), {table: 'Booking Resources', field: 'Resource Type', op: 'none', vals: ['מקרן', 'רמקול']});
    assert.deepEqual(parseFilterLine('Lodging.Hotel לא ריק'), {table: 'Lodging', field: 'Hotel', op: 'notempty', vals: []});
    assert.deepEqual(parseFilterLine('Slots_Events.Hall'), {table: 'Slots_Events', field: 'Hall', op: null, vals: []});
    assert.equal(parseFilterLine('Status = x'), null, 'no table and none known');
    assert.deepEqual(parseFilterLine('Status ~ פתוח', true), {table: null, field: 'Status', op: 'contains', vals: ['פתוח']});
    const cell = parseFilterCell('Slots_Events.Status = משובץ\nStaffing.Role מכיל ניהול\n\nLodging.Hotel');
    assert.equal(cell.length, 3);
    assert.deepEqual(parseFilterCell('Slots_Events.Status', 'is not', 'בוטל|למחיקה')[0], {table: 'Slots_Events', field: 'Status', op: 'none', vals: ['בוטל', 'למחיקה']});
    assert.equal(parseFilterCell('Slots_Events.Status', '', '')[0].op, null);
});
test('item 10: conditions on records; funnel counts; configured fields first', () => {
    assert.ok(passH(['משובץ'], 'any', ['משובץ']));
    assert.ok(!passH(['משובץ'], 'none', ['משובץ']));
    assert.ok(passH(['Main Hall'], 'contains', ['main']));
    assert.ok(passH([], 'empty', []) && !passH(['x'], 'empty', []));
    assert.ok(passH(['x'], 'notempty', []) && !passH([' '], 'notempty', []));
    assert.ok(passH(['x'], 'any', []), 'no values = no filter');
    const a = it({id: 'a', fx: {Status: ['משובץ']}}),
        b = it({id: 'b', fx: {Status: ['בוטל']}}),
        c = it({id: 'c', fx: {}});
    const cf = {Slots_Events: {'f:Status': {op: 'notempty' as const, vals: []}}};
    assert.deepEqual([a, b, c].filter(i => hPassCol(i, cf)).map(i => i.id), ['a', 'b']);
    assert.equal(hColCount(cf.Slots_Events), 1);
    assert.deepEqual(Object.keys(hEffectiveCF({}, cf, ['Slots_Events'])), ['Slots_Events']);
    assert.deepEqual(hSetOp(cf.Slots_Events, 'f:Status', 'any')['f:Status'], {op: 'any', vals: []});
    assert.deepEqual(hToggleVal(undefined, 'f:Status', 'בוטל')['f:Status'], {op: 'any', vals: ['בוטל']});
    const dims = hColDims([a, b, c], undefined, {hall: 'מיקום', person: 'אדם', film: 'סרט', status: 'סטטוס'}, () => true, ['Status', 'Missing']);
    assert.equal(dims[0].key, 'f:Status');
    assert.ok(dims[0].cfg && dims[1].key === 'f:Missing' && dims[1].cfg);
    assert.deepEqual(
        defaultFilterFields([
            {name: 'Name', type: 'singleLineText'},
            {name: 'Location', type: 'multipleRecordLinks'},
            {name: 'Status', type: 'singleSelect'},
            {name: 'Notes', type: 'multilineText'},
        ]),
        ['Status', 'Location'],
    );
});
test('item 10 wiring: right pane (6 ops + «more» lines) → Filter_N lines → defaults; status shows found / not found', () => {
    assert.match(idx, /possibleValues: H_OPS\.map\(o => \(\{value: o, label: OP_FULL\[o\]\}\)\)/);
    assert.match(idx, /fkey\(sp\.key, 'more'\)/);
    assert.match(idx, /for \(const n of FILTER_SLOTS\)[^]*parseFilterCell\(cell, cfg\.raw\(`Filter_Operator_\$\{n\}`/);
    assert.match(idx, /defaultFilterFields\(/);
    assert.match(idx, /'לא נמצא ✗'/);
    assert.match(idx, /מוסתר מהאלמנט/);
    assert.match(src, /hColDims\(items\.filter\(i => i\.table === cfT\), CF\[cfT\], p\.facetLabels, passQ, p\.filterFields\?\.\[cfT\] \?\? \[\]\)/);
});
