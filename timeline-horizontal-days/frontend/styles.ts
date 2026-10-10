/* CSS ported verbatim from the frozen A-v7 mockup (A-v7-timeline.template.html) + build overrides. */
export const CSS = String.raw`
:root{--hdr:54px;--ban:52px;--win:150px;--winx:42px;--colh:36px;--axis:58px;--strip:30px;
  --cr:var(--sdk-grayDark1);--crd:var(--sdk-grayDark1);--crx:var(--sdk-grayDark1);--crt:var(--sdk-grayLight2);--crb:var(--sdk-grayLight1);--ink:var(--sdk-grayDark1);--mut:var(--sdk-gray);--line:var(--sdk-grayLight2)}
*{box-sizing:border-box}
html,body{margin:0;height:100%;overflow:hidden;font-family:"Segoe UI",Heebo,Rubik,"Open Sans",sans-serif;color:var(--ink);background:#fff}
bdi{unicode-bidi:isolate}
/* ONE top row: view controls · filters · (left end) count, only-mine, search */
.top{height:var(--hdr);display:flex;align-items:center;gap:7px;padding:0 12px;background:#fff;border-bottom:1px solid var(--line);position:relative;z-index:20;white-space:nowrap}
.ptl{margin:0 2px 0 8px;font-size:19px;font-weight:800;color:var(--crd);display:flex;align-items:center;gap:6px;white-space:nowrap}
.ptl .demo{font-size:10px;font-weight:700;background:var(--crt);color:var(--crd);border-radius:4px;padding:1px 5px}
.sep{width:1px;height:26px;background:var(--line);margin:0 4px}
.lbl{font-size:12.5px;color:var(--mut);font-weight:700}
.dd{position:relative}
.dd>button{font:inherit;font-size:13.5px;display:flex;align-items:center;gap:6px;background:var(--sdk-grayLight2);border:1px solid var(--sdk-grayLight2);border-radius:8px;padding:6px 10px;cursor:pointer;white-space:nowrap;max-width:240px}
.dd>button small{color:var(--mut);font-size:11.5px}
.dd>button .v{overflow:hidden;text-overflow:ellipsis}
.dd>button::after{content:"▾";color:var(--mut);font-size:11px}
.dd.open>button{border-color:var(--cr);background:#fff}
.dd.res>button{background:var(--crt);border-color:var(--crb);color:var(--crx);font-weight:700}
.dd.res>button small{color:var(--sdk-grayDark1);font-weight:400}
.menu{display:none;position:absolute;top:40px;right:0;background:#fff;border:1px solid var(--sdk-grayLight2);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);padding:6px;min-width:200px;z-index:30}
.dd.open .menu{display:block}
.menu .it{display:flex;align-items:center;gap:8px;font-size:14px;padding:6px 10px;border-radius:6px;cursor:pointer;white-space:nowrap}
.menu .it:hover,.menu .it.sel{background:var(--crt)}
.menu .it.sel{font-weight:700;color:var(--crd)}
.menu .it .ck{width:16px;height:16px;border:1.5px solid var(--sdk-gray);border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;color:#fff;flex:none}
.menu .it.on .ck{background:var(--cr);border-color:var(--cr)}
.menu .it i{width:10px;height:10px;border-radius:3px;flex:none}
.menu .it .n{margin-inline-start:auto;color:var(--sdk-gray);font-size:12px}
.menu .act{display:flex;gap:6px;padding:4px 6px;border-top:1px solid var(--sdk-grayLight2);margin-top:4px}
.menu .act span{font-size:12px;color:var(--crd);padding:3px 6px;cursor:pointer}
.menu .hd{font-size:11.5px;color:var(--mut);padding:6px 10px 4px;white-space:normal;line-height:1.35}
.menu.res{min-width:170px}
.menu .ck2{width:14px;display:inline-block;color:var(--crd);font-weight:800}
.menu.res .it small{margin-inline-start:auto;color:var(--mut);font-size:12px;font-weight:400}
.menu.res .it.sel small{color:var(--sdk-grayDark1)}
.menu.f{max-height:420px;overflow:auto}
.menu.f .it .n{min-width:18px;text-align:left}
.dd.f>button{background:#fff}
.dd.f.act>button{background:var(--crt);border-color:var(--crb);color:var(--crx)}
.dd.f.act>button::after{content:none}
.dd.f>button .x{display:inline-flex;width:17px;height:17px;border-radius:50%;align-items:center;justify-content:center;background:var(--crb);color:var(--crx);font-size:10.5px;margin-inline-start:2px}
.dd.f>button b{background:var(--cr);color:#fff;border-radius:9px;font-size:11px;padding:0 6px}
.tog{display:flex;align-items:center;gap:6px;font-size:13px;white-space:nowrap;background:var(--sdk-grayLight2);border-radius:16px;padding:5px 10px;cursor:pointer;user-select:none}
.tog .sw{width:30px;height:16px;border-radius:8px;background:var(--sdk-grayLight1);position:relative;flex:none}
.tog .sw::after{content:"";position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:50%;background:#fff;transition:.15s}
.tog.on .sw{background:var(--cr)}.tog.on .sw::after{right:16px}
.tog.me.on{background:var(--crt);color:var(--crx)}
.menu .tog{background:none;padding:7px 8px;font-size:14px}
.sp{flex:1}
.clr{color:var(--crd);cursor:pointer;font-weight:700;font-size:13px;text-decoration:none;white-space:nowrap}
.cnt{color:var(--sdk-gray);font-size:12.5px}
.cnt.zero{color:var(--crd);font-weight:700}
.srch{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--sdk-grayLight2);border-radius:8px;padding:0 9px;height:33px;width:190px}
.srch svg{flex:none}
.srch input{border:0;outline:0;font:inherit;font-size:13.5px;width:100%;background:transparent;direction:rtl}
.srch.act{border-color:var(--crb);background:#fff}
/* day banner */
.ban{height:var(--ban);display:flex;align-items:center;gap:10px;padding:0 14px 0 12px;color:#fff;background:var(--cr);position:relative}
.ban.prep{background:var(--sdk-cyanLight2)}.ban.wrap{background:var(--sdk-yellowLight2)}
.ban .big{font-size:21px;font-weight:800;line-height:1;white-space:nowrap}
.ban .big small{font-size:15px;font-weight:600;opacity:.88;margin-inline-start:10px}
.ban .ttl{position:absolute;left:50%;transform:translateX(-50%);font-size:24px;font-weight:800;letter-spacing:.3px;display:flex;align-items:center;gap:8px;pointer-events:none}
.ban .ttl .demo{font-size:10.5px;font-weight:700;background:rgba(255,255,255,.22);border-radius:4px;padding:1px 6px;letter-spacing:.5px}
.ban .bb{font:inherit;font-size:15px;font-weight:700;color:#fff;background:rgba(255,255,255,.14);border:1.5px solid rgba(255,255,255,.55);border-radius:9px;padding:6px 13px;cursor:pointer;white-space:nowrap}
.ban .bb:hover,.ban .bb.open{background:#fff;color:var(--crd)}
.ban .clock{font-size:28px;font-weight:700;background:rgba(0,0,0,.16);border-radius:10px;padding:4px 14px}
.toast a{color:var(--sdk-grayLight1);font-weight:700;cursor:pointer;text-decoration:underline}
.toast{position:fixed;bottom:18px;top:auto;left:50%;transform:translateX(-50%);font-size:14px!important;padding:8px 16px!important;background:var(--sdk-grayDark1);color:#fff;font-size:13px;border-radius:8px;padding:6px 12px;z-index:40;display:none}
/* jump-to picker — styled like Airtable's native date/time picker (in the build: the native one) */
.jp{display:none;position:absolute;top:calc(var(--ban) - 2px);left:110px;width:330px;background:#fff;color:var(--ink);border:1px solid var(--sdk-grayLight2);border-radius:6px;box-shadow:0 0 0 1px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.18);padding:10px 12px 10px;z-index:40;font-size:13px}
.jp.open{display:block}
.jp .jin{display:flex;gap:8px;margin-bottom:10px}
.jp .jin label{display:flex;flex-direction:column;gap:3px;font-size:11.5px;color:var(--mut);font-weight:600}
.jp .jin input{font:inherit;font-size:14px;color:var(--ink);border:2px solid var(--sdk-grayLight2);border-radius:4px;padding:4px 7px;outline:0}
.jp .di{width:150px;border-color:var(--sdk-grayDark1)!important}
.jp .ti{width:82px;text-align:left}
.jp .jh{display:flex;align-items:center;justify-content:space-between;padding:2px 4px 6px}
.jp .jh b{font-size:14px}
.jp .jh a{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:18px;color:var(--sdk-grayDark1);cursor:pointer}
.jp .jh a:hover{background:var(--sdk-grayLight2)}
.jp .jg{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}
.jp .wd{font-size:11.5px;color:var(--mut);font-weight:700;padding:3px 0}
.jp .c{height:32px;line-height:32px;border-radius:4px;font-size:13px;cursor:pointer;position:relative}
.jp .c.out{color:var(--sdk-grayLight1);cursor:default}
.jp .c.in:hover{background:var(--sdk-grayLight2)}
.jp .c.prep,.jp .c.wrap{background:var(--sdk-grayLight2)}
.jp .c.fest{background:var(--crt);color:var(--crx);font-weight:700}
.jp .c.today{box-shadow:inset 0 0 0 2px var(--sdk-grayDark1)}
.jp .c.sel{background:var(--sdk-grayDark1);color:#fff;font-weight:700}
.jp .jf{display:flex;align-items:center;gap:6px;margin-top:10px;padding-top:8px;border-top:1px solid var(--sdk-grayLight2)}
.jp .lg{display:flex;align-items:center;gap:4px;font-size:11px;white-space:nowrap;color:var(--mut);margin-inline-end:auto}
.jp .lg i{width:10px;height:10px;border-radius:2px;display:inline-block;margin-inline-start:6px}
.jp .lg i.f{background:var(--crt);border:1px solid var(--crb)}.jp .lg i.p{background:var(--sdk-grayLight2);border:1px solid var(--sdk-grayLight1)}.jp .lg i.t{box-shadow:inset 0 0 0 2px var(--sdk-grayDark1)}
.jp .go{font:inherit;font-weight:700;font-size:13px;background:var(--sdk-grayDark1);color:#fff;border:0;border-radius:4px;padding:6px 14px;cursor:pointer}
.jp .cn{font:inherit;font-size:13px;background:none;border:0;color:var(--mut);cursor:pointer}
/* cross-section window = the middle 20% of the visible timeline */
.win{position:relative;z-index:15;height:var(--win);padding:6px 14px 8px;background:#fff;border-bottom:2px solid var(--cr);display:flex;flex-direction:column}
.tl.nox .win{display:none}
.wh{display:flex;align-items:center;gap:10px;margin-bottom:6px;white-space:nowrap;min-height:28px}
.wh .tog{background:#fff;border:1px solid var(--crb);padding:3px 8px}
.wh .wemp{font-size:14px;color:var(--sdk-gray)}
.wh .wemp a{color:var(--crd);font-weight:700;cursor:pointer;text-decoration:underline}
.wh .rg{font-size:15px;color:var(--sdk-grayDark1);font-weight:600}
.wfb{font:inherit;font-size:13px;display:flex;align-items:center;gap:5px;border:1px solid var(--crb);background:#fff;color:var(--sdk-grayDark1);border-radius:14px;padding:3px 10px;cursor:pointer;margin-inline-start:auto}
.wfb.on{background:var(--crt);color:var(--crx);font-weight:700}
.wfb b{background:var(--cr);color:#fff;border-radius:8px;font-size:11px;padding:0 5px}
.wpanel{display:none;position:absolute;top:40px;left:14px;width:min(960px,calc(100% - 28px));background:#fff;border:1px solid var(--sdk-grayLight1);border-radius:10px;box-shadow:0 10px 28px rgba(0,0,0,.16);padding:10px 12px 4px;z-index:26}
.wpanel.open{display:block}
.wpanel .wp{flex-wrap:wrap}
.wh b{font-size:19px;color:var(--crd)}
.wh span{font-size:14px;color:var(--sdk-grayDark1)}
.wh .ad{font-size:13px}
.lnk{display:flex;align-items:center;gap:6px;font-size:13px;border-radius:14px;padding:3px 10px;cursor:pointer;border:1px solid var(--crb);background:#fff;color:var(--sdk-grayDark1);white-space:nowrap}
.lnk.on{background:var(--cr);color:#fff;border-color:var(--cr);font-weight:700}
.wp{display:flex;gap:5px;align-items:center;margin-bottom:5px;overflow:hidden}
.pl{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;border-radius:14px;padding:2px 8px 2px 6px;cursor:pointer;white-space:nowrap;border:1.5px solid var(--c);background:color-mix(in srgb,var(--c) 12%,#fff);font-weight:600}
.pl i{width:8px;height:8px;border-radius:50%;background:var(--c)}
.pl .c{font-size:11px;background:#fff;border-radius:8px;padding:0 5px;color:var(--sdk-grayDark1);font-weight:700}
.pl.off{background:#fff;border:1.5px dashed var(--sdk-grayLight1);color:var(--sdk-gray);font-weight:400}
.pl.off i{background:var(--sdk-grayLight2)}
.pl.off .c{background:var(--sdk-grayLight2);color:var(--sdk-gray)}
.wp .sc{font-size:12px;color:var(--crd);cursor:pointer;padding:0 4px;white-space:nowrap}
.wfr{display:flex;gap:6px;align-items:center;margin-bottom:6px;min-height:28px;font-size:12.5px;color:var(--sdk-grayDark1);white-space:nowrap;overflow:hidden}
.wfr .dd>button{padding:3px 9px;font-size:12.5px;background:#fff}
.wfr .tog{padding:3px 9px;font-size:12.5px;background:#fff;border:1px solid var(--crb)}
.wfr .wcnt{margin-inline-start:auto;color:var(--sdk-gray)}
.chip2{display:inline-flex;align-items:center;gap:5px;background:var(--crt);border:1px solid var(--crb);color:var(--crx);border-radius:12px;padding:1px 4px 1px 8px;font-size:12px}
.chip2 small{color:var(--sdk-grayDark1)}
.chip2 a{display:inline-flex;width:16px;height:16px;border-radius:50%;align-items:center;justify-content:center;background:var(--crb);color:var(--crx);font-size:10.5px;cursor:pointer}
.wfr .ro{color:var(--sdk-gray)}
.wg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 10px;overflow:hidden;align-content:start}
.wc{display:flex;gap:8px;align-items:center;background:#fff;border:1px solid var(--sdk-grayLight2);border-inline-start:5px solid;border-radius:7px;padding:5px 9px;min-width:0}
.wc .tg{font-size:11.5px;padding:1px 7px;border-radius:4px;white-space:nowrap;flex:none;font-weight:700}
.wc .nm{font-size:17px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}
.wc .tm{font-size:13px;color:var(--mut);white-space:nowrap;flex:none}
.wc.more{justify-content:center;color:var(--mut);font-size:14px;border-inline-start-color:var(--sdk-grayLight2)}
.wc.now .nm::before{content:"● ";color:var(--cr);font-size:12px}
.quiet{font-size:15px;color:var(--mut);padding:6px 2px}
.quiet a{color:var(--crd);font-weight:700;cursor:pointer;text-decoration:underline}
.empty{font-size:16px;color:var(--sdk-gray);padding:8px 2px}
/* column headers */
.cols{height:var(--colh);display:flex;background:#fff;border-bottom:1px solid var(--line)}
.cols>div{flex:1 1 0;min-width:0;font-size:13.5px;font-weight:700;display:flex;align-items:center;justify-content:center;border-inline-start:1px solid var(--sdk-grayLight2);gap:6px;white-space:nowrap;overflow:hidden;position:relative;border-top:3px solid var(--c,transparent)}
.cols>div i{width:9px;height:9px;border-radius:50%;flex:none}
.cols .ax{flex:0 0 var(--axis);font-weight:600;color:var(--mut);border-top-color:transparent}
.cols .hd{position:absolute;right:5px;top:50%;transform:translateY(-50%);color:var(--sdk-grayLight1);cursor:grab;font-size:14px;padding:2px 3px;border-radius:4px;user-select:none;touch-action:none}
.cols .hd:hover{color:var(--sdk-grayDark1);background:var(--sdk-grayLight2)}
.cols .vc{font-size:11.5px;font-weight:600;color:var(--sdk-gray);min-width:12px}
.cols .cm{position:absolute;left:28px;top:50%;transform:translateY(-50%);width:20px;height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--sdk-gray);cursor:pointer}
.cols .cm:hover{background:var(--sdk-grayLight2);color:var(--sdk-grayDark1)}
.cols>div.adonly .cx,.cols>div.adonly .hd{display:none}
.cols>div.adonly .cm{left:4px}
.cols>div.adonly{justify-content:flex-start;padding-inline-start:8px}
.cols{position:relative;overflow:visible;z-index:12}
.cols>div{overflow:visible}
.cols>div .nmh{overflow:hidden;text-overflow:ellipsis}
.hmenu{display:none;position:absolute;top:32px;left:6px;background:#fff;border:1px solid var(--sdk-grayLight2);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.14);padding:4px;z-index:40;font-weight:400;font-size:13.5px;min-width:140px}
.hmenu.open{display:block}
.hmenu div{padding:6px 10px;border-radius:5px;cursor:pointer;white-space:nowrap}
.hmenu div:hover{background:var(--crt)}
.hmenu .sepm{padding:0;height:1px;background:var(--sdk-grayLight2);margin:3px 0}
.cols>div.dragging{opacity:.35}
.cghost{position:fixed;z-index:60;height:34px;display:flex;align-items:center;gap:6px;padding:0 12px;background:#fff;border:1.5px solid var(--c);border-radius:7px;box-shadow:0 10px 26px rgba(0,0,0,.22);font-size:13.5px;font-weight:700;pointer-events:none;transform:rotate(-1.5deg)}
.cghost i{width:9px;height:9px;border-radius:50%}
.cols>div.dropline{display:none;flex:none;border:0;padding:0;overflow:visible;position:absolute;top:2px;bottom:-14px;width:3px;box-shadow:0 0 0 2px color-mix(in srgb,var(--sdk-grayDark1) 18.0%,transparent);margin-left:-1.5px;background:var(--sdk-grayDark1);border-radius:2px;z-index:30;pointer-events:none}
.dropline::before,.dropline::after{content:"";position:absolute;left:-3px;width:9px;height:9px;border-radius:50%;background:var(--sdk-grayDark1)}
.dropline::before{top:-4px}.dropline::after{bottom:-4px}
.cols>div.dropline.on{display:block}
.cols .cx{position:absolute;left:6px;top:50%;transform:translateY(-50%);width:20px;height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--sdk-gray);cursor:pointer;font-weight:700}
.cols .cx:hover{background:var(--sdk-grayDark1);color:#fff}
/* closed / empty columns retract into vertical strips on the LEFT */
.col.cz,.cols>div.cz{flex:0 0 var(--strip)!important;order:5;cursor:pointer}
.cols>div.cz{font-size:0;background:color-mix(in srgb,var(--c) 10%,#fff);border-top-width:3px}
.cols>div.cz i{display:inline-block;width:10px;height:10px}
.cols>div.cz .cx,.cols>div.cz span,.cols>div.cz .cm,.cols>div.cz .hmenu{display:none}
.col.cz{background:color-mix(in srgb,var(--c) 6%,#fff)}
.col.cz:hover,.cols>div.cz:hover{background:color-mix(in srgb,var(--c) 16%,#fff)}
.col.cz>*{display:none}
.col.cz>.czl{display:block;position:sticky;top:10px;margin:8px auto 0;writing-mode:vertical-rl;transform:rotate(180deg);font-size:14px;font-weight:800;color:color-mix(in srgb,var(--c) 80%,#000);white-space:nowrap;line-height:var(--strip);width:var(--strip);text-align:start}
.czl small{font-size:11.5px;font-weight:600;color:var(--sdk-gray);margin-top:6px;display:inline-block}
.col.cz.auto>.czl{font-weight:700}
.col.adonly,.cols>div.adonly{flex:0 0 150px}
/* drag-to-create, move, resize (mockup: page state only, nothing is written to Airtable) */
.col:not(.cz){cursor:crosshair}
.ev{cursor:grab;touch-action:none}.ev.inh{cursor:default}
.ev .rz{position:absolute;left:0;right:0;bottom:0;height:7px;cursor:ns-resize}
.ev .rz::after{content:"";position:absolute;left:50%;bottom:2px;width:18px;height:3px;margin-left:-9px;border-radius:2px;background:rgba(0,0,0,.28)}
.ev.moving{box-shadow:0 8px 20px rgba(0,0,0,.2);z-index:9;opacity:.92}
.ev.isnew,.chip.isnew{outline:2px dashed var(--cr);outline-offset:-2px}
.ghost{position:absolute;left:3px;right:3px;border-radius:6px;border:2px dashed var(--c);background:color-mix(in srgb,var(--c) 16%,transparent);z-index:7;pointer-events:none;display:flex;flex-direction:column;padding:3px 7px;font-size:12px;color:var(--ink)}
.ghost b{font-size:12.5px}.ghost span{font-weight:700;color:color-mix(in srgb,var(--c) 75%,#000);font-size:13px}
.cp{position:fixed;z-index:70;width:290px;background:#fff;border:1px solid var(--sdk-grayLight2);border-radius:10px;box-shadow:0 14px 36px rgba(0,0,0,.22);padding:12px 14px;font-size:13px}
.cp .cph{display:flex;align-items:center;gap:7px;font-weight:800;font-size:14.5px;margin-bottom:8px;color:color-mix(in srgb,var(--c) 80%,#000)}
.cp .cph i{width:11px;height:11px;border-radius:50%;background:var(--c)}
.cp .cph small{margin-inline-start:auto;font-weight:600;color:var(--mut);font-size:11.5px}
.cp input,.cp select{font:inherit;font-size:14px;border:1.5px solid var(--sdk-grayLight2);border-radius:6px;padding:5px 8px;width:100%;outline:0;background:#fff}
.cp input:focus,.cp select:focus{border-color:var(--sdk-grayDark1)}
.cp label{display:flex;flex-direction:column;gap:3px;font-size:11.5px;color:var(--mut);font-weight:700;margin-top:8px}
.cp .cpr{display:flex;gap:8px}.cp .cpr label{flex:1}
.cp .cpr input{direction:ltr;text-align:left}
.cp .cpd{margin-top:9px;font-size:12.5px;color:var(--mut);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.cp .chip3{background:var(--crt);color:var(--crx);border-radius:10px;padding:1px 8px;font-weight:700}
.cp .cpb{display:flex;gap:8px;justify-content:flex-start;margin-top:12px}
.cp .go{font:inherit;font-weight:700;background:var(--c);color:#fff;border:0;border-radius:6px;padding:6px 18px;cursor:pointer}
.cp .cn{font:inherit;background:var(--sdk-grayLight2);border:0;border-radius:6px;padding:6px 12px;cursor:pointer}
.cp .cpn{margin-top:8px;font-size:11px;color:var(--sdk-gray)}
.cp .hint{font-size:11.5px;color:var(--mut);margin-top:3px;font-weight:400}
/* timeline */
.vp{overflow-anchor:none;position:relative;height:calc(100vh - var(--hdr) - var(--ban) - var(--win) - var(--colh));overflow-y:scroll}
.tl.nox .vp{height:calc(100vh - var(--hdr) - var(--ban) - var(--colh))}
.tl.wempty{--win:46px}
.tl.wempty .wg{display:none}
.xsb{display:none;align-items:center;gap:7px;font-size:14px;font-weight:700;color:#fff;background:rgba(255,255,255,.14);border:1.5px solid rgba(255,255,255,.55);border-radius:16px;padding:4px 10px 4px 6px;cursor:pointer;white-space:nowrap}
.xsb .sw{width:30px;height:16px;border-radius:8px;background:rgba(255,255,255,.45);position:relative}
.xsb .sw::after{content:"";position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:50%;background:#fff}
.tl.nox .xsb{display:flex}
.canvas{position:relative;display:flex}
.axis{flex:0 0 var(--axis);position:relative;background:#fff;border-inline-end:1px solid var(--line)}
.col{flex:1 1 0;min-width:0;position:relative;border-inline-start:1px solid var(--sdk-grayLight2)}
.hl{position:absolute;left:0;right:0;border-top:1px solid var(--sdk-grayLight2)}
.hl.half{border-top:1px dotted var(--sdk-grayLight2)}
.hlab{position:absolute;right:6px;font-size:11.5px;color:var(--sdk-gray);transform:translateY(-7px)}
.dayh{position:absolute;left:0;right:0;color:#fff;display:flex;align-items:baseline;padding:0 16px;gap:14px;z-index:4;padding-top:13px;box-shadow:0 2px 0 rgba(0,0,0,.08),0 -1px 0 rgba(0,0,0,.08)}
.dayh .dn{font-size:22px;line-height:1;font-weight:800;white-space:nowrap}
.dayh .ds{font-size:15px;font-weight:600;opacity:.9;white-space:nowrap}
.dayh.prep{background:var(--sdk-cyanLight2)}.dayh.fest{background:var(--cr)}.dayh.wrap{background:var(--sdk-yellowLight2)}
.alld{position:absolute;left:0;right:0;background:#fff;border-bottom:1px solid var(--sdk-grayLight2);z-index:1}
.chip{position:absolute;left:3px;right:3px;font-size:11.5px;border-radius:4px;padding:0 5px;height:18px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-inline-start:3px solid;background:#fff;z-index:2}
.chip.cancel{text-decoration:line-through;opacity:.6}
.cmp{position:absolute;left:0;right:0;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='8' viewBox='0 0 24 8'%3E%3Cpath d='M0 4 Q6 0 12 4 T24 4' fill='none' stroke='%23c3c6ce' stroke-width='1.3'/%3E%3C/svg%3E") repeat-x center;border-top:1px dashed var(--sdk-grayLight2);border-bottom:1px dashed var(--sdk-grayLight2);font-size:11.5px;color:var(--sdk-gray);display:flex;align-items:center;justify-content:center;z-index:1}
.cmp span{background:#fff;padding:0 8px;border-radius:8px}
.hlab.cmpl{color:var(--sdk-grayLight1);font-size:13px}
.ev{position:absolute;border-radius:5px;padding:3px 6px;font-size:12px;line-height:1.25;overflow:hidden;color:var(--ink);border:1px solid rgba(0,0,0,.07);border-inline-start:4px solid;z-index:2}
.ev b{display:block;font-weight:700;font-size:12.5px;transition:font-size .28s ease}
.ev small{color:var(--sdk-grayDark1);font-size:11.5px;transition:font-size .28s ease}
.ev{transition:box-shadow .28s ease}
.ev{background:var(--tint)}
/* v7: magnifier = +30% text + a light backdrop behind every card inside the band */
.ev.mag b{font-size:16.25px}
.ev.mag small{font-size:15px}
.ev.mag{background:linear-gradient(var(--tint),var(--tint)),#fff;box-shadow:0 0 0 4px rgba(255,255,255,.92),0 4px 14px rgba(0,0,0,.16);z-index:6}
.ev.inh.mag{background:repeating-linear-gradient(135deg,rgba(255,255,255,.55) 0 4px,transparent 4px 8px),linear-gradient(var(--tint),var(--tint)),#fff}
/* v7: sticky names — the title of a long card stays pinned at the top of its visible part */
.ev b,.lseg .stk{will-change:transform}
.ev b.pinned{position:relative;z-index:1;background:linear-gradient(var(--tint),var(--tint)),#fff;margin:0 -6px;padding:2px 6px 3px;border-bottom:1px dashed rgba(0,0,0,.18);box-shadow:0 3px 6px -3px rgba(0,0,0,.18)}
.ev b.pinned::before{content:"⌃ ";color:var(--sdk-gray);font-weight:400}
/* v7: lodging = one merged bar per hotel; the guest stack changes at each check-in / check-out */
.lbar{position:absolute;z-index:9;border-radius:6px;background:color-mix(in srgb,var(--sdk-purpleDark1) 7.8%,transparent);border:1.5px solid var(--sdk-purpleDark1);border-inline-start-width:4px;overflow:hidden;cursor:default}
.lseg{position:absolute;left:0;right:0;padding-inline:6px 4px}
.lseg .lsl{position:absolute;top:0;left:0;right:0;border-top:1.5px dashed color-mix(in srgb,var(--sdk-purpleDark1) 66.7%,transparent)}
.lseg .stk{display:flex;flex-direction:column;gap:1px;font-size:12px;line-height:1.25;transition:font-size .28s ease}
.lseg .stk .lh{font-size:10.5px;color:var(--sdk-purpleDark1);font-weight:700;letter-spacing:.2px}
.lseg .stk .lc{align-self:flex-start;background:var(--sdk-purpleDark1);color:#fff;font-weight:800;font-size:11.5px;border-radius:9px;padding:0 7px;margin:1px 0 2px}
.lseg .stk .lg{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
.lseg .stk .lg.new{font-weight:800}
.lseg .stk .lg.new{color:var(--sdk-greenDark1)}
.lseg .stk.pinned .lg.new{font-weight:400;color:var(--ink)}
.lseg .stk.pinned{background:var(--sdk-purpleLight2);margin-inline:-6px -4px;padding:2px 6px 4px;border-bottom:1px dashed color-mix(in srgb,var(--sdk-purpleDark1) 40.0%,transparent);box-shadow:0 3px 6px -3px rgba(0,0,0,.16)}
.lseg.mag .stk{font-size:15.6px}.lseg.mag .stk .lc{font-size:15px}.lseg.mag .stk .lh{font-size:13.6px}
.lseg.mag{background:#fff;box-shadow:inset 0 0 0 2px #fff}
.lm{position:absolute;inset-inline-start:4px;height:15px;line-height:15px;font-size:10.5px;font-weight:700;white-space:nowrap;border-radius:3px;padding:0 5px;z-index:2;max-width:calc(100% - 8px);overflow:hidden;text-overflow:ellipsis}
.lm.in{background:var(--sdk-greenLight2);color:var(--sdk-greenDark1)}
.lm.out{background:var(--sdk-grayLight2);color:var(--sdk-grayDark1)}
.lm bdi{font-weight:600;opacity:.85}
.lm .df{text-decoration:underline dotted}
.ldf{font-size:10.5px;color:var(--sdk-gray);font-weight:600;white-space:nowrap}
.ev.inh{background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.55) 0 4px,transparent 4px 8px)}
.band{position:fixed;left:0;right:var(--axis);pointer-events:none;z-index:5;background:color-mix(in srgb,var(--sdk-grayDark1) 7.0%,transparent);border-top:2px solid var(--cr);border-bottom:2px solid var(--cr)}
.bl{position:fixed;left:6px;font-size:11px;font-weight:700;color:#fff;background:var(--cr);padding:1px 6px;border-radius:3px;z-index:6;pointer-events:none}
.tnow{position:fixed;right:0;width:var(--axis);z-index:7;background:var(--cr);color:#fff;font-size:13px;font-weight:700;text-align:center;border-radius:3px 0 0 3px;pointer-events:none}
.tl.nox .band,.tl.nox .bl{display:none}

/* ===== csf-timeline v0.1.0 build overrides (React layout: flex column instead of 100vh calcs) ===== */
#root{height:100%}
.tl{height:100vh;display:flex;flex-direction:column;overflow:hidden;font-family:"Segoe UI",Heebo,Rubik,"Open Sans",sans-serif}
.tl bdi,.tl .num{font-variant-numeric:tabular-nums}
.tl .top,.tl .ban,.tl .cols,.tl .ftr{flex:none}
.tl .win{flex:none}
.tl.nox .win{display:none}
.vpw{position:relative;flex:1 1 auto;min-height:0}
.vp{height:100%!important;overflow-y:scroll}
.tl.nox .vp{height:100%!important}
.band,.bl,.tnow{position:absolute}
.band{left:0;right:var(--axis)}
.ftr{height:22px;display:flex;align-items:center;gap:10px;padding:0 12px;font-size:11px;color:var(--sdk-gray);background:#fff;border-top:1px solid var(--line);white-space:nowrap;overflow:hidden}
.ftr .ver{direction:ltr;font-variant-numeric:tabular-nums}
.ftr .warn{color:var(--sdk-grayDark1);font-weight:700;overflow:hidden;text-overflow:ellipsis}
.ftr .sp{flex:1}
.top .menu{text-align:start}
.dd>button{color:inherit}
.ban .jp{right:auto}
.jp .jin input[type=datetime-local]{width:220px;direction:ltr;text-align:right}
.jp .qt{display:flex;gap:6px;flex-wrap:wrap;margin:2px 0 8px}
.jp .qt span{font-size:12px;background:var(--sdk-grayLight2);border-radius:12px;padding:2px 9px;cursor:pointer}
.jp .qt span:hover{background:var(--crt);color:var(--crx)}
.jp .jnote{font-size:11.5px;color:var(--mut);margin-bottom:8px}
.toast{display:block}
.cols .czlh{display:none}
/* Critic: ONE header note for the default lodging times (no * on every time) */
.cols .ldf{font-size:10.5px;color:var(--sdk-grayDark1);font-weight:600;background:var(--sdk-purpleLight2);border-radius:8px;padding:0 6px}
/* Critic: stronger lodging bar contrast */
.lbar{background:color-mix(in srgb,var(--sdk-purpleDark1) 14.9%,transparent);border:2px solid var(--sdk-purpleDark1);border-inline-start-width:5px}
.lseg .lsl{border-top:1.5px dashed var(--sdk-purpleDark1)}
.lseg .stk .lh{color:var(--sdk-purpleDark1)}
.lseg .stk .lc{background:var(--sdk-purpleDark1)}
.lseg .stk .lg{color:var(--sdk-grayDark1);font-weight:600}
.lm.in{background:var(--sdk-greenLight2);color:var(--sdk-greenDark1)}
.lm.out{background:var(--sdk-grayLight2);color:var(--sdk-grayDark1)}
.ev{cursor:pointer}
.col:not(.cz){cursor:default}
.notice{font-size:12px;color:var(--sdk-grayDark1);background:var(--sdk-grayLight2);border:1px solid var(--sdk-grayLight1);border-radius:8px;padding:6px 10px;margin:10px}

/* ===== v0.1.1 (Critic REVISE) ===== */
.tl .win{height:auto;min-height:0}
.tl.wempty .win{height:auto}
.tl .wg{grid-auto-rows:auto;min-height:34px;overflow:visible}
.cols{overflow:hidden}
.cols>div,.col,.col.cz,.cols>div.cz,.col.adonly,.cols>div.adonly{min-width:0;box-sizing:border-box}
.vp{overflow-x:auto}
.ev.mag b,.ev.mag small{font-size:inherit}
.ev b{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;font-size:12.5px}
.ev b.pinned{font-size:12.5px;-webkit-line-clamp:2}
.ev .lens{position:absolute;inset-inline:0;padding:3px 6px;overflow:hidden;z-index:3;pointer-events:none;background:linear-gradient(var(--tint),var(--tint)),#fff;box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--sdk-grayDark1) 25.0%,transparent)}
.ev .lens b{font-size:16.25px;line-height:1.2;-webkit-line-clamp:2;transform:none!important}
.ev .lens small{font-size:15px}

/* ===== v0.2.0 (CUT 2): interactions ===== */
.ev{cursor:grab;touch-action:none;user-select:none}
.ev:active{cursor:grabbing}
.ev .rz{z-index:4}
.lseg .lg{cursor:grab;touch-action:none}
.col:not(.cz){cursor:crosshair}
.col .ghost{z-index:7}
.cols>div .hd2{color:var(--sdk-grayLight1);cursor:grab;font-size:14px;padding:0 3px;border-radius:4px;user-select:none;touch-action:none;flex:none}
.cols>div .hd2:hover,.cols>div .hd2:focus{color:var(--sdk-grayDark1);background:var(--sdk-grayLight2);outline:0}
.cols>div .cm2{color:var(--sdk-gray);cursor:pointer;font-size:14px;padding:0 4px;border-radius:5px;flex:none}
.cols>div .cm2:hover{background:var(--sdk-grayLight2);color:var(--sdk-grayDark1)}
.cols>div.cz .hd2,.cols>div.cz .cm2,.cols>div.adonly .hd2{display:none}
.cols>div .hmenu{left:auto;inset-inline-end:4px;top:32px}
.dropline2{position:absolute;top:2px;bottom:-14px;width:3px;margin-left:-1.5px;background:var(--sdk-grayDark1);border-radius:2px;z-index:30;pointer-events:none;box-shadow:0 0 0 2px color-mix(in srgb,var(--sdk-grayDark1) 18.0%,transparent)}
.toast.msg{bottom:64px}
.toast.undo{display:flex;align-items:center;gap:8px;overflow:hidden}
.toast.undo .ut{opacity:.6;font-size:12px}
.toast.undo .ux{color:var(--sdk-grayLight1);text-decoration:none;font-weight:400}
.toast.undo .ubar{position:absolute;left:0;bottom:0;height:3px;background:var(--sdk-grayDark1)}
.cp .cperr{margin-top:8px;color:var(--sdk-grayDark1);font-weight:700;font-size:12px}
.cp .go:disabled{opacity:.5;cursor:default}

/* ===== v0.2.1: column width handle + visible scrollbars ===== */
.cols>div{position:relative}
.cols>div .rsz{position:absolute;left:-4px;top:0;bottom:0;width:8px;cursor:col-resize;z-index:14;touch-action:none}
.cols>div .rsz::after{content:"";position:absolute;left:3px;top:6px;bottom:6px;width:2px;border-radius:1px;background:transparent}
.cols>div .rsz:hover::after,.cols>div .rsz:focus::after,.tl-resizing .cols>div .rsz::after{background:var(--sdk-grayDark1)}
.cols>div .rsz.set::after{background:var(--sdk-grayLight1)}
.cols>div .rsz:focus{outline:0}
.tl-resizing,.tl-resizing *{cursor:col-resize!important;user-select:none!important}
.vp{scrollbar-width:auto;scrollbar-color:var(--sdk-grayLight1) var(--sdk-grayLight2);overscroll-behavior:contain}
.vp::-webkit-scrollbar{width:12px;height:12px}
.vp::-webkit-scrollbar-track{background:var(--sdk-grayLight2)}
.vp::-webkit-scrollbar-thumb{background:var(--sdk-grayLight1);border-radius:6px;border:2px solid var(--sdk-grayLight2)}
.vp::-webkit-scrollbar-thumb:hover{background:var(--sdk-gray)}

/* ===== v0.2.2: CSF base palette (Countdown Homescreen v0.4.2): soft rose · gold · green · teal · lavender on cream, teal hover ===== */
:root{--cream:#fff;--rose:var(--sdk-grayLight2);--gold:var(--sdk-yellowLight2);--green:var(--sdk-grayLight1);--teal:var(--sdk-grayLight1);--lav:var(--sdk-cyanLight2);--teal-d:var(--sdk-grayDark1);--teal-t:var(--sdk-grayLight2);
  --cr:var(--sdk-grayDark1);--crd:var(--sdk-grayDark1);--crx:var(--sdk-grayDark1);--crt:var(--sdk-grayLight2);--crb:var(--sdk-grayLight1);--ink:var(--sdk-grayDark1);--mut:var(--sdk-gray);--line:var(--sdk-grayLight2)}
html,body,.tl{background:var(--cream);color:var(--ink);font-family:"Segoe UI",Heebo,Rubik,"Open Sans",sans-serif}
.top{background:#fff;border-bottom-color:var(--line)}
.ptl{color:var(--crd)}
/* teal hover everywhere */
.dd>button:hover,.wfb:hover,.lnk:not(.on):hover,.wh .tog:hover{border-color:var(--teal);background:var(--teal-t)}
.dd.open>button{border-color:var(--teal)}
.menu .it:hover{background:var(--teal-t)}
.menu .it.sel{background:var(--crt)}
.cols>div:not(.cz):hover .nmh{color:var(--teal-d)}
/* banner + day separators: soft phase colour, ink text (≥4.5:1) */
.ban{color:var(--ink);background:var(--fest,var(--rose))}
.ban.prep{background:var(--prep,var(--lav))}
.ban.wrap{background:var(--wrap,var(--gold))}
.ban .bb{color:var(--ink);background:rgba(255,255,255,.72);border:1.5px solid color-mix(in srgb,var(--sdk-grayDark1) 18.0%,transparent)}
.ban .bb:hover,.ban .bb.open{background:#fff;color:var(--teal-d);border-color:var(--teal)}
.ban .clock{color:#fff;background:var(--cr)}
.dayh{color:var(--ink);box-shadow:0 2px 0 color-mix(in srgb,var(--sdk-grayDark1) 10.0%,transparent),0 -1px 0 color-mix(in srgb,var(--sdk-grayDark1) 10.0%,transparent)}
.dayh .ds{opacity:1;color:var(--sdk-grayDark1)}
.dayh.fest{background:var(--fest,var(--rose))}
.dayh.prep{background:var(--prep,var(--lav))}
.dayh.wrap{background:var(--wrap,var(--gold))}
/* v0.2.2 item 1: the separator spans the WHOLE canvas (axis + every column + strips) above cards and lodging bars */
.canvas>.tops{z-index:12}
.canvas>.tops .dayh{left:0;right:0}
.canvas{min-width:100%}
.dayempty{position:sticky;top:40%;z-index:3;margin:0 auto;width:max-content;max-width:70%;text-align:center;font-size:15px;color:var(--mut);background:#fff;border:1px dashed var(--crb);border-radius:10px;padding:10px 16px;pointer-events:none;height:0;overflow:visible;transform:translateY(-50%)}
.vp>.dayempty{position:absolute;left:50%;top:45%;height:auto;transform:translate(-50%,-50%)}
/* the cross-section: rose band, white label */
.band{background:color-mix(in srgb,var(--sdk-grayLight1) 10.0%,transparent);border-top-color:var(--cr);border-bottom-color:var(--cr)}
.bl,.tnow{background:var(--cr);color:#fff}
.win{background:#fff;border-bottom-color:var(--rose)}
.wh b{color:var(--crd)}
.lnk.on{background:var(--teal-d);border-color:var(--teal-d);color:#fff}
.tog.on .sw{background:var(--teal-d)}
/* toast */
.toast{background:var(--sdk-grayDark1)}
.toast a{color:var(--sdk-grayLight1)}
.toast.undo .ubar{background:var(--teal)}
/* hour labels: exactly centred on their grid line (item 5) */
.hlab{transform:translateY(-50%);line-height:14px;color:var(--sdk-gray)}
.hlab.sub{color:var(--sdk-gray);font-size:10.5px}
.hl.half{border-top:1px dashed var(--sdk-grayLight2)}
/* now line (item 8) */
.nowl{position:absolute;left:0;right:0;height:0;border-top:2px solid var(--teal-d);z-index:11;pointer-events:none}
.nowl span{position:absolute;right:2px;top:-10px;font-size:11px;font-weight:700;color:#fff;background:var(--teal-d);border-radius:3px;padding:1px 4px;line-height:16px}
/* item 6: names are click targets */
.ev b.open,.wc .nm.open{cursor:pointer}
.ev:hover b.open,.wc .nm.open:hover{text-decoration:underline;text-decoration-color:var(--teal);text-underline-offset:2px;color:var(--teal-d)}
.wc .nm.open{color:var(--ink);text-decoration:none}
.wc:hover{border-color:var(--teal)}
/* item 4: inline jump control — calendar date + time side by side, no own popup */
.jumpc{display:flex;align-items:center;gap:6px}
.jumpc input{font:inherit;font-size:14px;color:var(--ink);background:#fff;border:1.5px solid color-mix(in srgb,var(--sdk-grayDark1) 18.0%,transparent);border-radius:8px;padding:4px 7px;height:34px;direction:ltr}
.jumpc input:hover,.jumpc input:focus{border-color:var(--teal);outline:0}
.jumpc .jd{width:150px}
.jumpc .jt{width:104px}
.jp,.xsb,.tl.nox .xsb{display:none!important}
/* item 9: the window never leaves; its height is RESERVED (header + 1 row) and extra rows overlay the grid top.
   Off = same box, cards hidden → nothing above or in the grid moves. */
.tl .win,.tl.nox .win,.tl.wempty .win{display:flex;height:var(--winres,86px)!important;min-height:0;overflow:visible;flex:none}
.tl.nox .vp{height:100%!important}
.tl.nox .band,.tl.nox .bl{display:none}
.win .wg{position:relative;z-index:16;background:#fff;padding-bottom:6px;margin:0 -14px;padding-inline:14px;align-self:stretch}
.win .wg.over{box-shadow:0 6px 10px -6px color-mix(in srgb,var(--sdk-grayDark1) 25.0%,transparent);border-bottom:2px solid var(--rose)}
.win.off .wg{visibility:hidden}
.win.off .wfb,.win.off .lnk{opacity:.45;pointer-events:none}
.win .wpanel{position:absolute;top:40px;left:0;right:0;z-index:18;background:#fff;padding:0 14px 8px;box-shadow:0 8px 16px -8px color-mix(in srgb,var(--sdk-grayDark1) 30.0%,transparent)}
.win .wpanel:not(.open){display:none}


/* ===== v0.2.3 palette B (Critic, PALETTE.md): Airtable SDK colours only. Every --sdk-* var is set at runtime from colorUtils.getHexForColor ===== */
.tl{--cream:#fff;--rose:var(--sdk-grayLight1);--gold:var(--sdk-grayLight1);--green:var(--sdk-grayLight1);--teal:var(--sdk-grayLight1);--lav:var(--sdk-grayLight1);--teal-d:var(--sdk-grayDark1);--teal-t:var(--sdk-grayLight2);
  --cr:var(--sdk-grayDark1);--crd:var(--sdk-grayDark1);--crx:var(--sdk-grayDark1);--crt:var(--sdk-grayLight2);--crb:var(--sdk-grayLight1);--ink:var(--sdk-grayDark1);--mut:var(--sdk-gray);--line:var(--sdk-grayLight2);--acc:var(--sdk-redDark1)}
html,body,.tl{background:#fff;color:var(--sdk-grayDark1)}
.top{background:#fff;border-bottom:1px solid var(--sdk-grayLight1)}
.ptl{color:var(--sdk-grayDark1)}
.dd>button,.tog,.dd.res>button,.dd.f.act>button{background:#fff;border:1px solid var(--sdk-grayLight1);color:var(--sdk-grayDark1)}
.dd.res>button small,.menu.res .it.sel small,.chip2 small{color:var(--sdk-gray)}
.tog .sw{background:var(--sdk-grayLight1)}
.cnt,.cols .vc,.czl small,.ldf,.cols .ldf,.hlab,.hlab.sub,.empty,.wh .wemp{color:var(--sdk-gray)}
.cols .ldf{background:var(--sdk-grayLight2)}
.srch{border-color:var(--sdk-grayLight1)}
.ban{color:var(--sdk-grayDark1);border-bottom:1px solid var(--sdk-grayLight1);box-shadow:none}
.ban .big small{opacity:1;color:var(--sdk-gray)}
.ban .bb{color:var(--sdk-grayDark1);background:#fff;border:1px solid var(--sdk-grayLight1)}
.ban .bb:hover,.ban .bb.open{background:var(--sdk-grayLight2);color:var(--sdk-grayDark1);border-color:var(--sdk-grayLight1)}
.ban .clock{color:var(--sdk-redDark1);background:#fff;border:1px solid var(--sdk-grayLight1)}
.jumpc input{border:1px solid var(--sdk-grayLight1)}
.dayh{color:var(--sdk-grayDark1);box-shadow:0 1px 0 var(--sdk-grayLight1),0 -1px 0 var(--sdk-grayLight1)}
.dayh .ds{color:var(--sdk-gray)}
.win,.win .wg,.win .wpanel{background:#fff}
.win{border-bottom:1px solid var(--sdk-grayLight1)}
.win .wg.over{border-bottom:1px solid var(--sdk-grayLight1)}
.wh b{color:var(--sdk-grayDark1)} .wh span,.wh .rg,.wfr{color:var(--sdk-grayDark1)}
.wfb,.lnk{color:var(--sdk-grayDark1);border-color:var(--sdk-grayLight1)}
.wc{border-color:var(--sdk-grayLight1)}
.wc .tg{color:var(--sdk-grayDark1)!important}
.wc.now .nm::before{color:var(--sdk-redDark1)}
.cols{border-bottom:1px solid var(--sdk-grayLight1)}
.cols>div,.col{border-inline-start-color:var(--sdk-grayLight2)}
.axis{background:#fff;border-inline-end:1px solid var(--sdk-grayLight2)}
.hl{border-top-color:var(--sdk-grayLight2)} .hl.half{border-top:1px dotted var(--sdk-grayLight2)}
.alld,.cmp,.cmp span{background:color-mix(in srgb,var(--sdk-grayLight2) 50%,#fff)}
.col.cz{background:color-mix(in srgb,var(--c) 7%,#fff)}
.cols>div.cz{background:color-mix(in srgb,var(--c) 10%,#fff)}
.ev{border:1px solid rgba(0,0,0,.06);border-inline-start:4px solid}
.ev small{color:var(--sdk-grayDark1)}
.ev.mag,.ev .lens{background:var(--tint)}
.ev .lens{box-shadow:inset 0 0 0 1px var(--sdk-redLight1)}
.ev b.pinned{background:var(--tint)}
/* lodging = purple (SDK purpleLight2 fill, purpleDark1 line) */
.lbar{background:var(--sdk-purpleLight2);border:1.5px solid var(--sdk-purpleDark1);border-inline-start-width:4px}
.lseg .lsl{border-top:1.5px dashed var(--sdk-purpleDark1)}
.lseg .stk .lh{color:var(--sdk-purpleDark1)}
.lseg .stk .lc{background:var(--sdk-purpleDark1);color:#fff}
.lseg .stk .lg{color:var(--sdk-grayDark1)}
.lseg .stk .lg.new{color:var(--sdk-greenDark1)}
.lseg .stk.pinned{background:var(--sdk-purpleLight2)}
.lm.in{background:var(--sdk-greenLight2);color:var(--sdk-grayDark1)}
.lm.out{background:var(--sdk-grayLight2);color:var(--sdk-grayDark1)}
/* the ONLY accent: now line + cross-section */
.band{background:color-mix(in srgb,var(--sdk-redDark1) 4.5%,transparent);border-top:1px solid var(--sdk-redLight1);border-bottom:1px solid var(--sdk-redLight1)}
.bl,.tnow{background:var(--sdk-redDark1);color:#fff}
.nowl{border-top-color:var(--sdk-redDark1)} .nowl span{background:var(--sdk-redDark1)}
.toast{background:var(--sdk-grayDark1)} .toast.undo .ubar{background:var(--sdk-grayLight1)}
.vp{scrollbar-color:var(--sdk-grayLight1) #fff} .vp::-webkit-scrollbar-track{background:#fff} .vp::-webkit-scrollbar-thumb{background:var(--sdk-grayLight1);border-color:#fff}
/* v0.2.3: the lens owns the card head when the band reaches the title → the title shows once */
.ev.lenshead>b,.ev.lenshead>.evt,.ev.lenshead>small{visibility:hidden}
.ev .lens.head{box-shadow:inset 0 0 0 1px var(--sdk-redLight1),0 2px 6px -2px rgba(0,0,0,.18)}
/* v0.2.3: neutral hover on every control (palette B: tint grayLight2, border grayLight1) */
.dd>button:hover,.dd.res>button:hover,.dd.f.act>button:hover,.tog:hover,.wfb:hover,.lnk:not(.on):hover,.jumpc button:hover{background:var(--sdk-grayLight2);border-color:var(--sdk-grayLight1)}
/* ===== v0.2.4: cross-section window IN the flow — opening slides the headers + grid down (never covers them) ===== */
.tl{--wcH:24px}
.tl .win,.tl.nox .win,.tl.wempty .win{display:flex;height:auto!important;min-height:0;overflow:hidden;flex:none;padding-bottom:6px}
.win .wslide{display:grid;grid-template-rows:1fr;transition:grid-template-rows .22s ease}
.tl.nox .win .wslide{grid-template-rows:0fr}
.win .wslide>.wg,.tl.wempty .win .wslide>.wg{display:grid;position:static;z-index:auto;min-height:0;overflow:hidden;margin:0;padding:0;box-shadow:none;border:0;grid-auto-rows:var(--wcH);gap:4px 6px;align-content:start}
.win.off .wg{visibility:visible}
.tl.nox .win .wslide>.wg{visibility:hidden;transition:visibility 0s .22s}
.wh{margin-bottom:4px}
/* pills: title + table only, 20% smaller text, tighter */
.wc{gap:6px;padding:2px 7px;border-radius:6px;border-inline-start-width:4px;min-height:0}
.wc .tg{font-size:9.2px;padding:0 5px;border-radius:3px}
.wc .nm{font-size:13.6px}
.wc.more{font-size:11.2px}
.wc.now .nm::before{font-size:9.6px}
/* table filter pills next to the toggle */
.wh .wpills{display:flex;align-items:center;gap:4px;min-width:0;overflow:hidden;flex:0 1 auto}
.wh .wpills .wpl{font-size:11px;color:var(--sdk-gray);font-weight:600;margin-inline-end:2px}
.wh .wp1{display:inline-flex;align-items:center;gap:4px;font-size:12px;line-height:18px;padding:0 7px;border-radius:10px;border:1px solid var(--sdk-grayLight1);background:#fff;color:var(--sdk-grayDark1);cursor:pointer;white-space:nowrap;user-select:none;flex:none}
.wh .wp1 i{width:7px;height:7px;border-radius:50%;background:var(--c);flex:none}
.wh .wp1.on{background:var(--f);border-color:color-mix(in srgb,var(--c) 45%,#fff)}
.wh .wp1.off{color:var(--sdk-gray);text-decoration:line-through}
.wh .wp1.off i{background:var(--sdk-grayLight1)}
.wh .wp1 .c{font-size:11px;color:var(--sdk-gray);text-decoration:none}
.wh .wp1:hover{border-color:var(--sdk-grayDark1)}
.wh .wall{font-size:11.5px;color:var(--sdk-grayDark1);text-decoration:underline;cursor:pointer;flex:none}
.tl.nox .wh .wpills{opacity:.45;pointer-events:none}
/* ===== v0.2.4b (the owner 09:16–09:18) ===== */
/* big day + time in the centre of the banner, crimson (SDK redDark1) */
.ban{justify-content:flex-start}
.ban .ctr{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:baseline;gap:12px;white-space:nowrap;pointer-events:none;color:var(--sdk-redDark1)}
.ban .ctr .big{font-size:26px;font-weight:800;line-height:1;color:var(--sdk-redDark1)}
.ban .ctr .clock{font-size:26px;font-weight:800;line-height:1;color:var(--sdk-redDark1);background:none;border:0;padding:0;border-radius:0}
.ban .ctr small{font-size:13px;font-weight:600;color:var(--sdk-gray)}
/* column header tabs: no dot (the 3px line shows the colour); ⠿ at the start edge (far right in RTL) */
.cols>div i{display:none}
.cols>div:not(.cz){padding-inline-start:18px}
.cols>div .hd2{position:absolute;inset-inline-start:2px;top:50%;transform:translateY(-50%)}
/* cross-section table pills: ✕ hides from the window, off ones collapse to the far left like strips */
.wh .wpills{flex:1 1 auto}
.wh .wp1 .x,.wh .wp1 .vdd{color:var(--sdk-gray);cursor:pointer;font-size:10.5px;line-height:1;padding:1px 2px;border-radius:3px;text-decoration:none}
.wh .wp1 .x:hover,.wh .wp1 .vdd:hover{color:var(--sdk-grayDark1);background:rgba(255,255,255,.7)}
.wh .wp1 .vdd b{font-size:10px;margin-inline-end:1px}
.wh .wp1.pk{box-shadow:inset 0 0 0 1px var(--sdk-grayDark1)}
.wh .woff{display:flex;gap:3px;margin-inline-start:auto;flex:none}
.wh .woff .wp1.off{font-size:10.5px;line-height:16px;padding:0 5px;border-radius:4px;border-style:dashed;background:#fff;text-decoration:none;color:var(--sdk-gray);border-inline-start:3px solid var(--c)}
.wh .woff .wp1.off .c{font-size:10px}
.vmenu{min-width:200px;max-height:320px;overflow:auto;z-index:60}
.vmenu .vh{display:block;font-size:11px;color:var(--sdk-gray);padding:4px 8px 6px;white-space:nowrap}
.vmenu .vi{display:flex;gap:6px;align-items:center}
.vmenu .vi .ck{width:14px;height:14px;border:1px solid var(--sdk-grayLight1);border-radius:3px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;flex:none}
.vmenu .vi.on .ck{background:var(--sdk-grayDark1);color:#fff;border-color:var(--sdk-grayDark1)}
/* ===== v0.2.5: per-column filter funnel (the owner 09:20) ===== */
.cols>div .cf2{display:inline-flex;align-items:center;gap:2px;color:var(--sdk-grayLight1);cursor:pointer;padding:1px 3px;border-radius:4px;flex:none;text-decoration:none;line-height:1}
.cols>div .cf2:hover{color:var(--sdk-grayDark1);background:var(--sdk-grayLight2)}
.cols>div .cf2.act{color:#fff;background:var(--sdk-grayDark1)}
.cols>div .cf2.act:hover{color:#fff;background:var(--sdk-gray)}
.cols>div .cf2 b{font-size:10.5px;font-weight:700}
.cols>div.cz .cf2,.cols>div.adonly .cf2{display:none}
.cfmenu{width:260px;max-height:420px;display:flex;flex-direction:column;overflow:hidden;padding:4px 0}
.cfmenu .cfd{display:flex;flex-wrap:wrap;gap:4px;padding:2px 8px 6px}
.cfmenu .cfd a{font-size:11.5px;padding:2px 7px;border:1px solid var(--sdk-grayLight1);border-radius:10px;color:var(--sdk-grayDark1);cursor:pointer;text-decoration:none;display:inline-flex;gap:3px;align-items:center}
.cfmenu .cfd a:hover{background:var(--sdk-grayLight2)}
.cfmenu .cfd a.on{background:var(--sdk-grayDark1);border-color:var(--sdk-grayDark1);color:#fff}
.cfmenu .cfd a b{font-size:10px}
.cfmenu .cfop{display:flex;gap:2px;margin:0 8px 6px;border:1px solid var(--sdk-grayLight1);border-radius:6px;overflow:hidden}
.cfmenu .cfop a{flex:1;text-align:center;font-size:11px;padding:2px 0;cursor:pointer;color:var(--sdk-gray);text-decoration:none}
.cfmenu .cfop a.on{background:var(--sdk-grayLight2);color:var(--sdk-grayDark1);font-weight:700}
.cfmenu .cfl{overflow:auto;flex:1 1 auto}
.cfmenu .vi .vt{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cfmenu .vi .n{color:var(--sdk-gray);font-size:11px}
.cfmenu .cfa{display:flex;gap:12px;padding:4px 10px 2px}
.cfmenu .cfa a{font-size:12px;color:var(--sdk-grayDark1);cursor:pointer;text-decoration:underline}
/* ===== v0.2.6: band = name only, magnified; vertical when crowded ===== */
.ev .lens{display:flex;padding:3px 5px;box-sizing:border-box;max-height:none}
.ev .lens small{display:none}
.ev .lens b.bn{margin:0;font-weight:800;line-height:1.18;color:var(--sdk-grayDark1);overflow:hidden;word-break:normal;overflow-wrap:normal;transform:none!important}
.ev .lens.hor b.bn{display:-webkit-box;-webkit-box-orient:vertical;width:100%}
.ev .lens.vert{justify-content:center;align-items:flex-start}
.ev .lens.vert b.bn{display:block;writing-mode:vertical-rl;text-orientation:mixed;max-height:100%;max-width:100%;white-space:normal}
.ev .lens.clip.hor b.bn{text-overflow:ellipsis}
.ev .lens.clip.vert b.bn{white-space:nowrap;text-overflow:ellipsis;height:100%}
/* v0.2.6: ⋯ + ✕ = one control group at the end edge (left in RTL) */
.cols>div .hgrp{position:absolute;left:4px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;gap:0;border:1px solid var(--sdk-grayLight2);border-radius:6px;background:#fff;height:20px;overflow:hidden;z-index:2}
.cols>div .hgrp .cm2,.cols>div .hgrp .cx{position:static;transform:none;height:20px;width:17px;padding:0;border-radius:0;display:inline-flex;align-items:center;justify-content:center;line-height:1}
.cols>div .hgrp .cx{border-inline-start:1px solid var(--sdk-grayLight2)}
.cols>div:not(.cz){padding-inline-end:41px;gap:4px}
.cols>div.adonly .hgrp .cm2{display:inline-flex}
/* v0.2.6 (the owner 10:41): IDENTICAL header build on every table — ⠿ · name · count · funnel · [⋯ ⇤ ✕]; nothing hidden, disabled = gray + tooltip */
.cols>div.adonly .hd2,.cols>div.adonly .cf2,.cols>div.adonly .cx,.cols>div.adonly .cm2{display:inline-flex}
.cols>div.adonly{justify-content:center;padding-inline-start:18px}
.cols>div .hgrp .cm2,.cols>div .hgrp .sh,.cols>div .hgrp .cx{position:static;transform:none;height:20px;width:16px;padding:0;border-radius:0;display:inline-flex;align-items:center;justify-content:center;line-height:1;font-size:12px;color:var(--sdk-gray);cursor:pointer;font-weight:700;text-decoration:none}
.cols>div .hgrp .cm2,.cols>div .hgrp .cx{border-inline-start:1px solid var(--sdk-grayLight2)}
.cols>div .hgrp .sh:hover,.cols>div .hgrp .cm2:hover{background:var(--sdk-grayLight2);color:var(--sdk-grayDark1)}
.cols>div:not(.cz){padding-inline-end:56px}
.cols>div .dis,.cols>div .dis:hover,.wh .wp1 .dis,.wh .wp1 .dis:hover{color:var(--sdk-grayLight1)!important;background:transparent!important;cursor:not-allowed}
.cols>div.cz .hgrp{display:none}
/* window pills: ▾ · ⇤ · ✕ in the same order/style; shrunk = narrow strip at the far left */
.wh .wp1 .sh{color:var(--sdk-gray);cursor:pointer;font-size:10.5px;line-height:1;padding:1px 2px;border-radius:3px;text-decoration:none}
.wh .wp1 .sh:hover{color:var(--sdk-grayDark1);background:rgba(255,255,255,.7)}
.wh .woff .wp1.off{padding:0 3px;gap:2px;max-width:44px;overflow:hidden;cursor:pointer}
.wh .woff .wp1.off .ab{font-weight:700}
/* v0.2.6: two-row header tab so 5 controls never starve the name — row 1: ⠿ · name · count; row 2: funnel … [⋯ ⇤ ✕] */
:root{--colh:48px}
.cols>div:not(.cz){align-items:flex-start;padding:5px 22px 0 6px;flex-wrap:nowrap}
.cols>div .hd2{top:5px;transform:none}
.cols>div:not(.cz) .cf2{position:absolute;bottom:4px;inset-inline-start:20px}
.cols>div:not(.cz) .hgrp{top:auto;bottom:3px;transform:none;left:4px}
.cols>div:not(.cz) .ldf{position:absolute;bottom:5px;right:40px;left:62px;transform:none;overflow:hidden;text-overflow:ellipsis;text-align:center;font-size:9.5px;padding:0 4px}
.cols>div.adonly{padding-inline-start:22px}
/* ---- v0.2.11 (the owner 17:01) ---- */
/* 1: the header ✕ shrinks to a strip (⇤ gone) */
.cols>div:not(.cz) .hgrp .sh{display:none}
/* 3: window cards half as wide (6 per row), 2-line title */
.tl{--wcH:40px}
.wg{grid-template-columns:repeat(6,minmax(0,1fr))}
.wc{align-items:flex-start;padding:3px 6px;gap:5px}
.wc .tg{font-size:9px;padding:0 4px;margin-top:2px}
.wc .nm{flex:0 1 auto;white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font-size:12.5px;line-height:1.22;word-break:break-word}
.wc.more{align-items:center}
/* 5: 👁 left of (= after, RTL) every title; hover shows it clearly */
.eye{flex:none;font-size:11px;line-height:1;cursor:pointer;opacity:.45;padding:1px 2px;border-radius:4px;user-select:none;filter:grayscale(1)}
.eye:hover{opacity:1;background:var(--sdk-grayLight2);filter:none}
.ev .evt{display:flex;align-items:flex-start;gap:3px;min-width:0}
.ev .evt>b{min-width:0;flex:0 1 auto}
.ev .evt .eye{margin-top:1px}
.chip{display:flex;align-items:center;gap:3px}
.chip .cn{min-width:0;flex:0 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hidn{font-size:12.5px;color:var(--sdk-grayDark1);background:var(--sdk-grayLight2);border-radius:10px;padding:2px 8px;white-space:nowrap}
/* 4: the window's own funnel at the far left of its row */
.wh .wf{order:99;margin-inline-start:auto;display:inline-flex;align-items:center;gap:3px;padding:3px 7px;border:1px solid var(--sdk-grayLight1);border-radius:7px;cursor:pointer;color:var(--sdk-grayDark1);background:#fff}
.wh .wf:hover{border-color:var(--teal);background:var(--teal-t)}
.wh .wf.act{color:var(--teal-d);border-color:var(--teal)}
.wh .wf b{font-size:11px;color:inherit}
.wfmenu{min-width:240px;max-height:70vh;overflow:auto}
.wfmenu .vh{display:block;padding:4px 10px 2px;color:var(--sdk-gray)}
.wfmenu .it{display:flex;align-items:center;gap:8px}
.wfmenu .it .ck{width:16px;height:16px;border:1.5px solid var(--sdk-gray);border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;color:#fff;flex:none}
.wfmenu .it.on .ck{background:var(--teal);border-color:var(--teal)}
.wfmenu .it.hidr .ck{color:var(--sdk-grayDark1);border-color:transparent}
.wfmenu .it i{width:10px;height:10px;border-radius:3px;flex:none}
.wfmenu .tog{display:flex;align-items:center;gap:8px;background:none}
.wfmenu .act{display:flex;justify-content:flex-end;padding:6px 10px}
.wfmenu .act span{color:var(--crd);font-weight:700;cursor:pointer;text-decoration:underline}
`;
