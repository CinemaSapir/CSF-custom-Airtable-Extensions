// v0.6.0 — Extension_Config wiring must be a NO-OP while the table is absent.
// Builds the harness twice — the last committed v0.5.x frontend (git HEAD~ or $BASE_REF) and the working tree — renders the
// same DEMO fixture scenarios in headless Chrome, and asserts the rendered DOM is byte-identical (version string masked).
// Then renders WITH a fake Extension_Config row and asserts the row's texts show up and the right pane still wins.
// Harness kit: /workspace/csf-extension-config/harness (fake SDK + fake base + CDP driver).
import {execSync} from 'node:child_process';
import {mkdtempSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const KIT = '/workspace/csf-extension-config/harness';
const {buildLists} = await import(join(KIT, 'lists-ui/run.mjs'));
const {withChrome} = await import(join(KIT, 'chrome.mjs'));
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ref = process.env.BASE_REF ?? 'v0.5.18-base';
const old = mkdtempSync(join(tmpdir(), 'lists-old-'));
execSync(`git -C ${root} archive ${ref} frontend scripts package.json | tar -x -C ${old}`);
symlinkSync(join(root, 'node_modules'), join(old, 'node_modules'));
const oldHtml = buildLists(join(old, 'frontend'), join(old, '_h'));
const newHtml = buildLists(join(root, 'frontend'), mkdtempSync(join(tmpdir(), 'lists-new-')));
const SCEN = ['home', 'gallery', 'list', 'dyn', 'mine', 'record', 'empty', 'anon', 'notables', 'modal'];
const mask = (h) => h.replace(/v\d+\.\d+\.\d+/g, 'vX');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; console.log('✓', m); };
// static: every slot the UI reads has a code default + a Slot_Map doc, and is a real v3 field
{
    const {readFileSync, readdirSync} = await import('node:fs');
    const fe = join(root, 'frontend');
    const cfgSrc = readFileSync(join(fe, 'cfg.ts'), 'utf8');
    const hook = readFileSync(join(fe, 'useExtensionConfig.ts'), 'utf8');
    const used = new Set();
    for (const f of readdirSync(fe).filter((x) => /\.tsx?$/.test(x))) for (const m of readFileSync(join(fe, f), 'utf8').matchAll(/\b(?:t|n|fromCfg)\('(\w+)'/g)) used.add(m[1]);
    const defs = cfgSrc.slice(cfgSrc.indexOf('export const DEFAULTS'), cfgSrc.indexOf('export const DOCS'));
    const docs = cfgSrc.slice(cfgSrc.indexOf('export const DOCS'));
    const missing = [...used].filter((k) => !/^Source_Table_/.test(k) && !new RegExp(`\\b${k}:`).test(defs));
    ok(missing.length === 0, `every slot read has a code default (${used.size} slots) ${missing.join(',')}`);
    ok([...used].every((k) => new RegExp(`\\b${k}:`).test(docs)), 'every slot read has a Slot_Map doc');
    ok(/FIELD_ORDER\.length === 269|269 fields/.test(hook), 'shared hook = Extension_Config v3 (269 fields)');
    ok(/SENSITIVE_NAME =/.test(readFileSync(join(fe, 'dynlogic.ts'), 'utf8')) && !/SENSITIVE|HARD_DENY|DENIED_COND/.test(cfgSrc.replace(/\/\*\*[\s\S]*?\*\//g, '')), 'privacy deny-lists stay in code (dynlogic.ts), not in any config slot');
}
await withChrome(async (p) => {
    const dom = async (html, s, extra = '') => {
        await p.open(`file://${html}?s=${s === 'modal' ? 'home' : s}${extra}`, 900);
        if (s === 'modal') { await p.click('.home-toolbar .btn.primary'); await p.sleep(300); }
        const errs = p.logs.splice(0).filter((l) => l.startsWith('EXC'));
        assert.equal(errs.length, 0, `${s}: page errors ${errs.join(' | ')}`);
        return p.ev(`document.getElementById('root').innerHTML`);
    };
    for (const s of SCEN) {
        const a = mask(await dom(oldHtml, s)), b = mask(await dom(newHtml, s));
        ok(a.length > 100, `${s}: rendered (${a.length} chars)`);
        if (a !== b) { let i = 0; while (a[i] === b[i]) i++; console.log('DIFF at', i, '\nold:', a.slice(i - 80, i + 120), '\nnew:', b.slice(i - 80, i + 120)); }
        ok(a === b, `${s}: DOM identical to ${ref} with no Extension_Config table`);
    }
    // Door 1 positive checks (fake Extension_Config table, row lists-ui + variant mine)
    const home = await dom(newHtml, 'home', '&cfg=1');
    ok(home.includes('CFG כל הרשימות') && home.includes('CFG הכל') && home.includes('CFG + חדשה'), 'cfg row: Heading_1 / Tab_Label_1 / Button_Text_1 replace the defaults');
    ok(home.includes('משותפות איתי') && home.includes('חיפוש רשימה…'), 'cfg row: empty cells inherit the code defaults');
    const mine = await dom(newHtml, 'mine', '&cfg=1');
    ok(mine.includes('CFG הרשימות שלי (mine)'), 'variant row «mine» (from mode=mine) wins over default row / code default');
    ok((mine.match(/class="c-row col/g) ?? []).length === 2 && /הצגת כל \d+ הרשימות/.test(mine), 'Number_1 = 2 from the default row → compact shows 2 rows + «הצגת כל N»');
    const rec = await dom(newHtml, 'record', '&cfg=1');
    ok(rec.includes('חלון פתוח'), 'right pane wins: filmsTable (pane) beats Source_Table_3 = People (row) → record mode still shows the film');
    const props = await p.ev('JSON.stringify(window.__customProps.map((x) => x.key))');
    ok(props.includes('"configTable"') && props.includes('"configVariant"') && props.includes('"configSlug"'), 'right pane offers configTable / configSlug / configVariant');
});
console.log(`\n${n} identity/config checks passed`);
