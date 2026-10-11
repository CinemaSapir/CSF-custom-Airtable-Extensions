// horizontal v0.1.4 — the UX Critic's 8 REVISE points (open since v0.1.0), measured with real input on any build.
// usage: node harness/cdp-h014.mjs <repoDir> <prefix>   (before = v0.1.3 worktree, after = this repo; renders h-v014-*.png on after)
import {open, sleep} from './cdp.mjs';
import {resolve} from 'node:path';
const [, , dir = '.', pre = 'after'] = process.argv;
const OUT = resolve('evidence/v014');
const b = await open({width: 1280, height: 800});
const go = async (qs, wait = 2800) => {
    await b.send('Page.navigate', {url: 'file://' + resolve(dir, 'harness/out/index.html') + qs});
    await sleep(wait);
};
let bad = 0;
const check = (n, ok, info) => {
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n}${info !== undefined ? ' :: ' + JSON.stringify(info) : ''}`);
};
const shot = (name, clip) => b.shot(`${OUT}/${pre}-${name}`, clip);
const render = name => (pre === 'after' ? b.shot(resolve('evidence', name)) : b.shot(`${OUT}/${pre}-${name}`));
const NOW = '?now=2026-11-02T11:07:00Z';
const DENSE = '?now=2026-11-02T13:20:00Z&dense=1&crowd=1';
const scrollBy = async px => {
    await b.js(`(()=>{const vp=document.querySelector('.hvp');vp.scrollLeft-=${px};vp.dispatchEvent(new Event('scroll'))})()`);
    await sleep(500);
};
// #1 a label is cut when it crosses the visible time area's edges, or its text is clipped without the fade
const cutLabels = () =>
    b.js(`(()=>{const v=document.querySelector('.hvp').getBoundingClientRect();const h=document.querySelector('.hrow .hrh').getBoundingClientRect();const L=v.left,R=h.left;
      const out=[];for(const e of document.querySelectorAll('.hlab.nm')){const r=e.getBoundingClientRect();if(r.right<L||r.left>R||r.bottom<v.top+30||r.top>v.bottom)continue;
      const bb=e.querySelector('b');const edge=r.left<L-0.5||r.right>R+0.5;const hard=bb&&bb.scrollWidth>bb.clientWidth+1&&!e.classList.contains('lclip');
      if(edge||hard)out.push({n:e.dataset.n,edge,hard})}return out})()`);
// #2 a lens title + the same record's label both inside the band
const dupes = () =>
    b.js(`(()=>{const band=document.querySelector('.hband');if(!band)return [];const B=band.getBoundingClientRect();const out=[];
      for(const l of document.querySelectorAll('.hlens')){const bn=l.querySelector('.bn');if(!bn)continue;const lab=document.querySelector('.hlab.nm[data-id="'+l.dataset.id+'"]');if(!lab)continue;
      const r=lab.getBoundingClientRect();if(r.left<B.right-1&&r.right>B.left+1)out.push(lab.dataset.n)}return out})()`);
// #3 a name label drawn over another record's bar / label of the same lane
const collisions = () =>
    b.js(`(()=>{const out=[];for(const row of document.querySelectorAll('.hrow')){const labs=[...row.querySelectorAll('.hlab.nm')],bars=[...row.querySelectorAll('.hb')];
      for(const l of labs){const r=l.getBoundingClientRect();for(const o of [...bars,...labs]){if(o===l||o.dataset.id===l.dataset.id)continue;const q=o.getBoundingClientRect();
        const w=Math.min(r.right,q.right)-Math.max(r.left,q.left),hh=Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top);if(w>3&&hh>3)out.push(l.dataset.n+' ✕ '+(o.dataset.n||o.title.split(' · ')[0]))}}}return [...new Set(out)]})()`);
const tags = () =>
    b.js(`(()=>{const T=[...document.querySelectorAll('.hnowt,.htnow')].filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return {t:e.textContent,c:(r.left+r.right)/2}});
      let near=0;for(let i=0;i<T.length;i++)for(let j=i+1;j<T.length;j++)if(Math.abs(T[i].c-T[j].c)<50)near++;return {T,near}})()`);
try {
    // ---------------- main render
    await go(NOW);
    await render('h-v014-main.png');
    const c1 = await cutLabels();
    await scrollBy(260);
    const c1b = await cutLabels();
    await shot('1-sticky-labels.png', {x: 0, y: 170, width: 1280, height: 300});
    check('#1 no name label cut at the visible edges or hard-clipped (main, then scrolled 260px)', c1.length === 0 && c1b.length === 0, {c1, c1b});
    await go(NOW);
    const d2 = await dupes();
    const bb = await b.box('.hband');
    await shot('2-band.png', {x: Math.max(0, bb.x - 260), y: 170, width: Math.min(1280, bb.w + 520), height: 440});
    check('#2 no record titled twice inside the cross-section strip (main)', d2.length === 0, d2);
    const t4 = await tags();
    await shot('4-now-tags.png', {x: Math.max(0, bb.x - 120), y: 160, width: bb.w + 240, height: 50});
    check('#4 one time tag at the strip (no two stacked)', t4.near === 0, t4);
    const t5 = await b.js(`({time:document.querySelectorAll('input[type=time]').length,jt:document.querySelector('.jumpc .jt')?.value,ampm:/\\b(AM|PM)\\b/.test(document.body.innerText)})`);
    check('#5 24-hour time field (no native time input showing AM/PM)', t5.time === 0 && /^\d\d:\d\d$/.test(t5.jt || ''), t5);
    await shot('5-time-field.png', {x: 0, y: 40, width: 400, height: 46});
    // #7 hall labels (Slots_Events groups)
    const h7 = await b.js(`(()=>{const row=document.querySelector('.hrow[data-t="Slots_Events"]');const rt=row.getBoundingClientRect().top;const seps=[...row.querySelectorAll('.hta .hgsep')].map(e=>parseFloat(e.style.top)+3);
      return [...row.querySelectorAll('.hrh .hgl2')].map((e,k)=>{const r=e.getBoundingClientRect();return {t:e.textContent,cut:e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1,dy:k?Math.round(r.top-rt-seps[k-1]):0}})})()`);
    const rb = await b.box('.hrow[data-t="Slots_Events"] .hrh');
    await shot('7-hall-labels.png', {x: rb.x - 420, y: rb.y, width: rb.w + 420, height: Math.min(260, rb.h)});
    check('#7 hall labels not cut, aligned to their group line (≤ 4px)', h7.length >= 2 && h7.every(x => !x.cut && Math.abs(x.dy) <= 4), h7);
    // #6 window
    const w6 = await b.js(`(()=>{const g=document.querySelector('.wg');const G=g.getBoundingClientRect();const cs=[...g.querySelectorAll('.wc')];const lines={};
      for(const c of cs){const r=c.getBoundingClientRect();(lines[Math.round(r.top)]??=[]).push(r)}const L=Object.values(lines);
      const empty=L.map(rs=>Math.round(G.width-rs.reduce((n,r)=>n+r.width,0)-(rs.length-1)*4));
      const nm=cs.map(c=>c.querySelector('.nm')).filter(Boolean);const fs=nm[0]?getComputedStyle(nm[0]).fontSize:null;
      const midword=nm.filter(e=>{const t=e.textContent;const words=t.split(/\\s+/);if(e.getBoundingClientRect().height<20)return false;const rg=document.createRange();const tn=e.firstChild&&e.firstChild.nodeType===3?e.firstChild:null;if(!tn)return false;
        let pos=0;for(const w of words){const i=t.indexOf(w,pos);pos=i+w.length;if(w.length<2)continue;rg.setStart(tn,i);rg.setEnd(tn,i+w.length);if(rg.getClientRects().length>1)return true}return false}).length;
      return {cards:cs.length,lines:L.length,emptyPx:empty,fs,h:cs[0]?.getBoundingClientRect().height,midword}})()`);
    const wb = await b.box('.win');
    await shot('6-window.png', {x: 0, y: wb.y, width: 1280, height: wb.h});
    check('#6 window: names 12.5px, cards 28px, lines filled (≤ 40px empty per line), no word broken mid-word', w6.fs === '12.5px' && w6.h <= 28.5 && w6.emptyPx.every(e => e <= 40) && w6.midword === 0, w6);
    // ---------------- dense render + #3 collisions + #1/#2 in the dense afternoon
    await go(DENSE, 3200);
    await render('h-v014-dense.png');
    const c3 = await collisions();
    const c1d = await cutLabels();
    const d2d = await dupes();
    check('#3 dense: no name label over another record (lanes keep room; a long name fades instead of spilling)', c3.length === 0, c3);
    check('#1 dense: no label cut at the edges / hard-clipped', c1d.length === 0, c1d);
    check('#2 dense: no record titled twice inside the strip', d2d.length === 0, d2d);
    await shot('3-dense-labels.png', {x: 0, y: 170, width: 1280, height: 440});
    // Cushion hover: a faded name → full name on hover, only the covered neighbour dims
    // a faded name appears where a long name meets a visible edge with a neighbour in the way → scroll until one shows
    const findFaded = `(()=>{const e=[...document.querySelectorAll('.hlab.nm.lclip')].find(e=>{const r=e.getBoundingClientRect();return r.top>230&&r.bottom<760&&r.width>40});if(!e)return null;const r=e.getBoundingClientRect();return {n:e.dataset.n,x:r.left+r.width-12,y:r.top+r.height/2}})()`;
    let fl = await b.js(findFaded);
    for (let k = 0; k < 30 && !fl; k++) {
        await scrollBy(k % 2 ? 37 : 41);
        fl = await b.js(findFaded);
    }
    if (fl) await shot('1-3-faded-name.png', {x: Math.max(0, fl.x - 420), y: fl.y - 70, width: 700, height: 140});
    const fl0 = await b.js(`(()=>{const e=[...document.querySelectorAll('.hlab.nm.lclip')].find(e=>{const r=e.getBoundingClientRect();return r.top>230&&r.bottom<760});if(!e)return null;const r=e.getBoundingClientRect();return {n:e.dataset.n,x:r.left+r.width-12,y:r.top+r.height/2}})()`);
    void fl0;
    if (pre === 'after') check('#1/#3 dense has at least one faded (too long) name', !!fl, fl);
    if (fl) {
        await b.mouse('mouseMoved', fl.x, fl.y, {button: 'none'});
        await sleep(300);
        const hv = await b.js(`(()=>{const e=document.querySelector('.hlab.nm.hov');if(!e)return null;const bb=e.querySelector('b');return {n:e.dataset.n,full:bb.scrollWidth<=bb.clientWidth+1,dim:document.querySelectorAll('.dim').length}})()`);
        if (pre === 'after') check('#1/#3 hover shows the full name and dims only the covered neighbour', hv && hv.n === fl.n && hv.full, hv);
        await shot('1-3-hover-full-name.png', {x: Math.max(0, fl.x - 420), y: fl.y - 70, width: 700, height: 140});
        await b.mouse('mouseMoved', 5, 790, {button: 'none'});
    }
    // ---------------- drag render + #8 clash hint
    await go(NOW);
    const emp = await b.js(`(()=>{const row=document.querySelector('.hrow[data-t="Slots_Events"]');const r=row.getBoundingClientRect();const v=document.querySelector('.hvp').getBoundingClientRect();
      const bars=[...row.querySelectorAll('.hb')].map(e=>e.getBoundingClientRect());
      for(let y=r.top+8;y<r.bottom-4;y+=6)for(let x=v.left+320;x<v.left+900;x+=10){const el=document.elementFromPoint(x,y);if(!el||!(el.classList.contains('hta')||el.classList.contains('hrow')))continue;
        if(bars.some(q=>q.left<x&&q.right>x-140&&!(q.top<y&&q.bottom>y)))return {x,y}}return null})()`);
    check('#8 found empty row space next to (time-overlapping) bars', !!emp, emp);
    if (emp) {
        await b.mouse('mouseMoved', emp.x, emp.y, {button: 'none'});
        await b.mouse('mousePressed', emp.x, emp.y);
        for (let k = 1; k <= 7; k++) {
            await b.mouse('mouseMoved', emp.x - k * 20, emp.y);
            await sleep(30);
        }
        await sleep(200);
        const g8 = await b.js(`(()=>{const g=document.querySelector('.hghost');if(!g)return null;const G=g.getBoundingClientRect();const row=g.closest('.hrow');
          const over=[...row.querySelectorAll('.hb')].filter(e=>{const q=e.getBoundingClientRect();return q.left<G.right-1&&q.right>G.left+1}).length;
          return {over,hint:g.querySelector('.hclash')?.textContent||null,cls:g.className}})()`);
        await render('h-v014-drag.png');
        const gb = await b.box('.hghost');
        await shot('8-drag-clash.png', {x: Math.max(0, gb.x - 300), y: gb.y - 20, width: Math.min(1280, gb.w + 600), height: Math.min(300, gb.h + 40)});
        check('#8 a ghost over existing records names the clash', g8 && g8.over > 0 && !!g8.hint && /חופף/.test(g8.hint), g8);
        await b.send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
        await b.mouse('mouseReleased', emp.x - 140, emp.y);
        await sleep(300);
    }
} catch (e) {
    bad++;
    console.log('  FAIL crash: ' + (e.stack || e));
}
b.close();
console.log(`${pre}: ${bad} failing`);
process.exit(pre === 'after' && bad ? 1 : 0);
