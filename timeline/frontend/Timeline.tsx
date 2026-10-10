/**
 * «טיימליין» — the CSF Days timeline UI (CUT 1, read-only core). Ported from the frozen A-v7 mockup.
 * Pure UI: gets ready-made days/items; no SDK imports here (the harness renders this same component).
 */
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {
    DAY_MIN,
    colourOf,
    fillOf,
    lineOf,
    sdkVars,
    type HexOf,
    anyFilter,
    assignLanes,
    bandSlice,
    lensPlan,
    bandLabel,
    keptCompress,
    colWidths,
    normalizeWidths,
    resizeWidth,
    wheelPx,
    gridHeight,
    winGridRows,
    winPass,
    winPills,
    passPicked,
    passCol,
    colCount,
    colDims,
    effectiveCF,
    normalizeCF,
    toggleColVal,
    type ColFilters,
    toggleIn,
    normalizeOff,
    keepCentre,
    band,
    bandPx,
    columnStates,
    dayBar,
    dayOf,
    emptyFilters,
    fmt,
    axisTicks,
    allCollapsed,
    canvasWidth,
    jumpFrom,
    nowLineM,
    nowTarget2,
    openTarget,
    layout,
    liveCounts,
    mergeLodging,
    nowTarget,
    overlaps,
    passes,
    phase,
    pxPerHour,
    stickyOffset,
    windowHits,
    yOf,
    type Day,
    type FacetKey,
    type FilterState,
    type Item,
    type ResStep,
    type Seg,
} from './logic/core';
import {CSS} from './styles';
import {CreatePopover, UndoToast, type CreateReq, type Writer} from './EditUi';
import {canEdit, dragRange, dropColumn, dropTarget, moveColumn, moveRange, planFields, resizeEnd, slotChoices, specOf, unitOf, type MoveTo, type Op} from './logic/edit';

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
    /** v0.2.3: SDK colour name → hex (colorUtils.getHexForColor in the block) */
    colorHex?: HexOf;
    /** v0.2.4: per-table value lists for the in-UI multi-select (select / link filter fields only) */
    tableFilters?: {[t: string]: {field: string; options: string[]}};
    /** v0.2.5: right pane / Filter_N defaults behind each column's funnel menu */
    colDefaults?: ColFilters;
    version: string;
    configNote: string;
    userKey: string;
    demo?: boolean;
    /** harness / tests: fixed "now" and initial view */
    initial?: {t?: number; nowMs?: number; wOpen?: boolean; open?: string; /** harness: open at "now" instead of 31.10 */ atNow?: boolean};
    /** v0.2.2: returns a reason when the record can't be opened (shown as a toast) */
    onOpenRecord?: (table: string, id: string) => string | null | void;
    /** v0.2.2: dates that exist in Festival Days (for the 31.10 open day) */
    festivalDates?: string[];
    /** v0.2.0 writes (create / move / resize); absent → read-only with a reason */
    writer?: Writer;
    /** Festival Days record id per date (auto-link on create) */
    dayIdByDate?: {[date: string]: string};
};

type Persist = {res?: number; collapse?: boolean; compress?: boolean; xs?: boolean; shown?: string[]; closed?: string[]; order?: string[]; widths?: {[t: string]: number}; /** v0.2.4: tables switched off in the cross-section */ wOff?: string[]; /** v0.2.4: per-table values picked for the cross-section */ wPick?: {[t: string]: string[]}; /** v0.2.5: per-column filters (user choice; absent table = right-pane default) */ colF?: ColFilters; /** v0.2.6: the user toggled «כווץ שעות ריקות» themselves */ compressUser?: boolean; /** v0.2.6: tables hidden from the window */ wHide?: string[]};
const LS = 'csf.timeline.v1.';
function loadPersist(key: string): Persist {
    try {
        const v = JSON.parse(localStorage.getItem(LS + key) || '{}');
        return v && typeof v === 'object' ? v : {};
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
const Rng = ({a, b}: {a: number; b: number}) => <bdi dir="ltr">{`${fmt(a)}–${fmt(b)}`}</bdi>;

export function Timeline(p: TimelineProps) {
    const T = p.texts;
    const allT = useMemo(() => p.columns.filter(c => c.available).map(c => c.key), [p.columns]);
    const COL = useMemo(() => Object.fromEntries(p.columns.map(c => [c.key, c])), [p.columns]);
    const HE = (t: string) => COL[t]?.label ?? t;
    const hexOf: HexOf = p.colorHex ?? (() => null);
    // v0.2.3: Option_List_6 colour = SDK fill name; the line (top bar, card border, dot, strip) is its <hue>Dark1
    const C = (t: string) => lineOf(COL[t]?.color || '', hexOf);
    const FILL = (t: string) => fillOf(COL[t]?.color || '', hexOf);
    const phaseBg = (k: 'fest' | 'prep' | 'wrap') => colourOf(p.phaseColors[k], hexOf, {fest: 'grayLight2', prep: 'cyanLight2', wrap: 'yellowLight2'}[k]);
    const saved = useMemo(() => loadPersist(p.userKey), [p.userKey]);

    const [res, setRes] = useState(() => (p.res.steps.some(s => s.min === saved.res) ? (saved.res as number) : p.res.def));
    const [collapseC, setCollapseC] = useState(() => (typeof saved.collapse === 'boolean' ? saved.collapse : p.toggles.collapse.def));
    // v0.2.6: compress defaults ON. Before v0.2.6 the value was saved even when never touched, so an old saved `false` is not a
    // choice; only a saved `true`, or any value the user set since v0.2.6 (compressUser), is kept.
    const [compressT, setCompressT] = useState(() => keptCompress(saved, p.toggles.compress.def));
    const [compressUser, setCompressUser] = useState(() => saved.compressUser === true);
    const [xs, setXs] = useState(() => (typeof saved.xs === 'boolean' ? saved.xs : p.toggles.xs.def));
    const [shown, setShown] = useState<Set<string>>(() => new Set(saved.shown?.filter(t => allT.includes(t)).length ? saved.shown.filter(t => allT.includes(t)) : allT));
    const [closed, setClosed] = useState<Set<string>>(() => new Set(saved.closed ?? []));
    const [forceOpen, setForceOpen] = useState<Set<string>>(() => new Set());
    const [colW, setColW] = useState<{[t: string]: number}>(() => normalizeWidths(saved.widths, allT));
    const rootRef = useRef<HTMLDivElement>(null);
    // v0.2.6: band names — the estimate picks orientation + size; this pass measures the real text and shrinks it until it fits
    // (min 9px); only then the ellipsis (full name on hover). Runs before paint on every render, so nothing flickers.
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        for (const n of root.querySelectorAll<HTMLElement>('.ev .lens .bn')) {
            const lens = n.parentElement as HTMLElement;
            lens.classList.toggle('clip', n.dataset.clip === '1'); // React may not reset a class it didn't change
            const over = () => n.scrollHeight > n.clientHeight + 2 || n.scrollWidth > n.clientWidth + 2;
            let fs = parseFloat(n.style.fontSize) || 14;
            while (over() && fs > 9) {
                fs -= 0.5;
                n.style.fontSize = fs + 'px';
            }
            n.dataset.fit = String(fs);
            if (over()) lens.classList.add('clip');
        }
    });
    // v0.2.3: the SDK palette (colorUtils) also on <html>, so :root tokens, html/body and fixed menus resolve the same colours
    const sdkCss = JSON.stringify(sdkVars(p.colorHex ?? (() => null)));
    useLayoutEffect(() => {
        const v = JSON.parse(sdkCss) as {[k: string]: string};
        for (const n in v) document.documentElement.style.setProperty(n, v[n]);
    }, [sdkCss]);
    const [order, setOrder] = useState<string[]>(() => {
        const o = (saved.order ?? []).filter(t => allT.includes(t));
        return [...o, ...allT.filter(t => !o.includes(t))];
    });
    const [F] = useState<FilterState>(emptyFilters); // v0.2.5: global facets retired (per-column now); kept empty for search + window code
    const [qIn, setQIn] = useState('');
    const [q, setQ] = useState('');
    // v0.2.4: the window follows the timeline; each user can switch tables off for the window only (saved)
    const [wOff, setWOff] = useState<Set<string>>(() => normalizeOff(saved.wOff, allT));
    // v0.2.6 (the owner 10:42): window pills get ⇤ (shrink to a strip at the far left = wOff) AND ✕ (hide from the window = wHide)
    const [wHide, setWHide] = useState<Set<string>>(() => normalizeOff(saved.wHide, allT));
    // v0.2.4 (the owner 09:21): the window's own filters ADD to the timeline's (AND); clearing them = exactly the timeline
    const [wPick, setWPick] = useState<{[t: string]: string[]}>(() =>
        Object.fromEntries(Object.entries(saved.wPick && typeof saved.wPick === 'object' ? saved.wPick : {}).filter(([t, v]) => allT.includes(t) && Array.isArray(v) && v.length).map(([t, v]) => [t, (v as unknown[]).filter((x): x is string => typeof x === 'string')])),
    );
    // v0.2.5 (the owner 09:20): filters live on each column header (funnel); the top-bar facet pills are gone
    const [colF, setColF] = useState<ColFilters>(() => normalizeCF(saved.colF, allT));
    const [cfDim, setCfDim] = useState<{[t: string]: string}>({});
    const CF = useMemo(() => effectiveCF(colF, p.colDefaults ?? {}, allT), [colF, p.colDefaults, allT]);
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
    const [scrollTop, setScrollTop] = useState(0);
    const [vpH, setVpH] = useState(600);
    const [gridH, setGridH] = useState(0);
    const [gutter, setGutter] = useState(0);
    const [vpW, setVpW] = useState(1200);
    const colsRef = useRef<HTMLDivElement>(null);
    const vpRef = useRef<HTMLDivElement>(null);
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
    const progY = useRef<number | null>(null);
    const lastSegs = useRef<Seg[] | null>(null);
    const userScrolled = useRef(false);

    useEffect(() => {
        savePersist(p.userKey, {res, collapse: collapseC, compress: compressT, xs, shown: [...shown], closed: [...closed], order, widths: colW, wOff: [...wOff], wHide: [...wHide], wPick, colF, compressUser});
    }, [p.userKey, res, collapseC, compressT, compressUser, xs, shown, closed, order, colW, wOff, wHide, wPick, colF]);

    // search debounce
    useEffect(() => {
        const id = setTimeout(() => setQ(qIn.trim()), 250);
        return () => clearTimeout(id);
    }, [qIn]);
    useEffect(() => {
        if (!toast) return;
        const id = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(id);
    }, [toast]);
    // click outside closes menus
    useEffect(() => {
        const h = (e: MouseEvent) => {
            const el = e.target as HTMLElement;
            if (!el.closest('.dd') && !el.closest('.jp') && !el.closest('#bJump') && !el.closest('.hmenu') && !el.closest('[data-cm]')) setOpenDd(null);
        };
        document.addEventListener('click', h);
        return () => document.removeEventListener('click', h);
    }, []);

    // ------------------------------------------------ data
    const label = useCallback((t: string) => HE(t), [COL]); // eslint-disable-line react-hooks/exhaustive-deps
    // v0.2.0: optimistic overrides (written, waiting for the records to update) + live drag preview
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
    const [ghost, setGhost] = useState<{t: string; a: number; b: number} | null>(null);
    const [pop, setPop] = useState<CreateReq | null>(null);
    const [popErr, setPopErr] = useState<string | null>(null);
    const [popBusy, setPopBusy] = useState(false);
    const [undo, setUndo] = useState<{key: number; text: string; run: () => void} | null>(null);
    const [colDrag, setColDrag] = useState<{t: string; x: number; y: number; before: string | null; lineX: number | null} | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [menuAt, setMenuAt] = useState({x: 0, y: 0});
    const passQ = useCallback((i: Item) => passes(i, F, q, label(i.table)), [F, q, label]);
    const passT = useCallback((i: Item) => passQ(i) && passCol(i, CF), [passQ, CF]);
    const filtered = useMemo(() => items.filter(passT), [items, passT]);
    const timed = useMemo(() => filtered.filter(i => i.s !== null && i.e !== null), [filtered]);
    const allday = useMemo(() => filtered.filter(i => i.s === null), [filtered]);
    const tables = useMemo(() => order.filter(t => shown.has(t)), [order, shown]);
    const pxh = pxPerHour(gridH || vpH, res);
    const lay = useMemo(() => layout(p.days, timed, allday, tables, {compress: compressT, pxh}), [p.days, timed, allday, tables, compressT, pxh]);
    const segs = lay.segs;
    const lodgeHotels = useMemo(() => [...new Set(items.filter(i => i.table === 'Lodging').map(i => i.hotel || ''))].sort(), [items]);

    // ------------------------------------------------ scroll / size
    useLayoutEffect(() => {
        const vp = vpRef.current;
        if (!vp) return;
        let lastH = vp.clientHeight;
        const measure = () => {
            // v0.2.4: the window slides open/closed in the flow → the viewport height changes; keep the centre time put
            if (vp.clientHeight !== lastH && lastH > 0) {
                vp.scrollTop = keepCentre(vp.scrollTop, lastH, vp.clientHeight);
                progY.current = vp.scrollTop;
            }
            lastH = vp.clientHeight;
            setVpH(vp.clientHeight);
            setVpW(vp.clientWidth);
            setGutter(vp.offsetWidth - vp.clientWidth);
            // v0.2.1: the zoom (px per hour) follows a STABLE height: grid + cross-section window − a 1-row window,
            // so the window growing/shrinking while you scroll never rescales the grid
            const wh = (rootRef.current?.querySelector('.win') as HTMLElement | null)?.offsetHeight ?? 0;
            setGridH(gridHeight(vp.clientHeight, wh));
        };
        const ro = new ResizeObserver(measure);
        ro.observe(vp);
        measure();
        return () => ro.disconnect();
    }, []);
    // v0.2.1: the wheel anywhere on the element scrolls the time grid (header / filters / window stay put);
    // inside the grid the browser scrolls natively. Non-passive so the Airtable page never gets it.
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const h = (e: WheelEvent) => {
            const vp = vpRef.current;
            const el = e.target as HTMLElement;
            if (!vp || el.closest('.vp')) return;
            const sc = el.closest('.menu,.wpanel,.cp,.hmenu,.jp') as HTMLElement | null;
            if (sc && sc.scrollHeight > sc.clientHeight) return; // a scrollable menu keeps its own wheel
            const d = wheelPx(e.deltaY, e.deltaMode, vp.clientHeight);
            if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) vp.scrollLeft += e.shiftKey ? d : wheelPx(e.deltaX, e.deltaMode, vp.clientWidth);
            else vp.scrollTop += d;
            e.preventDefault();
        };
        root.addEventListener('wheel', h, {passive: false});
        return () => root.removeEventListener('wheel', h);
    }, []);
    const goTo = useCallback((m: number) => {
        pendingGo.current = m;
        curT.current = m;
        const vp = vpRef.current;
        if (!vp) return;
        vp.scrollTop = yOf(segs, m) - vp.clientHeight / 2;
        progY.current = vp.scrollTop;
        setScrollTop(vp.scrollTop);
        pendingGo.current = null;
    }, [segs]);
    // keep the time at the centre when the layout changes (resolution, compress, filters)
    useLayoutEffect(() => {
        const vp = vpRef.current;
        if (!vp || !segs.length) return;
        // after the user has scrolled, a pure height change (window content) must not jump the grid
        if (segs === lastSegs.current && userScrolled.current && pendingGo.current === null) return;
        lastSegs.current = segs;
        const m = pendingGo.current ?? curT.current;
        const h = vp.clientHeight;
        if (h && h !== vpH) setVpH(h); // window/banner height settled after this render → one more pass with matching segs
        vp.scrollTop = yOf(segs, m) - h / 2;
        progY.current = vp.scrollTop;
        setScrollTop(vp.scrollTop);
        pendingGo.current = null;
    }, [segs, vpH]);
    const onScroll = () => {
        const vp = vpRef.current;
        if (!vp) return;
        if (colsRef.current) colsRef.current.scrollLeft = vp.scrollLeft;
        requestAnimationFrame(() => {
            setScrollTop(vp.scrollTop);
            // a scroll we caused ourselves keeps the intended centre time (layout may still be settling)
            if (progY.current !== null && Math.abs(vp.scrollTop - progY.current) < 2) return;
            progY.current = null;
            userScrolled.current = true;
            curT.current = mAt(vp.scrollTop + vp.clientHeight / 2);
        });
    };
    segsRef.current = segs;
    const mAt = (y: number) => {
        const segs = segsRef.current;
        for (const s of segs) if (y >= s.y && y < s.y + s.h) return s.t1 > s.t0 ? s.t0 + ((y - s.y) / s.h) * (s.t1 - s.t0) : s.t0;
        return segs.length ? segs[segs.length - 1].t1 : 0;
    };
    // v0.2.6: while the scroll position is one we set (עכשיו / קפיצה / layout keep), the centre IS the intended minute —
    // with «כווץ שעות ריקות» ON a compressed pixel spans many minutes, so reading it back would drift (12:00 → 12:04)
    const centreT = !segs.length ? curT.current : progY.current !== null && Math.abs(scrollTop - progY.current) < 2 ? curT.current : mAt(scrollTop + vpH / 2);
    const k = Math.max(0, Math.min(p.days.length - 1, Math.floor(centreT / DAY_MIN)));
    const [ba, bb] = segs.length ? band(segs, scrollTop, vpH, p.numbers.bandFrac) : [0, 0];
    const bpx = bandPx(vpH, p.numbers.bandFrac);
    // v0.2.3: is the current day's all-day row on screen? (all-day-only columns strip away when it isn't)
    const adSeg = segs.find(s => s.kind === 'all' && s.k === k);
    const allDayInView = !adSeg || (adSeg.y < scrollTop + vpH && adSeg.y + adSeg.h > scrollTop);
    const cs = useMemo(
        () => columnStates(k, p.days, tables, timed, allday, {closed, forceOpen, collapseEmpty: collapseC, hotels: lodgeHotels.length, allDayInView}),
        [k, p.days, tables, timed, allday, closed, forceOpen, collapseC, lodgeHotels.length, allDayInView],
    );
    const counts = segs.length ? liveCounts(segs, timed, scrollTop, scrollTop + vpH) : {};
    const day = p.days.length ? dayOf(p.days, centreT) : null;
    const fl = p.numbers.festLen;
    const words = {prep: T.Heading_2, fest: T.Heading_3, wrap: T.Heading_4};

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

    // ------------------------------------------------ v0.2.0 interactions
    const canvasY = (clientY: number) => clientY - (canvasRef.current?.getBoundingClientRect().top ?? 0);
    const mAtY = (y: number) => mAt(y);
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
    /** drag on empty column space → ghost → popover */
    const colBgDown = (e: React.PointerEvent, t: string) => {
        if (e.button !== 0 || cs[t]?.collapsed) return;
        const el = e.target as HTMLElement;
        if (el.closest('.ev,.lbar,.chip,.ghost,.cp')) return;
        const y0 = canvasY(e.clientY);
        let moved = false;
        const mv = (ev: PointerEvent) => {
            const y = canvasY(ev.clientY);
            if (!moved && Math.abs(y - y0) < 6) return;
            if (!moved) {
                moved = true;
                const w = why(t, 'create');
                if (w) {
                    say(`אי אפשר ליצור כאן: ${w}`);
                    stop();
                    return;
                }
            }
            const r = dragRange(mAtY(y0), mAtY(y));
            setGhost({t, a: r.s, b: r.e});
        };
        const up = (ev: PointerEvent) => {
            stop();
            if (!moved) return;
            const r = dragRange(mAtY(y0), mAtY(canvasY(ev.clientY)));
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
    /** move (drag the card) / resize (drag the bottom handle); a click without movement opens the record */
    const cardDown = (e: React.PointerEvent, i: Item, op: 'move' | 'resize') => {
        if (e.button !== 0 || i.s === null || i.e === null) return;
        e.stopPropagation();
        const y0 = canvasY(e.clientY);
        const m0 = mAtY(y0);
        const unit = unitOf(i.table);
        let moved = false,
            blocked = false;
        let r = {s: i.s, e: i.e};
        const mv = (ev: PointerEvent) => {
            const y = canvasY(ev.clientY);
            if (!moved && Math.abs(y - y0) < 5) return;
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
            const dm = mAtY(y) - m0;
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
    /** v0.2.1: drag the header's left edge to set the column width (saved per user), double-click resets */
    const resetW = (t: string) =>
        setColW(w => {
            const n = {...w};
            delete n[t];
            return n;
        });
    const rszDown = (e: React.PointerEvent, t: string) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        const x0 = e.clientX,
            w0 = CW.w[t] ?? 140;
        let moved = false;
        const mv = (ev: PointerEvent) => {
            if (!moved && Math.abs(ev.clientX - x0) < 3) return;
            moved = true;
            setColW(w => ({...w, [t]: resizeWidth(w0, ev.clientX - x0)}));
        };
        const up = () => {
            window.removeEventListener('pointermove', mv);
            window.removeEventListener('pointerup', up);
            document.body.classList.remove('tl-resizing');
        };
        document.body.classList.add('tl-resizing');
        window.addEventListener('pointermove', mv);
        window.addEventListener('pointerup', up);
    };
    /** ⠿ drag: reorder columns (saved per user) */
    const colDown = (e: React.PointerEvent, t: string) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        const boxes = () =>
            [...(colsRef.current?.querySelectorAll<HTMLElement>(':scope > [data-t]') ?? [])]
                .filter(el => !el.classList.contains('cz'))
                .map(el => {
                    const b = el.getBoundingClientRect();
                    return {t: el.dataset.t as string, left: b.left, right: b.right};
                });
        let before: string | null = null;
        const mv = (ev: PointerEvent) => {
            const bx = boxes();
            before = dropTarget(bx, ev.clientX);
            const host = colsRef.current?.getBoundingClientRect().left ?? 0;
            const tgt = bx.find(b => b.t === before);
            const lineX = tgt ? tgt.right - host : bx.length ? bx[bx.length - 1].left - host : null;
            setColDrag({t, x: ev.clientX, y: ev.clientY, before, lineX});
        };
        const up = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', mv);
            window.removeEventListener('pointerup', up);
            setColDrag(null);
            const bx = boxes();
            if (!bx.length || ev.clientX < Math.min(...bx.map(b => b.left)) - 40) return;
            setOrder(o => dropColumn(o, t, before));
        };
        window.addEventListener('pointermove', mv);
        window.addEventListener('pointerup', up);
        setColDrag({t, x: e.clientX, y: e.clientY, before: null, lineX: null});
    };

    // ------------------------------------------------ render pieces
    const anyF = anyFilter(F, q) || Object.keys(CF).length > 0;
    const M = items.filter(i => shown.has(i.table)).length;
    const N = filtered.filter(i => shown.has(i.table)).length;
    const ddCls = (id: string, extra = '') => `dd ${extra} ${openDd === id ? 'open' : ''}`;
    const ddBtn = (id: string) => (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpenDd(o => (o === id ? null : id));
    };
    const resLabel = (p.res.steps.find(s => s.min === res)?.label ?? '') + ' במסך';

    // canvas
    const grid: ReactNode[] = [];
    const axis: ReactNode[] = [];
    const tops: ReactNode[] = [];
    const chips: {[t: string]: ReactNode[]} = {};
    tables.forEach(t => (chips[t] = []));
    segs.forEach((s, si) => {
        if (s.kind === 'hr') {
            // v0.2.2: lines + labels come from ONE tick list (axisTicks) below
        } else if (s.kind === 'day') {
            const d = p.days[s.k];
            const b = dayBar(d, fl, words);
            tops.push(
                <div key={`d${si}`} className={`dayh ${phase(d.n, fl)}`} style={{top: s.y, height: s.h, background: phaseBg(phase(d.n, fl))}} data-slot={si === 0 ? 'Heading_2' : undefined}>
                    <span className="dn">{b.t}</span>
                    <span className="ds">{b.s}</span>
                </div>,
            );
        } else if (s.kind === 'all') {
            grid.push(<div key={`al${si}`} className="alld" style={{top: s.y, height: s.h}} />);
            axis.push(
                <div key={`aa${si}`} className="hlab" style={{top: s.y + 10, fontSize: 10.5}}>
                    {T.Content_Text_2}
                </div>,
            );
            tables.forEach(t =>
                s.per[t].forEach((i, r) =>
                    chips[t].push(
                        <div
                            key={`c${si}${i.id}`}
                            className={`chip ${i.flag === 'cancel' ? 'cancel' : ''}`}
                            title={i.name}
                            style={{top: s.y + 3 + r * 21, borderColor: C(t)}}
                            onClick={() => openRec(t, i.id)}
                        >
                            {i.name}
                            {i.part}
                            {i.sub ? ' · ' + i.sub : ''}
                        </div>,
                    ),
                ),
            );
        } else if (s.kind === 'cmp') {
            grid.push(
                <div key={`cm${si}`} className="cmp" style={{top: s.y, height: s.h}}>
                    <span>
                        {s.n === 24 ? (
                            'יממה בלי אירועים'
                        ) : (
                            <>
                                {s.n} שעות ריקות · <Rng a={s.t0} b={s.t1} />
                            </>
                        )}
                    </span>
                </div>,
            );
            axis.push(
                <div key={`ac${si}`} className="hlab cmpl" style={{top: s.y + s.h / 2}}>
                    ≈
                </div>,
            );
        }
    });

    // v0.2.2: one tick list → grid line i and label i share the same y (same count at every resolution)
    axisTicks(segs, pxh).forEach(tk => {
        grid.push(<div key={`g${tk.m}`} className={`hl ${tk.hour ? '' : 'half'}`} data-tick={tk.m} style={{top: tk.y}} />);
        axis.push(
            <div key={`a${tk.m}`} className={`hlab ${tk.hour ? '' : 'sub'}`} data-tick={tk.m} style={{top: tk.y}}>
                <bdi dir="ltr">{tk.label}</bdi>
            </div>,
        );
    });
    const colBody = (t: string): ReactNode[] => {
        if (t === 'Lodging') return lodgeBars(timed.filter(i => i.table === t));
        return assignLanes(timed.filter(i => i.table === t)).map(({item: i, lane, lanes}) => {
            const y0 = yOf(segs, i.s as number),
                y1 = yOf(segs, i.e as number),
                w = 100 / lanes,
                h = Math.max(20, y1 - y0 - 1);
            const sl = xs ? bandSlice(y0, h, scrollTop + bpx.top, scrollTop + bpx.top + bpx.height) : null;
            const lp = lensPlan(sl, h);
            const bl = lp ? bandLabel(i.name, (CW.w[t] ?? 140) / lanes - 6, lp.minH, lanes) : null;
            const m = false;
            const off = stickyOffset(y0, h, scrollTop, 17);
            return (
                <div
                    key={i.id}
                    className={`ev ${i.inherited ? 'inh' : ''} ${m ? 'mag' : ''} ${lp?.head ? 'lenshead' : ''} ${i.flag === 'cancel' ? 'cancel' : ''}`}
                    title={`${i.name}${i.inherited ? ' · הזמן נקבע לפי המשבצת' : ''}`}
                    style={{top: y0, height: h, right: `calc(${lane * w}% + 3px)`, width: `calc(${w}% - 6px)`, ['--tint' as string]: FILL(t), borderInlineStartColor: C(t)} as CSSProperties}
                    onPointerDown={e => cardDown(e, i, (e.target as HTMLElement).classList.contains('rz') ? 'resize' : 'move')}
                    data-id={i.id}
                >
                    <b className={`open ${off ? 'pinned' : ''}`} title="פתיחת הרשומה" style={off ? {transform: `translateY(${off}px)`} : undefined}>
                        {i.name}
                    </b>
                    <small>
                        <Rng a={i.s as number} b={i.e as number} />
                        {i.inherited ? ' · זמן לפי המשבצת' : ''}
                        {i.sub && !/זמן לפי המשבצת/.test(i.sub) ? ' · ' + i.sub : ''}
                    </small>
                    {canEdit(t, 'resize').ok ? <i className="rz" title="גררו לשינוי משך" /> : null}
                    {lp ? (
                        // v0.2.6 (the owner 10:36): inside the band ONLY the name, magnified; vertical + smaller when crowded; ellipsis last
                        <div className={`lens ${lp.head ? 'head' : ''} ${bl?.mode === 'v' ? 'vert' : 'hor'} ${bl?.clip ? 'clip' : ''}`} style={{top: lp.top, height: lp.minH}} title={i.name}>
                            <b className="bn" data-mode={bl?.mode} data-fs={bl?.fs} data-clip={bl?.clip ? '1' : '0'} style={{fontSize: bl?.fs, WebkitLineClamp: bl?.lines} as CSSProperties}>
                                {i.name}
                            </b>
                        </div>
                    ) : null}
                </div>
            );
        });
    };
    function lodgeBars(stays: Item[]): ReactNode[] {
        const nh = Math.max(1, lodgeHotels.length),
            w = 100 / nh;
        const out: ReactNode[] = [];
        mergeLodging(stays).forEach((c, ci) => {
            const hi = Math.max(0, lodgeHotels.indexOf(c.hotel));
            const y0 = yOf(segs, c.s),
                y1 = yOf(segs, c.e);
            const inner: ReactNode[] = [];
            c.segs.forEach((sg, kk) => {
                const sy = yOf(segs, sg.a) - y0,
                    sh = yOf(segs, sg.b) - yOf(segs, sg.a);
                const padTop = sg.checkins * 16 + 4;
                const stackH = 15 * (sg.guests.length + 2);
                const off = stickyOffset(y0 + sy, sh, scrollTop, stackH, padTop);
                const stTop = y0 + sy + padTop + off;
                const m = xs && stTop >= scrollTop + bpx.top && stTop < scrollTop + bpx.top + bpx.height && sg.a < bb && sg.b > ba;
                inner.push(
                    <div key={`s${kk}`} className={`lseg ${m ? 'mag' : ''}`} style={{top: sy, height: sh, paddingTop: padTop}}>
                        {kk ? <i className="lsl" /> : null}
                        <div className={`stk ${off ? 'pinned' : ''}`} style={off ? {transform: `translateY(${off}px)`} : undefined}>
                            <span className="lh">{c.hotel}</span>
                            <span className="lc num">{sg.guests.length} במלון</span>
                            {sg.guests.map(g => (
                                <span key={g.id} className={`lg ${g.s === sg.a ? 'new' : ''}`} title={`${g.guest} · גררו להזזת השהייה בימים`} onPointerDown={e => cardDown(e, g, 'move')}>
                                    {g.guest}
                                </span>
                            ))}
                        </div>
                    </div>,
                );
            });
            c.times.forEach(tm => {
                const y = yOf(segs, tm) - y0;
                c.stays
                    .filter(i => i.s === tm)
                    .forEach((i, n) =>
                        inner.push(
                            <div key={`in${i.id}`} className="lm in" style={{top: y + 2 + n * 16}} title={`צ׳ק-אין · ${i.guest} · ${fmt(tm)}`}>
                                ↓ {i.guest} <bdi dir="ltr">{fmt(tm)}</bdi>
                            </div>,
                        ),
                    );
                const outs = c.stays.filter(i => i.e === tm);
                outs.forEach((i, n) =>
                    inner.push(
                        <div key={`out${i.id}`} className="lm out" style={{top: y - 2 - (outs.length - n) * 16}} title={`צ׳ק-אאוט · ${i.guest} · ${fmt(tm)}`}>
                            ↑ {i.guest} <bdi dir="ltr">{fmt(tm)}</bdi>
                        </div>,
                    ),
                );
            });
            out.push(
                <div
                    key={`lb${ci}`}
                    className="lbar"
                    data-hotel={c.hotel}
                    title={`${c.hotel} · ${c.stays.length} שהיות`}
                    style={{top: y0, height: Math.max(24, y1 - y0), right: `calc(${hi * w}% + 3px)`, width: `calc(${w}% - 6px)`}}
                >
                    {inner}
                </div>,
            );
        });
        return out;
    }

    // window (cross-section)
    const wShown = new Set([...shown].filter(t => !wHide.has(t)));
    const wpass = (i: Item) => winPass(i, passT, wShown, wOff) && passPicked(i, wPick);
    const wSrc = filtered;
    const hits = windowHits(wSrc, ba, bb, order, i => wpass(i));
    // the pills list what the window can show: timed items in the slice (all-day chips are not window cards)
    const pills = winPills(wSrc.filter(i => i.s !== null && overlaps(i, ba, bb) && passT(i) && passPicked(i, wPick)), order, wShown, wOff, new Set(Object.keys(wPick).filter(t => wPick[t]?.length)));
    const wAny = pills.some(x => !x.on) || wHide.size > 0 || Object.values(wPick).some(v => v.length);
    const clearWin = () => {
        setWOff(new Set());
        setWHide(new Set());
        setWPick({});
    };
    const pickT = openDd?.startsWith('vf:') ? openDd.slice(3) : null;
    const cfT = openDd?.startsWith('cf:') ? openDd.slice(3) : null;
    const canF = (t: string) => colCount(CF[t]) > 0 || items.some(i => i.table === t && (i.hall.length || i.people.length || i.films.length || i.st || (i.fx && Object.keys(i.fx).length)));
    const cfDims = cfT ? colDims(items.filter(i => i.table === cfT), CF[cfT], p.facetLabels, passQ) : [];
    const cfCur = cfDims.find(d => d.key === (cfT && cfDim[cfT])) ?? cfDims.find(d => CF[cfT ?? '']?.[d.key]?.vals.length) ?? cfDims[0];
    const wRows = winGridRows(p.numbers.maxCards);
    const maxCards = hits.length > p.numbers.maxCards ? p.numbers.maxCards - 1 : p.numbers.maxCards;
    const wEmpty = xs && hits.length === 0;
    const curMin = centreT;

    const menuT = openDd?.startsWith('cm:') ? openDd.slice(3) : null;
    const menuL = [...(T.Content_Text_12 || '').split('|').map(x => x.trim()), '', '', '', '', ''].map((x, n) => x || ['להתחלה', 'הזז ימינה', 'הזז שמאלה', 'לסוף', 'סגור עמודה'][n] || '');
    const CW = colWidths(tables, cs, vpW, {strip: p.numbers.strip, fixed: colW});
    const colStyle = (t: string): CSSProperties => ({['--c' as string]: C(t), flex: `0 0 ${CW.w[t] ?? p.numbers.strip}px`, width: CW.w[t]}) as CSSProperties;
    const colCls = (t: string) => {
        const st = cs[t];
        if (!st) return '';
        return `${st.collapsed ? 'cz' : ''} ${st.auto ? 'auto' : ''} ${st.allDayOnly ? 'adonly' : ''}`;
    };
    const stripTitle = (t: string) => {
        const st = cs[t];
        if (!st?.collapsed) return undefined;
        return st.manual ? `${HE(t)} · ${st.count} פריטים היום · ${T.Helper_Text_4}` : st.adHidden ? `${HE(t)} · ${st.count} פריטי כל-היום בראש היום (גללו למעלה או לחצו לפתיחה)` : `${HE(t)} · ${T.Helper_Text_5}`;
    };

    return (
        <div ref={rootRef} className={`tl ${xs ? '' : 'nox'} ${wEmpty ? 'wempty' : ''}`} dir="rtl" style={{['--strip' as string]: `${p.numbers.strip}px`, ...sdkVars(hexOf), ['--fest' as string]: phaseBg('fest'), ['--prep' as string]: phaseBg('prep'), ['--wrap' as string]: phaseBg('wrap')} as CSSProperties}>
            <style>{CSS}</style>
            {/* ---------------- top row ---------------- */}
            <div className="top" id="top">
                <h1 className="ptl" data-slot="Title">
                    {T.Title} {p.demo ? <span className="demo">DEMO</span> : null}
                </h1>
                <div className={ddCls('res', 'res')} data-slot="Dropdown_3 · Option_List_3">
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
                <div className={ddCls('view')} data-slot="Tab_Label_1">
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
                {/* v0.2.5: no facet pills here any more — each column header has its own funnel */}
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
                {/* v0.2.4 (the owner 09:16): big day + time in the CENTRE, crimson */}
                <div className="ctr" data-slot="Heading_3 · Date_3 (מרכז · קרימזון)">
                    <span className="big">{day ? dayBar(day, fl, words).t : ''}</span>
                    <span className="clock num">
                        <bdi dir="ltr">{fmt(curMin)}</bdi>
                    </span>
                    <small>{day ? dayBar(day, fl, words).s : ''}</small>
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
                    {/* v0.2.4: table pills — the tables that have items in the slice; click = on/off for the window (saved per user) */}
                    <span className="wpills" data-slot="Content_Text_9 (טבלאות בחתך)">
                        {pills.length ? <small className="wpl">{T.Content_Text_9}</small> : null}
                        {pills.filter(x => x.on).map(x => {
                            const opts = p.tableFilters?.[x.t]?.options ?? [];
                            const pk = wPick[x.t] ?? [];
                            return (
                                <span key={x.t} data-t={x.t} className={`wp1 on ${pk.length ? 'pk' : ''}`} title={`${HE(x.t)} · מוצג בחתך${pk.length ? ' · מסונן: ' + pk.join(', ') : ''}`} style={{['--c' as string]: C(x.t), ['--f' as string]: FILL(x.t)} as CSSProperties}>
                                    {HE(x.t)}
                                    <span className="c num">{x.n}</span>
                                    {/* same order + style as the column headers: filter · shrink · ✕ */}
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
                                    <a className="sh" title={`כיווץ ${HE(x.t)} לפס בצד שמאל (לחיצה על הפס מחזירה)`} onClick={() => setWOff(o => toggleIn(o, x.t))}>
                                        ⇤
                                    </a>
                                    <a className="x" title={`הסתרת ${HE(x.t)} מהחתך («הכל» מחזיר)`} onClick={() => setWHide(o => toggleIn(o, x.t))}>
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
                        {/* switched-off tables collapse to the left end, like the side strips; click = back on */}
                        <span className="woff">
                            {pills.filter(x => !x.on).map(x => (
                                <span key={x.t} data-t={x.t} role="switch" aria-checked={false} className="wp1 off" title={`${HE(x.t)} · מכווץ בחתך (${x.n}) · לחצו להרחבה`} style={{['--c' as string]: C(x.t)} as CSSProperties} onClick={() => setWOff(o => toggleIn(o, x.t))}>
                                    <span className="ab">{HE(x.t).slice(0, 2)}</span>
                                    <span className="c num">{x.n}</span>
                                </span>
                            ))}
                        </span>
                    </span>
                    <span className="wemp">
                        {!xs ? '· כבוי · הפעילו כדי לראות מה קורה באמצע המסך' : wEmpty ? (
                            wAny ? (
                                <>· {T.Empty_State_Text_3} · <a onClick={clearWin}>הכל</a></>
                            ) : anyF && !filtered.length ? (
                                <>· {T.Empty_State_Text_1} · <a onClick={() => clearF()}>נקה</a></>
                            ) : (
                                `· ${T.Empty_State_Text_2}`
                            )
                        ) : null}
                    </span>
                </div>
                {/* v0.2.4: in the flow — opening slides the headers + grid down (never covers them); fixed rows while on, so scrolling never moves the grid */}
                <div className="wslide">
                <div className="wg" data-slot="Number_2 (מקס׳ כרטיסים)" style={{gridTemplateRows: `repeat(${wRows}, var(--wcH))`}}>
                    {hits.slice(0, maxCards).map((i, n) => (
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
                        </div>
                    ))}
                    {hits.length > maxCards ? <div className="wc more">+{hits.length - maxCards} עוד בחתך</div> : null}
                </div>
                </div>
            </div>

            {/* ---------------- column headers ---------------- */}
            <div className="cols" ref={colsRef} style={{paddingLeft: gutter}}>
                <div className="ax" data-slot="Table_Heading_1">
                    {T.Table_Heading_1}
                </div>
                {tables.map(t => (
                    <div key={t} data-t={t} className={colCls(t)} style={colStyle(t)} title={stripTitle(t)} onClick={() => cs[t]?.collapsed && reopen(t)} data-slot={t === tables[0] ? 'Option_List_6 (תווית · צבע)' : cs[t]?.collapsed && t === tables.filter(x => cs[x]?.collapsed)[0] ? 'Toggle_1 · Helper_Text_4–5 · Number_3' : undefined}>
                        <span
                            className="hd2"
                            title={T.Helper_Text_7}
                            tabIndex={0}
                            onPointerDown={e => colDown(e, t)}
                            onKeyDown={e => {
                                const to = ({ArrowRight: 'up', ArrowLeft: 'down', Home: 'top', End: 'bottom'} as {[k: string]: MoveTo})[e.key];
                                if (to) {
                                    e.preventDefault();
                                    setOrder(o => moveColumn(o, t, to));
                                }
                            }}
                            data-slot={t === tables[0] ? 'Helper_Text_7 (⠿ · per user)' : undefined}
                        >
                            ⠿
                        </span>
                        <span className="nmh">{HE(t)}</span>
                        {t === 'Lodging' ? (
                            <span className="ldf num" title={(T.Helper_Text_6 || '').replace('{in}', p.lodge.in).replace('{out}', p.lodge.out)} data-slot="Helper_Text_6 · Table_Heading_2–3">
                                ב״מ <bdi dir="ltr">↓{p.lodge.in} ↑{p.lodge.out}</bdi>
                            </span>
                        ) : null}
                        <span className="vc num" title="רשומות שנראות כרגע במסך">
                            {counts[t] || 0}
                        </span>
                        {!cs[t]?.collapsed ? (
                            <a
                                className={`cf2 ${colCount(CF[t]) ? 'act' : ''} ${canF(t) ? '' : 'dis'}`}
                                role="button"
                                aria-label={`סינון ${HE(t)}`}
                                aria-disabled={!canF(t)}
                                title={!canF(t) ? `אין בטבלה ${HE(t)} שדות בחירה/קישור עם ערכים לסינון` : colCount(CF[t]) ? `סינון ${HE(t)} · ${colCount(CF[t])} ערכים פעילים` : `סינון ${HE(t)}`}
                                data-cm={'cf:' + t}
                                data-slot={t === tables[0] ? 'Filter_N / חלונית ימנית (ברירת מחדל) · per user' : undefined}
                                onClick={e => {
                                    e.stopPropagation();
                                    if (!canF(t)) return;
                                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    setMenuAt({x: r.left, y: r.bottom});
                                    setOpenDd(o => (o === 'cf:' + t ? null : 'cf:' + t));
                                }}
                            >
                                <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                                    <path d="M1.5 2h13l-5 6.2V13l-3 1.5V8.2z" fill={colCount(CF[t]) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                                </svg>
                                {colCount(CF[t]) ? <b className="num">{colCount(CF[t])}</b> : null}
                            </a>
                        ) : null}
                        {!cs[t]?.collapsed ? (
                            <span
                                className={`rsz ${colW[t] !== undefined ? 'set' : ''}`}
                                role="separator"
                                aria-orientation="vertical"
                                aria-label={`רוחב ${HE(t)}`}
                                aria-valuenow={CW.w[t]}
                                tabIndex={0}
                                title={T.Helper_Text_8}
                                data-slot={t === tables[0] ? 'Helper_Text_8 (רוחב · per user)' : undefined}
                                onPointerDown={e => rszDown(e, t)}
                                onClick={e => e.stopPropagation()}
                                onDoubleClick={e => {
                                    e.stopPropagation();
                                    resetW(t);
                                }}
                                onKeyDown={e => {
                                    const step = e.shiftKey ? 60 : 20;
                                    const cur = CW.w[t] ?? 140;
                                    if (e.key === 'ArrowLeft') setColW(w => ({...w, [t]: resizeWidth(cur, -step)}));
                                    else if (e.key === 'ArrowRight') setColW(w => ({...w, [t]: resizeWidth(cur, step)}));
                                    else if (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Escape') resetW(t);
                                    else return;
                                    e.preventDefault();
                                }}
                            />
                        ) : null}
                        {/* v0.2.6: ⇤ (shrink to strip) · ⋯ menu right next to ✕ (hide) — one control group at the end edge, same on every table */}
                        <span className="hgrp" data-slot={t === tables[0] ? '⇤ · Tab_Label_2 (⋯) · ✕ (קבוצה אחת)' : undefined}>
                            <a
                                className="sh"
                                title={`כיווץ ${HE(t)} לפס בצד שמאל (לחיצה על הפס פותחת)`}
                                data-slot={t === tables[0] ? 'Toggle_1 (⇤ כיווץ לפס)' : undefined}
                                onClick={e => {
                                    e.stopPropagation();
                                    close(t);
                                }}
                            >
                                ⇤
                            </a>
                            <a
                                className="cm2"
                                title={T.Tab_Label_2}
                                data-cm={t}
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
                                className={`cx ${tables.length > 1 ? '' : 'dis'}`}
                                aria-disabled={tables.length <= 1}
                                title={tables.length > 1 ? `הסתרת ${HE(t)} מהתצוגה (מחזירים מ«תחומים»)` : 'זו העמודה האחרונה המוצגת — אי אפשר להסתיר אותה'}
                                onClick={e => {
                                    e.stopPropagation();
                                    if (tables.length > 1) setShown(s0 => new Set([...s0].filter(x => x !== t)));
                                }}
                            >
                                ✕
                            </a>
                        </span>
                    </div>
                ))}
                {colDrag && colDrag.lineX !== null ? <div className="dropline2" style={{left: colDrag.lineX}} /> : null}
            </div>
            {colDrag ? (
                <div className="cghost" style={{['--c' as string]: C(colDrag.t), left: colDrag.x - 60, top: colDrag.y - 17} as CSSProperties}>
                    <span style={{color: 'var(--sdk-gray)'}}>⠿</span>
                    <i style={{background: C(colDrag.t)}} />
                    {HE(colDrag.t)}
                </div>
            ) : null}

            {/* ---------------- timeline ---------------- */}
            <div className="vpw">
                <div className="vp" ref={vpRef} onScroll={onScroll}>
                    {p.notices.length && !items.length ? <div className="notice">{p.notices.join(' · ')}</div> : null}
                    {allCollapsed(cs, tables) ? (
                        <div className="dayempty" data-slot="Toggle_1 (ריק → מכווץ)">
                            {day ? `${dayBar(day, fl, words).t} · ` : ''}אין פריטים ביום הזה · כל העמודות מכווצות לפסים
                        </div>
                    ) : null}
                    <div className="canvas" ref={canvasRef} style={{height: lay.height, width: canvasWidth(CW.total, vpW)}}>
                        <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0}}>{grid}</div>
                        <div className="axis" style={{height: lay.height}}>
                            {axis}
                        </div>
                        {tables.map(t => (
                            <div key={t} className={`col ${colCls(t)}`} data-t={t} style={{height: lay.height, ...colStyle(t)}} title={stripTitle(t)} onClick={() => cs[t]?.collapsed && reopen(t)} onPointerDown={e => colBgDown(e, t)}>
                                <div className="czl">
                                    {HE(t)} <small>{cs[t]?.manual ? `· ${cs[t].count}` : cs[t]?.adHidden ? `· ${cs[t].count} כל היום ↑` : '· ריק'}</small>
                                </div>
                                {chips[t]}
                                {colBody(t)}
                                {ghost && ghost.t === t ? (
                                    <div className="ghost" style={{top: yOf(segs, ghost.a), height: Math.max(18, yOf(segs, ghost.b) - yOf(segs, ghost.a))}}>
                                        <b>{t === 'Slots_Events' ? 'משבצת חדשה' : T.Content_Text_10 || 'רשומה חדשה'}</b>
                                        <span>
                                            <Rng a={ghost.a} b={ghost.b} />
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                        ))}
                        {nowM !== null ? (
                            <div className="nowl" style={{top: yOf(segs, nowM)}} data-m={nowM} data-slot="Button_Text_1 (קו עכשיו)">
                                <span className="num">
                                    <bdi dir="ltr">{fmt(nowM)}</bdi>
                                </span>
                            </div>
                        ) : null}
                        <div className="tops" style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 12}}>
                            {tops}
                        </div>
                    </div>
                </div>
                {xs ? (
                    <>
                        <div className="band" style={{top: bpx.top, height: bpx.height}} data-slot="Number_1 (20%)" />
                        <div className="bl" style={{top: bpx.top - 18}} data-slot="Content_Text_1">
                            {T.Content_Text_1}
                        </div>
                    </>
                ) : null}
                <div className="tnow num" style={{top: vpH / 2 - 10, height: 20, lineHeight: '20px'}}>
                    <bdi dir="ltr">{fmt(curMin)}</bdi>
                </div>
            </div>
                {cfT ? (
                    <div className="hmenu open vmenu cfmenu" data-cm={'cf:' + cfT} style={{position: 'fixed', left: Math.max(4, Math.min(menuAt.x - 200, window.innerWidth - 270)), top: menuAt.y + 4}} onClick={e => e.stopPropagation()}>
                        <small className="vh">
                            סינון {HE(cfT)} · מסנן את ציר הזמן וגם את חתך הרוחב
                        </small>
                        {cfDims.length ? (
                            <>
                                <div className="cfd" role="tablist" aria-label="שדה">
                                    {cfDims.map(d => (
                                        <a key={d.key} role="tab" aria-selected={d.key === cfCur?.key} data-d={d.key} className={d.key === cfCur?.key ? 'on' : ''} onClick={() => setCfDim(m => ({...m, [cfT]: d.key}))}>
                                            {d.label}
                                            {CF[cfT]?.[d.key]?.vals.length ? <b className="num">{CF[cfT][d.key].vals.length}</b> : null}
                                        </a>
                                    ))}
                                </div>
                                {cfCur ? (
                                    <>
                                        <div className="cfop">
                                            {(['any', 'none'] as const).map(o => (
                                                <a
                                                    key={o}
                                                    data-op={o}
                                                    className={(CF[cfT]?.[cfCur.key]?.op ?? 'any') === o ? 'on' : ''}
                                                    onClick={() => setColF(c => ({...c, [cfT]: {...(CF[cfT] ?? {}), [cfCur.key]: {op: o, vals: CF[cfT]?.[cfCur.key]?.vals ?? []}}}))}
                                                >
                                                    {o === 'any' ? 'הוא אחד מ…' : 'אינו אחד מ…'}
                                                </a>
                                            ))}
                                        </div>
                                        <div className="cfl">
                                            {cfCur.values.map(({v, n}) => {
                                                const on = (CF[cfT]?.[cfCur.key]?.vals ?? []).includes(v);
                                                return (
                                                    <div key={v} role="checkbox" aria-checked={on} className={`vi ${on ? 'on' : ''}`} onClick={() => setColF(c => ({...c, [cfT]: toggleColVal(CF[cfT], cfCur.key, v)}))}>
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
                {menuT ? (
                    <div className="hmenu open" data-cm={menuT} style={{position: 'fixed', left: Math.min(menuAt.x, window.innerWidth - 170), top: menuAt.y + 4}} onClick={e => e.stopPropagation()} data-slot="Content_Text_12 · Tab_Label_2">
                        {(['top', 'up', 'down', 'bottom'] as MoveTo[]).map((k, n) => [k, menuL[n]] as [MoveTo, string]).map(([k, l]) => (
                            <div
                                key={k}
                                onClick={() => {
                                    setOrder(o => moveColumn(o, menuT, k));
                                    setOpenDd(null);
                                }}
                            >
                                {l}
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
                    </div>
                ) : null}
            {pop ? (
                <CreatePopover
                    key={`${pop.t}${pop.s}`}
                    req={pop}
                    label={HE(pop.t)}
                    color={C(pop.t)}
                    kind={specOf(pop.t)?.time ?? 'date'}
                    dayTitle={dayBar(dayOf(p.days, pop.s), fl, words)}
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
                <span className="ver" data-slot="Code_Version">{`טיימליין v${p.version}`}</span>
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

/** v0.2.2: ONE inline control — native calendar date + time, side by side, no popup panel of our own */
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
        props.onGo(jumpFrom(days, date, time));
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
            <input type="time" className="jt" aria-label="שעה" value={time} step={900} onChange={e => setTv(e.target.value)} onKeyDown={key} />
            <button className="bb jgo" onClick={go}>
                {props.label}
            </button>
        </div>
    );
}
