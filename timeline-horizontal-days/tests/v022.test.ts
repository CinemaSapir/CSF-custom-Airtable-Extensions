// v0.2.2 — the owner's 01:11 edits, a test per item
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    allCollapsed, axisTicks, buildDays, canvasWidth, cellToMs, columnStates, contrast, fmt, israelParts, jumpFrom, layout, msToCell, nowLineM, nowTarget2, openDate, openTarget,
    pxPerHour, tickStep, tzModeOf, windowHits, type Item,
} from '../frontend/logic/core';
import {mapFields, type FieldLike} from '../frontend/logic/edit';
import {readItems, type RecView} from '../frontend/logic/read';
import {TIMELINE_DEFAULTS} from '../frontend/config';
import {CSS} from '../frontend/styles';

const days = buildDays('2026-10-16', '2026-11-10', '2026-11-01');
const K = (date: string) => days.findIndex(d => d.date === date);
const D = (date: string) => K(date) * 1440;
const it = (o: Partial<Item>): Item => ({table: 'Slots_Events', id: Math.random().toString(36), name: 'x', s: null, e: null, date: null, dateEnd: null, sub: '', inherited: false, flag: null, hall: [], people: [], films: [], status: null, st: null, slots: [], ...o});

test('1 separator: the canvas is never narrower than the viewport (all-strips day included)', () => {
    assert.equal(canvasWidth(58 + 13 * 30, 1425), 1425);
    assert.equal(canvasWidth(2300, 1425), 2300);
});

test('2 palette (superseded in v0.2.3 by SDK palette B — see v023.test.ts): phase colours are SDK names', () => {
    assert.deepEqual([TIMELINE_DEFAULTS.Color_1, TIMELINE_DEFAULTS.Color_2, TIMELINE_DEFAULTS.Color_3], ['grayLight2', 'cyanLight2', 'yellowLight2']);
    assert.ok(contrast('#444444', '#eeeeee') >= 4.5);
    assert.ok(contrast('#ffffff', '#ba1e45') >= 4.5); // now tag / band label
});

test('3 open day: 31.10 of the festival year; nearest Festival Days date when missing (tie → earlier); first item near the top', () => {
    const fd = days.map(d => d.date);
    assert.equal(openDate(days, fd), '2026-10-31');
    assert.equal(openDate(days, fd.filter(d => d !== '2026-10-31')), '2026-10-30');
    assert.equal(openDate(days, ['2026-11-02', '2026-10-20']), '2026-11-02');
    assert.equal(openDate(days, []), '2026-10-31'); // no Festival Days → timeline days
    const d2 = buildDays('2027-10-15', '2027-11-09', '2027-10-31');
    assert.equal(openDate(d2, []), '2027-10-31'); // year from festival day 1
    const t = openTarget(days, fd, [D('2026-10-31') + 16 * 60, D('2026-11-01') + 9 * 60], 6);
    assert.equal(t.date, '2026-10-31');
    assert.equal(fmt(t.m), '18:30'); // centre = first(16:00) − 30′ + 3h → 16:00 shows near the top
    assert.equal(fmt(openTarget(days, fd, [], 6).m), '12:00');
});

test('4 jump control: calendar date + time → minutes; bad/outside → null', () => {
    assert.equal(jumpFrom(days, '2026-11-04', '18:45'), D('2026-11-04') + 18 * 60 + 45);
    assert.equal(jumpFrom(days, '2026-11-04', ''), D('2026-11-04'));
    assert.equal(jumpFrom(days, '2027-01-01', '10:00'), null);
    assert.equal(jumpFrom(days, '', '10:00'), null);
});

test('5 hour labels: one tick list for lines AND labels, at every resolution, aligned to the hour lines', () => {
    const slot = it({s: D('2026-11-02') + 600, e: D('2026-11-02') + 700});
    for (const resMin of [60, 180, 360, 720, 1440]) {
        const pxh = pxPerHour(650, resMin);
        const {segs} = layout(days, [slot], [], ['Slots_Events'], {compress: false, pxh});
        const ticks = axisTicks(segs, pxh);
        const st = tickStep(pxh);
        assert.ok(ticks.length > 0);
        // every tick sits exactly on its hour segment's line (or at the matching fraction for :15/:30)
        for (const tk of ticks.slice(0, 200)) {
            const seg = segs.find(s => s.kind === 'hr' && tk.m >= s.t0 && tk.m < s.t1);
            assert.ok(seg);
            assert.ok(Math.abs(tk.y - (seg.y + ((tk.m - seg.t0) / 60) * seg.h)) < 1e-9);
            assert.equal((tk.m % 1440) % st, 0);
        }
        // spacing ≥ 36px inside a day → labels never collide
        const a = ticks.filter(t => t.m >= D('2026-11-02') && t.m < D('2026-11-03'));
        for (let n = 1; n < a.length; n++) assert.ok(a[n].y - a[n - 1].y >= 35.9, `res ${resMin}`);
        // a full day → 24h / step ticks
        assert.equal(a.length, 1440 / st, `res ${resMin}`);
    }
});

test('6 window cards carry their record id (lodging aggregate excluded) so the name can open it', () => {
    const a = it({id: 'recA', s: 600, e: 700});
    const l1 = it({table: 'Lodging', id: 'recL', s: 0, e: 2000, hotel: 'מלון 04', guest: 'X'} as Partial<Item>);
    const h = windowHits([a, l1], 620, 640, ['Slots_Events', 'Lodging'], () => true);
    assert.equal(h.find(x => x.table === 'Slots_Events')?.id, 'recA');
    assert.equal(h.find(x => x.table === 'Lodging')?.agg, true);
});

test('7 empty columns start collapsed — also when the whole day is empty; toggle OFF keeps them open', () => {
    const T = ['Slots_Events', 'Staffing', 'Tasks'];
    const k = K('2026-10-17');
    const on = columnStates(k, days, T, [], [], {closed: new Set(), forceOpen: new Set(), collapseEmpty: true});
    assert.equal(allCollapsed(on, T), true);
    const off = columnStates(k, days, T, [], [], {closed: new Set(), forceOpen: new Set(), collapseEmpty: false});
    assert.equal(allCollapsed(off, T), false);
    assert.equal(TIMELINE_DEFAULTS.Toggle_1, true); // «כווץ עמודות ריקות» defaults ON
});

test('8 time zones: UTC values shown in Asia/Jerusalem across the DST change (25.10.2026)', () => {
    // instant fields (no tz / client): the real moment → Israel time
    assert.equal(fmt(israelParts(cellToMs('2026-10-24T11:00:00.000Z', 'instant') as number).min), '14:00'); // UTC+3
    assert.equal(fmt(israelParts(cellToMs('2026-10-25T11:00:00.000Z', 'instant') as number).min), '13:00'); // UTC+2
    // the night of the change: 22:30Z = 01:30 IDT, 23:30Z = 01:30 IST (the hour repeats)
    assert.equal(israelParts(Date.parse('2026-10-24T22:30:00Z')).min, 90);
    assert.equal(israelParts(Date.parse('2026-10-24T23:30:00Z')).min, 90);
    // GMT-clock fields: the stored clock IS the Israel wall time, on both sides of the change
    for (const v of ['2026-10-24T14:00:00.000Z', '2026-10-25T14:00:00.000Z', '2026-10-26T14:00:00.000Z']) {
        const ms = cellToMs(v, 'wall') as number;
        assert.equal(fmt(israelParts(ms).min), '14:00');
        assert.equal(msToCell(ms, 'wall'), v); // round trip
        assert.equal(msToCell(cellToMs(v, 'instant') as number, 'instant'), v);
    }
    assert.equal(tzModeOf({timeZone: 'utc'}), 'wall');
    assert.equal(tzModeOf({isUsingGMT: true}), 'wall');
    assert.equal(tzModeOf({timeZone: 'client'}), 'instant');
    assert.equal(tzModeOf({timeZone: 'Asia/Jerusalem'}), 'instant');
    assert.equal(tzModeOf(undefined), 'instant');
    // «עכשיו» + now line across the change
    assert.equal(fmt(nowTarget2(days, Date.parse('2026-10-24T09:00:00Z')).m), '12:00');
    assert.equal(fmt(nowTarget2(days, Date.parse('2026-10-25T09:00:00Z')).m), '11:00');
    assert.equal(nowLineM(days, Date.parse('2026-10-25T09:00:00Z')), D('2026-10-25') + 11 * 60);
    const before = nowTarget2(days, Date.parse('2026-10-10T22:11:00Z'));
    assert.deepEqual([before.note, before.date, before.clock, before.m], ['before', '2026-10-11', '01:11', 71]);
    assert.equal(nowLineM(days, Date.parse('2026-10-10T22:11:00Z')), null);
    // reading: the same record in both modes
    const rec = (tz: 'instant' | 'wall'): RecView => ({
        id: 'r1',
        name: 'הקרנה',
        raw: a => ({Start: '2026-10-25T14:00:00.000Z', End: '2026-10-25T15:30:00.000Z'})[(a ?? [])[0] as 'Start'],
        str: () => '',
        has: a => ['Start', 'End'].includes((a ?? [])[0]),
        tz: () => tz,
    });
    const opts = {days, lodge: {in: '15:00', out: '11:00'}, statusLabel: (x: string) => x, clean: false};
    const i1 = readItems([{key: 'Slots_Events', recs: [rec('instant')]}], opts).items[0];
    const i2 = readItems([{key: 'Slots_Events', recs: [rec('wall')]}], opts).items[0];
    assert.equal(fmt(i1.s as number), '16:00');
    assert.equal(fmt(i2.s as number), '14:00');
    // writing: a GMT-clock field gets the wall time back; an instant field gets the real UTC instant
    const F = (tz: 'instant' | 'wall'): FieldLike[] => [
        {id: 'fN', name: 'Name', type: 'singleLineText', isComputed: false},
        {id: 'fS', name: 'Start', type: 'dateTime', isComputed: false, tz},
        {id: 'fE', name: 'End', type: 'dateTime', isComputed: false, tz},
    ];
    const iso = new Date(cellToMs('2026-10-25T14:00:00.000Z', 'wall') as number).toISOString(); // = 12:00Z (14:00 IST)
    const mw = mapFields('Slots_Events', F('wall'), 'fN', {start: iso, end: iso});
    const mi = mapFields('Slots_Events', F('instant'), 'fN', {start: iso, end: iso});
    assert.ok('map' in mw && 'map' in mi);
    if ('map' in mw && 'map' in mi) {
        assert.equal(mw.map.fS, '2026-10-25T14:00:00.000Z');
        assert.equal(mi.map.fS, '2026-10-25T12:00:00.000Z');
    }
});

test('9 cross-section toggle (v0.2.4 contract): the window is in the flow and slides; the header row never moves; no display:none', () => {
    // superseded v0.2.2 rule (reserved 86px overlay box) → v0.2.4: height auto, cards area collapses 0fr ↔ 1fr
    const last = [...CSS.matchAll(/\.win[^{]*\{(?:[^}]*;)?height:[^};]+/g)].pop()?.[0] ?? '';
    assert.match(last, /height:auto!important/);
    assert.match(CSS, /\.tl\.nox \.win \.wslide\{grid-template-rows:0fr\}/);
    assert.match(CSS, /transition:grid-template-rows/);
    assert.match(CSS, /\.jp,\.xsb,\.tl\.nox \.xsb\{display:none!important\}/);
    assert.ok(!/\.tl\.nox \.win\{display:none\}[^]*$/.test(CSS.split('v0.2.4')[1] ?? ''), 'no display:none for the window after v0.2.4');
});
