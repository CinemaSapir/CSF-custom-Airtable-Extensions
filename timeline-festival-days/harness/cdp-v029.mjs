// v0.2.9 e2e — shared mapping panel (status-panel v2): right pane «show mapping · Extension_Config.Mapping_Image», default OFF.
// ?cfgmap=1 adds a fake Extension_Config (default row has Mapping_Image + GitHub_URL, «timeline» Variant row empty → fallback).
// Images are served by a local http server on 127.0.0.1:8765 (only http(s) URLs are ever rendered).
import {open, sleep, here} from './cdp.mjs';
import {resolve} from 'node:path';
const shots = process.argv.includes('--shots');
const EV = resolve(here, '../evidence');
const ok = [],
    fail = [];
const check = (n, c, info) => (c ? ok : fail).push(info === undefined ? n : `${n} :: ${JSON.stringify(info)}`);
const b = await open({width: 1280, height: 800});
const NOW = '?now=2026-11-02T11:00:00Z';
try {
    await b.go(NOW + '&cfgmap=1');
    await sleep(900);
    check('toggle OFF (default) → no mapping panel', await b.js(`!document.querySelector('.csfmp')`));
    const props = await b.js(`JSON.stringify(globalThis.__TL_PROPS.filter(p=>/Panel$/.test(p.key)).map(p=>p.key+':'+p.type))`);
    check('right pane: status + mapping booleans side by side', props === '["showStatusPanel:boolean","showMappingPanel:boolean"]', props);
    await b.go(NOW + '&cfgmap=1&mapping=1');
    await sleep(1200);
    const t = await b.js(`document.querySelector('.csfmp')?.innerText ?? ''`);
    check('mapping ON → panel with 1 file from the DEFAULT row (Variant row empty)', /\(1\)/.test(t) && t.includes('שורת ברירת המחדל'), t.slice(0, 120));
    check('file name + GitHub link', t.includes('timeline-v0.2.7-config-map.png') && (await b.js(`document.querySelector('.csfmp a[href*="github.com"]')?.href ?? ''`)).includes('/timeline'));
    check('thumbnail = attachment thumbnails.large', (await b.js(`document.querySelector('.csfmp-img img').src`)).endsWith('timeline-map-large.png'));
    check('status panel stays hidden (only mapping ON)', await b.js(`!document.querySelector('.csfst')`));
    await b.js(`document.querySelector('.csfmp-img').click()`);
    await sleep(400);
    const lb = await b.js(`(()=>{const l=document.querySelector('.csfmp-lb');return l?[l.querySelector('img').src,l.querySelector('a').href].join(' | '):''})()`);
    check('click → lightbox with the FULL url + «פתיחה בלשונית חדשה»', /timeline-map\.png \| .*timeline-map\.png$/.test(lb), lb);
    if (shots) await b.shot(resolve(EV, 'ui-v029-lightbox.png'));
    await b.js(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`);
    await sleep(300);
    check('Esc closes the lightbox', await b.js(`!document.querySelector('.csfmp-lb')`));
    await b.go(NOW + '&cfgmap=1&mapping=1&status=1&mf=0');
    await sleep(1200);
    const nf = await b.js(`document.querySelector('.csfmp').innerText`);
    check('fields not enabled → Hebrew hint in the mapping panel', nf.includes('השדה Attachment_Mapping_Image לא מופעל לאלמנט') && nf.includes('השדה GitHub_URL לא מופעל לאלמנט'), nf);
    const sl = await b.js(`[...document.querySelectorAll('.csfst-b > div')].map(d=>d.innerText).find(x=>x.includes('Mapping_Image'))||''`);
    check('«מצב חיבור» reports Mapping_Image / GitHub_URL', sl.includes('✗') && sl.includes('GitHub_URL'), sl);
    await b.go(NOW + '&mapping=1');
    await sleep(900);
    check('no Extension_Config in the element → clear Hebrew hint', (await b.js(`document.querySelector('.csfmp').innerText`)).includes('טבלת Extension_Config לא נמצאה באלמנט'));
    if (shots) {
        await b.go(NOW + '&cfgmap=1&mapping=1&status=1');
        await sleep(1200);
        await b.js(`document.querySelector('.csfst-h').click()`);
        await sleep(300);
        await b.shot(resolve(EV, 'ui-v029-mapping-panel.png'));
        await b.go('?map=1&now=2026-11-02T11:00:00Z&crowd=1&cfgmap=1&mapping=1&status=1');
        await sleep(900);
        await b.js(`document.querySelector('.csfst-h').click()`);
        await sleep(2500);
        await b.shot(resolve(EV, 'config-map-v029.png'));
    }
} catch (e) {
    fail.push('EXCEPTION ' + (e && e.stack));
} finally {
    console.log(JSON.stringify({suite: 'cdp-v029', ok: ok.length, fail}, null, 1));
    for (const o of ok) console.log('PASS -', o);
    for (const f of fail) console.log('FAIL -', f);
    b.close();
}
