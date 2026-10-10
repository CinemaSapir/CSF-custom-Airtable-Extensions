import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {SEARCH_DEBOUNCE_MS, acceptToast, debounce, isEscapeKey, toastLeftAfter, toastMs} from './timing';
import {useCfg} from './cfg';
import {expandRecord} from '@airtable/blocks/interface/ui';
import {type Record as AirtableRecord} from '@airtable/blocks/interface/models';
import {type Collab, type Item, type Kind, type ListVM, SRC, contentTags, hash, unknownTip, VERSION} from './model';

export type ToastMsg = {text: string; err?: boolean; detail?: string; action?: {label: string; run: () => void}; n: number};

/**
 * v0.5.15 toasts. Lifetime is owned by <ToastView> (keyed by a unique counter, so parent re-renders never restart or kill it):
 * undo toasts 6 s, plain 2.8 s; paused while hovered or focused; ✕ closes by hand. A plain info toast never cuts a live undo
 * toast short – it waits until that one closes (acceptToast).
 */
let toastSeq = 0;
export function useToast() {
    const [toast, setToast] = useState<ToastMsg | null>(null);
    const cur = useRef<ToastMsg | null>(null);
    const queued = useRef<ToastMsg | null>(null);
    cur.current = toast;
    const say = useCallback((text: string, opts: Partial<Omit<ToastMsg, 'text' | 'n'>> = {}) => {
        // technical detail (may be English, from the SDK) goes to the console only – the glass stays Hebrew
        if (opts.detail) console.warn('[lists-ui-ext]', text, opts.detail);
        const msg: ToastMsg = {text, ...opts, n: ++toastSeq};
        if (acceptToast(cur.current, msg) === 'queue') {
            queued.current = msg;
            return;
        }
        queued.current = null;
        cur.current = msg;
        setToast(msg);
    }, []);
    const close = useCallback(() => {
        const next = queued.current;
        queued.current = null;
        cur.current = next;
        setToast(next);
    }, []);
    const view = toast ? <ToastView key={toast.n} msg={toast} onClose={close} /> : null;
    return {say, view};
}

function ToastView(props: {msg: ToastMsg; onClose: () => void}) {
    const {msg} = props;
    const [paused, setPaused] = useState(false);
    const left = useRef(toastMs(msg));
    const closeRef = useRef(props.onClose);
    closeRef.current = props.onClose;
    useEffect(() => {
        if (paused) return;
        const started = Date.now();
        const t = window.setTimeout(() => closeRef.current(), left.current);
        return () => {
            window.clearTimeout(t);
            left.current = toastLeftAfter(left.current, Date.now() - started);
        };
    }, [paused]);
    return (
        <div
            className={`toast${msg.err ? ' err' : ''}`}
            role="status"
            aria-live="polite"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
            }}
        >
            <span>{msg.text}</span>
            {msg.action ? (
                <button
                    type="button"
                    className="toast-act"
                    onClick={() => {
                        msg.action?.run();
                        closeRef.current();
                    }}
                >
                    {msg.action.label}
                </button>
            ) : null}
            <button type="button" className="toast-x" aria-label="סגירת ההודעה" title="סגירה" onClick={() => closeRef.current()}>
                ✕
            </button>
        </div>
    );
}

/**
 * v0.5.15 Home search box. The typed value lives HERE (local, immediate – typing only re-renders this input); the parent's
 * filtering gets the value after a 150 ms pause (debounce). Esc clears it reliably: native keydown/keyup listeners on the input
 * AND on window in the capture phase (runs before page-level handlers that may swallow Esc), plus the native «search» event (✕).
 * `resetKey` lets the parent clear it («ניקוי החיפוש»).
 */
export function SearchBox(props: {onQuery: (q: string) => void; resetKey: number; placeholder: string; label: string}) {
    const {placeholder, label, resetKey} = props;
    const [text, setText] = useState('');
    const ref = useRef<HTMLInputElement>(null);
    const onQueryRef = useRef(props.onQuery);
    onQueryRef.current = props.onQuery;
    const deb = useMemo(() => debounce<string>((v) => onQueryRef.current(v), SEARCH_DEBOUNCE_MS), []);
    const clear = useCallback(() => {
        deb.cancel();
        setText('');
        onQueryRef.current('');
    }, [deb]);
    const clearRef = useRef(clear);
    clearRef.current = clear;
    useEffect(() => () => deb.cancel(), [deb]);
    useEffect(() => {
        if (resetKey) clearRef.current();
    }, [resetKey]);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.target !== el || !isEscapeKey(e)) return;
            if (e.type === 'keyup' && !el.value) return;
            e.preventDefault();
            e.stopPropagation();
            clearRef.current();
        };
        const onSearch = () => {
            if (!el.value) clearRef.current();
        };
        el.addEventListener('keydown', onKey, true);
        el.addEventListener('keyup', onKey, true);
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('keyup', onKey, true);
        el.addEventListener('search', onSearch);
        return () => {
            el.removeEventListener('keydown', onKey, true);
            el.removeEventListener('keyup', onKey, true);
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('keyup', onKey, true);
            el.removeEventListener('search', onSearch);
        };
    }, []);
    return (
        <input
            ref={ref}
            className="search"
            type="search"
            dir="rtl"
            value={text}
            placeholder={placeholder}
            aria-label={label}
            autoComplete="off"
            onChange={(e) => {
                const v = e.target.value;
                setText(v);
                if (!v.trim()) {
                    deb.cancel();
                    onQueryRef.current('');
                } else deb.call(v);
            }}
        />
    );
}

/**
 * v0.5.14: keep the scroll position through a write that re-renders the page (hide / show / «ביטול»).
 * `scrollers` = every scrollable ancestor of the clicked control + the document; `holdScroll` puts their scrollTop back
 * on each frame for a short window (the Airtable record update lands asynchronously), and stops at once if the user
 * scrolls, clicks or types.
 */
export type Scroller = Element | null; // null = the window
export function scrollers(from?: Element | null): Scroller[] {
    const out: Scroller[] = [null];
    for (let e = from?.parentElement ?? null; e; e = e.parentElement) if (e.scrollHeight > e.clientHeight + 1) out.push(e);
    const se = document.scrollingElement;
    if (se && !out.includes(se)) out.push(se);
    return out;
}
const topOf = (s: Scroller) => (s ? s.scrollTop : window.scrollY);
export function holdScroll(targets: Scroller[], ms = 1200) {
    const want = targets.map((t) => [t, topOf(t)] as const);
    const end = performance.now() + ms;
    let stop = false;
    const quit = () => (stop = true);
    const EVS = ['wheel', 'touchstart', 'keydown', 'mousedown'] as const;
    for (const ev of EVS) window.addEventListener(ev, quit, {capture: true, passive: true, once: true});
    const tick = () => {
        if (!stop) {
            for (const [t, top] of want) {
                if (Math.abs(topOf(t) - top) <= 1) continue;
                if (t) t.scrollTop = top;
                else window.scrollTo(window.scrollX, top);
            }
        }
        if (!stop && performance.now() < end) window.requestAnimationFrame(tick);
        else for (const ev of EVS) window.removeEventListener(ev, quit, {capture: true});
    };
    window.requestAnimationFrame(tick);
}

/**
 * v0.5.16 (root-cause fixes, holdScroll above stays only as a backstop):
 * - `lockMinHeight`: before a hide / show / «ביטול» write, the page's (.app) min-height is pinned to its current height, so the page
 *   can never get shorter under the reader (a row moving into the collapsed «רשימות מוסתרות», or any transient short
 *   render) – a shorter page is what forces the browser to clamp scrollTop. Released when the filter / search / view changes.
 * - `keepFocus`: the clicked pill (or the toast's «ביטול») unmounts → focus would fall to <body>. Put it back on a stable
 *   element WITHOUT scrolling (`preventScroll: true`): the same pill if it still exists, else the fallback (hidden-section
 *   header / Home).
 */
export function lockMinHeight(el: HTMLElement | null) {
    if (!el) return;
    // min-height is a content-box length unless box-sizing says otherwise → subtract padding + border
    const cs = window.getComputedStyle(el);
    const px = (v: string) => parseFloat(v) || 0;
    const extra = cs.boxSizing === 'border-box' ? 0 : px(cs.paddingTop) + px(cs.paddingBottom) + px(cs.borderTopWidth) + px(cs.borderBottomWidth);
    const h = Math.ceil(el.getBoundingClientRect().height - extra);
    const cur = px(el.style.minHeight);
    if (h > cur) el.style.minHeight = `${h}px`;
}
export function releaseMinHeight(el: HTMLElement | null) {
    if (el) el.style.minHeight = '';
}
export function keepFocus(from: Element | null | undefined, fallback: () => HTMLElement | null) {
    window.requestAnimationFrame(() => {
        const a = document.activeElement;
        if (a && a !== document.body && a.isConnected) return; // focus is somewhere real – leave it
        if (from instanceof HTMLElement && from.isConnected) {
            from.focus({preventScroll: true});
            if (document.activeElement === from) return;
        }
        fallback()?.focus({preventScroll: true});
    });
}

const GRADS = [
    ['#ff9a8b', '#ff6a88'],
    ['#a18cd1', '#fbc2eb'],
    ['#84fab0', '#8fd3f4'],
    ['#fccb90', '#d57eeb'],
    ['#f6d365', '#fda085'],
    ['#89f7fe', '#66a6ff'],
];
export function gradientFor(id: string) {
    const [a, b] = GRADS[hash(id) % GRADS.length];
    return `linear-gradient(135deg, ${a}, ${b})`;
}

export function Thumb(props: {pic: string | null; kind: Kind | null; size?: 'sm' | 'md'; alt: string; icon?: string | null}) {
    const {pic, kind, size = 'md', alt, icon} = props;
    return (
        <span className={`thumb ${size} ${kind ?? 'none'}`}>
            {pic ? <img src={pic} alt={alt} loading="lazy" /> : <span aria-hidden="true">{icon || (kind ? SRC[kind].emoji : '📄')}</span>}
        </span>
    );
}

/** Letterboxd-style poster strip: up to 4 pictures from the first items; gradient + emoji when there are none */
export function Cover(props: {list: ListVM; compact?: boolean; /** v0.5.7 hero: show the list's table / type under the image */ label?: boolean}) {
    const {list, compact, label} = props;
    const pics = list.items.filter((i) => i.pic).slice(0, compact ? 1 : 4) as Array<Item & {pic: string}>;
    const t = list.table;
    const typeIcon = list.isDynamic ? '⚡' : list.isChecklist ? '✅' : '📋';
    const cap = label ? (
        <span className="cover-cap" title={t ? `טבלה: ${t.he}` : undefined}>
            {t ? `${t.icon} ${t.he}` : list.isDynamic ? '⚡ דינמית' : list.isChecklist ? '✓ עם סימונים' : 'רשימה מעורבת'}
        </span>
    ) : null;
    // v0.5.10 hero: the cover never sets the header height – contents are absolutely placed, the box stretches to the
    // text block (capped in CSS). 1 picture = one cover; 2–3 = a horizontal fanned strip; never a vertical stack.
    if (label) {
        const hp = pics.slice(0, 3);
        const emoji = t?.icon || list.source?.icon || (list.contents[0] ? SRC[list.contents[0]].emoji : null) || (list.items[0]?.src?.icon ?? (list.items[0]?.kind ? SRC[list.items[0].kind!].emoji : null));
        const shape = hp.length === 0 ? 'empty' : hp.length === 1 ? 'one' : `fan n${hp.length}`;
        return (
            <div className={`cover hero-cover ${shape} has-cap`} style={hp.length === 1 ? undefined : {background: gradientFor(list.id)}}>
                <div className="cover-fit">
                    {hp.length === 0 ? <span className="cover-emoji">{emoji || typeIcon}</span> : hp.map((p, i) => <img key={p.id} src={p.pic} alt="" loading="lazy" style={{zIndex: 10 - i}} />)}
                </div>
                {cap}
            </div>
        );
    }
    if (pics.length === 0) {
        const emoji = t?.icon || list.source?.icon || (list.contents[0] ? SRC[list.contents[0]].emoji : null) || (list.items[0]?.src?.icon ?? (list.items[0]?.kind ? SRC[list.items[0].kind!].emoji : null));
        return (
            <div className={`cover empty${compact ? ' compact' : ''}${label ? ' has-cap' : ''}`} style={{background: gradientFor(list.id)}} aria-hidden={label ? undefined : true}>
                <span className="cover-emoji">{emoji || typeIcon}</span>
                {cap}
            </div>
        );
    }
    if (pics.length === 1 || compact) {
        return (
            <div className={`cover one${compact ? ' compact' : ''}`}>
                <img src={pics[0].pic} alt="" loading="lazy" />
            </div>
        );
    }
    return (
        <div className="cover strip" style={{background: gradientFor(list.id)}}>
            {pics.map((p, i) => (
                <img key={p.id} src={p.pic} alt="" loading="lazy" style={{zIndex: 10 - i}} />
            ))}
        </div>
    );
}

/** v0.3.0: only what matters – ⚡ דינמית, or ✓ when the list shows checkmarks (plain lists get no type badge) */
export function TypeBadge(props: {list: ListVM}) {
    const {list} = props;
    const {t} = useCfg();
    if (list.isDynamic) return <span className="badge type-dyn" title="מתעדכנת לבד לפי תנאים">{t('Content_Text_6')}</span>;
    return list.isChecklist ? <span className="badge type-check">{t('Content_Text_7')}</span> : null;
}
/** content tags derived from the items (not from the old Contents field) – static lists only show film/slot/person */
export function ContentTags(props: {items: Array<{kind: Kind | null}>; counts?: boolean}) {
    const {items, counts = true} = props;
    return (
        <>
            {contentTags(items).map((t) => (
                <span key={t.kind} className="badge contents">
                    {SRC[t.kind].emoji} {SRC[t.kind].plural}
                    {counts ? ` · ${t.n}` : ''}
                </span>
            ))}
        </>
    );
}
/** v0.4.0: icon + Hebrew table name for a dynamic list (and for any item of a configured source) */
export function TablePill(props: {list: ListVM}) {
    const s = props.list.source;
    if (!s) return null;
    return (
        <span className="badge table-pill" title={`טבלת מקור: ${s.he}`}>
            {s.icon} {s.he}
        </span>
    );
}
export const PRIVATE_NOTE =
    'פרטית = מוסתרת מדף הרשימות של אחרים בעמוד הזה בלבד. זו לא הגבלת אבטחה: מי שיש לו גישה לבסיס או לקישור הממשק יכול לראות את הנתונים. בקרת הגישה האמיתית היא שיתוף הממשק (Interface share) – לא השדה הזה.';
/** CISO DEMO: short operational-privacy line on the Lists page (home + hero). Never imply Public/Private gates access. */
export const PRIVACY_LINE =
    'הרשימה מציגה מעקב תפעולי בלבד (תפקיד / סטטוס / רמת גישה). פרטי קשר ומזהים אישיים אינם מוצגים כאן — ואין לשתף את קישור הממשק מעבר לנדרש.';
export function PrivacyLine() {
    const {t} = useCfg();
    return (
        <p className="privacy-line" role="note">
            🛡 {t('Helper_Text_2')}
        </p>
    );
}

export function VisBadge(props: {list: ListVM}) {
    const {list} = props;
    return (
        <>
            {list.isPublic ? (
                <span className="badge vis-pub" title="מופיעה לכל מי שפותח את העמוד">
                    🌍 ציבורית
                </span>
            ) : (
                <span className="badge vis-priv" title={PRIVATE_NOTE}>
                    🔒 פרטית
                </span>
            )}
            {list.relation === 'shared' ? <span className="badge vis-shared">👥 שותפה איתי</span> : null}
            {list.relation === 'mine' && list.shared.length ? (
                <span className="badge vis-shared" title={list.shared.map((c) => c.name ?? c.email ?? '').join(', ')}>
                    👥 משותפת עם {list.shared.length === 1 ? 'אדם אחד' : `${list.shared.length} אנשים`}
                </span>
            ) : null}
        </>
    );
}

/** v0.5.7: the real Hebrew TABLE name (List_Sources label → kinds.ts plural → linked table name).
 *  v0.5.11: never «אחר» – a row whose table can't be found gets a small amber «?» that says which field to turn on. */
export function SourceBadge(props: {kind: Kind | null; src?: {icon: string; he: string} | null; fields?: string[]}) {
    const he = props.src?.he || (props.kind ? SRC[props.kind].plural : '');
    if (!he) {
        const tip = unknownTip(props.fields);
        return (
            <span className="src unknown" title={tip} aria-label={tip}>
                ?
            </span>
        );
    }
    const legacy = props.kind === 'film' || props.kind === 'slot' || props.kind === 'person';
    return (
        <span className={`src ${legacy ? props.kind : 'other'}`} title={`טבלה: ${he}`}>
            {he}
        </span>
    );
}

export function Avatar(props: {c: Collab | null; size?: number}) {
    const {c, size = 26} = props;
    const initial = (c?.name ?? c?.email ?? '?').trim().charAt(0);
    if (c?.profilePicUrl && !c.profilePicUrl.includes('userIcons')) {
        return <img className="avatar" src={c.profilePicUrl} alt="" style={{width: size, height: size}} />;
    }
    return (
        <span className="avatar" aria-hidden="true" style={{width: size, height: size, background: c ? gradientFor(c.id) : '#9aa1ac'}}>
            {initial}
        </span>
    );
}

export function Progress(props: {done: number; total: number}) {
    const {done, total} = props;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return (
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="התקדמות">
            <div className="progress-bar" style={{width: `${pct}%`}} />
        </div>
    );
}

export const itemsCountHe = (n: number) => (n === 0 ? 'אין פריטים' : n === 1 ? 'פריט אחד' : `${n} פריטים`);

/**
 * v0.5.6: open a record in Airtable's own record view. Tries each candidate in order (source record first,
 * then the List Item) and only calls expandRecord for a table where record expansion is enabled on this page.
 * When none can be opened, it says so in Hebrew instead of silently doing nothing.
 */
type ExpandableTable = {name?: string; hasPermissionToExpandRecords?: () => boolean; checkPermissionToExpandRecords?: () => {hasPermission: boolean; reasonDisplayString?: string}};
export function openRecord(
    candidates: Array<AirtableRecord | null | undefined>,
    say?: (text: string, opts?: Partial<Omit<ToastMsg, 'text' | 'n'>>) => void,
): boolean {
    const reasons: string[] = [];
    for (const r of candidates) {
        if (!r) continue;
        const t = (r as unknown as {parentTable?: ExpandableTable}).parentTable;
        const chk = t?.checkPermissionToExpandRecords ? t.checkPermissionToExpandRecords() : {hasPermission: true};
        if (!chk.hasPermission) {
            reasons.push(`${t?.name ?? '?'}: ${chk.reasonDisplayString ?? 'expansion disabled'}`);
            continue;
        }
        try {
            expandRecord(r);
            return true;
        } catch (e) {
            reasons.push(`${t?.name ?? '?'}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }
    say?.('אי אפשר לפתוח את הרשומה מכאן – פתיחת רשומות לא מופעלת לטבלה הזו בעמוד.', {err: true, detail: reasons.join(' | ') || 'no record'});
    return false;
}

/** v0.5.11: ONE quiet notice per list (not per row) when some rows show «?» – names exactly what to enable */
export function UnknownTablesNotice(props: {count: number; fields: string[]}) {
    const {count, fields} = props;
    if (!count) return null;
    const what = count === 1 ? 'פריט אחד ברשימה מסומן' : `${count} פריטים ברשימה מסומנים`;
    return (
        <p className="msg hint unknown-note" role="note">
            <span className="src unknown" aria-hidden="true">?</span> {what} «?» – לא ידוע מאיזו טבלה.{' '}
            {fields.length ? (
                <>
                    כדי שיופיע שם הטבלה, הפעילו בעורך הממשק (האלמנט › Fields › List Item):{' '}
                    {fields.slice(0, 6).map((f, i) => (
                        <span key={f}>
                            {i ? ' · ' : ''}
                            <b dir="ltr">{f}</b>
                        </span>
                    ))}
                    {fields.length > 6 ? ' …' : ''}. פריטים חדשים שומרים את שם הטבלה בעצמם.
                </>
            ) : (
                'מלאו בפריטים האלה את השדה «Type».'
            )}
        </p>
    );
}

/** v0.5.12: small, quiet build version at the bottom of Home and of the list page */
export function VersionFooter() {
    return (
        <footer className="ver-foot" aria-label="גרסת התוסף">
            v{VERSION}
        </footer>
    );
}
