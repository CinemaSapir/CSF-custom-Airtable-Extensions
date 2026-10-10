// v0.2.3 — palette B from SDK colours, band title once, all-day-only columns → strips (regression)
import {test} from 'node:test';
import assert from 'node:assert/strict';
import colorUtils from '../node_modules/@airtable/blocks/dist/esm/shared/color_utils.js';
import {SDK_CHROME, buildDays, colourOf, columnStates, contrast, fillOf, lensPlan, lineOf, sdkHue, sdkVars, type HexOf, type Item} from '../frontend/logic/core';
import {TIMELINE_DEFAULTS} from '../frontend/config';
import {CSS} from '../frontend/styles';
import {readFileSync} from 'node:fs';

const hex: HexOf = n => (n ? (colorUtils as {getHexForColor: (s: string) => string | null}).getHexForColor(n) : null);
const rows = String(TIMELINE_DEFAULTS.Option_List_6)
    .split('\n')
    .map(r => r.split('|').map(x => x.trim()));

test('palette: Option_List_6 defaults are Critic option B SDK fill names', () => {
    const want: {[t: string]: string} = {
        Slots_Events: 'blueLight2', Staffing: 'tealLight2', Invitations: 'tealLight1', Itinerary: 'purpleLight2', Lodging: 'purpleLight2', 'Booking Resources': 'purpleLight1',
        Tasks: 'greenLight1', 'Social Posts': 'greenLight2', 'Petty Cash': 'yellowLight2', Requests: 'orangeLight2', transactions: 'yellowLight1', Notebook: 'grayLight2', Approvals: 'orangeLight1',
    };
    assert.equal(rows.length, 13);
    for (const [t, , c] of rows) assert.equal(c, want[t], t);
    assert.deepEqual([TIMELINE_DEFAULTS.Color_1, TIMELINE_DEFAULTS.Color_2, TIMELINE_DEFAULTS.Color_3], ['grayLight2', 'cyanLight2', 'yellowLight2']);
});

test('palette: line = <hue>Dark1 from the SDK, fill = the named colour; card text #444444 ≥ 4.5:1 on every fill; line ≥ 3:1 on white', () => {
    assert.equal(sdkHue('tealLight2'), 'teal');
    assert.equal(lineOf('tealLight2', hex), '#06a09b');
    assert.equal(fillOf('tealLight2', hex), '#c2f5e9');
    assert.equal(lineOf('grayLight2', hex), '#444444');
    for (const [t, , c] of rows) {
        const f = fillOf(c, hex),
            l = lineOf(c, hex);
        assert.ok(contrast('#444444', f) >= 4.5, `${t} ink on ${f}`);
        assert.ok(contrast(l, '#ffffff') >= 3, `${t} line ${l}`);
    }
    // legacy hex still works; unknown → gray
    assert.equal(lineOf('#3f7f8c', hex), '#3f7f8c');
    assert.equal(fillOf('#3f7f8c', hex), '#3f7f8c1c');
    assert.equal(lineOf('nonsense', hex), '#444444');
    assert.equal(colourOf('cyanLight2', hex, 'grayLight2'), '#d0f0fd');
    assert.equal(colourOf('', hex, 'yellowLight2'), '#ffeab6');
    assert.equal(colourOf('#123456', hex, 'grayLight2'), '#123456');
});

test('palette: chrome vars come from colorUtils at runtime; no copied SDK hex table / old palette hex in the code', () => {
    const v = sdkVars(hex);
    assert.equal(Object.keys(v).length, SDK_CHROME.length);
    assert.equal(v['--sdk-redDark1'], '#ba1e45');
    assert.deepEqual(sdkVars(() => null), {});
    const used = new Set([...CSS.matchAll(/--sdk-([A-Za-z0-9]+)/g)].map(m => m[1]));
    for (const n of used) assert.ok(SDK_CHROME.includes(n), `CSS uses --sdk-${n} but it is not set at runtime`);
    const OLD = ['#a35d52', '#faf7f2', '#c9847a', '#c9b36a', '#8a94c4', '#6aabb8', '#7eb58a', '#3f7f8c', '#2f2f2f', '#dc043b', '#fdf9f4', '#fffdf9', '#f4efe6', '#e2d9ca', '#776f64', '#857d71', '#6c5a9e'];
    const files = ['frontend/styles.ts', 'frontend/Timeline.tsx', 'frontend/EditUi.tsx', 'frontend/index.tsx', 'frontend/config.ts'].map(f => readFileSync(f, 'utf8').toLowerCase());
    for (const o of OLD) for (const f of files) assert.ok(!f.includes(o), o);
    const hexes = new Set(CSS.toLowerCase().match(/#[0-9a-f]{3,8}\b/g));
    assert.deepEqual([...hexes].sort(), ['#000', '#fff']);
    for (const f of files) assert.ok(!/"blueDark1":\s*"#/.test(f), 'no copied SDK table');
});

test('palette: redDark1 only for Now + the cross-section (+ v0.2.4 centre day label, the owner asked crimson)', () => {
    const rules = CSS.split('}').filter(r => r.includes('--sdk-redDark1') || r.includes('--sdk-redLight1') || r.includes('var(--acc)'));
    for (const r of rules) {
        const sel = r.split('{')[0];
        assert.ok(/band|\.bl|tnow|nowl|clock|\.ctr|lens|wc\.now|--acc|\.tl\b|:root/.test(sel) || /--acc:/.test(r), `red used by: ${sel.trim()}`);
    }
});

test('band: the lens takes over the card head when the band reaches the title (title shows once)', () => {
    // «הקרנה: גבול פתוח» case: card starts 8px above the band bottom edge → slice at top 0
    assert.deepEqual(lensPlan({top: 0, height: 25}, 118), {top: 0, minH: 25, maxH: 118, head: true});
    // band starts inside the title zone (card top just above the band) → snap to the card top, own title hidden
    assert.deepEqual(lensPlan({top: 22, height: 60}, 200), {top: 0, minH: 82, maxH: 200, head: true});
    // band far below the title → a plain slice, own title stays where it is (no overlap)
    assert.deepEqual(lensPlan({top: 160, height: 80}, 400), {top: 160, minH: 80, maxH: 80, head: false});
    assert.equal(lensPlan(null, 100), null);
    assert.equal(lensPlan({top: 300, height: 12}, 320), null); // sliver at the card bottom → no lens
    assert.ok(/\.ev\.lenshead>b,\.ev\.lenshead>small\{visibility:hidden\}/.test(CSS));
});

test('REGRESSION strips: a column with only all-day items goes to the strips when that row is off screen (count 0)', () => {
    const days = buildDays('2026-10-16', '2026-11-10', '2026-11-01');
    const k = days.findIndex(d => d.date === '2026-11-02');
    const T = ['Slots_Events', 'Tasks', 'Social Posts', 'Booking Resources', 'Notebook'];
    const base = {table: 'Slots_Events', id: 'x', name: 'x', s: null, e: null, date: null, dateEnd: null, sub: '', inherited: false, flag: null, hall: [], people: [], films: [], status: null, st: null, slots: []};
    const timed: Item[] = [{...base, id: 's', s: k * 1440 + 14 * 60, e: k * 1440 + 15 * 60}] as Item[];
    const allday: Item[] = (['Tasks', 'Social Posts', 'Booking Resources'] as const).map(t => ({...base, table: t, id: t, date: '2026-11-02', dateEnd: '2026-11-02'})) as Item[];
    const o = {closed: new Set<string>(), forceOpen: new Set<string>(), collapseEmpty: true};
    const off = columnStates(k, days, T, timed, allday, {...o, allDayInView: false});
    for (const t of ['Tasks', 'Social Posts', 'Booking Resources']) {
        assert.equal(off[t].collapsed, true, t);
        assert.equal(off[t].adHidden, true, t);
        assert.equal(off[t].count, 1, t);
    }
    assert.equal(off.Slots_Events.collapsed, false);
    assert.equal(off.Notebook.collapsed, true);
    assert.equal(off.Notebook.adHidden, false);
    // the day's all-day row on screen → they open at the narrow all-day width (v0.1.1 rule, unchanged)
    const on = columnStates(k, days, T, timed, allday, {...o, allDayInView: true});
    for (const t of ['Tasks', 'Social Posts', 'Booking Resources']) assert.deepEqual([on[t].collapsed, on[t].allDayOnly], [false, true], t);
    // default (no flag) keeps the old behaviour for callers that don't know; collapse OFF never strips; a click forces it open
    assert.equal(columnStates(k, days, T, timed, allday, o).Tasks.collapsed, false);
    assert.equal(columnStates(k, days, T, timed, allday, {...o, collapseEmpty: false, allDayInView: false}).Tasks.collapsed, false);
    assert.equal(columnStates(k, days, T, timed, allday, {...o, forceOpen: new Set(['Tasks']), allDayInView: false}).Tasks.collapsed, false);
});
