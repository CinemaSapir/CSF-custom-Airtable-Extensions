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
