// v0.2.13 crash repro: each scenario → does the page render (root not blank), crash text, empty state, boundary
import {open} from './cdp.mjs';
const b = await open({width: 1280, height: 800});
const SC = [
    ['baseline', '?now=2026-11-02T11:07:00Z'],
    ['Festival Days empty', '?now=2026-11-02T11:07:00Z&fdempty=1'],
    ['Festival Days Date hidden', '?now=2026-11-02T11:07:00Z&fdnodate=1'],
    ['slot outside range', '?now=2026-11-02T11:07:00Z&outside=1'],
    ['Date_1 > Date_2 (reversed)', '?now=2026-11-02T11:07:00Z&cfgmap=1&cfgkey=new&d1=2026-11-10T00:00:00.000Z&d2=2026-10-16T00:00:00.000Z'],
    ['range > 400 days', '?now=2026-11-02T11:07:00Z&cfgmap=1&cfgkey=new&d1=2024-01-01T00:00:00.000Z&d2=2026-11-10T00:00:00.000Z'],
    ['all four + reversed', '?now=2026-11-02T11:07:00Z&fdempty=1&fdnodate=1&outside=1&cfgmap=1&cfgkey=new&d1=2026-11-10T00:00:00.000Z&d2=2026-10-16T00:00:00.000Z'],
];
const out = [];
for (const [name, qs] of SC) {
    await b.go(qs, 2500);
    const r = await b.js(`(()=>{const root=document.getElementById('root');return {len:root.innerHTML.length,timeline:!!document.querySelector('.tl'),nodays:!!document.querySelector('[data-nodays]'),boundary:!!document.querySelector('[data-crash]'),status:!!document.querySelector('.csfst'),text:(root.innerText||'').slice(0,90).replace(/\\s+/g,' ')}})()`);
    out.push({name, ...r});
    console.log(JSON.stringify({name, ...r}));
}
b.close();
process.exit(0);
