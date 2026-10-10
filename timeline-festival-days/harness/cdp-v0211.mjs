// v0.2.11 e2e — the owner 16:43 (flexible config-row matching, panel lists seen rows + score), 16:50 (removed tables),
// 17:01 (✕ shrinks · window funnel · half-width 2-line pills · 👁 hide per record · date text right of «יום N»).
import {open, sleep, here} from './cdp.mjs';
import {resolve} from 'node:path';
const shots = process.argv.includes('--shots');
const EV = resolve(here, '../evidence');
const ok = [], fail = [];
const check = (n, c, info) => (c ? ok : fail).push(info === undefined ? n : `${n} :: ${JSON.stringify(info)}`);
const b = await open({width: 1280, height: 800});
const CROWD = '?now=2026-11-02T11:00:00Z&crowd=1';
const REMOVED = ['Tasks', 'Petty Cash', 'Requests', 'transactions', 'Notebook', 'Approvals'];
const panel = () => b.js(`document.querySelector('.csfst')?.innerText||''`);
const openPanel = async () => {
    if (!(await b.js(`!!document.querySelector('.csfst-b')`))) await b.js(`document.querySelector('.csfst-h')?.click()`);
    await sleep(500);
};
try {
    // ---------------- 16:43 matching
    await b.go('?now=2026-11-02T11:00:00Z&cfgmap=1&cfgkey=varonly&status=1');
    await sleep(1100);
    await openPanel();
    let t = await panel();
    check('16:43 B: only row has Variant «timeline» → matched as the default (✓, not no-record)', !t.includes('no-record') && /שורה תואמת[^\n]*✓/.test(t), t.slice(0, 400));
    check('panel ALWAYS lists the seen rows with a score (6 rows)', (await b.js(`document.querySelectorAll('.csfst-seen tbody tr').length`)) === 6, await b.js(`document.querySelector('.csfst-seen')?.innerText||''`));
    await b.go('?now=2026-11-02T11:00:00Z&cfgmap=1&cfgkey=hidext&status=1');
    await sleep(1100);
    await openPanel();
    t = await panel();
    check('16:43 A: Extension field hidden → matched by Display_Name / GitHub_URL', !t.includes('no-record') && /Display_Name|GitHub_URL/.test(await b.js(`document.querySelector('.csfst-seen')?.innerText||''`)), t.slice(0, 400));
    if (shots) await b.shot(resolve(EV, 'ui-v0211-status-seen-rows.png'));

    // ---------------- 16:50 removed tables
    await b.go(CROWD);
    await sleep(900);
    const cols = await b.js(`[...document.querySelectorAll('.cols > [data-t]')].map(e=>e.dataset.t)`);
    check('16:50: removed tables are not columns', cols.length === 7 && !cols.some(c => REMOVED.includes(c)), cols);
    const pane = await b.js(`JSON.stringify(globalThis.__TL_PROPS.map(p=>p.key))`);
    check('16:50: no right-pane setting for a removed table', !/Tasks|Petty|Requests|transactions|Notebook|Approvals/.test(pane), pane);
    await b.clickSel('.dd[data-slot="Option_List_6"] > button');
    await sleep(300);
    const pick = await b.js(`[...document.querySelectorAll('.dd[data-slot="Option_List_6"] .menu .it')].map(e=>e.textContent)`);
    check('16:50: «תחומים» lists the 7 kept tables only', pick.length === 7, pick);
    await b.go(CROWD + '&status=1');
    await sleep(1000);
    await openPanel();
    t = await panel();
    // (the generic «טבלאות גלויות לאלמנט» line lists the base's tables as they are — not a timeline check)
    const bad = t.split('\n').filter(l => !l.startsWith('טבלאות גלויות') && /Tasks|Petty Cash|Approvals|Notebook|transactions|Requests/.test(l));
    check('16:50: «מצב חיבור» has no check / ✗ for removed tables', bad.length === 0, bad);

    // ---------------- 17:01 #1 ✕ shrinks, no ⇤
    await b.go(CROWD);
    await sleep(900);
    check('17:01 #1: no ⇤ in any column header', await b.js(`[...document.querySelectorAll('.cols>div[data-t] .sh')].length === 0`));
    check('17:01 #2: a funnel on every open tab', await b.js(`[...document.querySelectorAll('.cols>div[data-t]:not(.cz)')].every(h=>!!h.querySelector('.cf2'))`));
    const t0 = await b.js(`document.querySelector('.cols>div[data-t]:not(.cz)').dataset.t`);
    await b.clickSel(`.cols>div[data-t="${t0}"] .cx`);
    await sleep(500);
    const after = await b.js(`({cz:document.querySelector('.cols>div[data-t="${t0}"]')?.classList.contains('cz'),n:document.querySelectorAll('.cols>div[data-t]').length})`);
    check('17:01 #1: ✕ shrinks the column to a strip (still there, all 7 columns)', after.cz === true && after.n === 7, after);

    // ---------------- #3 half-width pills, 2-line title
    await b.go(CROWD);
    await sleep(900);
    const wc = await b.js(`(()=>{const g=document.querySelector('.wg');const c=[...g.querySelectorAll('.wc:not(.more)')];const cs=getComputedStyle(g);const nm=c[0]&&getComputedStyle(c[0].querySelector('.nm'));return {cols:cs.gridTemplateColumns.split(' ').length,w:c[0]?Math.round(c[0].getBoundingClientRect().width):0,gw:Math.round(g.getBoundingClientRect().width),clamp:nm?nm.webkitLineClamp:'',ws:nm?nm.whiteSpace:''}})()`);
    check('17:01 #3: 6 pills per row, each ≈ 1/6 of the row (was 1/3)', wc.cols === 6 && wc.w > 0 && wc.w < wc.gw / 5, wc);
    check('17:01 #3: 2-line title', wc.clamp === '2' && wc.ws === 'normal', wc);

    // ---------------- #4 window funnel at the far left of its row
    const wf = await b.js(`(()=>{const h=document.querySelector('.win .wh');const f=h.querySelector('.wf');const fl=f.getBoundingClientRect().left;const others=[...h.children].filter(e=>e!==f&&e.offsetWidth>0).map(e=>e.getBoundingClientRect().left);return {fl,min:Math.min(...others)}})()`);
    check('17:01 #4: the window funnel is the left-most item of its row', wf.fl <= wf.min, wf);
    await b.clickSel('.win .wh .wf');
    await sleep(300);
    const opts = await b.js(`[...document.querySelectorAll('.wfmenu [data-o], .wfmenu .it')].map(e=>e.dataset.o||e.dataset.t)`);
    check('17:01 #4: options: now-only, no cancelled, tables, hidden count, clear all', ['now', 'nocancel', 'hidden', 'clearall'].every(o => opts.includes(o)) && opts.includes('Slots_Events'), opts);
    const n0 = await b.js(`document.querySelectorAll('.wg .wc:not(.more)').length`);
    await b.clickSel('.wfmenu [data-o="now"]');
    await sleep(400);
    const nowOnly = await b.js(`({n:document.querySelectorAll('.wg .wc:not(.more)').length,act:document.querySelector('.win .wh .wf').classList.contains('act')})`);
    check('17:01 #4: «רק מה שמתרחש בשעה שבמרכז» narrows the window, funnel active', nowOnly.n <= n0 && nowOnly.act, {n0, ...nowOnly});
    if (shots) await b.shot(resolve(EV, 'ui-v0211-window-filter.png'));
    await b.clickSel('.wfmenu [data-o="clearall"]');
    await sleep(400);
    check('«נקה הכל» resets the window filter', !(await b.js(`document.querySelector('.win .wh .wf').classList.contains('act')`)));

    // ---------------- #5 👁 hide per record
    await b.go(CROWD);
    await sleep(900);
    const eyes = await b.js(`({wc:[...document.querySelectorAll('.wg .wc:not(.more)')].filter(c=>c.querySelector('.nm.open')).every(c=>!!c.querySelector('.eye')),ev:[...document.querySelectorAll('.canvas .ev')].every(c=>!!c.querySelector('.eye')),pos:(()=>{const e=document.querySelector('.canvas .ev');const t=e.querySelector('b').getBoundingClientRect(),y=e.querySelector('.eye').getBoundingClientRect();return {eyeRight:Math.round(y.right),titleLeft:Math.round(t.left),gap:Math.round(t.left-y.right)}})()})`);
    check('17:01 #5: 👁 on every window pill (one record; merged lodging pills excluded) and every timeline card', eyes.wc && eyes.ev, eyes);
    check('17:01 #5: 👁 sits left of and next to the title', eyes.pos.gap >= 0 && eyes.pos.gap <= 8, eyes.pos);
    const id = await b.js(`document.querySelector('.canvas .ev').dataset.id`);
    await b.js(`document.querySelector('.canvas .ev[data-id="${id}"] .eye').click()`);
    await sleep(500);
    const h1 = await b.js(`({gone:!document.querySelector('.canvas .ev[data-id="${id}"]'),chip:document.querySelector('.hidn')?.textContent||'',opened:JSON.stringify(globalThis.__opened||[])})`);
    check('17:01 #5: click 👁 hides the record; the top bar counts it', h1.gone && /1/.test(h1.chip), h1);
    await b.go(CROWD + '&keep=1&status=1');
    await sleep(1000);
    check('17:01 #5: hidden stays hidden after reload (saved per user)', await b.js(`!document.querySelector('.canvas .ev[data-id="${id}"]')`));
    await openPanel();
    check('17:01 #5: «מצב חיבור» shows the hidden count', /רשומות מוסתרות[^\n]*1/.test(await panel()), (await panel()).match(/.*מוסתרות.*/)?.[0]);
    await b.clickSel('.top .clr');
    await sleep(500);
    check('17:01 #5: «נקה» (reset filters) shows it again', await b.js(`!!document.querySelector('.canvas .ev[data-id="${id}"]') && !document.querySelector('.hidn')`));
    // the same from a window pill, undone by «נקה הכל»
    const wid = await b.js(`document.querySelector('.wg .wc:not(.more) .nm.open')?.dataset.id||''`);
    if (wid) {
        await b.js(`[...document.querySelectorAll('.wg .wc')].find(c=>c.querySelector('[data-id="${wid}"]')).querySelector('.eye').click()`);
        await sleep(400);
        check('17:01 #5: 👁 on a window pill hides it from the window and the timeline', await b.js(`!document.querySelector('.wg [data-id="${wid}"]') && !document.querySelector('.canvas .ev[data-id="${wid}"]')`));
        await b.clickSel('.win .wh .wf');
        await sleep(300);
        check('window filter menu lists the hidden record with ↺', await b.js(`!!document.querySelector('.wfmenu .hidr[data-id="${wid}"]')`));
        await b.clickSel('.wfmenu [data-o="clearall"]');
        await sleep(400);
        check('«נקה הכל» shows it again', await b.js(`!!document.querySelector('.wg [data-id="${wid}"]')`));
    } else fail.push('no openable window pill');

    // ---------------- #6 date text right of «יום N · פסטיבל» + time
    const ban = await b.js(`(()=>{const c=document.querySelector('.ban .ctr');const r=e=>c.querySelector(e).getBoundingClientRect();return {small:Math.round(r('small').left),big:Math.round(r('.big').right),clock:Math.round(r('.clock').right),bigL:Math.round(r('.big').left)}})()`);
    check('17:01 #6: the small date text sits right of «יום N · פסטיבל», the time left of it', ban.small >= ban.big && ban.clock <= ban.bigL, ban);
    if (shots) {
        await b.shot(resolve(EV, 'ui-v0211-topbar-banner.png'), {x: 0, y: 0, width: 1280, height: 110, scale: 2});
        await b.go('?map=1&now=2026-11-02T11:00:00Z&crowd=1&cfgmap=1&cfgkey=new&mapping=1&status=1&edit=1');
        await sleep(900);
        await b.js(`document.querySelector('.csfst-h').click()`);
        await sleep(2500);
        await b.shot(resolve(EV, 'config-map-v0211.png'));
    }
} catch (e) {
    fail.push('EXCEPTION ' + (e && e.stack));
} finally {
    console.log(JSON.stringify({suite: 'cdp-v0211', ok: ok.length, fail}, null, 1));
    b.close();
}
