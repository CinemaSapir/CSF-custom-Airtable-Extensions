/** v0.5.7 list-header pieces shared by the static and the dynamic list page: «מחק רשימה», inline description, «שותף עם». */
import React, {useEffect, useRef, useState} from 'react';
import {type Fields, type ListVM, type Model, type Tables} from './model';
import {canDeleteList, canSetShared, deleteList, deletePlan, detailErr, heErr, saveDescription, saveShared, setArchived, setListStatus} from './actions';
import {SharePicker, useSharePeople} from './share';
import {Avatar, holdScroll, scrollers, type ToastMsg} from './ui';
import {useCfg} from './cfg';

type Say = (text: string, opts?: Partial<Omit<ToastMsg, 'text' | 'n'>>) => void;

/** v0.5.9: the list header's small control cluster – end edge (left in RTL), wraps under the title below ~520px */
export function HeroTools(props: {children: React.ReactNode}) {
    return (
        <div className="hero-tools" role="group" aria-label="פעולות ברשימה">
            {props.children}
        </div>
    );
}

/** v0.5.10 the owner: the header's end column – control cluster on top, the small type/kind pills at the bottom-left corner
 * (level with «שותף עם»). The title is the first line on the right. Below ~520px both wrap under the title. */
export function HeroSide(props: {tools: React.ReactNode; pills: React.ReactNode}) {
    return (
        <div className="hero-side">
            {props.tools}
            <div className="badges hero-pills" aria-label="סוג ותוכן הרשימה">
                {props.pills}
            </div>
        </div>
    );
}

/**
 * v0.5.13: hide / show a list (Lists › Status = Archived ↔ Active – the field behind «הסתרה מדף הבית»; nothing is deleted).
 * Every hide/show toast carries «ביטול», which writes back exactly the Status the list had before.
 */
export type HideHooks = {
    /** v0.5.16: called right before each write (hide / show / «ביטול») – Home pins its min-height here */
    beforeWrite?: () => void;
    /** v0.5.16: called once each write has landed, with the clicked control – Home puts focus back without scrolling */
    afterWrite?: (from: Element | null | undefined) => void;
};
export function useHideToggle(T: Tables, F: Fields, say: Say, hooks: HideHooks = {}) {
    /** `from` = the clicked control: v0.5.14 keeps the scroll position of its scroll containers through the write and the undo
     * (v0.5.16: that hold is only a backstop now – the real fixes are keep.ts + hooks.beforeWrite / afterWrite) */
    return async (list: ListVM, from?: Element | null) => {
        const prev = list.status || null;
        const hide = !list.archived;
        const name = list.name;
        hooks.beforeWrite?.();
        const keep = scrollers(from);
        holdScroll(keep);
        try {
            await setArchived(T, F, list.rec, hide);
            holdScroll(keep);
            hooks.afterWrite?.(from);
            say(hide ? `״${name}״ הוסתרה – נמצאת ב«רשימות מוסתרות»` : `״${name}״ חזרה לרשימות`, {
                action: {
                    label: 'ביטול',
                    run: () => {
                        holdScroll(keep);
                        hooks.beforeWrite?.();
                        void setListStatus(T, F, list.rec, prev)
                            .then(() => holdScroll(keep))
                            .then(() => hooks.afterWrite?.(null))
                            .catch((e) => say('לא הצלחנו לבטל. נסו שוב.', {err: true, detail: detailErr(e)}));
                    },
                },
            });
        } catch (e) {
            say(heErr(e), {err: true, detail: detailErr(e)});
        }
    };
}

/** 14px line eye icon (currentColor) */
function EyeIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

/**
 * v0.5.13 the owner: the far-left control of a Home row (top-left corner on a card) – two pills of one shape
 * (fully rounded, 26px, light background + 1px border, 12px):
 *  - shown list  → «👁 הסתר» (icon + short label: the label says what the eye does, and it pairs with the other pill)
 *  - hidden list → «הצג רשימה», full opacity even on the ghosted row
 * Owner only – the ONE canHide rule (actions.ts) shared with the header's «הסתרה מדף הבית»; others get an empty slot in the list view so rows stay aligned.
 */
export function HideToggle(props: {list: ListVM; can: boolean; toggle: (l: ListVM, from?: Element | null) => Promise<void>; slot?: boolean}) {
    // v0.5.16: `can` = canHide(T, F, list), computed ONCE per list by Home and handed to the card AND the row
    const {list, can, toggle, slot = false} = props;
    const {t} = useCfg();
    const [busy, setBusy] = useState(false);
    if (!can) return slot ? <span className="row-pill-slot" aria-hidden="true" /> : null;
    const run = (e: React.MouseEvent) => {
        e.stopPropagation();
        setBusy(true);
        void toggle(list, e.currentTarget).finally(() => setBusy(false));
    };
    if (list.archived) {
        return (
            <button type="button" className="row-pill show" title="החזרת הרשימה לדף הבית" aria-label={`הצג רשימה: ${list.name}`} disabled={busy} onClick={run}>
                {t('Button_Text_8')}
            </button>
        );
    }
    return (
        <button type="button" className="row-pill hide" title="הסתרה מדף הבית (אפשר להחזיר)" aria-label={`הסתר את הרשימה ${list.name}`} disabled={busy} onClick={run}>
            <EyeIcon />
            <span>{t('Button_Text_7')}</span>
        </button>
    );
}

/** quiet red text button (in the header cluster) → confirm step → deletes the List + its own List Items → back to all lists */
export function DeleteList(props: {list: ListVM; T: Tables; F: Fields; back: () => void; say: Say}) {
    const {list, T, F, back, say} = props;
    const {t} = useCfg();
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    if (!canDeleteList(T, F, list)) return null;
    const {del, unlink} = deletePlan(list);
    const run = async () => {
        setBusy(true);
        try {
            const name = list.name;
            await deleteList(T, F, list);
            back();
            say(`הרשימה ״${name}״ נמחקה`);
        } catch (e) {
            setBusy(false);
            setConfirm(false);
            say(heErr(e) === 'הפעולה לא נשמרה. נסו שוב.' ? 'הרשימה לא נמחקה. נסו שוב.' : heErr(e), {err: true, detail: detailErr(e)});
        }
    };
    if (!confirm) {
        return (
            <button type="button" className="del-list" onClick={() => setConfirm(true)}>
                {t('Button_Text_6')}
            </button>
        );
    }
    return (
        <div className="del-confirm" role="alertdialog" aria-label="אישור מחיקה">
            <b>למחוק את הרשימה וכל פריטיה?</b>
            <small className="muted">
                {del.length ? `${del.length} פריטים יימחקו מהרשימה` : 'אין פריטים'}
                {unlink.length ? ` · ${unlink.length} נשארים ברשימות אחרות` : ''}. הרשומות המקוריות (סרטים, אנשים…) לא נמחקות.
            </small>
            <span className="del-actions">
                <button type="button" className="btn danger small" disabled={busy} onClick={() => void run()}>
                    {busy ? 'מוחקים…' : 'מחיקה'}
                </button>
                <button type="button" className="btn small" disabled={busy} autoFocus onClick={() => setConfirm(false)}>
                    ביטול
                </button>
            </span>
        </div>
    );
}

/**
 * Inline-edited text (list description; same behaviour as the row notes): click to edit, blur or Ctrl/⌘+Enter saves,
 * Esc restores and saves nothing. The edit look follows `editing` state, not :focus.
 */
export function InlineText(props: {value: string; canEdit: boolean; save: (v: string) => Promise<boolean>; placeholder: string; label: string; className?: string; roClassName?: string}) {
    const {value, canEdit, save, placeholder, label, className = '', roClassName = ''} = props;
    const [v, setV] = useState(value);
    const [saved, setSaved] = useState(false);
    const [editing, setEditing] = useState(false);
    const focused = useRef(false);
    const cancelled = useRef(false);
    useEffect(() => {
        if (!focused.current) setV(value);
    }, [value]);
    useEffect(() => {
        if (!saved) return;
        const t = window.setTimeout(() => setSaved(false), 1500);
        return () => window.clearTimeout(t);
    }, [saved]);
    if (!canEdit) return value ? <p className={roClassName} title={value}>{value}</p> : null;
    const commit = async () => {
        focused.current = false;
        setEditing(false);
        if (cancelled.current) {
            cancelled.current = false;
            setV(value);
            return;
        }
        if (v === value) return;
        if (await save(v)) setSaved(true);
        else setV(value);
    };
    return (
        <div className={`notes ${className}${editing ? ' editing' : ''}`}>
            <textarea
                dir="rtl"
                rows={1}
                value={v}
                placeholder={placeholder}
                aria-label={label}
                onFocus={() => {
                    focused.current = true;
                    cancelled.current = false;
                    setEditing(true);
                }}
                onChange={(e) => {
                    cancelled.current = false;
                    setEditing(true);
                    setV(e.target.value);
                }}
                onBlur={() => void commit()}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) (e.target as HTMLTextAreaElement).blur();
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        const el = e.currentTarget;
                        cancelled.current = true;
                        setV(value);
                        setEditing(false);
                        el.blur();
                        window.requestAnimationFrame(() => {
                            if (document.activeElement === el) el.blur();
                        });
                    }
                }}
            />
            {saved ? <span className="saved">נשמר ✓</span> : null}
        </div>
    );
}

export function ListDescription(props: {list: ListVM; T: Tables; F: Fields; say: Say}) {
    const {list, T, F, say} = props;
    const {t} = useCfg();
    const canEdit = list.canEdit && Boolean(F.lDesc);
    const save = async (v: string) => {
        try {
            await saveDescription(T, F, list.rec, v);
            return true;
        } catch (e) {
            say(heErr(e) === 'הפעולה לא נשמרה. נסו שוב.' ? 'התיאור לא נשמר.' : heErr(e), {err: true, detail: detailErr(e)});
            return false;
        }
    };
    return <InlineText value={list.desc} canEdit={canEdit} save={save} placeholder={t('Helper_Text_5')} label="תיאור הרשימה" className="list-desc" roClassName="desc" />;
}

/** «שותף עם: …» – avatars + names; the owner edits it inline with the same picker as the new-list modal */
export function SharedRow(props: {list: ListVM; model: Model; T: Tables; F: Fields; meId: string | null; say: Say}) {
    const {list, model, T, F, meId, say} = props;
    const [editing, setEditing] = useState(false);
    const [picked, setPicked] = useState<string[]>(list.shared.map((c) => c.id));
    const [busy, setBusy] = useState(false);
    const people = useSharePeople(T, F, model, meId, list.shared);
    const isOwner = list.relation === 'mine';
    const canShare = isOwner && canSetShared(T, F, list.rec);
    if (!F.lShared) {
        return isOwner ? <div className="meta share-row muted small-text">שותף עם: — (השדה SharedWith לא מופעל באלמנט)</div> : null;
    }
    const save = async () => {
        setBusy(true);
        try {
            await saveShared(T, F, list.rec, picked);
            say(picked.length ? 'השיתוף נשמר ✓' : 'הרשימה כבר לא משותפת');
            setEditing(false);
        } catch (e) {
            say(heErr(e) === 'הפעולה לא נשמרה. נסו שוב.' ? 'השיתוף לא נשמר.' : heErr(e), {err: true, detail: detailErr(e)});
        } finally {
            setBusy(false);
        }
    };
    return (
        <>
            <div className="meta share-row">
                <span>שותף עם:</span>
                {list.shared.length ? (
                    list.shared.map((c) => (
                        <span key={c.id} className="mini-user" title={c.email}>
                            <Avatar c={c} size={18} /> {c.name ?? c.email}
                        </span>
                    ))
                ) : (
                    <span className="muted">אף אחד</span>
                )}
                {canShare && !editing ? (
                    <button
                        type="button"
                        className="link-btn"
                        onClick={() => {
                            setPicked(list.shared.map((c) => c.id));
                            setEditing(true);
                        }}
                    >
                        ✎ עריכה
                    </button>
                ) : null}
            </div>
            {editing ? (
                <div className="share-edit">
                    <SharePicker people={people} picked={picked} setPicked={setPicked} />
                    <div className="modal-foot">
                        <button type="button" className="btn primary small" disabled={busy} onClick={() => void save()}>
                            {busy ? 'שומרים…' : 'שמירה'}
                        </button>
                        <button type="button" className="btn small" disabled={busy} onClick={() => setEditing(false)}>
                            ביטול
                        </button>
                    </div>
                </div>
            ) : null}
        </>
    );
}
