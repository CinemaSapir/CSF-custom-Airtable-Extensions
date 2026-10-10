/**
 * Dynamic lists UI: table picker (v0.4.0+, any table configured in List_Sources), condition editor
 * (Hebrew dropdowns, 1–3 AND conditions over the table's curated fields) and the read-only dynamic list page.
 * v0.4.1: picker warning distinguishes List_Sources-thin vs tracking fields not enabled on the element.
 */
import {useMemo, useState} from 'react';
import {type Field, type Record as AirtableRecord} from '@airtable/blocks/interface/models';
import {useCfg} from './cfg';
import {type Fields, type ListVM, type Model, type Tables, dynamicReady} from './model';
import {
    type Catalog,
    type Cond,
    type DynResult,
    type FType,
    type Op,
    type Source,
    OPS_BY_TYPE,
    OP_HE,
    cellNames,
    choiceNames,
    condField,
    countHe,
    needsValue,
    pickable,
    runSpec,
    summaryHe,
    trackGate,
    DENIED_COND_CHOICES,
    sensitiveField,
} from './dynlogic';
import {canHide, detailErr, heErr, saveConditions} from './actions';
import {Avatar, Cover, PrivacyLine, SourceBadge, TablePill, Thumb, TypeBadge, openRecord, type ToastMsg} from './ui';
import {DeleteList, HeroSide, HeroTools, ListDescription, SharedRow, useHideToggle} from './header';

type Say = (text: string, opts?: Partial<Omit<ToastMsg, 'text' | 'n'>>) => void;
export {countHe};

// ======================= table picker =======================
/** Hebrew dropdown of the configured source tables; unavailable ones are listed but disabled with the reason */
export function TablePicker(props: {catalog: Catalog; model: Model; value: string | null; onChange: (s: Source) => void; /** v0.5.4: manual lists skip the tracking-fields gate */ manual?: boolean}) {
    const {catalog, model, value, onChange, manual = false} = props;
    const list = pickable(catalog);
    const why = (s: Source) => {
        if (!s.table) return ' (לא זמינה לאלמנט)';
        if (model.recordsOf(s) === null) return ' (מעבר למגבלת הטבלאות)';
        return manual ? '' : trackGate(s).why;
    };
    return (
        <div className="table-pick">
            <select
                dir="rtl"
                aria-label="טבלת המקור"
                value={value ?? ''}
                onChange={(e) => {
                    const s = list.find((x) => x.key === e.target.value);
                    if (s) onChange(s);
                }}
            >
                <option value="">בחירת טבלה…</option>
                {list.map((s) => (
                    <option key={s.key} value={s.key} disabled={Boolean(why(s))}>
                        {s.icon} {s.he}
                        {why(s)}
                    </option>
                ))}
            </select>
            {value && !manual ? (() => {
                const s = list.find((x) => x.key === value);
                if (!s || !s.table || model.recordsOf(s) === null) return null;
                const g = trackGate(s);
                return g.kind === 'ok' ? null : <small className="msg err">{g.hint}</small>;
            })() : null}
        </div>
    );
}

// ======================= condition editor =======================
function valueOptions(type: FType, f: Field | null, records: AirtableRecord[]): string[] {
    if (!f) return [];
    const fromField = type === 'select' || type === 'multi' ? choiceNames(f) : [];
    const seen = new Set<string>(fromField.map((x) => x.trim()));
    if (type === 'select' || type === 'multi' || type === 'link') {
        for (const r of records) for (const n of cellNames(r.getCellValue(f))) seen.add(n.trim());
    }
    return [...seen].filter(Boolean).sort((a, b) => a.localeCompare(b, 'he'));
}

export function CondEditor(props: {source: Source; model: Model; conds: Cond[]; setConds: (c: Cond[]) => void}) {
    const {source, model, conds, setConds} = props;
    const records = model.recordsOf(source);
    const recs = records ?? [];
    const preview = useMemo(() => runSpec({sourceRef: source.key, conds}, source, records), [source, conds, records]);
    const set = (i: number, patch: Partial<Cond>) => setConds(conds.map((c, j) => (j === i ? {...c, ...patch} : c)));
    // the dropdown offers configured fields only; sensitive ones are never listed, not-enabled ones are listed disabled
    const offered = source.fields.filter((f) => f.issue !== 'sensitive' && !DENIED_COND_CHOICES.has(f.ref) && !DENIED_COND_CHOICES.has(f.he) && !sensitiveField(f.ref) && !sensitiveField(f.he));
    const keyOf = (sf: (typeof offered)[number]) => sf.field?.id ?? sf.ref;
    return (
        <div className="cond-editor">
            {conds.map((cd, i) => {
                const def = condField(source, cd.key);
                const ok = def && !def.issue && def.type ? def : null;
                const ops = ok ? OPS_BY_TYPE[ok.type!] : [];
                const showValue = ok && cd.op && needsValue(cd.op as Op);
                const t = ok?.type;
                const opts = ok && showValue && (t === 'select' || t === 'multi' || t === 'link') ? valueOptions(t, ok.field, recs) : [];
                return (
                    <div key={i} className="cond-row">
                        <span className="cond-and">{i === 0 ? 'איפה ש' : 'וגם'}</span>
                        <select
                            dir="rtl"
                            aria-label={`שדה לתנאי ${i + 1}`}
                            value={ok ? keyOf(ok) : cd.key}
                            onChange={(e) => {
                                const d = offered.find((x) => keyOf(x) === e.target.value);
                                set(i, {key: e.target.value, op: d?.type ? OPS_BY_TYPE[d.type][0] : '', value: ''});
                            }}
                        >
                            <option value="">בחירת שדה…</option>
                            {cd.key && !ok ? <option value={cd.key}>{def?.he ?? cd.key} (לא זמין)</option> : null}
                            {offered.map((sf) => (
                                <option key={keyOf(sf)} value={keyOf(sf)} disabled={Boolean(sf.issue)}>
                                    {sf.he}
                                    {sf.issue === 'missing' ? ' (לא מופעל באלמנט)' : sf.issue === 'unsupported' ? ' (סוג שדה לא נתמך)' : ''}
                                </option>
                            ))}
                        </select>
                        {ok ? (
                            <select dir="rtl" aria-label={`פעולה לתנאי ${i + 1}`} value={cd.op} onChange={(e) => set(i, {op: e.target.value, value: needsValue(e.target.value as Op) ? cd.value : ''})}>
                                {ops.map((o) => (
                                    <option key={o} value={o}>
                                        {OP_HE[o]}
                                    </option>
                                ))}
                            </select>
                        ) : null}
                        {showValue && ok ? (
                            t === 'date' ? (
                                <input type="date" aria-label={`תאריך לתנאי ${i + 1}`} value={cd.value} onChange={(e) => set(i, {value: e.target.value})} />
                            ) : t === 'number' ? (
                                <input type="number" dir="ltr" aria-label={`מספר לתנאי ${i + 1}`} value={cd.value} onChange={(e) => set(i, {value: e.target.value})} />
                            ) : t === 'text' ? (
                                <input type="text" dir="rtl" aria-label={`ערך לתנאי ${i + 1}`} value={cd.value} onChange={(e) => set(i, {value: e.target.value})} />
                            ) : (
                                <select dir="rtl" aria-label={`ערך לתנאי ${i + 1}`} value={cd.value} onChange={(e) => set(i, {value: e.target.value})}>
                                    <option value="">בחירת ערך…</option>
                                    {cd.value && !opts.includes(cd.value.trim()) ? <option value={cd.value}>{cd.value}</option> : null}
                                    {opts.map((o) => (
                                        <option key={o} value={o}>
                                            {o}
                                        </option>
                                    ))}
                                </select>
                            )
                        ) : null}
                        <button type="button" className="x" aria-label={`הסרת תנאי ${i + 1}`} title="הסרת התנאי" onClick={() => setConds(conds.filter((_, j) => j !== i))}>
                            ✕
                        </button>
                    </div>
                );
            })}
            <div className="cond-foot">
                {conds.length < 3 ? (
                    <button type="button" className="btn ghost small" onClick={() => setConds([...conds, {key: '', op: '', value: ''}])}>
                        + תנאי {conds.length ? 'נוסף' : ''}
                    </button>
                ) : (
                    <span className="muted small-text">עד 3 תנאים</span>
                )}
                <span className="spacer" />
                <span className="cond-preview">
                    {preview.tableIssue || preview.missing.length || preview.blocked.length ? '—' : `תואמים כרגע: ${countHe(source, preview.records.length)}`}
                    {preview.incomplete.length ? <small className="muted"> · תנאי לא שלם לא נספר</small> : null}
                </span>
            </div>
            <p className="muted small-text">{summaryHe({sourceRef: source.key, conds}, source)}</p>
        </div>
    );
}

/** Hebrew notices for everything that can stop a dynamic list from computing – never a crash */
export function DynNotices(props: {dyn: DynResult; sourceRef: string}) {
    const {dyn, sourceRef} = props;
    const s = dyn.source;
    return (
        <>
            {dyn.tableIssue === 'unknown' ? (
                <p className="msg err">טבלת המקור {sourceRef ? `״${sourceRef}״ ` : ''}לא מוגדרת בטבלת ההגדרות (List_Sources), ולכן הרשימה לא מחושבת.</p>
            ) : null}
            {dyn.tableIssue === 'inactive' && s ? (
                <p className="msg err">
                    הטבלה {s.icon} ״{s.he}״ כבויה כרגע בהגדרות (Active לא מסומן ב־List_Sources), ולכן הרשימה לא מחושבת.
                </p>
            ) : null}
            {dyn.tableIssue === 'unavailable' && s ? (
                <p className="msg err">
                    הטבלה {s.icon} ״{s.he}״ לא זמינה לאלמנט. יש לבחור אותה באחת מ״טבלת מקור נוספת 1–6״ בפאנל המאפיינים ולהפעיל את השדות שלה.
                </p>
            ) : null}
            {dyn.tableIssue === 'limit' && s ? <p className="msg err">יותר מדי טבלאות מקור פעילות – הטבלה ״{s.he}״ לא נטענה (האלמנט טוען עד 8 טבלאות נוספות).</p> : null}
            {dyn.missing.length ? (
                <p className="msg err">
                    לא ניתן לחשב את הרשימה:{' '}
                    {dyn.missing
                        .map((m) => (m.why === 'not-enabled' ? `השדה ״${m.he}״ לא מופעל באלמנט` : `השדה ״${m.he}״ לא מוגדר לטבלה ב־List_Sources`))
                        .join(' · ')}
                    .
                </p>
            ) : null}
            {dyn.blocked.length ? (
                <p className="msg err">השדה {dyn.blocked.map((b) => `״${b.he}״`).join(', ')} מסומן כרגיש (טלפון / מייל / ת״ז / רכב / כתובת) ולא משמש לסינון.</p>
            ) : null}
            {dyn.incomplete.length ? <p className="msg info">תנאי {dyn.incomplete.join(', ')} לא שלם ולכן לא מופעל.</p> : null}
        </>
    );
}

// ======================= dynamic list page (read-only items) =======================
export function DynamicListPage(props: {list: ListVM; model: Model; T: Tables; F: Fields; back: () => void; say: Say; meId?: string | null}) {
    const {list, model, T, F, back, say, meId = null} = props;
    const {t} = useCfg();
    const spec = list.spec!;
    const dyn = list.dyn!;
    const source = list.source;
    const isOwner = list.relation === 'mine';
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<Cond[]>([]);
    const [draftSource, setDraftSource] = useState<Source | null>(null);
    const [busy, setBusy] = useState(false);
    const startEdit = () => {
        setDraft(spec.conds.filter((c) => c.key || c.op || c.value));
        setDraftSource(source && source.active ? source : null);
        setEditing(true);
    };
    const save = async () => {
        if (!draftSource) return;
        setBusy(true);
        try {
            await saveConditions(T, F, list.rec, draftSource, draft.filter((c) => c.key));
            say('התנאים נשמרו ✓ הרשימה מתעדכנת לבד');
            setEditing(false);
        } catch (e) {
            say(heErr(e), {err: true, detail: detailErr(e)});
        } finally {
            setBusy(false);
        }
    };
    // v0.5.13: same hide/show + «ביטול» toast as the Home row eye toggle
    const hideToggle = useHideToggle(T, F, say);
    const toggleArchived = () => hideToggle(list, document.activeElement);

    const n = list.items.length;
    return (
        <div className="page">
            <button type="button" className="back" onClick={back}>
                {t('Button_Text_5')}
            </button>
            <PrivacyLine />
            <section className="hero">
                <Cover list={list} label />
                <div className="hero-main">
                    <h1>{list.name}</h1>
                    <ListDescription list={list} T={T} F={F} say={say} />
                    {/* v0.5.10: the live count joins the owner line (like «בעלים · N פריטים» on a static list) – one row less */}
                    <div className="meta">
                        <Avatar c={list.owner} size={22} /> <span>בעלים: {isOwner ? 'שלי' : (list.owner?.name ?? 'ללא בעלים')}</span>
                        <span className="dyn-count-inline">
                            · ⚡ <b>{countHe(source, n)}</b> תואמים כרגע
                        </span>
                    </div>
                    <SharedRow list={list} model={model} T={T} F={F} meId={meId} say={say} />
                    <p className="dyn-summary">מציג: {summaryHe(spec, source)}</p>
                </div>
                {/* v0.5.9: same compact end-edge cluster as the static / checklist page; v0.5.10: pills under it, bottom-left */}
                <HeroSide
                    pills={
                        <>
                            <TypeBadge list={list} />
                            {list.archived ? <span className="badge archived">מוסתרת מדף הבית</span> : null}
                            <TablePill list={list} />
                        </>
                    }
                    tools={
                <HeroTools>
                    {isOwner && !editing ? (
                        <button type="button" className="tool-link main" onClick={startEdit} disabled={!dynamicReady(F)}>
                            ✎ עריכת תנאים
                        </button>
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

            {editing ? (
                <section className="add-panel">
                    <div className="add-head">
                        <h3>עריכת הרשימה הדינמית</h3>
                    </div>
                    <div className="fld">
                        <span>מאיזו טבלה?</span>
                        <TablePicker
                            catalog={model.catalog}
                            model={model}
                            value={draftSource?.key ?? null}
                            onChange={(s) => {
                                if (s.key !== draftSource?.key) setDraft([{key: '', op: '', value: ''}]);
                                setDraftSource(s);
                            }}
                        />
                    </div>
                    {draftSource ? <CondEditor source={draftSource} model={model} conds={draft} setConds={setDraft} /> : null}
                    <div className="modal-foot">
                        <button type="button" className="btn primary" disabled={busy || !draftSource} onClick={() => void save()}>
                            {busy ? 'שומרים…' : 'שמירת תנאים'}
                        </button>
                        <button type="button" className="btn" onClick={() => setEditing(false)}>
                            ביטול
                        </button>
                    </div>
                </section>
            ) : null}

            <DynNotices dyn={dyn} sourceRef={spec.sourceRef} />
            <p className="msg info">⚡ רשימה דינמית מתעדכנת לבד לפי התנאים – אין כאן הוספה, הסרה, הערות או סימונים.</p>

            <section className="items">
                {n === 0 ? (
                    <div className="empty-state small">
                        <div className="big-emoji">🔎</div>
                        <h2>אין כרגע פריטים תואמים</h2>
                        <p>{isOwner ? 'אפשר לשנות את התנאים כדי להרחיב את הרשימה.' : 'כשיהיו רשומות שעונות על התנאים – הן יופיעו כאן לבד.'}</p>
                    </div>
                ) : (
                    <ol className="item-list compact">
                        {list.items.map((i) => (
                            <li key={i.id} className="item ro">
                                <Thumb pic={i.pic} kind={i.kind} alt={i.name} icon={i.src?.icon} size="sm" />
                                <div className="item-main">
                                    <div className="item-title">
                                        <button type="button" className="item-name" title={i.name} onClick={() => openRecord([i.rec], say)}>
                                            {i.name}
                                        </button>
                                        <SourceBadge kind={i.kind} src={i.src} />
                                        {i.sub && !(i.track && i.track.length) ? <span className="item-sub">{i.sub}</span> : null}
                                    </div>
                                    {i.track && i.track.length ? (
                                        <div className="track-sub" aria-label="שדות מעקב" title={i.track.map((t) => `${t.he} ${t.value}`).join(' · ')}>
                                            {i.track.map((t) => (
                                                <span key={t.he}>
                                                    <b>{t.he}</b> {t.value}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </section>
        </div>
    );
}
