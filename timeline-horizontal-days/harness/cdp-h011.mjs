// horizontal v0.1.1 (port of vertical v0.2.13, the owner 04:54): PROD crash «Cannot read properties of undefined (reading 'date')» → never a blank element.
import {open, here} from './cdp.mjs';
import {resolve} from 'node:path';
const shots = process.argv.includes('--shots');
const EV = resolve(here, '../evidence');
const b = await open({width: 1280, height: 800});
let fail = 0;
const check = (name, ok, info) => {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${info !== undefined ? ' :: ' + JSON.stringify(info).slice(0, 300) : ''}`);
    if (!ok) fail++;
};
const NOW = '?now=2026-11-02T11:07:00Z';
const REV = '&cfgmap=1&cfgkey=h&d1=2026-11-10T00:00:00.000Z&d2=2026-10-16T00:00:00.000Z';
const st = () =>
    b.js(`(()=>{const root=document.getElementById('root');return {len:root.innerHTML.length,timeline:!!document.querySelector('.tl'),nodays:!!document.querySelector('[data-nodays]'),
      crash:!!document.querySelector('[data-crash]'),status:!!document.querySelector('.csfst'),reason:document.querySelector('[data-reason]')?.textContent||'',text:(root.innerText||'').replace(/\\s+/g,' ').slice(0,200)}})()`);
try {
    for (const [name, qs] of [
        ['Festival Days empty', '&fdempty=1'],
        ['Festival Days Date field hidden', '&fdnodate=1'],
        ['a slot far outside the range', '&outside=1'],
    ]) {
        await b.go(NOW + qs, 2500);
        const s = await st();
        check(`${name} → the timeline still renders (days come from Date_1…Date_2, Festival Days only names them)`, s.timeline && !s.crash && !s.nodays, s.text.slice(0, 80));
    }
    for (const [name, qs, re] of [
        ['Date_1 after Date_2 (reversed range)', REV, /הפוך/],
        ['range longer than 400 days', '&cfgmap=1&cfgkey=h&d1=2024-01-01T00:00:00.000Z&d2=2026-11-10T00:00:00.000Z', /400/],
        ['all four together', '&fdempty=1&fdnodate=1&outside=1' + REV, /הפוך/],
    ]) {
        await b.go(NOW + qs, 2500);
        const s = await st();
        check(`${name} → no crash: friendly empty state + reason + status panel`, s.len > 0 && s.nodays && !s.crash && s.status && re.test(s.reason) && s.text.includes('לא נמצאו ימי פסטיבל — בדקו שטבלת Festival Days ושדה Date מופעלים באלמנט'), s);
    }
    await b.go(NOW + REV, 2500);
    if (shots) await b.shot(resolve(EV, 'h-v011-no-days.png'));
    await b.go(NOW + '&crash=screen', 2500);
    let s = await st();
    check('render error inside the timeline → Hebrew error screen + status panel (not blank)', s.crash && s.status && /הטיימליין נתקל בשגיאה/.test(s.text), s.text.slice(0, 120));
    check('details are folded by default', !(await b.js(`!!document.querySelector('[data-stack]')`)));
    await b.clickSel('[data-details]');
    await new Promise(r => setTimeout(r, 200));
    const stack = await b.js(`document.querySelector('[data-stack]')?.textContent||''`);
    check('«הצג פרטים» shows the error message + stack + version', /forced crash inside the timeline/.test(stack) && /v0\.1\.1/.test(stack) && /טיימליין אופקי/.test(stack), stack.slice(0, 120));
    if (shots) await b.shot(resolve(EV, 'h-v011-crash.png'));
    await b.go(NOW + '&crash=root', 2500);
    s = await st();
    check('error above the config provider → the top-level boundary still shows the Hebrew error', s.crash && /הטיימליין נתקל בשגיאה/.test(s.text), s.text.slice(0, 80));
    await b.go(NOW, 2500);
    s = await st();
    check('normal load unchanged (no empty state, no error screen)', s.timeline && !s.nodays && !s.crash);
} catch (e) {
    check('no exception in the e2e itself', false, String(e));
}
b.close();
console.log(fail ? `cdp-h011: ${fail} FAIL` : 'cdp-h011: all ok');
process.exit(fail ? 1 : 0);
