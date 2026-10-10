// v0.2.9 — shared mapping panel (status-panel v2): right-pane «show mapping · Extension_Config.Mapping_Image», default OFF; hook v3.2 extras
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {MAPPING_TOGGLE_LABEL, mappingToggleProperty, pickMapping, attachmentsOf} from '../frontend/statusCore';

const src = readFileSync('frontend/index.tsx', 'utf8');
// the hook imports the real SDK (needs the Airtable host) → transpile it and load it with react / SDK stubs (as the countdown tests do)
const req = createRequire(process.cwd() + '/package.json');
const ts = req('typescript');
const Mod = req('module');
const hookJs = ts.transpileModule(readFileSync('frontend/useExtensionConfig.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
const origLoad = Mod._load;
Mod._load = function (r: string, ...a: unknown[]) {
    if (r === 'react') return {createContext: () => ({}), createElement() {}, useContext() {}, useEffect() {}, useMemo() {}, useRef() {}, useState() {}};
    if (r.startsWith('@airtable')) return {useRecords() {}};
    return origLoad.call(this, r, ...a);
};
const hm = new Mod('useExtensionConfig.js');
hm._compile(hookJs, 'useExtensionConfig.js');
Mod._load = origLoad;
const {FIELD_ORDER, KNOWN_FIELDS, EXTRA_FIELDS} = hm.exports as {FIELD_ORDER: string[]; KNOWN_FIELDS: string[]; EXTRA_FIELDS: object};
test('hook v3.2: 269-slot FIELD_ORDER unchanged, Mapping_Image / GitHub_URL appended as known extras', () => {
    assert.equal(FIELD_ORDER.length, 269);
    assert.deepEqual(KNOWN_FIELDS.slice(269), ['Mapping_Image', 'GitHub_URL']);
    assert.deepEqual(EXTRA_FIELDS, {mappingImage: 'Mapping_Image', githubUrl: 'GitHub_URL'});
});
test('toggle: exact label, boolean, default OFF, next to the status toggle', () => {
    assert.equal(MAPPING_TOGGLE_LABEL, 'show mapping · Extension_Config.Mapping_Image');
    assert.deepEqual(mappingToggleProperty(), {key: 'showMappingPanel', label: MAPPING_TOGGLE_LABEL, type: 'boolean', defaultValue: false});
    assert.match(src, /statusToggleProperty\(\),\n\s+\/\/ v0\.2\.9[^\n]*\n\s+mappingToggleProperty\(\),/);
});
test('dock: MappingPanel gets the hook rows (default + Variant) and the same config table', () => {
    assert.match(src, /<MappingPanel on=\{mappingOn\} configTable=\{cfgTable\} record=\{cfg\.record\} variantRecord=\{cfg\.variantRecord\} slug=\{CONFIG_SLUG\} \/>/);
});
test('empty «timeline» Variant row falls back to the default row', () => {
    const d = {files: attachmentsOf([{id: 'a', url: 'https://x.test/m.png', filename: 'm.png', type: 'image/png'}]), github: 'https://github.com/x'};
    const m = pickMapping({tableFound: true, imageField: true, githubField: true, slug: 'program-by-day', variantRow: {files: [], github: null}, defaultRow: d});
    assert.equal(m.from, 'default');
    assert.equal(m.githubFrom, 'default');
});
test('shared files byte-identical to the status-panel master (incl. MappingPanel)', () => {
    for (const f of ['statusCore.ts', 'StatusPanel.tsx', 'MappingPanel.tsx'])
        assert.equal(readFileSync(`frontend/${f}`, 'utf8'), readFileSync(`/workspace/csf-extension-config/status-panel/${f}`, 'utf8'), f);
});
