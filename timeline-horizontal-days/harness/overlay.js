// ?map=1 → draw callout labels naming each element's Extension_Config slot (data-slot attributes in the real UI).
(function(){const P=new URLSearchParams(location.search);
 const act=()=>{ // optional scripted states
  if(P.get('close')){P.get('close').split('|').forEach(t=>{const x=document.querySelector(`.hrow[data-t="${t}"] .cx`);if(x)x.click()})}
  if(P.get('open')){const b=document.querySelector(P.get('open'));if(b)b.click()}
  if(P.get('scroll')){const vp=document.querySelector('.hvp');vp.scrollLeft-= +P.get('scroll');vp.dispatchEvent(new Event('scroll'))}
 };
 const draw=()=>{if(P.get('map')!=='1')return;
  const L=document.createElement('div');L.style.cssText='position:fixed;inset:0;z-index:999;pointer-events:none;font:700 11px/1.2 "Segoe UI",Heebo,sans-serif';document.body.appendChild(L);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width',innerWidth);svg.setAttribute('height',innerHeight);svg.style.cssText='position:absolute;inset:0';L.appendChild(svg);
  const used=[];const els=[...document.querySelectorAll('[data-slot]')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight});
  els.forEach((e,n)=>{const r=e.getBoundingClientRect();
   e.style.outline='2px solid #0b7a3e';e.style.outlineOffset='1px';
   const box=document.createElement('div');box.textContent=e.dataset.slot;box.style.cssText='position:absolute;background:#0b7a3e;color:#fff;padding:2px 6px;border-radius:4px;white-space:nowrap;direction:ltr;box-shadow:0 2px 6px rgba(0,0,0,.3)';L.appendChild(box);
   const w=box.offsetWidth,h=box.offsetHeight;let x=Math.min(innerWidth-w-4,Math.max(4,r.left+r.width/2-w/2)),y=r.bottom+10;
   if(r.top<60)y=r.bottom+12+(n%2)*18; if(y+h>innerHeight)y=r.top-h-8;
   for(let k=0;k<12;k++){if(used.some(u=>x<u.x+u.w+4&&x+w+4>u.x&&y<u.y+u.h+2&&y+h+2>u.y))y+=h+3;else break}
   used.push({x,y,w,h});box.style.left=x+'px';box.style.top=y+'px';
   const ln=document.createElementNS('http://www.w3.org/2000/svg','line');ln.setAttribute('x1',r.left+r.width/2);ln.setAttribute('y1',y<r.top?r.top:r.bottom);ln.setAttribute('x2',x+w/2);ln.setAttribute('y2',y<r.top?y+h:y);ln.setAttribute('stroke','#0b7a3e');ln.setAttribute('stroke-width','1.5');svg.appendChild(ln)});
  const key=document.createElement('div');key.style.cssText='position:absolute;left:8px;bottom:28px;background:#fff;border:2px solid #0b7a3e;border-radius:8px;padding:8px 10px;font-weight:600;color:#22252d;max-width:520px;direction:rtl;line-height:1.5;box-shadow:0 4px 14px rgba(0,0,0,.2)';
  key.innerHTML='<b style="color:#0b7a3e">מפת הגדרות · Extension_Config · timeline-horizontal-days · טיימליין אופקי v0.1.3</b><br>Extension = timeline-horizontal-days, Variant ריק (שורה אחת; כינויים: timeline-horizontal, horizontal-timeline, טיימליין אופקי…). שורות של הטיימליין האנכי לעולם לא נקראות.<br>שורה לכל טבלה (Option_List_6) · ✕ / טבלה שקטה (Toggle_1) → שורת השבבים (Content_Text_14, Helper_Text_4–5) · ⠿ סדר (Helper_Text_7) · גובה שורה (Helper_Text_8) · ⋯ (Content_Text_12) · משפך: Filter_N «Table.Field הוא/אינו/מכיל/ריק/לא ריק ערך|ערך» (שורה לכל שדה) / חלונית ימנית · ברירת מחדל 12 ש׳ במסך (Dropdown_Default_3=720) · Toggle_1 טבלאות ריקות / Toggle_2 שעות ריקות = מכווץ.<br>כותרת יום = שם רשומת Festival Days (Name) לפי Date, שעון ישראל; אין רשומה → התאריך.<br>חתך רוחב 20% (Number_1) עגול ל-5 דק׳ · כרטיסי חלון (Number_2 = שורות גלויות, גלילה בפנים; ✕/👁 → פס משמאל) · לינה N בלינה (Content_Text_13) · ב״מ צ׳ק-אין/אאוט (Table_Heading_2–3, Helper_Text_6).';L.appendChild(key)};
 setTimeout(()=>{act();setTimeout(draw,+(P.get('mapAt')||500))},700);
})();
