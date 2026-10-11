/**
 * «טיימליין אופקי» — the CSF Days timeline, HORIZONTAL right-to-left (v0.1.0, mockup H-timeline 2026-10-10).
 * Rows = tables (sticky row headers on the right), time runs right → left. Same props as the vertical Timeline,
 * same logic modules (core / edit); only the layout is new (logic/hcore.ts). Pure UI: no SDK imports.
 */
import {Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {
    DAY_MIN,
    colourOf,
    fillOf,
    lineOf,
    sdkVars,
    type HexOf,
    anyFilter,
    xsPlan,
    keptCompress,
    wheelPx,
    winGridRows,
    winPass,
    winPills,
    passPicked,
    toggleIn,
    normalizeOff,
    dayOf,
    NO_DAY,
    emptyFilters,
    fmt,
    axisTicks,
    jumpFrom,
    nowLineM,
    nowTarget2,
    openTarget,
    nowTarget,
    overlaps,
    passes,
    phase,
    pxPerHour,
    windowHits,
    yOf,
    mOf,
    type Day,
    type FacetKey,
    type FilterState,
    type Item,
    type ResStep,
    type Seg,
} from './logic/core';
import {HW, LANE, LODGE_HEAD, LODGE_ROW, TEXT_MIN, barH, crowdedIn, dayPillU, hAxis, hLens, hLiveCounts, hRowStates, resizeLane, rowDropTarget, rowLayout, scrollLeftFor, slOf, stickyU, type HRow, type Measure, hDayTitle, placeLabel, showNowTag, hhmm, ghostClash, hallLabelPos} from './logic/hcore';
import {OP_HE, hColCount, hColDims, hEffectiveCF, hNormalizeCF, hPassCol, hSetOp, hToggleVal, noVals, type HColFilters, type HOp} from './logic/hfilter';
import {CSS} from './styles';
import {HCSS} from './hstyles';
import {CreatePopover, UndoToast, type CreateReq, type Writer} from './EditUi';
import {canEdit, dragRange, dropColumn, moveColumn, moveRange, planFields, resizeEnd, slotChoices, specOf, unitOf, type MoveTo, type Op} from './logic/edit';

export type ColumnDef = {key: string; label: string; color: string; available: boolean};
export type TimelineTexts = {[k: string]: string};
export type TimelineProps = {
    days: Day[];
    items: Item[];
    columns: ColumnDef[];
    hiddenJunk: number;
    notices: string[];
    texts: TimelineTexts;
    res: {steps: ResStep[]; def: number; label: string};
    toggles: {collapse: {label: string; def: boolean}; compress: {label: string; def: boolean}; xs: {def: boolean}; link: {def: boolean}};
    facetLabels: {[K in FacetKey]: string};
    quickTimes: Array<{value: string; label: string}>;
    lodge: {in: string; out: string};
    numbers: {bandFrac: number; maxCards: number; strip: number; festLen: number};
    phaseColors: {fest: string; prep: string; wrap: string};
    colorHex?: HexOf;
    tableFilters?: {[t: string]: {field: string; options: string[]}};
    colDefaults?: HColFilters;
    /** v0.1.2: per table, the configured filter fields (funnel order; right pane / Filter_N / defaults) */
    filterFields?: {[t: string]: string[]};
    version: string;
    configNote: string;
    userKey: string;
    demo?: boolean;
    initial?: {t?: number; nowMs?: number; wOpen?: boolean; open?: string; atNow?: boolean};
    onOpenRecord?: (table: string, id: string) => string | null | void;
    festivalDates?: string[];
    writer?: Writer;
    dayIdByDate?: {[date: string]: string};
    /** 👁-hidden record count → the «מצב חיבור» panel */
    onHiddenCount?: (n: number) => void;
};

type Persist = {
    res?: number;
    collapse?: boolean;
    compress?: boolean;
    compressUser?: boolean;
    xs?: boolean;
    shown?: string[];
    closed?: string[];
    order?: string[];
    laneH?: {[t: string]: number};
    wOff?: string[];
    wHide?: string[];
    wPick?: {[t: string]: string[]};
    colF?: HColFilters;
    /** v0.1.2 persist schema: below 2 → the view defaults (12 h, all tables ON, collapse empty tables + hours) apply again */
    v?: number;
    hid?: string[];
    wNow?: boolean;
    wNoCancel?: boolean;
};
const LS = 'csf.timelineH.v1.';
export const PERSIST_V = 2;
/** v0.1.2 (the owner 05:20 #3/#5/#6): saved view choices from v0.1.0/v0.1.1 are dropped once so the new defaults show —
 *  span 12 h, every table ON, collapse empty tables + empty hours, nothing shrunk in the window. Order, row heights, 👁, funnels stay. */
export function persistUpgrade(v: Persist): Persist {
    if (v.v === PERSIST_V) return v;
    const keep: Persist = {order: v.order, laneH: v.laneH, colF: v.colF, hid: v.hid, wPick: v.wPick, v: PERSIST_V};
    return keep;
}
function loadPersist(key: string): Persist {
    try {
        const v = JSON.parse(localStorage.getItem(LS + key) || '{}');
        if (!v || typeof v !== 'object') return {};
        return persistUpgrade(v as Persist);
    } catch {
        return {};
    }
}
function savePersist(key: string, p: Persist) {
    try {
        localStorage.setItem(LS + key, JSON.stringify(p));
    } catch {
        /* storage blocked → per-session only */
    }
}
/** cross-section cards per row (vertical v0.2.11: 6, half-width, 2-line title) */
/** v0.1.2 #1: every card is rendered (the window scrolls); a hard cap only against huge lists */
export const WIN_MAX = 400;
export const WIN_COLS = 8; // v0.1.2 #4: cards ≥30% smaller → 8 per row (was 6)
const Rng = ({a, b}: {a: number; b: number}) => <bdi dir="ltr">{`${fmt(a)}–${fmt(b)}`}</bdi>;
const FF = '"Segoe UI",Heebo,Rubik,"Open Sans",sans-serif';
function useMeasure(): Measure {
    return useMemo(() => {
        const cv = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
        const cache = new Map<string, number>();
        return (s: string, fs: number, bold = true) => {
            const k = `${bold ? 7 : 4}|${fs}|${s}`;
            let w = cache.get(k);
            if (w === undefined) {
                if (cv) {
                    cv.font = `${bold ? 700 : 400} ${fs}px ${FF}`;
                    w = cv.measureText(s).width;
                } else w = s.length * fs * 0.58;
                cache.set(k, w);
            }
            return w;
        };
    }, []);
}
/** 👁 = hide this record (per user); «נקה» brings them back */
function Eye(p: {id: string; name: string; onHide: (id: string) => void}) {
    return (
        <a
            className="eye"
            role="button"
            title={`הסתרת «${p.name}» (רק אצלך · «נקה» מחזיר)`}
            aria-label={`הסתרת ${p.name}`}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
                e.stopPropagation();
                p.onHide(p.id);
            }}
        >
            👁
        </a>
    );
}

export function HTimeline(p: TimelineProps) {
    const T = p.texts;
    const allT = useMemo(() => p.columns.filter(c => c.available).map(c => c.key), [p.columns]);
    const COL = useMemo(() => Object.fromEntries(p.columns.map(c => [c.key, c])), [p.columns]);
    const HE = (t: string) => COL[t]?.label ?? t;
    const hexOf: HexOf = p.colorHex ?? (() => null);
    const C = (t: string) => lineOf(COL[t]?.color || '', hexOf);
    const FILL = (t: string) => fillOf(COL[t]?.color || '', hexOf);
    const phaseBg = (k: 'fest' | 'prep' | 'wrap') => colourOf(p.phaseColors[k], hexOf, {fest: 'grayLight2', prep: 'cyanLight2', wrap: 'yellowLight2'}[k]);
    const saved = useMemo(() => loadPersist(p.userKey), [p.userKey]);
    const measure = useMeasure();

    const [res, setRes] = useState(() => (p.res.steps.some(s => s.min === saved.res) ? (saved.res as number) : p.res.def));
    const [collapseC, setCollapseC] = useState(() => (typeof saved.collapse === 'boolean' ? saved.collapse : p.toggles.collapse.def));
    const [compressT, setCompressT] = useState(() => keptCompress(saved, p.toggles.compress.def));
    const [compressUser, setCompressUser] = useState(() => saved.compressUser === true);
    const [xs, setXs] = useState(() => (typeof saved.xs === 'boolean' ? saved.xs : p.toggles.xs.def));
    const [shown, setShown] = useState<Set<string>>(() => new Set(saved.shown?.filter(t => allT.includes(t)).length ? saved.shown.filter(t => allT.includes(t)) : allT));
    const [closed, setClosed] = useState<Set<string>>(() => new Set(saved.closed ?? []));
    const [forceOpen, setForceOpen] = useState<Set<string>>(() => new Set());
    const [laneH, setLaneH] = useState<{[t: string]: number}>(() => Object.fromEntries(Object.entries(saved.laneH ?? {}).filter(([t, v]) => allT.includes(t) && typeof v === 'number')));
    const [hid, setHid] = useState<Set<string>>(() => new Set((saved.hid ?? []).filter(x => typeof x === 'string')));
    const [wNow, setWNow] = useState<boolean>(() => saved.wNow === true);
    const [wNoCancel, setWNoCancel] = useState<boolean>(() => saved.wNoCancel === true);
    const rootRef = useRef<HTMLDivElement>(null);
    const sdkCss = JSON.stringify(sdkVars(p.colorHex ?? (() => null)));
    useLayoutEffect(() => {
        const v = JSON.parse(sdkCss) as {[k: string]: string};
        for (const n in v) document.documentElement.style.setProperty(n, v[n]);
    }, [sdkCss]);
    // lens names: measure the real text and shrink until it fits (min 9px), only then the ellipsis (full name on hover)
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        for (const n of root.querySelectorAll<HTMLElement>('.hlens .bn')) {
            const lens = n.parentElement as HTMLElement;
            lens.classList.toggle('clip', n.dataset.clip === '1');
            let fs = parseFloat(n.style.fontSize) || 14;
            const over = () => n.scrollWidth > n.clientWidth + 1;
            while (over() && fs > 9) {
                fs -= 0.5;
                n.style.fontSize = fs + 'px';
            }
            n.dataset.fit = String(fs);
            if (over()) lens.classList.add('clip');
        }
    });
    const [order, setOrder] = useState<string[]>(() => {
        const o = (saved.order ?? []).filter(t => allT.includes(t));
        return [...o, ...allT.filter(t => !o.includes(t))];
    });
    const [F] = useState<FilterState>(emptyFilters);
    const [qIn, setQIn] = useState('');
    const [q, setQ] = useState('');
    const [wOff, setWOff] = useState<Set<string>>(() => normalizeOff(saved.wOff, allT));
    const [wHide, setWHide] = useState<Set<string>>(() => normalizeOff(saved.wHide, allT));
    const [wPick, setWPick] = useState<{[t: string]: string[]}>(() =>
        Object.fromEntries(Object.entries(saved.wPick && typeof saved.wPick === 'object' ? saved.wPick : {}).filter(([t, v]) => allT.includes(t) && Array.isArray(v) && v.length).map(([t, v]) => [t, (v as unknown[]).filter((x): x is string => typeof x === 'string')])),
    );
    const [colF, setColF] = useState<HColFilters>(() => hNormalizeCF(saved.colF, allT));
    const [cfDim, setCfDim] = useState<{[t: string]: string}>({});
    const CF = useMemo(() => hEffectiveCF(colF, p.colDefaults ?? {}, allT), [colF, p.colDefaults, allT]);
    const [cfTxt, setCfTxt] = useState('');
    const [pickAt, setPickAt] = useState<{x: number; y: number}>({x: 0, y: 0});
    const [openDd, setOpenDd] = useState<string | null>(p.initial?.open ?? null);
    const [toast, setToast] = useState<string | null>(null);
    const [nowMs, setNowMs] = useState(() => p.initial?.nowMs ?? Date.now());
    useEffect(() => {
        if (p.initial?.nowMs !== undefined) return;
        const id = setInterval(() => setNowMs(Date.now()), 30e3);
        return () => clearInterval(id);
    }, [p.initial?.nowMs]);
    const nowM = nowLineM(p.days, nowMs);
    const [sl, setSl] = useState(0);
    const [vpW, setVpW] = useState(1200);
    const [sbH, setSbH] = useState(0);
    const W = Math.max(200, vpW - HW);
    const vpRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const pendingGo = useRef<number | null>(p.initial?.t ?? null);
    const curT = useRef<number>(
        p.initial?.t ??
            (p.initial?.atNow
                ? nowTarget(p.days, p.initial?.nowMs ?? Date.now()).m
                : openTarget(
                      p.days,
                      p.festivalDates ?? [],
                      p.items.filter(i => i.s !== null && shown.has(i.table)).map(i => i.s as number),
                      res / 60,
                  ).m),
    );
    const segsRef = useRef<Seg[]>([]);
    const progX = useRef<number | null>(null);
    const lastSegs = useRef<Seg[] | null>(null);
    const userScrolled = useRef(false);

    useEffect(() => {
        savePersist(p.userKey, {v: PERSIST_V, res, collapse: collapseC, compress: compressT, compressUser, xs, shown: [...shown], closed: [...closed], order, laneH, wOff: [...wOff], wHide: [...wHide], wPick, colF, hid: [...hid], wNow, wNoCancel});
    }, [p.userKey, res, collapseC, compressT, compressUser, xs, shown, closed, order, laneH, wOff, wHide, wPick, colF, hid, wNow, wNoCancel]);
    useEffect(() => {
        const id = setTimeout(() => setQ(qIn.trim()), 250);
        return () => clearTimeout(id);
    }, [qIn]);
    useEffect(() => {
        if (!toast) return;
        const id = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(id);
    }, [toast]);
    useEffect(() => {
        const h = (e: MouseEvent) => {
            const el = e.target as HTMLElement;
            if (!el.closest('.dd') && !el.closest('.jp') && !el.closest('.hmenu') && !el.closest('[data-cm]')) setOpenDd(null);
        };
        document.addEventListener('click', h);
        return () => document.removeEventListener('click', h);
    }, []);

    // ------------------------------------------------ data
    const label = useCallback((t: string) => HE(t), [COL]); // eslint-disable-line react-hooks/exhaustive-deps
    const [pend, setPend] = useState<{[id: string]: {s: number; e: number}}>({});
    const [live, setLive] = useState<{id: string; s: number; e: number} | null>(null);
    useEffect(() => setPend({}), [p.items]);
    const items = useMemo(
        () =>
            p.items
                .filter(i => allT.includes(i.table))
                .map(i => {
                    const o = live && live.id === i.id ? live : pend[i.id];
                    return o && i.s !== null ? {...i, s: o.s, e: o.e} : i;
                }),
        [p.items, allT, pend, live],
    );
    const hiddenN = useMemo(() => items.filter(i => hid.has(i.id)).length, [items, hid]);
    const {onHiddenCount} = p;
    useEffect(() => onHiddenCount?.(hiddenN), [hiddenN, onHiddenCount]);
    const hideRec = (id: string) => setHid(s => new Set([...s, id]));
    const unhideRec = (id: string) => setHid(s => new Set([...s].filter(x => x !== id)));
    const [ghost, setGhost] = useState<{t: string; a: number; b: number} | null>(null);
    // v0.1.4 (critic #1/#3, Cushion pattern): hovering a faded (too long) name shows it in full and dims only the neighbour it covers
    const [hov, setHov] = useState<{t: string; id: string; top: number; a: number; z: number} | null>(null);
    const [pop, setPop] = useState<CreateReq | null>(null);
    const [popErr, setPopErr] = useState<string | null>(null);
    const [popBusy, setPopBusy] = useState(false);
    const [undo, setUndo] = useState<{key: number; text: string; run: () => void} | null>(null);
    const [rowDrag, setRowDrag] = useState<{t: string; x: number; y: number; before: string | null; lineY: number | null} | null>(null);
    const [menuAt, setMenuAt] = useState({x: 0, y: 0});
    const passQ = useCallback((i: Item) => passes(i, F, q, label(i.table)), [F, q, label]);
    const passT = useCallback((i: Item) => !hid.has(i.id) && passQ(i) && hPassCol(i, CF), [passQ, CF, hid]);
    const filtered = useMemo(() => items.filter(passT), [items, passT]);
    const timed = useMemo(() => filtered.filter(i => i.s !== null && i.e !== null), [filtered]);
    const tables = useMemo(() => order.filter(t => shown.has(t)), [order, shown]);
    const pxh = pxPerHour(W, res);
    const ax = useMemo(() => hAxis(p.days, timed, tables, {compress: compressT, pxh}), [p.days, timed, tables, compressT, pxh]);
    const segs = ax.segs;
    segsRef.current = segs;
    const uOf = useCallback((m: number) => yOf(segs, m), [segs]);
    const mAt = (u: number) => mOf(segsRef.current, u);

    // ------------------------------------------------ scroll / size
    useLayoutEffect(() => {
        const vp = vpRef.current;
        if (!vp) return;
        let lastW = vp.clientWidth;
        const measureVp = () => {
            if (vp.clientWidth !== lastW && lastW > 0) {
                const c = slOf(vp.scrollLeft) + (lastW - HW) / 2;
                vp.scrollLeft = scrollLeftFor(c - (vp.clientWidth - HW) / 2);
                progX.current = slOf(vp.scrollLeft);
            }
            lastW = vp.clientWidth;
            setVpW(vp.clientWidth);
            setSbH(vp.offsetHeight - vp.clientHeight);
        };
        const ro = new ResizeObserver(measureVp);
        ro.observe(vp);
        measureVp();
        return () => ro.disconnect();
    }, []);
    // the wheel moves through TIME (down = later = leftwards); over the row headers or with Shift it scrolls the rows
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const h = (e: WheelEvent) => {
            const vp = vpRef.current;
            const el = e.target as HTMLElement;
            if (!vp) return;
            // v0.1.2 #1: over the cross-section window the wheel scrolls ITS cards only (never the timeline / page)
            const win = el.closest('.win') as HTMLElement | null;
            if (win && !el.closest('.hmenu,.menu')) {
                const g = win.querySelector<HTMLElement>('.wg');
                if (g && g.scrollHeight > g.clientHeight) g.scrollTop += wheelPx(e.deltaY || e.deltaX, e.deltaMode, g.clientHeight);
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            const sc = el.closest('.menu,.wpanel,.cp,.hmenu,.jp') as HTMLElement | null;
            if (sc && sc.scrollHeight > sc.clientHeight) return;
            if (el.closest('.hrh') || e.shiftKey) {
                vp.scrollTop += wheelPx(e.deltaY || e.deltaX, e.deltaMode, vp.clientHeight);
                e.preventDefault();
                return;
            }
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                if (el.closest('.hvp')) return; // native sideways (trackpad)
                vp.scrollLeft += wheelPx(e.deltaX, e.deltaMode, vp.clientWidth);
            } else vp.scrollLeft -= wheelPx(e.deltaY, e.deltaMode, vp.clientWidth);
            e.preventDefault();
        };
        root.addEventListener('wheel', h, {passive: false});
        return () => root.removeEventListener('wheel', h);
    }, []);
    const goTo = useCallback(
        (m: number) => {
            pendingGo.current = m;
            curT.current = m;
            const vp = vpRef.current;
            if (!vp) return;
            vp.scrollLeft = scrollLeftFor(yOf(segs, m) - (vp.clientWidth - HW) / 2);
            progX.current = slOf(vp.scrollLeft);
            setSl(progX.current);
            pendingGo.current = null;
        },
        [segs],
    );
    useLayoutEffect(() => {
        const vp = vpRef.current;
        if (!vp || !segs.length) return;
        if (segs === lastSegs.current && userScrolled.current && pendingGo.current === null) return;
        lastSegs.current = segs;
        const m = pendingGo.current ?? curT.current;
        vp.scrollLeft = scrollLeftFor(yOf(segs, m) - (vp.clientWidth - HW) / 2);
        progX.current = slOf(vp.scrollLeft);
        setSl(progX.current);
        pendingGo.current = null;
    }, [segs, vpW]);
    const onScroll = () => {
        const vp = vpRef.current;
        if (!vp) return;
        requestAnimationFrame(() => {
            const s = slOf(vp.scrollLeft);
            setSl(s);
            if (progX.current !== null && Math.abs(s - progX.current) < 2) return;
            progX.current = null;
            userScrolled.current = true;
            curT.current = mAt(s + (vp.clientWidth - HW) / 2);
        });
    };
    const centreT = !segs.length ? curT.current : progX.current !== null && Math.abs(sl - progX.current) < 2 ? curT.current : mAt(sl + W / 2);
    const k = Math.max(0, Math.min(p.days.length - 1, Math.floor(centreT / DAY_MIN)));
    // the cross-section: middle 20% of the time area; its time snaps to 5 min and the strip sits on that time
    const xp = xsPlan(segs, sl, W, p.numbers.bandFrac, centreT);
    const [ba, bb] = segs.length ? [xp.a, xp.b] : [0, 0];
    const sa = sl + xp.top,
        sb = sl + xp.top + xp.height;
    const rs = useMemo(() => hRowStates(k, p.days, tables, filtered, {closed, forceOpen, collapseEmpty: collapseC}), [k, p.days, tables, filtered, closed, forceOpen, collapseC]);
    const openT = tables.filter(t => rs[t]?.open);
    const closedT = tables.filter(t => !rs[t]?.open);
    const openKey = openT.join('|');
    const rows = useMemo(() => {
        const out: {[t: string]: HRow} = {};
        for (const t of openKey.split('|').filter(Boolean)) out[t] = rowLayout(t, filtered.filter(i => i.table === t), p.days, uOf, {laneH: laneH[t], measure});
        return out;
    }, [openKey, filtered, p.days, uOf, laneH, measure]);
    const counts = segs.length ? hLiveCounts(filtered, p.days, mAt(sl), mAt(sl + W)) : {};
    const day = p.days.length ? dayOf(p.days, centreT) : null;
    const fl = p.numbers.festLen;

    // ------------------------------------------------ actions
    const reopen = (t: string) => {
        setClosed(s => new Set([...s].filter(x => x !== t)));
        setForceOpen(s => new Set([...s, t]));
    };
    const close = (t: string) => {
        setClosed(s => new Set([...s, t]));
        setForceOpen(s => new Set([...s].filter(x => x !== t)));
    };
    const clearF = () => {
        setColF(Object.fromEntries(allT.map(t => [t, {}])));
        setQIn('');
        setQ('');
        setHid(new Set());
    };
    const doNow = () => {
        const n = nowTarget2(p.days, p.initial?.nowMs ?? Date.now());
        goTo(n.m);
        const dd = n.date.split('-').reverse().join('.');
        if (n.note === 'before') setToast(`עכשיו ${dd} ${n.clock} (שעון ישראל) · לפני תחילת הציר · מוצג היום הראשון באותה שעה`);
        if (n.note === 'after') setToast(`עכשיו ${dd} ${n.clock} (שעון ישראל) · אחרי סוף הציר · מוצג היום האחרון באותה שעה`);
    };
    const openRec = (t: string, id: string) => {
        const why0 = p.onOpenRecord?.(t, id);
        if (typeof why0 === 'string' && why0) setToast(why0);
    };

    // ------------------------------------------------ interactions (create / move / resize / row reorder / row height)
    const uAtX = (clientX: number) => (canvasRef.current ? canvasRef.current.getBoundingClientRect().right - HW - clientX : 0);
    const mAtX = (clientX: number) => mAt(uAtX(clientX));
    const why = (table: string, op: Op): string | null => {
        const c = canEdit(table, op);
        if (!c.ok) return c.reason;
        if (!p.writer) return 'עריכה לא זמינה כאן';
        return null;
    };
    const say = (msg: string) => setToast(msg);
    const popDateText = (r: CreateReq) => {
        const d1 = dayOf(p.days, r.s).date.split('-').reverse().join('.');
        if (specOf(r.t)?.time !== 'lodging') return d1;
        const pl = planFields(r.t, {s: r.s, e: r.e}, p.days, 'create');
        return 'fields' in pl ? `${String(pl.fields.start).split('-').reverse().join('.')} → ${String(pl.fields.end).split('-').reverse().join('.')}` : d1;
    };
    /** drag along empty row space → ghost (15-min snap) → popover */
    const rowBgDown = (e: React.PointerEvent, t: string) => {
        if (e.button !== 0) return;
        const el = e.target as HTMLElement;
        if (el.closest('.hb,.hlab,.hlens,.hlc,.hgst,.hgn,.hmk,.hcnt,.ghost,.cp,.hrh')) return;
        const x0 = e.clientX;
        let moved = false;
        const mv = (ev: PointerEvent) => {
            if (!moved && Math.abs(ev.clientX - x0) < 6) return;
            if (!moved) {
                moved = true;
                const w = why(t, 'create');
                if (w) {
                    say(`אי אפשר ליצור כאן: ${w}`);
                    stop();
                    return;
                }
            }
            const r = dragRange(mAtX(x0), mAtX(ev.clientX));
            setGhost({t, a: r.s, b: r.e});
        };
        const up = (ev: PointerEvent) => {
            stop();
            if (!moved) return;
            const r = dragRange(mAtX(x0), mAtX(ev.clientX));
            setGhost({t, a: r.s, b: r.e});
            const chk = p.writer?.check('create', t, null, {});
            if (chk && !chk.ok) {
                say(`אין הרשאה ליצור רשומה ב${HE(t)}: ${chk.reason}`);
                setGhost(null);
                return;
            }
            setPopErr(null);
            setPop({t, s: r.s, e: r.e, x: ev.clientX, y: ev.clientY});
        };
        const stop = () => {
            window.removeEventListener('pointermove', mv);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', mv);
        window.addEventListener('pointerup', up);
    };
    const doCreate = async (v: {name: string; slotId: string | null}) => {
        if (!pop || !p.writer) return;
        const t = pop.t;
        const dayId = p.dayIdByDate?.[dayOf(p.days, pop.s).date] ?? null;
        const pl = planFields(t, {s: pop.s, e: pop.e, name: v.name || (t === 'Slots_Events' ? 'משבצת חדשה' : 'רשומה חדשה'), slotIds: v.slotId ? [v.slotId] : [], dayId}, p.days, 'create');
        if ('error' in pl) return setPopErr(pl.error);
        const chk = p.writer.check('create', t, null, pl.fields);
        if (!chk.ok) return setPopErr(chk.reason);
        setPopBusy(true);
        try {
            const id = await p.writer.create(t, pl.fields);
            const name = String(pl.fields.name ?? 'רשומה חדשה');
            setPop(null);
            setGhost(null);
            const w = p.writer;
            setUndo({
                key: Date.now(),
                text: `נוצר · ${HE(t)} · ${name}`,
                run: () => {
                    const c = w.checkRemove(t, id);
                    if (!c.ok) return say(`אי אפשר לבטל (מחיקה לא מורשית): ${c.reason}`);
                    w.remove(t, id).catch(err => say(`הביטול נכשל: ${String(err?.message ?? err)}`));
                },
            });
        } catch (err) {
            setPopErr(`השמירה נכשלה: ${String((err as Error)?.message ?? err)}`);
        } finally {
            setPopBusy(false);
        }
    };
    /** move (drag the bar) / resize (drag its end = left edge); a click without movement opens the record */
    const barDown = (e: React.PointerEvent, i: Item, op: 'move' | 'resize') => {
        if (e.button !== 0 || i.s === null || i.e === null) return;
        e.stopPropagation();
        const x0 = e.clientX;
        const m0 = mAtX(x0);
        const unit = unitOf(i.table);
        let moved = false,
            blocked = false;
        let r = {s: i.s, e: i.e};
        const mv = (ev: PointerEvent) => {
            if (!moved && Math.abs(ev.clientX - x0) < 5) return;
            if (!moved) {
                moved = true;
                const w = why(i.table, op);
                const chk = w ? null : p.writer?.check('update', i.table, i.id, {});
                if (w || (chk && !chk.ok)) {
                    blocked = true;
                    say(`אי אפשר ${op === 'move' ? 'להזיז' : 'לשנות משך'}: ${w ?? (chk && !chk.ok ? chk.reason : '')}`);
                    stop();
                    return;
                }
            }
            const dm = mAtX(ev.clientX) - m0;
            r = op === 'move' ? moveRange(i.s as number, i.e as number, dm, unit) : resizeEnd(i.s as number, (i.e as number) + dm, unit);
            setLive({id: i.id, ...r});
        };
        const up = () => {
            stop();
            if (!moved) return openRec(i.table, i.id);
            if (blocked) return;
            setLive(null);
            if (r.s === i.s && r.e === i.e) return;
            commit(i, r, op);
        };
        const stop = () => {
            window.removeEventListener('pointermove', mv);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', mv);
        window.addEventListener('pointerup', up);
    };
    const commit = (i: Item, r: {s: number; e: number}, op: 'move' | 'resize') => {
        const w = p.writer;
        if (!w) return;
        const pl = planFields(i.table, r, p.days, op);
        const prev = planFields(i.table, {s: i.s as number, e: i.e as number}, p.days, op);
        if ('error' in pl || 'error' in prev) return say('error' in pl ? pl.error : (prev as {error: string}).error);
        const chk = w.check('update', i.table, i.id, pl.fields);
        if (!chk.ok) return say(`אין הרשאה לשמור: ${chk.reason}`);
        setPend(x => ({...x, [i.id]: r}));
        w.update(i.table, i.id, pl.fields).catch(err => {
            setPend(x => {
                const n = {...x};
                delete n[i.id];
                return n;
            });
            say(`השמירה נכשלה: ${String(err?.message ?? err)}`);
        });
        const verb = op === 'move' ? 'הוזז' : 'שונה משך';
        setUndo({
            key: Date.now(),
            text: `${verb} · ${i.name} · ${fmt(r.s)}–${fmt(r.e)}`,
            run: () => {
                const c = w.check('update', i.table, i.id, prev.fields);
                if (!c.ok) return say(`אי אפשר לבטל: ${c.reason}`);
                setPend(x => ({...x, [i.id]: {s: i.s as number, e: i.e as number}}));
                w.update(i.table, i.id, prev.fields).catch(err => say(`הביטול נכשל: ${String(err?.message ?? err)}`));
            },
        });
    };
    /** ⠿ drag: reorder rows (saved per user) */
    const rowDown = (e: React.PointerEvent, t: string) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        const boxes = () =>
            [...(vpRef.current?.querySelectorAll<HTMLElement>('.hrow[data-t]') ?? [])].map(el => {
                const b = el.getBoundingClientRect();
                return {t: el.dataset.t as string, top: b.top, bottom: b.bottom};
            });
        let before: string | null = null;
        const mv = (ev: PointerEvent) => {
            const bx = boxes();
            before = rowDropTarget(bx, ev.clientY);
            const host = vpRef.current?.getBoundingClientRect().top ?? 0;
            const tgt = bx.find(b => b.t === before);
            const lineY = tgt ? tgt.top - host : bx.length ? bx[bx.length - 1].bottom - host : null;
            setRowDrag({t, x: ev.clientX, y: ev.clientY, before, lineY});
        };
        const up = () => {
            window.removeEventListener('pointermove', mv);
            window.removeEventListener('pointerup', up);
            setRowDrag(null);
            if (before !== t) setOrder(o => dropColumn(o, t, before));
        };
        window.addEventListener('pointermove', mv);
        window.addEventListener('pointerup', up);
        setRowDrag({t, x: e.clientX, y: e.clientY, before: null, lineY: null});
    };
    /** drag the row header's bottom edge = row height (taller lanes; per user), double-click resets */
    const rszDown = (e: React.PointerEvent, t: string, lanes: number) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        const y0 = e.clientY,
            h0 = laneH[t] ?? LANE;
        const mv = (ev: PointerEvent) => setLaneH(w => ({...w, [t]: resizeLane(h0, ev.clientY - y0, lanes)}));
        const up = () => {
            window.removeEventListener('pointermove', mv);
            window.removeEventListener('pointerup', up);
            document.body.classList.remove('tl-rowresizing');
        };
        document.body.classList.add('tl-rowresizing');
        window.addEventListener('pointermove', mv);
        window.addEventListener('pointerup', up);
    };
    const resetH = (t: string) =>
        setLaneH(w => {
            const n = {...w};
            delete n[t];
            return n;
        });

    // ------------------------------------------------ render pieces
    const anyF = anyFilter(F, q) || Object.keys(CF).length > 0 || hiddenN > 0;
    const M = items.filter(i => shown.has(i.table)).length;
    const N = filtered.filter(i => shown.has(i.table)).length;
    const ddCls = (id: string, extra = '') => `dd ${extra} ${openDd === id ? 'open' : ''}`;
    const ddBtn = (id: string) => (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpenDd(o => (o === id ? null : id));
    };
    const resLabel = (p.res.steps.find(s => s.min === res)?.label ?? '') + ' במסך';
    const timeW = Math.max(ax.width, W);
    const totalW = HW + timeW;
    const vis0 = sl - 40,
        vis1 = sl + W + 40; // only what is near the viewport is drawn

    // overlays: grid lines + ruler ticks (one list), day separators, compressed gaps
    const under: ReactNode[] = [];
    const rul: ReactNode[] = [];
    axisTicks(segs, pxh, 46).forEach(tk => {
        if (tk.y < vis0 - 200 || tk.y > vis1 + 200) return;
        under.push(<div key={`g${tk.m}`} className={`hgl ${tk.hour ? '' : 'half'}`} data-tick={tk.m} style={{right: HW + tk.y}} />);
        rul.push(
            <div key={`t${tk.m}`} className={`htk ${tk.hour ? '' : 'sub'}`} data-tick={tk.m} style={{right: HW + tk.y}}>
                <bdi dir="ltr">{tk.label}</bdi>
            </div>,
        );
    });
    segs.forEach((s, si) => {
        if (s.y + s.h < vis0 - 400 || s.y > vis1 + 400) return;
        if (s.kind === 'day') {
            const d = p.days[s.k] ?? NO_DAY;
            const ph = phase(d.n, fl);
            const b = hDayTitle(d);
            under.push(
                <div key={`d${si}`} className={`hds ${ph}`} data-k={s.k} style={{right: HW + s.y, width: s.h, background: phaseBg(ph)}} data-slot={s.k === k ? 'Festival Days · Name (מפריד יום) · Color_1–3 רקע' : undefined}>
                    <span className="hdst">
                        {b.t}
                        {b.s ? <small> · {b.s}</small> : null}
                    </span>
                </div>,
            );
            // (v0.1.2: the ruler's day pill is drawn in its own loop below — its day can be on screen while the separator is not)
        } else if (s.kind === 'cmp') {
            under.push(
                <div key={`c${si}`} className="hgap" style={{right: HW + s.y, width: s.h}} title={`${s.n} שעות ריקות · ${fmt(s.t0)}–${fmt(s.t1)}`}>
                    {s.h >= 14 ? <span>{s.n === 24 ? 'יממה ריקה' : `${s.n} ש׳ ריקות`}</span> : null}
                </div>,
            );
        }
    });

    segs.forEach((s, si) => {
        if (s.kind !== 'day') return;
        const d = p.days[s.k] ?? NO_DAY;
        const b = hDayTitle(d);
        // v0.1.3 #4: the Festival Days record name verbatim (hDayTitle; no phase words); sticks to the visible right edge of its day.
        // v0.1.3 #3: neutral ink pill (no phase / accent colour)
        const nextDay = segs.slice(si + 1).find(x => x.kind === 'day');
        const u0 = s.y + s.h,
            u1 = nextDay ? nextDay.y : ax.width;
        if (u1 < vis0 || u0 > vis1) return;
        const txt = b.s ? `${b.t} · ${b.s}` : b.t;
        const pu = dayPillU(u0, u1, sl, measure(txt, 10.5) + 16);
        if (pu !== null)
            rul.push(
                <div key={`dp${si}`} className="hdp" data-k={s.k} data-title={b.t} style={{right: HW + pu}} title={txt} data-slot={s.k === k ? 'Festival Days · Name לפי Date (כותרת יום = שם הרשומה)' : undefined}>
                    {txt}
                </div>,
            );
    });
    const barNodes = (t: string, row: HRow): ReactNode[] => {
        const out: ReactNode[] = [];
        const bh = barH(row.laneH);
        // v0.1.2 #8: text never scales; below one line (TEXT_MIN) only the coloured bars stay (name on hover)
        const noText = row.laneH < TEXT_MIN;
        const resz = canEdit(t, 'resize').ok;
        for (const g of row.groups) {
            if (g.lodge) {
                out.push(...lodgeNodes(g.y, g.h, g.lodge));
                continue;
            }
            const crowd = crowdedIn(g.bars, sa, sb);
            for (const b of g.bars) {
                if (b.ext < vis0 || b.u0 > vis1) continue;
                const i = b.item;
                const top = g.y + b.lane * row.laneH;
                const w = b.u1 - b.u0;
                const hatch = i.inherited || /זמן לפי המשבצת/.test(i.sub);
                const timeTxt = b.ad ? T.Content_Text_2 || 'כל היום' : `${fmt(b.s)}–${fmt(b.e)}`;
                const tw = measure(' · ' + timeTxt, 11.5, false) + 6;
                // the part of the bar inside the cross-section strip: name only, enlarged (smaller when crowded)
                const la = Math.max(b.u0, sa),
                    lz = Math.min(b.u1, sb);
                const L = xs && !b.ad && !noText ? hLens(i.name, lz - la, crowd, measure) : null;
                // v0.1.4 #1: the name label is placed BEFORE drawing (sticky at both visible edges, slides into free lane room only)
                const visW = Math.min(b.u1, sl + W) - Math.max(b.u0, sl);
                const withT = visW >= b.lab + tw;
                const P = noText || L?.full ? null : placeLabel(b, withT ? visW - 4 : b.lab, sl, sl + W);
                // v0.1.4 #2: a label crossing the cross-section strip → the lens keeps its highlight but not a second title
                const dupe = !!(L && P && P.r < sb && P.r + P.w > sa);
                const isHov = !!(hov && hov.t === t && hov.id === i.id);
                const dim = !!(hov && hov.t === t && hov.id !== i.id && hov.top === top && Math.max(b.u0, P?.r ?? b.u0) < hov.z && Math.max(b.u1, P ? P.r + P.w : b.u1) > hov.a);
                out.push(
                    <div
                        key={i.id}
                        className={`hb ${hatch ? 'hatch' : ''} ${b.ad ? 'ad' : ''} ${i.flag === 'cancel' ? 'cancel' : ''} ${dim ? 'dim' : ''}`}
                        data-id={i.id}
                        title={`${i.name} · ${timeTxt}${i.inherited ? ' · הזמן נקבע לפי המשבצת' : ''}`}
                        style={{right: b.u0, width: Math.max(4, w), top, height: bh, ['--tint' as string]: FILL(t), borderRightColor: C(t)} as CSSProperties}
                        onPointerDown={e => {
                            if (b.ad) return e.stopPropagation();
                            barDown(e, i, (e.target as HTMLElement).classList.contains('rz') ? 'resize' : 'move');
                        }}
                        onClick={b.ad ? () => openRec(t, i.id) : undefined}
                    >
                        {resz && !b.ad ? <i className="rz" title="גררו לשינוי משך" /> : null}
                    </div>,
                );
                if (L)
                    out.push(
                        <div key={`L${i.id}`} className={`hlens ${L.clip ? 'clip' : ''} ${crowd ? 'crowd' : ''} ${dupe ? 'notext' : ''}`} data-id={i.id} style={{right: la + 3, width: lz - la - 6, top, height: bh}} title={i.name} onPointerDown={e => barDown(e, i, 'move')}>
                            {dupe ? null : (
                                <b className="bn" data-clip={L.clip ? '1' : '0'} style={{fontSize: L.fs}}>
                                    {i.name}
                                </b>
                            )}
                        </div>,
                    );
                if (noText) continue;
                if (L?.full) {
                    // the strip already shows the name → outside only the time, where it fits
                    const need = measure(timeTxt, 11.5, false) + 12;
                    const rp = la - b.u0,
                        lp = b.u1 - lz;
                    const tn = (right: number, width: number) => (
                        <div key={`t${i.id}`} className="hlab tonly" style={{right, width, top, height: bh}}>
                            <span className="t">
                                <bdi dir="ltr">{timeTxt}</bdi>
                            </span>
                        </div>
                    );
                    if (rp >= need) out.push(tn(b.u0, rp));
                    else if (lp >= need) out.push(tn(lz, lp));
                } else if (P) {
                    const ext = P.r < b.u0 - 0.5 || P.r + P.w > b.u1 + 0.5;
                    const showT = withT && !P.clip;
                    const full = b.lab;
                    out.push(
                        <div
                            key={`n${i.id}`}
                            className={`hlab nm ${ext ? 'ext' : ''} ${P.r > b.u0 + 0.5 || P.r < b.u0 - 0.5 ? 'pinned' : ''} ${P.clip && !isHov ? 'lclip' : ''} ${isHov ? 'hov' : ''} ${dupe ? 'ovl' : ''} ${dim ? 'dim' : ''} ${row.laneH >= 40 ? 'tall' : ''}`}
                            data-n={i.name}
                            data-id={i.id}
                            title={P.clip ? i.name : undefined}
                            style={{right: isHov ? Math.min(P.r, Math.max(sl + 2, sl + W - 2 - full)) : P.r, width: isHov ? full : P.w, top, height: bh}}
                            onPointerEnter={P.clip ? () => setHov({t, id: i.id, top, a: Math.min(P.r, Math.max(sl + 2, sl + W - 2 - full)), z: Math.min(P.r, Math.max(sl + 2, sl + W - 2 - full)) + full}) : undefined}
                            onPointerLeave={P.clip ? () => setHov(h => (h && h.id === i.id ? null : h)) : undefined}
                            onPointerDown={e => {
                                if ((e.target as HTMLElement).closest('.eye')) return;
                                if (b.ad) return e.stopPropagation();
                                // v0.1.4: the label now sits ON its bar (#3) → its left 7px over the bar's end still resizes
                                const bar = (e.currentTarget.parentElement as HTMLElement | null)?.querySelector(`.hb[data-id="${i.id}"]`)?.getBoundingClientRect();
                                barDown(e, i, resz && bar && e.clientX >= bar.left - 1 && e.clientX <= bar.left + 7 ? 'resize' : 'move');
                            }}
                            onClick={b.ad ? () => openRec(t, i.id) : undefined}
                        >
                            <b className="open" title="פתיחת הרשומה">
                                {i.name}
                            </b>
                            {showT ? (
                                <span className="t">
                                    {' · '}
                                    <bdi dir="ltr">{timeTxt}</bdi>
                                </span>
                            ) : null}
                            <Eye id={i.id} name={i.name} onHide={hideRec} />
                        </div>,
                    );
                }
            }
        }
        return out;
    };
    function lodgeNodes(gy: number, gh: number, list: NonNullable<HRow['groups'][number]['lodge']>): ReactNode[] {
        const out: ReactNode[] = [];
        list.forEach((L, ci) => {
            const c = L.c;
            if (L.u1 < vis0 || L.u0 > vis1) return;
            out.push(<div key={`lc${c.hotel}|${ci}`} className="hlc" data-hotel={c.hotel} title={`${c.hotel} · ${c.stays.length} שהיות`} style={{right: L.u0, width: Math.max(8, L.u1 - L.u0), top: gy, height: gh - 2}} />);
            c.segs.forEach((sg, kk) => {
                const a = uOf(sg.a),
                    z = uOf(sg.b);
                const txt = `${sg.guests.length} ${T.Content_Text_13 || 'בלינה'}`;
                const pw = measure(txt, 10.5) + 16;
                const vr = Math.max(a, sl) + 4;
                if (z - vr >= pw + 12) {
                    const mag = xs && sg.a < bb && sg.b > ba && vr + pw > sa && vr < sb;
                    out.push(
                        <div key={`cp${c.hotel}|${ci}_${kk}`} className={`hcnt num ${mag ? 'mag' : ''}`} style={{right: vr, top: gy + 2}} title={`${c.hotel} · ${sg.guests.map(g => g.guest).join(', ')}`}>
                            {txt}
                        </div>,
                    );
                }
            });
            c.stays.forEach(s => {
                const r = L.rowOf.get(s.id) ?? 0;
                const top = gy + LODGE_HEAD + r * LODGE_ROW;
                const a = uOf(s.s as number),
                    z = uOf(s.e as number);
                out.push(<div key={`gs${s.id}`} className="hgst" style={{right: a, width: Math.max(4, z - a), top}} title={`${s.guest} · גררו להזזת השהייה בימים`} data-id={s.id} onPointerDown={e => barDown(e, s, 'move')} />);
                const wi = measure(`${fmt(s.s as number)} ↓`, 10.5, false) + 10,
                    wo = measure(`${fmt(s.e as number)} ↑`, 10.5, false) + 10;
                out.push(
                    <div key={`mi${s.id}`} className="hmk in" style={{right: a + 2, top}} title={`צ׳ק-אין · ${s.guest} · ${fmt(s.s as number)}`}>
                        <bdi dir="ltr">{fmt(s.s as number)}</bdi> ↓
                    </div>,
                );
                const outOk = z - a > wi + wo + 8;
                if (outOk)
                    out.push(
                        <div key={`mo${s.id}`} className="hmk out" style={{right: z - wo - 2, top}} title={`צ׳ק-אאוט · ${s.guest} · ${fmt(s.e as number)}`}>
                            <bdi dir="ltr">{fmt(s.e as number)}</bdi> ↑
                        </div>,
                    );
                const nm = s.guest || s.name;
                const nw = measure(nm, 11.5) + 10;
                const n0 = a + wi + 4;
                const n1 = outOk ? z - wo - 4 : z;
                const stick = stickyU(n0, n1, sl, nw);
                const mag = xs && (s.s as number) < bb && (s.e as number) > ba && n0 + stick < sb && n0 + stick + nw > sa;
                out.push(
                    <div key={`gn${s.id}`} className={`hgn nm ${n1 - n0 < nw ? 'ext' : ''} ${mag ? 'mag' : ''}`} data-n={nm} data-id={s.id} style={{right: n0 + stick, top, minWidth: nw}} onPointerDown={e => barDown(e, s, 'move')}>
                        {nm}
                    </div>,
                );
            });
        });
        return out;
    }

    // window (cross-section)
    const wShown = new Set([...shown].filter(t => !wHide.has(t)));
    const wpass = (i: Item) => winPass(i, passT, wShown, wOff) && passPicked(i, wPick) && (!wNow || ((i.s as number) <= xp.t && (i.e as number) > xp.t)) && (!wNoCancel || i.flag !== 'cancel');
    const wSrc = filtered;
    const hits = windowHits(wSrc, ba, bb, order, i => wpass(i));
    const pills = winPills(wSrc.filter(i => i.s !== null && overlaps(i, ba, bb) && passT(i) && passPicked(i, wPick)), order, wShown, wOff, new Set(Object.keys(wPick).filter(t => wPick[t]?.length)));
    const wAny = pills.some(x => !x.on) || wHide.size > 0 || Object.values(wPick).some(v => v.length) || wNow || wNoCancel || hid.size > 0;
    const wfN = (wNow ? 1 : 0) + (wNoCancel ? 1 : 0) + wHide.size + [...wOff].filter(t => shown.has(t)).length;
    const clearWin = () => {
        setWOff(new Set());
        setWHide(new Set());
        setWPick({});
        setWNow(false);
        setWNoCancel(false);
        setHid(new Set()); // «נקה הכל» brings back the 👁-hidden records too
    };
    const pickT = openDd?.startsWith('vf:') ? openDd.slice(3) : null;
    const cfT = openDd?.startsWith('cf:') ? openDd.slice(3) : null;
    const canF = (t: string) => hColCount(CF[t]) > 0 || (p.filterFields?.[t]?.length ?? 0) > 0 || items.some(i => i.table === t && (i.hall.length || i.people.length || i.films.length || i.st || (i.fx && Object.keys(i.fx).length)));
    const cfDims = cfT ? hColDims(items.filter(i => i.table === cfT), CF[cfT], p.facetLabels, passQ, p.filterFields?.[cfT] ?? []) : [];
    const cfCur = cfDims.find(d => d.key === (cfT && cfDim[cfT])) ?? cfDims.find(d => (CF[cfT ?? '']?.[d.key]?.vals.length ?? 0) > 0 || noVals(CF[cfT ?? '']?.[d.key]?.op ?? 'any')) ?? cfDims[0];
    const wRows = winGridRows(p.numbers.maxCards, WIN_COLS);
    // v0.1.2 #2: tables shrunk / hidden in the window and 👁-hidden records crossing it → vertical tabs at its LEFT edge
    const stripT = order.filter(t => shown.has(t) && (wOff.has(t) || wHide.has(t))).map(t => ({t, n: pills.find(x => x.t === t)?.n ?? hits.filter(h => h.table === t).length}));
    const stripRec = xs ? items.filter(i => hid.has(i.id) && i.s !== null && overlaps(i, ba, bb) && wShown.has(i.table) && !wOff.has(i.table)) : [];
    const wEmpty = xs && hits.length === 0;
    const curMin = xp.t;
    const menuT = openDd?.startsWith('cm:') ? openDd.slice(3) : null;
    const menuL = [...(T.Content_Text_12 || '').split('|').map(x => x.trim()), '', '', '', '', ''].map((x, n) => x || ['לראש', 'הזז למעלה', 'הזז למטה', 'לתחתית', 'סגור שורה'][n] || '');
    const hidList = openDd === 'hid' ? items.filter(i => hid.has(i.id)) : [];

    const header = (t: string, row: HRow, first: boolean) => {
        const lanes = row.groups.reduce((a, g) => a + g.lanes, 0);
        const fc = hColCount(CF[t]);
        return (
            <div className="hrh" style={{['--c' as string]: C(t)} as CSSProperties} data-slot={first ? 'Option_List_6 (תווית · צבע)' : undefined}>
                <div className="l1">
                    <span
                        className="hd2"
                        title={T.Helper_Text_7}
                        tabIndex={0}
                        onPointerDown={e => rowDown(e, t)}
                        onKeyDown={e => {
                            const to = ({ArrowUp: 'up', ArrowDown: 'down', Home: 'top', End: 'bottom'} as {[k: string]: MoveTo})[e.key];
                            if (to) {
                                e.preventDefault();
                                setOrder(o => moveColumn(o, t, to));
                            }
                        }}
                        data-slot={first ? 'Helper_Text_7 (⠿ · per user)' : undefined}
                    >
                        ⠿
                    </span>
                    <span className="nmh">{HE(t)}</span>
                    <span className="vc num" title="רשומות שנראות כרגע במסך">
                        {counts[t] || 0}
                    </span>
                </div>
                <div className="l2">
                    <a
                        className={`cf2 ${fc ? 'act' : ''} ${canF(t) ? '' : 'dis'}`}
                        role="button"
                        aria-label={`סינון ${HE(t)}`}
                        aria-disabled={!canF(t)}
                        title={!canF(t) ? `אין בטבלה ${HE(t)} שדות בחירה/קישור עם ערכים לסינון` : fc ? `סינון ${HE(t)} · ${fc} ערכים פעילים` : `סינון ${HE(t)}`}
                        data-cm={'cf:' + t}
                        data-slot={first ? 'Filter_N «Table.Field הוא/אינו/מכיל/ריק ערך» · חלונית ימנית · per user' : undefined}
                        onClick={e => {
                            e.stopPropagation();
                            if (!canF(t)) return;
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setMenuAt({x: r.left, y: r.bottom});
                            setOpenDd(o => (o === 'cf:' + t ? null : 'cf:' + t));
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M1.5 2h13l-5 6.2V13l-3 1.5V8.2z" fill={fc ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        </svg>
                        {fc ? <b className="num">{fc}</b> : null}
                    </a>
                    <span className="hgrp" data-slot={first ? 'Tab_Label_2 (⋯) · ✕ כיווץ (קבוצה אחת)' : undefined}>
                        <a
                            className="cm2"
                            title={T.Tab_Label_2}
                            data-cm={'cm:' + t}
                            onClick={e => {
                                e.stopPropagation();
                                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setMenuAt({x: r.left, y: r.bottom});
                                setOpenDd(o => (o === 'cm:' + t ? null : 'cm:' + t));
                            }}
                        >
                            ⋯
                        </a>
                        <a
                            className="cx"
                            title={`כיווץ ${HE(t)} לשורת הטבלאות הסגורות (לחיצה על השבב פותחת)`}
                            data-slot={first ? 'Toggle_1 (✕ כיווץ)' : undefined}
                            onClick={e => {
                                e.stopPropagation();
                                close(t);
                            }}
                        >
                            ✕
                        </a>
                    </span>
                    {t === 'Lodging' ? (
                        <span className="ldf num" title={(T.Helper_Text_6 || '').replace('{in}', p.lodge.in).replace('{out}', p.lodge.out)} data-slot="Helper_Text_6">
                            ב״מ <bdi dir="ltr">↓{p.lodge.in} ↑{p.lodge.out}</bdi>
                        </span>
                    ) : null}
                </div>
                {/* v0.1.4 #7: hall / hotel labels line up with their group (same separator line as the bars) and are not cut:
                    below the header lines they take the full header width (2 lines), next to them the left half (2 lines) */}
                {row.groups.map((g, gi) => {
                    if (!g.key) return null;
                    const pos = hallLabelPos(g.y, g.h, gi, !!g.lodge);
                    return (
                        <Fragment key={g.key}>
                            {gi ? <div className="hgsep2" style={{top: g.y - 3}} /> : null}
                            <div className={`hgl2 ${pos.wide ? 'wide' : ''}`} style={{top: pos.top}} title={g.key} data-g={gi}>
                                {g.key}
                            </div>
                        </Fragment>
                    );
                })}
                <span
                    className={`hrz ${laneH[t] !== undefined ? 'set' : ''}`}
                    role="separator"
                    aria-orientation="horizontal"
                    aria-label={`גובה ${HE(t)}`}
                    tabIndex={0}
                    title={T.Helper_Text_8}
                    data-slot={first ? 'Helper_Text_8 (גובה שורה · per user)' : undefined}
                    onPointerDown={e => rszDown(e, t, lanes)}
                    onDoubleClick={e => {
                        e.stopPropagation();
                        resetH(t);
                    }}
                    onKeyDown={e => {
                        const cur = laneH[t] ?? LANE;
                        if (e.key === 'ArrowDown') setLaneH(w => ({...w, [t]: resizeLane(cur, 4, 1)}));
                        else if (e.key === 'ArrowUp') setLaneH(w => ({...w, [t]: resizeLane(cur, -4, 1)}));
                        else if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Escape') resetH(t);
                        else return;
                        e.preventDefault();
                    }}
                />
            </div>
        );
    };

    return (
        <div ref={rootRef} className={`tl htl ${xs ? '' : 'nox'} ${wEmpty ? 'wempty' : ''}`} dir="rtl" style={{['--strip' as string]: `${p.numbers.strip}px`, ['--HW' as string]: `${HW}px`, ...sdkVars(hexOf), ['--fest' as string]: phaseBg('fest'), ['--prep' as string]: phaseBg('prep'), ['--wrap' as string]: phaseBg('wrap')} as CSSProperties}>
            <style>{CSS + HCSS}</style>
            {/* ---------------- top row ---------------- */}
            <div className="top" id="top">
                <h1 className="ptl" data-slot="Title">
                    {T.Title} {p.demo ? <span className="demo">DEMO</span> : null}
                </h1>
                <div className={ddCls('res', 'res')} data-slot="Dropdown_Label_3 · Option_List_3 · Dropdown_Default_3 (720 = 12 ש׳)">
                    <button onClick={ddBtn('res')}>
                        <small>{p.res.label}</small>
                        <span>{resLabel}</span>
                    </button>
                    <div className="menu res">
                        {p.res.steps.map(s => (
                            <div
                                key={s.min}
                                className={`it ${s.min === res ? 'sel' : ''}`}
                                onClick={() => {
                                    curT.current = centreT;
                                    setRes(s.min);
                                    setOpenDd(null);
                                }}
                            >
                                <span className="ck2">{s.min === res ? '✓' : ''}</span>
                                {s.label} במסך
                            </div>
                        ))}
                    </div>
                </div>
                <div className={ddCls('tables')} data-slot="Option_List_6">
                    <button onClick={ddBtn('tables')}>
                        <small>{T.Content_Text_8}</small>
                        <span className="num">{shown.size === allT.length ? `כל ${allT.length}` : `${shown.size} ${T.Content_Text_3} ${allT.length}`}</span>
                    </button>
                    <div className="menu" onClick={e => e.stopPropagation()}>
                        {allT.map(t => (
                            <div
                                key={t}
                                className={`it ${shown.has(t) ? 'on' : ''}`}
                                onClick={() => {
                                    curT.current = centreT;
                                    setShown(s => {
                                        const n = new Set(s);
                                        if (n.has(t)) n.delete(t);
                                        else n.add(t);
                                        return n.size ? n : s;
                                    });
                                }}
                            >
                                <span className="ck">{shown.has(t) ? '✓' : ''}</span>
                                <i style={{background: C(t)}} />
                                {HE(t)}
                                <span className="n num">{items.filter(i => i.table === t).length}</span>
                            </div>
                        ))}
                        <div className="act">
                            <span onClick={() => setShown(new Set(allT))}>הכל</span>
                            <span onClick={() => setShown(new Set([allT[0]]))}>נקה</span>
                            <span onClick={() => setShown(new Set(allT.filter(t => ['Slots_Events', 'Staffing', 'Invitations', 'Itinerary', 'Lodging', 'Booking Resources'].includes(t))))}>רק תפעול</span>
                        </div>
                    </div>
                </div>
                <div className={ddCls('view')} data-slot="Tab_Label_1 (Toggle_1 טבלאות ריקות · Toggle_2 שעות ריקות — ברירת מחדל ON)">
                    <button onClick={ddBtn('view')}>{T.Tab_Label_1}</button>
                    <div className="menu" onClick={e => e.stopPropagation()}>
                        {p.toggles.collapse.label ? (
                            <div className={`tog ${collapseC ? 'on' : ''}`} onClick={() => setCollapseC(v => !v)} data-slot="Toggle_1 · Toggle_Label_1">
                                <span className="sw" />
                                {p.toggles.collapse.label}
                            </div>
                        ) : null}
                        {p.toggles.compress.label ? (
                            <div
                                className={`tog ${compressT ? 'on' : ''}`}
                                onClick={() => {
                                    curT.current = centreT;
                                    setCompressT(v => !v);
                                    setCompressUser(true);
                                }}
                                data-slot="Toggle_2 · Toggle_Label_2"
                            >
                                <span className="sw" />
                                {p.toggles.compress.label}
                            </div>
                        ) : null}
                    </div>
                </div>
                {hiddenN ? (
                    <div className={ddCls('hid')}>
                        <button className="hidn num" title="רשומות שהסתרת עם 👁 · לחצו לרשימה" onClick={ddBtn('hid')}>
                            👁 {hiddenN} מוסתרות
                        </button>
                        <div className="menu" onClick={e => e.stopPropagation()}>
                            {hidList.map(i => (
                                <div key={i.id} className="it hidr" data-id={i.id} title="הצגה מחדש" onClick={() => unhideRec(i.id)}>
                                    <i style={{background: C(i.table)}} />
                                    {i.name}
                                    <span className="n">הצג</span>
                                </div>
                            ))}
                            <div className="act">
                                <span onClick={() => setHid(new Set())}>הצג הכל</span>
                            </div>
                        </div>
                    </div>
                ) : null}
                {anyF ? (
                    <a className="clr" onClick={() => clearF()} data-slot="Content_Text_5">
                        {T.Content_Text_5}
                    </a>
                ) : null}
                <div className="sp" />
                <span className={`cnt num ${anyF && !N ? 'zero' : ''}`} title={`${p.hiddenJunk} רשומות דמה/לא מקושרות מוסתרות`} data-slot="Content_Text_3">
                    {anyF && !N ? T.Empty_State_Text_1 : `${N} ${T.Content_Text_3} ${M}`}
                </span>
                <div className={`srch ${q ? 'act' : ''}`} data-slot="Helper_Text_1">
                    <svg width="15" height="15" viewBox="0 0 16 16">
                        <circle cx="6.5" cy="6.5" r="5" fill="none" stroke="var(--sdk-gray)" strokeWidth="1.8" />
                        <path d="M10.5 10.5l4 4" stroke="var(--sdk-gray)" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <input placeholder={T.Helper_Text_1} value={qIn} onChange={e => setQIn(e.target.value)} />
                </div>
            </div>

            {/* ---------------- day banner ---------------- */}
            <div className={`ban ${day ? phase(day.n, fl) : ''}`} style={day ? {background: phaseBg(phase(day.n, fl))} : undefined}>
                <div className="ctr" data-slot="Festival Days · Name (כותרת היום · דיו) · שעון">
                    <small>{day ? hDayTitle(day).s : ''}</small>
                    <span className="big">{day ? hDayTitle(day).t : ''}</span>
                    <span className="clock num">
                        <bdi dir="ltr">{fmt(curMin)}</bdi>
                    </span>
                </div>
                <div className="sp" />
                <button className="bb" onClick={doNow} data-slot="Button_Text_1">
                    {T.Button_Text_1}
                </button>
                <JumpControl days={p.days} cur={curMin} label={(T.Button_Text_2 || 'קפיצה').replace(/\s*(ל)?…$/, '').trim() || 'קפיצה'} onGo={m => (m === null ? setToast('התאריך מחוץ לתוכנית') : goTo(m))} />
                {toast ? <div className="toast msg">{toast}</div> : null}
            </div>

            {/* ---------------- cross-section window ---------------- */}
            <div className={`win ${xs ? '' : 'off'}`} onClick={e => e.stopPropagation()}>
                <div className="wh">
                    <b data-slot="Content_Text_1">{T.Content_Text_1}</b>
                    <span className={`tog ${xs ? 'on' : ''}`} id="xsTog" role="switch" aria-checked={xs} title="הצגה/הסתרה של החתך" onClick={() => setXs(v => !v)} data-slot="Toggle_3">
                        <span className="sw" />
                    </span>
                    <span className="wpills" data-slot="Content_Text_9 (טבלאות בחתך)">
                        {pills.length ? <small className="wpl">{T.Content_Text_9}</small> : null}
                        {pills
                            .filter(x => x.on)
                            .map(x => {
                                const opts = p.tableFilters?.[x.t]?.options ?? [];
                                const pk = wPick[x.t] ?? [];
                                return (
                                    <span key={x.t} data-t={x.t} className={`wp1 on ${pk.length ? 'pk' : ''}`} title={`${HE(x.t)} · מוצג בחתך${pk.length ? ' · מסונן: ' + pk.join(', ') : ''}`} style={{['--c' as string]: C(x.t), ['--f' as string]: FILL(x.t)} as CSSProperties}>
                                        {HE(x.t)}
                                        <span className="c num">{x.n}</span>
                                        <a
                                            className={`vdd ${opts.length ? '' : 'dis'}`}
                                            data-cm={'vf:' + x.t}
                                            aria-disabled={!opts.length}
                                            title={opts.length ? `סינון לפי ${p.tableFilters?.[x.t]?.field} (בחירה מרובה)` : 'אין שדה סינון בחירה/קישור לטבלה הזו (חלונית ימנית / Filter_N)'}
                                            onClick={e => {
                                                e.stopPropagation();
                                                if (!opts.length) return;
                                                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                setPickAt({x: r.left, y: r.bottom});
                                                setOpenDd(o => (o === 'vf:' + x.t ? null : 'vf:' + x.t));
                                            }}
                                        >
                                            {pk.length ? <b className="num">{pk.length}</b> : null}▾
                                        </a>
                                        <a className="x" title={`כיווץ ${HE(x.t)} לפס בצד שמאל של החתך (לחיצה על הפס מחזירה)`} onClick={() => setWOff(o => toggleIn(o, x.t))}>
                                            ✕
                                        </a>
                                    </span>
                                );
                            })}
                        {wAny ? (
                            <a className="wall" title="ניקוי סינוני החתך · חוזר בדיוק למה שבציר הזמן" onClick={clearWin}>
                                הכל
                            </a>
                        ) : null}
                    </span>
                    <a
                        className={`wf ${wfN || hiddenN ? 'act' : ''}`}
                        role="button"
                        aria-label="סינון החתך"
                        title="סינון החתך"
                        data-cm="wf"
                        onClick={e => {
                            e.stopPropagation();
                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setMenuAt({x: r.left, y: r.bottom});
                            setOpenDd(o => (o === 'wf' ? null : 'wf'));
                        }}
                    >
                        <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M1.5 2h13l-5 6.2V13l-3 1.5V8.2z" fill={wfN ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        </svg>
                        {wfN ? <b className="num">{wfN}</b> : null}
                    </a>
                    <span className="wemp">
                        {!xs ? (
                            '· כבוי · הפעילו כדי לראות מה קורה באמצע המסך'
                        ) : wEmpty ? (
                            wAny ? (
                                <>
                                    · {T.Empty_State_Text_3} · <a onClick={clearWin}>הכל</a>
                                </>
                            ) : anyF && !filtered.length ? (
                                <>
                                    · {T.Empty_State_Text_1} · <a onClick={() => clearF()}>נקה</a>
                                </>
                            ) : (
                                `· ${T.Empty_State_Text_2}`
                            )
                        ) : null}
                    </span>
                </div>
                <div className="wslide">
                    <div className="wbody">
                        <div
                            className="wg"
                            data-slot="Number_2 (שורות גלויות · גלילה בתוך החתך)"
                            style={{height: `calc(${wRows} * var(--wcH) + ${wRows - 1} * 3px)`}}
                        >
                            {hits.slice(0, WIN_MAX).map((i, n) => (
                                <div key={n} className={`wc ${i.s <= curMin && i.e > curMin ? 'now' : ''}`} style={{borderInlineStartColor: C(i.table)}}>
                                    <span className="tg" style={{background: FILL(i.table), color: 'var(--ink)'}}>
                                        {HE(i.table)}
                                    </span>
                                    {i.id && !i.agg ? (
                                        <a className="nm open" title={`${i.name} · פתיחת הרשומה`} data-id={i.id} onClick={() => openRec(i.table, i.id as string)} data-slot={n === 0 ? 'פתיחת רשומה (expandRecord)' : undefined}>
                                            {i.name}
                                        </a>
                                    ) : (
                                        <span className="nm" title={i.name}>
                                            {i.name}
                                        </span>
                                    )}
                                    {i.id && !i.agg ? <Eye id={i.id} name={i.name} onHide={hideRec} /> : null}
                                </div>
                            ))}
                            {hits.length > WIN_MAX ? <div className="wc more">+{hits.length - WIN_MAX} עוד בחתך</div> : null}
                        </div>
                        {stripT.length || stripRec.length ? (
                            <div className="wstrip" data-slot="✕ / 👁 בחתך → פס משמאל (לחיצה מחזירה)">
                                {stripT.map(x => (
                                    <a
                                        key={x.t}
                                        data-t={x.t}
                                        role="button"
                                        className="wst tbl"
                                        style={{['--c' as string]: C(x.t), ['--f' as string]: FILL(x.t)} as CSSProperties}
                                        title={`${HE(x.t)} · מכווץ בחתך (${x.n}) · לחצו להחזרה`}
                                        onClick={() => {
                                            setWOff(o => new Set([...o].filter(z => z !== x.t)));
                                            setWHide(o => new Set([...o].filter(z => z !== x.t)));
                                        }}
                                    >
                                        <span className="wsl">{HE(x.t)}</span>
                                        <span className="c num">{x.n}</span>
                                    </a>
                                ))}
                                {stripRec.slice(0, 6).map(i => (
                                    <a key={i.id} data-id={i.id} role="button" className="wst rec" style={{['--c' as string]: C(i.table)} as CSSProperties} title={`👁 «${i.name}» מוסתר · לחצו להחזרה`} onClick={() => unhideRec(i.id)}>
                                        <span className="wsl">{i.name}</span>
                                        <span className="c">👁</span>
                                    </a>
                                ))}
                                {stripRec.length > 6 ? (
                                    <a role="button" className="wst rec more" title="החזרת כל המוסתרות בחתך" onClick={() => setHid(h => new Set([...h].filter(id => !stripRec.some(r => r.id === id))))}>
                                        <span className="wsl">+{stripRec.length - 6}</span>
                                    </a>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* ---------------- grid: sticky ruler (top) + sticky row headers (right); time scrolls RTL, rows scroll down ---------------- */}
            <div className="hgw">
                <div className="hvp" ref={vpRef} onScroll={onScroll}>
                    {p.notices.length && !items.length ? <div className="notice">{p.notices.join(' · ')}</div> : null}
                    <div className="hcanvas" ref={canvasRef} style={{width: totalW}}>
                        <div className="hunder">{under}</div>
                        <div className="hrul" style={{width: totalW}}>
                            <div className="hrh0" data-slot="Table_Heading_1">
                                {T.Table_Heading_1}
                            </div>
                            {rul}
                            {nowM !== null ? (
                                <div className={`hnowt num ${showNowTag(uOf(nowM) - sl, xp.yc) ? '' : 'hid'}`} style={{right: HW + uOf(nowM)}} data-m={nowM} data-slot="Button_Text_1 (קו עכשיו)">
                                    <bdi dir="ltr">{fmt(nowM)}</bdi>
                                </div>
                            ) : null}
                        </div>
                        {closedT.length ? (
                            <div className="hclosed" style={{width: totalW}} data-slot="Toggle_1 · Helper_Text_4–5 (שורות סגורות)">
                                <div className="hrh hrhc">
                                    <span className="num">
                                        {closedT.length} {T.Content_Text_14 || 'טבלאות סגורות'}
                                    </span>
                                </div>
                                <div className="hchips" style={{width: W}}>
                                    {closedT.map(t => (
                                        <a key={t} data-t={t} className={`hchip ${rs[t]?.manual ? 'man' : 'quiet'}`} style={{['--c' as string]: C(t), ['--f' as string]: FILL(t)} as CSSProperties} title={rs[t]?.manual ? `${HE(t)} · ${rs[t].count} פריטים היום · ${T.Helper_Text_4}` : `${HE(t)} · ${T.Helper_Text_5}`} onClick={() => reopen(t)}>
                                            {HE(t)}
                                            {rs[t]?.count ? <span className="num"> {rs[t].count}</span> : null} ↺
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        {openT.map((t, n) => {
                            const row = rows[t];
                            if (!row) return null;
                            return (
                                <div key={t} className={`hrow ${row.laneH < TEXT_MIN ? 'thin' : ''}`} data-t={t} style={{height: row.h, width: totalW, ['--c' as string]: C(t), ['--f' as string]: FILL(t)} as CSSProperties} onPointerDown={e => rowBgDown(e, t)}>
                                    {header(t, row, n === 0)}
                                    <div className="hta" style={{width: timeW, height: row.h}}>
                                        {row.groups.map((g, gi) => (gi ? <div key={`s${gi}`} className="hgsep" style={{top: g.y - 3}} /> : null))}
                                        {barNodes(t, row)}
                                        {ghost && ghost.t === t ? (
                                            <GhostBar t={t} a={ghost.a} b={ghost.b} u={uOf} rowH={row.h} label={t === 'Slots_Events' ? 'משבצת חדשה' : T.Content_Text_10 || 'רשומה חדשה'} clash={ghostClash(filtered, t, ghost.a, ghost.b)} />
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                        {!openT.length ? <div className="dayempty">{day ? `${hDayTitle(day).t} · ` : ''}אין פריטים ביום הזה · כל הטבלאות בשורת הסגורות</div> : null}
                        {nowM !== null ? <div className="hnow" style={{right: HW + uOf(nowM) - 1}} /> : null}
                    </div>
                    {rowDrag && rowDrag.lineY !== null ? <div className="hdropline" style={{top: rowDrag.lineY + (vpRef.current?.scrollTop ?? 0), width: totalW}} /> : null}
                </div>
                {xs ? (
                    <>
                        <div className="hband" style={{right: HW + xp.top, width: xp.height, bottom: sbH}} data-slot="Number_1 (20%)" />
                        <div className="hbl" style={{right: HW + xp.top + xp.height - 64}} data-slot="Content_Text_1">
                            {T.Content_Text_1}
                        </div>
                    </>
                ) : null}
                <div className="htnow num" style={{right: HW + xp.yc - 22}} data-t={xp.t}>
                    <bdi dir="ltr">{fmt(curMin)}</bdi>
                </div>
            </div>
            {rowDrag ? (
                <div className="cghost" style={{['--c' as string]: C(rowDrag.t), left: rowDrag.x - 60, top: rowDrag.y - 17} as CSSProperties}>
                    <span style={{color: 'var(--sdk-gray)'}}>⠿</span>
                    <i style={{background: C(rowDrag.t)}} />
                    {HE(rowDrag.t)}
                </div>
            ) : null}
            {cfT ? (
                <div className="hmenu open vmenu cfmenu" data-cm={'cf:' + cfT} style={{position: 'fixed', left: Math.max(4, Math.min(menuAt.x - 200, window.innerWidth - 270)), top: menuAt.y + 4}} onClick={e => e.stopPropagation()}>
                    <small className="vh">סינון {HE(cfT)} · מסנן את ציר הזמן וגם את חתך הרוחב</small>
                    {cfDims.length ? (
                        <>
                            <div className="cfd" role="tablist" aria-label="שדה">
                                {cfDims.map(d => (
                                    <a key={d.key} role="tab" aria-selected={d.key === cfCur?.key} data-d={d.key} className={`${d.key === cfCur?.key ? 'on' : ''} ${d.cfg ? 'cfg' : ''}`} title={d.cfg ? 'שדה סינון מוגדר (חלונית ימנית / Extension_Config)' : undefined} onClick={() => setCfDim(m => ({...m, [cfT]: d.key}))}>
                                        {d.label}
                                        {hColCount({x: CF[cfT]?.[d.key] ?? {op: 'any', vals: []}}) ? <b className="num">{hColCount({x: CF[cfT]?.[d.key] ?? {op: 'any', vals: []}})}</b> : null}
                                    </a>
                                ))}
                            </div>
                            {cfCur ? (
                                <>
                                    <div className="cfop hcfop" role="radiogroup" aria-label="תנאי">
                                        {(['any', 'none', 'contains', 'ncontains', 'empty', 'notempty'] as HOp[]).map(o => (
                                            <a key={o} data-op={o} role="radio" aria-checked={(CF[cfT]?.[cfCur.key]?.op ?? 'any') === o} className={(CF[cfT]?.[cfCur.key]?.op ?? 'any') === o ? 'on' : ''} onClick={() => setColF(c => ({...c, [cfT]: hSetOp(CF[cfT], cfCur.key, o)}))}>
                                                {OP_HE[o]}
                                            </a>
                                        ))}
                                    </div>
                                    {(() => {
                                        const op = CF[cfT]?.[cfCur.key]?.op ?? 'any';
                                        return noVals(op) ? <div className="vh cfnv">{op === 'empty' ? 'מוצגות רק רשומות שהשדה ריק בהן' : 'מוצגות רק רשומות שיש בהן ערך בשדה'}</div> : null;
                                    })()}
                                    {!noVals(CF[cfT]?.[cfCur.key]?.op ?? 'any') ? (
                                        <form
                                            className="cftx"
                                            onSubmit={e => {
                                                e.preventDefault();
                                                const v = cfTxt.trim();
                                                if (!v) return;
                                                if (!(CF[cfT]?.[cfCur.key]?.vals ?? []).includes(v)) setColF(c => ({...c, [cfT]: hToggleVal(CF[cfT], cfCur.key, v)}));
                                                setCfTxt('');
                                            }}
                                        >
                                            <input value={cfTxt} placeholder={(CF[cfT]?.[cfCur.key]?.op ?? 'any').includes('contains') ? 'טקסט שמופיע בשדה… (Enter)' : 'ערך נוסף… (Enter)'} onChange={e => setCfTxt(e.target.value)} />
                                        </form>
                                    ) : null}
                                    <div className={`cfl ${noVals(CF[cfT]?.[cfCur.key]?.op ?? 'any') ? 'dim' : ''}`}>
                                        {cfCur.values.map(({v, n}) => {
                                            const on = (CF[cfT]?.[cfCur.key]?.vals ?? []).includes(v);
                                            return (
                                                <div key={v} role="checkbox" aria-checked={on} className={`vi ${on ? 'on' : ''}`} onClick={() => setColF(c => ({...c, [cfT]: hToggleVal(CF[cfT], cfCur.key, v)}))}>
                                                    <span className="ck">{on ? '✓' : ''}</span>
                                                    <span className="vt">{v}</span>
                                                    <span className="n num">{n}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : null}
                        </>
                    ) : (
                        <div className="vh">אין שדות בחירה/קישור עם ערכים בטבלה הזו</div>
                    )}
                    <div className="sepm" />
                    <div className="cfa">
                        <a onClick={() => setColF(c => ({...c, [cfT]: {}}))}>נקה</a>
                        {p.colDefaults?.[cfT] ? (
                            <a
                                title="חזרה לברירת המחדל מהחלונית הימנית / Extension_Config"
                                onClick={() =>
                                    setColF(c => {
                                        const n = {...c};
                                        delete n[cfT];
                                        return n;
                                    })
                                }
                            >
                                ברירת מחדל
                            </a>
                        ) : null}
                    </div>
                </div>
            ) : null}
            {pickT ? (
                <div className="hmenu open vmenu" data-cm={'vf:' + pickT} style={{position: 'fixed', left: Math.min(pickAt.x, window.innerWidth - 230), top: pickAt.y + 4}} onClick={e => e.stopPropagation()}>
                    <small className="vh">
                        {HE(pickT)} · {p.tableFilters?.[pickT]?.field} · בחתך בלבד
                    </small>
                    {(p.tableFilters?.[pickT]?.options ?? []).map(v => {
                        const on = (wPick[pickT] ?? []).includes(v);
                        return (
                            <div key={v} role="checkbox" aria-checked={on} className={`vi ${on ? 'on' : ''}`} onClick={() => setWPick(w => ({...w, [pickT]: on ? (w[pickT] ?? []).filter(x => x !== v) : [...(w[pickT] ?? []), v]}))}>
                                <span className="ck">{on ? '✓' : ''}</span>
                                {v}
                            </div>
                        );
                    })}
                    <div className="sepm" />
                    <div onClick={() => setWPick(w => ({...w, [pickT]: []}))}>נקה</div>
                </div>
            ) : null}
            {openDd === 'wf' ? (
                <div className="hmenu open vmenu wfmenu" data-cm="wf" style={{position: 'fixed', left: Math.max(4, Math.min(menuAt.x, window.innerWidth - 290)), top: menuAt.y + 4}} onClick={e => e.stopPropagation()}>
                    <small className="vh">סינון החתך · נוסף על הסינון של ציר הזמן</small>
                    <div className={`tog ${wNow ? 'on' : ''}`} role="switch" aria-checked={wNow} data-o="now" onClick={() => setWNow(v => !v)}>
                        <span className="sw" />
                        רק מה שמתרחש בשעה שבמרכז
                    </div>
                    <div className={`tog ${wNoCancel ? 'on' : ''}`} role="switch" aria-checked={wNoCancel} data-o="nocancel" onClick={() => setWNoCancel(v => !v)}>
                        <span className="sw" />
                        בלי בוטלים
                    </div>
                    <small className="vh">טבלאות בחתך</small>
                    {tables.map(t => {
                        const on = !wOff.has(t) && !wHide.has(t);
                        return (
                            <div
                                key={t}
                                className={`it ${on ? 'on' : ''}`}
                                data-t={t}
                                onClick={() => {
                                    if (on) setWOff(o => new Set([...o, t]));
                                    else {
                                        setWOff(o => new Set([...o].filter(x => x !== t)));
                                        setWHide(o => new Set([...o].filter(x => x !== t)));
                                    }
                                }}
                            >
                                <span className="ck">{on ? '✓' : ''}</span>
                                <i style={{background: C(t)}} />
                                {HE(t)}
                            </div>
                        );
                    })}
                    <small className="vh" data-o="hidden">👁 מוסתרות: {hiddenN}</small>
                    {items
                        .filter(i => hid.has(i.id))
                        .slice(0, 12)
                        .map(i => (
                            <div key={i.id} className="it hidr" data-id={i.id} title="הצגה מחדש" onClick={() => unhideRec(i.id)}>
                                <span className="ck">↺</span>
                                <i style={{background: C(i.table)}} />
                                {i.name}
                            </div>
                        ))}
                    <div className="act">
                        <span
                            data-o="clearall"
                            onClick={() => {
                                clearWin();
                                setOpenDd(null);
                            }}
                        >
                            נקה הכל
                        </span>
                    </div>
                </div>
            ) : null}
            {menuT ? (
                <div className="hmenu open" data-cm={'cm:' + menuT} style={{position: 'fixed', left: Math.min(menuAt.x, window.innerWidth - 170), top: menuAt.y + 4}} onClick={e => e.stopPropagation()} data-slot="Content_Text_12 · Tab_Label_2">
                    {(['top', 'up', 'down', 'bottom'] as MoveTo[]).map((k2, n) => (
                        <div
                            key={k2}
                            onClick={() => {
                                setOrder(o => moveColumn(o, menuT, k2));
                                setOpenDd(null);
                            }}
                        >
                            {menuL[n]}
                        </div>
                    ))}
                    <div className="sepm" />
                    <div
                        onClick={() => {
                            close(menuT);
                            setOpenDd(null);
                        }}
                    >
                        {menuL[4]}
                    </div>
                    <div
                        className={tables.length > 1 ? 'hide' : 'hide dis'}
                        title={tables.length > 1 ? 'מחזירים מ«תחומים»' : 'זו השורה האחרונה המוצגת'}
                        onClick={() => {
                            if (tables.length > 1) setShown(s0 => new Set([...s0].filter(x => x !== menuT)));
                            setOpenDd(null);
                        }}
                    >
                        הסתרה מהתצוגה
                    </div>
                </div>
            ) : null}
            {pop ? (
                <CreatePopover
                    key={`${pop.t}${pop.s}`}
                    req={pop}
                    label={HE(pop.t)}
                    color={C(pop.t)}
                    kind={specOf(pop.t)?.time ?? 'date'}
                    dayTitle={hDayTitle(dayOf(p.days, pop.s))}
                    dateText={popDateText(pop)}
                    nameWritable={!!p.writer?.nameWritable(pop.t)}
                    slots={slotChoices(p.items, pop.s, pop.e)}
                    busy={popBusy}
                    error={popErr}
                    texts={{title: T.Content_Text_10, create: T.Button_Text_5, slot: T.Content_Text_11}}
                    onCreate={doCreate}
                    onCancel={() => {
                        setPop(null);
                        setGhost(null);
                        setPopErr(null);
                    }}
                />
            ) : null}
            {undo ? <UndoToast key={undo.key} text={undo.text} undoLabel={T.Button_Text_6} onUndo={undo.run} onClose={() => setUndo(u => (u && u.key === undo.key ? null : u))} /> : null}
            <div className="ftr">
                <span className="ver" data-slot="Code_Version">{`טיימליין אופקי v${p.version}`}</span>
                <span>· {p.configNote}</span>
                <span>· {p.hiddenJunk} רשומות דמה/לא מקושרות מוסתרות</span>
                <span className="sp" />
                {p.notices.length ? (
                    <span className="warn" title={p.notices.join('\n')}>
                        ⚠ {p.notices.length}: {p.notices.join(' · ')}
                    </span>
                ) : null}
            </div>
        </div>
    );
}

/** v0.1.4 #8: the create-drag ghost — names the records it would clash with (red edge + «חופף ל-…»), drawn as its own lane strip */
function GhostBar(props: {t: string; a: number; b: number; u: (m: number) => number; rowH: number; label: string; clash: ReadonlyArray<{name: string}>}) {
    const {a, b, u, clash} = props;
    const n = clash.length;
    return (
        <div className={`ghost hghost ${n ? 'clash' : ''}`} data-clash={n} style={{right: u(a), width: Math.max(18, u(b) - u(a)), top: 3, height: props.rowH - 6}}>
            <b>{props.label}</b>
            <span>
                <Rng a={a} b={b} />
            </span>
            {n ? (
                <em className="hclash" title={clash.map(c => c.name).join('\n')}>
                    ⚠ חופף ל-{n === 1 ? clash[0].name : `${n} רשומות: ${clash[0].name}…`}
                </em>
            ) : null}
        </div>
    );
}

/** ONE inline control — native calendar date + 24-hour time, side by side */
function JumpControl(props: {days: Day[]; cur: number; label: string; onGo: (m: number | null) => void}) {
    const {days, cur} = props;
    const d = dayOf(days, cur);
    const curDate = d.date,
        curTime = fmt(Math.round(cur / 15) * 15);
    const [dv, setDv] = useState<string | null>(null);
    const [tv, setTv] = useState<string | null>(null);
    const date = dv ?? curDate,
        time = tv ?? curTime;
    const go = () => {
        props.onGo(jumpFrom(days, date, hhmm(time) ?? curTime));
        setDv(null);
        setTv(null);
    };
    const key = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') go();
        if (e.key === 'Escape') {
            setDv(null);
            setTv(null);
        }
    };
    return (
        <div className="jumpc" dir="ltr" onClick={e => e.stopPropagation()} data-slot="Button_Text_2 · Date_1–2">
            <input type="date" className="jd" aria-label="תאריך" value={date} min={days[0]?.date} max={days[days.length - 1]?.date} onChange={e => setDv(e.target.value)} onKeyDown={key} />
            {/* v0.1.4 #5: 24-hour text field (the native time input follows the OS locale → «01:00 PM») */}
            <input
                type="text"
                className="jt num"
                aria-label="שעה (24 שעות)"
                inputMode="numeric"
                maxLength={5}
                placeholder="HH:MM"
                value={time}
                onChange={e => setTv(e.target.value)}
                onBlur={() => tv !== null && setTv(hhmm(tv) ?? curTime)}
                onKeyDown={key}
            />
            <button className="bb jgo" onClick={go}>
                {props.label}
            </button>
        </div>
    );
}
