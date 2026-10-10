/* «טיימליין אופקי» v0.1.0 — horizontal RTL grid. Same Option B chrome as the vertical (SDK grays on white, table fill names,
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
`;
