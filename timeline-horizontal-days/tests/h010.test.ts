// «טיימליין אופקי» v0.1.0 — horizontal RTL layout logic + source contracts
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildDays, fmt, mOf, nowLineM, xsPlan, yOf, type Item} from '../frontend/logic/core';
import {HW, LANE, LANE_MAX, LANE_MIN, ROW_MIN, SEP_W, crowdedIn, estW, hAxis, hLens, hLiveCounts, hRowStates, packBars, resizeLane, rowDropTarget, rowLayout, scrollLeftFor, slOf, spanOf, stickyU} from '../frontend/logic/hcore';
import {CONFIG_SLUG, isAlias, pickConfigKey, TIMELINE_DEFAULTS} from '../frontend/config';
import {HCSS} from '../frontend/hstyles';
import {dragRange, moveRange, resizeEnd} from '../frontend/logic/edit';

const days = buildDays('2026-10-16', '2026-11-10', '2026-11-01');
const D = (date: string) => days.findIndex(d => d.date === date) * 1440;
const it = (o: Partial<Item>): Item => ({table: 'Slots_Events', id: Math.random().toString(36).slice(2), name: 'x', s: null, e: null, date: null, dateEnd: null, sub: '', inherited: false, flag: null, hall: [], people: [], films: [], status: null, st: null, slots: [], ...o}) as Item;
const hm = (h: number, m = 0) => h * 60 + m;
const B = D('2026-11-02');
const src = readFileSync('frontend/HTimeline.tsx', 'utf8');

test('axis: per day a separator then 24 hours; compress ON folds empty stretches (7%, ≥16px), OFF keeps every hour', () => {
    const timed = [it({s: B + hm(11), e: B + hm(12)}), it({s: B + hm(14), e: B + hm(16)})];
    const off = hAxis(days, timed, ['Slots_Events'], {compress: false, pxh: 100});
    assert.equal(off.segs.filter(s => s.kind === 'day').length, days.length);
    assert.equal(off.segs.filter(s => s.kind === 'hr').length, days.length * 24);
    assert.equal(off.width, days.length * (SEP_W + 2400));
    const on = hAxis(days, timed, ['Slots_Events'], {compress: true, pxh: 100});
    assert.ok(on.width < off.width / 5);
    const k = days.findIndex(d => d.date === '2026-11-02');
    const day = on.segs.filter(s => s.t0 >= k * 1440 && s.t0 < (k + 1) * 1440);
    assert.ok(day.some(s => s.kind === 'cmp' && s.t0 === B && s.t1 === B + hm(11) && s.h >= 16 && Math.abs(s.h - Math.max(16, 11 * 100 * 0.07)) < 0.01));
    // every busy hour stays full width, so time → x is linear inside them (drag snapping works the same)
    assert.equal(mOf(on.segs, yOf(on.segs, B + hm(14, 30))), B + hm(14, 30));
});
test('RTL scroll: Chrome scrollLeft ≤ 0 → distance from the right edge', () => {
    assert.equal(slOf(0), 0);
    assert.equal(slOf(-350), 350);
    assert.equal(slOf(12), 0);
    assert.equal(scrollLeftFor(350), -350);
    assert.equal(scrollLeftFor(-5), -0);
});
test('cross-section on the horizontal axis = the vertical xsPlan (5-min snap, middle 20%), compress ON and OFF', () => {
    for (const compress of [true, false]) {
        const timed = [it({s: B + hm(12), e: B + hm(15)})];
        const {segs} = hAxis(days, timed, ['Slots_Events'], {compress, pxh: 160});
        const W = 1000;
        const sl = yOf(segs, B + hm(13, 7)) - W / 2;
        const xp = xsPlan(segs, sl, W, 0.2, mOf(segs, sl + W / 2));
        assert.equal(fmt(xp.t), '13:05');
        assert.equal(Math.round(xp.height), 200);
        assert.ok(Math.abs(xp.yc - (yOf(segs, B + hm(13, 5)) - sl)) < 1e-6, 'strip centred on the rounded time');
        assert.ok(xp.a < B + hm(13, 5) && xp.b > B + hm(13, 5));
        const sl2 = yOf(segs, B + hm(13, 8)) - W / 2;
        assert.equal(fmt(xsPlan(segs, sl2, W, 0.2, mOf(segs, sl2 + W / 2)).t), '13:10');
    }
});
test('DST day 25.10.2026: the now line + the axis use Israel wall-clock minutes', () => {
    const k = days.findIndex(d => d.date === '2026-10-25');
    assert.equal(nowLineM(days, Date.parse('2026-10-25T09:07:00Z')), k * 1440 + hm(11, 7)); // UTC+2
    assert.equal(nowLineM(days, Date.parse('2026-10-24T09:07:00Z')), (k - 1) * 1440 + hm(12, 7)); // UTC+3
    const {segs} = hAxis(days, [], [], {compress: true, pxh: 100});
    assert.equal(segs.filter(s => s.t0 >= k * 1440 && s.t0 < (k + 1) * 1440 && s.kind === 'cmp').length, 1, 'an empty DST day folds to one stretch');
});
test('date-only items become whole-day bars; timed spans unchanged', () => {
    assert.deepEqual(spanOf(it({date: '2026-11-02'}), days), {s: B, e: B + 1440, ad: true});
    assert.deepEqual(spanOf(it({date: '2026-11-02', dateEnd: '2026-11-03'}), days), {s: B, e: B + 2880, ad: true});
    assert.deepEqual(spanOf(it({s: B + 60, e: B + 120}), days), {s: B + 60, e: B + 120, ad: false});
    assert.equal(spanOf(it({}), days), null);
});
test('lanes reserve the label: a short bar whose name runs past its end pushes the next bar to a new lane; far apart = same lane', () => {
    const u = (m: number) => (m - B) * 2; // 2px / minute
    const a = it({name: 'הקרנה: הבית שעל הגבעה', s: B + hm(10), e: B + hm(10, 15)});
    const b = it({name: 'פאנל', s: B + hm(10, 30), e: B + hm(11)});
    const c = it({name: 'סדנה', s: B + hm(14), e: B + hm(15)});
    const r = packBars([a, b, c], days, u);
    const L = (x: Item) => r.bars.find(y => y.item === x)?.lane;
    assert.ok(estW(a.name, 12.5) + 14 > u(b.s as number) - u(a.s as number), 'name of a is wider than its bar + gap');
    assert.notEqual(L(a), L(b));
    assert.equal(L(c), 0);
    assert.equal(r.lanes, 2);
    const ext = r.bars.find(y => y.item === a)!;
    assert.ok(ext.ext >= ext.u0 + ext.lab && ext.ext > ext.u1);
});
test('rows: halls are groups in משבצות, hotels in לינה (merged clusters), min height, taller lanes = taller row', () => {
    const u = (m: number) => (m - B) * 2;
    const s = [it({name: 'א', hall: ['אולם ספיר א׳'], s: B + 600, e: B + 700}), it({name: 'ב', hall: ['אולם ספיר ב׳'], s: B + 600, e: B + 700}), it({name: 'ג', hall: [], s: B + 600, e: B + 700})];
    const row = rowLayout('Slots_Events', s, days, u);
    assert.deepEqual(row.groups.map(g => g.key), ['אולם ספיר א׳', 'אולם ספיר ב׳', '—']);
    assert.ok(row.groups.every((g, i) => !i || g.y >= row.groups[i - 1].y + row.groups[i - 1].h));
    const tall = rowLayout('Slots_Events', s, days, u, {laneH: 40});
    assert.ok(tall.h > row.h);
    assert.equal(rowLayout('Staffing', [], days, u).h, ROW_MIN);
    const st = [
        it({table: 'Lodging', hotel: 'מלון 04', guest: 'אורח/ת 01', s: B - 1440 + hm(15), e: B + 1440 + hm(11)}),
        it({table: 'Lodging', hotel: 'מלון 04', guest: 'אורח/ת 02', s: B + hm(15), e: B + 2880 + hm(11)}),
        it({table: 'Lodging', hotel: 'מלון 06', guest: 'רון', s: B + hm(15), e: B + 1440 + hm(11)}),
    ];
    const lr = rowLayout('Lodging', st, days, u);
    assert.deepEqual(lr.groups.map(g => g.key), ['מלון 04', 'מלון 06']);
    const g4 = lr.groups[0];
    assert.equal(g4.lodge?.length, 1, 'overlapping stays of one hotel = ONE merged bar');
    assert.equal(g4.lodge?.[0].rows, 2);
    assert.deepEqual(g4.lodge?.[0].c.segs.map(x => x.guests.length), [1, 2, 1], 'in-house count per stretch');
});
test('quiet tables close by default (no items on the centre day) → chip row; ✕ closes by hand; a chip reopens; toggle OFF keeps them', () => {
    const k = days.findIndex(d => d.date === '2026-11-02');
    const items = [it({table: 'Slots_Events', s: B + 600, e: B + 660}), it({table: 'Social Posts', date: '2026-11-02'}), it({table: 'Staffing', s: B - 1440 + 600, e: B - 1440 + 660})];
    const T = ['Slots_Events', 'Staffing', 'Social Posts', 'Lodging'];
    const r = hRowStates(k, days, T, items, {closed: new Set(), forceOpen: new Set(), collapseEmpty: true});
    assert.deepEqual(T.filter(t => r[t].open), ['Slots_Events', 'Social Posts']);
    assert.ok(r.Staffing.quiet && r.Lodging.quiet && !r.Staffing.manual);
    const r2 = hRowStates(k, days, T, items, {closed: new Set(['Slots_Events']), forceOpen: new Set(['Staffing']), collapseEmpty: true});
    assert.ok(!r2.Slots_Events.open && r2.Slots_Events.manual && r2.Slots_Events.count === 1);
    assert.ok(r2.Staffing.open);
    const r3 = hRowStates(k, days, T, items, {closed: new Set(), forceOpen: new Set(), collapseEmpty: false});
    assert.ok(T.every(t => r3[t].open));
    assert.equal(TIMELINE_DEFAULTS.Toggle_1, true);
    assert.equal(TIMELINE_DEFAULTS.Toggle_2, true, 'both compress toggles default ON');
});
test('row reorder drop target, row height resize (clamped, per lane), lens fit + crowding, sticky names, live counts', () => {
    const bx = [{t: 'a', top: 0, bottom: 40}, {t: 'b', top: 40, bottom: 100}];
    assert.equal(rowDropTarget(bx, 10), 'a');
    assert.equal(rowDropTarget(bx, 25), 'b');
    assert.equal(rowDropTarget(bx, 90), null);
    assert.equal(resizeLane(LANE, 30, 3), LANE + 10);
    assert.equal(resizeLane(LANE, -999, 1), LANE_MIN);
    assert.equal(resizeLane(LANE, 999, 1), LANE_MAX);
    const big = hLens('פאנל', 200, false)!;
    assert.equal(big.fs, 16.25);
    assert.ok(big.full && !big.clip);
    assert.equal(hLens('פאנל', 200, true)!.fs, 14, 'crowded strip → smaller max');
    const tiny = hLens('הקרנה: הבית שעל הגבעה הגדולה מאוד', 60, false)!;
    assert.ok(tiny.clip && tiny.fs === 9, 'ellipsis only as the last resort, at 9px');
    assert.equal(hLens('x', 20, false), null);
    const bars = [0, 1, 2, 3].map(l => ({lane: l, u0: 0, u1: 100})) as never[];
    assert.ok(crowdedIn(bars, 10, 20));
    assert.ok(!crowdedIn(bars.slice(0, 3), 10, 20));
    assert.equal(stickyU(0, 1000, 300, 80), 302);
    assert.equal(stickyU(0, 1000, 990, 80), 916);
    assert.equal(stickyU(400, 1000, 300, 80), 0);
    const c = hLiveCounts([it({s: B + 600, e: B + 700}), it({table: 'Tasks', date: '2026-11-02'}), it({s: B + 900, e: B + 960})], days, B + 650, B + 800);
    assert.deepEqual(c, {Slots_Events: 1, Tasks: 1});
});
test('drag create / move / resize: 15-min snap (shared with the vertical)', () => {
    assert.deepEqual(dragRange(B + hm(10, 7), B + hm(10, 52)), {s: B + hm(10), e: B + hm(10, 45)});
    assert.deepEqual(dragRange(B + hm(10, 7), B + hm(10, 53)), {s: B + hm(10), e: B + hm(11)});
    assert.deepEqual(moveRange(B + 600, B + 660, 22), {s: B + 615, e: B + 675});
    assert.deepEqual(resizeEnd(B + 600, B + 604), {s: B + 600, e: B + 615});
});
test('config key «timeline-horizontal-days» + flexible aliases; never another extension’s row', () => {
    const R = (extension: string, variant = '', more: object = {}) => ({extension, variant, ...more});
    assert.equal(CONFIG_SLUG, 'timeline-horizontal-days');
    assert.deepEqual(pickConfigKey(null, ''), {slug: 'timeline-horizontal-days', variant: '', legacy: false});
    assert.deepEqual(pickConfigKey([R('timeline-horizontal-days')], ''), {slug: 'timeline-horizontal-days', variant: '', legacy: false});
    // the slug spelled loosely = the slug itself (the shared hook scores it 100)
    for (const a of ['Timeline Horizontal Days', ' timeline_horizontal_days\u200F']) assert.deepEqual(pickConfigKey([R('countdown-homescreen'), R(a)], ''), {slug: 'timeline-horizontal-days', variant: '', legacy: false});
    for (const a of ['timeline_horizontal', ' Horizontal-Timeline\u200F', 'טיימליין אופקי', 'timeline-h']) {
        assert.ok(isAlias(a), a);
        const k = pickConfigKey([R('countdown-homescreen'), R(a)], '');
        assert.equal(k.slug, a.trim());
        assert.ok(k.legacy && !k.blocked, a);
    }
    // the vertical's rows are never ours: «timeline» would score 45 in the shared hook → blocked (code defaults, no writes)
    const v = pickConfigKey([R('timeline'), R('countdown-homescreen')], '');
    assert.equal(v.slug, 'timeline-horizontal-days');
    assert.equal(v.blocked, true);
    assert.equal(pickConfigKey([R('timeline-festival-days'), R('countdown-homescreen')], '').blocked, undefined);
    // both present → ours wins, nothing blocked
    const both = pickConfigKey([R('timeline'), R('timeline-festival-days'), R('timeline-horizontal-days')], '');
    assert.ok(!both.blocked && both.slug === 'timeline-horizontal-days');
    // Extension hidden/empty → primary / Display_Name / GitHub_URL folder
    assert.equal(pickConfigKey([R('', '', {primary: 'x', displayName: 'טיימליין אופקי'})], '').slug, 'טיימליין אופקי');
    assert.equal(pickConfigKey([R('', '', {github: 'https://github.com/o/r/tree/main/timeline-horizontal-days'})], '').slug, 'timeline-horizontal-days');
    assert.equal(pickConfigKey([R('timeline-horizontal-days')], 'Default').variant, '');
});
test('source: row headers carry the SAME controls in one order on every table: ⠿ · name · count · funnel · ⋯ · ✕ (shrink)', () => {
    const h = src.slice(src.indexOf('const header = ('), src.indexOf('return (\n        <div ref={rootRef}'));
    const at = (re: RegExp) => h.search(re);
    const ix = [at(/className="hd2"/), at(/className="nmh"/), at(/className="vc num"/), at(/className=\{`cf2 /), at(/className="cm2"/), at(/className="cx"/)];
    assert.ok(ix.every(x => x > 0), JSON.stringify(ix));
    assert.deepEqual([...ix].sort((a, b) => a - b), ix);
    assert.match(h, /className="cx"[\s\S]{0,400}close\(t\)/, '✕ shrinks to the chip row');
    assert.ok(!/className="sh"/.test(h), 'no ⇤ (v0.2.11)');
    assert.match(h, /aria-disabled=\{!canF\(t\)\}/, 'funnel disabled with a reason, never hidden');
    assert.match(h, /className=\{`hrz /, 'row height handle');
});
test('source: 👁 per record (bar label + window card), xsPlan for clock/strip/window, window funnel + additive filters, chips', () => {
    assert.equal((src.match(/<Eye id=\{i\.id\}/g) ?? []).length, 2);
    assert.match(src, /const xp = xsPlan\(segs, sl, W, p\.numbers\.bandFrac, centreT\)/);
    assert.match(src, /const curMin = xp\.t;/);
    assert.match(src, /winPass\(i, passT, wShown, wOff\) && passPicked\(i, wPick\)/);
    assert.match(src, /className=\{`wf /);
    assert.match(src, /className=\{`hchip /);
    assert.match(src, /!hid\.has\(i\.id\) && passQ\(i\) && hPassCol\(i, CF\)/); // v0.1.2: hfilter (6 ops)
    assert.match(src, /const LS = 'csf\.timelineH\.v1\.'/, 'per-user state separate from the vertical block');
    assert.match(HCSS, /\.htl \.hvp\{[^}]*direction:rtl/);
    assert.match(HCSS, /\.htl \.hrul\{position:sticky;top:0/);
    assert.match(HCSS, /\.htl \.hrh\{position:sticky;right:0/);
    assert.ok(!/#(?!fff\b)[0-9a-f]{3,6}\b/i.test(HCSS), 'no hex but white in the horizontal CSS (SDK vars only)');
    assert.equal(HW, 200);
});
