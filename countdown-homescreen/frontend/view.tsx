// Presentational Countdown screen (no Airtable imports) — used by index.tsx and by the local config-map harness.
// Look: mockup v4 layout (clock card + centred stacked pills) in the owner's v0.1.0 wave palette on cream (23:33/23:35).

import {CONFIG_DEFAULTS as D, WAVE_COLORS} from './config';
export {safeHex} from './config';
import type {ReactNode} from 'react';
import {formatCount} from './counts';

export type PillData = {
    key: string;
    label: string;
    value: number | null;
    /** v0.4.0: hover text describing the active fixed filter (right pane / Extension_Config). */
    filterTitle?: string | null;
    /** v0.4.0: small warning under the label when a filter was set but could not be applied. */
    hint?: string | null;
};

export type ViewProps = {
    title: string;
    clock: {days: number; hours: number; minutes: number};
    unitLabels: readonly [string, string, string];
    /** Hover text on the clock card: target slot name + time (or what's missing). */
    clockTitle: string;
    /** Shown under the clock only after the festival («הפסטיבל הסתיים»). */
    endedLine: string | null;
    programme: readonly PillData[];
    people: readonly PillData[];
    version: string;
    /** v0.4.1: Color_1 accent, Color_2 background, Color_3–7 wave (Extension_Config → code default). */
    colors?: ViewColors;
    /** Footer hover: where the settings come from. */
    configNote?: string;
    /** v0.4.5: shared «מצב חיבור» panel (right-pane toggle, default OFF); rendered under the footer. */
    statusPanel?: ReactNode;
};

export type ViewColors = {accent: string; bg: string; wave: readonly string[]};
export const DEFAULT_COLORS: ViewColors = {accent: D.Color_1, bg: D.Color_2, wave: WAVE_COLORS};

const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0');

export function CountdownView(p: ViewProps) {
    const nums = [pad2(p.clock.days), pad2(p.clock.hours), pad2(p.clock.minutes)];
    return (
        <div dir="rtl" className="cd-screen">
            <style>{makeCss(p.colors ?? DEFAULT_COLORS)}</style>
            <div className="cd-main">
                <div className="cd-title cd-wave" data-slot="Title">
                    {p.title}
                </div>
                <div className="cd-clock-card" title={p.clockTitle} data-slot="clock">
                    <div className="cd-clock cd-num">
                        {nums.map((n, i) => (
                            <ClockUnit key={i} i={i} n={n} label={p.unitLabels[i]} />
                        ))}
                    </div>
                    {p.endedLine && <div className="cd-ended">{p.endedLine}</div>}
                </div>
                <div className="cd-rows">
                    <div className="cd-row">
                        {p.programme.map(x => (
                            <Pill key={x.key} k={x.key} label={x.label} value={x.value} filterTitle={x.filterTitle} hint={x.hint} />
                        ))}
                    </div>
                    <div className="cd-row">
                        {p.people.map(x => (
                            <Pill key={x.key} k={x.key} label={x.label} value={x.value} filterTitle={x.filterTitle} hint={x.hint} />
                        ))}
                    </div>
                </div>
            </div>
            <div className="cd-footer">
                <span data-slot="version" title={p.configNote}>
                    v{p.version}
                </span>
            </div>
            {p.statusPanel}
        </div>
    );
}

/** Pill line: the exact missing piece («השדה «X» לא מופעל לאלמנט», «הטבלה T לא מופעלת…»), else a generic note. */
export function shortHint(hint: string): string {
    const first = hint.split(' · ')[0].split(' — ')[0].replace(/ בטבלה [^ ]+$/, '');
    return /לא מופעל|לא מאופשר|לא נמצא|חסר|לא נבחר|לא מוכר/.test(first) ? first : 'סינון לא הופעל';
}

function ClockUnit({i, n, label}: {i: number; n: string; label: string}) {
    return (
        <>
            {i > 0 && <div className="cd-colon">:</div>}
            <div className="cd-unit" data-u={i}>
                <div className="cd-n cd-wave" style={{animationDelay: `${-i * 1.2}s`}}>
                    {n}
                </div>
                <div className="cd-lbl">{label}</div>
            </div>
        </>
    );
}

function Pill({k, label, value, filterTitle, hint}: Omit<PillData, 'key'> & {k: string}) {
    const title = [filterTitle && `מסונן: ${filterTitle}`, hint].filter(Boolean).join('\n') || undefined;
    return (
        <div className="cd-pill" data-k={k} title={title}>
            <div className="cd-x cd-num">{formatCount(value)}</div>
            <div className="cd-plabel">{label}</div>
            {hint && <div className="cd-hint">⚠ {shortHint(hint)}</div>}
        </div>
    );
}

const INK = '#2f2f2f';
const MUT = '#6f6a62';
const LINE = '#e9e3d8';

// Font + radii + LTR/tabular digits from SHARED-UI-TOKENS.css; colours from the v0.1.0 wave palette (not crimson).
function makeCss(c: ViewColors): string {
    const wave = c.wave.length ? c.wave : WAVE_COLORS;
    const WAVE = [...wave, wave[0]].join(', ');
    const ACCENT = c.accent;
    const BG = c.bg;
    return `
.cd-screen { box-sizing:border-box; position:relative; min-height:100vh; padding:24px 28px 12px; margin:0 auto; max-width:1180px;
  display:flex; flex-direction:column; text-align:center; color:${INK}; background:${BG};
  font-family:"Segoe UI", Heebo, Rubik, "Open Sans", sans-serif; }
.cd-screen * { box-sizing:border-box; }
.cd-main { flex:0 0 auto; margin:auto 0; }
.cd-num { direction:ltr; unicode-bidi:isolate; font-variant-numeric:tabular-nums; }

/* v0.1.0 wave: moving multicolour gradient, 9s. A thin dark edge keeps the light hues readable on cream. */
.cd-wave { background:linear-gradient(90deg, ${WAVE}); background-size:300% 100%;
  -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:${INK};
  animation:cd-wave 9s linear infinite; filter:drop-shadow(0 1px 0 rgba(47,47,47,.30)); }
@keyframes cd-wave { to { background-position:300% 0; } }
@media (prefers-reduced-motion: reduce) { .cd-wave { animation-play-state:paused; } .cd-pill { transition:none; } }

.cd-title { display:inline-block; font-size:42px; font-weight:800; letter-spacing:.3px; }

.cd-clock-card { position:relative; margin:20px auto 0; padding:30px 34px 24px; max-width:880px; background:#fff;
  border:1px solid ${LINE}; border-radius:12px; overflow:hidden; }
.cd-clock { display:flex; justify-content:center; align-items:flex-start; gap:22px; }
.cd-unit { min-width:176px; }
.cd-n { display:inline-block; font-size:140px; line-height:1; font-weight:700; letter-spacing:1px; }
.cd-lbl { direction:rtl; margin-top:8px; font-size:21px; color:${MUT}; }
.cd-colon { font-size:110px; line-height:1.1; color:${LINE}; font-weight:300; }
.cd-ended { margin-top:10px; font-size:20px; font-weight:600; color:${MUT}; }

.cd-rows { margin:68px auto 0; width:100%; }
.cd-row { display:flex; justify-content:center; flex-wrap:wrap; gap:20px; }
.cd-row + .cd-row { margin-top:18px; }
.cd-pill { width:224px; padding:14px 22px 16px; border-radius:999px; background:#fff; border:1px solid ${LINE};
  display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:0; cursor:default;
  transition:transform .15s, box-shadow .15s, border-color .15s; }
.cd-x { font-size:46px; line-height:1.05; font-weight:700; color:${INK}; white-space:nowrap; }
.cd-plabel { margin-top:3px; font-size:16.5px; color:${MUT}; font-weight:600; white-space:nowrap; }
.cd-hint { margin-top:2px; max-width:190px; font-size:11px; line-height:1.25; color:#a8452f; white-space:normal; }
.cd-pill:hover, .cd-pill.demo-hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(106,171,184,.18); border-color:${ACCENT}; }
.cd-pill:hover .cd-plabel, .cd-pill.demo-hover .cd-plabel { color:#3f7f8c; }
.cd-footer { padding-top:14px; font-size:11px; color:${MUT}; direction:ltr; }
.cd-footer > span { opacity:.7; }

@media (max-width: 980px) {
  .cd-n { font-size:92px; } .cd-colon { font-size:72px; } .cd-unit { min-width:124px; }
  .cd-clock-card { max-width:720px; padding:24px 24px 20px; }
  .cd-pill { width:196px; padding:12px 18px 14px; } .cd-x { font-size:38px; } .cd-plabel { font-size:15.5px; }
  .cd-row { gap:16px; }
}
@media (max-width: 560px) {
  .cd-n { font-size:56px; } .cd-colon { font-size:44px; } .cd-unit { min-width:70px; } .cd-clock { gap:10px; }
  .cd-title { font-size:32px; }
}
`;
}
