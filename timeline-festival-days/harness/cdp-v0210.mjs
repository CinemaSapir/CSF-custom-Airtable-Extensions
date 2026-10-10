// v0.2.10 e2e — config key timeline-festival-days (+ fallbacks), «עריכה ישירה», Attachment_Mapping_Image.
import {open, sleep, here} from './cdp.mjs';
import {resolve} from 'node:path';
const shots = process.argv.includes('--shots');
const EV = resolve(here, '../evidence');
const ok = [], fail = [];
const check = (n, c, info) => (c ? ok : fail).push(info === undefined ? n : `${n} :: ${JSON.stringify(info)}`);
const b = await open({width: 1280, height: 800});
const NOW = '?now=2026-11-02T11:00:00Z&cfgmap=1';
const foot = () => b.js(`[...document.querySelectorAll('*')].map(e=>e.childElementCount===0?e.textContent:'').find(t=>t&&t.includes('הגדרות:'))||''`);
const W = () => b.js(`JSON.stringify(globalThis.__writes)`).then(JSON.parse);
try {
    await b.go(NOW + '&cfgkey=new'); await sleep(900);
    check('new row: key timeline-festival-days', (await foot()).includes('timeline-festival-days') && !(await foot()).includes('שורה ישנה'), await foot());
    await b.go(NOW + '&cfgkey=mid'); await sleep(900);
    check('fallback 1: Extension timeline', /Extension_Config · timeline \(שורה ישנה/.test(await foot()), await foot());
    await b.go(NOW); await sleep(900);
    check('fallback 2: program-by-day [timeline]', (await foot()).includes('program-by-day [timeline] (שורה ישנה'), await foot());
    const props = await b.js(`JSON.stringify(globalThis.__TL_PROPS.filter(p=>/Panel$|Config$/.test(p.key)).map(p=>p.key+':'+p.type))`);
    check('right pane: status, mapping, edit toggles side by side', props === '["showStatusPanel:boolean","showMappingPanel:boolean","inlineEditConfig:boolean"]', props);
    check('edit OFF → nothing marked', await b.js(`!document.querySelector('[data-csfed-slot], .csfed')`));
    await b.go(NOW + '&cfgkey=new&edit=1'); await sleep(1200);
    const panel = await b.js(`document.querySelector('.csfed')?.innerText||''`);
    check('edit ON → panel, writes to the default row', panel.includes('שורת ברירת המחדל') && panel.includes('timeline-festival-days'), panel.slice(0, 160));
    check('Title text on screen is click-to-edit', await b.js(`!!document.querySelector('[data-csfed-slot="Title"]')`));
    await b.js(`document.querySelector('[data-csfed-slot="Title"]').click()`); await sleep(250);
    await b.js(`(()=>{const t=document.querySelector('.csfed-pop textarea');const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;set.call(t,'טיימליין הפסטיבל');t.dispatchEvent(new Event('input',{bubbles:true}));t.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))})()`); await sleep(600);
    const w = await W();
    check('Enter → ONE update of Extension_Config Title on the matched row', w.length === 1 && w[0][0] === 'update' && w[0][1] === 'Extension_Config' && w[0][2] === 'recCfgDefault' && JSON.stringify(w[0][3]) === JSON.stringify({Title: 'טיימליין הפסטיבל'}), w);
    check('title updated on screen', (await b.js(`document.body.innerText`)).includes('טיימליין הפסטיבל'));
    check('undo toast', (await b.js(`document.querySelector('.csfed-toast')?.innerText||''`)).includes('ביטול'));
    if (shots) await b.shot(resolve(EV, 'ui-v0210-edit.png'));
    await b.go(NOW + '&cfgkey=new&mapping=1'); await sleep(1000);
    check('mapping reads Attachment_Mapping_Image', /\(1\)/.test(await b.js(`document.querySelector('.csfmp')?.innerText||''`)));
    if (shots) {
        await b.go('?map=1&now=2026-11-02T11:00:00Z&crowd=1&cfgmap=1&cfgkey=new&mapping=1&status=1&edit=1'); await sleep(900);
        await b.js(`document.querySelector('.csfst-h').click()`); await sleep(2500);
        await b.shot(resolve(EV, 'config-map-v0210.png'));
    }
} catch (e) {
    fail.push('EXCEPTION ' + (e && e.stack));
} finally {
    console.log(JSON.stringify({suite: 'cdp-v0210', ok: ok.length, fail}, null, 1));
    b.close();
}
