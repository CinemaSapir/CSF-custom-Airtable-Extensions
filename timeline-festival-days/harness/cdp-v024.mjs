// v0.2.4 e2e — cross-section window in the flow (headers slide below it), title+table pills (no time, smaller), table filter pills. REAL input via CDP.
import {open, sleep, here} from './cdp.mjs';
import {resolve} from 'node:path';
const shots = process.argv.includes('--shots');
const EV = resolve(here, '../evidence');
const ok = [],
    fail = [];
const check = (n, c, info) => (c ? ok : fail).push(info === undefined ? n : `${n} :: ${JSON.stringify(info)}`);
const b = await open({width: 1280, height: 800});
const R = sel => b.js(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.left*10)/10,y:Math.round(r.top*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,b:Math.round(r.bottom*10)/10,r:Math.round(r.right*10)/10}})()`);
const isOn = () => b.js(`!document.querySelector('.tl').classList.contains('nox')`);
const setXs = async on => {
    if ((await isOn()) !== on) {
        await b.clickSel('#xsTog');
        await sleep(600);
    }
};
const mdiff = (a, b) => Math.abs((+a.slice(0, 2) * 60 + +a.slice(3, 5)) - (+b.slice(0, 2) * 60 + +b.slice(3, 5)));
const clock = () => b.js(`document.querySelector('.clock').textContent`);
try {
    await b.go('?now=2026-11-02T11:50:00Z');
    await sleep(700);
    await setXs(true);
    // ---------------- 1. headers below the window, never covered
    const win = await R('.win'),
        cols = await R('.cols');
    check('1: column headers start below the open window (not covered)', cols.y >= win.b - 0.5, {win, cols});
    const covered = await b.js(`(()=>{const out=[];for(const h of document.querySelectorAll('.cols > [data-t]:not(.cz)')){const r=h.getBoundingClientRect();const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);if(!el||!el.closest('.cols'))out.push(h.dataset.t+'→'+(el&&el.className))}return out})()`);
    check('1: every header title is hit-testable (nothing floats over it)', covered.length === 0, covered);
    if (shots) await b.shot(resolve(EV, 'ui-v024-window-open.png'));
    // ---------------- 1. toggle: above stays put, below slides, centre time kept
    const above = async () => JSON.stringify({top: await R('.top'), ban: await R('.ban'), tog: await R('#xsTog'), wh: await R('.wh'), winTop: (await R('.win')).y});
    const a0 = await above(),
        c0 = await clock(),
        colsOn = (await R('.cols')).y;
    const tr = await b.js(`getComputedStyle(document.querySelector('.win .wslide')).transition`);
    check('1: the slide is animated (grid-template-rows transition)', /grid-template-rows/.test(tr), tr);
    await b.clickSel('#xsTog');
    await sleep(90);
    const mid = (await R('.cols')).y;
    await sleep(600);
    const colsOff = (await R('.cols')).y,
        a1 = await above(),
        c1 = await clock();
    check('1: OFF → toggle, window header row, banner and top row do not move', a0 === a1, {a0, a1});
    check('1: OFF → headers slide UP by the cards area', colsOff < colsOn - 20, {colsOn, colsOff});
    check('1: … through intermediate positions (a slide, not a jump)', mid < colsOn - 0.5 && mid > colsOff + 0.5, {colsOn, mid, colsOff});
    check('1: the centre time stays the same through the toggle', c0 === c1, [c0, c1]);
    if (shots) await b.shot(resolve(EV, 'ui-v024-window-closed.png'));
    await b.clickSel('#xsTog');
    await sleep(700);
    const a2 = await above(),
        c2 = await clock(),
        colsOn2 = (await R('.cols')).y;
    check('1: ON again → same layout as before, centre time kept', a2 === a0 && Math.abs(colsOn2 - colsOn) < 0.6 && mdiff(c2, c0) <= 1 /* ≤1 min = sub-pixel rounding at 6h */, {colsOn, colsOn2, c0, c2});
    // ---------------- 1. no jumping on scroll: the headers don't move while the slice content changes
    const vp = await R('.vp');
    const ys = [],
        nCards = [];
    for (let k = 0; k < 10; k++) {
        await b.wheel(vp.x + vp.w / 2, vp.y + vp.h / 2, 180);
        await sleep(220);
        ys.push((await R('.cols')).y);
        nCards.push(await b.js(`document.querySelectorAll('.wg .wc').length`));
    }
    check('1: scrolling with the window on never moves the headers (fixed card rows)', new Set(ys).size === 1, {ys, nCards});
    check('1: … while the number of window cards really changed', new Set(nCards).size > 1, nCards);
    await b.go('?now=2026-11-02T11:50:00Z');
    await sleep(700);
    // ---------------- 2/3. pills: title + table only, smaller
    const pill = await b.js(`(()=>{const c=[...document.querySelectorAll('.wg .wc')].filter(e=>!e.classList.contains('more'));const g=getComputedStyle(document.querySelector('.wg'));const s=getComputedStyle(c[0]);
      return {n:c.length,texts:c.map(e=>e.textContent),tm:document.querySelectorAll('.wg .tm').length,nm:getComputedStyle(c[0].querySelector('.nm')).fontSize,tg:getComputedStyle(c[0].querySelector('.tg')).fontSize,pad:s.padding,gap:g.rowGap+' '+g.columnGap,h:Math.round(c[0].getBoundingClientRect().height)}})()`);
    check('2: window pills have no hours/time at all', pill.n > 0 && pill.tm === 0 && pill.texts.every(t => !/\d{1,2}:\d\d/.test(t)), pill.texts);
    check('2: each pill = table tag + title only', await b.js(`[...document.querySelectorAll('.wg .wc:not(.more)')].filter(e=>e.querySelector('.nm.open')).every(e=>[...e.children].map(c=>c.className.split(' ')[0]).join()==='tg,nm,eye')`)); // v0.2.11: + 👁
    // v0.2.11 (the owner 17:01): half-width pills, 2-line title → title 12.5px, tag 9px, pill 40px tall
    check('3 (v0.2.11): title 12.5px, tag 9px', pill.nm === '12.5px' && pill.tg === '9px', pill);
    check('3 (v0.2.11): padding 3/6px, gap 4/6px, pill = 40px (2 lines)', pill.pad === '3px 6px' && pill.gap === '4px 6px' && pill.h <= 40, pill);
    if (shots) {
        const w = await R('.win');
        await b.shot(resolve(EV, 'ui-v024-pills-closeup.png'), {x: 560, y: w.y, width: 720, height: w.h + 4, scale: 2});
    }
    // ---------------- 4. table filter pills
    const tp = await b.js(`(()=>{const tog=document.querySelector('#xsTog').getBoundingClientRect();const lbl=document.querySelector('.wpills .wpl');return {lbl:lbl&&lbl.textContent,pills:[...document.querySelectorAll('.wpills .wp1')].map(e=>({t:e.dataset.t,on:e.classList.contains('on'),r:e.getBoundingClientRect().right,txt:e.textContent})),tog:tog.left,cardT:[...new Set([...document.querySelectorAll('.wg .wc:not(.more) .tg')].map(e=>e.textContent))]}})()`);
    check('4: small label + table pills to the LEFT of the toggle', tp.lbl && tp.pills.length > 0 && tp.pills.every(x => x.r <= tp.tog), tp);
    const labels = tp.pills.map(x => x.txt.replace(/[✕▾⇤\d]+$/u, ''));
    check('4: the pills are exactly the tables with items in the cross-section', labels.length === tp.cardT.length && tp.cardT.every(t => labels.includes(t)), {labels, cards: tp.cardT});
    const t0 = tp.pills[0].t;
    await b.clickSel(`.wpills .wp1[data-t="${t0}"] .sh`); /* v0.2.6: ⇤ = shrink to the strip (the old ✕); ✕ now hides */
    await sleep(350);
    const afterOff = await b.js(`({pill:document.querySelector('.wpills .wp1[data-t="${t0}"]')?.className,cards:[...document.querySelectorAll('.wg .wc:not(.more) .tg')].map(e=>e.textContent),saved:JSON.parse(localStorage.getItem('csf.timeline.v1.usrHarness')).wOff,all:!!document.querySelector('.wpills .wall')})`);
    const lab0 = tp.pills[0].txt.replace(/[✕▾⇤\d]+$/u, '');
    check('4: click → that table leaves the cross-section, its pill stays (off) to bring it back', /off/.test(afterOff.pill) && !afterOff.cards.includes(lab0) && afterOff.all, afterOff);
    check('4: the choice is saved per user', JSON.stringify(afterOff.saved) === JSON.stringify([t0]), afterOff.saved);
    const timelineSame = await b.js(`document.querySelectorAll('.canvas .col[data-t="${t0}"] .ev').length`);
    check('4: the timeline itself is untouched (window-only filter)', timelineSame > 0, timelineSame);
    if (shots) {
        const w = await R('.wh');
        await b.shot(resolve(EV, 'ui-v024-table-pills.png'), {x: 560, y: w.y - 4, width: 720, height: w.h + 8, scale: 2});
    }
    await b.go('?keep=1&now=2026-11-02T11:50:00Z');
    await sleep(700);
    const reload = await b.js(`({pill:document.querySelector('.wpills .wp1[data-t="${t0}"]')?.className,cards:[...document.querySelectorAll('.wg .wc:not(.more) .tg')].map(e=>e.textContent)})`);
    check('4: survives a reload', /off/.test(reload.pill) && !reload.cards.includes(lab0), reload);
    await b.clickSel(`.wpills .wp1[data-t="${t0}"]`);
    await sleep(350);
    const back = await b.js(`({pill:document.querySelector('.wpills .wp1[data-t="${t0}"]')?.className,cards:[...document.querySelectorAll('.wg .wc:not(.more) .tg')].map(e=>e.textContent),all:!!document.querySelector('.wpills .wall')})`);
    check('4: click again → back on; «הכל» disappears', /on/.test(back.pill) && back.cards.includes(lab0) && !back.all, back);
    check('4: old window-filter panel and «כמו בציר הזמן» link are gone', await b.js(`!document.querySelector('.wpanel,.wfb,.win .lnk')`));
    // palette: on-pill = table fill (SDK), text #444444
    const pc = await b.js(`(()=>{const e=document.querySelector('.wpills .wp1.on');const s=getComputedStyle(e);return {bg:s.backgroundColor,fg:s.color,f:s.getPropertyValue('--f').trim()}})()`);
    const hex = pc.f.replace('#', '');
    const rgb = `rgb(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)})`;
    check('palette: an on pill is its table fill (SDK) with #444444 text', pc.bg === rgb && pc.fg === 'rgb(68, 68, 68)', pc);
    // ---- v0.2.4b: big crimson day + time in the centre of the banner ----
    const bn = await b.js(`(()=>{const ban=document.querySelector('.ban').getBoundingClientRect(),c=document.querySelector('.ban .ctr'),r=c.getBoundingClientRect(),big=c.querySelector('.big'),ck=c.querySelector('.clock'),red=getComputedStyle(document.documentElement).getPropertyValue('--sdk-redDark1').trim();const jmp=document.querySelector('.ban input[type=date]').getBoundingClientRect();return {dc:Math.abs((r.left+r.right)/2-(ban.left+ban.right)/2),big:big.textContent,ck:ck.textContent,fs:[getComputedStyle(big).fontSize,getComputedStyle(ck).fontSize],col:[getComputedStyle(big).color,getComputedStyle(ck).color],red,jmpR:jmp.right,ctrL:r.left,oldClock:document.querySelectorAll('.clock').length}})()`);
    const redRgb = (h => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`)(bn.red);
    check('A: day label + clock sit in the centre of the top bar (±30px)', bn.dc < 30 && /יום \d/.test(bn.big) && /^\d\d:\d\d$/.test(bn.ck.trim()), bn);
    check('A: large (≥24px) and crimson (SDK redDark1)', bn.fs.every(f => parseFloat(f) >= 24) && bn.col.every(c => c === redRgb), bn);
    check('A: jump date/time stay on the left, one clock only', bn.jmpR < bn.ctrL && bn.oldClock === 1, bn);
    // ---- v0.2.4b: header tabs ----
    const hd = await b.js(`(()=>{const out=[];for(const h of document.querySelectorAll('.cols>div[data-t]:not(.cz)')){const g=h.querySelector('.hd2');if(!g||!g.offsetWidth)continue;const a=h.getBoundingClientRect(),q=g.getBoundingClientRect();out.push(a.right-q.right)}return {dots:[...document.querySelectorAll('.cols>div i')].filter(e=>e.offsetWidth>0).length,gap:out}})()`);
    check('A: no coloured dot in the header tabs', hd.dots === 0, hd);
    check('A: ⠿ sits at the far right (start edge in RTL) of each header', hd.gap.length > 0 && hd.gap.every(g => g >= 0 && g <= 8), hd);
    // ---- v0.2.4b: ✕ hides a table, off pills collapse to the far left ----
    await b.go('?now=2026-11-02T11:50:00Z&pf=Slots_Events.Type~any~');
    await sleep(900);
    await setXs(true);
    const ids = () => b.js(`[...document.querySelectorAll('.wg .wc .nm[data-id]')].map(e=>e.dataset.id).join()`);
    const tlN = () => b.js(`document.querySelectorAll('.canvas .ev').length`);
    const base0 = await ids(), tl0 = await tlN();
    const onT = await b.js(`[...document.querySelectorAll('.wpills .wp1.on')].map(e=>e.dataset.t)`);
    const tx = onT.find(t => t !== 'Slots_Events') ?? onT[0];
    await b.clickSel(`.wpills .wp1[data-t="${tx}"] .sh`); /* v0.2.6: ⇤ = shrink to the strip (the old ✕); ✕ now hides */
    await sleep(400);
    const lay = await b.js(`(()=>{const off=document.querySelector('.wpills .woff .wp1[data-t="${tx}"]');const ons=[...document.querySelectorAll('.wpills > .wp1.on')].map(e=>e.getBoundingClientRect().left);return {off:!!off,offL:off&&off.getBoundingClientRect().left,onMin:Math.min(...ons)}})()`);
    check('B: ✕ hides the table; its pill collapses to the far left (like the strips)', lay.off && lay.offL < lay.onMin, lay);
    await b.clickSel(`.wpills .woff .wp1[data-t="${tx}"]`);
    await sleep(400);
    check('B: clicking the collapsed pill brings it back', (await ids()) === base0, {tx});
    // ---- v0.2.4b: per-table multi-select dropdown (checkbox list) — narrows the window only (AND) ----
    await b.clickSel('.wpills .wp1[data-t="Slots_Events"] .vdd');
    await sleep(300);
    const opts = await b.js(`[...document.querySelectorAll('.vmenu .vi')].map(e=>e.textContent)`);
    check('C: ▾ on a pill opens a checkbox list of the field values (select/link)', opts.length > 3 && opts.includes('הקרנה') && (await b.js(`document.querySelectorAll('.vmenu [role=checkbox]').length`)) === opts.length, opts);
    await b.js(`[...document.querySelectorAll('.vmenu .vi')].find(e=>e.textContent==='הקרנה').click()`);
    await sleep(400);
    const nar = await b.js(`({ck:document.querySelector('.vmenu .vi.on')?.textContent,slots:[...document.querySelectorAll('.wg .wc')].filter(e=>e.querySelector('.tg')?.textContent==='משבצות').map(e=>e.querySelector('.nm').textContent),saved:JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>/timeline/i.test(k)))||'{}').wPick})`);
    check('C: ticking «הקרנה» narrows the window to screenings (✓ shown, saved per user)', nar.ck && nar.ck.includes('✓') && nar.slots.every(n => /הקרנה/.test(n)) && JSON.stringify(nar.saved) === JSON.stringify({Slots_Events: ['הקרנה']}), nar);
    check('C: the window filter ADDS to the timeline (timeline itself unchanged)', (await tlN()) === tl0, {tl0});
    await b.js(`document.body.click()`);
    await sleep(200);
    await b.clickSel('.wpills .wall');
    await sleep(400);
    check('C: «הכל» clears the window filters → exactly what the timeline shows', (await ids()) === base0 && !(await b.js(`!!document.querySelector('.wpills .wall')`)), {base0});
    // timeline filter (right pane) narrows timeline AND window
    await b.go('?now=2026-11-02T11:50:00Z&pf=Slots_Events.Type~none~הקרנה');
    await sleep(900);
    await setXs(true);
    const rp = await b.js(`({tl:[...document.querySelectorAll('.canvas .col[data-t="Slots_Events"] .ev')].map(e=>e.textContent).filter(t=>/הקרנה:/.test(t)).length,win:[...document.querySelectorAll('.wg .wc .nm')].map(e=>e.textContent).filter(t=>/הקרנה:/.test(t)).length})`);
    check('C: right-pane filter (Type is none of הקרנה) hides screenings in the timeline AND the window', rp.tl === 0 && rp.win === 0, rp);
    const props = await b.js(`window.__TL_PROPS.filter(p=>p.key.startsWith('f_')).map(p=>p.key+':'+p.type)`);
    check('C: right pane exposes per table field (field) + condition (enum) + values (string)', props.includes('f_Slots_Events_field:field') && props.includes('f_Slots_Events_op:enum') && props.includes('f_Slots_Events_vals:string') && props.length % 3 === 0, props);
    if (shots) {
        await b.go('?now=2026-11-02T11:50:00Z&pf=Slots_Events.Type~any~');
        await sleep(900);
        await setXs(true);
        await b.clickSel(`.wpills .wp1[data-t="Lodging"] .sh`).catch(() => {});
        await b.clickSel('.wpills .wp1[data-t="Slots_Events"] .vdd');
        await sleep(300);
        await b.js(`[...document.querySelectorAll('.vmenu .vi')].find(e=>e.textContent==='הקרנה').click()`);
        await sleep(400);
        await b.shot(resolve(EV, 'ui-v024-window-multiselect.png'));
        await b.shot(resolve(EV, 'ui-v024-banner-centre.png'), {x: 0, y: 0, width: 1280, height: 70});
    }
    if (shots) {
        await b.go('?map=1&now=2026-11-02T11:50:00Z');
        await sleep(2500);
        await b.shot(resolve(EV, 'config-map-v024.png'));
    }
} catch (e) {
    fail.push('EXCEPTION ' + (e && e.stack));
} finally {
    console.log(JSON.stringify({suite: 'cdp-v024', ok: ok.length, fail}, null, 1));
    for (const o of ok) console.log('PASS -', o);
    for (const f of fail) console.log('FAIL -', f);
    b.close();
    process.exit(fail.length ? 1 : 0);
}
