// annotated mapping picture: every element with a data-slot labelled with its Extension_Config slot (overlay.js ?map=1)
import {open, sleep} from './cdp.mjs';
import {resolve} from 'node:path';
const b = await open({width: 1280, height: 800});
const qs = '?now=2026-11-02T11:10:00Z&cfgmap=1&cfgkey=h&map=1&mapAt=900&open=' + encodeURIComponent('.wh .wp1.on .x');
await b.send('Page.navigate', {url: 'file://' + resolve('harness/out/index.html') + qs});
await sleep(3800);
await b.shot(resolve(process.argv[2] || 'evidence/config-map-h012.png'));
const n = await b.js(`[...document.querySelectorAll('[data-slot]')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight}).map(e=>e.dataset.slot)`);
console.log(n.length, JSON.stringify(n));
b.close();
