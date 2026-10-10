// CSF shared «מצב חיבור» status panel — view (status-panel v5: ALWAYS lists the seen rows + match score, same pickConfigRows as the hook). Same file in every extension; see statusCore.ts.
// Read-only: useRecords on the config table (only while the panel is ON) to report row count / Extension values.
import {useState} from 'react';
import {useRecords} from '@airtable/blocks/interface/ui';
import type {Base, Record as AtRecord, Table} from '@airtable/blocks/interface/models';
import {readMapping} from './MappingPanel';
import {
    GITHUB_HINT,
    STATUS_PANEL_VERSION,
    compactNames,
    SEEN_VALUES_MAX,
    looseField,
    looseKey,
    missingFields,
    MATCH_MIN_SCORE,
    overallOk,
    pickConfigRows,
    rowSummary,
    variantKey,
    visibleChars,
    yn,
    type ConfigPick,
    type MatchRow,
    type MappingResult,
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
    return p.configTable ? <WithRows {...p} table={p.configTable} /> : <Body {...p} rows={null} mapping={null} />;
}

function WithRows(p: StatusPanelProps & {table: Table}) {
    const recs = useRecords(p.table);
    const ext = looseField(p.table.fields, 'Extension');
    const vf = looseField(p.table.fields, 'Variant');
    const str = (r: AtRecord, f: typeof ext) => {
        try {
            return f ? r.getCellValueAsString(f) : '';
        } catch {
            return '';
        }
    };
    const dn = looseField(p.table.fields, 'Display_Name');
    const gh = looseField(p.table.fields, 'GitHub_URL');
    const prim = (r: AtRecord) => {
        try {
            return r.name ?? '';
        } catch {
            return '';
        }
    };
    const rows: MatchRow[] | null = recs ? recs.map(r => ({id: r.id, primary: prim(r), extension: str(r, ext), variant: str(r, vf), displayName: str(r, dn), github: str(r, gh)})) : null;
    const mapping = readMapping(p.table, recs ?? null, p.record, p.variantRecord, p.slug);
    return <Body {...p} rows={rows} hasExtField={!!ext} hasVariantField={!!vf} extFieldName={ext?.name} mapping={mapping} />;
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

const seen = (vals: readonly string[], empty: string) => {
    const shown = vals.slice(0, SEEN_VALUES_MAX).map(v => (v.trim() ? `«${visibleChars(v)}»` : empty));
    return shown.join(' ') + (vals.length > SEEN_VALUES_MAX ? ` +${vals.length - SEEN_VALUES_MAX}` : '') || '—';
};
/** No row matched: what the panel actually sees (≤ 10 Extension / Variant values, invisible chars shown) + field visibility. */
function NoRow(p: {sum: RowSummary; slug: string; hasExt?: boolean; hasVar?: boolean; extName?: string}) {
    const {sum} = p;
    return (
        <div className="csfst-norow" data-slot="status-norow">
            <div>
                שדה Extension: <b className={p.hasExt ? 'csfst-ok' : 'csfst-bad'}>{p.hasExt ? `✓ גלוי (${p.extName})` : '✗ לא מופעל לאלמנט / לא קיים'}</b> · שדה Variant:{' '}
                <b className={p.hasVar ? 'csfst-ok' : 'csfst-bad'}>{p.hasVar ? '✓ גלוי' : '✗ לא מופעל לאלמנט (כל השורות ייחשבו Variant ריק)'}</b>
            </div>
            <div>
                ערכי Extension שנראים ({sum.extensionValues.length}): <code className="csfst-wrap">{seen(sum.extensionValues, '(ריק)')}</code>
            </div>
            <div>
                ערכי Variant שנראים ({sum.variantValues.length}): <code className="csfst-wrap">{seen(sum.variantValues, '(ריק)')}</code>
            </div>
            {sum.sameExtension.length > 0 && (
                <div>
                    Variant קיימים ל-«{p.slug}»: <code>{sum.sameExtension.map(r => `«${visibleChars(r.variant) || '(ריק)'}»`).join(' ')}</code>
                </div>
            )}
            {sum.match && <div className="csfst-bad">הפאנל מצא התאמה רופפת (שורה {sum.match.id}) אבל הקוד לא קרא אותה — לרענן את הדף; אם נשאר, לדווח</div>}
            <div className="csfst-dim">ההתאמה רופפת: רווחים, אותיות גדולות/קטנות, - _ . ותווים בלתי נראים לא משנים («countdown homescreen» = «Countdown-Homescreen»).</div>
        </div>
    );
}

const VIA_HE: Record<string, string> = {Extension: 'Extension', primary: 'שדה ראשי', Display_Name: 'Display_Name', GitHub_URL: 'תיקיית GitHub_URL'};
/** v5: every row the panel sees (≤ SEEN_VALUES_MAX), its score, how it matched and which one the hook uses. */
function SeenRows(p: {pick: ConfigPick; usedId: string | null; variantId: string | null}) {
    const rows = [...p.pick.all].sort((a, b) => b.score - a.score);
    const others = p.pick.ranked.filter(r => r.id !== p.usedId && r.id !== p.variantId);
    return (
        <div className="csfst-seen" data-slot="status-seen-rows">
            <div>
                שורות שנראות ({rows.length}) · ציון התאמה (סף {MATCH_MIN_SCORE}):
                {p.pick.anyVariant && <span className="csfst-bad"> · אין שורה עם Variant ריק — נבחרה שורה עם Variant אחר</span>}
                {p.pick.tie && <span className="csfst-bad"> · כמה שורות עם אותו ציון — נבחרה הראשונה</span>}
                {others.length > 0 && <span className="csfst-dim"> · התאמות נוספות: {others.length}</span>}
            </div>
            <table>
                <thead>
                    <tr>
                        <th></th>
                        <th>שדה ראשי</th>
                        <th>Extension</th>
                        <th>Variant</th>
                        <th>ציון</th>
                        <th>לפי</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.slice(0, SEEN_VALUES_MAX).map(r => (
                        <tr key={r.id} className={r.id === p.usedId || r.id === p.variantId ? 'csfst-used' : r.score >= MATCH_MIN_SCORE ? '' : 'csfst-dim'}>
                            <td>{r.id === p.usedId ? '✓ בשימוש' : r.id === p.variantId ? '✓ Variant' : r.score >= MATCH_MIN_SCORE ? 'מתאימה' : ''}</td>
                            <td>{visibleChars(r.primary) || '—'}</td>
                            <td>
                                <code>{visibleChars(r.extension) || '(ריק)'}</code>
                            </td>
                            <td>
                                <code>{visibleChars(r.variant) || '(ריק)'}</code>
                                {r.variantMode === 'alias' ? ' = ברירת מחדל' : ''}
                            </td>
                            <td>{r.score}</td>
                            <td>{r.score ? `${VIA_HE[r.via ?? ''] ?? ''}: ${r.how}` : '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length > SEEN_VALUES_MAX && <div className="csfst-dim">+{rows.length - SEEN_VALUES_MAX} שורות נוספות</div>}
        </div>
    );
}

function Body(p: StatusPanelProps & {rows: MatchRow[] | null; hasExtField?: boolean; hasVariantField?: boolean; extFieldName?: string; mapping: MappingResult | null}) {
    const [open, setOpen] = useState(true);
    const t = p.configTable;
    const visible = t ? t.fields.map(f => f.name) : [];
    const missing = t ? missingFields(p.fieldsUsed, visible) : [];
    const sum: RowSummary | null = rowSummary(p.rows, p.slug, p.variant);
    const pick: ConfigPick | null = p.rows ? pickConfigRows(p.rows, p.slug, p.variant) : null;
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
                            {!p.record && sum && <NoRow sum={sum} slug={p.slug} hasExt={p.hasExtField} hasVar={p.hasVariantField} extName={p.extFieldName} />}
                            {pick && <SeenRows pick={pick} usedId={p.record?.id ?? null} variantId={p.variantRecord?.id ?? null} />}
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
                    {p.mapping && p.mapping.state !== 'no-table' && (
                        <div>
                            קבצי מיפוי (<code>Attachment_Mapping_Image</code>):{' '}
                            <b className={p.mapping.state === 'ok' ? 'csfst-ok' : 'csfst-bad'}>{yn(p.mapping.state === 'ok')}</b> {p.mapping.hint} · <code>GitHub_URL</code>:{' '}
                            {p.mapping.github ? (
                                <a href={p.mapping.github} target="_blank" rel="noopener noreferrer">
                                    ✓ קישור
                                </a>
                            ) : (
                                <span className={p.mapping.githubState === 'no-field' ? 'csfst-bad' : ''}>{GITHUB_HINT[p.mapping.githubState]}</span>
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
.csfst-norow { margin:4px 0 2px; padding:6px 8px; background:#fbf6ec; border:1px dashed #e0c9a0; border-radius:8px; }
.csfst-dim { color:#7a7368; font-size:11.5px; }
.csfst-seen { margin:4px 0 2px; } .csfst-seen table { border-collapse:collapse; width:100%; font-size:11.5px; } .csfst-seen td, .csfst-seen th { border-bottom:1px solid #eee5d6; padding:2px 6px; text-align:right; } .csfst-seen tr.csfst-used td { background:#eef7ee; font-weight:600; }
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
