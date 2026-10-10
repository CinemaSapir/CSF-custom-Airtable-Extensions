// v0.2.2 e2e — one scenario per the owner edit, all with REAL input via CDP. `--shots` also writes the evidence renders.
import {open, sleep, here} from './cdp.mjs';
import {resolve, join} from 'node:path';
const shots = process.argv.includes('--shots');
const EV = resolve(here, '../evidence');
const ok = [],
    fail = [];
const check = (n, c, info) => (c ? ok : fail).push(info === undefined ? n : `${n} :: ${JSON.stringify(info)}`);
const b = await open();
const st = () => b.js(`({clock:document.querySelector('.clock').textContent, day:document.querySelector('.ban .ctr').textContent, top:document.querySelector('.vp').scrollTop})`);
const toast = () => b.js(`document.querySelector('.toast.msg')?.textContent||''`);
try {
    // ---------------- 3. default open day = 31.10 (no "now" override)
    await b.go('?open=default');
    let s = await st();
    check('3: opens on 31.10', /31\.10\.26/.test(s.day), s.day);
    const vis31 = await b.js(`(()=>{const v=document.querySelector('.vp').getBoundingClientRect();return [...document.querySelectorAll('.canvas .ev')].filter(e=>{const r=e.getBoundingClientRect();return r.bottom>v.top&&r.top<v.bottom}).length})()`);
    check('3/7: the open view is not empty (a card is on screen)', vis31 > 0, vis31);
    await b.go('?open=default&dropfd=2026-10-31');
    s = await st();
    check('3: no 31.10 in Festival Days → nearest day (30.10, tie → earlier)', /30\.10\.26/.test(s.day), s.day);

    // ---------------- 7. empty columns start collapsed — also on a fully empty day
    await b.go('?open=default');
    const strips = await b.js(`[...document.querySelectorAll('.cols > [data-t]')].map(e=>[e.dataset.t,e.classList.contains('cz')])`);
    check('7: on 31.10 the empty columns are strips, busy ones open', strips.some(x => x[1]) && strips.some(x => !x[1]), strips);
    // jump to an empty day (17.10) with the jump control
    const setJump = (d, t) =>
        b.js(`(()=>{const set=(el,v)=>{const p=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;p.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};set(document.querySelector('.jumpc .jd'),'${d}');set(document.querySelector('.jumpc .jt'),'${t}');})()`);
    await setJump('2026-10-17', '00:00'); // v0.2.3: all-day-only columns open only while the day's all-day row is on screen
    await b.clickSel('.jumpc .jgo');
    await sleep(700);
    const open17 = await b.js(`[...document.querySelectorAll('.cols > [data-t]')].filter(e=>!e.classList.contains('cz')).map(e=>e.dataset.t)`);
    check('7: 17.10 (all-day row on screen) → only the column with items stays open', open17.length === 1 && open17[0] === 'Tasks', open17);
    // close its only column by hand (⋯ → סגור עמודה) → nothing on screen that day
    await b.clickSel('.cols > [data-t="Tasks"] .cm2');
    await sleep(300);
    await b.clickSel('.hmenu.open > div:last-child');
    await sleep(500);
    const empty = await b.js(`({all:[...document.querySelectorAll('.cols > [data-t]')].every(e=>e.classList.contains('cz')),note:document.querySelector('.dayempty')?.textContent||''})`);
    check('7: nothing left open → every column is a strip + says so (no wall of empty open columns)', empty.all && /אין פריטים/.test(empty.note), empty);

    // ---------------- 1. full-width separator (axis + strips + every column, above lodging bars)
    const sepCheck = async () => {
        return b.js(`(()=>{const v=document.querySelector('.vp').getBoundingClientRect();const seps=[...document.querySelectorAll('.dayh')].map(e=>e.getBoundingClientRect()).filter(r=>Math.min(r.bottom,v.bottom)-Math.max(r.top,v.top)>12);if(!seps.length)return null;const r=seps[0];const y=(Math.max(r.top,v.top)+Math.min(r.bottom,v.bottom))/2;const vpEl=document.querySelector('.vp');const sb=vpEl.offsetWidth-vpEl.clientWidth;const xs=[];for(let x=v.left+sb+2;x<v.right-2;x+=20)xs.push(x);const L=document.querySelector('.canvas>.tops');L.style.pointerEvents='auto';L.querySelectorAll('.dayh').forEach(e=>e.style.pointerEvents='auto');const miss=xs.filter(x=>!document.elementFromPoint(x,y)?.closest('.dayh'));L.style.pointerEvents='none';L.querySelectorAll('.dayh').forEach(e=>e.style.pointerEvents='');return {w:r.width,vw:v.width,miss:miss.length,n:xs.length,left:r.left,right:r.right,vl:v.left,vr:v.right}})()`);
    };
    // on the empty day (all strips) and on a busy day
    let sc = null;
    for (let k = 0; k < 14 && !sc; k++) {
        await b.wheel(700, 600, 400);
        await sleep(300);
        sc = await sepCheck();
    }
    check('1: separator spans the full width on an all-strips day', sc && sc.miss === 0 && sc.w >= sc.vw - 16, sc);
    await b.go(''); // 2.11 13:10
    const vp = await b.box('.vp');
    await b.wheel(vp.x + vp.w / 2, vp.y + vp.h / 2, 900);
    await sleep(600);
    sc = await sepCheck();
    check('1: separator covers axis, columns, lodging bars and strips (elementFromPoint every 20px)', sc && sc.miss === 0, sc);
    if (shots) await b.shot(join(EV, 'ui-v022-separator-palette.png'));

    // ---------------- 2. palette
    const pal = await b.js(`(()=>{const g=(s,p)=>{const e=document.querySelector(s);return e?getComputedStyle(e)[p]:null};return {bg:g('.tl','backgroundColor'),font:g('.tl','fontFamily'),ban:g('.ban','backgroundColor'),banInk:g('.ban .ctr small','color'),sep:g('.dayh','backgroundColor'),sepInk:g('.dayh .dn','color'),lnk:g('.lnk','backgroundColor')}})()`);
    check('2 (v0.2.3 palette B): white background', pal.bg === 'rgb(255, 255, 255)', pal.bg);
    check('2: Segoe UI first', /^"?Segoe UI/.test(pal.font), pal.font);
    check('2 (v0.2.3): banner + separators use SDK grayLight2 / cyanLight2 / yellowLight2 with #444444 text', ['rgb(238, 238, 238)', 'rgb(208, 240, 253)', 'rgb(255, 234, 182)'].includes(pal.ban) && ['rgb(238, 238, 238)', 'rgb(208, 240, 253)', 'rgb(255, 234, 182)'].includes(pal.sep) && ['rgb(68, 68, 68)', 'rgb(102, 102, 102)'].includes(pal.banInk) /* v0.2.4: the big day label is crimson by the owner's ask; its date subtitle stays gray */ && pal.sepInk === 'rgb(68, 68, 68)', pal);
    const dd = await b.box('.dd.res > button');
    const before = await b.js(`getComputedStyle(document.querySelector('.dd.res > button')).backgroundColor`);
    await b.mouse('mouseMoved', dd.x + 10, dd.y + 10, {button: 'none'});
    await sleep(250);
    const hov = await b.js(`getComputedStyle(document.querySelector('.dd.res > button')).backgroundColor`);
    check('2 (v0.2.3): neutral hover tint grayLight2', hov === 'rgb(238, 238, 238)' && hov !== before, [before, hov]);
    const crimson = await b.js(`[...document.querySelectorAll('*')].filter(e=>{const c=getComputedStyle(e);return [c.color,c.backgroundColor,c.borderTopColor].some(v=>v==='rgb(220, 4, 59)')}).length`);
    check('2: no crimson left on screen', crimson === 0, crimson);
    const lowC = await b.js(`(()=>{const L=c=>{const m=c.match(/\\d+(\\.\\d+)?/g).map(Number).slice(0,3).map(v=>v/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*m[0]+.7152*m[1]+.0722*m[2]};const cr=(a,b)=>{const[x,y]=[L(a),L(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)};const bgOf=e=>{for(let n=e;n;n=n.parentElement){const b=getComputedStyle(n).backgroundColor;if(b&&!/rgba\\(\\d+, \\d+, \\d+, 0\\)|transparent/.test(b)&&!/rgba/.test(b))return b}return 'rgb(250, 247, 242)'};const bad=[];for(const s of ['.ban .ctr','.dayh .dn','.dayh .ds','.cols .nmh','.hlab','.wc .nm','.ev b','.lnk','.ban .bb','.clock']){const e=document.querySelector(s);if(!e)continue;const r=cr(getComputedStyle(e).color,bgOf(e));if(r<4.5)bad.push([s,+r.toFixed(2)])}return bad})()`);
    check('2: text contrast ≥ 4.5:1 on the key elements', lowC.length === 0, lowC);

    // ---------------- 4. jump control: one inline control, date + time side by side, no popup panel
    const jc = await b.js(`(()=>{const d=document.querySelector('.jumpc .jd').getBoundingClientRect(),t=document.querySelector('.jumpc .jt').getBoundingClientRect();return {d:document.querySelector('.jumpc .jd').type,t:document.querySelector('.jumpc .jt').type,same:Math.abs(d.top-t.top)<2,overlap:!(d.right<=t.left||t.right<=d.left),jp:!!document.querySelector('.jp')}})()`);
    check('4: calendar date + time inputs side by side', jc.d === 'date' && jc.t === 'time' && jc.same && !jc.overlap, jc);
    await setJump('2026-11-04', '18:45');
    await b.clickSel('.jumpc .jgo');
    await sleep(700);
    s = await st();
    const pops = await b.js(`document.querySelectorAll('.jp,.jp.open,[class*=popup]').length`);
    check('4: «קפיצה» jumps to 4.11 18:45, no popup panel opened', /4\.11\.26/.test(s.day) && s.clock === '18:45' && pops === 0, [s, pops]);
    // Enter in the time input also jumps
    await setJump('2026-11-03', '10:15');
    await b.js(`document.querySelector('.jumpc .jt').focus()`);
    await b.key('Enter', 'Enter', 13, '\r');
    await sleep(700);
    s = await st();
    check('4: Enter in the time field jumps', /3\.11\.26/.test(s.day) && s.clock === '10:15', s);
    await setJump('2027-01-01', '10:00');
    await b.clickSel('.jumpc .jgo');
    await sleep(400);
    check('4: outside the programme → reason', /מחוץ לתוכנית/.test(await toast()), await toast());
    if (shots) {
        await b.go('');
        await b.shot(join(EV, 'ui-v022-jump-control.png'), {x: 0, y: 0, width: 1440, height: 210});
    }

    // ---------------- 5. hour labels == grid lines at every resolution
    await b.go('');
    const steps = await b.js(`[...document.querySelectorAll('.menu.res .it')].length`);
    for (let k = 0; k < steps; k++) {
        await b.clickSel('.dd.res > button');
        await sleep(200);
        const items = await b.js(`[...document.querySelectorAll('.menu.res .it')].map(e=>{const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,t:e.textContent}})`);
        await b.click(items[k].x, items[k].y);
        await sleep(600);
        const m = await b.js(`(()=>{const L=[...document.querySelectorAll('.canvas .hl[data-tick]')],A=[...document.querySelectorAll('.axis .hlab[data-tick]')];const ly=Object.fromEntries(L.map(e=>[e.dataset.tick,e.getBoundingClientRect().top]));let worst=0,miss=0;for(const a of A){const r=a.getBoundingClientRect();const y=ly[a.dataset.tick];if(y===undefined){miss++;continue}worst=Math.max(worst,Math.abs(r.top+r.height/2-y))}const v=document.querySelector('.vp').getBoundingClientRect();const onL=L.filter(e=>{const y=e.getBoundingClientRect().top;return y>v.top&&y<v.bottom}).length,onA=A.filter(e=>{const r=e.getBoundingClientRect();return r.top>v.top&&r.bottom<v.bottom}).length;return {lines:L.length,labels:A.length,miss,worst:+worst.toFixed(2),onL,onA}})()`);
        check(`5: ${items[k].t.trim()} → same count, aligned (≤1px)`, m.lines === m.labels && m.miss === 0 && m.worst <= 1 && m.onL > 2, m);
    }

    // ---------------- 6. clicking a card name opens the record (grid + cross-section window)
    await b.go('');
    const evName = await b.js(`(()=>{const v=document.querySelector('.vp').getBoundingClientRect();const e=[...document.querySelectorAll('.canvas .ev:not(.inh)')].find(e=>{const r=e.getBoundingClientRect();return r.top>v.top+10&&r.bottom<v.bottom-10});const r=e.querySelector('b').getBoundingClientRect();return {id:e.dataset.id,x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    await b.click(evName.x, evName.y);
    await sleep(300);
    let ex = await b.js(`window.__expanded.slice()`);
    check('6: grid card name → expandRecord', ex.includes(evName.id), [evName.id, ex]);
    const wn = await b.js(`(()=>{const e=document.querySelector('.wg .nm.open');if(!e)return null;const r=e.getBoundingClientRect();return {id:e.dataset.id,x:r.left+Math.min(30,r.width/2),y:r.top+r.height/2,cur:getComputedStyle(e).cursor}})()`);
    check('6: cross-section card name is a click target', wn && wn.cur === 'pointer', wn);
    if (wn) {
        await b.mouse('mouseMoved', wn.x, wn.y, {button: 'none'});
        await sleep(200);
        if (shots) await b.shot(join(EV, 'ui-v022-xs-click-target.png'), {x: 0, y: 0, width: 1440, height: 520});
        await b.click(wn.x, wn.y);
        await sleep(300);
        ex = await b.js(`window.__expanded.slice()`);
        check('6: cross-section card name → expandRecord (same mechanism)', ex.includes(wn.id), [wn.id, ex]);
    }
    await b.go('?noexpand=1');
    const wn2 = await b.box('.wg .nm.open');
    await b.click(wn2.x + 20, wn2.y + wn2.h / 2);
    await sleep(300);
    check('6: record details off → reason, no open', /לא מאופשרת/.test(await toast()) && (await b.js('window.__expanded.length')) === 0, await toast());

    // ---------------- 8. time zones + now across DST (Israel DST ends Sun 25.10.2026 02:00 → 01:00)
    for (const [now, want, day] of [
        ['2026-10-24T09:00:00Z', '12:00', '24.10'],
        ['2026-10-25T09:00:00Z', '11:00', '25.10'],
        ['2026-10-24T22:30:00Z', '01:30', '25.10'],
        ['2026-10-25T00:30:00Z', '02:30', '25.10'],
    ]) {
        await b.go(`?now=${now}`);
        await b.clickSel('.ban .bb');
        await sleep(600);
        s = await st();
        const nl = await b.js(`(()=>{const n=document.querySelector('.nowl');return n?n.textContent:null})()`);
        check(`8: «עכשיו» at ${now} → ${day} ${want} Israel`, s.clock === want && s.day.includes(day + '.26') && nl === want, [s, nl]);
    }
    await b.go('?now=2026-10-10T22:11:00Z');
    await b.clickSel('.ban .bb');
    await sleep(600);
    s = await st();
    check('8: now before the programme → first day, near the same Israel clock (top of the day) + explains with the real date/time', /16\.10/.test(s.day) && s.top === 0 && /11\.10\.2026 01:11/.test(await toast()), [s, await toast()]);
    // instant fields vs GMT-clock fields
    const rng = async id => b.js(`document.querySelector('.canvas .ev[data-id="${id}"] small')?.textContent||''`);
    await b.go('?t=2026-10-31');
    await b.go('?open=default');
    const inst = await rng('rec48Vs9cmLVBpkQL');
    await b.go('?open=default&tz=utc');
    const wall = await rng('rec48Vs9cmLVBpkQL');
    check('8: client-tz field 14:00Z (31.10, UTC+2) shows 16:00; GMT-clock field shows its clock 14:00', /16:00/.test(inst) && /14:00/.test(wall) && /17:00/.test(wall), [inst, wall]);
    // writing back into a GMT-clock field keeps the wall time: move +1h
    const card = await b.box('.canvas .ev[data-id="rec48Vs9cmLVBpkQL"]');
    const pxh = await b.js(`(()=>{const t=[...document.querySelectorAll('.axis .hlab[data-tick]')];const a=t.find(e=>e.textContent==='16:00'),c=t.find(e=>e.textContent==='17:00');return c.getBoundingClientRect().top-a.getBoundingClientRect().top})()`);
    const cx = card.x + card.w / 2,
        cy = card.y + 30;
    await b.mouse('mouseMoved', cx, cy, {button: 'none'});
    await b.mouse('mousePressed', cx, cy);
    for (let k = 1; k <= 6; k++) await b.mouse('mouseMoved', cx, cy + (pxh * k) / 6, {buttons: 1});
    await b.mouse('mouseReleased', cx, cy + pxh);
    await sleep(600);
    const wr = await b.js(`JSON.stringify(window.__writes.slice(-1))`);
    check('8: move +1h in a GMT-clock field writes the wall time 15:00Z–18:00Z', /2026-10-31T15:00:00\.000Z/.test(wr) && /2026-10-31T18:00:00\.000Z/.test(wr), wr);

    // ---------------- 9. cross-section on/off moves nothing
    await b.go('');
    const rects = () => b.js(`(()=>{const q=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [Math.round(r.left*10)/10,Math.round(r.top*10)/10,Math.round(r.width*10)/10,Math.round(r.height*10)/10]};return {top:q('.top'),ban:q('.ban'),win:q('.win'),tog:q('#xsTog'),cols:q('.cols'),vp:q('.vp'),scroll:document.querySelector('.vp').scrollTop,card:q('.canvas .ev[data-id="recf1ZhVC1TnFRvBN"]')}})()`);
    const r0 = await rects();
    // v0.2.4: only what is ABOVE the window must stay put; headers + grid slide (see cdp-v024)
    const above = r => JSON.stringify({top: r.top, ban: r.ban, tog: r.tog, winTop: r.win[1]});
    if (shots) await b.shot(join(EV, 'ui-v022-xs-toggle-on.png'));
    await b.clickSel('#xsTog');
    await sleep(700);
    const r1 = await rects();
    const off1 = await b.js(`({on:document.querySelector('#xsTog').classList.contains('on'),band:!!document.querySelector('.band'),cards:getComputedStyle(document.querySelector('.wg')).visibility})`);
    if (shots) await b.shot(join(EV, 'ui-v022-xs-toggle-off.png'));
    check('9 (v0.2.4): OFF → toggle, top row, banner and window top keep their exact place', above(r0) === above(r1), {r0, r1});
    check('9: OFF really hides the cross-section (band gone, cards hidden)', !off1.on && !off1.band && off1.cards === 'hidden', off1);
    await b.clickSel('#xsTog');
    await sleep(700);
    const r2 = await rects();
    check('9 (v0.2.4): ON again → back exactly where it was', JSON.stringify(r0) === JSON.stringify(r2), {r0, r2});
    // scrolling with the window on no longer moves the grid's top
    const v0 = (await rects()).vp;
    for (let k = 0; k < 6; k++) {
        await b.wheel(vp.x + vp.w / 2, vp.y + vp.h / 2, 260);
        await sleep(250);
    }
    const v1 = (await rects()).vp;
    check('9: while scrolling, the grid top stays put (window rows are fixed while on)', JSON.stringify(v0) === JSON.stringify(v1), [v0, v1]);

    if (shots) {
        await b.go('?map=1&mapAt=1200');
        await sleep(2500);
        await b.shot(join(EV, 'config-map-v022.png'));
    }
} catch (e) {
    fail.push('exception ' + e.message);
} finally {
    console.log(JSON.stringify({sc: 'cdp-v022', ok, fail}));
    b.close();
    process.exit(fail.length ? 1 : 0);
}
