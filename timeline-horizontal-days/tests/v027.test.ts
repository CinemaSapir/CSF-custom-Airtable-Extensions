// v0.2.7 — shared «מצב חיבור» status panel (status-panel v1) + right-pane toggle, default OFF
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STATUS_TOGGLE_KEY, STATUS_TOGGLE_LABEL, isStatusOn, statusToggleProperty} from '../frontend/statusCore';

const src = readFileSync('frontend/index.tsx', 'utf8');

test('toggle: exact label, boolean, default OFF', () => {
    const p = statusToggleProperty();
    assert.equal(p.key, STATUS_TOGGLE_KEY);
    assert.equal(p.label, 'show מצב חיבור · Extension_Config');
    assert.equal(STATUS_TOGGLE_LABEL, p.label);
    assert.equal(p.type, 'boolean');
    assert.equal(p.defaultValue, false);
    assert.equal(isStatusOn(undefined), false);
    assert.equal(isStatusOn(true), true);
});
test('index: toggle in the right pane, panel only when ON, not tied to edit mode', () => {
    assert.match(src, /statusToggleProperty\(\)/);
    // v0.2.9: the dock also hosts the mapping panel → null only when BOTH toggles are OFF
    assert.match(src, /const statusOn = isStatusOn\(cp\[STATUS_TOGGLE_KEY\]\);/);
    // v0.2.10: + the «עריכה ישירה» editor in the same dock → null only when ALL three toggles are OFF
    assert.match(src, /if \(!statusOn && !mappingOn && !editOn\) return null;/);
    assert.doesNotMatch(src.slice(src.indexOf('function TimelineStatus')), /isEditMode|editMode/);
});
test('index: filter rows use the SAME colDefaults + passCol as the columns', () => {
    const s = src.slice(src.indexOf('function TimelineStatus'));
    assert.match(s, /passCol\(i as never, colDefaults\)/);
    assert.match(src, /<TimelineStatus st=\{st\} loaded=\{tableData\} items=\{res\.items\} tableFilters=\{tableFilters\} colDefaults=\{colDefaults\} hiddenN=\{hiddenN\} \/>/);
});
test('shared files are byte-identical to the status-panel master', () => {
    for (const f of ['statusCore.ts', 'StatusPanel.tsx']) {
        assert.equal(readFileSync(`frontend/${f}`, 'utf8'), readFileSync(`/workspace/csf-extension-config/status-panel/${f}`, 'utf8'), f);
    }
});
