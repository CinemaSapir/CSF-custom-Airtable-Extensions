// v0.2.1 e2e with REAL (trusted) input via the Chrome DevTools Protocol: mouse wheel + mouse drag / double-click.
// Also writes the v0.2.1 evidence renders (no --hide-scrollbars, so the scrollbar is visible).
// usage: node harness/cdp-real-input.mjs [--shots]
import {spawn} from 'node:child_process';
import {writeFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const shots = process.argv.includes('--shots');
const ev = resolve(here, '../evidence');
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`, '--window-size=1440,900', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'tlcdp-'))}`, 'about:blank'], {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, seq = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, {res, rej});
    ws.send(JSON.stringify({id, method, params}));
});
const ok = [], fail = [];
const check = (n, c, info) => (c ? ok : fail).push(info === undefined ? n : `${n} :: ${JSON.stringify(info)}`);
const js = async expr => (await send('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true})).result.value;
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', {type, x, y, button: 'left', clickCount: 1, ...extra});
const wheel = (x, y, deltaY, deltaX = 0) => send('Input.dispatchMouseEvent', {type: 'mouseWheel', x, y, deltaX, deltaY});
const shot = async (name, clip) => {
    const r = await send('Page.captureScreenshot', {format: 'png', ...(clip ? {clip} : {})});
    writeFileSync(join(ev, name), Buffer.from(r.data, 'base64'));
};
try {
    let tabs;
    for (let k = 0; k < 50; k++) {
        try {
            tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
            if (tabs.length) break;
        } catch {}
        await sleep(200);
    }
    const page = tabs.find(t => t.type === 'page');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => (ws.onopen = r));
    ws.onmessage = m => {
        const d = JSON.parse(m.data);
        if (d.id && pending.has(d.id)) {
            const p = pending.get(d.id);
            pending.delete(d.id);
            d.error ? p.rej(new Error(d.error.message)) : p.res(d.result);
        }
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
    await send('Page.navigate', {url: 'file://' + resolve(here, 'out/index.html') + (shots ? '?map=0' : '')});
    await sleep(2500);
    const box = sel => js(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,r:r.right,b:r.bottom}})()`);
    const st = () => js(`(()=>{const v=document.querySelector('.vp');return {top:v.scrollTop,left:v.scrollLeft,sbw:v.offsetWidth-v.clientWidth,sh:v.scrollHeight,ch:v.clientHeight,clock:document.querySelector('.clock').textContent,day:document.querySelector('.ban .ctr').textContent}})()`);

    // ---------- 2. vertical scrolling with real wheel events
    const s0 = await st();
    const vp = await box('.vp');
    check('scrollbar visible (gutter > 0)', s0.sbw >= 10, s0.sbw);
    const head0 = {top: await box('.top'), cols: await box('.cols'), win: await box('.win'), ban: await box('.ban')};
    await wheel(vp.x + vp.w / 2, vp.y + vp.h / 2, 600);
    await sleep(500);
    const s1 = await st();
    check('wheel over the grid scrolls it down', s1.top > s0.top + 300, {before: s0.top, after: s1.top});
    check('clock follows the scroll', s1.clock !== s0.clock, [s0.clock, s1.clock]);
    const head1 = {top: await box('.top'), cols: await box('.cols'), win: await box('.win'), ban: await box('.ban')};
    for (const k of ['top', 'ban', 'win', 'cols']) check(`${k} stays sticky`, Math.abs(head1[k].y - head0[k].y) < 1 && head1[k].y >= 0, [head0[k].y, head1[k].y]);
    await wheel(vp.x + vp.w / 2, vp.y + vp.h / 2, -300);
    await sleep(400);
    const s2 = await st();
    check('wheel up scrolls back', s2.top < s1.top - 150, [s1.top, s2.top]);
    // wheel over the header / filters / window must not be lost to the page: it scrolls the grid
    const tb = await box('.top');
    await wheel(tb.x + tb.w / 2, tb.y + tb.h / 2, 400);
    await sleep(400);
    const s3 = await st();
    check('wheel over the header row scrolls the grid', s3.top > s2.top + 200, [s2.top, s3.top]);
    const wb = await box('.win');
    await wheel(wb.x + 200, wb.y + 20, 400);
    await sleep(400);
    const s4 = await st();
    check('wheel over the cross-section window scrolls the grid', s4.top > s3.top + 200, [s3.top, s4.top]);
    const docScroll = await js('document.scrollingElement.scrollTop + window.scrollY');
    check('the page itself never scrolls', docScroll === 0, docScroll);
    // many days: scroll far
    for (let k = 0; k < 10; k++) await wheel(vp.x + vp.w / 2, vp.y + vp.h / 2, 2000);
    await sleep(600);
    const s5 = await st();
    check('wheel moves across days', s5.day !== s4.day, [s4.day, s5.day]);
    if (shots) {
        // back to 2.11 afternoon for the evidence render
        await js(`(()=>{document.querySelector('.bb').click()})()`);
        await sleep(400);
        await wheel(vp.x + vp.w / 2, vp.y + vp.h / 2, 900);
        await sleep(600);
        await shot('ui-v021-scrolled-sticky-header.png');
    }
    // ---------- 1. column width: real mouse drag on the header edge
    await js(`document.querySelector('.bb').click()`); // «עכשיו»
    await sleep(400);
    const w = t => js(`document.querySelector('.cols [data-t="${t}"]').getBoundingClientRect().width`);
    const cw = t => js(`document.querySelector('.canvas .col[data-t="${t}"]').getBoundingClientRect().width`);
    const sw0 = await w('Staffing');
    const slots0 = await w('Slots_Events'); // v0.2.3: measured, not hard-coded (more strips → wider start)
    const cardW = () => js(`(()=>{const c=[...document.querySelectorAll('.canvas .col[data-t="Staffing"] .ev')].map(e=>e.getBoundingClientRect().width);return Math.min(...c)})()`);
    const card0 = await cardW();
    const h = await box('.cols [data-t="Staffing"] .rsz');
    check('resize handle on the header edge', !!h);
    const hx = h.x + h.w / 2, hy = h.y + h.h / 2;
    await mouse('mouseMoved', hx, hy);
    await mouse('mousePressed', hx, hy);
    for (let k = 1; k <= 6; k++) await mouse('mouseMoved', hx - k * 10, hy, {buttons: 1});
    await mouse('mouseReleased', hx - 60, hy);
    await sleep(300);
    const sw1 = await w('Staffing');
    check('drag left widens the column by the drag distance', Math.abs(sw1 - sw0 - 60) <= 2, [sw0, sw1]);
    check('grid column follows the header', Math.abs((await cw('Staffing')) - sw1) <= 1, [await cw('Staffing'), sw1]);
    const card1 = await cardW();
    check('side-by-side cards in the widened column get wider', card1 > card0 + 15, [card0, card1]);
    const saved = await js(`JSON.parse(localStorage.getItem('csf.timeline.v1.usrHarness')).widths`);
    check('width saved per user', saved && Math.abs(saved.Staffing - sw1) <= 1, saved);
    const tot = await js(`(()=>{const v=document.querySelector('.vp');return {sw:v.scrollWidth,cw:v.clientWidth}})()`);
    check('others shrink (no sideways scroll needed yet)', tot.sw <= tot.cw + 1, tot);
    const slotsW = await w('Slots_Events');
    check('neighbours never grow (they give up width or free slack is used) and stay ≥ 140', slotsW <= slots0 && slotsW >= 140, [slots0, slotsW]);
    // too wide → sideways scroll
    const h2 = await box('.cols [data-t="Staffing"] .rsz');
    await mouse('mousePressed', h2.x + 4, h2.y + 10);
    for (let k = 1; k <= 8; k++) await mouse('mouseMoved', h2.x + 4 - k * 100, h2.y + 10, {buttons: 1});
    await mouse('mouseReleased', h2.x + 4 - 800, h2.y + 10);
    await sleep(300);
    const tot2 = await js(`(()=>{const v=document.querySelector('.vp');return {sw:v.scrollWidth,cw:v.clientWidth}})()`);
    check('when others cannot shrink below 140 the grid scrolls sideways', tot2.sw > tot2.cw + 100, tot2);
    const minOther = await js(`Math.min(...[...document.querySelectorAll('.cols > [data-t]:not(.cz):not(.adonly)')].map(e=>e.getBoundingClientRect().width))`);
    check('no other timed column below 140px', minOther >= 139.5, minOther);
    await wheel(vp.x + vp.w / 2, vp.y + vp.h / 2, 0, -150); // v0.2.11: 7 columns → less sideways room; stay off the clamp edge
    await sleep(300);
    const sl = await js(`(()=>({vp:document.querySelector('.vp').scrollLeft,cols:document.querySelector('.cols').scrollLeft}))()`);
    check('horizontal wheel scrolls sideways, header stays aligned', sl.vp !== 0 && Math.abs(sl.vp - sl.cols) < 1, sl);
    // minimum 140
    const g = await box('.cols [data-t="Invitations"] .rsz');
    await mouse('mousePressed', g.x + 4, g.y + 10);
    for (let k = 1; k <= 5; k++) await mouse('mouseMoved', g.x + 4 + k * 100, g.y + 10, {buttons: 1});
    await mouse('mouseReleased', g.x + 504, g.y + 10);
    await sleep(300);
    check('minimum 140px', Math.abs((await w('Invitations')) - 140) < 1, await w('Invitations'));
    // double-click resets
    const h3 = await box('.cols [data-t="Staffing"] .rsz');
    await mouse('mousePressed', h3.x + 4, h3.y + 10, {clickCount: 1});
    await mouse('mouseReleased', h3.x + 4, h3.y + 10, {clickCount: 1});
    await mouse('mousePressed', h3.x + 4, h3.y + 10, {clickCount: 2});
    await mouse('mouseReleased', h3.x + 4, h3.y + 10, {clickCount: 2});
    await sleep(300);
    const saved2 = await js(`JSON.parse(localStorage.getItem('csf.timeline.v1.usrHarness')).widths`);
    check('double-click resets (width removed from storage)', !('Staffing' in saved2), saved2);
    check('reset width back to automatic', Math.abs((await w('Staffing')) - sw0) <= 2, [sw0, await w('Staffing')]);
    // keyboard
    await js(`document.querySelector('.cols [data-t="Lodging"] .rsz').focus()`);
    const lw0 = await w('Lodging');
    await send('Input.dispatchKeyEvent', {type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37});
    await send('Input.dispatchKeyEvent', {type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37});
    await sleep(200);
    check('keyboard ← widens by 20px', Math.abs((await w('Lodging')) - lw0 - 20) <= 1, [lw0, await w('Lodging')]);
    // reload keeps widths (per user)
    await send('Page.navigate', {url: 'file://' + resolve(here, 'out/index.html') + '?keep=1'});
    await sleep(2500);
    check('width survives a reload', Math.abs((await w('Lodging')) - lw0 - 20) <= 2 && Math.abs((await w('Invitations')) - 140) < 1, [await w('Lodging'), await w('Invitations')]);
    if (shots) {
        // evidence: widen the busiest column (משבצות) so its overlapping screenings sit side by side
        await js(`localStorage.clear()`);
        await send('Page.navigate', {url: 'file://' + resolve(here, 'out/index.html') + '?keep=1'});
        await sleep(2500);
        await wheel(vp.x + vp.w / 2, vp.y + vp.h / 2, 180);
        await sleep(400);
        const se = await box('.cols [data-t="Slots_Events"] .rsz');
        await mouse('mousePressed', se.x + 4, se.y + 10);
        for (let k = 1; k <= 8; k++) await mouse('mouseMoved', se.x + 4 - k * 25, se.y + 10, {buttons: 1});
        await mouse('mouseReleased', se.x + 4 - 200, se.y + 10);
        await sleep(600);
        await shot('ui-v021-widened-column.png');
        await js(`localStorage.clear()`);
        await send('Page.navigate', {url: 'file://' + resolve(here, 'out/index.html') + '?map=1&mapAt=1500&cdpwide=1'});
        await sleep(1200);
        const hh = await box('.cols [data-t="Staffing"] .rsz');
        await mouse('mousePressed', hh.x + 4, hh.y + 10);
        for (let k = 1; k <= 6; k++) await mouse('mouseMoved', hh.x + 4 - k * 10, hh.y + 10, {buttons: 1});
        await mouse('mouseReleased', hh.x + 4 - 60, hh.y + 10);
        await sleep(2500);
        await shot('config-map-v021.png');
    }
} catch (e) {
    fail.push('exception ' + e.message);
} finally {
    console.log(JSON.stringify({sc: 'cdp-real-input', ok, fail}));
    chrome.kill();
    process.exit(fail.length ? 1 : 0);
}
