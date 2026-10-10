// v0.3.0 — Extension_Config wiring must be a NO-OP while the table is absent.
// Builds the harness twice — the last committed v0.2.3 frontend ($BASE_REF, default v0.2.3-base) and the working tree — renders
// the same fixture scenarios in headless Chrome and asserts the rendered DOM is byte-identical (version string masked).
// Then renders WITH a fake Extension_Config table and asserts row texts show up, variants win, and the right pane still wins.
// Harness kit: /workspace/csf-extension-config/harness (fake SDK + fake base + CDP driver) + harness/people-roles (fixture).
import {execSync} from 'node:child_process';
import {mkdtempSync, symlinkSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const KIT = '/workspace/csf-extension-config/harness';
const {buildPR} = await import(join(KIT, 'people-roles/run.mjs'));
const {withChrome} = await import(join(KIT, 'chrome.mjs'));
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ref = process.env.BASE_REF ?? 'v0.2.3-base';
const old = mkdtempSync(join(tmpdir(), 'pr-old-'));
execSync(`git -C ${root} archive ${ref} frontend package.json | tar -x -C ${old}`);
symlinkSync(join(root, 'node_modules'), join(old, 'node_modules'));
const oldHtml = buildPR(join(old, 'frontend'), join(old, '_h'));
const newHtml = buildPR(join(root, 'frontend'), mkdtempSync(join(tmpdir(), 'pr-new-')));
const mask = (h) => h.replace(/v\d+\.\d+\.\d+/g, 'vX');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; console.log('✓', m); };
// static: every slot the UI reads has a code default + a Slot_Map doc
{
    const fe = join(root, 'frontend');
    const cfgSrc = readFileSync(join(fe, 'cfg.ts'), 'utf8');
    const src = readFileSync(join(fe, 'index.tsx'), 'utf8');
    const used = new Set([...src.matchAll(/\b(?:t|dur|fromCfg|raw|ref)\('(\w+)'/g)].map((m) => m[1]));
    for (const m of src.matchAll(/label: '(Table_Heading_\d+)'/g)) used.add(m[1]);
    const defs = cfgSrc.slice(cfgSrc.indexOf('export const DEFAULTS'), cfgSrc.indexOf('export const DOCS'));
    const docs = cfgSrc.slice(cfgSrc.indexOf('export const DOCS'));
    const missing = [...used].filter((k) => !/^Source_/.test(k) && !new RegExp(`\\b${k}:`).test(defs));
    ok(missing.length === 0, `every slot read has a code default (${used.size} slots) ${missing.join(',')}`);
    ok([...used].every((k) => new RegExp(`\\b${k}:`).test(docs)), 'every slot read has a Slot_Map doc');
    ok(/269/.test(readFileSync(join(fe, 'useExtensionConfig.ts'), 'utf8')), 'shared hook = Extension_Config v3 (269 fields)');
    ok(/UNSAFE_NAME_RE|Roles › Partner|never writes Roles › Partner/.test(src) && !/Roles\.Partner|rPartner/.test(cfgSrc), 'the «never write Roles › Partner» rule stays in code (not a slot)');
}
const SCEN = {
    home: null,
    picked: `document.querySelector('.pb-table tbody tr, table tbody tr').click()`,
    card: `document.querySelector('.expand-btn').click()`,
    vacant: `[...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('פנויים')).click()`,
    missing: null,
};
await withChrome(async (p) => {
    const dom = async (html, s, extra = '') => {
        await p.open(`file://${html}?s=${s}${extra}`, 900);
        if (SCEN[s]) { await p.ev(SCEN[s]); await p.sleep(400); }
        const errs = p.logs.splice(0).filter((l) => l.startsWith('EXC') || /error/i.test(l));
        assert.equal(errs.length, 0, `${s}: page errors ${errs.join(' | ')}`);
        return p.ev(`document.getElementById('root').innerHTML`);
    };
    for (const s of Object.keys(SCEN)) {
        const a = mask(await dom(oldHtml, s)), b = mask(await dom(newHtml, s));
        ok(a.length > 100, `${s}: rendered (${a.length} chars)`);
        if (a !== b) { let i = 0; while (a[i] === b[i]) i++; console.log('DIFF at', i, '\nold:', a.slice(i - 80, i + 120), '\nnew:', b.slice(i - 80, i + 120)); }
        ok(a === b, `${s}: DOM identical to ${ref} with no Extension_Config table`);
    }
    const home = await dom(newHtml, 'home', '&cfg=1');
    ok(home.includes('CFG כותרת') && home.includes('CFG ספר') && home.includes('CFG תפקיד') && home.includes('CFG ניקוי'), 'cfg row: Title / Heading_1 / Table_Heading_2 / Button_Text_2 replace the defaults');
    ok(home.includes('אימייל תפקיד') && home.includes('הוסף עוד תפקיד לשם הזה'), 'cfg row: empty cells inherit the code defaults');
    ok(home.includes('פנויים') && !home.includes('CFG פנויים (desk)'), 'variant row «desk» is ignored without configVariant');
    ok(home.includes('נועה לוי') && home.includes('מנהלת הפקה'), 'right pane wins: peopleTable (pane) beats Source_Table_1 = Roles (row) → people still listed');
    const desk = await dom(newHtml, 'home', '&cfg=1&variant=desk');
    ok(desk.includes('CFG פנויים (desk)') && desk.includes('CFG ספר'), 'configVariant=desk → variant cell wins, other cells from the default row');
    const props = await p.ev('JSON.stringify(window.__customProps.map((x) => x.key))');
    ok(props.includes('"configTable"') && props.includes('"configVariant"') && props.includes('"configSlug"'), 'right pane offers configTable / configSlug / configVariant');
});
console.log(`\n${n} identity/config checks passed`);
