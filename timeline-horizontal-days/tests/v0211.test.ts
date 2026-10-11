// v0.2.11 (the owner 16:43 «MAKE SEARCH MORE FLEXIBLE» + 16:50 removed tables). Pure: statusCore.pickConfigRows (= hook v4 + panel v5).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aliasesFor, githubFolder, pickConfigRows, STATUS_PANEL_VERSION, textScore, type MatchRow} from '../frontend/statusCore';
import {REMOVED_TABLES, TABLE_SPECS} from '../frontend/logic/tables';
import {TABLE_LIST, TIMELINE_DEFAULTS} from '../frontend/config';

const SLUG = 'timeline-festival-days';
let n = 0;
const row = (extension: string, variant = '', more: Partial<MatchRow> = {}): MatchRow => ({id: `r${++n}`, primary: '', extension, variant, displayName: '', github: '', ...more});
const OTHERS = [row('countdown-homescreen'), row('lists-ui'), row('people-roles'), row('bulk-sheet'), row('hospitality')];
const pick = (rows: MatchRow[], v = '') => pickConfigRows(rows, SLUG, v);

test('PROD hypothesis B: Extension right but Variant left as «timeline» → that row is the DEFAULT now', () => {
    const t = row(SLUG, 'timeline');
    const p = pick([...OTHERS, t]);
    assert.equal(p.best?.id, t.id);
    assert.equal(p.best?.variantMode, 'alias');
    assert.equal(p.anyVariant, false);
});
test('aliases / spellings: «timeline», «program-by-day», «Timeline Festival Days», «טיימליין», «פרוגרמה», contains', () => {
    for (const v of ['timeline', 'program-by-day', 'Timeline Festival Days', 'טיימליין', 'פרוגרמה', ' timeline_festival_days\u200F', 'csf timeline (days)']) {
        const t = row(v);
        assert.equal(pick([...OTHERS, t]).best?.id, t.id, v);
    }
    assert.equal(textScore(SLUG, aliasesFor(SLUG)).score, 100);
    assert.equal(textScore('Timeline', aliasesFor(SLUG)).score, 90);
    assert.equal(textScore('csf timeline (days)', aliasesFor(SLUG)).score, 60);
});
test('Extension hidden / empty → primary, Display_Name, then GitHub_URL folder', () => {
    const hid = (id: string, primary: string, displayName: string, github: string) => ({id, primary, extension: '', variant: '', displayName, github});
    const rows = [
        hid('pr', 'חיפוש/הוספת/עריכת שם ותפקיד', 'ספר טלפונים – אנשים ותפקידים', 'https://github.com/x/y/tree/main/people-roles'),
        hid('bs', 'קופי פייסט - הזנה מרובה', 'קופי פייסט – הזנה מרובה (אנשים ותפקידים)', 'https://github.com/x/y/tree/main/bulk-sheet'),
        hid('tl', 'טיימליין', 'טיימליין ימים', 'https://github.com/x/y/tree/main/timeline-festival-days'),
        hid('cd', 'יאללה היידה!', 'ספירה לאחור – מסך בית', 'https://github.com/x/y/tree/main/countdown-homescreen'),
    ];
    assert.equal(pick(rows).best?.id, 'tl');
    assert.equal(pick(rows).best?.via, 'primary');
    assert.equal(pickConfigRows(rows, 'people-roles', '').best?.id, 'pr');
    assert.equal(pickConfigRows(rows, 'bulk-sheet', '').best?.id, 'bs');
    assert.equal(pickConfigRows(rows, 'countdown-homescreen', '').best?.id, 'cd');
    assert.equal(githubFolder('https://github.com/x/y/tree/main/timeline-festival-days/'), 'timeline-festival-days');
});
test('Variant: empty preferred; any Variant accepted when nothing else; wanted Variant row found; best score wins + others listed', () => {
    const def = row(SLUG), loc = row(SLUG, 'by-location'), old = row('program-by-day');
    const p = pick([...OTHERS, loc, old, def]);
    assert.equal(p.best?.id, def.id);
    assert.deepEqual(p.ranked.map(r => r.id).slice(0, 3), [def.id, old.id, loc.id]);
    assert.equal(pick([...OTHERS, loc]).best?.id, loc.id);
    assert.equal(pick([...OTHERS, loc]).anyVariant, true);
    const v = pick([...OTHERS, def, loc], 'by-location');
    assert.equal(v.best?.id, def.id);
    assert.equal(v.variantBest?.id, loc.id);
    assert.equal(pick(OTHERS).best, null);
    assert.equal(STATUS_PANEL_VERSION, 'status-panel v5');
});
test('removed tables are gone from the specs, the defaults and the pane; a config cell naming one is skipped silently', () => {
    for (const t of ['Tasks', 'Petty Cash', 'Requests', 'transactions', 'Notebook', 'Approvals']) {
        assert.ok(REMOVED_TABLES.includes(t));
        assert.ok(!TABLE_SPECS.some(s => s.key === t), t);
        assert.ok(!TABLE_LIST.split('\n').some(l => l.split('|')[0].trim() === t), t);
    }
    assert.deepEqual(TABLE_SPECS.map(s => s.key), ['Slots_Events', 'Staffing', 'Invitations', 'Itinerary', 'Lodging', 'Booking Resources', 'Social Posts']);
    assert.equal((TIMELINE_DEFAULTS as {[k: string]: unknown}).Filter_9, undefined);
    const idx = readFileSync('frontend/index.tsx', 'utf8');
    assert.match(idx, /cfg\.options\('Option_List_6'\)\.filter\(r => !isRemoved\(r\.value\)\)/);
    assert.equal((idx.match(/cfg\.options\('Option_List_6'\)/g) ?? []).length, (idx.match(/cfg\.options\('Option_List_6'\)\.filter\(r => !isRemoved/g) ?? []).length);
});
// ---- the owner 17:01
import {WIN_COLS} from '../frontend/HTimeline';
import {CSS} from '../frontend/styles';
const tl = readFileSync('frontend/HTimeline.tsx', 'utf8');
// (removed in the horizontal repo: vertical-only source check «17:01 #1: header ✕ shrinks…»; horizontal equivalent in tests/h010.test.ts)
test('17:01 #3 (+ horizontal v0.1.2 #4: 8 per row): window pills, 2-line title; default Number_2 12', () => {
    assert.equal(WIN_COLS, 8);
    assert.match(CSS, /\.wg\{grid-template-columns:repeat\(6,minmax\(0,1fr\)\)\}/); // shared vertical CSS unchanged; HCSS overrides
    assert.match(CSS, /\.wc \.nm\{[^}]*-webkit-line-clamp:2/);
    assert.equal(TIMELINE_DEFAULTS.Number_2, 12);
});
// (removed in the horizontal repo: vertical-only source check «17:01 #4/#5: window funnel…»; horizontal equivalent in tests/h010.test.ts)
test('17:01 #6: the small date text comes first in the banner centre (= right of «יום N», RTL)', () => {
    const c = tl.slice(tl.indexOf('<div className="ctr"'), tl.indexOf('</div>', tl.indexOf('<div className="ctr"')));
    assert.ok(c.indexOf('<small>') < c.indexOf('className="big"') && c.indexOf('className="big"') < c.indexOf('className="clock'));
});
