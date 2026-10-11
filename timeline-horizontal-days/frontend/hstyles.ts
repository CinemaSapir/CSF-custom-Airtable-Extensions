/* «טיימליין אופקי» v0.1.0 (+ v0.1.2 block at the end) — horizontal RTL grid. Same Option B chrome as the vertical (SDK grays on white, table fill names,
 * redDark1 only for Now and the cross-section); appended after the vertical CSS. */
export const HCSS = String.raw`
.htl .hgw{position:relative;flex:1 1 auto;min-height:0;border-top:1px solid var(--sdk-grayLight1)}
.htl .hvp{position:absolute;inset:0;overflow:auto;direction:rtl;overscroll-behavior:contain;overflow-anchor:none;scrollbar-width:auto;scrollbar-color:var(--sdk-grayLight1) var(--sdk-grayLight2)}
.htl .hvp::-webkit-scrollbar{width:12px;height:12px}
.htl .hvp::-webkit-scrollbar-track{background:var(--sdk-grayLight2)}
.htl .hvp::-webkit-scrollbar-thumb{background:var(--sdk-grayLight1);border-radius:6px;border:2px solid var(--sdk-grayLight2)}
.htl .hvp::-webkit-scrollbar-thumb:hover{background:var(--sdk-gray)}
.htl .hcanvas{position:relative;min-height:100%;user-select:none;-webkit-user-select:none}
.htl .hunder{position:absolute;top:0;bottom:0;right:0;left:0;pointer-events:none;z-index:0;overflow:hidden}
.htl .hgl{position:absolute;top:0;bottom:0;width:1px;background:var(--sdk-grayLight2)}
.htl .hgl.half{background:color-mix(in srgb,var(--sdk-grayLight2) 55%,transparent)}
/* sticky ruler (top) */
.htl .hrul{position:sticky;top:0;height:34px;background:#fff;border-bottom:1px solid var(--sdk-grayLight1);z-index:9}
.htl .hrh0{position:sticky;right:0;width:var(--HW);height:34px;display:flex;align-items:center;padding:0 10px;font-size:12px;color:var(--sdk-gray);font-weight:700;background:#fff;border-left:1px solid var(--sdk-grayLight1);z-index:3}
.htl .htk{position:absolute;bottom:4px;font-size:11.5px;color:var(--sdk-gray);transform:translateX(50%);white-space:nowrap;pointer-events:none}
.htl .htk::after{content:"";position:absolute;bottom:-4px;left:50%;width:1px;height:6px;background:var(--sdk-grayLight1)}
.htl .htk.sub{font-size:10.5px;color:var(--sdk-grayLight1)}
.htl .hdp{position:absolute;top:2px;height:16px;line-height:14px;font-size:10.5px;font-weight:700;border:1px solid var(--sdk-grayLight1);border-radius:8px;padding:0 6px;white-space:nowrap;color:var(--sdk-grayDark1);z-index:2;pointer-events:none}
.htl .hnowt{position:absolute;bottom:1px;transform:translateX(50%);font-size:11px;line-height:14px;font-weight:800;color:#fff;background:var(--sdk-redDark1);border-radius:4px;padding:0 5px;z-index:4;pointer-events:none}
/* day separators + compressed stretches (full height, under the rows) */
.htl .hds{position:absolute;top:0;bottom:0;border-left:1px solid var(--sdk-grayLight1);border-right:1px solid var(--sdk-grayLight1)}
.htl .hdst{position:sticky;top:44px;display:block;margin:44px auto 0;writing-mode:vertical-rl;font-size:12px;font-weight:800;white-space:nowrap;color:var(--sdk-grayDark1);line-height:24px}
.htl .hdst small{font-weight:600;color:var(--sdk-gray);font-size:11px}
.htl .hgap{position:absolute;top:0;bottom:0;background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--sdk-grayLight2) 70%,#fff) 0 6px,#fff 6px 12px);border-left:1px dashed var(--sdk-grayLight1);border-right:1px dashed var(--sdk-grayLight1)}
.htl .hgap span{position:absolute;top:40px;left:50%;transform:translateX(-50%);writing-mode:vertical-rl;font-size:10px;color:var(--sdk-gray);white-space:nowrap}
/* rows */
.htl .hrow{position:relative;display:flex;border-bottom:1px solid var(--sdk-grayLight2);z-index:1}
.htl .hrh{position:sticky;right:0;flex:none;width:var(--HW);height:100%;background:#fff;border-left:1px solid var(--sdk-grayLight1);border-right:3px solid var(--c);z-index:6}
.htl .hrh .l1{position:absolute;top:4px;right:6px;left:6px;display:flex;align-items:center;gap:5px;font-size:13.5px;font-weight:700;white-space:nowrap;color:var(--sdk-grayDark1)}
.htl .hrh .l1 .nmh{overflow:hidden;text-overflow:ellipsis}
.htl .hrh .l1 .vc{font-weight:400;color:var(--sdk-gray);font-size:12px}
.htl .hrh .hd2{color:var(--sdk-grayLight1);font-size:13px;cursor:grab;touch-action:none;padding:0 2px}
.htl .hrh .hd2:hover{color:var(--sdk-grayDark1)}
.htl .hrh .l2{position:absolute;top:24px;right:20px;display:flex;align-items:center;gap:7px;color:var(--sdk-gray);font-size:12px}
.htl .hrh .l2 a{cursor:pointer;display:inline-flex;align-items:center;gap:2px;border-radius:4px;padding:0 2px;color:var(--sdk-gray)}
.htl .hrh .l2 a:hover{background:var(--sdk-grayLight2);color:var(--sdk-grayDark1)}
.htl .hrh .l2 a.dis{opacity:.35;cursor:default}
.htl .hrh .l2 .cf2.act{background:var(--sdk-grayDark1);color:#fff}
.htl .hrh .l2 .cf2 b{font-size:10.5px}
.htl .hrh .hgrp{display:inline-flex;gap:3px;align-items:center}
.htl .hrh .ldf{font-size:10.5px;color:var(--sdk-gray)}
.htl .hrh .hgl2{position:absolute;left:6px;max-width:84px;font-size:11px;color:var(--sdk-gray);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left}
.htl .hrh .hrz{position:absolute;left:0;right:0;bottom:-3px;height:7px;cursor:row-resize;z-index:2}
.htl .hrh .hrz:hover,.htl .hrh .hrz:focus{background:color-mix(in srgb,var(--sdk-grayDark1) 18%,transparent);outline:none}
.htl .hrh .hrz.set{border-bottom:2px solid var(--sdk-grayLight1)}
body.tl-rowresizing,body.tl-rowresizing *{cursor:row-resize!important;user-select:none!important}
.htl .hta{position:absolute;top:0;right:var(--HW)}
.htl .hgsep{position:absolute;left:0;right:0;border-top:1px dashed var(--sdk-grayLight2)}
/* closed / quiet tables: one chip row */
.htl .hclosed{position:relative;display:flex;height:30px;background:var(--sdk-grayLight2);border-bottom:1px solid var(--sdk-grayLight1);z-index:2}
.htl .hclosed .hrhc{height:30px;display:flex;align-items:center;padding:0 10px;font-size:12.5px;font-weight:700;color:var(--sdk-grayDark1);border-right-color:var(--sdk-grayLight1);background:var(--sdk-grayLight2)}
.htl .hchips{position:sticky;right:var(--HW);display:flex;align-items:center;gap:6px;padding:0 8px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;white-space:nowrap}
.htl .hchip{font-size:12px;border-radius:12px;padding:1px 9px;border:1px solid var(--c);background:var(--f);color:var(--sdk-grayDark1);cursor:pointer;white-space:nowrap}
.htl .hchip:hover{box-shadow:0 0 0 2px color-mix(in srgb,var(--c) 30%,transparent)}
.htl .hchip.man{border-style:dashed}
/* bars */
.htl .hb{position:absolute;border-radius:5px;border-right:3px solid;background:var(--tint);cursor:grab;touch-action:none;z-index:2}
.htl .hb.hatch{background-image:repeating-linear-gradient(135deg,color-mix(in srgb,#fff 55%,transparent) 0 5px,transparent 5px 10px)}
.htl .hb.ad{opacity:.75;cursor:pointer}
.htl .hb.cancel{opacity:.45}
.htl .hb .rz{position:absolute;left:0;top:0;bottom:0;width:6px;cursor:ew-resize;border-radius:5px 0 0 5px}
.htl .hb .rz:hover{background:color-mix(in srgb,var(--sdk-grayDark1) 25%,transparent)}
.htl .hlab{position:absolute;display:flex;align-items:center;gap:0;font-size:12.5px;white-space:nowrap;padding:0 7px;color:var(--sdk-grayDark1);overflow:hidden;z-index:3;cursor:grab;touch-action:none}
.htl .hlab b{font-weight:700;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
.htl .hlab b:hover{text-decoration:underline}
.htl .hlab .t{color:var(--sdk-gray);font-size:11.5px;flex:none}
.htl .hlab.tonly{cursor:grab;pointer-events:none}
.htl .hlab.ext{background:color-mix(in srgb,#fff 82%,transparent);border-radius:4px;box-shadow:0 0 0 1px var(--sdk-grayLight1)}
.htl .hlab.tall{white-space:normal;line-height:1.2}
.htl .hlab.tall b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:normal}
.htl .eye{flex:none;margin-inline-start:5px;font-size:11px;opacity:0;cursor:pointer;filter:grayscale(1);text-decoration:none}
.htl .hlab:hover .eye,.htl .wc:hover .eye,.htl .eye:focus{opacity:.8}
.htl .eye:hover{opacity:1}
.htl .hidn{font:inherit;font-size:12.5px;background:#fff;border:1px solid var(--sdk-grayLight1);border-radius:8px;padding:5px 9px;cursor:pointer;color:var(--sdk-grayDark1)}
/* the lens: part of a bar inside the cross-section strip — name only, enlarged */
.htl .hlens{position:absolute;display:flex;align-items:center;justify-content:center;z-index:4;overflow:hidden;cursor:grab;touch-action:none}
.htl .hlens .bn{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:clip;max-width:100%;color:var(--sdk-grayDark1);line-height:1}
.htl .hlens.clip .bn{text-overflow:ellipsis}
/* lodging */
.htl .hlc{position:absolute;border-radius:6px;background:color-mix(in srgb,var(--sdk-purpleDark1) 12%,#fff);border:1.5px solid var(--sdk-purpleDark1);z-index:1}
.htl .hcnt{position:absolute;height:15px;line-height:15px;font-size:10.5px;font-weight:700;background:var(--sdk-purpleDark1);color:#fff;border-radius:8px;padding:0 6px;white-space:nowrap;z-index:3}
.htl .hcnt.mag{font-size:12.5px;height:16px;line-height:16px}
.htl .hgst{position:absolute;height:15px;border-radius:4px;background:color-mix(in srgb,#fff 70%,transparent);border:1px solid color-mix(in srgb,var(--sdk-purpleDark1) 35%,transparent);z-index:2;cursor:grab;touch-action:none}
.htl .hgn{position:absolute;height:15px;line-height:15px;font-size:11.5px;font-weight:700;white-space:nowrap;padding:0 4px;z-index:3;color:var(--sdk-grayDark1);cursor:grab;touch-action:none}
.htl .hgn.ext{background:color-mix(in srgb,#fff 85%,transparent);border-radius:3px}
.htl .hgn.mag{font-size:13.5px;font-weight:800}
.htl .hmk{position:absolute;height:15px;line-height:13px;font-size:10.5px;border-radius:4px;padding:0 4px;white-space:nowrap;z-index:3;pointer-events:none}
.htl .hmk.in{background:var(--sdk-greenLight2);color:var(--sdk-greenDark1);border:1px solid var(--sdk-greenDark1)}
.htl .hmk.out{background:var(--sdk-grayLight2);color:var(--sdk-grayDark1);border:1px solid var(--sdk-gray)}
/* now + cross-section */
.htl .hnow{position:absolute;top:0;bottom:0;width:2px;background:var(--sdk-redDark1);z-index:7;pointer-events:none}
.htl .hband{position:absolute;top:0;z-index:8;pointer-events:none;background:color-mix(in srgb,var(--sdk-redDark1) 4.5%,transparent);border-left:1px solid var(--sdk-redLight1);border-right:1px solid var(--sdk-redLight1)}
.htl .hbl{position:absolute;top:2px;font-size:11.5px;font-weight:800;color:#fff;background:var(--sdk-redDark1);border-radius:4px;padding:1px 6px;z-index:10;white-space:nowrap;pointer-events:none}
.htl .htnow{position:absolute;top:1px;width:44px;text-align:center;font-size:11.5px;line-height:15px;font-weight:800;color:#fff;background:var(--sdk-redDark1);border-radius:4px;padding:0;z-index:11;pointer-events:none}
.htl.nox .hband,.htl.nox .hbl{display:none}
.htl .hghost{left:auto;right:auto}
.htl .hdropline{position:absolute;right:0;height:3px;margin-top:-1.5px;background:var(--sdk-grayDark1);border-radius:2px;z-index:30;pointer-events:none}
.htl .dayempty{position:sticky;right:var(--HW);padding:18px;color:var(--sdk-gray);font-size:14px}
.htl .hmenu .hide.dis{opacity:.4}
/* ===== v0.1.2 (the owner 05:20) ===== */
/* #7 colours/chrome = the vertical's exact tokens (.ev / .lbar / .lseg .lc / .ev .lens) */
.htl .hb{border:1px solid rgba(0,0,0,.06);border-right:4px solid;color:var(--ink)}
.htl .hb.hatch{background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.55) 0 4px,transparent 4px 8px)}
.htl .hlab{color:var(--ink)}
.htl .hlab .t{color:var(--sdk-grayDark1)}
.htl .hlc{background:color-mix(in srgb,var(--sdk-purpleDark1) 14.9%,transparent);border:2px solid var(--sdk-purpleDark1);border-right-width:5px}
.htl .hcnt{font-size:11.5px;font-weight:800;border-radius:9px;padding:0 7px;height:16px;line-height:16px}
.htl .hcnt.mag{font-size:12.5px}
.htl .hgst{border-color:color-mix(in srgb,var(--sdk-purpleDark1) 66.7%,transparent)}
.htl .hlens{background:var(--f);box-shadow:inset 0 0 0 1px var(--sdk-redLight1);border-radius:4px}
.htl .hds{box-shadow:0 1px 0 var(--sdk-grayLight1),0 -1px 0 var(--sdk-grayLight1)}
/* #9 day pill on the ruler: the full vertical title, sticky inside its day */
.htl .hdp{max-width:none;font-weight:800}
/* #1 cross-section window: its cards scroll inside it (wheel over it never moves the timeline) */
.htl .win .wslide>.wbody{display:flex;align-items:stretch;gap:6px;min-height:0;overflow:hidden}
.htl .win .wslide>.wbody>.wg{display:grid;flex:1 1 auto;min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;margin:0;padding:0 0 0 4px;box-shadow:none;border:0;grid-template-rows:none!important;grid-auto-rows:var(--wcH);gap:3px 4px;align-content:start;scrollbar-width:thin;scrollbar-color:var(--sdk-grayLight1) transparent}
.htl.nox .win .wslide>.wbody{visibility:hidden}
/* #4 cards ≥30% smaller (height 40→28, padding, fonts, tag, eye); 8 per row */
.htl{--wcH:28px}
.htl .wg{grid-template-columns:repeat(8,minmax(0,1fr))}
.htl .wc{padding:1px 4px;gap:3px;border-radius:4px;border-inline-start-width:3px}
.htl .wc .tg{font-size:7px;padding:0 3px;border-radius:2px;margin-top:1px;line-height:10px}
.htl .wc .nm{font-size:12.5px;line-height:12.5px;font-weight:600;white-space:normal;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis}
.htl .wc .eye{font-size:8px}
.htl .wc.more{font-size:9px}
.htl .wc.now .nm::before{font-size:7px}
/* #2 shrunk tables / 👁-hidden records → vertical tabs at the window's LEFT edge (like the vertical's closed-column strips) */
.htl .wstrip{display:flex;flex:none;gap:3px;align-items:stretch;order:2}
.htl .wst{display:flex;flex-direction:column;align-items:center;justify-content:space-between;width:22px;padding:4px 0 3px;border:1px solid var(--sdk-grayLight1);border-top:3px solid var(--c,var(--sdk-gray));border-radius:4px;background:var(--f,var(--sdk-grayLight2));cursor:pointer;text-decoration:none;color:var(--sdk-grayDark1);overflow:hidden}
.htl .wst:hover{box-shadow:0 0 0 2px color-mix(in srgb,var(--c,var(--sdk-gray)) 30%,transparent)}
.htl .wst .wsl{writing-mode:vertical-rl;transform:rotate(180deg);font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:0;flex:1 1 auto;color:color-mix(in srgb,var(--c,var(--sdk-grayDark1)) 80%,black)}
.htl .wst .c{font-size:9.5px;color:var(--sdk-gray)}
.htl .wst.rec{background:#fff;border-style:dashed;border-top-style:solid}
.htl .wst.rec .wsl{font-weight:600;color:var(--sdk-grayDark1)}
/* #8 rows shrink to a few px: text keeps its size and is clipped; thin rows show only the coloured bars */
.htl .hrh{overflow:hidden}
.htl .hrh .hrz{bottom:0;height:6px}
.htl .hrow.thin .hrh .l2,.htl .hrow.thin .hrh .hgl2{display:none}
.htl .hrow.thin .hrh .l1{top:0}
.htl .hrow.thin .hb .rz{display:none}
/* item 10: funnel ops (הוא · אינו · מכיל · לא מכיל · ריק · לא ריק) + free text value; configured fields marked */
.htl .cfmenu .hcfop{flex-wrap:wrap}
.htl .cfmenu .hcfop a{flex:1 0 30%}
.htl .cfmenu .cfd a.cfg{border-color:var(--sdk-grayDark1)}
.htl .cfmenu .cftx{padding:0 8px 6px}
.htl .cfmenu .cftx input{width:100%;box-sizing:border-box;font:inherit;font-size:12px;padding:3px 6px;border:1px solid var(--sdk-grayLight1);border-radius:5px}
.htl .cfmenu .cfl.dim{opacity:.4;pointer-events:none}
.htl .cfmenu .cfnv{padding:0 10px 6px}

/* v0.1.3 #1 (the owner 06:57): card stays 28px but the name is back to 12.5px — wraps to 2 lines (clamped), never shrinks */
/* v0.1.3 #2: the cross-section title + toggle wear the cross-section colour (band / lens = redDark1 / redLight1) */
.htl .wh b{color:var(--sdk-redDark1)}
.htl .wh .tog{border-color:var(--sdk-redLight1);background:color-mix(in srgb,var(--sdk-redDark1) 6%,white)}
.htl .wh .tog.on .sw{background:var(--sdk-redDark1)}
.htl .wh .tog:hover{border-color:var(--sdk-redDark1);background:color-mix(in srgb,var(--sdk-redDark1) 10%,white)}
/* v0.1.3 #3: day titles in calm ink (no accent / phase colour); the clock keeps the accent */
.htl .ban .ctr .big{color:var(--sdk-grayDark1)}
.htl .hdp{background:white;color:var(--sdk-grayDark1);border-color:var(--sdk-grayLight1);font-weight:700}
`;
