/**
 * v0.5.7: one people picker for «לאפשר עריכה משותפת?» (new-list modal) and the list header's «שותף עם» editor.
 * People (by Full Name) + Interface collaborators, deduped by name. Pickable (= a real collaborator, so it can go
 * into SharedWith) first; the rest collapse behind «עוד N ללא גישה».
 */
import {useMemo, useState} from 'react';
import {useBase} from '@airtable/blocks/interface/ui';
import {type Collab, type Fields, type Model, type Tables, pictureOf, str} from './model';
import {Avatar} from './ui';

export const normName = (x: string | null | undefined) => (x ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
export type SharePerson = {key: string; name: string; pic: string | null; collabId: string | null};

export function useSharePeople(T: Tables, F: Fields, model: Model, meId: string | null, current: Collab[] = []): SharePerson[] {
    const base = useBase();
    const collabs = base.activeCollaborators;
    return useMemo(() => {
        const byName = new Map<string, Collab>();
        for (const c of [...collabs, ...current]) {
            const k = normName(c.name);
            if (k && !byName.has(k)) byName.set(k, c);
        }
        const out = new Map<string, SharePerson>(); // key = normalised name (dedupe)
        const put = (p: SharePerson) => {
            const k = normName(p.name);
            if (!k) return;
            const prev = out.get(k);
            if (!prev) return void out.set(k, p);
            // keep one row per name: a matched one wins, and keep any picture we have
            out.set(k, {...prev, collabId: prev.collabId ?? p.collabId, pic: prev.pic ?? p.pic});
        };
        const recs = T.people ? model.sourceRecords.person : [];
        for (const r of recs) {
            const n = (str(r, F.pName) || r.name || '').trim();
            put({key: r.id, name: n, pic: pictureOf(r, F.pPic, 'small'), collabId: byName.get(normName(n))?.id ?? null});
        }
        // every Interface collaborator (and whoever is already shared) is pickable, even without a People row
        for (const c of [...collabs, ...current]) put({key: c.id, name: (c.name ?? c.email ?? '').trim(), pic: c.profilePicUrl && !c.profilePicUrl.includes('userIcons') ? c.profilePicUrl : null, collabId: c.id});
        const seenCollab = new Set<string>();
        return [...out.values()]
            .filter((p) => {
                if (p.collabId && p.collabId === meId) return false;
                if (!p.collabId) return true;
                if (seenCollab.has(p.collabId)) return false;
                seenCollab.add(p.collabId);
                return true;
            })
            .sort((a, b) => Number(!a.collabId) - Number(!b.collabId) || a.name.localeCompare(b.name, 'he'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collabs, current.map((c) => c.id).join(','), T.people, model.sourceRecords, F.pName, F.pPic, meId]);
}

export function SharePicker(props: {people: SharePerson[]; picked: string[]; setPicked: (ids: string[]) => void}) {
    const {people, picked, setPicked} = props;
    const [q, setQ] = useState('');
    const [showMore, setShowMore] = useState(false);
    const n = normName(q);
    const shown = n ? people.filter((p) => normName(p.name).includes(n)) : people;
    const matched = shown.filter((p) => p.collabId);
    const unmatched = shown.filter((p) => !p.collabId);
    const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
    const row = (p: SharePerson) => {
        const on = Boolean(p.collabId && picked.includes(p.collabId));
        return (
            <button
                key={p.key}
                type="button"
                className={`pp-person${on ? ' on' : ''}`}
                aria-pressed={on}
                disabled={!p.collabId}
                title={!p.collabId ? 'אין גישה לממשק' : undefined}
                onClick={() => p.collabId && toggle(p.collabId)}
            >
                {p.pic ? <img className="avatar" src={p.pic} alt="" style={{width: 22, height: 22}} /> : <Avatar c={{id: p.key, name: p.name}} size={22} />}
                <span className="pp-name">{p.name}</span>
                {!p.collabId ? <small className="muted">צריך גישה לממשק</small> : on ? <span className="pp-check">✓</span> : null}
            </button>
        );
    };
    return (
        <div className="people-pick">
            {people.length > 8 ? <input className="search" type="search" dir="rtl" value={q} placeholder="חיפוש לפי שם…" aria-label="חיפוש אנשים" onChange={(e) => setQ(e.target.value)} /> : null}
            {people.length === 0 ? (
                <small className="muted">אין אנשים זמינים לשיתוף</small>
            ) : (
                <div className="people-list" role="group" aria-label="עריכה משותפת עם">
                    {matched.map(row)}
                    {matched.length === 0 ? <small className="muted pp-empty">{n ? 'לא נמצאו אנשים עם גישה' : 'אין עדיין אנשים עם גישה לממשק'}</small> : null}
                    {unmatched.length ? (
                        <button type="button" className="pp-more" aria-expanded={showMore} onClick={() => setShowMore((v) => !v)}>
                            {showMore ? `הסתרת ${unmatched.length} ללא גישה ▴` : `עוד ${unmatched.length} ללא גישה ▾`}
                        </button>
                    ) : null}
                    {showMore ? unmatched.map(row) : null}
                </div>
            )}
        </div>
    );
}
