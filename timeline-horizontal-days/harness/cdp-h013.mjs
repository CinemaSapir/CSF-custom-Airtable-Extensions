// horizontal v0.1.3 evidence + real-input checks (the owner 06:57). usage: node harness/cdp-h013.mjs <repoDir> <prefix>
import {open, sleep} from './cdp.mjs';
import {resolve} from 'node:path';
const [, , dir = '.', pre = 'after'] = process.argv;
const OUT = resolve('evidence/v013');
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
// the harness fixture's Festival Days = the DEMO table's names (CSF DEMO v1.3, read via the Airtable MCP)
const FD = {'2026-10-30': 'יום ו׳ 30.10.26', '2026-10-31': 'שבת 31.10.26 · ערב הפסטיבל', '2026-11-01': 'יום א׳ 1.11.26 · פתיחה', '2026-11-02': 'יום ב׳ 2.11.26', '2026-11-06': 'יום ו׳ 6.11.26', '2026-11-07': 'מוצ״ש 7.11.26 · נעילה', '2026-11-08': 'יום א׳ 8.11.26'};
const pills = () => b.js(`[...document.querySelectorAll('.hdp')].map(x=>x.textContent)`);
const big = () => b.js(`document.querySelector('.ban .ctr .big').textContent`);
try {
    // ---- 1 window cards: 28px, name 12.5px, ≤ 2 lines
    await go('?now=2026-11-02T11:10:00Z&dense=1');
    const wb = await b.box('.win');
    const c1 = await b.js(`(()=>{const c=[...document.querySelectorAll('.wg .wc')];const n=c.map(x=>x.querySelector('.nm')).filter(Boolean);return {n:c.length,h:c[0]?.getBoundingClientRect().height,fs:getComputedStyle(n[0]).fontSize,maxLines:Math.max(...n.map(e=>Math.round(e.getBoundingClientRect().height/parseFloat(getComputedStyle(e).lineHeight)))),wrapped:n.filter(e=>e.getBoundingClientRect().height>parseFloat(getComputedStyle(e).lineHeight)*1.5).length}})()`);
    check('1: card 28px, name 12.5px (v0.1.1 size), wraps to ≤ 2 lines', c1.h <= 28.5 && c1.fs === '12.5px' && c1.maxLines <= 2, c1);
    await shot('1-window-cards.png', {x: 0, y: wb.y, width: 1440, height: wb.h});
    // ---- 2 cross-section title + toggle colour = the band / lens colour
    const c2 = await b.js(`(()=>{const g=e=>e?getComputedStyle(e):null;const t=g(document.querySelector('.wh b')),sw=g(document.querySelector('.wh .tog .sw')),tg=g(document.querySelector('.wh .tog')),bl=g(document.querySelector('.hbl'));return {title:t.color,sw:sw.backgroundColor,tog:tg.borderTopColor,band:bl?.backgroundColor}})()`);
    check('2: «חתך רוחב» title + switch = the band label colour', c2.title === c2.band && c2.sw === c2.band, c2);
    await shot('2-xs-toggle.png', {x: 700, y: wb.y - 4, width: 740, height: 70});
    // ---- 3 neutral day titles
    const c3 = await b.js(`(()=>{const B=getComputedStyle(document.querySelector('.ban .ctr .big')),C=getComputedStyle(document.querySelector('.ban .ctr .clock')),P=getComputedStyle(document.querySelector('.hdp'));return {big:B.color,clock:C.color,pill:P.color,pillBg:P.backgroundColor}})()`);
    check('3: day title + ruler pill in ink on white (clock keeps the accent)', c3.big !== c3.clock && c3.pill === c3.big && c3.pillBg === 'rgb(255, 255, 255)', c3);
    await shot('3-top.png', {x: 0, y: 0, width: 1440, height: 210});
    // ---- 4 titles = Festival Days record names
    await go('?now=2026-10-31T19:30:00Z');
    const p4 = await pills(), b4 = await big();
    check('4: banner = the record name of 31.10', b4 === FD['2026-10-31'], b4);
    check('4: every ruler pill = a Festival Days record name (no «הכנות · עוד…» / «יום N · פסטיבל»)', p4.length >= 2 && p4.every(t => Object.values(FD).includes(t)), p4);
    await shot('4-day-titles-3110.png', {x: 0, y: 0, width: 1440, height: 330});
    await go('?now=2026-11-07T10:00:00Z');
    const p4b = await pills(), b4b = await big();
    check('4: 7.11 = «מוצ״ש 7.11.26 · נעילה» (not «יום 7 · פסטיבל»)', b4b === FD['2026-11-07'] && p4b.includes(FD['2026-11-07']), {b4b, p4b});
    await shot('4-day-titles-0711.png', {x: 0, y: 0, width: 1440, height: 330});
    await go('?now=2026-10-31T19:30:00Z&fddt=1');
    const b4c = await big();
    check('4: Date as a dateTime (00:00 Israel = 22:00Z the day before) → same day, no off-by-one', b4c === FD['2026-10-31'], b4c);
    await go('?now=2026-10-31T19:30:00Z&fdnodate=1&status=1', 3000);
    const b4d = await big();
    const st = await b.js(`document.querySelector('.csfst')?.textContent||''`);
    check('4: Date hidden from the element → plain date title + ✗ in «מצב חיבור»', b4d === 'שבת 31.10.26' && /Festival Days · Date \(התאמה לתאריך\)/.test(st) && /כותרות הימים = התאריך בלבד/.test(st), {b4d, st: st.slice(st.indexOf('Festival Days ·'), st.indexOf('Festival Days ·') + 160)});
    await shot('4-fd-date-hidden-status.png');
    await go('?now=2026-10-31T19:30:00Z&status=1', 3000);
    const st2 = await b.js(`document.querySelector('.csfst')?.textContent||''`);
    check('4: status panel: 26 / 26 days named + a sample', /26 \/ 26 ימים קיבלו שם רשומה/.test(st2) && /דוגמה: 2026-10-16 → «יום ו׳ 16\.10\.26»/.test(st2), st2.slice(st2.indexOf('Festival Days ·'), st2.indexOf('Festival Days ·') + 220));
    await b.js(`[...document.querySelectorAll('.csfst *')].find(e=>e.children.length===0&&/Festival Days · Date/.test(e.textContent))?.scrollIntoView({block:'center'})`);
    await sleep(200);
    await shot('4-status-panel.png');
} catch (e) {
    bad++;
    console.log('  FAIL crash: ' + (e.stack || e));
}
b.close();
console.log(`${pre}: ${bad} failing`);
process.exit(pre === 'after' && bad ? 1 : 0);
