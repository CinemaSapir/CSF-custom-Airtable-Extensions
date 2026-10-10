// CSF shared «מצב חיבור» status panel — view (status-panel v1). Same file in every extension; see statusCore.ts.
// Read-only: useRecords on the config table (only while the panel is ON) to report row count / Extension values.
import {useState} from 'react';
import {useRecords} from '@airtable/blocks/interface/ui';
import type {Base, Record as AtRecord, Table} from '@airtable/blocks/interface/models';
import {
    STATUS_PANEL_VERSION,
    compactNames,
    looseKey,
    missingFields,
    overallOk,
    rowSummary,
    variantKey,
    yn,
    type ConfigRow,
    type RowSummary,
    type StatusFilter,
    type StatusSource,
} from './statusCore';

export type StatusPanelProps = {
    base: Base;
    /** right-pane toggle value (isStatusOn) — false → renders nothing */
    on: boolean;
    configTable: Table | null;
    /** how the config table was found */
    configVia: 'pane' | 'name' | 'none';
    slug: string;
    variant: string;
    /** hook status (ok / no-table / no-record / loading / defaults-only / duplicate …) */
    status: string;
    /** the row the hook actually uses (null = none) */
    record: {id: string} | null | undefined;
    variantRecord?: {id: string} | null;
    /** Extension_Config field names this extension reads (→ "not visible" list) */
    fieldsUsed?: readonly string[];
    sources: readonly StatusSource[];
    filters?: readonly StatusFilter[];
    filtersTitle?: string;
    /** column title for StatusFilter.extra (omit = column hidden) */
    extraTitle?: string;
    error?: string | null;
    notes?: readonly string[];
    version?: string;
};

export function StatusPanel(p: StatusPanelProps) {
    if (!p.on) return null;
    return p.configTable ? <WithRows {...p} table={p.configTable} /> : <Body {...p} rows={null} />;
}

function WithRows(p: StatusPanelProps & {table: Table}) {
    const recs = useRecords(p.table);
    const ext = p.table.fields.find(f => looseKey(f.name) === 'extension') ?? null;
    const vf = p.table.fields.find(f => looseKey(f.name) === 'variant') ?? null;
    const str = (r: AtRecord, f: typeof ext) => {
        try {
            return f ? r.getCellValueAsString(f) : '';
        } catch {
            return '';
        }
    };
    const rows: ConfigRow[] | null = recs ? recs.map(r => ({id: r.id, extension: str(r, ext), variant: str(r, vf)})) : null;
    return <Body {...p} rows={rows} hasExtField={!!ext} />;
}

type EditSchema = Record<string, {id: string; name: string}>;
/** Full base schema the SDK keeps for the properties panel (edit mode only; null when published). Names only. */
function editSchema(base: Base): EditSchema | null {
    try {
        const fn = (base as unknown as {_getAllTableDataForEditModeConfiguration?: () => unknown})._getAllTableDataForEditModeConfiguration;
        const v = typeof fn === 'function' ? fn.call(base) : null;
        return v && typeof v === 'object' ? (v as EditSchema) : null;
    } catch {
        return null;
    }
}

function Body(p: StatusPanelProps & {rows: ConfigRow[] | null; hasExtField?: boolean}) {
    const [open, setOpen] = useState(true);
    const t = p.configTable;
    const visible = t ? t.fields.map(f => f.name) : [];
    const missing = t ? missingFields(p.fieldsUsed, visible) : [];
    const sum: RowSummary | null = rowSummary(p.rows, p.slug, p.variant);
    const usedRow = p.record ? p.rows?.find(r => r.id === p.record!.id) ?? null : null;
    const schema = editSchema(p.base);
    const hiddenTables = schema ? Object.values(schema).filter(x => !p.base.getTableByIdIfExists(x.id)).map(x => x.name) : [];
    const cfgHidden = !t && hiddenTables.some(n => looseKey(n) === looseKey('Extension_Config'));
    const ok = overallOk({
        configFound: !!t,
        rowMatched: !!p.record,
        sources: p.sources,
        filters: p.filters,
        missing,
        error: p.error,
    });
    const variantShown = variantKey(p.variant) === '' ? '(ריק = ברירת מחדל)' : p.variant;
    return (
        <div className="csfst" dir="rtl" data-slot="status-panel">
            <style>{CSS}</style>
            <button type="button" className="csfst-h" onClick={() => setOpen(!open)}>
                מצב חיבור · Extension_Config {ok ? '✓' : '⚠'} {open ? '▴' : '▾'}
            </button>
            {open && (
                <div className="csfst-b">
                    <div>
                        טבלת הגדרות: <b className={t ? 'csfst-ok' : 'csfst-bad'}>{yn(!!t)}</b> {t ? <code>{t.name}</code> : null}{' '}
                        {t
                            ? `(${p.configVia === 'pane' ? 'נבחרה בחלונית' : 'נמצאה לפי שם'})`
                            : cfgHidden
                              ? '— קיימת בבסיס אבל לא מופעלת לאלמנט (יש להפעיל אותה ברשימת הטבלאות של האלמנט)'
                              : '— לא נמצאה באלמנט → ברירות מחדל בקוד'}
                    </div>
                    {t && (
                        <div>
                            שורה תואמת: <b className={p.record ? 'csfst-ok' : 'csfst-bad'}>{yn(!!p.record)}</b> <code>Extension = {usedRow?.extension || p.slug}</code> ·{' '}
                            <code>Variant = {usedRow ? usedRow.variant || '(ריק)' : variantShown}</code>
                            {p.variantRecord ? ' (+ שורת Variant)' : ''} · סטטוס <code>{p.status}</code> · שורות בטבלה: {sum ? sum.count : '…'}
                            {p.hasExtField === false && <span className="csfst-bad"> · השדה Extension לא מופעל לאלמנט</span>}
                            {!p.record && sum && (
                                <>
                                    {' '}
                                    · ערכי Extension בטבלה: <code>{sum.extensionValues.map(v => `«${v}»`).join(' ') || '—'}</code>
                                    {sum.sameExtension.length > 0 && (
                                        <>
                                            {' '}
                                            · Variant קיימים ל-{p.slug}: <code>{sum.sameExtension.map(r => `«${r.variant || '(ריק)'}»`).join(' ')}</code>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                    {t && (
                        <div>
                            שדות גלויים לאלמנט ({visible.length}): <code className="csfst-wrap">{compactNames(visible) || '—'}</code>
                            {missing.length > 0 && (
                                <div className="csfst-bad">
                                    שדות שהתוסף קורא ולא מופעלים ({missing.length}): <code>{compactNames(missing)}</code>
                                </div>
                            )}
                        </div>
                    )}
                    {p.error && (
                        <div className="csfst-bad">
                            שגיאה בקריאת ההגדרות (מוצגות ברירות מחדל): <code>{p.error}</code>
                        </div>
                    )}
                    {p.sources.length > 0 && (
                        <>
                            <div className="csfst-s">מקורות (טבלה / שדה)</div>
                            <table className="csfst-t">
                                <thead>
                                    <tr>
                                        <th>מקור</th>
                                        <th>טבלה</th>
                                        <th>שדה</th>
                                        <th>נקבע לפי</th>
                                        <th>מצב</th>
                                        <th>הערה</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {p.sources.map((s, i) => (
                                        <tr key={i}>
                                            <td>{s.label}</td>
                                            <td>
                                                <code>{s.table ?? '—'}</code>
                                            </td>
                                            <td>{s.field !== undefined ? <code>{s.field ?? '—'}</code> : ''}</td>
                                            <td>{s.via}</td>
                                            <td className={s.ok ? 'csfst-ok' : 'csfst-bad'}>{yn(s.ok)}</td>
                                            <td className="csfst-n">{s.note ?? ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                    {p.filters && (
                        <>
                            <div className="csfst-s">{p.filtersTitle ?? 'סינונים'}</div>
                            {p.filters.length === 0 ? (
                                <div className="csfst-n">אין סינונים פעילים</div>
                            ) : (
                                <table className="csfst-t">
                                    <thead>
                                        <tr>
                                            <th>שם</th>
                                            <th>טבלה</th>
                                            <th>שדה</th>
                                            <th>מקור</th>
                                            <th>תנאי</th>
                                            <th>ערכים</th>
                                            {p.extraTitle && <th>{p.extraTitle}</th>}
                                            <th>תואמות / סה״כ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {p.filters.map((x, i) => (
                                            <tr key={i}>
                                                <td>{x.label}</td>
                                                <td>
                                                    <code>{x.table ?? '—'}</code>
                                                </td>
                                                <td>
                                                    <code>{x.field ?? '—'}</code>
                                                </td>
                                                <td className={x.bad || x.via.includes('✗') ? 'csfst-bad' : ''}>{x.via}</td>
                                                <td>{x.op}</td>
                                                <td>
                                                    <code>{x.values.length ? x.values.join(' | ') : '—'}</code>
                                                </td>
                                                {p.extraTitle && <td>{x.extra ?? ''}</td>}
                                                <td className="csfst-num">
                                                    {x.matched ?? '—'} / {x.total ?? '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </>
                    )}
                    <div className="csfst-n">
                        טבלאות גלויות לאלמנט: <code>{p.base.tables.map(x => `${x.name} (${x.fields.length})`).join(' · ') || '—'}</code>
                        {hiddenTables.length > 0 && (
                            <>
                                {' '}
                                · <span className="csfst-bad">בבסיס אך לא מופעלות:</span> <code>{hiddenTables.join(' · ')}</code>
                            </>
                        )}
                        {!schema && ' · (רשימת טבלאות מוסתרות זמינה רק במצב עריכה)'}
                    </div>
                    {(p.notes ?? []).map((n, i) => (
                        <div key={i} className="csfst-n">
                            {n}
                        </div>
                    ))}
                    <div className="csfst-n csfst-ltr">
                        {p.slug}
                        {p.version ? ` v${p.version}` : ''} · {STATUS_PANEL_VERSION} · read-only
                    </div>
                </div>
            )}
        </div>
    );
}

const CSS = `
.csfst { direction:rtl; text-align:right; margin:10px auto 0; max-width:1100px; background:#fff; color:#2f2f2f;
  border:1px solid #e3ddd2; border-radius:10px; font:12.5px/1.55 "Segoe UI", Heebo, Rubik, Arial, sans-serif; box-sizing:border-box; }
.csfst * { box-sizing:border-box; }
.csfst-h { display:block; width:100%; text-align:right; font:inherit; font-weight:700; color:inherit; background:#f6f3ee; border:0;
  border-radius:10px 10px 0 0; padding:6px 12px; cursor:pointer; }
.csfst-b { padding:8px 12px 10px; }
.csfst code { direction:ltr; unicode-bidi:isolate; font:11.5px Consolas,"DejaVu Sans Mono",monospace; background:#f6f3ee; border-radius:4px; padding:0 4px; }
.csfst-wrap { white-space:normal; word-break:break-word; }
.csfst-s { font-weight:700; margin:8px 0 2px; }
.csfst-ok { color:#2f7d4f; font-weight:700; }
.csfst-bad { color:#a8452f; font-weight:600; }
.csfst-n { font-size:11.5px; color:#6f6a62; margin-top:4px; }
.csfst-ltr { direction:ltr; text-align:left; }
.csfst-num { direction:ltr; unicode-bidi:isolate; font-variant-numeric:tabular-nums; white-space:nowrap; }
.csfst-t { border-collapse:collapse; width:100%; margin-top:2px; }
.csfst-t th, .csfst-t td { border-bottom:1px solid #eee8de; padding:3px 6px; text-align:right; vertical-align:top; }
.csfst-t th { font-weight:600; color:#6f6a62; font-size:11.5px; }
`;
