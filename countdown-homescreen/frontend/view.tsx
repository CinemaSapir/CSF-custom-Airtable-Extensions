// Presentational Countdown screen (no Airtable imports) — used by index.tsx and by the local config-map harness.
// Look: mockup v4 layout (clock card + centred stacked pills) in the owner's v0.1.0 wave palette on cream (23:33/23:35).

import {CONFIG_DEFAULTS as D, WAVE_COLORS} from './config';
export {safeHex} from './config';
import {useState} from 'react';
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
    /** v0.4.3 «מצב חיבור» panel (open by default in edit mode; else click the version footer). */
    diag?: DiagData;
};

export type DiagPill = {
    key: string;
    label: string;
    table: string | null;
    field: string | null;
    via: string;
    op: string;
    values: string[];
    matched: number | null;
    total: number | null;
};
export type DiagData = {
    editMode: boolean;
    config: {
        found: boolean;
        via: 'pane' | 'name' | 'none';
        tableName: string | null;
        hiddenInBase: boolean;
        status: string;
        rowCount: number | null;
        matched: string | null;
        extensionValues: string[];
        missingFields: string[];
        visibleFields: string[];
        title: string;
        error: string | null;
    };
    tables: {visible: string[]; hidden: string[]};
    pills: DiagPill[];
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
                {p.diag && <DiagToggle diag={p.diag} />}
            </div>
        </div>
    );
}

/** Pill line: the exact missing piece («השדה «X» לא מופעל לאלמנט», «הטבלה T לא מופעלת…»), else a generic note. */
export function shortHint(hint: string): string {
    const first = hint.split(' · ')[0].split(' — ')[0].replace(/ בטבלה [^ ]+$/, '');
    return /לא מופעל|לא מאופשר|לא נמצא|חסר|לא נבחר|לא מוכר/.test(first) ? first : 'סינון לא הופעל';
}

const YN = (b: boolean) => (b ? '✓' : '✗');

function DiagToggle({diag}: {diag: DiagData}) {
    const [open, setOpen] = useState<boolean | null>(null);
    const isOpen = open ?? diag.editMode;
    const c = diag.config;
    const okAll = c.found && !!c.matched && diag.pills.every(x => !x.via.includes('✗'));
    return (
        <>
            {' · '}
            <button type="button" className="cd-diag-btn" onClick={() => setOpen(!isOpen)} data-slot="diag">
                מצב חיבור {okAll ? '✓' : '⚠'} {isOpen ? '▴' : '▾'}
            </button>
            {isOpen && (
                <div className="cd-diag" dir="rtl">
                    <div className="cd-diag-h">מצב חיבור · Extension_Config</div>
                    <div>
                        טבלת הגדרות: <b>{YN(c.found)}</b> {c.tableName ? <code>{c.tableName}</code> : null}{' '}
                        {c.found ? `(נמצאה ${c.via === 'pane' ? 'מהחלונית' : 'לפי שם'})` : c.hiddenInBase ? '— קיימת בבסיס אבל לא מופעלת לאלמנט' : '— לא נמצאה באלמנט'}
                    </div>
                    {c.found && (
                        <div>
                            שורה תואמת: <b>{YN(!!c.matched)}</b> {c.matched ? <code>Extension = {c.matched}</code> : null} · סטטוס <code>{c.status}</code> ·
                            שורות בטבלה: {c.rowCount ?? '…'}
                            {!c.matched && c.extensionValues.length > 0 && (
                                <>
                                    {' '}
                                    · ערכי Extension שנמצאו: <code>{c.extensionValues.map(v => `«${v}»`).join(' ')}</code>
                                </>
                            )}
                        </div>
                    )}
                    {c.found && (
                        <div>
                            כותרת בפועל: <code>{c.title}</code> · שדות גלויים לאלמנט: {c.visibleFields.length}
                            {c.missingFields.length > 0 && (
                                <>
                                    {' '}
                                    · <span className="cd-diag-bad">שדות לא מופעלים ({c.missingFields.length}):</span> <code>{compactMissing(c.missingFields)}</code>
                                </>
                            )}
                        </div>
                    )}
                    {c.error && (
                        <div className="cd-diag-bad">
                            שגיאה בקריאת ההגדרות (מוצגות ברירות מחדל, ניסיון חוזר בעוד 5 ש׳): <code>{c.error}</code>
                        </div>
                    )}
                    <div className="cd-diag-h">סינון אריחים (חלונית ימנית)</div>
                    <table className="cd-diag-t">
                        <thead>
                            <tr>
                                <th>אריח</th>
                                <th>טבלה</th>
                                <th>שדה</th>
                                <th>מקור</th>
                                <th>תנאי</th>
                                <th>ערכים</th>
                                <th>תואמות / סה״כ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {diag.pills.map(x => (
                                <tr key={x.key} data-k={x.key}>
                                    <td>{x.label}</td>
                                    <td>
                                        <code>{x.table ?? '—'}</code>
                                    </td>
                                    <td>
                                        <code>{x.field ?? '—'}</code>
                                    </td>
                                    <td className={x.via.includes('✗') || x.via.startsWith('שגיאה') ? 'cd-diag-bad' : ''}>{x.via}</td>
                                    <td>{x.op}</td>
                                    <td>
                                        <code>{x.values.length ? x.values.join(' | ') : '—'}</code>
                                    </td>
                                    <td className="cd-num">
                                        {x.matched ?? '—'} / {x.total ?? '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="cd-diag-small">
                        טבלאות גלויות לאלמנט: <code>{diag.tables.visible.join(' · ') || '—'}</code>
                        {diag.tables.hidden.length > 0 && (
                            <>
                                {' '}
                                · <span className="cd-diag-bad">בבסיס אך לא מופעלות:</span> <code>{diag.tables.hidden.join(' · ')}</code>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

/** Filter_1..10 / Filter_Operator_… / Filter_Value_… collapsed so the line stays readable. */
function compactMissing(names: string[]): string {
    const groups = new Map<string, number[]>();
    const rest: string[] = [];
    for (const n of names) {
        const m = /^(.*)_(\d+)$/.exec(n);
        if (m) {
            if (!groups.has(m[1])) groups.set(m[1], []);
            groups.get(m[1])!.push(Number(m[2]));
        } else rest.push(n);
    }
    const g = [...groups].map(([k, ns]) => (ns.length === 1 ? `${k}_${ns[0]}` : `${k}_${Math.min(...ns)}–${Math.max(...ns)}${ns.length < Math.max(...ns) - Math.min(...ns) + 1 ? '*' : ''}`));
    return [...rest, ...g].join(', ');
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
.cd-diag-btn { font:inherit; font-size:11px; color:${MUT}; background:none; border:0; padding:0 2px; cursor:pointer; text-decoration:underline dotted; opacity:.8; }
.cd-diag { direction:rtl; text-align:right; margin:8px auto 0; max-width:1100px; background:#fff; border:1px solid ${LINE}; border-radius:10px;
  padding:10px 14px; font-size:12.5px; line-height:1.55; color:${INK}; }
.cd-diag code { direction:ltr; unicode-bidi:isolate; font:11.5px Consolas,"DejaVu Sans Mono",monospace; background:#f6f3ee; border-radius:4px; padding:0 4px; }
.cd-diag-h { font-weight:700; margin:6px 0 2px; }
.cd-diag-bad { color:#a8452f; font-weight:600; }
.cd-diag-small { margin-top:6px; font-size:11.5px; color:${MUT}; }
.cd-diag-t { border-collapse:collapse; width:100%; margin-top:2px; }
.cd-diag-t th, .cd-diag-t td { border-bottom:1px solid ${LINE}; padding:3px 6px; text-align:right; vertical-align:top; }
.cd-diag-t th { font-weight:600; color:${MUT}; font-size:11.5px; }

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
