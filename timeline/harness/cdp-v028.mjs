// v0.2.8 e2e — cross-section time snaps to 5 min while scrolling (real wheel): clock, axis tag, band position and window agree.
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
const read = () =>
    b.js(`(()=>{const band=document.querySelector('.canvas .band, .band'),tn=document.querySelector('.tnow');const br=band.getBoundingClientRect(),tr=tn.getBoundingClientRect();
      const inBand=e=>{const r=e.getBoundingClientRect();return r.bottom>br.top+0.5&&r.top<br.bottom-0.5};
      const wids=[...document.querySelectorAll('.wg .wc .nm[data-id]')].map(e=>e.dataset.id).sort();
      const cids=[...new Set([...document.querySelectorAll('.ev[data-id]')].filter(inBand).map(e=>e.dataset.id))].sort();
      return {clock:document.querySelector('.ban .clock').textContent.trim(),tag:tn.textContent.trim(),dt:+tn.dataset.t,bandC:(br.top+br.bottom)/2,tagC:(tr.top+tr.bottom)/2,vpC:(()=>{const v=document.querySelector('.vp').getBoundingClientRect();return (v.top+v.bottom)/2})(),wids,cids,more:!!document.querySelector('.wg .wc.more')}})()`);
const sweep = async label => {
    const vp = await b.box('.vp');
    const seen = [];
    let bad = [];
    for (let k = 0; k < 24; k++) {
        await b.wheel(vp.x + vp.w / 2, vp.y + vp.h / 2, 9);
        await sleep(120);
        const r = await read();
        seen.push(r.clock);
        const mm = +r.clock.slice(3);
        if (mm % 5 || r.tag !== r.clock || Math.abs(r.bandC - r.tagC) > 1.01 || Math.abs(r.bandC - r.vpC) > 40) bad.push(r);
        if (!r.more && r.wids.some(id => !r.cids.includes(id))) bad.push({win: r.wids, band: r.cids, clock: r.clock});
    }
    check(`${label}: every clock / axis tag while wheel-scrolling is on a 5-min mark, the same value`, bad.length === 0, bad.slice(0, 3));
    check(`${label}: … and it actually advanced through several marks`, new Set(seen).size >= 3, seen);
};
try {
    await b.go('?now=2026-11-02T11:07:00Z'); // 13:07 IL
    await sleep(900);
    await setXs(true);
    const r0 = await read();
    check('open at 13:07 → cross-section reads 13:05', r0.clock === '13:05' && r0.tag === '13:05', r0);
    check('band centre = the 13:05 tag (band moved onto the rounded time)', Math.abs(r0.bandC - r0.tagC) <= 1.01, r0);
    await b.go('?now=2026-11-02T11:08:00Z'); // 13:08 IL
    await sleep(900);
    await setXs(true);
    const r1 = await read();
    check('open at 13:08 → 13:10', r1.clock === '13:10' && r1.tag === '13:10', r1);
    check('window cards at 13:10 = cards under the drawn band (non-vacuous)', r1.wids.length > 0 && r1.wids.every(id => r1.cids.includes(id)), {w: r1.wids, c: r1.cids});
    check('compress ON by default here', await b.js(`document.querySelectorAll('.tog')[1].classList.contains('on')`));
    await sweep('compress ON');
    if (shots) await b.shot(resolve(EV, 'ui-v028-xs-snap.png'));
    await b.js(`document.querySelectorAll('.tog')[1].click()`);
    await sleep(700);
    await sweep('compress OFF');
    // DST day: 25.10 (02:00 → 01:00)
    await b.go('?now=2026-10-25T09:07:00Z'); // 11:07 IL (UTC+2)
    await sleep(900);
    await setXs(true);
    const rd = await read();
    check('DST day 25.10 at 11:07 IL → 11:05, band on it', rd.clock === '11:05' && Math.abs(rd.bandC - rd.tagC) <= 1.01, rd);
    if (shots) {
        await b.go('?map=1&now=2026-11-02T11:07:00Z');
        await sleep(2500);
        await b.shot(resolve(EV, 'config-map-v028.png'));
    }
} catch (e) {
    fail.push('EXCEPTION ' + (e && e.stack));
} finally {
    console.log(JSON.stringify({suite: 'cdp-v028', ok: ok.length, fail}, null, 1));
    for (const o of ok) console.log('PASS -', o);
    for (const f of fail) console.log('FAIL -', f);
    b.close();
    process.exit(fail.length ? 1 : 0);
}
