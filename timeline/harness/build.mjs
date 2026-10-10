// Bundles the REAL frontend (frontend/index.tsx) with the SDK swapped for sdk-mock.tsx, plus a style tag and overlay script.
import {build} from 'esbuild';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'out');
mkdirSync(out, {recursive: true});
await build({
    entryPoints: [resolve(here, 'entry.tsx')],
    bundle: true,
    outfile: resolve(out, 'app.js'),
    format: 'iife',
    jsx: 'automatic',
    loader: {'.json': 'json'},
    alias: {'@airtable/blocks/interface/ui': resolve(here, 'sdk-mock.tsx')},
    define: {'process.env.NODE_ENV': '"production"'},
    logLevel: 'warning',
});
writeFileSync(
    resolve(out, 'index.html'),
    `<!doctype html><html lang="he"><head><meta charset="utf-8"><title>csf-timeline harness</title>
<script>
// fixed clock: Mon 2.11.26 13:10 Israel (= 11:10Z), like the A-v7 screenshots
(()=>{const P=new URLSearchParams(location.search);const T=Date.parse(P.get('now')||'2026-11-02T11:10:00Z');const R=Date;const off=T-R.now();
 class D extends R{constructor(...a){a.length?super(...a):super(R.now()+off)}static now(){return R.now()+off}};window.Date=D;window.__TL_HARNESS_AT_NOW=P.get('open')!=='default';try{if(!P.get('keep'))localStorage.clear()}catch(e){}})();
</script></head><body><div id="root"></div><script src="app.js"></script><script src="../overlay.js"></script><script src="../e2e.js"></script></body></html>`,
);
console.log('built', out);
