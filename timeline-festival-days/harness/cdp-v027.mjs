// v0.2.7 e2e — shared «מצב חיבור» status panel (status-panel v1) + right-pane toggle «show מצב חיבור · Extension_Config», default OFF.
import {open, sleep, here} from './cdp.mjs';
import {resolve} from 'node:path';
const shots = process.argv.includes('--shots');
const EV = resolve(here, '../evidence');
const ok = [],
    fail = [];
const check = (n, c, info) => (c ? ok : fail).push(info === undefined ? n : `${n} :: ${JSON.stringify(info)}`);
const b = await open({width: 1280, height: 800});
const PF = '&pf=' + encodeURIComponent('Slots_Events.Status~any~משובץ');
try {
    await b.go('?now=2026-11-02T11:00:00Z');
    await sleep(900);
    check('toggle OFF (default) → no panel', await b.js(`!document.querySelector('.csfst')`));
    const props = await b.js(`JSON.stringify(globalThis.__TL_PROPS.filter(p=>p.key==='showStatusPanel'))`);
    check('right pane has the boolean showStatusPanel', props === '[{"key":"showStatusPanel","type":"boolean"}]', props);
    await b.go('?now=2026-11-02T11:00:00Z&status=1' + PF);
    await sleep(1200);
    const txt = await b.js(`document.querySelector('.csfst')?.innerText ?? ''`);
    check('toggle ON → panel shown (no edit mode needed)', txt.includes('מצב חיבור'), txt.slice(0, 80));
    check('panel: config table line', /טבלת הגדרות/.test(txt));
    check('panel: sources list every loaded table', ['Slots_Events', 'Staffing', 'Invitations', 'Lodging'].every(t => txt.includes(t)));
    const row = await b.js(`(()=>{const r=[...document.querySelectorAll('.csfst tr')].find(tr=>tr.innerText.includes('Status')&&tr.innerText.includes('משובץ'));return r?r.innerText:''})()`);
    check('panel: pane filter Slots_Events.Status is any of משובץ with matched / total', /\d+ \/ \d+/.test(row) && /right pane|חלונית/.test(row), row);
    const vis = await b.js(`getComputedStyle(document.querySelector('.csfst').parentElement).position`);
    check('panel docks over the full-height timeline (fixed)', vis === 'fixed', vis);
    await b.clickSel('.csfst-h');
    await sleep(300);
    check('header click folds it', await b.js(`!document.querySelector('.csfst-b')`));
    if (shots) {
        await b.go('?now=2026-11-02T11:00:00Z&status=1' + PF);
        await sleep(1200);
        await b.shot(resolve(EV, 'ui-v027-status-panel.png'));
        await b.js(`document.querySelector('.csfst').parentElement.scrollTop=1e5`);
        await sleep(300);
        await b.shot(resolve(EV, 'ui-v027-status-panel-filters.png'));
        await b.go('?status=1&now=2026-11-02T11:00:00Z&crowd=1' + PF);
        await sleep(900);
        await b.clickSel('.csfst-h'); // folded: the map stays readable, the panel tag still shows where it lives
        await b.go('?map=1&status=1&keep=1&now=2026-11-02T11:00:00Z&crowd=1' + PF);
        await sleep(900);
        await b.js(`document.querySelector('.csfst-h').click()`);
        await sleep(2500);
        await b.shot(resolve(EV, 'config-map-v027.png'));
    }
} catch (e) {
    fail.push('EXCEPTION ' + (e && e.stack));
} finally {
    console.log(JSON.stringify({suite: 'cdp-v027', ok: ok.length, fail}, null, 1));
    for (const o of ok) console.log('PASS -', o);
    for (const f of fail) console.log('FAIL -', f);
    b.close();
}
