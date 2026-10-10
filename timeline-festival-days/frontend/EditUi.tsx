/** v0.2.0 — create popover + undo toast (6s, pauses on hover, ✕). */
import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {fmt, type Item} from './logic/core';
import {Countdown, UNDO_MS} from './logic/edit';

export type Writer = {
    check: (op: 'create' | 'update', table: string, id: string | null, fields: {[k: string]: unknown}) => {ok: true} | {ok: false; reason: string};
    create: (table: string, fields: {[k: string]: unknown}) => Promise<string>;
    update: (table: string, id: string, fields: {[k: string]: unknown}) => Promise<void>;
    checkRemove: (table: string, id: string) => {ok: true} | {ok: false; reason: string};
    remove: (table: string, id: string) => Promise<void>;
    nameWritable: (table: string) => boolean;
};

export function UndoToast(p: {text: string; undoLabel?: string; onUndo: () => void; onClose: () => void; now?: () => number}) {
    const now = p.now ?? (() => Date.now());
    const cd = useRef(new Countdown(UNDO_MS, now()));
    const [left, setLeft] = useState(UNDO_MS);
    useEffect(() => {
        const id = setInterval(() => {
            const r = cd.current.remaining(now());
            setLeft(r);
            if (r <= 0) p.onClose();
        }, 200);
        return () => clearInterval(id);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <div
            className="toast undo"
            data-slot="Button_Text_6 (ביטול · 6s)"
            onMouseEnter={() => cd.current.pause(now())}
            onMouseLeave={() => cd.current.resume(now())}
            onClick={e => e.stopPropagation()}
        >
            <span>{p.text}</span> ·{' '}
            <a
                onClick={() => {
                    p.onUndo();
                    p.onClose();
                }}
            >
                {p.undoLabel || 'ביטול'}
            </a>
            <span className="ut num">{Math.ceil(left / 1000)}</span>
            <a className="ux" title="סגירה" onClick={p.onClose}>
                ✕
            </a>
            <i className="ubar" style={{width: `${(left / UNDO_MS) * 100}%`}} />
        </div>
    );
}

export type CreateReq = {t: string; s: number; e: number; x: number; y: number};
export function CreatePopover(p: {
    req: CreateReq;
    label: string;
    color: string;
    kind: 'own' | 'borrow' | 'date' | 'lodging' | 'stamp';
    dayTitle: {t: string; s: string};
    dateText: string;
    nameWritable: boolean;
    slots: Item[];
    busy: boolean;
    error: string | null;
    texts?: {title?: string; create?: string; slot?: string};
    onCreate: (v: {name: string; slotId: string | null}) => void;
    onCancel: () => void;
}) {
    const [name, setName] = useState('');
    const [slot, setSlot] = useState<string | null>(p.slots[0]?.id ?? null);
    const style = {['--c' as string]: p.color, left: Math.max(8, Math.min(window.innerWidth - 300, p.req.x - 145)), top: Math.max(8, Math.min(window.innerHeight - 290, p.req.y + 8))} as CSSProperties;
    const go = () => !p.busy && p.onCreate({name, slotId: slot});
    return (
        <div
            className="cp"
            style={style}
            dir="rtl"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
                if (e.key === 'Escape') p.onCancel();
                if (e.key === 'Enter') go();
            }}
            data-slot="Content_Text_10 · Button_Text_5 · Content_Text_11"
        >
            <div className="cph">
                <i />
                {p.label}
                <small>{p.texts?.title || 'רשומה חדשה'}</small>
            </div>
            {p.nameWritable ? <input autoFocus placeholder={p.kind === 'own' ? 'שם המשבצת' : 'כותרת'} value={name} onChange={e => setName(e.target.value)} /> : <div className="hint">השם מחושב בטבלה (נוסחה) — ייווצר אוטומטית</div>}
            {p.kind === 'borrow' ? (
                <label>
                    {p.texts?.slot || 'קשר למשבצת'}
                    <select value={slot ?? ''} onChange={e => setSlot(e.target.value || null)} autoFocus={!p.nameWritable}>
                        {p.slots.length ? null : <option value="">אין משבצות ביום הזה</option>}
                        {p.slots.map(i => (
                            <option key={i.id} value={i.id}>
                                {`${fmt(i.s as number)}–${fmt(i.e as number)} · ${i.name}`}
                            </option>
                        ))}
                    </select>
                    <span className="hint">ב{p.label} השעה נלקחת מהמשבצת המקושרת</span>
                </label>
            ) : p.kind === 'own' || p.kind === 'stamp' ? (
                <div className="cpr">
                    <label>
                        התחלה
                        <input value={fmt(p.req.s)} readOnly />
                    </label>
                    {p.kind === 'own' ? (
                        <label>
                            סיום
                            <input value={fmt(p.req.e)} readOnly />
                        </label>
                    ) : null}
                </div>
            ) : (
                <label>
                    {p.kind === 'lodging' ? 'צ׳ק-אין → צ׳ק-אאוט' : 'תאריך'}
                    <input value={p.dateText} readOnly dir="ltr" />
                    <span className="hint">{p.kind === 'lodging' ? 'בלינה יש תאריכים בלבד' : `ב${p.label} יש תאריך בלבד, בלי שעה`}</span>
                </label>
            )}
            <div className="cpd">
                יום פסטיבל: <span className="chip3">{p.dayTitle.t}</span>
                <span>{p.dayTitle.s}</span>
            </div>
            {p.error ? <div className="cperr">⚠ {p.error}</div> : null}
            <div className="cpb">
                <button className="go" onClick={go} disabled={p.busy || (p.kind === 'borrow' && !slot)}>
                    {p.busy ? 'שומר…' : p.texts?.create || 'צור'}
                </button>
                <button className="cn" onClick={p.onCancel}>
                    ביטול
                </button>
            </div>
        </div>
    );
}
