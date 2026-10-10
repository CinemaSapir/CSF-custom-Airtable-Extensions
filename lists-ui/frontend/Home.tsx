import React, {useEffect, useMemo, useRef, useState} from 'react';
import {type Base} from '@airtable/blocks/interface/models';
import {type Collab, type Fields, type HomeFilter, type Kind, type ListVM, type Model, type Tables, DYNAMIC_FIELDS, SRC, dynamicReady, kindChoices, errText, homeCounts, homeSearch, resultCountHe} from './model';
import {canHide, createListRecord, dynamicFields, heErr} from './actions';
import {type Cond, type Source, hardDenied, trackGate} from './dynlogic';
import {CondEditor, countHe} from './Dynamic';
import {SharePicker, useSharePeople} from './share';
import {Avatar, ContentTags, Cover, Progress, SearchBox, TablePill, TypeBadge, itemsCountHe, keepFocus, lockMinHeight, releaseMinHeight, type ToastMsg} from './ui';
import {HideToggle, useHideToggle} from './header';
import {type ListsText, useCfg} from './cfg';

type Say = (text: string, opts?: Partial<Omit<ToastMsg, 'text' | 'n'>>) => void;

type Filter = HomeFilter;
/** v0.6.0: labels from Extension_Config (Tab_Label_1–4 chips, Heading_1–4 page titles), code defaults = the v0.5.18 texts */
const FILTERS: Array<{key: Filter; he: ListsText; title: ListsText}> = [
    {key: 'all', he: 'Tab_Label_1', title: 'Heading_1'},
    {key: 'mine', he: 'Tab_Label_2', title: 'Heading_2'},
    {key: 'shared', he: 'Tab_Label_3', title: 'Heading_3'},
    {key: 'public', he: 'Tab_Label_4', title: 'Heading_4'},
];

export function Home(props: {
    model: Model;
    me: Collab | null;
    view: 'gallery' | 'list';
    setView: (v: 'gallery' | 'list') => void;
    open: (id: string) => void;
    onNew: () => void;
    /** false when SDK denies Lists create (Interface share / table perms) */
    canCreate?: boolean;
    /** v0.5.13: the row hide / «הצג רשימה» pills write Lists › Status */
    T: Tables;
    F: Fields;
    say: Say;
}) {
    const {model, me, view, setView, open, onNew, canCreate = true, T, F, say} = props;
    const {t} = useCfg();
    const createDenied = t('Error_Text_1');
    const newDisabled = !me || !canCreate;
    const [filter, setFilter] = useState<Filter>('all');
    /** v0.5.15: the debounced filter query (the typed text itself lives in SearchBox) */
    const [q, setQ] = useState('');
    const [resetKey, setResetKey] = useState(0);
    const clearSearch = () => setResetKey((k) => k + 1);
    /** v0.5.13: «רשימות מוסתרות (N)» starts collapsed – the user hid those lists to get them out of the way; the header still says N */
    const [hiddenOpen, setHiddenOpen] = useState(false);
    /** v0.5.16 scroll-jump fixes (see keep.ts for the root cause): the page never gets shorter during a hide / show /
     * «ביטול» (min-height pinned until the filter / search / view changes), and focus never falls to <body> */
    const homeRef = useRef<HTMLDivElement>(null);
    /** the page box = the .app root (its padding stops child margins from leaking past the lock) */
    const pageEl = () => homeRef.current?.closest<HTMLElement>('.app') ?? homeRef.current;
    /** the element we pinned (kept here: on unmount the DOM ref is already gone when the cleanup runs) */
    const locked = useRef<HTMLElement | null>(null);
    useEffect(() => releaseMinHeight(locked.current), [filter, q, view]);
    useEffect(() => () => releaseMinHeight(locked.current), []); // opening a list must not inherit Home's pinned height
    const toggle = useHideToggle(T, F, say, {
        beforeWrite: () => {
            locked.current = pageEl();
            lockMinHeight(locked.current);
        },
        afterWrite: (from) => keepFocus(from, () => homeRef.current?.querySelector<HTMLElement>('.hidden-head') ?? homeRef.current),
    });

    const counts = useMemo(() => homeCounts(model.lists, false), [model.lists]);
    const {searching, shown, hidden, results} = useMemo(() => homeSearch(model.lists, filter, q), [model.lists, filter, q]);
    const anyVisible = counts.all > 0 || hidden.length > 0;

    const filterMeta = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
    /** v0.5.16: ONE canHide(list) answer per list, shared by the gallery card and the list row (and the same rule as the headers) */
    const hideable = useMemo(() => new Map(model.lists.map((l) => [l.id, canHide(T, F, l)])), [model.lists, T, F]);
    const ctl = (l: ListVM, slot: boolean) => <HideToggle list={l} can={hideable.get(l.id) ?? false} toggle={toggle} slot={slot} />;
    const many = (ls: ListVM[]) =>
        view === 'gallery' ? (
            <div className="gallery">
                {ls.map((l) => (
                    <Card key={l.id} list={l} open={open} ctl={ctl(l, false)} />
                ))}
            </div>
        ) : (
            <div className="rows">
                {ls.map((l) => (
                    <Row key={l.id} list={l} open={open} ctl={ctl(l, true)} />
                ))}
            </div>
        );

    return (
        <div className="home" ref={homeRef} tabIndex={-1}>
            <header className="home-head">
                <h1>{t(filterMeta.title)}</h1>
                {!me ? <p className="sub muted">{t('Helper_Text_6')}</p> : null}
            </header>

            <div className="chips home-pills" role="tablist" aria-label="סינון רשימות">
                {FILTERS.map((f) => (
                    <button
                        key={f.key}
                        type="button"
                        role="tab"
                        aria-selected={filter === f.key}
                        className={`chip${filter === f.key ? ' on' : ''}`}
                        onClick={() => setFilter(f.key)}
                    >
                        {t(f.he)} <span className="count">{counts[f.key]}</span>
                    </button>
                ))}
            </div>

            <div className="toolbar home-toolbar">
                {/* v0.5.13: the one search box (since v0.5.3) – loose match, covers the hidden lists too.
                    v0.5.15: value local + immediate inside SearchBox, filtering debounced 150 ms; Esc clears via native listeners */}
                <SearchBox onQuery={setQ} resetKey={resetKey} placeholder={t('Helper_Text_3')} label="חיפוש רשימה" />
                <span className="spacer" />
                <div className="seg" role="group" aria-label="תצוגה">
                    <button type="button" className={view === 'gallery' ? 'on' : ''} aria-pressed={view === 'gallery'} onClick={() => setView('gallery')} title="תצוגת גלריה">
                        {t('Tab_Label_5')}
                    </button>
                    <button type="button" className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')} title="תצוגת רשימה">
                        {t('Tab_Label_6')}
                    </button>
                </div>
                <button type="button" className="btn primary" onClick={onNew} disabled={newDisabled} title={!canCreate ? createDenied : undefined}>
                    {t('Button_Text_1')}
                </button>
            </div>
            {!canCreate && me ? <p className="msg err" style={{margin: '0 0 12px'}}>{createDenied}</p> : null}

            {searching ? (
                // v0.5.13 the owner: while searching – ONE merged result list, hidden matches included (ghosted, with «הצג רשימה»)
                <section className="search-results" aria-label="תוצאות חיפוש">
                    <p className="result-count" role="status">
                        {resultCountHe(results.length)}
                        {results.length === 0 ? (
                            <button type="button" className="link-btn" onClick={clearSearch}>
                                {t('Content_Text_10')}
                            </button>
                        ) : null}
                    </p>
                    {results.length ? many(results) : null}
                </section>
            ) : !anyVisible ? (
                <div className="empty-state">
                    <div className="big-emoji">✨</div>
                    <h2>{t('Empty_State_Text_1')}</h2>
                    <p>{t('Empty_State_Text_2')}</p>
                    <button type="button" className="btn primary" onClick={onNew} disabled={newDisabled} title={!canCreate ? createDenied : undefined}>
                        {t('Button_Text_2')}
                    </button>
                    {!canCreate && me ? <p className="msg err">{createDenied}</p> : null}
                </div>
            ) : (
                <>
                    {shown.length ? (
                        many(shown)
                    ) : (
                        <p className="result-count">
                            {hidden.length && counts[filter] === 0 ? t('Empty_State_Text_4') : t('Empty_State_Text_3')}
                            {filter !== 'all' ? (
                                <button type="button" className="link-btn" onClick={() => setFilter('all')}>
                                    {t('Button_Text_10')}
                                </button>
                            ) : null}
                        </p>
                    )}
                    {hidden.length ? (
                        <section className={`hidden-sec${hiddenOpen ? ' open' : ''}`} aria-label="רשימות מוסתרות">
                            <h2>
                                <button type="button" className="hidden-head" aria-expanded={hiddenOpen} onClick={() => setHiddenOpen((v) => !v)}>
                                    <span className="chev" aria-hidden="true">
                                        {hiddenOpen ? '▾' : '◂'}
                                    </span>
                                    {t('Content_Text_1', {n: hidden.length})}
                                </button>
                            </h2>
                            {hiddenOpen ? many(hidden) : null}
                        </section>
                    ) : null}
                </>
            )}
        </div>
    );
}

const preview = (l: ListVM) => {
    const names = l.items.slice(0, 3).map((i) => i.name);
    return names.length ? names.join(' · ') + (l.items.length > 3 ? ' …' : '') : '';
};
const doneCount = (l: ListVM) => l.items.filter((i) => i.checked).length;
/** "⚡ 6 סרטים" for dynamic lists, "✓ 3/6" for lists with checkmarks, "6 פריטים" otherwise */
const countLabel = (l: ListVM) =>
    l.isDynamic ? `⚡ ${countHe(l.source, l.items.length)}` : l.isChecklist && l.items.length ? `✓ ${doneCount(l)}/${l.items.length}` : itemsCountHe(l.items.length);

/** v0.5.13: card + its hide pill are siblings (no button inside a button); a hidden list's card is ghosted, the pill is not */
function Card(props: {list: ListVM; open: (id: string) => void; ctl: React.ReactNode}) {
    const {list: l, open, ctl} = props;
    const {t} = useCfg();
    return (
        <div className={`card-wrap${l.archived ? ' is-hidden' : ''}`}>
            <button type="button" className="card" onClick={() => open(l.id)} aria-label={`פתיחת הרשימה ${l.name}${l.archived ? ' (מוסתרת)' : ''}`}>
                <Cover list={l} />
                <div className="card-body">
                    <div className="badges">
                        <TypeBadge list={l} />
                        {l.archived ? <span className="badge archived">{t('Content_Text_2')}</span> : null}
                        {l.isDynamic ? <TablePill list={l} /> : <ContentTags items={l.items} counts={false} />}
                    </div>
                    <h3>{l.name}</h3>
                    {l.desc ? <p className="desc">{l.desc}</p> : null}
                    {preview(l) ? <p className="preview">{preview(l)}</p> : <p className="preview muted">{l.isDynamic ? t('Content_Text_9') : t('Content_Text_8')}</p>}
                    <div className="card-foot">
                        <Avatar c={l.owner} size={20} />
                        <span className="muted">{l.relation === 'mine' ? 'שלי' : (l.owner?.name ?? 'ללא בעלים')}</span>
                        <span className="spacer" />
                        <span className={l.isChecklist || l.isDynamic ? 'done-count' : 'muted'}>{countLabel(l)}</span>
                    </div>
                    {l.isChecklist && l.items.length ? <Progress done={doneCount(l)} total={l.items.length} /> : null}
                </div>
            </button>
            {ctl}
        </div>
    );
}

/** v0.5.13: the row is the open button + the far-left pill (hide «👁 הסתר» / «הצג רשימה») inside one bordered row */
function Row(props: {list: ListVM; open: (id: string) => void; ctl: React.ReactNode}) {
    const {list: l, open, ctl} = props;
    const {t} = useCfg();
    return (
        <div className={`row-wrap${l.archived ? ' is-hidden' : ''}`}>
            <button type="button" className="row" onClick={() => open(l.id)} aria-label={`פתיחת הרשימה ${l.name}${l.archived ? ' (מוסתרת)' : ''}`}>
                <Cover list={l} compact />
                <div className="row-main">
                    <div className="row-title">
                        <b title={l.name}>{l.name}</b>
                        <TypeBadge list={l} />
                        {l.archived ? <span className="badge archived">{t('Content_Text_2')}</span> : null}
                        {l.isDynamic ? <TablePill list={l} /> : null}
                    </div>
                    <div className="preview one-line">{preview(l) || (l.isDynamic ? t('Content_Text_9') : t('Content_Text_8'))}</div>
                </div>
                <div className="row-side">
                    <span className={l.isDynamic || l.isChecklist ? 'done-count' : 'muted'}>{countLabel(l)}</span>
                </div>
            </button>
            {ctl}
        </div>
    );
}

// ---------------- new list ----------------
export function NewListModal(props: {
    base: Base;
    T: Tables;
    F: Fields;
    model: Model;
    me: Collab;
    onClose: () => void;
    onCreated: (id: string, name: string) => void;
}) {
    const {T, F, model, me, onClose, onCreated} = props;
    const {t} = useCfg();
    const [name, setName] = useState('');
    const [dynamic, setDynamic] = useState(false);
    /** «מה יהיה ברשימה?» – v0.5.7: the SAME kinds as «+ הוספת פריט» (kinds.ts), not List_Sources rows */
    const [kind, setKind] = useState<Kind | null>(null);
    const [conds, setConds] = useState<Cond[]>([{key: '', op: '', value: ''}]);
    const [collabOn, setCollabOn] = useState(false);
    const [picked, setPicked] = useState<string[]>([]); // collaborator ids
    const [desc, setDesc] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<{text: string} | null>(null);
    // v0.5.8: exactly the kinds the «+ הוספת פריט» panel shows (model.kindChoices) – tables, not link fields
    const choices = kindChoices(F, model);
    const kinds = choices.filter((c) => c.hasTable).map((c) => c.k);
    const kindTip = kind ? (choices.find((c) => c.k === kind && !c.hasTable)?.tip ?? null) : null;
    const pickedCanAdd = kind ? (choices.find((c) => c.k === kind)?.canAdd ?? false) : true;
    const kindTable = kind ? (model.kindTables.get(kind) ?? null) : null;
    /** the dynamic-list source for the picked kind (List_Sources row or the built-in fallback) */
    const dynSource: Source | null = kind && kindTable ? (model.catalog.sources.find((s) => s.active && s.table?.id === kindTable.id) ?? null) : null;
    const canDynamic = dynamicReady(F);
    /** one short line on the «דינמית» card when the pick can't be dynamic (the card itself stays selectable) */
    const dynReason: string | null = !canDynamic
        ? 'חסרים שדות דינמיים בטבלת Lists'
        : kind && !dynSource
          ? hardDenied(kindTable?.name ?? '')
              ? 'טבלה רגישה – רק ידנית'
              : 'אין לטבלה שדות מעקב – רק ידנית'
          : dynSource && model.recordsOf(dynSource) === null
            ? 'הטבלה לא נטענה באלמנט'
            : dynSource && trackGate(dynSource).kind !== 'ok'
              ? 'שדות המעקב לא מופעלים – רק ידנית'
              : null;
    const ready = Boolean(name.trim()) && (!dynamic || (Boolean(kind) && Boolean(dynSource) && !dynReason));

    const people = useSharePeople(T, F, model, me.id);
    const sharedIds = [...new Set(picked)];

    // Probe which display-label fields the session may write (CISO: not real ACL).
    const coreProbe: {[id: string]: unknown} = F.lName ? {[F.lName.id]: 'x'} : {};
    if (F.lOwner) coreProbe[F.lOwner.id] = {id: me.id};
    if (F.lType) coreProbe[F.lType.id] = {name: 'Regular'};
    if (F.lStatus) coreProbe[F.lStatus.id] = {name: 'Active'};
    const canCreateCore = T.lists.hasPermissionToCreateRecord(coreProbe);
    const canSetShared = Boolean(F.lShared) && T.lists.hasPermissionToCreateRecord({...coreProbe, [F.lShared!.id]: undefined});

    const create = async () => {
        const n = name.trim();
        if (!n || !F.lName || !ready) return;
        const fields: {[id: string]: unknown} = {[F.lName.id]: n};
        if (F.lOwner) fields[F.lOwner.id] = {id: me.id};
        if (F.lType) fields[F.lType.id] = {name: 'Regular'};
        if (F.lShared && canSetShared && collabOn && sharedIds.length) fields[F.lShared.id] = sharedIds.map((id) => ({id}));
        if (F.lDesc && desc.trim()) fields[F.lDesc.id] = desc.trim();
        if (F.lStatus) fields[F.lStatus.id] = {name: 'Active'};
        try {
            if (dynamic && dynSource) Object.assign(fields, dynamicFields(F, dynSource, conds.filter((c) => c.key)));
            else {
                if (F.lMode) fields[F.lMode.id] = {name: 'Static'};
                // v0.5.7: a manual list remembers its table (header icon, add-panel default, item fallback). Mode stays Static.
                if (F.lSourceId && kindTable) fields[F.lSourceId.id] = kindTable.id;
            }
        } catch (e) {
            setErr({text: heErr(e)});
            return;
        }
        setBusy(true);
        setErr(null);
        try {
            const id = await createListRecord(T, F, fields);
            onCreated(id, n);
        } catch (e) {
            console.warn('[lists-ui-ext]', errText(e));
            setErr({text: heErr(e)});
            setBusy(false);
        }
    };

    const missingDyn = DYNAMIC_FIELDS.filter((d) => !F[d.key]).map((d) => d.en).join(', ');

    return (
        <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal new-list" role="dialog" aria-modal="true" aria-label="רשימה חדשה" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
                <h2>{t('Content_Text_3')}</h2>
                <label className="fld">
                    <span>שם הרשימה</span>
                    <input
                        autoFocus
                        dir="rtl"
                        value={name}
                        placeholder={dynamic ? 'למשל: סרטים שהתקבלו לפסטיבל' : 'למשל: סרטים לערב הפתיחה'}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && void create()}
                    />
                </label>
                <div className="fld">
                    <span>מה יהיה ברשימה?{dynamic ? '' : ' (לא חובה)'}</span>
                    <select
                        className="kind-select"
                        dir="rtl"
                        aria-label="טבלה"
                        value={kind ?? ''}
                        onChange={(e) => {
                            const k = (e.target.value || null) as Kind | null;
                            if (k !== kind) setConds([{key: '', op: '', value: ''}]);
                            setKind(k);
                        }}
                    >
                        <option value="">{dynamic ? 'בחירת טבלה…' : 'כל סוג (רשימה מעורבת)'}</option>
                        {choices.map((c) => {
                            const l = model.labelOf(c.k);
                            // v0.5.17: a kind whose table isn't in this base is listed but can't be picked (tooltip names the table)
                            return (
                                <option key={c.k} value={c.k} disabled={!c.hasTable} title={c.hasTable ? undefined : (c.tip ?? undefined)}>
                                    {`${l.icon} ${l.he}${c.hasTable ? '' : ' – לא זמין בבסיס הזה'}`}
                                </option>
                            );
                        })}
                    </select>
                    {dynamic && !kind ? <small className="msg warn inline">בחרו טבלה כדי ליצור רשימה דינמית.</small> : null}
                    {kinds.length === 0 ? <small className="muted">אין טבלאות זמינות באלמנט.</small> : null}
                    {kind && kindTip ? <small className="muted kind-note">{kindTip}</small> : null}
                    {kind && !dynamic && !pickedCanAdd ? (
                        <small className="muted kind-note">הוספת {model.labelOf(kind).he} ידנית תתאפשר אחרי שהשדה «{SRC[kind].linkFieldName}» ב־List Item יופעל באלמנט.</small>
                    ) : null}
                </div>
                <label className="fld">
                    <span>תיאור (לא חובה)</span>
                    <textarea className="desc-box" dir="rtl" rows={2} value={desc} placeholder="בשביל מה הרשימה?" onChange={(e) => setDesc(e.target.value)} />
                </label>
                <div className="fld">
                    <span>סוג הרשימה</span>
                    <div className="type-pick">
                        <button type="button" className={!dynamic ? 'on' : ''} aria-pressed={!dynamic} onClick={() => setDynamic(false)}>
                            <b>✋ ידנית</b>
                            <small>בוחרים פריטים בעצמכם</small>
                        </button>
                        <button
                            type="button"
                            className={`${dynamic ? 'on' : ''}${dynReason ? ' has-why' : ''}`}
                            aria-pressed={dynamic}
                            title={!canDynamic ? `חסרים שדות באלמנט: ${missingDyn}` : undefined}
                            onClick={() => setDynamic(true)}
                        >
                            <b>⚡ דינמית</b>
                            <small className={dynReason ? 'why' : undefined}>{dynReason ?? 'מתעדכנת לבד לפי תנאים'}</small>
                        </button>
                    </div>
                </div>
                {dynamic && dynSource && !dynReason ? <CondEditor source={dynSource} model={model} conds={conds} setConds={setConds} /> : null}
                {F.lShared && canSetShared ? (
                    <div className="fld collab">
                        <label className="switch-row">
                            <input
                                type="checkbox"
                                checked={collabOn}
                                onChange={(e) => {
                                    setCollabOn(e.target.checked);
                                    if (!e.target.checked) setPicked([]);
                                }}
                            />
                            <span className="switch" aria-hidden="true" />
                            <span>לאפשר עריכה משותפת?</span>
                        </label>
                        {collabOn ? <SharePicker people={people} picked={picked} setPicked={setPicked} /> : null}
                    </div>
                ) : null}
                {!canCreateCore ? <p className="msg err">{t('Error_Text_1')}</p> : null}
                {err ? <p className="msg err">{err.text}</p> : null}
                <div className="modal-foot">
                    <button type="button" className="btn primary" disabled={!ready || busy || !canCreateCore} onClick={() => void create()}>
                        {busy ? 'יוצרים…' : t('Button_Text_9')}
                    </button>
                    <button type="button" className="btn" onClick={onClose}>
                        ביטול
                    </button>
                </div>
            </div>
        </div>
    );
}
