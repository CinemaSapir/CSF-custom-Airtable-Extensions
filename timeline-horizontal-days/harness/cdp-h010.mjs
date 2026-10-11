// «טיימליין אופקי» v0.1.0 e2e — real CDP input (mouse, wheel) against the real bundle (SDK mocked). --shots → renders.
import {open, sleep, here} from './cdp.mjs';
import {resolve} from 'node:path';
import {mkdirSync, copyFileSync} from 'node:fs';
const shots = process.argv.includes('--shots');
const EV = resolve(here, '../evidence');
const EV2 = '/workspace/csf-timeline/evidence';
mkdirSync(EV, {recursive: true});
const ok = [],
    fail = [];
const check = (n, c, info) => (c ? ok : fail).push(info === undefined ? n : `${n} :: ${JSON.stringify(info)}`);
const b = await open({width: 1280, height: 800});
const shot = async (name, clip) => {
    if (!shots) return;
    await b.shot(resolve(EV, name), clip);
    try {
        copyFileSync(resolve(EV, name), resolve(EV2, name));
    } catch {}
};
const NOW = '?now=2026-11-02T11:07:00Z'; // 13:07 Israel
const clock = () => b.js(`document.querySelector('.ban .clock').textContent.trim()`);
const st = () =>
    b.js(`(()=>{const vp=document.querySelector('.hvp'),v=vp.getBoundingClientRect(),band=document.querySelector('.hband'),tn=document.querySelector('.htnow');
      const br=band?band.getBoundingClientRect():null,tr=tn.getBoundingClientRect();
      const inB=e=>{const r=e.getBoundingClientRect();return br&&r.right>br.left+0.5&&r.left<br.right-0.5};
      return {sl:-vp.scrollLeft,st:vp.scrollTop,clock:document.querySelector('.ban .clock').textContent.trim(),tag:tn.textContent.trim(),
        bandC:br?(br.left+br.right)/2:null,tagC:(tr.left+tr.right)/2,vpR:v.right,vpT:v.top,
        hrhR:[...document.querySelectorAll('.hrow .hrh')].map(e=>Math.round(e.getBoundingClientRect().right)),
        rulT:document.querySelector('.hrul').getBoundingClientRect().top,
        wids:[...document.querySelectorAll('.wg .wc .nm[data-id]')].map(e=>e.dataset.id),
        bids:[...new Set([...document.querySelectorAll('.hb[data-id],.hgst[data-id]')].filter(inB).map(e=>e.dataset.id))],
        more:!!document.querySelector('.wg .wc.more'),rows:[...document.querySelectorAll('.hrow')].map(r=>r.dataset.t),chips:[...document.querySelectorAll('.hchip')].map(c=>c.dataset.t)}})()`);
const drag = async (x0, y0, x1, y1, steps = 8) => {
    await b.mouse('mouseMoved', x0, y0, {button: 'none'});
    await b.mouse('mousePressed', x0, y0);
    for (let k = 1; k <= steps; k++) {
        await b.mouse('mouseMoved', x0 + ((x1 - x0) * k) / steps, y0 + ((y1 - y0) * k) / steps);
        await sleep(30);
    }
    await b.mouse('mouseReleased', x1, y1);
    await sleep(250);
};
try {
    // ------------------------------------------------ 1. load, RTL time, sticky
    await b.go(NOW, 3000);
    let s = await st();
    check('1: opens at now (13:07 → cross-section 13:05, 5-min snap)', s.clock === '13:05' && s.tag === '13:05', s.clock);
    check('1: one row per shown table (7) and no quiet table on 2.11', s.rows.length + s.chips.length === 7, s);
    const ticks = await b.js(`[...document.querySelectorAll('.htk')].map(e=>({m:+e.dataset.tick,x:e.getBoundingClientRect().left})).sort((a,b)=>a.m-b.m)`);
    check('1: right-to-left time — every later tick sits further left', ticks.length > 6 && ticks.every((t, k) => !k || t.x < ticks[k - 1].x), ticks.slice(0, 4));
    const grid = await b.js(`(()=>{const t=[...document.querySelectorAll('.htk')].map(e=>({m:+e.dataset.tick,x:e.getBoundingClientRect().left+e.getBoundingClientRect().width/2}));const g=[...document.querySelectorAll('.hgl')].map(e=>({m:+e.dataset.tick,x:e.getBoundingClientRect().left}));return t.every(a=>{const q=g.find(z=>z.m===a.m);return q&&Math.abs(q.x-a.x)<1.5})})()`);
    check('1: ruler labels sit exactly on their grid lines', grid);
    check('1: band centre = axis tag = clock (strip on the rounded time)', Math.abs(s.bandC - s.tagC) < 1.01, s);
    check('1: row headers stick to the right edge', s.hrhR.every(r => Math.abs(r - (s.vpR - 0)) <= 13), s.hrhR);
    await shot('h-main.png');
    // header controls: identical, same order, on every row
    const hc = await b.js(`[...document.querySelectorAll('.hrow')].map(r=>{const h=r.querySelector('.hrh');const sel=['.hd2','.nmh','.vc','.cf2','.cm2','.cx'];const els=sel.map(q=>h.querySelector(q));
      return {t:r.dataset.t,all:els.every(Boolean),order:els.every((e,k)=>!k||(els[k-1].compareDocumentPosition(e)&4)),cf:h.querySelector('.cf2').title}})`);
    check('2: every row header has ⠿ · name · count · funnel · ⋯ · ✕, in that order', hc.every(x => x.all && x.order), hc);
    check('2: no ⇤ in the row headers (v0.2.11: ✕ shrinks)', await b.js(`!document.querySelector('.hrh .sh')`));
    // ------------------------------------------------ 3. wheel through time (5-min marks), window follows the strip
    const vp = await b.box('.hvp');
    const seen = [],
        bad = [];
    for (let k = 0; k < 16; k++) {
        await b.wheel(vp.x + vp.w * 0.45, vp.y + 60, 23);
        await sleep(110);
        const r = await st();
        seen.push(r.clock);
        if (+r.clock.slice(3) % 5 || r.tag !== r.clock || Math.abs(r.bandC - r.tagC) > 1.01) bad.push(r.clock);
        if (!r.more && r.wids.some(id => !r.bids.includes(id))) bad.push({w: r.wids, b: r.bids, c: r.clock});
    }
    check('3: wheel = time (down → later): every clock on a 5-min mark, tag = clock, strip on it, window ⊆ strip', bad.length === 0, bad.slice(0, 3));
    check('3: … the wheel really advanced time', new Set(seen).size >= 4 && seen[seen.length - 1] > seen[0], seen);
    s = await st();
    check('3: row headers still stuck right after scrolling time', s.hrhR.every(r => Math.abs(r - s.vpR) <= 13), s.hrhR);
    // rows scroll vertically (wheel over the headers), the ruler stays on top
    const hb0 = await b.box('.hrow .hrh');
    const t0 = (await st()).st;
    await b.wheel(hb0.x + 60, hb0.y + 20, 120);
    await sleep(200);
    s = await st();
    check('4: wheel over the row headers scrolls the rows; the ruler stays sticky on top', s.st > t0 && Math.abs(s.rulT - s.vpT) < 1.5, {st: s.st, t0, rul: s.rulT, vp: s.vpT});
    // ------------------------------------------------ 5. compress ON by default, lens names in the strip
    await b.go(NOW, 2500);
    check('5: «כווץ שעות ריקות» ON by default (folded stretches drawn)', await b.js(`document.querySelectorAll('.hgap').length>0`));
    const lens = await b.js(`[...document.querySelectorAll('.hlens .bn')].map(e=>({t:e.textContent,fs:parseFloat(e.style.fontSize),clip:e.scrollWidth>e.clientWidth+1,lc:e.parentElement.classList.contains('clip')}))`);
    check('5: the strip shows names only (no time), enlarged', lens.length > 0 && lens.every(l => !/\d\d:\d\d/.test(l.t)) && lens.some(l => l.fs >= 14), lens);
    check('5: a lens name is never cut without the ellipsis class', lens.every(l => !l.clip || l.lc), lens);
    // ------------------------------------------------ 6. drag on empty row space → ghost (15-min snap) + popover
    const emp = await b.js(`(()=>{const r=document.querySelector('.hrow[data-t="Slots_Events"]').getBoundingClientRect();const v=document.querySelector('.hvp').getBoundingClientRect();
      for(let y=r.top+8;y<r.bottom-4;y+=6)for(let x=v.left+30;x<v.left+500;x+=10){const el=document.elementFromPoint(x,y);if(el&&(el.classList.contains('hta')||el.classList.contains('hrow'))){let ok=true;for(let d=0;d<=130;d+=10){const e2=document.elementFromPoint(x+d,y);if(!e2||!(e2.classList.contains('hta')||e2.classList.contains('hrow')))ok=false}if(ok)return {x,y}}}return null})()`);
    check('6: found empty row space to drag on', !!emp);
    if (emp) {
        await b.mouse('mouseMoved', emp.x + 120, emp.y, {button: 'none'});
        await b.mouse('mousePressed', emp.x + 120, emp.y);
        for (let k = 1; k <= 6; k++) {
            await b.mouse('mouseMoved', emp.x + 120 - k * 20, emp.y);
            await sleep(30);
        }
        await sleep(150);
        const g = await b.js(`(()=>{const g=document.querySelector('.hghost');return g?g.querySelector('span').textContent:null})()`);
        await shot('h-drag.png');
        await b.mouse('mouseReleased', emp.x, emp.y);
        await sleep(300);
        const mm = (g || '').match(/(\d\d):(\d\d)–(\d\d):(\d\d)/);
        check('6: ghost while dragging, snapped to 15 min, earlier time on the right', !!mm && +mm[2] % 15 === 0 && +mm[4] % 15 === 0, g);
        check('6: release → create popover', await b.js(`!!document.querySelector('.cp')`));
        await b.js(`document.querySelector('.cp .cn')?.click()`);
        await sleep(200);
        check('6: cancel → no popover, no ghost, nothing written', await b.js(`!document.querySelector('.cp')&&!document.querySelector('.hghost')&&!(window.__writes||[]).length`));
    }
    // ------------------------------------------------ 7. move + undo, resize
    const bar = await b.js(`(()=>{const v=document.querySelector('.hvp').getBoundingClientRect();const c=[...document.querySelectorAll('.hrow[data-t="Slots_Events"] .hb:not(.ad)')].map(e=>({id:e.dataset.id,r:e.getBoundingClientRect()})).filter(x=>x.r.left>v.left+200&&x.r.right<v.right-260&&x.r.width>60);
      return c.length?{id:c[0].id,x:c[0].r.left+c[0].r.width/2,y:c[0].r.top+c[0].r.height/2,l:c[0].r.left,w:c[0].r.width,yb:c[0].r.top+3}:null})()`);
    const pxh = await b.js(`(()=>{const t=[...document.querySelectorAll('.htk')].map(e=>({m:+e.dataset.tick,x:e.getBoundingClientRect().left})).sort((a,b)=>a.m-b.m);for(let k=1;k<t.length;k++)if(t[k].m-t[k-1].m<=60)return (t[k-1].x-t[k].x)*60/(t[k].m-t[k-1].m);return 0})()`);
    check('7: a movable bar on screen + px/hour', !!bar && pxh > 50, {bar, pxh});
    if (bar) {
        await drag(bar.x, bar.y, bar.x - pxh / 2 - 3, bar.y);
        const w = await b.js(`JSON.stringify(window.__writes.slice(-1))`);
        check('7: drag left = later; writes once', /update/.test(w) && /Slots_Events/.test(w), w);
        const toast = await b.js(`document.querySelector('.toast.undo')?.textContent||''`);
        check('7: undo toast names the new time (15-min snap)', /הוזז/.test(toast) && /\d\d:(00|15|30|45)/.test(toast), toast);
        await b.js(`[...document.querySelectorAll('.toast.undo a')][0]?.click()`);
        await sleep(300);
        const n = await b.js(`window.__writes.length`);
        check('7: undo writes the old time back', n === 2, n);
        const bar2 = await b.js(`(()=>{const e=document.querySelector('.hb[data-id="${bar.id}"]');const r=e.getBoundingClientRect();return {x:r.left+2,y:r.top+r.height/2,l:r.left}})()`);
        await drag(bar2.x, bar2.y, bar2.x - pxh / 2 - 2, bar2.y);
        const w2 = await b.js(`JSON.stringify(window.__writes.slice(-1))`);
        const t2 = await b.js(`document.querySelector('.toast.undo')?.textContent||''`);
        check('7: drag the left end = resize (end later, 15-min snap)', /update/.test(w2) && /שונה משך/.test(t2), {w2, t2});
    }
    // ------------------------------------------------ 8. ✕ → chip row → reopen; 👁; row height; reorder (saved per user)
    await b.go(NOW + '&keep=1', 2500);
    await b.js(`localStorage.clear()`);
    await b.go(NOW + '&keep=1', 2500);
    await b.js(`document.querySelector('.hrow[data-t="Itinerary"] .cx').click()`);
    await sleep(250);
    s = await st();
    check('8: ✕ shrinks the row into the chip row', !s.rows.includes('Itinerary') && s.chips.includes('Itinerary'), s);
    await b.js(`document.querySelector('.hchip[data-t="Itinerary"]').click()`);
    await sleep(250);
    check('8: clicking the chip reopens it', (await st()).rows.includes('Itinerary'));
    const hidId = await b.js(`(()=>{const l=document.querySelector('.hrow[data-t="Slots_Events"] .hlab.nm .eye');const id=l.parentElement.dataset.id;l.click();return id})()`);
    await sleep(250);
    check('8: 👁 hides that record (bar gone) and counts it', await b.js(`!document.querySelector('.hb[data-id="${hidId}"]')&&/1 מוסתרות/.test(document.querySelector('.hidn')?.textContent||'')`));
    await b.js(`document.querySelector('.clr').click()`);
    await sleep(250);
    check('8: «נקה» brings it back', await b.js(`!!document.querySelector('.hb[data-id="${hidId}"]')`));
    const h0 = await b.js(`document.querySelector('.hrow[data-t="Staffing"]').offsetHeight`);
    const rz = await b.js(`(()=>{const r=document.querySelector('.hrow[data-t="Staffing"] .hrz').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    await drag(rz.x, rz.y, rz.x, rz.y + 60);
    const h1 = await b.js(`document.querySelector('.hrow[data-t="Staffing"]').offsetHeight`);
    check('8: dragging a header’s bottom edge makes the row taller', h1 > h0 + 30, {h0, h1});
    await shot('h-rowheight.png');
    const hd = await b.js(`(()=>{const r=document.querySelector('.hrow[data-t="Invitations"] .hd2').getBoundingClientRect();const t=document.querySelector('.hrow[data-t="Slots_Events"]').getBoundingClientRect();return {x:r.left+4,y:r.top+6,ty:t.top+4}})()`);
    await drag(hd.x, hd.y, hd.x, hd.ty, 10);
    s = await st();
    check('8: ⠿ drag moves «הזמנות» to the top', s.rows[0] === 'Invitations', s.rows);
    await b.go(NOW + '&keep=1', 2500);
    s = await st();
    const h2 = await b.js(`document.querySelector('.hrow[data-t="Staffing"]').offsetHeight`);
    check('8: order + row height survive a reload (per user)', s.rows[0] === 'Invitations' && h2 === h1, {rows: s.rows, h2, h1});
    const rzz = await b.js(`(()=>{const r=document.querySelector('.hrow[data-t="Staffing"] .hrz').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    await b.mouse('mouseMoved', rzz.x, rzz.y, {button: 'none'});
    await b.send('Input.dispatchMouseEvent', {type: 'mousePressed', x: rzz.x, y: rzz.y, button: 'left', clickCount: 1});
    await b.send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: rzz.x, y: rzz.y, button: 'left', clickCount: 1});
    await b.send('Input.dispatchMouseEvent', {type: 'mousePressed', x: rzz.x, y: rzz.y, button: 'left', clickCount: 2});
    await b.send('Input.dispatchMouseEvent', {type: 'mouseReleased', x: rzz.x, y: rzz.y, button: 'left', clickCount: 2});
    await sleep(250);
    check('8: double-click resets the row height', (await b.js(`document.querySelector('.hrow[data-t="Staffing"]').offsetHeight`)) === h0);
    await b.js(`localStorage.clear()`);
    // ------------------------------------------------ 9. column (row) funnel narrows timeline + window; window funnel additive
    await b.go(NOW, 2500);
    const n0 = await b.js(`document.querySelectorAll('.hrow[data-t="Slots_Events"] .hb').length`);
    await b.js(`document.querySelector('.hrow[data-t="Slots_Events"] .cf2').click()`);
    await sleep(200);
    check('9: the row funnel opens a checkbox menu', await b.js(`!!document.querySelector('.cfmenu .vi')`));
    // v0.1.2: configured fields come first (Type…); pick the value with most records so the row keeps items on this day
    await b.js(`[...document.querySelectorAll('.cfmenu .vi')].sort((x,y)=>(+y.querySelector('.n').textContent)-(+x.querySelector('.n').textContent))[0].click()`);
    await sleep(300);
    const n1 = await b.js(`document.querySelectorAll('.hrow[data-t="Slots_Events"] .hb').length`);
    check('9: picking a value narrows that row; the funnel shows a count', n1 < n0 && (await b.js(`/\\d/.test(document.querySelector('.hrow[data-t="Slots_Events"] .cf2').textContent)`)), {n0, n1});
    await b.js(`document.body.click()`);
    await b.go(NOW, 2500);
    const w0 = await b.js(`document.querySelectorAll('.wg .wc:not(.more)').length`);
    await b.js(`document.querySelector('.wh .wf').click()`);
    await sleep(200);
    await b.js(`document.querySelector('.wfmenu [data-o="nocancel"]').click()`);
    await sleep(250);
    const w1 = await b.js(`document.querySelectorAll('.wg .wc:not(.more)').length`);
    const tl1 = await b.js(`document.querySelectorAll('.hb').length`);
    await b.js(`document.querySelector('.wfmenu [data-o="clearall"]').click()`);
    await sleep(250);
    check('9: window filters only narrow the window (timeline untouched); «נקה הכל» restores it', w1 <= w0 && (await b.js(`document.querySelectorAll('.hb').length`)) === tl1 && (await b.js(`document.querySelectorAll('.wg .wc:not(.more)').length`)) === w0, {w0, w1});
    // ------------------------------------------------ 10. quiet tables close by default (31.10 default open) + chips
    await b.go('?open=default&now=2026-10-10T09:00:00Z', 2500);
    s = await st();
    const dayT = await b.js(`document.querySelector('.ban .ctr').textContent`);
    check('10: default open = 31.10', /31\.10/.test(dayT), dayT);
    const quiet = await b.js(`[...document.querySelectorAll('.hchip.quiet')].map(c=>c.dataset.t)`);
    check('10: quiet tables (no items that day) start closed in the chip row; the rest are rows', quiet.length >= 1 && s.rows.length + s.chips.length === 7, {rows: s.rows, quiet});
    await shot('h-quiet-chips.png', {x: 0, y: 0, width: 1280, height: 420});
    if (quiet.length) {
        await b.js(`document.querySelector('.hchip[data-t="${quiet[0]}"]').click()`);
        await sleep(250);
        check('10: a quiet chip reopens its (empty) row', (await st()).rows.includes(quiet[0]));
    }
    // ------------------------------------------------ 11. DST + status / mapping / inline-edit panels + config key
    await b.go('?now=2026-10-25T09:07:00Z', 2500);
    check('11: DST day 25.10 (UTC+2 after the change): 11:07 → 11:05', (await clock()) === '11:05', await clock());
    await b.go('?now=2026-10-24T08:07:00Z', 2500);
    check('11: day before (UTC+3): 11:07 → 11:05', (await clock()) === '11:05', await clock());
    await b.go(NOW + '&cfgmap=1&cfgkey=h&status=1&mapping=1&edit=1', 3000);
    const pan = await b.js(`({st:!!document.querySelector('.csfst'),ed:!!document.querySelector('.csfed'),ft:document.querySelector('.ftr').textContent,txt:(document.querySelector('.csfst')?.textContent||'').slice(0,4000)})`);
    check('11: «מצב חיבור» + mapping + «עריכה ישירה» toggles all work here', pan.st && pan.ed && /Attachment_Mapping_Image|מיפוי|mapping/i.test(pan.txt), pan.txt.slice(0, 300));
    check('11: reads the row Extension = timeline-horizontal-days', /timeline-horizontal-days/.test(pan.ft), pan.ft);
    await shot('h-status.png');
    await b.go(NOW + '&cfgmap=1&cfgkey=hv', 2500);
    check('11: only the vertical’s «timeline» row → guard: code defaults, never that row', /ברירות מחדל בקוד/.test(await b.js(`document.querySelector('.ftr').textContent`)));
    // ------------------------------------------------ 12. dense afternoon + lodging renders, compress OFF
    await b.go('?now=2026-11-02T13:20:00Z&dense=1&crowd=1', 3000);
    const dl = await b.js(`(()=>{const L=[...document.querySelectorAll('.hlab.nm')].map(e=>e.getBoundingClientRect());let o=0;for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const a=L[i],c=L[j];if(a.right>c.left+1&&a.left<c.right-1&&a.bottom>c.top+1&&a.top<c.bottom-1)o++}
      const cut=[...document.querySelectorAll('.hlab.nm b')].filter(e=>e.scrollWidth>e.getBoundingClientRect().width+0.5).length;return {n:L.length,o,cut}})()`);
    check('12: dense afternoon: no two name labels overlap, no name cut', dl.n > 20 && dl.o === 0 && dl.cut === 0, dl);
    await shot('h-dense.png');
    await b.go('?now=2026-11-02T11:07:00Z', 2500);
    const lg = await b.js(`(()=>{const r=document.querySelector('.hrow[data-t="Lodging"]');r.scrollIntoView({block:'center'});return {c:r.querySelectorAll('.hlc').length,cnt:[...r.querySelectorAll('.hcnt')].map(e=>e.textContent),inM:r.querySelectorAll('.hmk.in').length,out:r.querySelectorAll('.hmk.out').length,g:r.querySelectorAll('.hgn').length}})()`);
    check('12: lodging = merged bar per hotel, in-house counts, ↓ check-in / ↑ check-out marks, stacked names', lg.c >= 1 && lg.cnt.length >= 1 && lg.inM >= 1 && lg.g >= 2, lg);
    await sleep(300);
    const pillO = await b.js(`(()=>{const r=[...document.querySelectorAll('.hcnt')].map(e=>({t:e.title,top:e.style.top,...e.getBoundingClientRect().toJSON()}));let o=0;for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++){const a=r[i],c=r[j];if(a.top===c.top&&a.left<c.right-0.5&&c.left<a.right-0.5)o++}return {n:r.length,o}})()`);
    check('12: lodging in-house pills never overlap (unique keys per hotel)', pillO.o === 0 && pillO.n > 0, pillO);
    await shot('h-lodging.png');
    await b.js(`document.querySelector('.dd .menu .tog[data-slot^="Toggle_2"]')?.click()`);
    await sleep(400);
    check('12: compress OFF → every hour drawn, no folded stretch', await b.js(`document.querySelectorAll('.hgap').length===0`));
    await b.go(NOW + '&map=1', 2500);
    await sleep(1600);
    await shot('config-map-h010.png');
    await b.go(NOW, 2500);
    await shot('ui-h010.png');
} catch (e) {
    fail.push('crash: ' + (e?.stack || e));
}
b.close?.();
console.log(JSON.stringify({ok: ok.length, fail}, null, 1));
for (const x of ok) console.log('  ok  ', x);
for (const x of fail) console.log('  FAIL', x);
process.exit(fail.length ? 1 : 0);
