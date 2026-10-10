/**
 * Compact modes for placing the same extension on other pages:
 *  - RecordMode: "באילו רשימות?" for one Film / Slot / Person + "+ הוסף לרשימה"
 *  - MyListsCompact: "הרשימות שלי" strip for Staff Home (expand a list inline, tick checklist items)
 */
import {useEffect, useMemo, useRef, useState} from 'react';
import {expandRecord} from '@airtable/blocks/interface/ui';
import {type ListsText, useCfg} from './cfg';
import {type Record as AirtableRecord} from '@airtable/blocks/interface/models';
import {type Collab, type Fields, type HomeFilter, type Item, type Kind, type ListVM, type Model, type Tables, SRC, homeCounts, homeLists, homeOrder, listsContaining, sourceView} from './model';
import {createItem, createQuickList, detailErr, heErr, setChecked, unlinkItems} from './actions';
import {countHe} from './Dynamic';
import {Cover, Progress, SourceBadge, Thumb, TypeBadge, itemsCountHe, openRecord, type ToastMsg} from './ui';

type Say = (text: string, opts?: Partial<Omit<ToastMsg, 'text' | 'n'>>) => void;
const nextOrder = (l: ListVM) => Math.max(0, ...l.items.map((i) => (i.order < 1_000_000 ? i.order : 0))) + 10;

// ======================= record mode =======================
export function RecordMode(props: {
    model: Model;
    T: Tables;
    F: Fields;
    me: Collab | null;
    kind: Kind | null;
    fixedId: string;
    pickedId: string | null;
    setPicked: (id: string | null) => void;
    say: Say;
}) {
    const {model, T, F, me, kind, fixedId, pickedId, setPicked, say} = props;
    const {t} = useCfg();
    if (!kind) {
        return <p className="msg err">{t('Error_Text_4')}</p>;
    }
    const pool = model.sourceRecords[kind];
    // current record: fixed id setting → the page gives exactly one record → a record picked here
    const fixed = fixedId ? pool.find((r) => r.id === fixedId) : undefined;
    const auto = !fixed && pool.length === 1 ? pool[0] : undefined;
    const picked = !fixed && !auto && pickedId ? pool.find((r) => r.id === pickedId) : undefined;
    const record = fixed ?? auto ?? picked;
    if (!record) return <RecordPicker kind={kind} pool={pool} F={F} pick={setPicked} />;
    return <RecordLists model={model} T={T} F={F} me={me} kind={kind} record={record} canChange={Boolean(picked)} change={() => setPicked(null)} say={say} />;
}

function RecordPicker(props: {kind: Kind; pool: AirtableRecord[]; F: Fields; pick: (id: string) => void}) {
    const {kind, pool, F, pick} = props;
    const [q, setQ] = useState('');
    const opts = useMemo(() => {
        const n = q.trim().toLowerCase();
        return pool
            .map((r) => ({r, v: sourceView(kind, r, F)}))
            .filter((o) => !n || o.v.name.toLowerCase().includes(n))
            .sort((a, b) => a.v.name.localeCompare(b.v.name, 'he'))
            .slice(0, 24);
    }, [pool, q, kind, F]);
    return (
        <div className="compact">
            <h2 className="c-title">
                {SRC[kind].emoji} באילו רשימות מופיע ה{SRC[kind].he}?
            </h2>
            <p className="muted small-text">בעמוד רשומה הבחירה אוטומטית. כאן אפשר לבחור {SRC[kind].he} לבדיקה:</p>
            <input className="search wide" type="search" dir="rtl" value={q} placeholder={`חיפוש ${SRC[kind].he}…`} aria-label={`חיפוש ${SRC[kind].he}`} onChange={(e) => setQ(e.target.value)} />
            <div className="pick-grid">
                {opts.map(({r, v}) => (
                    <button key={r.id} type="button" className="pick" onClick={() => pick(r.id)}>
                        <Thumb pic={v.pic} kind={kind} size="sm" alt={v.name} />
                        <span className="pick-text">
                            <b>{v.name}</b>
                            {v.sub ? <small>{v.sub}</small> : null}
                        </span>
                        <span className="pick-state">←</span>
                    </button>
                ))}
                {opts.length === 0 ? <p className="muted">לא נמצא {SRC[kind].he} ״{q.trim()}״</p> : null}
            </div>
        </div>
    );
}

function RecordLists(props: {model: Model; T: Tables; F: Fields; me: Collab | null; kind: Kind; record: AirtableRecord; canChange: boolean; change: () => void; say: Say}) {
    const {model, T, F, me, kind, record, canChange, change, say} = props;
    const {t} = useCfg();
    const v = sourceView(kind, record, F);
    const inLists = useMemo(() => listsContaining(model.lists, kind, record.id), [model.lists, kind, record.id]);
    const editable = useMemo(() => model.lists.filter((l) => l.canEdit && !l.archived && !l.isDynamic).sort((a, b) => a.name.localeCompare(b.name, 'he')), [model.lists]);
    const [pending, setPending] = useState<Map<string, boolean>>(new Map()); // listId → optimistic in/out
    const [busy, setBusy] = useState<Set<string>>(new Set());
    const [open, setOpen] = useState(false);
    const [newName, setNewName] = useState<string | null>(null);
    const popRef = useRef<HTMLDivElement>(null);

    const realIn = (l: ListVM) => l.items.some((i) => i.kind === kind && i.sourceId === record.id);
    const isIn = (l: ListVM) => pending.get(l.id) ?? realIn(l);
    useEffect(() => {
        setPending((p) => {
            let changed = false;
            const n = new Map(p);
            for (const [id, want] of p) {
                const l = model.lists.find((x) => x.id === id);
                if (l && realIn(l) === want && !busy.has(id)) {
                    n.delete(id);
                    changed = true;
                }
            }
            return changed ? n : p;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model.lists, busy]);
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (popRef.current?.contains(t) || t.closest('.c-add')) return;
            setOpen(false);
            setNewName(null);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const run = async (listId: string, want: boolean, fn: () => Promise<unknown>, okText: string) => {
        setPending((p) => new Map(p).set(listId, want));
        setBusy((b) => new Set(b).add(listId));
        try {
            await fn();
            say(okText);
        } catch (e) {
            setPending((p) => {
                const n = new Map(p);
                n.delete(listId);
                return n;
            });
            say(heErr(e), {err: true, detail: detailErr(e)});
        } finally {
            setBusy((b) => {
                const n = new Set(b);
                n.delete(listId);
                return n;
            });
        }
    };
    const toggle = (l: ListVM) => {
        if (busy.has(l.id) || l.isDynamic) return;
        if (isIn(l)) {
            const items = l.items.filter((i) => i.kind === kind && i.sourceId === record.id);
            void run(l.id, false, () => unlinkItems(T, F, items, l.id), `הוסר מ״${l.name}״`);
        } else {
            void run(l.id, true, () => createItem(T, F, l.id, kind, record.id, v.name, nextOrder(l)), `נוסף ל״${l.name}״ ✓`);
        }
    };
    const createAndAdd = async () => {
        const name = (newName ?? '').trim();
        if (!name || !me) return;
        try {
            const listId = await createQuickList(T, F, me.id, name);
            setNewName(null);
            await run(listId, true, () => createItem(T, F, listId, kind, record.id, v.name, 10), `נוצרה ״${name}״ וה${SRC[kind].he} נוסף אליה 🎉`);
        } catch (e) {
            say(heErr(e), {err: true, detail: detailErr(e)});
        }
    };
    const check = async (i: Item) => {
        try {
            await setChecked(T, F, i.rec, !i.checked);
        } catch (e) {
            say(heErr(e), {err: true, detail: detailErr(e)});
        }
    };

    return (
        <div className="compact">
            <div className="c-head">
                <Thumb pic={v.pic} kind={kind} size="sm" alt={v.name} />
                <div className="c-head-text">
                    <b>{v.name}</b>
                    <span className="muted">{inLists.length === 0 ? 'עוד לא באף רשימה' : inLists.length === 1 ? 'ברשימה אחת' : `ב־${inLists.length} רשימות`}</span>
                </div>
                <span className="spacer" />
                {canChange ? (
                    <button type="button" className="btn ghost small" onClick={change}>
                        החלפה
                    </button>
                ) : null}
                <span className="c-add">
                    <button type="button" className="btn primary small" onClick={() => setOpen((o) => !o)} disabled={!me} aria-expanded={open}>
                        {t('Button_Text_4')}
                    </button>
                    {open ? (
                        <div className="c-pop" ref={popRef} role="dialog" aria-label="הוסף לרשימה">
                            <div className="lbl">הרשימות שלי</div>
                            {editable.length === 0 ? <p className="muted small-text">עוד אין לך רשימות.</p> : null}
                            {editable.map((l) => {
                                const on = isIn(l);
                                return (
                                    <button key={l.id} type="button" className="opt" role="menuitemcheckbox" aria-checked={on} onClick={() => toggle(l)}>
                                        <span className={`cb${on ? ' on' : ''}`} aria-hidden="true">
                                            {on ? '✓' : ''}
                                        </span>
                                        <span className="opt-name">{l.name}</span>
                                        {l.isChecklist ? <small className="muted">צ׳קליסט</small> : null}
                                    </button>
                                );
                            })}
                            {newName === null ? (
                                <button type="button" className="newl" onClick={() => setNewName('')}>
                                    + רשימה חדשה
                                </button>
                            ) : (
                                <div className="newl-form">
                                    <input
                                        autoFocus
                                        dir="rtl"
                                        value={newName}
                                        placeholder="שם הרשימה"
                                        aria-label="שם הרשימה החדשה"
                                        onChange={(e) => setNewName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') void createAndAdd();
                                            if (e.key === 'Escape') setNewName(null);
                                        }}
                                    />
                                    <button type="button" className="btn primary small" disabled={!newName.trim()} onClick={() => void createAndAdd()}>
                                        יצירה
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : null}
                </span>
            </div>
            {inLists.length === 0 ? (
                <p className="c-empty">
                    {SRC[kind].emoji} ה{SRC[kind].he} הזה עוד לא ברשימה אף אחת. לחצו ״+ הוסף לרשימה״.
                </p>
            ) : (
                <ul className="c-rows">
                    {inLists.map(({list: l, items}) => {
                        const it = items[0];
                        return (
                            <li key={l.id} className={`c-row${l.isDynamic ? ' is-dyn' : ''}`}>
                                {l.isChecklist ? (
                                    <button
                                        type="button"
                                        className={`check small${it.checked ? ' on' : ''}`}
                                        role="checkbox"
                                        aria-checked={it.checked}
                                        aria-label={`סימון ברשימה ${l.name}`}
                                        disabled={!l.canEdit}
                                        onClick={() => void check(it)}
                                    >
                                        {it.checked ? '✓' : ''}
                                    </button>
                                ) : null}
                                <Cover list={l} compact />
                                <div className="c-row-main">
                                    <div className="c-row-title">
                                        <button type="button" className="item-name" title={l.name} onClick={() => expandRecord(l.rec)}>
                                            {l.name}
                                        </button>
                                        <TypeBadge list={l} />
                                        {l.archived ? <span className="badge archived">מוסתרת</span> : null}
                                    </div>
                                    {l.isDynamic ? <div className="muted one-line">⚡ תואם לרשימה דינמית – מתעדכן לבד לפי התנאים</div> : null}
                                    {it.notes ? <div className="muted one-line">📝 {it.notes}</div> : null}
                                </div>
                                {l.canEdit && !l.isDynamic ? (
                                    <button type="button" className="remove" title="הסרה מהרשימה" onClick={() => toggle(l)}>
                                        ✕ הסרה
                                    </button>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

// ======================= my lists (Staff Home) =======================
const CHIPS: Array<{key: HomeFilter; he: ListsText}> = [
    {key: 'all', he: 'Tab_Label_1'},
    {key: 'mine', he: 'Tab_Label_2'},
    {key: 'shared', he: 'Tab_Label_3'},
    {key: 'public', he: 'Tab_Label_4'},
];
export function MyListsCompact(props: {model: Model; T: Tables; F: Fields; me: Collab | null; limit: number; say: Say}) {
    const {model, T, F, me, limit, say} = props;
    const {t} = useCfg();
    const [filter, setFilter] = useState<HomeFilter>('all');
    const [openId, setOpenId] = useState<string | null>(null);
    const [all, setAll] = useState(false);
    const counts = useMemo(() => homeCounts(model.lists, false), [model.lists]);
    const lists = useMemo(() => homeLists(model.lists, filter, false).sort(homeOrder), [model.lists, filter]);
    const shown = all ? lists : lists.slice(0, limit);
    const check = async (i: Item) => {
        try {
            await setChecked(T, F, i.rec, !i.checked);
        } catch (e) {
            say(heErr(e), {err: true, detail: detailErr(e)});
        }
    };
    return (
        <div className="compact">
            <div className="c-head">
                <h2 className="c-title">{t('Heading_5')}</h2>
                <span className="spacer" />
                <span className="muted small-text">{me ? me.name : 'רשימות ציבוריות'}</span>
            </div>
            <div className="chips small">
                {CHIPS.map((c) => (
                    <button key={c.key} type="button" className={`chip${filter === c.key ? ' on' : ''}`} aria-pressed={filter === c.key} onClick={() => setFilter(c.key)}>
                        {t(c.he)} <span className="count">{counts[c.key]}</span>
                    </button>
                ))}
            </div>
            {lists.length === 0 ? (
                <p className="c-empty">{t('Empty_State_Text_5')}</p>
            ) : (
                <ul className="c-rows">
                    {shown.map((l) => {
                        const opened = openId === l.id;
                        const done = l.items.filter((i) => i.checked).length;
                        return (
                            <li key={l.id} className={`c-row col${opened ? ' opened' : ''}`}>
                                <button type="button" className="c-row-btn" aria-expanded={opened} onClick={() => setOpenId(opened ? null : l.id)}>
                                    <Cover list={l} compact />
                                    <div className="c-row-main">
                                        <div className="c-row-title">
                                            <b>{l.name}</b>
                                            <TypeBadge list={l} />
                                            </div>
                                        <div className="muted one-line">{l.items.slice(0, 3).map((i) => i.name).join(' · ') || (l.isDynamic ? 'אין כרגע פריטים תואמים' : 'הרשימה עדיין ריקה')}</div>
                                        {l.isChecklist && l.items.length ? <Progress done={done} total={l.items.length} /> : null}
                                    </div>
                                    <span className="muted c-count">
                                        {l.isDynamic ? `⚡ ${countHe(l.source, l.items.length)}` : l.isChecklist && l.items.length ? `✓ ${done}/${l.items.length}` : itemsCountHe(l.items.length)}
                                    </span>
                                    <span className="chev" aria-hidden="true">
                                        {opened ? '▴' : '▾'}
                                    </span>
                                </button>
                                {opened ? (
                                    <ul className="c-items">
                                        {l.items.length === 0 ? <li className="muted">{l.isDynamic ? 'אין כרגע פריטים תואמים.' : 'אין פריטים.'}</li> : null}
                                        {l.isDynamic ? <li className="muted small-text">⚡ מתעדכנת לבד לפי התנאים</li> : null}
                                        {l.items.slice(0, 20).map((i) => (
                                            <li key={i.id} className={l.isChecklist && i.checked ? 'is-done' : ''}>
                                                {l.isChecklist ? (
                                                    <button
                                                        type="button"
                                                        className={`check small${i.checked ? ' on' : ''}`}
                                                        role="checkbox"
                                                        aria-checked={i.checked}
                                                        aria-label={`סימון ${i.name}`}
                                                        disabled={!l.canEdit}
                                                        onClick={() => void check(i)}
                                                    >
                                                        {i.checked ? '✓' : ''}
                                                    </button>
                                                ) : null}
                                                <Thumb pic={i.pic} kind={i.kind} size="sm" alt={i.name} />
                                                <button type="button" className="item-name small" onClick={() => openRecord([i.source, i.rec], say)}>
                                                    {i.name}
                                                </button>
                                                <SourceBadge kind={i.kind} src={i.src} fields={model.unknownFields} />
                                            </li>
                                        ))}
                                        <li>
                                            <button type="button" className="btn ghost small" onClick={() => expandRecord(l.rec)}>
                                                פתיחת הרשימה ←
                                            </button>
                                        </li>
                                    </ul>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            )}
            {lists.length > limit ? (
                <button type="button" className="btn ghost small" onClick={() => setAll((a) => !a)}>
                    {all ? 'הצגת פחות' : `הצגת כל ${lists.length} הרשימות`}
                </button>
            ) : null}
        </div>
    );
}
