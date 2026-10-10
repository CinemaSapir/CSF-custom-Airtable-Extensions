// useExtensionConfig (countdown copy): Door 1 layering is live from the records, Door 2 writes are OFF.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {safeHex, CONFIG_DEFAULTS} from '../frontend/config.ts';
import {computeTarget, isScheduledStatus} from '../frontend/festivalTarget.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const Module = require('module');
// hook v4 imports ./statusCore (pickConfigRows) — compile it the same way
const STATUS_CORE = (() => {
    const sc = new Module('statusCore.js');
    sc._compile(ts.transpileModule(readFileSync(new URL('../frontend/statusCore.ts', import.meta.url), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText, 'statusCore.js');
    return sc.exports;
})();
const src = readFileSync(new URL('../frontend/useExtensionConfig.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(src, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;

let effects = 0;
let currentRecords: unknown[] = [];
const fakeReact = {
    createContext: () => ({Provider: 'Provider'}),
    createElement: (type: unknown, props: unknown) => ({type, props}),
    useContext: () => null,
    useEffect: (fn: () => void) => {
        effects++;
        fn();
    },
    useMemo: (fn: () => unknown) => fn(),
    useRef: (v: unknown) => ({current: v}),
    useState: (v: unknown) => [v, () => {}],
};
const origLoad = Module._load;
Module._load = function (r: string, ...a: unknown[]) {
    if (r === './statusCore') return STATUS_CORE;
    if (r === 'react') return fakeReact;
    if (r.startsWith('@airtable')) return {useRecords: () => currentRecords};
    return origLoad.call(this, r, ...a);
};
const m = new Module('useExtensionConfig.js');
m._compile(js, 'useExtensionConfig.js');
Module._load = origLoad;
const E = m.exports;

type Cell = unknown;
let writes = 0;
const mkTable = (id: string, name: string, fieldNames: string[]) => {
    const fields = fieldNames.map((n, i) => ({id: `fld${id.slice(3, 9)}${String(i).padStart(8, '0')}`, name: n, config: {type: 'singleLineText'}}));
    return {
        id, name, fields,
        getFieldByNameIfExists: (n: string) => fields.find(f => f.name === n) ?? null,
        getFieldByIdIfExists: (i: string) => fields.find(f => f.id === i) ?? null,
        hasPermissionToUpdateRecord: () => true,
        hasPermissionToCreateRecord: () => true,
        updateRecordAsync: async () => { writes++; },
        createRecordAsync: async () => { writes++; },
    };
};
const rec = (id: string, cells: Record<string, Cell>) => ({
    id,
    getCellValue: (n: string) => cells[n] ?? null,
    getCellValueAsString: (n: string) => {
        const v = cells[n];
        return v === null || v === undefined ? '' : typeof v === 'boolean' ? (v ? 'checked' : '') : String(v);
    },
});
const cfgT = mkTable('tblCFGCFGCFGCFGCF', 'Extension Config', ['Extension', 'Variant', 'Title', 'Content_Text_3', 'Source_Table_4', 'Option_List_1', 'Date_1', 'Date_2', 'Color_3', 'Filter_1', 'Filter_Operator_1', 'Filter_Value_1', 'Use_Defaults_Only', 'Slot_Map', 'Code_Version']);
const filmsT = mkTable('tblFILMFILMFILMFI', 'Films 2026', ['Name']);
const base = {
    tables: [cfgT, filmsT],
    getTableByNameIfExists: (n: string) => [cfgT, filmsT].find(t => t.name === n) ?? null,
    getTableByIdIfExists: (i: string) => [cfgT, filmsT].find(t => t.id === i) ?? null,
};
const DEFAULTS = {...CONFIG_DEFAULTS, Date_2: '2026-10-31T00:00:00+03:00'};

function render(records: unknown[], configTable?: unknown, w = false) {
    currentRecords = records;
    effects = 0;
    const el = E.ExtensionConfigProvider({base, configTable, slug: 'countdown-homescreen', variant: '', version: '0.4.1', defaults: DEFAULTS, docs: {}, writes: w});
    const inner = el.type(el.props); // WithTable / WithoutTable → Ctx.Provider element
    return inner.props.value;
}

test('table found loosely by name («Extension Config» ≈ Extension_Config)', () => {
    assert.equal(E.findConfigTable(base)?.id, cfgT.id);
});

test('Door 1: row cells win, empty cells fall back to code defaults, edits are live', () => {
    const row = {Extension: 'countdown-homescreen', Variant: '', Title: 'שבוע הפסטיבל!', Source_Table_4: 'films 2026', Option_List_1: 'משובץ\nמאושר', Date_1: '2026-10-25T17:00:00.000Z', Date_2: '2026-11-01T00:00:00.000Z', Color_3: '#123456', Filter_1: 'Films 2026.Name', Filter_Operator_1: 'contains', Filter_Value_1: 'א|ב'};
    const cfg = render([rec('rec1', {Extension: 'other', Title: 'x'}), rec('rec2', row)]);
    assert.equal(cfg.status, 'ok');
    assert.equal(cfg.text('Title'), 'שבוע הפסטיבל!');
    assert.equal(cfg.text('Content_Text_3'), 'סרטים'); // empty cell → default
    assert.equal(cfg.text('Content_Text_4'), 'אירועים'); // field absent → default
    assert.equal(cfg.table('Source_Table_4')?.id, filmsT.id); // loose table name
    assert.deepEqual(cfg.options('Option_List_1').map((o: {value: string}) => o.value), ['משובץ', 'מאושר']);
    assert.equal(cfg.date('Date_1').toISOString(), '2026-10-25T17:00:00.000Z');
    assert.equal(cfg.raw('Filter_Operator_1'), 'contains');
    assert.equal(cfg.raw('Color_3'), '#123456');
    // live: a new records array (cell edited) → new value on the next render
    const cfg2 = render([rec('rec2', {...row, Title: 'עודכן'})]);
    assert.equal(cfg2.text('Title'), 'עודכן');
});

test('Door 2 is OFF: no create/update even with no row, old Code_Version, write permission', async () => {
    writes = 0;
    render([]); // no row → would create it if writes were on
    render([rec('rec2', {Extension: 'countdown-homescreen', Code_Version: '0.0.1'})]);
    await new Promise(r => setTimeout(r, 10));
    assert.ok(effects > 0, 'the effect did run');
    assert.equal(writes, 0);
});

test('no row / Use_Defaults_Only / no table / explicit null → code defaults', () => {
    assert.equal(render([]).status, 'no-record');
    assert.equal(render([]).text('Title'), 'יאללה היידה!');
    const off = render([rec('r', {Extension: 'countdown-homescreen', Title: 'X', Use_Defaults_Only: true})]);
    assert.equal(off.status, 'defaults-only');
    assert.equal(off.text('Title'), 'יאללה היידה!');
    const none = render([], null);
    assert.equal(none.status, 'no-table');
    assert.equal(none.text('Title'), 'יאללה היידה!');
});

test('Option_List_1 statuses + Date_1/Date_2 drive the timer', () => {
    assert.equal(isScheduledStatus('מאושר', ['משובץ', 'מאושר']), true);
    assert.equal(isScheduledStatus('מאושר'), false);
    assert.equal(isScheduledStatus('משובצ'), false);
    assert.equal(isScheduledStatus(''), false);
    const slots = [
        {name: 'A', startMs: Date.parse('2026-10-31T14:00:00Z'), endMs: null, status: 'מאושר'},
        {name: 'B', startMs: Date.parse('2026-11-01T14:00:00Z'), endMs: null, status: 'משובץ'},
    ];
    const now = Date.parse('2026-10-10T00:00:00Z');
    assert.equal(computeTarget({kind: 'ok', slots}, now).slotLine?.startsWith('B'), true);
    assert.equal(computeTarget({kind: 'ok', slots}, now, {statuses: ['משובץ', 'מאושר']}).slotLine?.startsWith('A'), true);
    assert.equal(computeTarget({kind: 'ok', slots}, now, {firstDay: '2026-11-02'}).phase, 'fallback');
    const fb = computeTarget({kind: 'noTable'}, now, {fallbackMs: Date.parse('2026-10-25T17:00:00Z')});
    assert.equal(fb.targetMs, Date.parse('2026-10-25T17:00:00Z'));
    assert.equal(computeTarget({kind: 'noTable'}, now, {fallbackMs: null, firstDay: 'junk'}).targetMs, Date.parse('2026-10-24T17:00:00Z'));
});

test('Color_N: only #hex reaches the CSS', () => {
    assert.equal(safeHex('#abc', '#000'), '#abc');
    assert.equal(safeHex(' #A1B2C3 ', '#000'), '#A1B2C3');
    assert.equal(safeHex('red; } body {display:none', '#000'), '#000');
    assert.equal(safeHex('', '#faf7f2'), '#faf7f2');
});

test('control: the same render WITH writes:true does write (so the OFF test is meaningful)', async () => {
    writes = 0;
    render([], undefined, true);
    await new Promise(r => setTimeout(r, 10));
    assert.equal(writes, 1);
});
