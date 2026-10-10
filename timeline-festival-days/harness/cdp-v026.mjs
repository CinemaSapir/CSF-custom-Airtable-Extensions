// v0.2.6 e2e — band shows the name only (vertical when crowded), identical header controls on all 13 tables (⠿ · funnel · ⇤ · ⋯ · ✕),
// window pills ▾ · ⇤ · ✕, both compress toggles ON by default (user choice kept). REAL input via CDP.
import {open, sleep, here} from './cdp.mjs';
import {resolve} from 'node:path';
const shots = process.argv.includes('--shots');
const EV = resolve(here, '../evidence');
const ok = [],
    fail = [];
const check = (n, c, info) => (c ? ok : fail).push(info === undefined ? n : `${n} :: ${JSON.stringify(info)}`);
const b = await open({width: 1280, height: 800});
const isOn = () => b.js(`!document.querySelector('.tl').classList.contains('nox')`);
const setXs = async on => {
    if ((await isOn()) !== on) {
        await b.clickSel('#xsTog');
        await sleep(600);
    }
};
const togs = () => b.js(`[...document.querySelectorAll('.tog')].slice(0,2).map(e=>e.classList.contains('on'))`);
const CROWD = '?now=2026-11-02T11:00:00Z&crowd=1';
try {
    // ---------------- 3. fresh load: both compress toggles ON
    await b.go(CROWD);
    await sleep(900);
    check('3: fresh load → «כווץ עמודות ריקות» and «כווץ שעות ריקות» both ON', JSON.stringify(await togs()) === '[true,true]', await togs());
    const shOn = await b.js(`document.querySelector('.vp').scrollHeight`);
    if (shots) {
        await b.clickSel('.dd:has(.tog) > button').catch(() => {});
        await sleep(300);
        await b.shot(resolve(EV, 'ui-v026-fresh-compress-on.png'));
        await b.js(`document.body.click()`);
    }
    await b.js(`document.querySelectorAll('.tog')[1].click()`);
    await sleep(700);
    const shOff = await b.js(`document.querySelector('.vp').scrollHeight`);
    check('3: compress really compresses (grid taller when switched OFF)', shOff > shOn, {shOn, shOff});
    await b.go(CROWD + '&keep=1');
    await sleep(900);
    check('3: a user who switched it OFF keeps OFF after reload', JSON.stringify(await togs()) === '[true,false]', await togs());
    await b.js(`(()=>{const k=Object.keys(localStorage).find(k=>/timeline/i.test(k));const v=JSON.parse(localStorage.getItem(k));delete v.compressUser;v.compress=false;localStorage.setItem(k,JSON.stringify(v))})()`);
    await b.go(CROWD + '&keep=1');
    await sleep(900);
    check('3: an old (pre-v0.2.6) saved default OFF is not a choice → ON', JSON.stringify(await togs()) === '[true,true]', await togs());

    // ---------------- 1. crowded band: name only, vertical when crowded, readable
    await b.go(CROWD);
    await sleep(900);
    await setXs(true);
    const L = await b.js(`[...document.querySelectorAll('.ev .lens')].map(l=>{const n=l.querySelector('.bn');const ev=l.closest('.ev');const cs=getComputedStyle(n);return {t:l.textContent,name:ev.querySelector(':scope>.evt>b').textContent,col:ev.closest('.col')?.dataset.t,v:l.classList.contains('vert'),wm:cs.writingMode,fs:parseFloat(cs.fontSize),clip:l.classList.contains('clip'),title:l.title,over:n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2,lanes:Math.round(ev.parentElement.getBoundingClientRect().width/ev.getBoundingClientRect().width)}})`);
    check('1: band shows card names (≥ 3 lenses in the crowded slice)', L.length >= 3, L.length);
    check('1: inside the band ONLY the record name — no time', L.every(x => x.t.trim() === x.name.trim() && !/\d{1,2}:\d\d/.test(x.t)), L.map(x => x.t));
    check('1: crowded (overlapping) cards → vertical writing-mode', L.filter(x => x.col === 'Slots_Events' && x.lanes > 1).length >= 2 && L.filter(x => x.col === 'Slots_Events' && x.lanes > 1).every(x => x.v && x.wm === 'vertical-rl'), L);
    check('1: vertical names are smaller than the magnified size but ≥ 9px', L.filter(x => x.v).every(x => x.fs >= 9 && x.fs < 16.25), L.map(x => x.fs));
    check('1: never clipped to a stub — the name fits, or (last resort) ellipsis + full name on hover', L.every(x => (!x.over && !x.clip) || (x.clip && x.title === x.name)), L.filter(x => x.over || x.clip));
    if (shots) {
        const band = await b.js(`(()=>{const r=document.querySelector('.col[data-t="Slots_Events"]').getBoundingClientRect();const l=[...document.querySelectorAll('.col[data-t="Slots_Events"] .lens')].map(e=>e.getBoundingClientRect());return {x:Math.max(0,r.left-260),y:Math.min(...l.map(q=>q.top))-30,w:r.width+300,h:Math.max(...l.map(q=>q.bottom))-Math.min(...l.map(q=>q.top))+60}})()`);
        await b.shot(resolve(EV, 'ui-v026-band-vertical.png'), {x: band.x, y: band.y, width: Math.min(1280 - band.x, band.w), height: band.h, scale: 2});
        await b.shot(resolve(EV, 'ui-v026-band-full.png'));
    }
    // a single-lane card with room stays horizontal
    await b.go('?now=2026-11-02T11:50:00Z');
    await sleep(900);
    await setXs(true);
    const H = await b.js(`[...document.querySelectorAll('.ev .lens')].map(l=>({t:l.textContent,h:l.classList.contains('hor'),wm:getComputedStyle(l.querySelector('.bn')).writingMode}))`);
    check('1: a lens with room reads horizontally', H.some(x => x.h && x.wm === 'horizontal-tb'), H);

    // ---------------- 2 + 10:41: identical header build on all 13 tables
    await b.go(CROWD);
    await sleep(900);
    const hdr = async () =>
        b.js(`[...document.querySelectorAll('.cols>div[data-t]:not(.cz)')].map(h=>{const cs=[...h.querySelectorAll('.hd2,.cf2,.sh,.cm2,.cx')];const v=cs.filter(e=>e.offsetWidth>0);const r=v.map(e=>e.getBoundingClientRect());const g=h.querySelector('.hgrp');return {t:h.dataset.t,ad:h.classList.contains('adonly'),dom:cs.map(e=>e.className.split(' ')[0]),vis:v.map(e=>e.className.split(' ')[0]),rtl:r.every((q,i)=>i===0||q.right<=r[i-1].right+0.5),inGrp:[...g.children].map(e=>e.className.split(' ')[0]).join(),adj:(()=>{const m=h.querySelector('.cm2').getBoundingClientRect(),x=h.querySelector('.cx').getBoundingClientRect();return Math.abs(m.left-x.right)})(),hd2R:Math.round(h.getBoundingClientRect().right-h.querySelector('.hd2').getBoundingClientRect().right),dis:[...h.querySelectorAll('[aria-disabled=true]')].map(e=>[e.className.split(' ')[0],e.title]),name:h.querySelector('.nmh').scrollWidth<=h.querySelector('.nmh').clientWidth+1}})`);
    // scroll to the day's all-day row so all-day-only columns (Tasks…) open at the all-day width
    await b.js(`document.querySelector('.vp').scrollTop=${await b.js(`(()=>{const st=document.querySelector('.vp').scrollTop;const c=[...document.querySelectorAll('.canvas .col[data-t="Social Posts"] .chip,.canvas .col[data-t="Booking Resources"] .chip')].filter(e=>parseFloat(e.style.top)<st).sort((a,b)=>parseFloat(b.style.top)-parseFloat(a.style.top))[0];return c?parseFloat(c.style.top):0})()`)}-120`); // v0.2.11: Tasks removed
    await sleep(600);
    const want = 'hd2,cf2,cm2,cx'; // v0.2.11: ⇤ removed, ✕ shrinks
    const H1 = await hdr();
    check('10:41: open columns (incl. all-day-only) carry the same 5 controls, visible, same order', H1.length >= 5 && H1.every(x => x.dom.join() === want && x.vis.join() === want && x.rtl), H1.filter(x => x.vis.join() !== want || !x.rtl));
    check('10:41: … an all-day-only column is among them', H1.some(x => x.ad), H1.map(x => [x.t, x.ad]));
    check('2: ⋯ sits right next to ✕ in one control group (⋯ ✕)', H1.every(x => x.inGrp === 'cm2,cx' && x.adj <= 2), H1.map(x => [x.t, x.inGrp, x.adj]));
    check('10:41: ⠿ at the far right of every tab', H1.every(x => x.hd2R >= 0 && x.hd2R <= 8), H1.map(x => x.hd2R));
    check('header: the table name is not truncated (two-row tab)', H1.every(x => x.name), H1.filter(x => !x.name).map(x => x.t));
    // expand every strip → all 13 tables
    await b.js(`document.querySelectorAll('.tog')[0].click()`);
    await sleep(700);
    const H13 = await hdr();
    check('10:41: all 7 table columns (v0.2.11) → identical 4 controls in the same order', H13.length === 7 && H13.every(x => x.vis.join() === want && x.rtl), {n: H13.length, bad: H13.filter(x => x.vis.join() !== want || !x.rtl)});
    check('10:41: a control that can\'t act is shown disabled with a reason (never hidden)', H13.every(x => x.dis.every(([, t]) => t && t.length > 10)), H13.map(x => [x.t, x.dis]));
    if (shots) await b.shot(resolve(EV, 'ui-v026-header-controls.png'), {x: 0, y: (await b.js(`document.querySelector('.cols').getBoundingClientRect().top`)) - 4, width: 1280, height: 56, scale: 2});
    // v0.2.11 (the owner 17:01): ✕ shrinks to a strip (⇤ gone); «תחומים» is the way to hide a table
    const t0 = H13[1].t;
    await b.clickSel(`.cols>div[data-t="${t0}"] .cx`);
    await sleep(500);
    check('✕ shrinks the column to a strip on the left', await b.js(`document.querySelector('.cols>div[data-t="${t0}"]').classList.contains('cz')`));
    await b.clickSel(`.cols>div[data-t="${t0}"]`);
    await sleep(500);
    check('… and a click on the strip opens it again', !(await b.js(`document.querySelector('.cols>div[data-t="${t0}"]').classList.contains('cz')`)));

    // ---------------- 10:42: window pills ▾ · ⇤ · ✕
    await b.go(CROWD);
    await sleep(900);
    await setXs(true);
    const P = await b.js(`[...document.querySelectorAll('.wpills > .wp1.on')].map(p=>({t:p.dataset.t,c:[...p.querySelectorAll('.vdd,.sh,.x')].map(e=>e.className.split(' ')[0]),rtl:(()=>{const r=[...p.querySelectorAll('.vdd,.sh,.x')].map(e=>e.getBoundingClientRect().right);return r.every((v,i)=>i===0||v<=r[i-1]+0.5)})()}))`);
    check('10:42: every window pill has ▾ · ⇤ · ✕ in the header order', P.length >= 2 && P.every(x => x.c.join() === 'vdd,sh,x' && x.rtl), P);
    const pt = P[0].t;
    const cardsOf = t => b.js(`[...document.querySelectorAll('.wg .wc .tg')].filter(e=>e.closest('.wc').querySelector('.nm[data-id]')).map(e=>e.textContent)`).then(a => a.filter(x => x === t));
    const lab = await b.js(`document.querySelector('.wpills .wp1[data-t="${pt}"]').childNodes[0].textContent`);
    await b.clickSel(`.wpills .wp1[data-t="${pt}"] .sh`);
    await sleep(400);
    const st = await b.js(`(()=>{const s=document.querySelector('.wpills .woff .wp1[data-t="${pt}"]');if(!s)return null;const r=s.getBoundingClientRect();const ons=[...document.querySelectorAll('.wpills > .wp1.on')].map(e=>e.getBoundingClientRect().left);return {w:r.width,l:r.left,onMin:Math.min(...ons,9999)}})()`);
    check('10:42: ⇤ → the pill becomes a narrow strip at the far left', st && st.w <= 46 && st.l < st.onMin, st);
    check('10:42: … and its cards leave the window', (await cardsOf(lab)).length === 0, lab);
    await b.clickSel(`.wpills .woff .wp1[data-t="${pt}"]`);
    await sleep(400);
    check('10:42: clicking the strip re-expands it', await b.js(`!!document.querySelector('.wpills > .wp1.on[data-t="${pt}"]')`));
    await b.clickSel(`.wpills .wp1[data-t="${pt}"] .x`);
    await sleep(400);
    check('10:42: ✕ hides the table from the window (no pill, no cards)', !(await b.js(`!!document.querySelector('.wpills [data-t="${pt}"]')`)) && (await cardsOf(lab)).length === 0);
    const saved = await b.js(`(()=>{const k=Object.keys(localStorage).find(k=>/timeline/i.test(k));return JSON.parse(localStorage.getItem(k)).wHide})()`);
    check('10:42: saved per user', JSON.stringify(saved) === JSON.stringify([pt]), saved);
    await b.clickSel('.wpills .wall');
    await sleep(400);
    check('10:42: «הכל» brings it back', await b.js(`!!document.querySelector('.wpills > .wp1.on[data-t="${pt}"]')`));
    if (shots) {
        await b.clickSel(`.wpills .wp1[data-t="${P[P.length - 1].t}"] .sh`);
        await sleep(400);
        const w = await b.js(`(()=>{const r=document.querySelector('.wh').getBoundingClientRect();return {y:r.top,h:r.height}})()`);
        await b.shot(resolve(EV, 'ui-v026-window-pills.png'), {x: 0, y: w.y - 4, width: 1280, height: w.h + 8, scale: 2});
        await b.go('?map=1&now=2026-11-02T11:00:00Z&crowd=1');
        await sleep(2500);
        await b.shot(resolve(EV, 'config-map-v026.png'));
    }
} catch (e) {
    fail.push('EXCEPTION ' + (e && e.stack));
} finally {
    console.log(JSON.stringify({suite: 'cdp-v026', ok: ok.length, fail}, null, 1));
    for (const o of ok) console.log('PASS -', o);
    for (const f of fail) console.log('FAIL -', f);
    b.close();
    process.exit(fail.length ? 1 : 0);
}
