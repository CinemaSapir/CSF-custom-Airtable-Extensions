// v0.2.5 e2e — per-column filter funnel on every header tab; top-bar facet pills removed. REAL input via CDP.
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
const NOW = '?now=2026-11-02T11:50:00Z';
const vc = () => b.js(`Object.fromEntries([...document.querySelectorAll('.cols>div[data-t]')].map(h=>[h.dataset.t,+(h.querySelector('.vc')?.textContent||0)]))`);
const fun = t => b.js(`(()=>{const e=document.querySelector('.cols>div[data-t="${t}"] .cf2');if(!e)return null;const s=getComputedStyle(e);return {act:e.classList.contains('act'),n:e.querySelector('b')?.textContent||'',bg:s.backgroundColor}})()`);
const openF = async t => {
    await b.clickSel(`.cols>div[data-t="${t}"] .cf2`);
    await sleep(300);
};
const closeM = async () => {
    await b.js(`document.body.click()`);
    await sleep(200);
};
const tick = async v => {
    await b.js(`[...document.querySelectorAll('.cfmenu .vi')].find(e=>e.querySelector('.vt').textContent===${JSON.stringify(v)}).click()`);
    await sleep(350);
};
const tab = async k => {
    await b.js(`document.querySelector('.cfmenu .cfd a[data-d=${JSON.stringify(k)}]').click()`);
    await sleep(250);
};
try {
    await b.go(NOW);
    await sleep(800);
    await setXs(true);
    // ---- top bar: no facet pills
    const top = await b.js(`({f:document.querySelectorAll('.top .dd.f, .dd.f').length,lbl:[...document.querySelectorAll('.top .lbl')].map(e=>e.textContent),txt:document.querySelector('.top').innerText,srch:!!document.querySelector('.srch input'),res:!!document.querySelector('.dd.res')})`);
    check('top bar: מיקום / אדם / סרט / סטטוס pills and the «סינון» label are gone', top.f === 0 && !top.lbl.includes('סינון') && !/מיקום|סטטוס/.test(top.txt), top);
    check('top bar: search + resolution stay', top.srch && top.res);
    if (shots) await b.shot(resolve(EV, 'ui-v025-topbar-no-filters.png'), {x: 0, y: 0, width: 1280, height: 60, scale: 2});
    // ---- headers: funnel on each open tab, no dot, ⠿ far right
    const hd = await b.js(`(()=>{const out=[];for(const h of document.querySelectorAll('.cols>div[data-t]:not(.cz)')){const g=h.querySelector('.hd2'),f=h.querySelector('.cf2');const a=h.getBoundingClientRect();out.push({t:h.dataset.t,f:!!(f&&f.offsetWidth),g:g&&g.offsetWidth?Math.round(a.right-g.getBoundingClientRect().right):null,inside:f?f.getBoundingClientRect().left>=a.left-1&&f.getBoundingClientRect().right<=a.right+1:false})}return {out,dots:[...document.querySelectorAll('.cols>div i')].filter(e=>e.offsetWidth>0).length}})()`);
    check('headers: every open column tab has a funnel icon inside it', hd.out.length > 2 && hd.out.every(x => x.f && x.inside), hd.out);
    check('headers: no coloured dot, ⠿ at the far right', hd.dots === 0 && hd.out.every(x => x.g !== null && x.g >= 0 && x.g <= 8), hd);
    const f0 = await fun('Slots_Events');
    check('funnel idle: not highlighted, no count', f0 && !f0.act && f0.n === '', f0);
    if (shots) await b.shot(resolve(EV, 'ui-v025-headers-icons.png'), {x: 200, y: (await b.js(`document.querySelector('.cols').getBoundingClientRect().top`)) - 6, width: 1080, height: 40, scale: 2});
    const v0 = await vc();
    // ---- open the column filter menu (real click)
    await openF('Slots_Events');
    const m = await b.js(`({open:!!document.querySelector('.cfmenu'),tabs:[...document.querySelectorAll('.cfmenu .cfd a')].map(e=>e.dataset.d),vals:[...document.querySelectorAll('.cfmenu .vi')].map(e=>[e.querySelector('.vt').textContent,+e.querySelector('.n').textContent]),cbs:document.querySelectorAll('.cfmenu [role=checkbox]').length})`);
    check('click funnel → the column menu opens with a field chooser (מיקום … + raw fields)', m.open && m.tabs.includes('hall') && m.tabs.includes('f:Type'), m.tabs);
    check('… a multi-select checkbox list with counts', m.cbs === m.vals.length && m.vals.length >= 2 && m.vals.every(v => v[1] >= 0), m.vals);
    check('… a link field that repeats a facet (Location = מיקום) is not listed twice', !m.tabs.includes('f:Location'), m.tabs);
    const hall = m.vals[1][0],
        hallN = m.vals[1][1];
    await tick(hall);
    if (shots) await b.shot(resolve(EV, 'ui-v025-column-filter-menu.png'));
    const f1 = await fun('Slots_Events'),
        v1 = await vc();
    check('active: funnel highlighted (SDK grayDark1) + shows the count', f1.act && f1.n === '1' && f1.bg === 'rgb(68, 68, 68)', f1);
    check('active: narrows that column only (other columns unchanged)', v1.Slots_Events < v0.Slots_Events && Object.keys(v0).filter(t => t !== 'Slots_Events').every(t => v1[t] === v0[t]), {v0, v1, hallN});
    check('menu shows ✓ on the ticked value', await b.js(`[...document.querySelectorAll('.cfmenu .vi.on')].map(e=>e.textContent).join()`).then(x => x.includes('✓') && x.includes(hall)));
    // second dimension ANDs
    await tab('f:Type');
    const tv = await b.js(`[...document.querySelectorAll('.cfmenu .vi')].map(e=>[e.querySelector('.vt').textContent,+e.querySelector('.n').textContent])`);
    const pick = tv.find(x => x[1] > 0) ?? tv[0];
    await tick(pick[0]);
    const f2 = await fun('Slots_Events'),
        v2 = await vc();
    check('two dimensions AND, badge counts both', f2.n === '2' && v2.Slots_Events <= v1.Slots_Events, {f2, v1: v1.Slots_Events, v2: v2.Slots_Events});
    await tick(pick[0]);
    await closeM();
    // ---- the window follows (narrowed) timeline
    const sub = await b.js(`(()=>{const tl=new Set([...document.querySelectorAll('.canvas .ev[data-id]')].map(e=>e.dataset.id));const w=[...document.querySelectorAll('.wg .wc .nm[data-id]')].map(e=>e.dataset.id);return {w,miss:w.filter(id=>!tl.has(id))}})()`);
    check('cross-section shows only what the filtered timeline shows', sub.miss.length === 0, sub);
    // window pill ✕ stays additive (timeline unchanged)
    const pills = await b.js(`[...document.querySelectorAll('.wpills > .wp1.on')].map(e=>e.dataset.t)`);
    if (pills.length) {
        const vb = await vc();
        await b.clickSel(`.wpills .wp1[data-t="${pills[0]}"] .x`);
        await sleep(350);
        check('window pill ✕ is additive on top (timeline counts unchanged)', JSON.stringify(await vc()) === JSON.stringify(vb));
        await b.clickSel(`.wpills .woff .wp1[data-t="${pills[0]}"]`);
        await sleep(350);
    }
    // ---- saved per user
    const saved = await b.js(`(()=>{const k=Object.keys(localStorage).find(k=>/timeline/i.test(k));return k?JSON.parse(localStorage.getItem(k)).colF:null})()`);
    check('saved per user (localStorage colF)', saved && saved.Slots_Events && JSON.stringify(saved.Slots_Events.hall.vals) === JSON.stringify([hall]), saved);
    await b.go(NOW + '&keep=1');
    await sleep(900);
    const fr = await fun('Slots_Events');
    check('survives a reload', fr.act && fr.n === '1', fr);
    // ---- operator: is none of
    await openF('Slots_Events');
    await tab('hall');
    await b.js(`document.querySelector('.cfmenu .cfop a[data-op=none]').click()`);
    await sleep(350);
    const vN = await vc();
    check('«אינו אחד מ…» inverts the pick (column count changes, still active)', vN.Slots_Events !== v1.Slots_Events && (await fun('Slots_Events')).act, {any: v1.Slots_Events, none: vN.Slots_Events});
    // ---- נקה
    await b.js(`[...document.querySelectorAll('.cfmenu .cfa a')].find(a=>a.textContent==='נקה').click()`);
    await sleep(350);
    const fc = await fun('Slots_Events'),
        vC = await vc();
    check('«נקה» → funnel idle, column back to everything', !fc.act && vC.Slots_Events === v0.Slots_Events, {fc, vC: vC.Slots_Events, v0: v0.Slots_Events});
    await closeM();
    // ---- right-pane default behind the menu
    await b.go(NOW + '&pf=Slots_Events.Type~none~הקרנה');
    await sleep(900);
    const fd = await fun('Slots_Events'),
        vd = await vc();
    const scr = await b.js(`[...document.querySelectorAll('.canvas .col[data-t="Slots_Events"] .ev')].filter(e=>/הקרנה:/.test(e.textContent)).length`);
    check('right-pane default: funnel active (1) and screenings hidden', fd.act && fd.n === '1' && scr === 0, {fd, scr});
    await openF('Slots_Events');
    const dm = await b.js(`({tab:document.querySelector('.cfmenu .cfd a.on')?.dataset.d,op:document.querySelector('.cfmenu .cfop a.on')?.dataset.op,on:[...document.querySelectorAll('.cfmenu .vi.on .vt')].map(e=>e.textContent),def:[...document.querySelectorAll('.cfmenu .cfa a')].map(a=>a.textContent)})`);
    check('… the menu opens on that field with the default ticked + «ברירת מחדל»', dm.tab === 'f:Type' && dm.op === 'none' && dm.on.join() === 'הקרנה' && dm.def.includes('ברירת מחדל'), dm);
    await b.js(`[...document.querySelectorAll('.cfmenu .cfa a')].find(a=>a.textContent==='נקה').click()`);
    await sleep(350);
    const vu = await vc();
    check('… the user can override it («נקה» brings screenings back)', vu.Slots_Events > vd.Slots_Events && !(await fun('Slots_Events')).act, {vd: vd.Slots_Events, vu: vu.Slots_Events});
    await b.js(`[...document.querySelectorAll('.cfmenu .cfa a')].find(a=>a.textContent==='ברירת מחדל').click()`);
    await sleep(350);
    check('… «ברירת מחדל» returns to the right-pane value', (await vc()).Slots_Events === vd.Slots_Events && (await fun('Slots_Events')).act);
    await closeM();
    if (shots) {
        await b.go('?map=1&now=2026-11-02T11:50:00Z');
        await sleep(2500);
        await b.shot(resolve(EV, 'config-map-v025.png'));
    }
} catch (e) {
    fail.push('EXCEPTION ' + (e && e.stack));
} finally {
    console.log(JSON.stringify({suite: 'cdp-v025', ok: ok.length, fail}, null, 1));
    for (const o of ok) console.log('PASS -', o);
    for (const f of fail) console.log('FAIL -', f);
    b.close();
    process.exit(fail.length ? 1 : 0);
}
