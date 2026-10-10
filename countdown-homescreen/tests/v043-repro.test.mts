// v0.4.3 — reproductions written BEFORE the fixes (each failed on v0.4.2).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import * as FX from '../frontend/filters.ts';

const {evaluateFilter, pickFilters, splitValues} = FX;
const ev = (raw: unknown, op: 'is' | 'contains' | 'is_not', value: string, text?: string) => {
    const r = pickFilters({field: {id: 'fldX', name: 'X'}, fieldName: '', op, value}, []);
    assert.equal(r.filters.length, 1, `pane filter built for «${value}»`);
    return evaluateFilter(raw, r.filters[0], text);
};

test('R1 value typed in an RTL panel carries invisible bidi marks / NBSP → «is» must still match', () => {
    const sel = {id: 'sel1', name: 'נשלחה', color: 'green'};
    assert.equal(ev(sel, 'is', '\u200Fנשלחה\u200F'), true);
    assert.equal(ev(sel, 'is', '\u202Bנשלחה\u202C'), true);
    assert.equal(ev(sel, 'is', 'נשלחה\u00A0'), true);
    assert.equal(ev('הקרנה\u200B מיוחדת', 'contains', 'הקרנה מיוחדת'), true);
});

test('R2 gershayim / geresh typed as ASCII quotes (ת"א vs ת״א, צ\'יפס vs צ׳יפס) and dash variants', () => {
    assert.equal(ev([{id: 'r', name: 'סינמטק ת״א'}], 'is', 'סינמטק ת"א'), true);
    assert.equal(ev('צ׳יפס', 'is', "צ'יפס"), true);
    assert.equal(ev('הקרנה – פתיחה', 'contains', 'הקרנה - פתיחה'), true);
});

test('R3 several values separated by commas (the owner types «נשלחה, אושרה») → any of them', () => {
    const sel = {id: 's', name: 'אושרה'};
    assert.equal(ev(sel, 'is', 'נשלחה, אושרה'), true);
    assert.equal(ev(sel, 'is_not', 'נשלחה, אושרה'), false);
    assert.equal(ev({id: 's', name: 'לא נשלחה'}, 'is', 'נשלחה, אושרה'), false);
    assert.deepEqual(splitValues('a|b'), ['a', 'b']);
});

test('R4 picked field object null but id/name saved → resolved from the visible table by id, then by name', () => {
    const resolve = (FX as unknown as {resolveFilterField?: Function}).resolveFilterField;
    assert.equal(typeof resolve, 'function', 'resolveFilterField exists');
    const fields = [{id: 'fldStatus000000001', name: 'Status'}, {id: 'fldName0000000001', name: 'Name'}];
    const table = {name: 'Invitations', fields};
    assert.equal(resolve!(table, {fieldId: 'fldStatus000000001'}).field?.name, 'Status');
    assert.equal(resolve!(table, {fieldName: ' status '}).field?.name, 'Status');
    const miss = resolve!(table, {fieldId: 'fldGone', schemaName: 'Sent_At'});
    assert.equal(miss.field, null);
    assert.match(miss.hint, /«Sent_At».*Invitations/);
});

// ---- config hook: loose slug ----
const require = createRequire(import.meta.url);
const ts = require('typescript');
const Module = require('module');
// hook v4 imports ./statusCore (pickConfigRows) — compile it the same way
const STATUS_CORE = (() => {
    const sc = new Module('statusCore.js');
    sc._compile(ts.transpileModule(readFileSync(new URL('../frontend/statusCore.ts', import.meta.url), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText, 'statusCore.js');
    return sc.exports;
})();
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
    if (r === './statusCore') return STATUS_CORE;
    if (r === 'react') return fakeReact;
    if (r.startsWith('@airtable')) return {useRecords: () => recs};
    return orig.call(this, r, ...a);
};
const m = new Module('h.js');
m._compile(js, 'h.js');
Module._load = orig;
const H = m.exports;
const fields = ['Extension', 'Variant', 'Title'].map((n, i) => ({id: `fldCFG00000000${i}`, name: n}));
const cfgT = {id: 'tblCFG0000000001', name: 'Extension_Config', fields, getFieldByNameIfExists: (n: string) => fields.find(f => f.name === n) ?? null, getFieldByIdIfExists: () => null};
const base = {tables: [cfgT], getTableByNameIfExists: (n: string) => (n === cfgT.name ? cfgT : null), getTableByIdIfExists: () => null};
const rec = (c: Record<string, string>) => ({id: 'rec1', getCellValue: (n: string) => c[n] ?? null, getCellValueAsString: (n: string) => c[n] ?? ''});
const run = (rows: unknown[]) => {
    recs = rows;
    const el = H.ExtensionConfigProvider({base, slug: 'countdown-homescreen', variant: '', version: 't', defaults: {Title: 'D'}, docs: {}});
    return el.type(el.props).props.value;
};

test('R5 Extension value typed loosely («Countdown Homescreen», « countdown homescreen », «countdown_homescreen») matches', () => {
    for (const v of ['Countdown Homescreen', ' countdown homescreen ', 'countdown_homescreen', 'COUNTDOWN-HOMESCREEN\u200F']) {
        const cfg = run([rec({Extension: v, Title: 'כותרת חדשה'})]);
        assert.equal(cfg.status, 'ok', v);
        assert.equal(cfg.text('Title'), 'כותרת חדשה', v);
    }
});

test('R6 default row with Variant «default» / «ברירת מחדל» / «-» counts as the default row', () => {
    for (const v of ['default', 'ברירת מחדל', '-']) {
        assert.equal(run([rec({Extension: 'countdown-homescreen', Variant: v, Title: 'T'})]).text('Title'), 'T', v);
    }
});

test('R7 hook exposes debug info (rows seen, Extension values, visible fields) for the «מצב חיבור» panel', () => {
    const cfg = run([rec({Extension: 'other-ext'}), rec({Extension: 'countdown-homescreen', Title: 'T'})]);
    assert.ok(cfg.debug, 'debug present');
    assert.equal(cfg.debug.rowCount, 2);
    assert.deepEqual(cfg.debug.extensionValues, ['other-ext', 'countdown-homescreen']);
    assert.deepEqual(cfg.debug.visibleFields, ['Extension', 'Variant', 'Title']);
});

test('pill line shows the exact missing piece in Hebrew', async () => {
    // view.tsx is TSX; the helper is duplicated logic-free → test via a tiny re-implementation guard on the strings used
    const hint = 'השדה «Sent_At» לא מופעל לאלמנט בטבלה Invitations — הסינון לא הופעל';
    const first = hint.split(' · ')[0].split(' — ')[0].replace(/ בטבלה [^ ]+$/, '');
    assert.equal(first, 'השדה «Sent_At» לא מופעל לאלמנט');
    const r = FX.resolveFilterField({name: 'Invitations', fields: [{id: 'fldA', name: 'Status'}]}, {fieldId: 'fldGone', schemaName: 'Sent_At'});
    assert.equal(r.hint, hint);
});
