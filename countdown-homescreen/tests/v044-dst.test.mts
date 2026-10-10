// v0.4.4 — DST: Israel is UTC+3 until Sun 25.10.2026 02:00, then UTC+2. 31.10 00:00 Israel = 30.10 22:00Z (NOT 21:00Z).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../frontend/festivalTarget.ts';
import {readFileSync} from 'node:fs';

test('israelMidnightMs is DST-aware (Asia/Jerusalem)', () => {
    const f = (T as unknown as {israelMidnightMs?: (d: string) => number}).israelMidnightMs;
    assert.equal(typeof f, 'function');
    assert.equal(new Date(f!('2026-10-31')).toISOString(), '2026-10-30T22:00:00.000Z'); // winter, UTC+2
    assert.equal(new Date(f!('2026-10-24')).toISOString(), '2026-10-23T21:00:00.000Z'); // summer, UTC+3
    assert.equal(new Date(f!('2026-10-25')).toISOString(), '2026-10-24T21:00:00.000Z'); // DST-end day starts at +3
    assert.equal(T.israelDate(f!('2026-10-31')), '2026-10-31');
    assert.equal(T.israelDate(f!('2026-10-25')), '2026-10-25');
});

test('the default first-day cutoff is 31.10 in Israel, not 30.10 (v0.4.1–0.4.3 bug: "+03:00")', () => {
    const src = readFileSync(new URL('../frontend/index.tsx', import.meta.url), 'utf8');
    assert.doesNotMatch(src, /T00:00:00\+03:00/);
    // old default instant 2026-10-31T00:00+03:00 = 30.10 23:00 Israel → wrong day
    assert.equal(T.israelDate(Date.parse('2026-10-31T00:00:00+03:00')), '2026-10-30');
    // a slot at 30.10 23:30 Israel must NOT be a festival slot; 31.10 00:30 must be
    const slots = [
        {name: 'late 30.10', startMs: Date.parse('2026-10-30T21:30:00Z'), endMs: null, status: 'משובץ'},
        {name: 'early 31.10', startMs: Date.parse('2026-10-30T22:30:00Z'), endMs: null, status: 'משובץ'},
    ];
    const r = T.computeTarget({kind: 'ok', slots}, Date.parse('2026-10-10T00:00:00Z'), {firstDay: '2026-10-31'});
    assert.ok(r.slotLine?.startsWith('early 31.10'), r.slotLine ?? '');
});
