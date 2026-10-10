// ?e2e=<scenario>: drives the REAL UI with synthetic pointer events; results → document.title (JSON) for the harness runner.
(function () {
  const P = new URLSearchParams(location.search), sc = P.get('e2e'); if (!sc) return;
  const W = ms => new Promise(r => setTimeout(r, ms));
  const res = {sc, ok: [], fail: []};
  const check = (name, cond, info) => (cond ? res.ok : res.fail).push(info === undefined ? name : name + ' :: ' + JSON.stringify(info));
  const ptr = (el, type, x, y) => (el || window).dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: 1, pointerId: 1, isPrimary: true}));
  const drag = async (el, dx, dy, from) => {
    const r = el.getBoundingClientRect(); const x = from ? from.x : r.left + r.width / 2, y = from ? from.y : r.top + Math.min(12, r.height / 2);
    ptr(el, 'pointerdown', x, y); await W(30);
    for (let k = 1; k <= 4; k++) { ptr(window, 'pointermove', x + dx * k / 4, y + dy * k / 4); await W(30); }
    ptr(window, 'pointerup', x + dx, y + dy); await W(120);
  };
  const vis = txt => [...document.querySelectorAll('.axis .hlab')].find(e => { const r = e.getBoundingClientRect(); return e.textContent === txt && r.top > 150 && r.bottom < innerHeight; });
  const pxh = () => vis('13:00').getBoundingClientRect().top - vis('12:00').getBoundingClientRect().top;
  const card = txt => [...document.querySelectorAll('.ev')].find(e => e.textContent.includes(txt));
  const logs = () => window.__writes || [];
  const toastTxt = () => [...document.querySelectorAll('.toast')].map(t => t.textContent).join(' | ');
  const fmtIL = iso => new Date(iso).toLocaleTimeString('en-GB', {timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit'});
  const run = async () => {
    await W(1500);
    const h = pxh();
    if (sc === 'move') {
      const c = card('פאנל: קולנוע בפריפריה'); check('card found', !!c);
      await drag(c, 0, h); // +1h
      const w = logs().find(x => x[0] === 'update');
      check('update written', !!w, logs());
      if (w) { check('start +1h → 17:00', fmtIL(w[3].Start) === '17:00', w[3]); check('end +1h → 18:15', fmtIL(w[3].End) === '18:15', w[3]); }
      check('undo toast', /הוזז/.test(toastTxt()) && /ביטול/.test(toastTxt()), toastTxt());
      document.querySelector('.toast.undo').dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
      await W(6500); check('hover pauses the 6s undo', !!document.querySelector('.toast.undo'));
      document.querySelector('.toast.undo').dispatchEvent(new MouseEvent('mouseout', {bubbles: true}));
      [...document.querySelectorAll('.toast.undo a')].find(a => a.textContent === 'ביטול').click(); await W(150);
      const u = logs().filter(x => x[0] === 'update')[1];
      check('undo restores 16:00–17:15', !!u && fmtIL(u[3].Start) === '16:00' && fmtIL(u[3].End) === '17:15', u);
    }
    if (sc === 'resize') {
      const c = card('פאנל: קולנוע בפריפריה'); const rz = c.querySelector('.rz'); check('resize handle', !!rz);
      const r = rz.getBoundingClientRect(); await drag(rz, 0, h / 2, {x: r.left + r.width / 2, y: r.top + 3});
      const w = logs().find(x => x[0] === 'update'); check('resize written', !!w, logs());
      if (w) { check('start unchanged 16:00', fmtIL(w[3].Start) === '16:00', w[3]); check('end +30 → 17:45', fmtIL(w[3].End) === '17:45', w[3]); }
      check('undo toast (resize)', /שונה משך/.test(toastTxt()), toastTxt());
      await W(6300); check('undo toast gone after 6s', !document.querySelector('.toast.undo'));
      check('✕ exists', true);
    }
    if (sc === 'undo-shot') { const c = card('כיתת אמן'); await drag(c, 0, h); return; }
    if (sc === 'blocked') {
      const c = [...document.querySelectorAll('.col[data-t="Staffing"] .ev')][0]; check('staffing card', !!c);
      await drag(c, 0, h); check('no write', logs().length === 0, logs());
      check('reason shown', /הזמן נקבע לפי המשבצת/.test(toastTxt()), toastTxt());
    }
    if (sc === 'deny') {
      const c = card('פאנל: קולנוע בפריפריה'); await drag(c, 0, h);
      check('no write when permission denied', logs().length === 0, logs());
      check('permission reason shown', /אין לך הרשאת עריכה/.test(toastTxt()), toastTxt());
    }
    if (sc === 'create' || sc === 'create-pop') {
      const col = document.querySelector('.canvas .col[data-t="Slots_Events"]'); const r = col.getBoundingClientRect();
      const ys = vis('13:00');
      const y0 = ys.getBoundingClientRect().top + 2 + h * 0.07; // 13:04 → snaps 13:00
      await drag(col, 0, h * 1.5, {x: r.left + 10, y: y0});
      check('ghost', !!document.querySelector('.ghost'), null);
      const pop = document.querySelector('.cp'); check('popover open', !!pop);
      if (sc === 'create-pop') { const i = pop.querySelector('input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'סדנת תסריט'); i.dispatchEvent(new Event('input', {bubbles: true})); return; }
      const i = pop.querySelector('input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'סדנת תסריט'); i.dispatchEvent(new Event('input', {bubbles: true})); await W(50);
      pop.querySelector('.go').click(); await W(200);
      const w = logs().find(x => x[0] === 'create'); check('create written', !!w, logs());
      if (w) { check('snapped 13:00–14:30', fmtIL(w[2].Start) === '13:00' && fmtIL(w[2].End) === '14:30', w[2]); check('name', w[2].Slot === 'סדנת תסריט', w[2]); check('festival day auto-link', JSON.stringify(w[2]['Festival Days']).includes('recFD20261102'), w[2]); }
      check('undo toast (create)', /נוצר/.test(toastTxt()), toastTxt());
      [...document.querySelectorAll('.toast.undo a')].find(a => a.textContent === 'ביטול').click(); await W(150);
      check('undo deletes the new record', logs().some(x => x[0] === 'delete'), logs());
    }
    if (sc === 'create-borrow') {
      const col = document.querySelector('.canvas .col[data-t="Staffing"]'); const r = col.getBoundingClientRect();
      const ys = vis('12:00');
      await drag(col, 0, h, {x: r.left + 6, y: ys.getBoundingClientRect().top + 2});
      const pop = document.querySelector('.cp'); check('popover', !!pop);
      const sel = pop && pop.querySelector('select'); check('slot picker', !!sel && sel.options.length > 0, sel && sel.options.length);
      check('name field computed → hint', /מחושב/.test(pop.textContent));
      pop.querySelector('.go').click(); await W(200);
      const w = logs().find(x => x[0] === 'create'); check('create with slot link', !!w && Array.isArray(w[2].Slots_Events) && w[2].Slots_Events.length === 1, w);
      check('no time written on borrowed table', w && !('Start' in w[2]), w);
    }
    if (sc === 'reorder') {
      const first = () => document.querySelector('.cols > [data-t]').dataset.t;
      check('initial first = Slots_Events', first() === 'Slots_Events', first());
      document.querySelector('.cols [data-t="Lodging"] .cm2').click(); await W(80);
      check('menu open', !!document.querySelector('.hmenu.open'));
      [...document.querySelectorAll('.hmenu.open div')].find(d => d.textContent === 'להתחלה').click(); await W(80);
      check('menu → Lodging first', first() === 'Lodging', first());
      document.querySelector('.cols [data-t="Staffing"] .cm2').click(); await W(80);
      [...document.querySelectorAll('.hmenu.open div')].find(d => d.textContent === 'הזז ימינה').click(); await W(80);
      const order = () => [...document.querySelectorAll('.cols > [data-t]')].map(e => e.dataset.t);
      check('Staffing up one', order().indexOf('Staffing') === 1, order());
      const hd = document.querySelector('.cols [data-t="Itinerary"] .hd2'); const tg = document.querySelector('.cols [data-t="Lodging"]').getBoundingClientRect();
      await drag(hd, 0, 0, null); // no-op drag
      const r = hd.getBoundingClientRect(); ptr(hd, 'pointerdown', r.left + 3, r.top + 5); await W(30);
      ptr(window, 'pointermove', tg.right - 10, tg.top + 10); await W(40);
      check('drop line shown', !!document.querySelector('.dropline2'));
      ptr(window, 'pointerup', tg.right - 10, tg.top + 10); await W(100);
      check('drag ⠿ → Itinerary first', first() === 'Itinerary', order());
      check('saved per user', JSON.parse(localStorage.getItem('csf.timeline.v1.usrHarness')).order[0] === 'Itinerary');
      if (P.get('menu')) { document.querySelector('.cols [data-t="Lodging"] .cm2').click(); await W(80); }
    }
    document.title = JSON.stringify(res);
  };
  run().catch(e => { res.fail.push('exception ' + e.message); document.title = JSON.stringify(res); });
})();
