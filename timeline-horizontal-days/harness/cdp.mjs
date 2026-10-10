// tiny Chrome DevTools Protocol driver: trusted mouse / wheel / keys, JS eval, screenshots (used by the v0.2.2 e2e)
import {spawn} from 'node:child_process';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
export const here = dirname(fileURLToPath(import.meta.url));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function open({width = 1440, height = 900} = {}) {
    const port = 9300 + Math.floor(Math.random() * 600);
    const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`, `--window-size=${width},${height}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'tlcdp-'))}`, 'about:blank'], {stdio: 'ignore'});
    let tabs;
    for (let k = 0; k < 60; k++) {
        try {
            tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
            if (tabs.some(t => t.type === 'page')) break;
        } catch {}
        await sleep(200);
    }
    const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise(r => (ws.onopen = r));
    let seq = 0;
    const pending = new Map();
    ws.onmessage = m => {
        const d = JSON.parse(m.data);
        if (d.id && pending.has(d.id)) {
            const p = pending.get(d.id);
            pending.delete(d.id);
            d.error ? p.rej(new Error(d.error.message)) : p.res(d.result);
        }
    };
    const send = (method, params = {}) =>
        new Promise((res, rej) => {
            const id = ++seq;
            pending.set(id, {res, rej});
            ws.send(JSON.stringify({id, method, params}));
        });
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
    const js = async expr => {
        const r = await send('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true});
        if (r.exceptionDetails) throw new Error('js: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
        return r.result.value;
    };
    const api = {
        send,
        js,
        go: async (qs = '', wait = 2500) => {
            await send('Page.navigate', {url: 'file://' + resolve(here, 'out/index.html') + qs});
            await sleep(wait);
        },
        box: sel => js(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,r:r.right,b:r.bottom}})()`),
        mouse: (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', {type, x, y, button: 'left', clickCount: 1, ...extra}),
        click: async (x, y) => {
            await api.mouse('mouseMoved', x, y, {button: 'none'});
            await api.mouse('mousePressed', x, y);
            await api.mouse('mouseReleased', x, y);
        },
        clickSel: async sel => {
            const b = await api.box(sel);
            if (!b) throw new Error('no element ' + sel);
            await api.click(b.x + b.w / 2, b.y + b.h / 2);
            return b;
        },
        wheel: (x, y, deltaY, deltaX = 0) => send('Input.dispatchMouseEvent', {type: 'mouseWheel', x, y, deltaX, deltaY}),
        key: async (key, code = key, vk = 0, text) => {
            await send('Input.dispatchKeyEvent', {type: 'keyDown', key, code, windowsVirtualKeyCode: vk, ...(text ? {text} : {})});
            await send('Input.dispatchKeyEvent', {type: 'keyUp', key, code, windowsVirtualKeyCode: vk});
        },
        type: async text => {
            for (const ch of text) await send('Input.dispatchKeyEvent', {type: 'char', text: ch});
        },
        shot: async (path, clip) => {
            const r = await send('Page.captureScreenshot', {format: 'png', ...(clip ? {clip: {scale: 1, ...clip}} : {})});
            writeFileSync(path, Buffer.from(r.data, 'base64'));
        },
        close: () => {
            try {
                ws.close();
            } catch {}
            chrome.kill();
        },
    };
    return api;
}
