// v0.2.10 — config key «timeline-festival-days» (the owner 13:12 + 13:17) with loose fallbacks; «עריכה ישירה»; Attachment_Mapping_Image
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CONFIG_SLUG, CONFIG_VARIANT, pickConfigKey} from '../frontend/config';
import {EDIT_TOGGLE_LABEL, editToggleProperty} from '../frontend/statusCore';

const src = readFileSync('frontend/index.tsx', 'utf8');
const R = (extension: string, variant = '') => ({extension, variant});
// (removed in the horizontal repo: vertical-only source check «code default key: Extension «timeline-festival-days»…»; horizontal equivalent in tests/h010.test.ts)
// (removed in the horizontal repo: vertical-only source check «the new row wins over every fallback…»; horizontal equivalent in tests/h010.test.ts)
// (removed in the horizontal repo: vertical-only source check «fallback 1: a row Extension «timeline»…»; horizontal equivalent in tests/h010.test.ts)
// (removed in the horizontal repo: vertical-only source check «fallback 2 (PROD today)…»; horizontal equivalent in tests/h010.test.ts)
test('index: the key picked from the rows drives the hook, status, mapping and editor', () => {
    assert.match(src, /slug=\{k\.slug\}\s+variant=\{variant\}/);
    assert.equal((src.match(/slug=\{ckey\.slug\}/g) ?? []).length, 3);
    assert.doesNotMatch(src, /'program-by-day'/);
});
test('«עריכה ישירה» toggle + ConfigEditor in the dock with the hook rows and cfg.raw', () => {
    assert.equal(EDIT_TOGGLE_LABEL, 'עריכה ישירה · Extension_Config');
    assert.equal(editToggleProperty().defaultValue, false);
    assert.match(src, /<ConfigEditor\s+on=\{editOn\}\s+configTable=\{cfgTable\}\s+record=\{cfg\.record\}\s+variantRecord=\{cfg\.variantRecord\}/);
    assert.match(src, /valueOf=\{s => cfg\.raw\(s as Slot\)\}/);
});

test('v0.2.10 (13:22): loose spellings of the key still pick the new row; hook matches values loosely', () => {
    for (const v of ['Timeline Festival Days', ' timeline_festival_days\u200F', '\u202Btimeline-festival-days\u202C']) {
        const k = pickConfigKey([{extension: v, variant: ''}], '');
        assert.equal(k.legacy, false, v);
    }
    const hook = readFileSync('frontend/useExtensionConfig.ts', 'utf8');
    assert.match(hook, /pickConfigRows\(rows, slug, variant\)/); // v0.2.11: hook v4 scored matching (statusCore)
    assert.match(hook, /\\p\{Cf\}/);
});
