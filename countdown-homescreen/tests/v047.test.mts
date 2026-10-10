// v0.4.7 (the owner 12:57) — Attachment_Mapping_Image (fallback Mapping_Image) + «עריכה ישירה». Based on v0.4.6 — Mapping_Image / GitHub_URL (hook v3.2 extras) + shared MappingPanel / mapping toggle.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {safeHex, CONFIG_DEFAULTS} from '../frontend/config.ts';
import * as S from '../frontend/statusCore.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const Module = require('module');
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
const cfgT = mkTable('tblCFGCFGCFGCFGCF', 'Extension Config', ['Extension', 'Variant', 'Title', 'Content_Text_3', 'Source_Table_4', 'Option_List_1', 'Date_1', 'Date_2', 'Color_3', 'Filter_1', 'Filter_Operator_1', 'Filter_Value_1', 'Use_Defaults_Only', 'Slot_Map', 'Code_Version', 'Attachment_Mapping_Image', 'GitHub_URL']);
const legacyT = mkTable('tblLEGACYLEGACYLE', 'Extension_Config', ['Extension', 'Variant', 'Title', 'Mapping_Image', 'GitHub_URL']);
const filmsT = mkTable('tblFILMFILMFILMFI', 'Films 2026', ['Name']);
const base = {
    tables: [cfgT, filmsT],
    getTableByNameIfExists: (n: string) => [cfgT, filmsT].find(t => t.name === n) ?? null,
    getTableByIdIfExists: (i: string) => [cfgT, filmsT].find(t => t.id === i) ?? null,
};
const DEFAULTS = {...CONFIG_DEFAULTS, Date_2: '2026-10-31T00:00:00+03:00'};

function render(records: unknown[], configTable?: unknown, w = false, variant = '') {
    currentRecords = records;
    effects = 0;
    const el = E.ExtensionConfigProvider({base, configTable, slug: 'countdown-homescreen', variant, version: '0.4.1', defaults: DEFAULTS, docs: {}, writes: w});
    const inner = el.type(el.props); // WithTable / WithoutTable → Ctx.Provider element
    return inner.props.value;
}



const img = (n: string) => ({id: 'att' + n, url: `https://dl.airtable.com/${n}.png`, filename: `${n}.png`, type: 'image/png', thumbnails: {large: {url: `https://dl.airtable.com/${n}-L.png`}}});
function renderOn(t: unknown, records: unknown[]) {
    currentRecords = records;
    const b = {tables: [t], getTableByNameIfExists: () => t, getTableByIdIfExists: () => t};
    const el = E.ExtensionConfigProvider({base: b, configTable: t, slug: 'countdown-homescreen', variant: '', version: '0.4.7', defaults: DEFAULTS, docs: {}});
    return el.type(el.props).props.value;
}
test('hook v3.3: Attachment_Mapping_Image read first; LEGACY Mapping_Image kept as fallback (not a known field)', () => {
    assert.deepEqual(E.EXTRA_FIELDS, {mappingImage: 'Attachment_Mapping_Image', githubUrl: 'GitHub_URL'});
    assert.deepEqual(E.LEGACY_FIELDS, {mappingImage: 'Mapping_Image'});
    assert.ok(!E.KNOWN_FIELDS.includes('Mapping_Image'));
    assert.equal(E.FIELD_ORDER.length, 269);
    const m = render([rec('recD', {Extension: 'countdown-homescreen', Attachment_Mapping_Image: [img('new')]})]).mapping();
    assert.equal(m.files[0].filename, 'new.png');
    assert.equal(m.imageField, true);
});
test('hook v3.3: a table not renamed yet (Mapping_Image) still works', () => {
    const m = renderOn(legacyT, [rec('recD', {Extension: 'countdown-homescreen', Mapping_Image: [img('old')]})]).mapping();
    assert.equal(m.files[0].filename, 'old.png');
    assert.equal(m.imageField, true);
});
test('shared module: labels, edit toggle default OFF, identical files', () => {
    assert.equal(S.MAPPING_TOGGLE_LABEL, 'show mapping · Extension_Config.Attachment_Mapping_Image');
    assert.deepEqual(S.editToggleProperty(), {key: 'inlineEditConfig', label: 'עריכה ישירה · Extension_Config', type: 'boolean', defaultValue: false});
    assert.match(S.STATUS_PANEL_VERSION, /^status-panel v[34]$/);
    for (const f of ['statusCore.ts', 'StatusPanel.tsx', 'MappingPanel.tsx', 'ConfigEdit.tsx'])
        assert.equal(readFileSync(new URL(`../frontend/${f}`, import.meta.url), 'utf8'), readFileSync(`/workspace/csf-extension-config/status-panel/${f}`, 'utf8'), f);
});
test('index: edit toggle in the pane; ConfigEditor gets the hook rows + cfg.raw; hook writes stay OFF', () => {
    const idx = readFileSync(new URL('../frontend/index.tsx', import.meta.url), 'utf8');
    assert.match(idx, /statusToggleProperty\(\), mappingToggleProperty\(\), editToggleProperty\(\)/);
    assert.match(idx, /<ConfigEditor\s+on=\{edit\.on\}\s+configTable=\{status\.configTable\}\s+record=\{status\.record\}\s+variantRecord=\{status\.variantRecord\}/);
    assert.match(idx, /edit=\{\{on: isEditOn\(P\[EDIT_TOGGLE_KEY\]\), valueOf: s => cfg\.raw\(s as Slot\)\}\}/);
    assert.doesNotMatch(idx, /writes: true|writes=\{true\}/);
});
test('ConfigEdit: the ONLY write calls are one-cell update / create-with-confirm on the config table, each permission-checked', () => {
    const ce = readFileSync(new URL('../frontend/ConfigEdit.tsx', import.meta.url), 'utf8');
    const writes = ce.match(/\.(updateRecordAsync|createRecordAsync|deleteRecordAsync|updateRecordsAsync|createRecordsAsync|deleteRecordsAsync)\(/g) ?? [];
    assert.deepEqual(writes.sort(), ['.createRecordAsync(', '.updateRecordAsync(', '.updateRecordAsync(', '.updateRecordAsync(']);
    assert.ok(!/globalConfig|setAsync/.test(ce), 'never writes globalConfig');
    assert.equal((ce.match(/checkPermissionsForUpdateRecord\(row, \{\[f\.id\]/g) ?? []).length, 2);
    assert.match(ce, /checkPermissionsForCreateRecord\(fields\)/);
    assert.match(ce, /\{\[ext\.id\]: p\.slug, \[f\.id\]: c\.value\}/);
});
