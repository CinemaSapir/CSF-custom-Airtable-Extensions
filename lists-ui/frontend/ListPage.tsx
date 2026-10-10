import {useEffect, useMemo, useState} from 'react';
import {type Record as AirtableRecord} from '@airtable/blocks/interface/models';
import {useCfg} from './cfg';
import {type Fields, type Item, type Kind, type ListVM, type Model, type Tables, SRC, dropOrder, kindChoices, errText, links, orderUpdates, rankPicks, sourceView, stepOrder, uniqueLine} from './model';
import {canHide, detailErr, heErr, newItemFields, setShowChecks} from './actions';
import {DynamicListPage} from './Dynamic';
import {Avatar, ContentTags, Cover, Progress, SourceBadge, Thumb, TypeBadge, UnknownTablesNotice, itemsCountHe, openRecord, type ToastMsg} from './ui';
import {DeleteList, HeroSide, HeroTools, InlineText, ListDescription, SharedRow, useHideToggle} from './header';

type Say = (text: string, opts?: Partial<Omit<ToastMsg, 'text' | 'n'>>) => void;
const BATCH = 50;

export function ListPage(props: {list: ListVM | null; model: Model; T: Tables; F: Fields; back: () => void; say: Say; meId: string | null}) {
    const {list, back} = props;
    const {t} = useCfg();
    if (!list) {
        return (
            <div className="page">
                <button type="button" className="back" onClick={back}>
                    {t('Button_Text_5')}
                </button>
                <div className="empty-state">
                    <div className="big-emoji">🫥</div>
                    <h2>הרשימה לא נמצאה</h2>
                    <p>ייתכן שהיא נמחקה, או שאין לך גישה אליה.</p>
                </div>
            </div>
        );
    }
    if (list.isDynamic) return <DynamicListPage {...props} list={list} />;
    return <ListPageInner {...props} list={list} />;
}

function ListPageInner(props: {list: ListVM; model: Model; T: Tables; F: Fields; back: () => void; say: Say; meId: string | null}) {
    const {list, model, T, F, back, say, meId} = props;
    const {t} = useCfg();
    const canEdit = list.canEdit;
    const it = T.items;

    // ---------- order (optimistic while writing) ----------
    const serverIds = useMemo(() => list.items.map((i) => i.id), [list.items]);
    const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
    useEffect(() => {
        if (pendingOrder && pendingOrder.join('|') === serverIds.join('|')) setPendingOrder(null);
    }, [serverIds, pendingOrder]);
    const byId = useMemo(() => new Map(list.items.map((i) => [i.id, i])), [list.items]);
    const ordered: Item[] = useMemo(() => {
        if (!pendingOrder) return list.items;
        const out = pendingOrder.map((id) => byId.get(id)).filter(Boolean) as Item[];
        for (const i of list.items) if (!pendingOrder.includes(i.id)) out.push(i);
        return out;
    }, [pendingOrder, list.items, byId]);

    // ---------- optimistic checks ----------
    const [pendingCheck, setPendingCheck] = useState<Map<string, boolean>>(new Map());
    useEffect(() => {
        setPendingCheck((p) => {
            let changed = false;
            const n = new Map(p);
            for (const [id, v] of p) {
                if (byId.get(id)?.checked === v) {
                    n.delete(id);
                    changed = true;
                }
            }
            return changed ? n : p;
        });
    }, [byId]);
    const isChecked = (i: Item) => pendingCheck.get(i.id) ?? i.checked;
    const done = ordered.filter(isChecked).length;
    const [hidden, setHidden] = useState<Set<string>>(new Set()); // optimistic removal

    const denied = (detail?: string) => say(t('Error_Text_5'), {err: true, detail});

    const persistOrder = async (ids: string[]) => {
        if (!F.iSortOrder) return say('שדה הסדר לא זמין באלמנט – הסדר לא נשמר.', {err: true});
        setPendingOrder(ids);
        const sortField = F.iSortOrder;
        const updates = orderUpdates(ids, (id) => (byId.get(id)?.rec.getCellValue(sortField) as number | null) ?? null).map((u) => ({
            id: u.id,
            fields: {[sortField.id]: u.value},
        }));
        if (!updates.length) return;
        const chk = it.checkPermissionsForUpdateRecords(updates);
        if (!chk.hasPermission) {
            setPendingOrder(null);
            return denied(chk.reasonDisplayString);
        }
        try {
            for (let k = 0; k < updates.length; k += BATCH) await it.updateRecordsAsync(updates.slice(k, k + BATCH));
            say('הסדר נשמר ✓');
        } catch (e) {
            setPendingOrder(null);
            say('הסדר לא נשמר. נסו שוב.', {err: true, detail: errText(e)});
        }
    };

    const move = (from: number, to: number) => {
        const ids = ordered.map((i) => i.id);
        const next = stepOrder(ids, from, to);
        if (next !== ids) void persistOrder(next);
    };

    const toggleCheck = async (i: Item) => {
        if (!F.iChecked) return;
        const want = !isChecked(i);
        const fields = {[F.iChecked.id]: want};
        const chk = it.checkPermissionsForUpdateRecord(i.rec, fields);
        if (!chk.hasPermission) return denied(chk.reasonDisplayString);
        setPendingCheck((p) => new Map(p).set(i.id, want));
        try {
            await it.updateRecordAsync(i.rec, fields);
            if (want && done + 1 === ordered.length) say('🎉 כל הפריטים סומנו!');
        } catch (e) {
            setPendingCheck((p) => {
                const n = new Map(p);
                n.delete(i.id);
                return n;
            });
            say('הסימון לא נשמר.', {err: true, detail: errText(e)});
        }
    };

    const saveNotes = async (i: Item, v: string) => {
        if (!F.iNotes) return false;
        const fields = {[F.iNotes.id]: v};
        const chk = it.checkPermissionsForUpdateRecord(i.rec, fields);
        if (!chk.hasPermission) {
            denied(chk.reasonDisplayString);
            return false;
        }
        try {
            await it.updateRecordAsync(i.rec, fields);
            return true;
        } catch (e) {
            say('ההערה לא נשמרה.', {err: true, detail: errText(e)});
            return false;
        }
    };

    /** remove from list = unlink only (the List Item keeps any other list links; nothing is deleted) */
    const removeItem = async (i: Item) => {
        if (!F.iList) return;
        const before = links(i.rec, F.iList);
        const after = before.filter((l) => l.id !== list.id).map((l) => ({id: l.id}));
        const fields = {[F.iList.id]: after};
        const chk = it.checkPermissionsForUpdateRecord(i.rec, fields);
        if (!chk.hasPermission) return denied(chk.reasonDisplayString);
        setHidden((h) => new Set(h).add(i.id));
        try {
            await it.updateRecordAsync(i.rec, fields);
            say(`״${i.name}״ הוסר מהרשימה`, {
                action: {
                    label: 'ביטול',
                    run: () => {
                        void it
                            .updateRecordAsync(i.rec, {[F.iList!.id]: before.map((l) => ({id: l.id}))})
                            .then(() => setHidden((h) => {
                                const n = new Set(h);
                                n.delete(i.id);
                                return n;
                            }))
                            .catch((e) => say('לא הצלחנו להחזיר את הפריט.', {err: true, detail: errText(e)}));
                    },
                },
            });
        } catch (e) {
            setHidden((h) => {
                const n = new Set(h);
                n.delete(i.id);
                return n;
            });
            say('הפריט לא הוסר.', {err: true, detail: errText(e)});
        }
    };

    const setType = async (checklist: boolean) => {
        if (checklist === list.isChecklist) return;
        try {
            await setShowChecks(T, F, list.rec, checklist);
            say(checklist ? 'סימוני ✓ מוצגים ברשימה' : 'סימוני ✓ הוסתרו (הסימונים נשמרים)');
        } catch (e) {
            say(heErr(e), {err: true, detail: detailErr(e)});
        }
    };

    // v0.5.13: same hide/show + «ביטול» toast as the Home row eye toggle
    const hideToggle = useHideToggle(T, F, say);
    const toggleArchived = () => hideToggle(list, document.activeElement);


    // ---------- drag and drop ----------
    const [armed, setArmed] = useState<string | null>(null);
    const [dragId, setDragId] = useState<string | null>(null);
    const [over, setOver] = useState<{id: string; after: boolean} | null>(null);
    const onDrop = () => {
        if (!dragId || !over || dragId === over.id) return reset();
        const ids = dropOrder(
            ordered.map((i) => i.id),
            dragId,
            over.id,
            over.after,
        );
        reset();
        void persistOrder(ids);
    };
    const reset = () => {
        setDragId(null);
        setOver(null);
        setArmed(null);
    };

    const [adding, setAdding] = useState(false);
    const nextOrder = Math.max(0, ...ordered.map((i) => (i.order < 1_000_000 ? i.order : 0))) + 10;
    const rows = ordered.filter((i) => !hidden.has(i.id));
    const ownerLabel = list.relation === 'mine' ? 'שלי' : (list.owner?.name ?? 'ללא בעלים');

    return (
        <div className="page">
            <button type="button" className="back" onClick={back}>
                {t('Button_Text_5')}
            </button>

            <section className="hero">
                <Cover list={list} label />
                <div className="hero-main">
                    <h1>{list.name}</h1>
                    <ListDescription list={list} T={T} F={F} say={say} />
                    <div className="meta">
                        <Avatar c={list.owner} size={22} /> <span>בעלים: {ownerLabel}</span>
                        <span>· {itemsCountHe(rows.length)}</span>
                    </div>
                    <SharedRow list={list} model={model} T={T} F={F} meId={meId} say={say} />
                    {list.isChecklist && rows.length ? (
                        <div className="check-progress">
                            <span>
                                {done === rows.length ? '🎉 הכל סומן!' : `סומנו ${done} מתוך ${rows.length}`}
                            </span>
                            <Progress done={done} total={rows.length} />
                        </div>
                    ) : null}
                </div>
                {/* v0.5.9 the owner: header controls → one small cluster at the header's end edge (left in RTL);
                    v0.5.10: the type/kind pills sit under it, bottom-left */}
                <HeroSide
                    pills={
                        <>
                            <TypeBadge list={list} />
                            {list.archived ? <span className="badge archived">מוסתרת מדף הבית</span> : null}
                            <ContentTags items={rows} />
                        </>
                    }
                    tools={
                <HeroTools>
                    {canEdit && F.lType ? (
                        <label className="switch-row mini">
                            <input type="checkbox" checked={list.isChecklist} onChange={(e) => void setType(e.target.checked)} />
                            <span className="switch" aria-hidden="true" />
                            <span>הצגת סימוני ✓</span>
                        </label>
                    ) : null}
                    {canHide(T, F, list) ? (
                        <button type="button" className="tool-link" onClick={() => void toggleArchived()}>
                            {list.archived ? '↩ החזרה לדף הבית' : '🙈 הסתרה מדף הבית'}
                        </button>
                    ) : null}
                    <DeleteList list={list} T={T} F={F} back={back} say={say} />
                </HeroTools>
                    }
                />
            </section>

            {!canEdit ? <p className="msg info">רשימה ציבורית של {list.owner?.name ?? 'משתמש אחר'} – צפייה בלבד.</p> : null}

            <UnknownTablesNotice count={rows.filter((i) => i.unknown).length} fields={model.unknownFields} />
            <section className="items" onDragOver={(e) => dragId && e.preventDefault()} onDrop={(e) => (e.preventDefault(), onDrop())}>
                {rows.length === 0 ? (
                    <div className="empty-state small">
                        <div className="big-emoji">🌱</div>
                        <h2>הרשימה ריקה</h2>
                        <p>{canEdit ? 'הוסיפו סרט, משבצת או אדם – והכל יופיע כאן, ברשימה אחת.' : 'עוד לא נוספו פריטים.'}</p>
                    </div>
                ) : (
                    <ol className="item-list compact">
                        {rows.map((i, idx) => (
                            <li
                                key={i.id}
                                className={`item${dragId === i.id ? ' dragging' : ''}${over?.id === i.id ? (over.after ? ' drop-after' : ' drop-before') : ''}${list.isChecklist && isChecked(i) ? ' is-done' : ''}`}
                                draggable={canEdit && armed === i.id}
                                onDragStart={(e) => {
                                    setDragId(i.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/plain', i.id);
                                }}
                                onDragOver={(e) => {
                                    if (!dragId) return;
                                    e.preventDefault();
                                    const r = e.currentTarget.getBoundingClientRect();
                                    const after = e.clientY > r.top + r.height / 2;
                                    if (over?.id !== i.id || over.after !== after) setOver({id: i.id, after});
                                }}
                                onDragEnd={reset}
                            >
                                {canEdit ? (
                                    <button
                                        type="button"
                                        className="handle"
                                        title="גררו כדי לשנות סדר (או חצים למעלה/למטה)"
                                        aria-label={`שינוי מיקום של ${i.name}`}
                                        onPointerDown={() => setArmed(i.id)}
                                        onPointerUp={() => !dragId && setArmed(null)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                move(idx, idx - 1);
                                            } else if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                move(idx, idx + 1);
                                            }
                                        }}
                                    >
                                        ⋮⋮
                                    </button>
                                ) : (
                                    <span className="handle-space" />
                                )}
                                {list.isChecklist ? (
                                    <button
                                        type="button"
                                        className={`check${isChecked(i) ? ' on' : ''}`}
                                        role="checkbox"
                                        aria-checked={isChecked(i)}
                                        aria-label={`סימון ${i.name}`}
                                        disabled={!canEdit || !F.iChecked}
                                        onClick={() => void toggleCheck(i)}
                                    >
                                        {isChecked(i) ? '✓' : ''}
                                    </button>
                                ) : null}
                                <Thumb pic={i.pic} kind={i.kind} alt={i.name} size="sm" icon={i.src?.icon} />
                                <div className="item-main">
                                    <div className="item-title">
                                        <button
                                            type="button"
                                            className="item-name"
                                            title={i.name}
                                            onClick={() => openRecord([i.source, i.rec], say)}
                                        >
                                            {i.name}
                                        </button>
                                        <SourceBadge kind={i.kind} src={i.src} fields={model.unknownFields} />
                                        {i.sub ? <span className="item-sub">{i.sub}</span> : null}
                                    </div>
                                    <Notes item={i} canEdit={canEdit && Boolean(F.iNotes)} save={saveNotes} />
                                </div>
                                {canEdit ? (
                                    <button type="button" className="remove" title="הסרה מהרשימה" aria-label={`הסרת ${i.name} מהרשימה`} onClick={() => void removeItem(i)}>
                                        ✕
                                    </button>
                                ) : null}
                            </li>
                        ))}
                    </ol>
                )}
            </section>
            {canEdit ? (
                adding ? (
                    <AddItem list={list} model={model} T={T} F={F} say={say} close={() => setAdding(false)} nextOrder={nextOrder} />
                ) : (
                    <button type="button" className="btn add-btn" onClick={() => setAdding(true)}>
                        {t('Button_Text_3')}
                    </button>
                )
            ) : null}
        </div>
    );
}

function Notes(props: {item: Item; canEdit: boolean; save: (i: Item, v: string) => Promise<boolean>}) {
    const {item, canEdit, save} = props;
    const {t} = useCfg();
    return <InlineText value={item.notes} canEdit={canEdit} save={(v) => save(item, v)} placeholder={t('Helper_Text_4')} label={`הערות ל${item.name}`} roClassName="notes-ro" />;
}

// ---------------- add item: mixed types, one search ----------------
function AddItem(props: {list: ListVM; model: Model; T: Tables; F: Fields; say: Say; close: () => void; nextOrder: number}) {
    const {list, model, T, F, say, close} = props;
    // v0.5.8: exactly the kinds of the new-list picker (model.kindChoices); a chip is enabled when its List Item link is available
    const choices = kindChoices(F, model);
    const available2 = choices.filter((c) => c.canAdd).map((c) => c.k);
    const missing = choices.filter((c) => c.why === 'link').length;
    const noTable = choices.filter((c) => c.why === 'table').length;
    const tableKind = list.table?.kind ?? null;
    const suggested = tableKind && available2.includes(tableKind) ? [tableKind] : list.contents.length ? available2.filter((k) => list.contents.includes(k)) : [];
    const [picked, setPicked] = useState<Kind[]>(suggested.length ? suggested : available2.length === 1 ? [available2[0]] : []);
    const [q, setQ] = useState('');
    const [adding, setAdding] = useState<Set<string>>(new Set());
    const [order, setOrder] = useState(props.nextOrder);
    const inList = useMemo(() => new Set(list.items.map((i) => i.sourceId).filter(Boolean) as string[]), [list.items]);
    const {rows: options, hiddenBlank} = useMemo(() => {
        const rows = picked.flatMap((k) =>
            (model.sourceRecords[k] ?? []).map((r) => {
                const v = sourceView(k, r, F);
                // v0.5.8: the table name lives in the pick-tag only (was «אור בעמק, סרט»); it stays searchable
                // v0.5.10: cleaned + only non-empty parts (no stray « ·», e.g. «אלמה ·» → «אלמה»)
                const line = uniqueLine([v.name, r.name]);
                return {k, r, v, line, hay: `${line} ${SRC[k].he} ${SRC[k].plural}`.toLowerCase(), dup: 0};
            }),
        );
        // one row per record; records that share a name (e.g. duplicate seed rows) get a «#2» hint so they read as different records
        const seen = new Set<string>();
        const uniq = rows.filter((o) => (seen.has(`${o.k}:${o.r.id}`) ? false : (seen.add(`${o.k}:${o.r.id}`), true)));
        const byName = new Map<string, number>();
        for (const o of uniq.sort((a, b) => a.line.localeCompare(b.line, 'he') || a.r.id.localeCompare(b.r.id))) {
            const key = `${o.k}:${o.line}`;
            const c = (byName.get(key) ?? 0) + 1;
            byName.set(key, c);
            o.dup = c;
        }
        const multi = (o: {k: Kind; line: string}) => (byName.get(`${o.k}:${o.line}`) ?? 0) > 1;
        // v0.5.18 (Critic minor a): nameless records («-», empty, «רשומה ללא שם») last, and hidden unless searched for (model.rankPicks)
        return rankPicks(
            uniq.map((o) => ({...o, dup: multi(o) ? o.dup : 0})),
            q,
            60,
        );
    }, [picked, q, model.sourceRecords, F]);

    const toggle = (k: Kind) => {
        setPicked((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
        setQ('');
    };

    const add = async (k: Kind, r: AirtableRecord, name: string) => {
        // v0.5.11: same cells as the picker path – Type (= the source table's name) is always written when writable
        const fields = newItemFields(T, F, list.id, k, r.id, name, order);
        if (!fields) return;
        const chk = T.items.checkPermissionsForCreateRecord(fields);
        if (!chk.hasPermission) return say('אין לך הרשאה להוסיף פריטים לרשימה הזו.', {err: true, detail: chk.reasonDisplayString});
        setAdding((s) => new Set(s).add(r.id));
        setOrder((o) => o + 10);
        try {
            await T.items.createRecordAsync(fields);
            say(`${model.labelOf(k).icon} ״${name}״ נוסף לרשימה`);
        } catch (e) {
            say('הפריט לא נוסף.', {err: true, detail: errText(e)});
        } finally {
            setAdding((s) => {
                const n = new Set(s);
                n.delete(r.id);
                return n;
            });
        }
    };

    const shown = choices.map(({k}) => ({k, label: `הוספת ${SRC[k].he}`}));
    const head = picked.length ? picked.map((k) => SRC[k].he).join(' · ') : 'מה מוסיפים?';

    return (
        <div className="add-panel">
            <div className="add-head">
                <h3>{head}</h3>
                <span className="spacer" />
                <button type="button" className="btn ghost" onClick={close}>
                    סיום
                </button>
            </div>
            {available2.length === 0 ? (
                <p className="msg err">אי אפשר להוסיף פריטים: שדות הקישור ב־List Item לא מופעלים באלמנט.</p>
            ) : null}
            <div className="kind-pick">
                {shown.map(({k, label}) => {
                    const on = available2.includes(k);
                    const c = choices.find((x) => x.k === k);
                    const chosen = picked.includes(k);
                    return (
                        <button
                            key={k}
                            type="button"
                            className={`kind chip-kind${chosen ? ' suggested' : ''}${on ? '' : ' off'}`}
                            disabled={!on}
                            aria-pressed={chosen}
                            title={on ? undefined : (c?.tip ?? undefined)}
                            onClick={() => on && toggle(k)}
                        >
                            <span className="kind-emoji" aria-hidden="true">{SRC[k].emoji}</span>
                            <b>{label}</b>
                        </button>
                    );
                })}
            </div>
            {missing > 0 ? (
                <p className="muted small-text" style={{marginTop: 8}}>
                    {missing === 1 ? 'סוג אחד מוצג אבל עוד לא ניתן להוספה' : `${missing} סוגים מוצגים אבל עוד לא ניתנים להוספה`} – צריך להפעיל את שדה הקישור שלהם ב־List Item בהגדרות האלמנט.
                </p>
            ) : null}
            {noTable > 0 ? (
                <p className="muted small-text" style={{marginTop: 4}}>
                    {noTable === 1 ? 'לסוג אחד אין טבלה בבסיס הזה' : `ל־${noTable} סוגים אין טבלה בבסיס הזה`} – הם יופעלו בבסיס שבו הטבלה קיימת (העבירו את העכבר מעל הסוג כדי לראות את שם הטבלה).
                </p>
            ) : null}
            {picked.length ? (
                <>
                    <input
                        autoFocus
                        className="search wide"
                        type="search"
                        dir="rtl"
                        value={q}
                        placeholder="חיפוש בכל הסוגים שנבחרו"
                        aria-label="חיפוש בכל הסוגים שנבחרו"
                        onChange={(e) => setQ(e.target.value)}
                        style={{marginTop: 10}}
                    />
                    <div className="pick-grid">
                        {options.map(({k, r, v, line, dup}) => {
                            const already = inList.has(r.id);
                            const busy = adding.has(r.id);
                            return (
                                <button
                                    key={`${k}:${r.id}`}
                                    type="button"
                                    className={`pick${already ? ' in' : ''}`}
                                    disabled={already || busy}
                                    title={dup ? `${line} #${dup}` : line}
                                    onClick={() => void add(k, r, v.name)}
                                >
                                    <Thumb pic={v.pic} kind={k} size="sm" alt={v.name} />
                                    <span className="pick-text">
                                        <b title={line}>{line}</b>
                                        {dup ? <small className="muted dup-hint"> #{dup}</small> : null}
                                    </span>
                                    <span className="pick-tag">{model.labelOf(k).he}</span>
                                    <span className="pick-state">{already ? '✓ ברשימה' : busy ? '…' : '+'}</span>
                                </button>
                            );
                        })}
                        {options.length === 0 ? <p className="muted">{q.trim() ? `לא נמצא ״${q.trim()}״` : 'אין רשומות להוספה'}</p> : null}
                    </div>
                    {hiddenBlank > 0 ? (
                        <p className="muted small-text pick-hidden-note" style={{marginTop: 6}}>
                            {hiddenBlank === 1 ? 'רשומה אחת ללא שם הוסתרה' : `${hiddenBlank} רשומות ללא שם הוסתרו`} – חפשו «ללא שם» כדי לראות אותן.
                        </p>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}
// v0.3.0: the Checklists link UI is hidden per the Critic verdict (Lists › Linked Checklist stays in the base, unused).
