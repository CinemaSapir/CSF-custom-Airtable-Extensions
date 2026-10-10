// CSF shared «עריכה ישירה · Extension_Config» (status-panel v3). Same file in every extension; pure logic in statusCore.ts.
// Right-pane boolean, default OFF. ON →
//   • on-screen texts that come from a text slot (Title, Heading, Content_Text, Helper_Text, Button_Text, labels…) get a pencil on
//     hover and become click-to-edit (Enter / blur saves, Esc cancels; Shift+Enter = new line);
//   • a docked panel lists every text slot of the extension (also the ones that are not plain on-screen text: placeholders,
//     tooltips, templated «{n}» texts) and an editor per Option_List_N (add / rename / reorder / remove lines).
// A save writes ONE cell of ONE row: the matched Variant row if it exists, else the default row. No row at all → a confirm dialog
// creates the default row (Extension = slug) first. checkPermissionsForUpdateRecord / ForCreateRecord before every write (the
// reason is shown when not allowed). 6 s undo toast. Nothing else is ever written.
import {useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent} from 'react';
import {useRecords} from '@airtable/blocks/interface/ui';
import type {Field, Record as AtRecord, Table} from '@airtable/blocks/interface/models';
import {
    EDIT_UNDO_MS,
    applyListOp,
    cellToWrite,
    inlineCandidates,
    isEditableTextSlot,
    isOptionListSlot,
    isWritableTextType,
    joinLines,
    looseKey,
    splitLines,
    writeTarget,
    type ListOp,
} from './statusCore';

type Rowish = {id: string} | null | undefined;
export type ConfigEditProps = {
    /** right-pane toggle value (isEditOn) — false → renders nothing, no listeners */
    on: boolean;
    configTable: Table | null;
    /** the hook's default row and Variant row */
    record: Rowish;
    variantRecord?: Rowish;
    slug: string;
    variant?: string;
    /** every slot the extension uses (its DEFAULTS keys); only text + Option_List slots are offered */
    slots: readonly string[];
    /** effective value now (Variant cell → default cell → code default), e.g. cfg.raw */
    valueOf: (slot: string) => string;
    docs?: Readonly<{[slot: string]: string | undefined}>;
};

export function ConfigEditor(p: ConfigEditProps) {
    if (!p.on) return null;
    if (!p.configTable)
        return (
            <div className="csfed" dir="rtl" data-slot="config-edit">
                <style>{CSS}</style>
                <div className="csfed-h">עריכה ישירה · Extension_Config ⚠</div>
                <div className="csfed-b csfed-bad">טבלת Extension_Config לא נמצאה באלמנט — אין לאן לשמור. יש להפעיל אותה ברשימת הטבלאות של האלמנט.</div>
            </div>
        );
    return <Editor {...p} table={p.configTable} />;
}

const fieldFor = (t: Table, slot: string): Field | null => t.getFieldByNameIfExists(slot) ?? t.fields.find(f => looseKey(f.name) === looseKey(slot)) ?? null;
const cellText = (r: AtRecord | null, f: Field | null): string => {
    if (!r || !f) return '';
    try {
        return r.getCellValueAsString(f);
    } catch {
        return '';
    }
};
type Toast = {msg: string; undo?: () => Promise<void>; bad?: boolean};
type Editing = {slot: string; draft: string; rect: {top: number; left: number; width: number; height: number} | null};

function Editor(p: ConfigEditProps & {table: Table}) {
    const t = p.table;
    const recs = useRecords(t);
    const live = (r: Rowish) => (r ? (recs?.find(x => x.id === r.id) ?? null) : null);
    const target = writeTarget(live(p.variantRecord), live(p.record));
    const [editing, setEditing] = useState<Editing | null>(null);
    const [toast, setToast] = useState<Toast | null>(null);
    const [confirm, setConfirm] = useState<{slot: string; value: string | null} | null>(null);
    const [busy, setBusy] = useState(false);
    const [openText, setOpenText] = useState(false);
    const [openLists, setOpenLists] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const timer = useRef<number | undefined>(undefined);

    const textSlots = useMemo(() => p.slots.filter(isEditableTextSlot), [p.slots]);
    const listSlots = useMemo(() => p.slots.filter(isOptionListSlot), [p.slots]);

    const show = useCallback((x: Toast) => {
        setToast(x);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setToast(null), EDIT_UNDO_MS);
    }, []);
    useEffect(() => () => window.clearTimeout(timer.current), []);

    /** the ONLY write path: one cell of the target row (or, after the confirm dialog, a new default row) */
    const save = useCallback(
        async (slot: string, raw: string, opts?: {created?: boolean; quiet?: boolean}): Promise<void> => {
            const f = fieldFor(t, slot);
            if (!f) return show({msg: `השדה ${slot} לא קיים או לא מופעל לאלמנט בטבלת Extension_Config — אין לאן לשמור`, bad: true});
            if (!isWritableTextType(String(f.type))) return show({msg: `השדה ${f.name} מסוג ${String(f.type)} — עריכה ישירה רק בשדות טקסט`, bad: true});
            const value = cellToWrite(raw);
            const row = target.row;
            if (!row) {
                if (!opts?.created) setConfirm({slot, value});
                return;
            }
            const prev = cellText(row, f);
            if ((prev || null) === value) return;
            const perm = t.checkPermissionsForUpdateRecord(row, {[f.id]: value});
            if (!perm.hasPermission) return show({msg: `אין הרשאה לשמור: ${perm.reasonDisplayString}`, bad: true});
            setBusy(true);
            try {
                await t.updateRecordAsync(row, {[f.id]: value});
                if (!opts?.quiet)
                    show({
                        msg: `נשמר ${f.name} בשורת ${target.which === 'variant' ? `Variant «${p.variant ?? ''}»` : 'ברירת המחדל'}`,
                        undo: async () => {
                            const back = cellToWrite(prev);
                            const pp = t.checkPermissionsForUpdateRecord(row, {[f.id]: back});
                            if (!pp.hasPermission) return show({msg: `לא ניתן לבטל: ${pp.reasonDisplayString}`, bad: true});
                            await t.updateRecordAsync(row, {[f.id]: back});
                            show({msg: `בוטל — ${f.name} חזר לערך הקודם`});
                        },
                    });
            } catch (e) {
                show({msg: `השמירה נכשלה: ${e instanceof Error ? e.message : String(e)}`, bad: true});
            } finally {
                setBusy(false);
            }
        },
        [t, target.row, target.which, p.variant, show],
    );

    const createAndSave = async () => {
        const c = confirm;
        setConfirm(null);
        if (!c) return;
        const f = fieldFor(t, c.slot);
        const ext = fieldFor(t, 'Extension');
        if (!f || !ext) return show({msg: 'השדה Extension או השדה הנערך לא מופעלים לאלמנט — לא ניתן ליצור שורה', bad: true});
        const fields = {[ext.id]: p.slug, [f.id]: c.value};
        const perm = t.checkPermissionsForCreateRecord(fields);
        if (!perm.hasPermission) return show({msg: `אין הרשאה ליצור שורה: ${perm.reasonDisplayString}`, bad: true});
        try {
            const id = await t.createRecordAsync(fields);
            show({
                msg: `נוצרה שורת ברירת מחדל ל-«${p.slug}» ונשמר ${f.name}`,
                undo: async () => {
                    const pp = t.checkPermissionsForUpdateRecord(id, {[f.id]: null});
                    if (!pp.hasPermission) return show({msg: `לא ניתן לבטל: ${pp.reasonDisplayString}`, bad: true});
                    await t.updateRecordAsync(id, {[f.id]: null});
                    show({msg: `בוטל — ${f.name} נוקה (השורה נשארה)`});
                },
            });
        } catch (e) {
            show({msg: `יצירת השורה נכשלה: ${e instanceof Error ? e.message : String(e)}`, bad: true});
        }
    };

    // ---------------- inline layer: mark on-screen texts that equal a slot's current value ----------------
    const values = textSlots.map(s => [s, p.valueOf(s)] as const);
    const key = values.map(v => v.join('\u0001')).join('\u0002');
    const cands = useMemo(() => inlineCandidates(values), [key]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        let raf = 0;
        const scan = () => {
            raf = 0;
            document.querySelectorAll('[data-csfed-slot]').forEach(el => {
                const s = cands.get((el.textContent ?? '').trim());
                if (s !== el.getAttribute('data-csfed-slot')) el.removeAttribute('data-csfed-slot');
            });
            const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
            for (let n = walk.nextNode() as Element | null; n; n = walk.nextNode() as Element | null) {
                if (n.closest('.csfed, .csfst, .csfmp, .csfed-pop, .csfed-toast, .csfed-dlg, script, style, input, textarea, select, svg')) continue;
                if (n.childElementCount > 0 && [...n.children].some(c => (c.textContent ?? '').trim())) continue;
                const s = cands.get((n.textContent ?? '').trim());
                if (s && n.getAttribute('data-csfed-slot') !== s) n.setAttribute('data-csfed-slot', s);
            }
        };
        const queue = () => {
            if (!raf) raf = requestAnimationFrame(scan);
        };
        scan();
        const mo = new MutationObserver(queue);
        mo.observe(document.body, {childList: true, subtree: true, characterData: true});
        const swallow = (e: Event) => {
            const el = (e.target as Element | null)?.closest?.('[data-csfed-slot]');
            if (!el) return;
            e.preventDefault();
            e.stopPropagation();
            if (e.type !== 'click') return;
            const slot = el.getAttribute('data-csfed-slot')!;
            const r = el.getBoundingClientRect();
            closed.current = false;
            setEditing({slot, draft: p.valueOf(slot), rect: {top: r.top, left: r.left, width: r.width, height: r.height}});
        };
        for (const ev of ['click', 'pointerdown', 'mousedown']) document.addEventListener(ev, swallow, true);
        return () => {
            if (raf) cancelAnimationFrame(raf);
            mo.disconnect();
            for (const ev of ['click', 'pointerdown', 'mousedown']) document.removeEventListener(ev, swallow, true);
            document.querySelectorAll('[data-csfed-slot]').forEach(el => el.removeAttribute('data-csfed-slot'));
        };
    }, [cands]); // eslint-disable-line react-hooks/exhaustive-deps

    // Enter / Esc unmount the textarea; a late blur must not save twice (or save after Esc)
    const closed = useRef(false);
    const commit = (slot: string, draft: string) => {
        if (closed.current) return;
        closed.current = true;
        setEditing(null);
        void save(slot, draft);
    };
    const keys = (slot: string, draft: string) => (e: ReactKeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closed.current = true;
            setEditing(null);
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commit(slot, draft);
        }
    };
    const where =
        target.which === 'variant' ? `שורת Variant «${p.variant ?? ''}»` : target.which === 'default' ? 'שורת ברירת המחדל' : 'אין שורה — תיווצר שורת ברירת מחדל (באישור)';
    const perm = target.row ? t.checkPermissionsForUpdateRecord(target.row) : t.checkPermissionsForCreateRecord();

    return (
        <>
            <style>{CSS}</style>
            <div className="csfed" dir="rtl" data-slot="config-edit">
                <button type="button" className="csfed-h" onClick={() => setCollapsed(!collapsed)}>
                    עריכה ישירה · Extension_Config {perm.hasPermission ? '✎' : '⚠'} {collapsed ? '▾' : '▴'}
                </button>
                {!collapsed && (
                    <div className="csfed-b">
                        <div>
                            שומר אל: <b>{where}</b> · <code>Extension = {p.slug}</code>
                            {busy ? ' · שומר…' : ''}
                        </div>
                        {!perm.hasPermission && <div className="csfed-bad">אין הרשאת עריכה: {perm.reasonDisplayString}</div>}
                        <div className="csfed-n">
                            טקסט במסך עם קו מקווקו = לחיצה לעריכה (Enter / יציאה מהשדה = שמירה, Esc = ביטול). טקסטים שאינם מופיעים כטקסט רגיל במסך (רמזים, תבניות {'{n}'}) — ברשימה למטה.
                        </div>
                        <button type="button" className="csfed-s" onClick={() => setOpenText(!openText)}>
                            משבצות טקסט ({textSlots.length}) {openText ? '▴' : '▾'}
                        </button>
                        {openText && (
                            <table className="csfed-t">
                                <tbody>
                                    {textSlots.map(s => (
                                        <SlotRow key={s} slot={s} doc={p.docs?.[s]} value={p.valueOf(s)} enabled={!!fieldFor(t, s)} onSave={v => void save(s, v)} />
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {listSlots.length > 0 && (
                            <>
                                <button type="button" className="csfed-s" onClick={() => setOpenLists(!openLists)}>
                                    רשימות אפשרויות ({listSlots.length}) {openLists ? '▴' : '▾'}
                                </button>
                                {openLists &&
                                    listSlots.map(s => (
                                        <ListEditor key={s} slot={s} doc={p.docs?.[s]} value={p.valueOf(s)} enabled={!!fieldFor(t, s)} onSave={v => void save(s, v)} />
                                    ))}
                            </>
                        )}
                    </div>
                )}
            </div>
            {editing && editing.rect && (
                <div className="csfed-pop" style={{top: Math.max(4, editing.rect.top - 4), left: Math.max(4, editing.rect.left - 4), minWidth: Math.max(180, editing.rect.width + 8)}}>
                    <textarea
                        autoFocus
                        dir="auto"
                        rows={Math.min(6, Math.max(1, editing.draft.split('\n').length))}
                        value={editing.draft}
                        onChange={e => setEditing({...editing, draft: e.target.value})}
                        onKeyDown={keys(editing.slot, editing.draft)}
                        onBlur={() => commit(editing.slot, editing.draft)}
                    />
                    <div className="csfed-pop-n">
                        <code>{editing.slot}</code> · Enter שמירה · Esc ביטול
                    </div>
                </div>
            )}
            {toast && (
                <div className={`csfed-toast${toast.bad ? ' csfed-toast-bad' : ''}`} dir="rtl" role="status">
                    <span>{toast.msg}</span>
                    {toast.undo && (
                        <button
                            type="button"
                            onClick={() => {
                                const u = toast.undo!;
                                setToast(null);
                                void u();
                            }}
                        >
                            ביטול
                        </button>
                    )}
                    <button type="button" aria-label="סגירה" onClick={() => setToast(null)}>
                        ✕
                    </button>
                </div>
            )}
            {confirm && (
                <div className="csfed-dlg" role="dialog" dir="rtl">
                    <div className="csfed-dlg-c">
                        <b>אין שורה ל-«{p.slug}» בטבלת Extension_Config.</b>
                        <div>ליצור עכשיו שורת ברירת מחדל (Extension = {p.slug}) ולשמור בה את {confirm.slot}? שום דבר אחר לא ייכתב.</div>
                        <div className="csfed-dlg-a">
                            <button type="button" onClick={() => void createAndSave()}>
                                יצירה ושמירה
                            </button>
                            <button type="button" onClick={() => setConfirm(null)}>
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function SlotRow(p: {slot: string; doc?: string; value: string; enabled: boolean; onSave: (v: string) => void}) {
    const [draft, setDraft] = useState<string | null>(null);
    const closed = useRef(false);
    const done = (v: string | null) => {
        if (closed.current) return;
        closed.current = true;
        if (v !== null) p.onSave(v);
        setDraft(null);
    };
    return (
        <tr>
            <td>
                <code>{p.slot}</code>
                {p.doc ? <div className="csfed-n">{p.doc}</div> : null}
            </td>
            <td className="csfed-v">
                {!p.enabled ? (
                    <span className="csfed-bad">השדה לא מופעל לאלמנט</span>
                ) : draft === null ? (
                    <button
                        type="button"
                        className="csfed-val"
                        title="עריכה"
                        onClick={() => {
                            closed.current = false;
                            setDraft(p.value);
                        }}
                    >
                        {p.value || <i>(ריק)</i>} <span className="csfed-pen">✎</span>
                    </button>
                ) : (
                    <textarea
                        autoFocus
                        dir="auto"
                        rows={Math.min(5, Math.max(1, draft.split('\n').length))}
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Escape') done(null);
                            else if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                done(draft);
                            }
                        }}
                        onBlur={() => done(draft)}
                    />
                )}
            </td>
        </tr>
    );
}

function ListEditor(p: {slot: string; doc?: string; value: string; enabled: boolean; onSave: (v: string) => void}) {
    const [lines, setLines] = useState<string[] | null>(null);
    const [add, setAdd] = useState('');
    const cur = lines ?? splitLines(p.value);
    const op = (o: ListOp) => setLines(applyListOp(cur, o));
    const dirty = lines !== null && joinLines(lines) !== joinLines(splitLines(p.value));
    return (
        <div className="csfed-list">
            <div>
                <code>{p.slot}</code> {p.doc ? <span className="csfed-n">{p.doc}</span> : null}
            </div>
            {!p.enabled ? (
                <div className="csfed-bad">השדה לא מופעל לאלמנט</div>
            ) : (
                <>
                    {cur.map((l, i) => (
                        <div key={i} className="csfed-li">
                            <input dir="auto" value={l} onChange={e => op({op: 'rename', i, text: e.target.value})} />
                            <button type="button" title="למעלה" disabled={i === 0} onClick={() => op({op: 'move', i, to: i - 1})}>
                                ▲
                            </button>
                            <button type="button" title="למטה" disabled={i === cur.length - 1} onClick={() => op({op: 'move', i, to: i + 1})}>
                                ▼
                            </button>
                            <button type="button" title="הסרה" onClick={() => op({op: 'remove', i})}>
                                ✕
                            </button>
                        </div>
                    ))}
                    <div className="csfed-li">
                        <input
                            dir="auto"
                            placeholder="שורה חדשה…"
                            value={add}
                            onChange={e => setAdd(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    op({op: 'add', text: add});
                                    setAdd('');
                                }
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                op({op: 'add', text: add});
                                setAdd('');
                            }}
                        >
                            + הוספה
                        </button>
                    </div>
                    <div className="csfed-li">
                        <button
                            type="button"
                            disabled={!dirty}
                            onClick={() => {
                                p.onSave(joinLines(cur));
                                setLines(null);
                            }}
                        >
                            שמירת הרשימה
                        </button>
                        <button type="button" disabled={lines === null} onClick={() => setLines(null)}>
                            ביטול שינויים
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

const CSS = `
[data-csfed-slot] { outline:1px dashed #b98a3a; outline-offset:2px; cursor:text !important; }
[data-csfed-slot]:hover { background:rgba(255,236,190,.55); }
[data-csfed-slot]:hover::after { content:' ✎'; font-size:.85em; color:#7a5a1a; pointer-events:none; }
.csfed { direction:rtl; text-align:right; margin:10px auto 0; width:100%; max-width:1100px; background:#fff; color:#2f2f2f;
  border:1px solid #e3ddd2; border-radius:10px; font:12.5px/1.55 "Segoe UI", Heebo, Rubik, Arial, sans-serif; box-sizing:border-box; }
.csfed * { box-sizing:border-box; }
.csfed-h { display:block; width:100%; text-align:right; font:inherit; font-weight:700; color:inherit; background:#fbf3e2; border:0;
  border-radius:10px 10px 0 0; padding:6px 12px; cursor:pointer; }
.csfed-b { padding:8px 12px 10px; }
.csfed code, .csfed-pop code { direction:ltr; unicode-bidi:isolate; font:11.5px Consolas,"DejaVu Sans Mono",monospace; background:#f6f3ee; border-radius:4px; padding:0 4px; }
.csfed-n { font-size:11.5px; color:#6f6a62; margin-top:2px; }
.csfed-bad { color:#a8452f; font-weight:600; }
.csfed-s { display:block; font:inherit; font-weight:700; background:none; border:0; padding:6px 0 2px; cursor:pointer; color:inherit; }
.csfed-t { border-collapse:collapse; width:100%; }
.csfed-t td { border-bottom:1px solid #eee8de; padding:3px 6px; vertical-align:top; }
.csfed-v { width:60%; }
.csfed-val { font:inherit; text-align:right; background:none; border:1px dashed transparent; border-radius:6px; padding:1px 4px; cursor:text; width:100%; white-space:pre-wrap; }
.csfed-val:hover { border-color:#e3c98a; background:#fffaf0; }
.csfed-pen { color:#b98a3a; }
.csfed textarea, .csfed input, .csfed-pop textarea { font:inherit; width:100%; border:1px solid #d8c28f; border-radius:6px; padding:3px 6px; }
.csfed-list { border-top:1px solid #eee8de; padding:6px 0; }
.csfed-li { display:flex; gap:4px; align-items:center; margin-top:3px; }
.csfed-li input { flex:1; }
.csfed-li button, .csfed-dlg button, .csfed-toast button { font:inherit; background:#f6f3ee; border:1px solid #ddd3c2; border-radius:6px; padding:1px 8px; cursor:pointer; }
.csfed-li button:disabled { opacity:.4; cursor:default; }
.csfed-pop { position:fixed; z-index:2147483100; background:#fff; border:1px solid #d8c28f; border-radius:8px; box-shadow:0 6px 24px rgba(0,0,0,.18); padding:4px; direction:rtl; }
.csfed-pop textarea { font:14px "Segoe UI", Heebo, Arial, sans-serif; resize:vertical; }
.csfed-pop-n { font:11px "Segoe UI", Arial, sans-serif; color:#6f6a62; margin-top:2px; }
.csfed-toast { position:fixed; z-index:2147483200; bottom:18px; left:50%; transform:translateX(-50%); display:flex; gap:10px; align-items:center;
  background:#2f2f2f; color:#fff; border-radius:10px; padding:8px 14px; font:13px "Segoe UI", Heebo, Arial, sans-serif; box-shadow:0 6px 24px rgba(0,0,0,.25); }
.csfed-toast-bad { background:#8a2f1f; }
.csfed-toast button { background:#fff; color:#222; }
.csfed-dlg { position:fixed; inset:0; z-index:2147483300; background:rgba(20,20,20,.45); display:flex; align-items:center; justify-content:center; }
.csfed-dlg-c { background:#fff; border-radius:12px; padding:16px 18px; max-width:440px; font:13.5px/1.6 "Segoe UI", Heebo, Arial, sans-serif; direction:rtl; text-align:right; }
.csfed-dlg-a { display:flex; gap:8px; margin-top:12px; }
`;
