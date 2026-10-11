// horizontal v0.1.2 evidence + real-input checks (the owner 05:20 items 1–9, 05:22 item 10). usage: node harness/cdp-h012.mjs <repoDir> <prefix>
// Runs against any build (v0.1.1 worktree for BEFORE, this repo for AFTER); checks are printed, failures only counted for AFTER.
import {open, sleep} from './cdp.mjs';
import {resolve} from 'node:path';
const [, , dir = '.', pre = 'after'] = process.argv;
const OUT = resolve('evidence/v012');
const b = await open({width: 1440, height: 900});
const go = async (qs, wait = 2600) => {
    await b.send('Page.navigate', {url: 'file://' + resolve(dir, 'harness/out/index.html') + qs});
    await sleep(wait);
};
let bad = 0;
const check = (n, ok, info) => {
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${info !== undefined ? ' :: ' + JSON.stringify(info) : ''}`);
};
const shot = (name, clip) => b.shot(`${OUT}/${pre}-${name}`, clip);
const box = sel => b.box(sel);
const NOW = '?now=2026-11-02T11:10:00Z';
try {
    // ---- 3/5/6 defaults (fresh user)
    await go(NOW + '&dense=1');
    const d = await b.js(`({res:document.querySelector('.dd.res button span')?.textContent,rows:[...document.querySelectorAll('.hrow')].map(r=>r.dataset.t),chips:[...document.querySelectorAll('.hchip')].map(r=>r.dataset.t),gaps:document.querySelectorAll('.hgap').length,tables:document.querySelector('[data-slot="Option_List_6"] .num')?.textContent})`);
    check('3/5/6: 12 h on screen, all tables ON, empty tables → chips, empty hours folded', /12/.test(d.res) && /כל/.test(d.tables) && d.gaps > 0, d);
    await shot('3-5-6-defaults.png');
    // ---- 4 + 1: window cards, wheel inside the window
    const wb = await box('.win');
    await shot('4-window-cards.png', {x: 0, y: wb.y, width: 1440, height: wb.h});
    // a wider band (24 h on screen) → more cards than the window shows → it must scroll
    await b.js(`document.querySelector('.dd.res button').click()`);
    await sleep(150);
    await b.js(`[...document.querySelectorAll('.menu.res .it')].pop().click()`);
    await sleep(600);
    const g0 = await b.js(`({st:document.querySelector('.wg').scrollTop,sh:document.querySelector('.wg').scrollHeight,ch:document.querySelector('.wg').clientHeight,sl:document.querySelector('.hvp').scrollLeft,n:document.querySelectorAll('.wg .wc').length,h:document.querySelector('.wc')?.getBoundingClientRect().height,fs:getComputedStyle(document.querySelector('.wc .nm')||document.body).fontSize})`);
    const gb = await box('.wg');
    for (let k = 0; k < 3; k++) {
        await b.wheel(gb.x + gb.w / 2, gb.y + gb.h / 2, 120);
        await sleep(150);
    }
    await sleep(300);
    const g1 = await b.js(`({st:document.querySelector('.wg').scrollTop,sl:document.querySelector('.hvp').scrollLeft})`);
    check('1: wheel over the window scrolls its cards, the timeline does not move', g1.sl === g0.sl && g0.sh > g0.ch && g1.st > g0.st, {g0, g1});
    check('4: cards ≥30% smaller (height ≤ 28px, name ≤ 9px)', g0.h <= 28.5 && parseFloat(g0.fs) <= 9, g0);
    await shot('1-window-scrolled.png', {x: 0, y: wb.y, width: 1440, height: wb.h});
    // ---- 2: ✕ on a window table pill + 👁 on a card → tabs at the window's left; click restores
    const pill = await b.js(`document.querySelector('.wh .wp1.on')?.dataset.t`);
    await b.js(`document.querySelector('.wh .wp1.on .x')?.click()`);
    await sleep(250);
    await b.js(`document.querySelector('.wg .wc .eye')?.click()`);
    await sleep(300);
    const s2 = await b.js(`({tabs:[...document.querySelectorAll('.wstrip .wst')].map(x=>x.dataset.t||x.dataset.id),left:(()=>{const s=document.querySelector('.wstrip');const g=document.querySelector('.wg');return s&&g?s.getBoundingClientRect().right<=g.getBoundingClientRect().left+1:false})()})`);
    check('2: shrunk table + 👁 record → vertical tabs at the window LEFT', s2.tabs.includes(pill) && s2.tabs.length >= 2 && s2.left, s2);
    const wb2 = await box('.win');
    await shot('2-window-strip.png', {x: 0, y: wb2.y, width: 1440, height: wb2.h});
    await b.js(`document.querySelector('.wstrip .wst.tbl')?.click()`);
    await sleep(250);
    check('2: clicking the tab restores the table', await b.js(`!!document.querySelector('.wh .wp1.on[data-t="${pill}"]')`));
    // ---- 7: colours (timeline area)
    await go(NOW);
    const hv = await box('.hgw');
    await shot('7-colours.png', {x: 0, y: hv.y, width: 1440, height: Math.min(520, hv.h)});
    const c7 = await b.js(`(()=>{const e=document.querySelector('.hb');const s=getComputedStyle(e);return {br:s.borderRightWidth,bw:s.borderTopWidth,lc:getComputedStyle(document.querySelector('.hlc')||e).borderTopWidth}})()`);
    check('7: bars = vertical tokens (4px start border + 1px hairline; lodging 2px)', c7.br === '4px' && c7.bw === '1px' && c7.lc === '2px', c7);
    // ---- 8: shrink a row all the way down
    const rz = await box('.hrow[data-t="Slots_Events"] .hrz');
    const h0 = (await box('.hrow[data-t="Slots_Events"]')).h;
    await b.mouse('mouseMoved', rz.x + 50, rz.y + 3, {button: 'none'});
    await b.mouse('mousePressed', rz.x + 50, rz.y + 3);
    for (let k = 1; k <= 10; k++) await b.mouse('mouseMoved', rz.x + 50, rz.y + 3 - k * 40);
    await b.mouse('mouseReleased', rz.x + 50, rz.y + 3 - 400);
    await sleep(300);
    const r8 = await b.js(`(()=>{const r=document.querySelector('.hrow[data-t="Slots_Events"]');const l=r.querySelector('.hlab b');return {h:r.getBoundingClientRect().height,labs:r.querySelectorAll('.hlab').length,bars:r.querySelectorAll('.hb').length,bh:r.querySelector('.hb')?.getBoundingClientRect().height,fs:l?getComputedStyle(l).fontSize:null}})()`);
    check('8: row shrinks far below the old minimum; bars stay, text hidden (never scaled)', r8.h < 60 && r8.h < h0 / 2 && r8.bars > 0 && r8.labs === 0, {h0, ...r8});
    await shot('8-thin-row.png', {x: 0, y: hv.y, width: 1440, height: 380});
    // ---- 9: day titles on the ruler (around the prep → festival change)
    await go('?now=2026-10-31T19:30:00Z');
    const p9 = await b.js(`[...document.querySelectorAll('.hdp')].map(x=>x.textContent)`);
    const ban = await b.js(`document.querySelector('.ban .ctr .big').textContent`);
    check('9: ruler day titles = the vertical text (count of days / «ערב הפסטיבל» / «יום 1 · פסטיבל»), never the bare phase word', p9.length > 0 && p9.every(t => !/^(הכנות|פירוק|פסטיבל) · /.test(t) || / · (עוד|ערב|יום)/.test(t)) && p9.some(t => t.startsWith(ban)), {p9, ban});
    await shot('9-day-titles.png', {x: 0, y: 0, width: 1440, height: 330});
    // ---- 10: per-table filters from Extension_Config Filter_1 (Table.Field lines) + funnel ops + status panel
    const f1 = encodeURIComponent('Slots_Events.Status הוא משובץ\nStaffing.Status לא ריק\nSlots_Events.Location\nLodging.Room Type אינו זוגי');
    await go(NOW + '&cfgmap=1&cfgkey=h&status=1&f1=' + f1, 3200);
    const n10 = await b.js(`document.querySelectorAll('.hrow[data-t="Slots_Events"] .hb').length`);
    const fc = await b.js(`document.querySelector('.hrow[data-t="Slots_Events"] .cf2')?.textContent`);
    await b.js(`document.querySelector('.hrow[data-t="Slots_Events"] .cf2').click()`);
    await sleep(300);
    const m10 = await b.js(`({dims:[...document.querySelectorAll('.cfmenu .cfd a')].map(a=>a.textContent+(a.classList.contains('cfg')?'*':'')),ops:[...document.querySelectorAll('.cfmenu .cfop a')].map(a=>a.textContent),on:document.querySelector('.cfmenu .cfop a.on')?.textContent})`);
    check('10: Filter_1 «Slots_Events.Status הוא משובץ» = funnel default (badge), 6 Hebrew ops, configured fields first', /\d/.test(fc || '') && m10.ops.length === 6 && m10.dims[0].startsWith('Status') && m10.dims.some(x => x.startsWith('Location*')), {n10, fc, m10});
    await shot('10-funnel.png');
    const stx = await b.js(`document.querySelector('.csfst')?.textContent||''`);
    check('10: status panel lists every filter field, the missing one flagged', /Room Type/.test(stx) && /לא נמצא ✗/.test(stx) && /לא ריק/.test(stx), stx.slice(stx.indexOf('סינון'), stx.indexOf('סינון') + 300));
    await b.js(`document.querySelector('.cfmenu .cfop a[data-op="notempty"]')?.click()`);
    await sleep(300);
    const n10b = await b.js(`document.querySelectorAll('.hrow[data-t="Slots_Events"] .hb').length`);
    check('10: switching the op to «לא ריק» widens the row', n10b >= n10, {n10, n10b});
    await b.js(`document.body.click()`);
    await sleep(200);
    await b.js(`document.querySelector('.csfst')?.scrollIntoView()`);
    await shot('10-status-panel.png');
} catch (e) {
    bad++;
    console.log('  FAIL crash: ' + (e.stack || e));
}
b.close();
console.log(`${pre}: ${bad} failing`);
process.exit(pre === 'after' && bad ? 1 : 0);
