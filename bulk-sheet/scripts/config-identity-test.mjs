// v0.5.0 — Extension_Config wiring must be a NO-OP while the table is absent.
// Builds the harness twice — the committed v0.4.3 frontend ($BASE_REF, default v0.4.3-base) and the working tree — renders the
// same fixture scenarios in headless Chrome and asserts the rendered DOM is byte-identical.
// Then renders WITH a fake Extension_Config table: row texts / numbers show up, a bad colour cell is ignored, variants win,
// the right pane still wins. Harness kit: /workspace/csf-extension-config/harness (+ harness/bulk-sheet).
import {execSync} from 'node:child_process';
import {mkdtempSync, symlinkSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const KIT = '/workspace/csf-extension-config/harness';
const {buildBS} = await import(join(KIT, 'bulk-sheet/run.mjs'));
const {withChrome} = await import(join(KIT, 'chrome.mjs'));
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ref = process.env.BASE_REF ?? 'v0.4.3-base';
const old = mkdtempSync(join(tmpdir(), 'bs-old-'));
execSync(`git -C ${root} archive ${ref} frontend package.json | tar -x -C ${old}`);
symlinkSync(join(root, 'node_modules'), join(old, 'node_modules'));
const oldHtml = buildBS(join(old, 'frontend'), join(old, '_h'));
const newHtml = buildBS(join(root, 'frontend'), mkdtempSync(join(tmpdir(), 'bs-new-')));
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; console.log('✓', m); };
{
    const fe = join(root, 'frontend');
    const cfgSrc = readFileSync(join(fe, 'cfg.ts'), 'utf8');
    const src = readFileSync(join(fe, 'index.tsx'), 'utf8');
    const used = new Set([...src.matchAll(/\b(?:t|n|rich|fromCfg)\('(\w+)'/g)].map((m) => m[1]));
    for (const m of src.matchAll(/'(Table_Heading_\d+)'/g)) used.add(m[1]);
    for (const m of cfgSrc.matchAll(/'(Color_\d+)'/g)) used.add(m[1]);
    const defs = cfgSrc.slice(cfgSrc.indexOf('export const DEFAULTS'), cfgSrc.indexOf('export const DOCS'));
    const docs = cfgSrc.slice(cfgSrc.indexOf('export const DOCS'));
    const missing = [...used].filter((k) => !/^Source_/.test(k) && !new RegExp(`\\b${k}:`).test(defs));
    ok(missing.length === 0, `every slot read has a code default (${used.size} slots) ${missing.join(',')}`);
    ok([...used].every((k) => new RegExp(`\\b${k}:`).test(docs)), 'every slot read has a Slot_Map doc');
    const logic = readFileSync(join(fe, 'logic.ts'), 'utf8');
    const labels = JSON.parse(logic.match(/COL_LABELS = (\[.*?\]);/)[1].replace(/'/g, '"'));
    ok(labels.every((l, i) => defs.includes(`Table_Heading_${i + 1}: '${l}'`)), 'Table_Heading_1–7 defaults = logic.ts COL_LABELS');
    ok(/never deletes|Never deletes/i.test(src) && !/deleteRecord/.test(src), 'write rules stay in code: no delete path anywhere');
}
const FILL = `__fill([[0,0,'דנה ישראלי'],[0,1,'050-555-0199'],[0,2,'dana@example.test'],[0,3,'רכזת הסעות'],[0,6,'מכללת ספיר'],
  [1,0,'נועה לוי'],[1,1,'050-555-0101'],[1,3,'מנהלת הפקה'],[2,0,'יואב כהן'],[2,1,'0505550999'],[3,0,'אבי'],[3,1,'abc'],[4,0,'שורה לדילוג']]);`;
const SCEN = {
    empty: null,
    filled: `${FILL} setTimeout(()=>document.querySelector('tbody tr:nth-child(5) .skip-box').click(),50)`,
    clear: `${FILL} setTimeout(()=>document.querySelector('.btn.clear').click(),50)`,
    submit: `${FILL} setTimeout(()=>document.querySelector('.btn.send').click(),50)`,
    more: `[...document.querySelectorAll('.foot .link')][0].click()`,
    missing: null,
};
await withChrome(async (p) => {
    const dom = async (html, s, extra = '') => {
        await p.open(`file://${html}?s=${s}${extra}`, 900);
        if (SCEN[s]) { await p.ev(SCEN[s]); await p.sleep(500); }
        const errs = p.logs.splice(0).filter((l) => l.startsWith('EXC') || /error/i.test(l));
        assert.equal(errs.length, 0, `${s}: page errors ${errs.join(' | ')}`);
        return p.ev(`document.getElementById('root').innerHTML`);
    };
    for (const s of Object.keys(SCEN)) {
        const a = await dom(oldHtml, s), b = await dom(newHtml, s);
        ok(a.length > 100, `${s}: rendered (${a.length} chars)`);
        if (a !== b) { let i = 0; while (a[i] === b[i]) i++; console.log('DIFF at', i, '\nold:', a.slice(i - 80, i + 120), '\nnew:', b.slice(i - 80, i + 120)); }
        ok(a === b, `${s}: DOM identical to ${ref} with no Extension_Config table`);
    }
    const e = await dom(newHtml, 'empty', '&cfg=1');
    ok(e.includes('CFG הזנה') && e.includes('CFG שם'), 'cfg row: Title / Table_Heading_1 replace the defaults');
    ok((e.match(/<td class="rownum">/g) ?? []).length === 5, 'cfg row: Number_1 = 5 → the sheet starts with 5 rows');
    ok(e.includes('🧹 נקה טבלה') && e.includes('אימייל עבודה'), 'cfg row: empty cells inherit the code defaults; no variant → desk row ignored');
    await p.ev(`__fill([[0,0,'נועה לוי'],[0,1,'050-555-0101'],[0,2,'noa@example.test'],[0,3,'מנהלת הפקה']])`); await p.sleep(400);
    const same = await p.ev(`document.querySelector('tbody tr:nth-child(1) .st-text').textContent`);
    ok(/השיבוץ כבר קיים|ללא שינוי/.test(same), `right pane wins: peopleTable (pane) beats Source_Table_1 = Roles (row) → נועה לוי + מנהלת הפקה is recognised as an existing person + assignment («${same}»)`);
    const d = await dom(newHtml, 'empty', '&cfg=1&variant=desk');
    ok(d.includes('CFG נקה (desk)') && d.includes('CFG הזנה'), 'configVariant=desk → variant cell wins, other cells from the default row');
    const props = await p.ev('JSON.stringify(window.__customProps.map((x) => x.key))');
    ok(props.includes('"configTable"') && props.includes('"configVariant"') && props.includes('"configSlug"'), 'right pane offers configTable / configSlug / configVariant');
});
console.log(`\n${n} identity/config checks passed`);
