import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as S from './statusCore.ts';

test('toggle: exact label, default OFF, only true is ON', () => {
    assert.deepEqual(S.statusToggleProperty(), {key: 'showStatusPanel', label: 'show מצב חיבור · Extension_Config', type: 'boolean', defaultValue: false});
    assert.equal(S.isStatusOn(true), true);
    for (const v of [false, undefined, null, 'true', 1]) assert.equal(S.isStatusOn(v), false);
});
test('rowSummary: loose Extension + default-variant words', () => {
    const rows = [
        {id: 'r1', extension: 'Countdown Homescreen', variant: 'ברירת מחדל'},
        {id: 'r2', extension: 'timeline', variant: 'כל הימים'},
        {id: 'r3', extension: 'timeline', variant: ''},
    ];
    assert.equal(S.rowSummary(rows, 'countdown-homescreen', '')!.match!.id, 'r1');
    assert.equal(S.rowSummary(rows, 'timeline', '')!.match!.id, 'r3');
    assert.equal(S.rowSummary(rows, 'timeline', 'כל הימים')!.match!.id, 'r2');
    const s = S.rowSummary(rows, 'lists-ui', '')!;
    assert.equal(s.match, null);
    assert.equal(s.count, 3);
    assert.deepEqual(s.extensionValues, ['Countdown Homescreen', 'timeline']);
    assert.equal(S.rowSummary(null, 'x', ''), null);
});
test('missingFields + compactNames', () => {
    assert.deepEqual(S.missingFields(['Title', 'Color_1', 'Source_Table_2'], ['title', 'Source Table 2']), ['Color_1']);
    assert.equal(S.compactNames(['Extension', 'Filter_1', 'Filter_2', 'Filter_3', 'Color_3', 'Color_7']), 'Extension, Filter_1–3, Color_3–7*');
});
test('overallOk', () => {
    const base = {configFound: true, rowMatched: true, sources: [{label: 'a', table: 'T', via: 'x', ok: true}], missing: []};
    assert.equal(S.overallOk(base), true);
    assert.equal(S.overallOk({...base, rowMatched: false}), false);
    assert.equal(S.overallOk({...base, sources: [{label: 'a', table: null, via: 'x', ok: false}]}), false);
    assert.equal(S.overallOk({...base, filters: [{label: 'f', table: 'T', field: 'F', via: 'לא מופעל ✗', op: 'is', values: [], matched: null, total: null}]}), false);
});

// ---------------- v2: mapping ----------------
const att = (n: string, extra: object = {}) => ({id: 'att' + n, url: `https://dl.airtable.com/${n}.png`, filename: `${n}.png`, type: 'image/png', thumbnails: {large: {url: `https://dl.airtable.com/${n}-large.png`}}, ...extra});
test('mapping toggle: exact label, same shape as the status toggle, default OFF', () => {
    assert.deepEqual(S.mappingToggleProperty(), {key: 'showMappingPanel', label: 'show mapping · Extension_Config.Mapping_Image', type: 'boolean', defaultValue: false});
    assert.deepEqual(Object.keys(S.mappingToggleProperty()), Object.keys(S.statusToggleProperty()));
    assert.equal(S.isMappingOn(true), true);
    for (const v of [false, undefined, 'true']) assert.equal(S.isMappingOn(v), false);
});
test('attachmentsOf: large thumbnail, full URL, file name; PDF has no thumb; javascript: dropped', () => {
    const f = S.attachmentsOf([att('map'), {id: 'p', url: 'https://x.test/a.pdf', filename: 'a.pdf', type: 'application/pdf'}, {url: 'javascript:alert(1)', filename: 'x.png'}]);
    assert.equal(f.length, 2);
    assert.deepEqual(f[0], {id: 'attmap', filename: 'map.png', url: 'https://dl.airtable.com/map.png', thumb: 'https://dl.airtable.com/map-large.png', isImage: true, type: 'image/png'});
    assert.equal(f[1].thumb, null);
    assert.equal(f[1].isImage, false);
    assert.deepEqual(S.attachmentsOf(null), []);
});
test('pickMapping: Variant row first, default row fallback (files and GitHub_URL independently)', () => {
    const base = {tableFound: true, imageField: true, githubField: true, slug: 'lists-ui'};
    const d = {files: S.attachmentsOf([att('d')]), github: 'https://github.com/o/r/tree/main/lists'};
    const v = {files: S.attachmentsOf([att('v1'), att('v2')]), github: null};
    let m = S.pickMapping({...base, variantRow: v, defaultRow: d});
    assert.equal(m.state, 'ok');
    assert.equal(m.from, 'variant');
    assert.equal(m.files.length, 2);
    assert.equal(m.githubFrom, 'default');
    m = S.pickMapping({...base, variantRow: {files: [], github: null}, defaultRow: d});
    assert.equal(m.from, 'default');
    assert.match(m.hint, /שורת ברירת המחדל/);
});
test('pickMapping: Hebrew hints for no table / no row / field not enabled / empty', () => {
    const b = {tableFound: true, imageField: true, githubField: true, slug: 'bulk-sheet', variantRow: null};
    assert.equal(S.pickMapping({...b, tableFound: false, defaultRow: null}).state, 'no-table');
    assert.match(S.pickMapping({...b, defaultRow: null}).hint, /אין שורה ל-«bulk-sheet»/);
    const nf = S.pickMapping({...b, imageField: false, githubField: false, defaultRow: {files: [], github: null}});
    assert.equal(nf.state, 'no-field');
    assert.match(nf.hint, /Mapping_Image לא מופעל לאלמנט/);
    assert.equal(nf.githubState, 'no-field');
    const e = S.pickMapping({...b, defaultRow: {files: [], github: null}});
    assert.equal(e.state, 'empty');
    assert.match(e.hint, /ריק/);
    assert.equal(e.githubState, 'empty');
});
test('safeHttpUrl: only http(s)', () => {
    assert.equal(S.safeHttpUrl(' https://github.com/x '), 'https://github.com/x');
    for (const v of ['javascript:alert(1)', 'data:text/html,x', '', null, 'not a url']) assert.equal(S.safeHttpUrl(v), null);
});
