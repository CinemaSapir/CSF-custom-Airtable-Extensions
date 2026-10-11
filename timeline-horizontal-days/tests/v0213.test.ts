// v0.2.13 (the owner 04:54) — PROD crash «TypeError: Cannot read properties of undefined (reading 'date') at gI (bundle.js:743:129)»
// gI = JumpControl (Timeline.tsx): `dayOf(days, cur).date` with days = [] (Date_1 → Date_2 reversed or > 400 days → buildDays = []).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NO_DAY, buildDays, columnStates, dayBar, dayOf, daysProblem, nowLineM, nowTarget, nowTarget2, openDate, openTarget} from '../frontend/logic/core';
import {planFields} from '../frontend/logic/edit';

const idx = readFileSync('frontend/index.tsx', 'utf8');
const tl = readFileSync('frontend/HTimeline.tsx', 'utf8');

test('root cause: buildDays gives NO days for a reversed or > 400-day Date_1 → Date_2 range (Festival Days only names days)', () => {
    assert.equal(buildDays('2026-11-10', '2026-10-16', '2026-11-01').length, 0);
    assert.equal(buildDays('2024-01-01', '2026-11-10', '2026-11-01').length, 0);
    assert.equal(buildDays('2026-10-16', '2026-11-10', '2026-11-01').length, 26);
});
test('daysProblem names the reason in Hebrew (reversed / > 400 / invalid), null when fine', () => {
    assert.match(daysProblem('2026-11-10', '2026-10-16') as string, /הפוך/);
    assert.match(daysProblem('2024-01-01', '2026-11-10') as string, /400/);
    assert.match(daysProblem('', 'x') as string, /לא תקינים/);
    assert.equal(daysProblem('2026-10-16', '2026-11-10'), null);
    assert.equal(daysProblem('2026-10-16', '2026-10-16'), null); // one day is fine
});
test('dayOf never returns undefined: empty days → NO_DAY; out of range clamps to the edge day', () => {
    assert.equal(dayOf([], 0), NO_DAY);
    assert.equal(dayOf([], 99999).date, '');
    const d = buildDays('2026-10-31', '2026-11-02', '2026-11-01');
    assert.equal(dayOf(d, -5000).date, '2026-10-31');
    assert.equal(dayOf(d, 999999).date, '2026-11-02');
    assert.doesNotThrow(() => dayBar(NO_DAY));
});
test('every days-based helper survives days = []', () => {
    const t = Date.parse('2026-11-02T11:07:00Z');
    assert.deepEqual(nowTarget([], t), {m: 0});
    assert.equal(nowTarget2([], t).m, 0);
    assert.equal(nowLineM([], t), null);
    assert.equal(openDate([], ['2026-10-31']), null);
    assert.deepEqual(openTarget([], [], [], 6), {m: 0, date: null});
    assert.doesNotThrow(() => columnStates(0, [], ['Slots_Events'], [], [], {closed: new Set(), forceOpen: new Set(), collapseEmpty: true}));
    assert.doesNotThrow(() => planFields('Slots_Events', {s: 600, e: 660, name: 'x'}, [], 'create'));
});
test('index: no days → friendly empty state («לא נמצאו ימי פסטיבל…») + the status panel, BEFORE the Timeline renders', () => {
    assert.match(idx, /לא נמצאו ימי פסטיבל — בדקו שטבלת Festival Days ושדה Date מופעלים באלמנט/);
    const a = idx.indexOf('if (!days.length)');
    assert.ok(a > 0 && a < idx.indexOf('<HTimeline\n'), 'empty-state return sits before <Timeline');
    assert.match(idx.slice(a, a + 900), /<NoDays[\s\S]*<TimelineStatus force/);
    // hooks are not conditional: useContext(CpCtx) moved above the early return
    assert.ok(idx.indexOf('const cp = useContext(CpCtx);', idx.indexOf('function Screen')) < a);
});
test('index: error boundaries — top level around <Root/>, and around the Loader with the status panel; Hebrew text + «הצג פרטים»', () => {
    assert.match(idx, /class CrashBoundary extends Component/);
    assert.match(idx, /static getDerivedStateFromError/);
    assert.match(idx, /initializeBlock\(\{\s*interface: \(\) => \(\s*<CrashBoundary fallback=\{\(err, reset\) => <CrashView error=\{err\} onRetry=\{reset\} \/>\}>\s*<Root \/>/);
    assert.match(idx, /<CrashBoundary\s+fallback=\{\(err, reset\) => \(\s*<>\s*<CrashView error=\{err\} onRetry=\{reset\} \/>\s*<StatusSafe>\s*<TimelineStatus force/);
    assert.match(idx, /<Loader variant=\{variant\} paneConfigTable=\{configTable\} \/>\s*<\/CrashBoundary>/);
    assert.match(idx, /הטיימליין נתקל בשגיאה ולא הוצג/);
    assert.match(idx, /'הסתר פרטים' : 'הצג פרטים'/);
    assert.match(idx, /function StatusSafe/);
    assert.match(idx, /const statusOn = !!props\.force \|\| isStatusOn/);
});
test('Timeline: day separators use NO_DAY as a fallback (no raw days[k].date)', () => {
    assert.match(tl, /const d = p\.days\[s\.k\] \?\? NO_DAY;/);
    assert.doesNotMatch(tl, /days\[0\]\.date|days\[k\]\.date/);
});
