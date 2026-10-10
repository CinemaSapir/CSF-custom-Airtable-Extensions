import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_RES, assignLanes, band, bandPx, buildDays, columnStates, compressedHeight, dayBar, emptyFilters, facetCounts, fmt, isJunk,
    israelParts, israelToUtc, jumpTarget, layout, liveCounts, mOf, mergeLodging, inHouse, nowTarget, normalizeOrder, parseRes, passes, phase,
    pickRes, pxPerHour, snap, stickyOffset, windowHits, yOf, cleanName, labelMode, type Item,
} from '../frontend/logic/core';

const days = buildDays('2026-10-16', '2026-11-10', '2026-11-01', {'2026-11-01': 'יום א׳ 1.11.26 · פתיחה', '2026-11-07': 'מוצ״ש 7.11.26 · נעילה'});
const it = (o: Partial<Item>): Item => ({table: 'Slots_Events', id: Math.random().toString(36), name: 'x', s: null, e: null, date: null, dateEnd: null, sub: '', inherited: false, flag: null, hall: [], people: [], films: [], status: null, st: null, slots: [], ...o});
const D = (date: string) => days.findIndex(d => d.date === date) * 1440;

test('day range: 26 consecutive days, −15 … +10, festival day 1 = 1.11', () => {
    assert.equal(days.length, 26);
    assert.equal(days[0].date, '2026-10-16');
    assert.equal(days[0].n, -15);
    assert.equal(days[15].n, 0);
    assert.equal(days[16].date, '2026-11-01');
    assert.equal(days[16].n, 1);
    assert.equal(days[25].n, 10);
    assert.equal(days[25].date, '2026-11-10');
    for (let k = 1; k < days.length; k++) assert.equal(Date.parse(days[k].date) - Date.parse(days[k - 1].date), 864e5);
    assert.equal(days[0].name, 'יום ו׳ 16.10.26'); // generated weekday name
    assert.equal(days[1].name, 'שבת 17.10.26');
});
test('day separators: festival-day title + weekday/date subtitle; phases', () => {
    assert.deepEqual(dayBar(days[16]), {t: 'יום 1 · פסטיבל · פתיחה', s: 'יום א׳ · 1.11.26'});
    assert.deepEqual(dayBar(days[15]), {t: 'הכנות · ערב הפסטיבל', s: 'שבת · 31.10.26'});
    assert.equal(dayBar(days[14]).t, 'הכנות · עוד 2 ימים'); // A-v7 counts to day 1
    assert.equal(dayBar(days[0]).t, 'הכנות · עוד 16 ימים');
    assert.equal(dayBar(days[23]).t, 'פירוק · יום 1');
    assert.equal(phase(0), 'prep');
    assert.equal(phase(7), 'fest');
    assert.equal(phase(8), 'wrap');
    assert.equal(phase(6, 5), 'wrap');
    assert.equal(buildDays('2026-11-02', '2026-11-01', '2026-11-01').length, 0);
});
test('Israel time: UTC ↔ local across the 25.10 DST change', () => {
    assert.deepEqual(israelParts(Date.parse('2026-10-21T08:00:00Z')), {date: '2026-10-21', min: 11 * 60});
    assert.deepEqual(israelParts(Date.parse('2026-11-02T11:10:00Z')), {date: '2026-11-02', min: 13 * 60 + 10});
    assert.equal(new Date(israelToUtc('2026-10-21', 660)).toISOString(), '2026-10-21T08:00:00.000Z');
    assert.equal(new Date(israelToUtc('2026-11-02', 790)).toISOString(), '2026-11-02T11:10:00.000Z');
    assert.equal(fmt(D('2026-11-02') + 13 * 60 + 10), '13:10');
    assert.equal(fmt(-30), '23:30');
});
test('resolution: one whole-screen setting, default 6h, Option_List_3 parsing', () => {
    assert.deepEqual(DEFAULT_RES.map(r => r.min), [60, 180, 360, 720, 1440]);
    assert.equal(pickRes(DEFAULT_RES, '360'), 360);
    assert.equal(pickRes(DEFAULT_RES, 'bogus'), 360);
    assert.equal(pickRes([{min: 60, label: 'שעה'}], 999), 60);
    assert.deepEqual(parseRes([{value: '60', label: 'שעה'}, {value: 'x', label: 'bad'}, {value: '5', label: 'too small'}]), [{min: 60, label: 'שעה'}]);
    assert.equal(parseRes([]).length, 5);
    assert.equal(pxPerHour(600, 360), 100); // 6h on a 600px screen
    assert.equal(pxPerHour(600, 1440), 25);
    assert.equal(pxPerHour(200, 1440), 14); // floor
    assert.equal(labelMode(100), 2);
    assert.equal(labelMode(20), 3);
    assert.equal(labelMode(50), 1);
});
const slot = it({s: D('2026-11-02') + 14 * 60, e: D('2026-11-02') + 15 * 60 + 15, name: 'פאנל'});
test('layout: day header, all-day strip, hour rows; yOf/mOf invert', () => {
    const chip = it({table: 'Tasks', date: '2026-11-02', dateEnd: '2026-11-03'});
    const {segs, height} = layout(days, [slot], [chip], ['Slots_Events', 'Tasks'], {compress: false, pxh: 40});
    assert.equal(segs.filter(s => s.kind === 'day').length, 26);
    assert.equal(segs.filter(s => s.kind === 'hr').length, 26 * 24);
    const all = segs.filter(s => s.kind === 'all');
    assert.equal(all.length, 2); // 2.11 and 3.11
    if (all[0].kind === 'all') assert.equal(all[0].per.Tasks[0].part, ' (1/2)');
    assert.equal(height, 26 * 54 + 26 * 24 * 40 + 2 * 27);
    const m = D('2026-11-02') + 14 * 60 + 40;
    assert.ok(Math.abs(mOf(segs, yOf(segs, m)) - m) < 1e-6);
});
test('compress: empty stretches keep 7% breathing room (min 16px), busy hours untouched', () => {
    const {segs} = layout(days, [slot], [], ['Slots_Events'], {compress: true, pxh: 100});
    const day = segs.filter(s => s.t0 >= D('2026-11-02') && s.t1 <= D('2026-11-03') && s.kind !== 'day');
    const cmp = day.filter(s => s.kind === 'cmp');
    assert.equal(cmp.length, 2); // 00–14 and 16–24
    assert.equal(cmp[0].h, Math.round(14 * 100 * 0.07));
    assert.equal(cmp[1].h, Math.round(8 * 100 * 0.07));
    assert.equal(day.filter(s => s.kind === 'hr').length, 2);
    assert.equal(compressedHeight(2, 50), 16);
    const empty = segs.find(s => s.kind === 'cmp' && s.t0 === 0);
    assert.ok(empty && empty.kind === 'cmp' && empty.n === 24);
    const off = layout(days, [slot], [], ['Slots_Events'], {compress: false, pxh: 100});
    assert.equal(off.segs.filter(s => s.kind === 'cmp').length, 0);
});
test('cross-section: always the middle 20% of the screen', () => {
    const {segs} = layout(days, [], [], ['Slots_Events'], {compress: false, pxh: 60});
    assert.deepEqual(bandPx(500), {top: 200, height: 100});
    const y = yOf(segs, D('2026-11-02') + 12 * 60);
    const [a, b] = band(segs, y - 250, 500); // 12:00 at the centre, 60px/h → 100px = 100 min
    assert.equal(Math.round(b - a), 100);
    assert.equal(fmt(a), '11:10');
    assert.equal(fmt(b), '12:50');
    const [a2, b2] = band(segs, y - 250, 500, 0.5);
    assert.equal(Math.round(b2 - a2), 250);
});
test('lanes: overlapping cards side by side', () => {
    const x = it({s: 0, e: 60}), y = it({s: 30, e: 90}), z = it({s: 90, e: 120});
    const r = assignLanes([x, y, z]);
    assert.deepEqual(r.map(q => [q.lane, q.lanes]), [[0, 2], [1, 2], [0, 1]]);
});
test('lodging merge: one bar per hotel, segments per constant guest list, in-house count', () => {
    const d = (date: string, hm: string) => D(date) + +hm.slice(0, 2) * 60 + +hm.slice(3);
    const st = (guest: string, hotel: string, a: string, b: string) => it({table: 'Lodging', guest, hotel, s: d(a, '15:00'), e: d(b, '11:00')});
    const stays = [st('אורח/ת 01', 'מלון 04', '2026-11-01', '2026-11-03'), st('יונתן מזרחי', 'מלון 04', '2026-11-01', '2026-11-04'), st('דנה אברהמי', 'מלון 04', '2026-11-02', '2026-11-03'), st('רון אזולאי', 'מלון 06', '2026-11-02', '2026-11-05'), st('אורח/ת 11', 'מלון 04', '2026-11-06', '2026-11-08')];
    const cl = mergeLodging(stays);
    assert.deepEqual(cl.map(c => [c.hotel, c.stays.length]), [['מלון 04', 3], ['מלון 04', 1], ['מלון 06', 1]]);
    const h4 = cl[0];
    assert.equal(h4.s, d('2026-11-01', '15:00'));
    assert.equal(h4.e, d('2026-11-04', '11:00'));
    assert.deepEqual(h4.segs.map(s => s.guests.length), [2, 3, 1]);
    assert.equal(h4.segs[1].checkins, 1);
    assert.equal(inHouse(stays, 'מלון 04', d('2026-11-02', '20:00')), 3);
    assert.equal(inHouse(stays, 'מלון 04', d('2026-11-03', '11:00')), 1); // check-out at 11:00 is out
});
test('junk filter: placeholders, unlinked borrowed-time, no time/date, excluded types and statuses', () => {
    assert.equal(isJunk(it({name: 'DEMO Staffing 06', table: 'Staffing', date: '2026-11-03'})), true);
    assert.equal(isJunk(it({name: 'DEMO Booking Resources 09', table: 'Booking Resources', date: '2026-11-03'})), true);
    assert.equal(isJunk(it({name: 'עומר פרץ · ערב הפתיחה', table: 'Staffing', date: '2026-11-01'})), true); // no linked slot
    assert.equal(isJunk(it({name: 'נועה לוי · סדרנים', table: 'Staffing', s: 10, e: 20})), false);
    assert.equal(isJunk(it({name: 'DEMO Slot 03'})), true);
    assert.equal(isJunk(it({name: 'משבצת בלי שעה'})), true); // no Start, no date
    assert.equal(isJunk(it({name: 'ישן', s: 0, e: 60}), {type: 'למחיקה', excludeTypes: ['למחיקה']}), true);
    assert.equal(isJunk(it({name: 'בוטלה', table: 'Tasks', date: '2026-11-02', status: 'בוטלה'}), {excludeStatus: {Tasks: ['בוטלה']}}), true);
    assert.equal(isJunk(it({name: 'בוטל', s: 0, e: 60, status: 'בוטל'})), false); // cancelled slots stay visible (struck through)
    assert.equal(isJunk(it({name: 'שלטי הכוונה', table: 'Petty Cash', date: '2026-10-20'})), false);
    assert.equal(cleanName('DEMO Person 01 · צללים'), 'אורח/ת 01 · צללים');
    assert.equal(cleanName('DEMO Locations 04'), 'מלון 04');
});
test('snapping to 15 minutes', () => {
    assert.equal(snap(7), 0);
    assert.equal(snap(8), 15);
    assert.equal(snap(14 * 60 + 52), 14 * 60 + 45);
    assert.equal(snap(14 * 60 + 53), 15 * 60);
    assert.equal(snap(100, 30), 90);
});
test('filters + search + facet counts', () => {
    const a = it({name: 'הקרנה: ערבסק', hall: ['אולם ספיר א׳'], films: ['ערבסק'], st: 'משובץ'});
    const b = it({table: 'Staffing', name: 'נועה לוי · סדרנים', hall: ['אולם ספיר ב׳'], people: ['נועה לוי'], st: 'לביצוע'});
    const f = emptyFilters();
    assert.equal(passes(a, f, ''), true);
    f.hall.add('אולם ספיר א׳');
    assert.equal(passes(a, f, ''), true);
    assert.equal(passes(b, f, ''), false);
    assert.equal(passes(b, emptyFilters(), 'נועה סדרנים'), true);
    assert.equal(passes(b, emptyFilters(), 'נועה במה'), false);
    assert.equal(passes(b, emptyFilters(), 'צוות', 'צוות'), true); // table label searchable
    const fc = facetCounts([a, b], 'hall', f, '', new Set(['Slots_Events', 'Staffing']), t => t);
    assert.deepEqual(fc, [{value: 'אולם ספיר א׳', count: 1}, {value: 'אולם ספיר ב׳', count: 1}]); // own facet ignored
});
test('columns: per-day empty collapse, manual ✕ strips, force-open, live counts', () => {
    const k = 17; // 2.11
    const s1 = it({s: k * 1440 + 600, e: k * 1440 + 660});
    const chip = it({table: 'Tasks', date: '2026-11-02'});
    const T = ['Slots_Events', 'Staffing', 'Tasks'];
    const o = {closed: new Set<string>(), forceOpen: new Set<string>(), collapseEmpty: true};
    let cs = columnStates(k, days, T, [s1], [chip], o);
    assert.equal(cs.Slots_Events.collapsed, false);
    assert.equal(cs.Staffing.collapsed, true);
    assert.equal(cs.Staffing.auto, true);
    assert.equal(cs.Tasks.collapsed, false);
    assert.equal(cs.Tasks.allDayOnly, true);
    cs = columnStates(k, days, T, [s1], [chip], {...o, collapseEmpty: false});
    assert.equal(cs.Staffing.collapsed, false);
    cs = columnStates(k, days, T, [s1], [chip], {...o, closed: new Set(['Slots_Events'])});
    assert.equal(cs.Slots_Events.manual, true);
    assert.equal(cs.Slots_Events.count, 1);
    cs = columnStates(k, days, T, [s1], [chip], {...o, forceOpen: new Set(['Staffing'])});
    assert.equal(cs.Staffing.collapsed, false);
    const none = columnStates(0, days, T, [s1], [chip], o); // v0.2.2: an empty day collapses EVERY empty column (was: all stayed open)
    assert.equal(Object.values(none).every(c => c.collapsed), true);
    const {segs} = layout(days, [s1], [chip], T, {compress: false, pxh: 40});
    const y0 = yOf(segs, k * 1440 + 540);
    assert.deepEqual(liveCounts(segs, [s1], y0, y0 + 200), {Slots_Events: 1});
});
test('sticky names: title pinned inside the visible part of a long card', () => {
    assert.equal(stickyOffset(100, 300, 50, 18), 0); // card fully below the top
    assert.equal(stickyOffset(100, 300, 200, 18), 99);
    assert.equal(stickyOffset(100, 300, 390, 18), 275); // clamped to the card's bottom
    assert.equal(stickyOffset(100, 300, 500, 18), 0); // card scrolled away
});
test('now / jump-to', () => {
    assert.deepEqual(nowTarget(days, Date.parse('2026-11-02T11:10:00Z')), {m: D('2026-11-02') + 790});
    assert.deepEqual(nowTarget(days, Date.parse('2026-10-09T20:00:00Z')), {m: 540, note: 'before'});
    assert.equal(nowTarget(days, Date.parse('2026-12-01T10:00:00Z')).note, 'after');
    assert.equal(jumpTarget(days, '2026-11-04T19:30'), D('2026-11-04') + 1170);
    assert.equal(jumpTarget(days, '2027-01-01T10:00'), null);
    assert.equal(jumpTarget(days, ''), null);
});
test('window hits: in table order, lodging aggregated per hotel', () => {
    const a = it({table: 'Staffing', name: 'צוות', s: 100, e: 200});
    const b = it({table: 'Slots_Events', name: 'משבצת', s: 150, e: 160});
    const l1 = it({table: 'Lodging', guest: 'א', hotel: 'מלון 04', s: 0, e: 1000});
    const l2 = it({table: 'Lodging', guest: 'ב', hotel: 'מלון 04', s: 50, e: 900});
    const out = windowHits([a, b, l1, l2, it({s: 500, e: 600})], 120, 180, ['Slots_Events', 'Staffing', 'Lodging'], () => true);
    assert.deepEqual(out.map(x => x.name), ['משבצת', 'צוות', 'מלון 04 · 2 במלון: א, ב']);
});
test('column order (per user) normalises saved state', () => {
    assert.deepEqual(normalizeOrder(['B', 'X', 'B'], ['A', 'B', 'C']), ['B', 'A', 'C']);
    assert.deepEqual(normalizeOrder('junk', ['A']), ['A']);
});
