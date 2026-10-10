// CSF shared mapping panel (status-panel v3: field Attachment_Mapping_Image, loose fallback Mapping_Image). Same file in every extension; pure logic in statusCore.ts.
// Right-pane boolean «show mapping · Extension_Config.Attachment_Mapping_Image» (default OFF). ON → the matched row's mapping
// attachments as images (thumbnail «large», click = full size in a lightbox, «פתיחה בלשונית חדשה» = the full URL),
// file name, and a link to GitHub_URL when present. Variant row → default row. Read-only: never writes.
import {useEffect, useState} from 'react';
import {useRecords} from '@airtable/blocks/interface/ui';
import type {Record as AtRecord, Table} from '@airtable/blocks/interface/models';
import {
    GITHUB_FIELD,
    GITHUB_HINT,
    attachmentsOf,
    pickMappingFieldName,
    looseKey,
    pickMapping,
    safeHttpUrl,
    type MappingCells,
    type MappingFile,
    type MappingResult,
} from './statusCore';

type Rowish = {id: string} | null | undefined;
const fieldOf = (t: Table, name: string) => t.fields.find(f => f.name === name) ?? t.fields.find(f => looseKey(f.name) === looseKey(name)) ?? null;

/** Attachment_Mapping_Image (or the old Mapping_Image) of a config table, null when neither is visible to the element. */
export function mappingFieldOf(t: Table | null) {
    if (!t) return null;
    const n = pickMappingFieldName(t.fields.map(f => f.name));
    return n ? (t.fields.find(f => f.name === n) ?? null) : null;
}
/** Reads Attachment_Mapping_Image / GitHub_URL of the default + Variant rows (live records of the config table). Shared with «מצב חיבור». */
export function readMapping(table: Table | null, records: readonly AtRecord[] | null, record: Rowish, variantRecord: Rowish, slug: string): MappingResult {
    const img = mappingFieldOf(table);
    const gh = table ? fieldOf(table, GITHUB_FIELD) : null;
    const cells = (r: Rowish): MappingCells | null => {
        if (!r) return null;
        const live = records?.find(x => x.id === r.id) ?? (r as AtRecord);
        let files: MappingFile[] = [];
        let github: string | null = null;
        try {
            files = img ? attachmentsOf(live.getCellValue(img)) : [];
        } catch {
            files = [];
        }
        try {
            github = gh ? safeHttpUrl(live.getCellValueAsString(gh)) : null;
        } catch {
            github = null;
        }
        return {files, github};
    };
    return pickMapping({tableFound: !!table, imageField: !!img, githubField: !!gh, slug, variantRow: cells(variantRecord), defaultRow: cells(record)});
}

export type MappingPanelProps = {
    /** right-pane toggle value (isMappingOn) — false → renders nothing */
    on: boolean;
    configTable: Table | null;
    /** the hook's default row and Variant row */
    record: Rowish;
    variantRecord?: Rowish;
    slug: string;
};

export function MappingPanel(p: MappingPanelProps) {
    if (!p.on) return null;
    return p.configTable ? <WithRecords {...p} table={p.configTable} /> : <MappingBody m={readMapping(null, null, null, null, p.slug)} />;
}
function WithRecords(p: MappingPanelProps & {table: Table}) {
    const recs = useRecords(p.table);
    return <MappingBody m={readMapping(p.table, recs ?? null, p.record, p.variantRecord, p.slug)} />;
}

function MappingBody({m}: {m: MappingResult}) {
    const [open, setOpen] = useState(true);
    const [big, setBig] = useState<MappingFile | null>(null);
    useEffect(() => {
        if (!big) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setBig(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [big]);
    return (
        <div className="csfmp" dir="rtl" data-slot="mapping-panel">
            <style>{CSS}</style>
            <button type="button" className="csfmp-h" onClick={() => setOpen(!open)}>
                מיפוי · Extension_Config.Attachment_Mapping_Image {m.state === 'ok' ? `(${m.files.length})` : '⚠'} {open ? '▴' : '▾'}
            </button>
            {open && (
                <div className="csfmp-b">
                    <div className={m.state === 'ok' ? 'csfmp-n' : 'csfmp-bad'}>{m.hint}</div>
                    {m.files.length > 0 && (
                        <div className="csfmp-grid">
                            {m.files.map(f => (
                                <figure key={f.id} className="csfmp-f">
                                    {f.thumb ? (
                                        <button type="button" className="csfmp-img" title="הגדלה" onClick={() => setBig(f)}>
                                            <img src={f.thumb} alt={f.filename} loading="lazy" />
                                        </button>
                                    ) : (
                                        <a className="csfmp-file" href={f.url} target="_blank" rel="noopener noreferrer">
                                            📄 {f.type || 'קובץ'}
                                        </a>
                                    )}
                                    <figcaption>
                                        <a href={f.url} target="_blank" rel="noopener noreferrer" dir="ltr">
                                            {f.filename}
                                        </a>
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    )}
                    <div className="csfmp-n">
                        {m.github ? (
                            <a href={m.github} target="_blank" rel="noopener noreferrer">
                                קוד ב-GitHub ↗{m.githubFrom === 'variant' ? ' (שורת Variant)' : ''}
                            </a>
                        ) : (
                            GITHUB_HINT[m.githubState]
                        )}
                    </div>
                </div>
            )}
            {big && (
                <div className="csfmp-lb" role="dialog" aria-label={big.filename} onClick={() => setBig(null)}>
                    <div className="csfmp-lbbar" onClick={e => e.stopPropagation()}>
                        <span dir="ltr">{big.filename}</span>
                        <a href={big.url} target="_blank" rel="noopener noreferrer">
                            פתיחה בלשונית חדשה ↗
                        </a>
                        <button type="button" onClick={() => setBig(null)} aria-label="סגירה">
                            ✕
                        </button>
                    </div>
                    <img src={big.isImage ? big.url : (big.thumb ?? big.url)} alt={big.filename} onClick={e => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}

const CSS = `
.csfmp { direction:rtl; text-align:right; margin:10px auto 0; width:100%; max-width:1100px; background:#fff; color:#2f2f2f;
  border:1px solid #e3ddd2; border-radius:10px; font:12.5px/1.55 "Segoe UI", Heebo, Rubik, Arial, sans-serif; box-sizing:border-box; }
.csfmp * { box-sizing:border-box; }
.csfmp-h { display:block; width:100%; text-align:right; font:inherit; font-weight:700; color:inherit; background:#f6f3ee; border:0;
  border-radius:10px 10px 0 0; padding:6px 12px; cursor:pointer; }
.csfmp-b { padding:8px 12px 10px; }
.csfmp-n { font-size:11.5px; color:#6f6a62; margin-top:4px; }
.csfmp-bad { color:#a8452f; font-weight:600; }
.csfmp a { color:#2b5f8a; }
.csfmp-grid { display:flex; flex-wrap:wrap; gap:10px; margin-top:6px; }
.csfmp-f { margin:0; width:240px; }
.csfmp-img { display:block; width:240px; height:170px; padding:0; border:1px solid #e3ddd2; border-radius:8px; background:#faf8f4; cursor:zoom-in; overflow:hidden; }
.csfmp-img img { width:100%; height:100%; object-fit:contain; display:block; }
.csfmp-file { display:flex; align-items:center; justify-content:center; width:240px; height:170px; border:1px dashed #d8d0c2; border-radius:8px; text-decoration:none; }
.csfmp-f figcaption { font-size:11.5px; margin-top:3px; word-break:break-all; text-align:left; }
.csfmp-lb { position:fixed; inset:0; z-index:2147483000; background:rgba(20,20,20,.82); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:16px; cursor:zoom-out; }
.csfmp-lb img { max-width:96vw; max-height:84vh; object-fit:contain; background:#fff; border-radius:6px; cursor:default; }
.csfmp-lbbar { display:flex; gap:14px; align-items:center; color:#fff; margin-bottom:8px; font-size:13px; cursor:default; }
.csfmp-lbbar a { color:#bfe0ff; }
.csfmp-lbbar button { font:inherit; background:#fff; color:#222; border:0; border-radius:6px; padding:2px 10px; cursor:pointer; }
`;
