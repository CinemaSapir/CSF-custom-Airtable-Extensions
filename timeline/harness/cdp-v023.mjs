// v0.2.3 e2e — SDK palette (whole chrome), band title once, all-day-only columns → strips. REAL input via CDP. `--shots` writes evidence.
import {open, sleep, here} from './cdp.mjs';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
const shots = process.argv.includes('--shots');
const EV = resolve(here, '../evidence');
const ok = [],
    fail = [];
const check = (n, c, info) => (c ? ok : fail).push(info === undefined ? n : `${n} :: ${JSON.stringify(info)}`);
// every colour the old palettes used: v0.2.2 styles + v0.2.2 table colours, Countdown v0.4.2, SHARED-UI-TOKENS (crimson / greys)
const OLD = ['#22252d','#262420','#2f2f2f','#2f5f3d','#3d7a4e','#3f7f8c','#4a3d78','#4a463f','#4f5466','#57534b','#5a4a8c','#5f5a51','#6aabb8','#6b7280','#6c5a9e','#6e3a32','#6f6a62','#776f64','#7a0220','#7d1f3f','#7d4a42','#7eb58a','#857d71','#8a4a40','#8a8276','#8a94c4','#9a9183','#a35d52','#a8022d','#a9cfd6','#a9d8e0','#b9af9f','#c4bbad','#c4c7cf','#c9847a','#c9b36a','#cfc6b8','#cfe5d5','#d6cdbf','#dc043b','#dcdde3','#e2d9ca','#e4e6ec','#e6dfd2','#e7c4bd','#e7d3cd','#e8f2ea','#e9e3d8','#e9f4f6','#ece5d9','#efdcd6','#efe9de','#f1eef7','#f3f3f6','#f4efe6','#f5f5f7','#f6c9d4','#f7ebe7','#f8efec','#f8f4ec','#faf7f2','#fafafa','#fbf5f2','#fdeef2','#fdf9f4','#fffdf9','#3d7a6a','#3f7f8c','#437a51','#4d6f8f','#5a64a3','#6c5a9e','#7a6a2a','#87632a','#8a6f1e','#8a94c4','#8c4f6e','#94574c','#a35d52','#b0574a','#c9847a','#c9b36a'];
// the SDK palette, from the SDK's own module (same one the block calls through colorUtils)
const src = readFileSync(resolve(here, '../node_modules/@airtable/blocks/dist/esm/shared/colors.js'), 'utf8');
const SDK = {};
for (const m of src.matchAll(/\[Colors\.([A-Z_0-9]+)\]:\s*\[(\d+),\s*(\d+),\s*(\d+)\]/g)) {
    const name = m[1].toLowerCase().replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/(Light|Dark)(\d)/, '$1$2');
    SDK[name] = '#' + [m[2], m[3], m[4]].map(x => (+x).toString(16).padStart(2, '0')).join('');
}
const ALLOWED = new Set([...Object.values(SDK), '#ffffff', '#000000']);
const b = await open({width: 1280, height: 800});
// collects every opaque colour actually painted (text, background, borders) + where it is
const SCAN = `(()=>{const out={};const cv=document.createElement('canvas').getContext('2d');
 const hex=c=>{if(!c||c==='transparent')return null;const k=c.match(/^color\\(srgb ([\\d.e-]+) ([\\d.e-]+) ([\\d.e-]+)(?: \\/ ([\\d.]+))?\\)/);if(k){if(k[4]!==undefined&&+k[4]<0.999)return null;return '~#'+[k[1],k[2],k[3]].map(x=>Math.round(+x*255).toString(16).padStart(2,'0')).join('')}cv.fillStyle='#010203';cv.fillStyle=c;const v=cv.fillStyle;if(v.startsWith('#'))return v.toLowerCase();const m=v.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(',').map(Number);if(p.length>3&&p[3]<0.999)return null;return '#'+p.slice(0,3).map(x=>x.toString(16).padStart(2,'0')).join('')};
 for(const e of document.querySelectorAll('body *')){const r=e.getBoundingClientRect();if(!r.width||!r.height)continue;const s=getComputedStyle(e);if(s.visibility==='hidden'||s.display==='none')continue;
  const props=['color','backgroundColor'];for(const side of ['Top','Right','Bottom','Left'])if(parseFloat(s['border'+side+'Width'])>0&&s['border'+side+'Style']!=='none')props.push('border'+side+'Color');
  for(const p of props){if(p==='color'&&!e.childNodes.length)continue;const h=hex(s[p]);if(!h)continue;(out[h]=out[h]||[]).push((e.className&&e.className.baseVal===undefined?String(e.className).split(' ')[0]:e.tagName)+'.'+p)}}
 return out})()`;
const setXs = async on => {
    const isOn = await b.js(`!document.querySelector('.tl').classList.contains('nox')`);
    if (isOn !== on) {
        await b.clickSel('.win .tog');
        await sleep(400);
    }
};
const st = () => b.js(`({clock:document.querySelector('.clock').textContent, day:document.querySelector('.ban .ctr').textContent, top:document.querySelector('.vp').scrollTop})`);
const mixes = new Set(); // tints derived with color-mix() from SDK colours (strip tint, all-day row)
const scanAll = async (label, bad, stray) => {
    const c = await b.js(SCAN);
    const near = (a, z) => [1, 3, 5].every(i => Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(z.slice(i, i + 2), 16)) <= 3);
    for (const k in c) {
        const mix = k.startsWith('~'), h = mix ? k.slice(1) : k;
        // direct colours: ±3/channel; color-mix tints of SDK colours: exact
        if (OLD.some(o => (mix ? o === h : near(h, o)))) bad.push([label, k, c[k].slice(0, 4)]);
        else if (!mix && !ALLOWED.has(h)) stray.push([label, h, c[k].slice(0, 4)]);
        else if (mix) mixes.add(h);
    }
    return c;
};
try {
    check('SDK palette parsed from the SDK module', SDK.redDark1 === '#ba1e45' && SDK.grayDark1 === '#444444', SDK.redDark1);
    // ---------------- Critic's B.png view: Mon 2.11.26 13:50 Israel
    await b.go('?now=2026-11-02T11:50:00Z');
    await sleep(700);
    if (shots) await b.shot(resolve(EV, 'ui-v023-B.png'));
    const bad = [],
        stray = [];
    const c1 = await scanAll('2.11', bad, stray);
    // menus + toggles + hover states
    await b.clickSel('.dd.res > button');
    await sleep(250);
    await scanAll('res menu', bad, stray);
    await b.key('Escape');
    await b.clickSel('.cols .cf2'); // v0.2.5: the column funnel replaced the top-bar facet pills
    await sleep(250);
    await scanAll('filter menu', bad, stray);
    await b.js(`document.body.click()`);
    await setXs(true);
    const c2 = await scanAll('xs on', bad, stray);
    // prep + wrap days (every day separator in the canvas is painted, so scan the separators directly)
    const seps = await b.js(`[...document.querySelectorAll('.dayh')].map(e=>[e.className.split(' ')[1],getComputedStyle(e).backgroundColor])`);
    const sepSet = {};
    for (const [ph, bg] of seps) (sepSet[ph] = sepSet[ph] || new Set()).add(bg);
    const rgb = h => 'rgb(' + [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')';
    check('separators: festival grayLight2 · prep cyanLight2 · wrap yellowLight2',
        [...(sepSet.fest || [])].join() === rgb(SDK.grayLight2) && [...(sepSet.prep || [])].join() === rgb(SDK.cyanLight2) && [...(sepSet.wrap || [])].join() === rgb(SDK.yellowLight2),
        Object.fromEntries(Object.entries(sepSet).map(([k, v]) => [k, [...v]])));
    await b.go('?now=2026-10-20T09:00:00Z');
    await sleep(600);
    const banPrep = await b.js(`getComputedStyle(document.querySelector('.ban')).backgroundColor`);
    check('prep-day banner = cyanLight2', banPrep === rgb(SDK.cyanLight2), banPrep);
    if (shots) await b.shot(resolve(EV, 'ui-v023-prep-day.png'));
    await scanAll('prep day', bad, stray);
    await b.go('?now=2026-11-08T09:00:00Z');
    await sleep(600);
    const banWrap = await b.js(`getComputedStyle(document.querySelector('.ban')).backgroundColor`);
    check('wrap-day banner = yellowLight2', banWrap === rgb(SDK.yellowLight2), banWrap);
    await scanAll('wrap day', bad, stray);
    check('no old palette colour (terracotta, cream, countdown hues, crimson, v0.2.2 table hexes) is painted anywhere', bad.length === 0, bad.slice(0, 12));
    check('every opaque painted colour is an SDK colour or white/black (+ color-mix tints of them)', stray.length === 0, {stray: stray.slice(0, 12), mixes: [...mixes]});
    // red only for now + cross-section
    const redAt = [...new Set([...(c1[SDK.redDark1] || []), ...(c2[SDK.redDark1] || [])].map(x => x.split('.')[0]))];
    check('redDark1 only on Now (now line, time tag, clock) and the cross-section (label) + v0.2.4 centre day label (the owner: crimson)', redAt.every(x => ['nowl', 'tnow', 'clock', 'bl', 'BDI', 'num', 'wh', 'B', 'ctr', 'big'].includes(x)), redAt);
    const redOwners = await b.js(`(()=>{const out=[];for(const e of document.querySelectorAll('body *')){const s=getComputedStyle(e);if([s.color,s.backgroundColor,s.borderTopColor].includes('rgb(186, 30, 69)')&&!e.closest('.nowl,.tnow,.clock,.ctr,.bl,.band,.wh,.win .wh,.tl-now')&&e.getBoundingClientRect().width)out.push(e.className||e.tagName)}return out})()`);
    check('redDark1 never painted outside now / cross-section owners', redOwners.length === 0, redOwners);
    // ---------------- card text + table line = <hue>Dark1
    await b.go('?now=2026-11-02T11:50:00Z');
    await sleep(600);
    await setXs(true);
    const ink = await b.js(`[...new Set([...document.querySelectorAll('.ev, .ev b, .ev small, .wc, .wc .nm, .wc .tg, .chip')].map(e=>getComputedStyle(e).color))]`);
    check('card text is #444444 everywhere (cards, window cards, tags, chips)', ink.length === 1 && ink[0] === 'rgb(68, 68, 68)', ink);
    const staff = await b.js(`(()=>{const e=document.querySelector('.canvas .col[data-t="Staffing"] .ev');const s=getComputedStyle(e);return {fill:s.getPropertyValue('--tint').trim(),line:s.borderInlineStartColor}})()`);
    check('Staffing: fill tealLight2, line tealDark1 (derived from the Option_List_6 name)', staff.fill === SDK.tealLight2 && staff.line === rgb(SDK.tealDark1), staff);
    const hdr = await b.js(`(()=>{const e=document.querySelector('.cols > [data-t="Booking Resources"]');return getComputedStyle(e).getPropertyValue('--c').trim()})()`);
    check('ציוד (purpleLight1) header/strip line = purpleDark1', hdr === SDK.purpleDark1, hdr);
    const sb = await b.js(`getComputedStyle(document.querySelector('.vp')).scrollbarColor`);
    check('scrollbars: grayLight1 on white', sb === rgb(SDK.grayLight1) + ' rgb(255, 255, 255)', sb);
    const title = await b.js(`getComputedStyle(document.querySelector('.ptl')).color`);
    check('«טיימליין» title = grayDark1', title === rgb(SDK.grayDark1), title);

    // ---------------- band: the title shows once
    const lens = await b.js(`[...document.querySelectorAll('.canvas .ev')].filter(e=>e.querySelector('.lens')).map(e=>{const l=e.querySelector('.lens'),own=e.querySelector(':scope > b'),lr=l.getBoundingClientRect(),or=own.getBoundingClientRect();
      const ownVis=getComputedStyle(own).visibility!=='hidden';const names=[...e.querySelectorAll('b')].filter(x=>{const q=x.getBoundingClientRect();return getComputedStyle(x).visibility!=='hidden'&&x.textContent===own.textContent&&q.bottom>lr.top+1&&q.top<lr.bottom-1}).length;return {n:own.textContent,names,head:e.classList.contains('lenshead'),ownVis,overlap:ownVis&&or.bottom>lr.top+1&&or.top<lr.bottom-1}})`);
    const gp = lens.find(x => /גבול פתוח/.test(x.n));
    check('«הקרנה: גבול פתוח» is in the band, lens owns its head and the own title is hidden (title once)', gp && gp.head && !gp.ownVis, gp);
    check('no card in the band shows its own title under/over the lens', lens.length > 0 && lens.every(x => !x.overlap), lens);
    check('every card in the band shows its name exactly once inside the band (v0.2.6: the lens = name only)', lens.every(x => x.names === 1), lens.map(x => [x.n, x.names]));
    if (shots) {
        const r = await b.js(`(()=>{const e=[...document.querySelectorAll('.canvas .ev')].find(e=>/גבול פתוח/.test(e.textContent));const r=e.getBoundingClientRect();return {x:Math.max(0,r.left-130),y:Math.max(0,r.top-110),width:r.width+180,height:r.height+170}})()`);
        await b.shot(resolve(EV, 'ui-v023-band-card.png'), r);
    }
    // ---------------- strips: 0-count all-day-only columns go to the side strips per day
    const cols = await b.js(`Object.fromEntries([...document.querySelectorAll('.cols > [data-t]')].map(e=>[e.dataset.t,{cz:e.classList.contains('cz'),w:Math.round(e.getBoundingClientRect().width),n:e.querySelector('.vc')?.textContent}]))`);
    const three = ['Social Posts', 'Tasks', 'Booking Resources'];
    check('2.11 13:50: סושיאל / משימות / ציוד (0 on screen) are side strips', three.every(t => cols[t].cz && cols[t].w <= 32), three.map(t => cols[t]));
    check('busy columns get the freed width (משבצות ≥ 200px)', cols.Slots_Events.w >= 200, cols.Slots_Events);
    const lbl = await b.js(`document.querySelector('.canvas .col[data-t="Tasks"] .czl').textContent`);
    check('strip says it has all-day items above', /כל היום/.test(lbl), lbl);
    if (shots) await b.shot(resolve(EV, 'ui-v023-strips.png'));
    // scroll up to the day's all-day row → those columns come back (narrow all-day width) with their chips
    const adY = await b.js(`(()=>{const c=[...document.querySelectorAll('.canvas .col[data-t="Tasks"] .chip')].find(e=>/משובי קהל \\(1/.test(e.textContent));return parseFloat(c.style.top)})()`);
    await b.js(`document.querySelector('.vp').scrollTop=${adY}-120`);
    await sleep(500);
    const cols2 = await b.js(`Object.fromEntries([...document.querySelectorAll('.cols > [data-t]')].map(e=>[e.dataset.t,{cz:e.classList.contains('cz'),ad:e.classList.contains('adonly'),w:Math.round(e.getBoundingClientRect().width),n:e.querySelector('.vc')?.textContent}]))`);
    const d2 = (await st()).day;
    check('all-day row of 2.11 on screen → the three open at the all-day width, counted', /2\.11/.test(d2) && three.every(t => !cols2[t].cz && cols2[t].ad && +cols2[t].n > 0), {d2, c: three.map(t => cols2[t])});
    if (shots) await b.shot(resolve(EV, 'ui-v023-strips-allday-row.png'));
    // a click on the strip still forces it open
    await b.js(`document.querySelector('.vp').scrollTop=${adY}+900`);
    await sleep(400);
    const sp = await b.js(`(()=>{const r=document.querySelector('.canvas .col[data-t="Social Posts"]').getBoundingClientRect(),v=document.querySelector('.vp').getBoundingClientRect();return {x:r.left+r.width/2,y:v.top+v.height*0.8}})()`);
    await b.click(sp.x, sp.y);
    await sleep(400);
    const forced = await b.js(`document.querySelector('.cols > [data-t="Social Posts"]').classList.contains('cz')`);
    check('clicking a strip reopens it', forced === false, forced);
    if (shots) {
        await b.go('?map=1&now=2026-11-02T11:50:00Z');
        await sleep(2500);
        await b.shot(resolve(EV, 'config-map-v023.png'));
    }
} catch (e) {
    fail.push('EXCEPTION ' + (e && e.stack));
} finally {
    console.log(JSON.stringify({suite: 'cdp-v023', ok: ok.length, fail}, null, 1));
    for (const o of ok) console.log('PASS -', o);
    for (const f of fail) console.log('FAIL -', f);
    b.close();
    process.exit(fail.length ? 1 : 0);
}
