// v0.4.6 — Mapping_Image / GitHub_URL (hook v3.2 extras) + shared MappingPanel / mapping toggle.
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
test('hook v3.2: 269-slot FIELD_ORDER untouched; Mapping_Image / GitHub_URL are known extras appended after it', () => {
    assert.equal(E.FIELD_ORDER.length, 269);
    assert.ok(!E.FIELD_ORDER.includes('Attachment_Mapping_Image') && !E.FIELD_ORDER.includes('Mapping_Image') && !E.FIELD_ORDER.includes('GitHub_URL'));
    assert.deepEqual(E.KNOWN_FIELDS.slice(0, 269), [...E.FIELD_ORDER]);
    assert.deepEqual(E.KNOWN_FIELDS.slice(269), ['Attachment_Mapping_Image', 'GitHub_URL']); // v0.4.7: renamed (12:57)
});
test('cfg.mapping(): default row files + GitHub_URL, large thumbnails', () => {
    const cfg = render([rec('recD', {Extension: 'countdown-homescreen', Attachment_Mapping_Image: [img('map')], GitHub_URL: 'https://github.com/o/r/tree/main/countdown'})]);
    const m = cfg.mapping();
    assert.equal(m.from, 'default');
    assert.deepEqual(m.files, [{url: 'https://dl.airtable.com/map.png', filename: 'map.png', thumb: 'https://dl.airtable.com/map-L.png', type: 'image/png'}]);
    assert.equal(m.github, 'https://github.com/o/r/tree/main/countdown');
    assert.equal(m.imageField, true);
});
test('cfg.mapping(): Variant row wins, empty Variant cell falls back to the default row', () => {
    const d = rec('recD', {Extension: 'countdown-homescreen', Attachment_Mapping_Image: [img('d')], GitHub_URL: 'https://github.com/d'});
    let m = render([d, rec('recV', {Extension: 'countdown-homescreen', Variant: 'kiosk', Attachment_Mapping_Image: [img('v')]})], undefined, false, 'kiosk').mapping();
    assert.equal(m.from, 'variant');
    assert.equal(m.files[0].filename, 'v.png');
    assert.equal(m.github, 'https://github.com/d');
    m = render([d, rec('recV', {Extension: 'countdown-homescreen', Variant: 'kiosk'})], undefined, false, 'kiosk').mapping();
    assert.equal(m.from, 'default');
});
test('Door 2 stays OFF with the new fields present', async () => {
    writes = 0;
    render([rec('recD', {Extension: 'countdown-homescreen', Code_Version: '0.0.1', Attachment_Mapping_Image: [img('x')]})]);
    await new Promise(r => setTimeout(r, 10));
    assert.equal(writes, 0);
});
test('index: both toggles in the right pane; MappingPanel next to StatusPanel; shared files = master', () => {
    const idx = readFileSync(new URL('../frontend/index.tsx', import.meta.url), 'utf8');
    assert.match(idx, /statusToggleProperty\(\), mappingToggleProperty\(\)/); // v0.4.7: + editToggleProperty()
    assert.match(idx, /<MappingPanel on=\{mappingOn\} configTable=\{status\.configTable\} record=\{status\.record\} variantRecord=\{status\.variantRecord\}/);
    assert.match(idx, /mappingOn=\{isMappingOn\(P\[MAPPING_TOGGLE_KEY\]\)\}/);
    assert.equal(S.MAPPING_TOGGLE_LABEL, 'show mapping · Extension_Config.Attachment_Mapping_Image');
    for (const f of ['statusCore.ts', 'StatusPanel.tsx', 'MappingPanel.tsx', 'ConfigEdit.tsx'])
        assert.equal(readFileSync(new URL(`../frontend/${f}`, import.meta.url), 'utf8'), readFileSync(`/workspace/csf-extension-config/status-panel/${f}`, 'utf8'), f);
});
