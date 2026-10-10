// v0.4.8 (the owner 13:22): PROD «✗ אין שורה ל-«countdown-homescreen»». Even looser Extension/Variant matching
// (trim + every invisible/bidi char + any separator) and a panel that lists what it actually sees.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import * as S from '../frontend/statusCore.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const Module = require('module');
const js = ts.transpileModule(readFileSync(new URL('../frontend/useExtensionConfig.ts', import.meta.url), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
}).outputText;
let recs: unknown[] = [];
const fakeReact = {
    createContext: () => ({Provider: 'P'}), createElement: (type: unknown, props: unknown) => ({type, props}), useContext: () => null,
    useEffect: () => {}, useMemo: (f: () => unknown) => f(), useRef: (v: unknown) => ({current: v}), useState: (v: unknown) => [v, () => {}],
};
const orig = Module._load;
Module._load = function (r: string, ...a: unknown[]) {
    if (r === 'react') return fakeReact;
    if (r.startsWith('@airtable')) return {useRecords: () => recs};
    return orig.call(this, r, ...a);
};
const m = new Module('h48.js');
m._compile(js, 'h48.js');
Module._load = orig;
const H = m.exports;
const mkBase = (names: string[]) => {
    const fields = names.map((n, i) => ({id: `fldCFG00000000${i}`, name: n}));
    const t = {id: 'tblCFG0000000001', name: 'Extension_Config', fields, getFieldByNameIfExists: (n: string) => fields.find(f => f.name === n) ?? null, getFieldByIdIfExists: () => null};
    return {tables: [t], getTableByNameIfExists: (n: string) => (n === t.name ? t : null), getTableByIdIfExists: () => null};
};
const rec = (c: Record<string, string>) => ({id: 'rec1', getCellValue: (n: string) => c[n] ?? null, getCellValueAsString: (n: string) => c[n] ?? ''});
const run = (rows: unknown[], names = ['Extension', 'Variant', 'Title']) => {
    recs = rows;
    const el = H.ExtensionConfigProvider({base: mkBase(names), slug: 'countdown-homescreen', variant: '', version: 't', defaults: {Title: 'D'}, docs: {}});
    return el.type(el.props).props.value;
};

const SPELLINGS = [
    'countdown homescreen', 'Countdown-Homescreen', 'countdown_homescreen', '  countdown-homescreen  ', 'Countdown Homescreen\u200F',
    '\u202Bcountdown-homescreen\u202C', '\u2066countdown\u00A0homescreen\u2069', 'countdown\u2013homescreen', 'countdown\u00ADhomescreen',
    'countdown\u061C-homescreen', 'COUNTDOWN.HOMESCREEN', 'countdown\u200Bhomescreen\uFEFF', 'ｃｏｕｎｔｄｏｗｎ-homescreen',
];
test('looseKey: every spelling the owner could type equals the slug', () => {
    for (const v of SPELLINGS) assert.equal(S.looseKey(v), 'countdownhomescreen', JSON.stringify(v));
    assert.notEqual(S.looseKey('countdown-homescreen-2'), S.looseKey('countdown-homescreen'));
    assert.equal(S.variantKey(' \u200Fdefault '), '');
    assert.equal(S.variantKey('ברירת\u00A0מחדל'), '');
});
test('hook v3.4: same spellings match the row (status ok, Title read)', () => {
    for (const v of SPELLINGS) {
        const cfg = run([rec({Extension: v, Title: 'כותרת'})]);
        assert.equal(cfg.status, 'ok', JSON.stringify(v));
        assert.equal(cfg.text('Title'), 'כותרת');
    }
});
test('hook v3.4: Extension / Variant FIELDS found loosely («Extension », «extension», «VARIANT»)', () => {
    const cfg = run([rec({'Extension ': 'countdown-homescreen', VARIANT: '\u200F', Title: 'T'})], ['Extension ', 'VARIANT', 'Title']);
    assert.equal(cfg.status, 'ok');
    assert.equal(cfg.text('Title'), 'T');
    assert.deepEqual(cfg.debug.extensionValues, ['countdown-homescreen']);
});
test('hook: a Variant row still does not steal the default row; other extensions never match', () => {
    assert.equal(run([rec({Extension: 'countdown homescreen', Variant: 'big', Title: 'V'})]).status, 'no-record');
    assert.equal(run([rec({Extension: 'countdown-homescreen-old', Title: 'X'})]).status, 'no-record');
});
test('panel core: no match → Extension AND Variant values it sees; invisible chars made visible; ≤ 10 shown', () => {
    const rows = [
        {id: 'a', extension: 'countdown homescreen\u200F', variant: 'big'},
        {id: 'b', extension: 'timeline-festival-days', variant: ''},
        {id: 'c', extension: 'bulk-sheet', variant: ' x '},
    ];
    const s = S.rowSummary(rows, 'countdown-homescreen', '')!;
    assert.equal(s.match, null);
    assert.deepEqual(s.extensionValues, ['countdown homescreen\u200F', 'timeline-festival-days', 'bulk-sheet']);
    assert.deepEqual(s.variantValues, ['big', '', ' x ']);
    assert.equal(s.sameExtension.length, 1);
    assert.equal(S.visibleChars('countdown\u200F'), 'countdown⟨U+200F⟩');
    assert.equal(S.visibleChars(' a '), '␠a␠');
    assert.equal(S.SEEN_VALUES_MAX, 10);
    assert.equal(S.looseField([{name: 'Extension '}, {name: 'x'}], 'Extension')!.name, 'Extension ');
    assert.equal(S.STATUS_PANEL_VERSION, 'status-panel v4');
});
test('StatusPanel: NoRow block lists values (≤ SEEN_VALUES_MAX) + Extension / Variant field visibility', () => {
    const src = readFileSync(new URL('../frontend/StatusPanel.tsx', import.meta.url), 'utf8');
    assert.match(src, /function NoRow/);
    assert.match(src, /ערכי Extension שנראים/);
    assert.match(src, /ערכי Variant שנראים/);
    assert.match(src, /שדה Variant:/);
    assert.match(src, /hasVariantField=\{!!vf\}/);
    assert.match(src, /vals\.slice\(0, SEEN_VALUES_MAX\)/);
    for (const f of ['statusCore.ts', 'StatusPanel.tsx', 'MappingPanel.tsx', 'ConfigEdit.tsx'])
        assert.equal(readFileSync(new URL(`../frontend/${f}`, import.meta.url), 'utf8'), readFileSync(`/workspace/csf-extension-config/status-panel/${f}`, 'utf8'), f);
});
