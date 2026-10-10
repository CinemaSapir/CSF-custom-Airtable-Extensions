// v0.2.6 — band = name only (vertical when crowded), header ⋯ next to ✕ + identical 5 controls, compress defaults ON
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AD_W, BAND_FS, BAND_MIN_FS, bandLabel, keptCompress} from '../frontend/logic/core';
import {TIMELINE_DEFAULTS} from '../frontend/config';
import {CSS} from '../frontend/styles';

test('band label: single lane with room → horizontal at the magnified size', () => {
    const l = bandLabel('הקרנה: גבול פתוח', 200, 60, 1);
    assert.deepEqual(l, {mode: 'h', fs: BAND_FS, lines: 1, clip: false});
});
test('band label: overlapping cards (lanes > 1) and a tall slice → vertical, smaller', () => {
    const l = bandLabel('פאנל: הקולנוע הישראלי בעידן הסטרימינג', 80, 140, 3);
    assert.equal(l.mode, 'v');
    assert.ok(l.fs < BAND_FS && l.fs >= BAND_MIN_FS && !l.clip, JSON.stringify(l));
});
test('band label: name too long for one lane horizontally → vertical', () => {
    const l = bandLabel('פאנל: הקולנוע הישראלי בעידן הסטרימינג והרשתות', 90, 150, 1);
    assert.equal(l.mode, 'v');
});
test('band label: short wide slice → smaller horizontal lines, not a stub', () => {
    const l = bandLabel('הקרנה: גבול פתוח', 103, 38, 2);
    assert.equal(l.mode, 'h');
    assert.ok(!l.clip && l.fs >= BAND_MIN_FS, JSON.stringify(l));
});
test('band label: ellipsis only as the last resort, never below the minimum size', () => {
    const l = bandLabel('שם ארוך מאוד מאוד שלא ייכנס לשום מקום בכלל', 30, 30, 4);
    assert.equal(l.clip, true);
    assert.equal(l.fs, BAND_MIN_FS);
});
test('band: lens markup has the name only (no time) and the full name on hover', () => {
    const src = readFileSync('frontend/Timeline.tsx', 'utf8');
    const lens = src.slice(src.indexOf("className={`lens "), src.indexOf('</div>', src.indexOf("className={`lens ")));
    assert.ok(!/Rng|<small/.test(lens), lens);
    assert.ok(/title=\{i\.name\}/.test(lens) && /className="bn"/.test(lens));
    assert.ok(/\.ev \.lens\.vert b\.bn\{[^}]*writing-mode:vertical-rl/.test(CSS));
});
test('compress: defaults ON (both toggles); a real user choice is kept, an old saved default is not', () => {
    assert.equal(TIMELINE_DEFAULTS.Toggle_1, true);
    assert.equal(TIMELINE_DEFAULTS.Toggle_2, true);
    assert.equal(keptCompress({}, true), true);
    assert.equal(keptCompress({compress: false}, true), true); // pre-v0.2.6 save, never chosen
    assert.equal(keptCompress({compress: true}, true), true);
    assert.equal(keptCompress({compress: false, compressUser: true}, true), false); // chosen OFF since v0.2.6
    assert.equal(keptCompress({compress: false}, false), false); // Extension_Config says OFF
});
test('header: identical controls in one order on every table: ⠿ · funnel · ⋯ · ✕ (v0.2.11: ⇤ gone, ✕ shrinks)', () => {
    const src = readFileSync('frontend/Timeline.tsx', 'utf8');
    const h = src.slice(src.indexOf('{/* ---------------- column headers'), src.indexOf('{colDrag && colDrag.lineX'));
    const at = (re: RegExp) => h.search(re);
    const ix = [at(/className="hd2"/), at(/className=\{`cf2 /), at(/className="cm2"/), at(/className="cx"/)];
    assert.equal(at(/className="sh"/), -1, 'v0.2.11: no ⇤ in the column header');
    assert.ok(ix.every(x => x > 0), JSON.stringify(ix));
    assert.deepEqual([...ix].sort((a, b) => a - b), ix);
    assert.ok(!/t === 'Lodging' \? \(\s*<a/.test(h), 'no table-specific controls');
    assert.equal(AD_W, 150);
    assert.ok(!/\.cols>div\.adonly \.(cx|hd2|cf2)\{display:none\}/.test(CSS.slice(CSS.indexOf('v0.2.6 (the owner 10:41)'))));
});
test('window pills: ▾ · ⇤ · ✕ in the header order; ⇤ shrinks to the far-left strip, ✕ hides', () => {
    const src = readFileSync('frontend/Timeline.tsx', 'utf8');
    const w = src.slice(src.indexOf('<span className="wpills"'), src.indexOf('<span className="wemp">'));
    const ix = [w.search(/className=\{`vdd /), w.search(/className="sh"/), w.search(/className="x"/)];
    assert.ok(ix.every(x => x > 0) && ix[0] < ix[1] && ix[1] < ix[2], JSON.stringify(ix));
    assert.ok(/setWOff\(o => toggleIn\(o, x\.t\)\)\}>\s*⇤/.test(w) && /setWHide\(o => toggleIn\(o, x\.t\)\)\}>\s*✕/.test(w));
});
