// v0.2.8 — the cross-section time snaps to the nearest 5 minutes (label, band position, window range)
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {XS_STEP, bandPx, buildDays, fmt, layout, mOf, nowLineM, roundTo, xsPlan, yOf, type Item} from '../frontend/logic/core';

const days = buildDays('2026-10-16', '2026-11-10', '2026-11-01');
const D = (date: string) => days.findIndex(d => d.date === date) * 1440;
const it = (o: Partial<Item>): Item => ({table: 'Slots_Events', id: 'x', name: 'x', s: null, e: null, date: null, dateEnd: null, sub: '', inherited: false, flag: null, hall: [], people: [], films: [], status: null, st: null, slots: [], ...o}) as Item;
const hm = (h: number, m: number) => h * 60 + m;

test('rounding edges: 13:07 → 13:05, 13:08 → 13:10, half-way up, exact stays', () => {
    assert.equal(XS_STEP, 5);
    const b = D('2026-11-02');
    assert.equal(fmt(roundTo(b + hm(13, 7))), '13:05');
    assert.equal(fmt(roundTo(b + hm(13, 8))), '13:10');
    assert.equal(fmt(roundTo(b + hm(13, 7.5))), '13:10');
    assert.equal(fmt(roundTo(b + hm(13, 7.49))), '13:05');
    assert.equal(fmt(roundTo(b + hm(13, 2.4))), '13:00');
    assert.equal(fmt(roundTo(b + hm(13, 2.6))), '13:05');
    assert.equal(roundTo(b + hm(13, 10)), b + hm(13, 10));
    assert.equal(roundTo(b + hm(23, 58)), D('2026-11-03')); // 23:58 → 00:00 of the next day
    assert.equal(roundTo(0.4), 0);
});
test('DST day (25.10.2026, 02:00 → 01:00): wall-clock minutes round the same way', () => {
    const at = (iso: string) => nowLineM(days, Date.parse(iso)) as number;
    assert.equal(fmt(roundTo(at('2026-10-25T09:07:00Z'))), '11:05'); // UTC+2 after the change
    assert.equal(fmt(roundTo(at('2026-10-25T09:08:00Z'))), '11:10');
    assert.equal(fmt(roundTo(at('2026-10-24T22:58:00Z'))), '02:00'); // 01:58 IDT (UTC+3) → 02:00
    assert.equal(fmt(roundTo(at('2026-10-24T08:07:00Z'))), '11:05'); // UTC+3 before the change
    assert.ok(roundTo(at('2026-10-25T09:07:00Z')) >= D('2026-10-25'));
});
const flat = layout(days, [it({s: D('2026-11-02') + hm(10, 0), e: D('2026-11-02') + hm(18, 0)})], [], ['Slots_Events'], {compress: false, pxh: 100}).segs;
test('band moves onto the rounded time; window range = the band pixels', () => {
    const vpH = 600,
        frac = 0.2;
    const m = D('2026-11-02') + hm(13, 7);
    const scrollTop = yOf(flat, m) - vpH / 2;
    const xp = xsPlan(flat, scrollTop, vpH, frac, m);
    assert.equal(fmt(xp.t), '13:05');
    assert.ok(Math.abs(scrollTop + xp.yc - yOf(flat, xp.t)) < 1e-6);
    assert.ok(Math.abs(xp.top + xp.height / 2 - xp.yc) < 1e-6);
    assert.equal(xp.height, bandPx(vpH, frac).height);
    assert.ok(Math.abs(xp.yc - vpH / 2 + (2 * 100) / 60) < 1e-6); // 2 min up at 100 px/h
    assert.ok(Math.abs(xp.a - mOf(flat, scrollTop + xp.top)) < 1e-9 && Math.abs(xp.b - mOf(flat, scrollTop + xp.top + xp.height)) < 1e-9);
    assert.ok(Math.abs((xp.a + xp.b) / 2 - xp.t) < 1e-6); // uncompressed: band centred on the rounded time
});
test('compress ON: rounding still lands on a 5-min mark and the band centre sits on it', () => {
    const segs = layout(days, [it({s: D('2026-11-02') + hm(14, 0), e: D('2026-11-02') + hm(16, 0)})], [], ['Slots_Events'], {compress: true, pxh: 100}).segs;
    assert.ok(segs.some(s => s.kind === 'cmp'));
    const vpH = 600;
    for (const m of [D('2026-11-02') + hm(14, 33), D('2026-11-02') + hm(9, 17.3), D('2026-11-02') + hm(20, 2)]) {
        const st = yOf(segs, m) - vpH / 2;
        const xp = xsPlan(segs, st, vpH, 0.2, m);
        assert.equal(xp.t % 5, 0);
        assert.ok(Math.abs(xp.t - m) <= 2.5);
        assert.ok(Math.abs(st + xp.yc - yOf(segs, xp.t)) < 1e-6);
        assert.ok(xp.a <= xp.t && xp.b >= xp.t);
    }
});
// (removed in the horizontal repo: vertical-only source check «Timeline uses the plan for the clock…»; horizontal equivalent in tests/h010.test.ts)
