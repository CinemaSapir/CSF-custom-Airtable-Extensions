/** Shared writes (create item, unlink item, create list). v0.5.7: deleteList is the ONLY delete – the List + its own List Items, never source records. */
import {type Record as AirtableRecord} from '@airtable/blocks/interface/models';
import {type Fields, type Item, type Kind, type ListVM, type Tables, condSlots, dynamicReady, linkField, links, typeCellFor} from './model';
import {type Field} from '@airtable/blocks/interface/models';
import {type Cond, type Source, choiceNames, condField} from './dynlogic';

export class ActionError extends Error {
    constructor(
        public he: string,
        public detail?: string,
    ) {
        super(he);
    }
}

/**
 * v0.5.11: the cells of a new List Item – list + link + Label + Sort Order + Checked, and ALWAYS the Type (= the source
 * table's name, see typeCellFor) when the Type field is there and writable. If only the Type cell is refused, the item is
 * still created without it (the link carries the table). Shared by the new-list picker path and the «+ הוספת פריט» panel.
 */
export function newItemFields(T: Pick<Tables, 'items'>, F: Fields, listId: string, kind: Kind, sourceId: string, name: string, order: number | null) {
    const link = linkField(F, kind);
    if (!link || !F.iList) return null;
    const fields: {[id: string]: unknown} = {[F.iList.id]: [{id: listId}], [link.id]: [{id: sourceId}]};
    if (F.iLabel) fields[F.iLabel.id] = name;
    if (F.iSortOrder && order !== null) fields[F.iSortOrder.id] = order;
    if (F.iChecked) fields[F.iChecked.id] = false;
    const type = typeCellFor(F, kind);
    if (F.iType && type !== null) {
        const typed = {...fields, [F.iType.id]: type};
        if (T.items.checkPermissionsForCreateRecord(typed).hasPermission || !T.items.checkPermissionsForCreateRecord(fields).hasPermission) return typed;
    }
    return fields;
}

export async function createItem(T: Tables, F: Fields, listId: string, kind: Kind, sourceId: string, name: string, order: number | null) {
    const fields = newItemFields(T, F, listId, kind, sourceId, name, order);
    if (!fields) throw new ActionError('שדות הקישור לא זמינים באלמנט.');
    const chk = T.items.checkPermissionsForCreateRecord(fields);
    if (!chk.hasPermission) throw new ActionError('אין לך הרשאה להוסיף פריטים לרשימה הזו.', chk.reasonDisplayString);
    return T.items.createRecordAsync(fields);
}

/** remove from a list = rewrite Festival List without it (the List Item record stays) */
export async function unlinkItems(T: Tables, F: Fields, items: Item[], listId: string) {
    if (!F.iList) throw new ActionError('שדה השיוך לרשימה לא זמין באלמנט.');
    const iList = F.iList;
    const updates = items.map((i) => ({id: i.id, fields: {[iList.id]: links(i.rec, iList).filter((l) => l.id !== listId).map((l) => ({id: l.id}))}}));
    const chk = T.items.checkPermissionsForUpdateRecords(updates);
    if (!chk.hasPermission) throw new ActionError('אין לך הרשאה לשנות את הרשימה הזו.', chk.reasonDisplayString);
    for (let k = 0; k < updates.length; k += 50) await T.items.updateRecordsAsync(updates.slice(k, k + 50));
}

export async function setChecked(T: Tables, F: Fields, rec: AirtableRecord, value: boolean) {
    if (!F.iChecked) throw new ActionError('שדה הסימון לא זמין באלמנט.');
    const fields = {[F.iChecked.id]: value};
    const chk = T.items.checkPermissionsForUpdateRecord(rec, fields);
    if (!chk.hasPermission) throw new ActionError('אין לך הרשאה לשנות את הרשימה הזו.', chk.reasonDisplayString);
    await T.items.updateRecordAsync(rec, fields);
}

/** Hebrew + Interface-share hint when Lists create is denied (SDK detail stays in .detail / console). */
export const CREATE_DENIED_HE =
    'אין לך הרשאה ליצור רשימה כאן. בדקו שיתוף הממשק (Can edit records / הוספת רשומות) והרשאות טבלת Lists.';

/**
 * Create a Lists row. Public/Private + SharedWith are display labels (CISO: ACL = Interface share),
 * so if those fields alone block the write we retry without them rather than fail the whole create.
 */
export async function createListRecord(T: Tables, F: Fields, fields: {[id: string]: unknown}) {
    const dropIds = [F.lShared?.id, F.lVisibility?.id].filter(Boolean) as string[];
    const variants: Array<{[id: string]: unknown}> = [fields];
    if (dropIds.length) {
        const withoutShared = {...fields};
        if (F.lShared) delete withoutShared[F.lShared.id];
        variants.push(withoutShared);
        const withoutVis = {...fields};
        if (F.lVisibility) delete withoutVis[F.lVisibility.id];
        variants.push(withoutVis);
        const core = {...fields};
        for (const id of dropIds) delete core[id];
        variants.push(core);
    }
    // de-dupe by JSON key set
    const seen = new Set<string>();
    let lastDetail: string | undefined;
    for (const v of variants) {
        const key = Object.keys(v).sort().join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        const chk = T.lists.checkPermissionsForCreateRecord(v);
        if (!chk.hasPermission) {
            lastDetail = chk.reasonDisplayString;
            continue;
        }
        return T.lists.createRecordAsync(v);
    }
    throw new ActionError(CREATE_DENIED_HE, lastDetail);
}

export async function createQuickList(T: Tables, F: Fields, meId: string, name: string) {
    if (!F.lName) throw new ActionError('שדה שם הרשימה לא זמין באלמנט.');
    const fields: {[id: string]: unknown} = {[F.lName.id]: name};
    if (F.lOwner) fields[F.lOwner.id] = {id: meId};
    if (F.lType) fields[F.lType.id] = {name: 'Regular'};
    if (F.lVisibility) fields[F.lVisibility.id] = {name: 'Private'};
    if (F.lStatus) fields[F.lStatus.id] = {name: 'Active'};
    return createListRecord(T, F, fields);
}

export async function setArchived(T: Tables, F: Fields, rec: AirtableRecord, archived: boolean) {
    if (!F.lStatus) throw new ActionError('שדה הסטטוס לא זמין באלמנט.');
    const fields = {[F.lStatus.id]: {name: archived ? 'Archived' : 'Active'}};
    const chk = T.lists.checkPermissionsForUpdateRecord(rec, fields);
    if (!chk.hasPermission) throw new ActionError('אין לך הרשאה לשנות את הרשימה הזו.', chk.reasonDisplayString);
    await T.lists.updateRecordAsync(rec, fields);
}

/** v0.5.13: write one Status choice (or clear it) – used by «ביטול» to put back exactly what was there before hiding */
export async function setListStatus(T: Tables, F: Fields, rec: AirtableRecord, name: string | null) {
    if (!F.lStatus) throw new ActionError('שדה הסטטוס לא זמין באלמנט.');
    const fields = {[F.lStatus.id]: name ? {name} : null};
    const chk = T.lists.checkPermissionsForUpdateRecord(rec, fields);
    if (!chk.hasPermission) throw new ActionError('אין לך הרשאה לשנות את הרשימה הזו.', chk.reasonDisplayString);
    await T.lists.updateRecordAsync(rec, fields);
}
/**
 * v0.5.16: THE one hide/show rule – Home gallery cards, Home list rows and both list headers («הסתרה מדף הבית») all ask
 * this and nothing else: owner only (relation 'mine'), Status exposed, write allowed. A list shared with me or public →
 * no pill in either view and no header toggle.
 */
export function canHide(T: Tables, F: Fields, list: ListVM): boolean {
    if (list.relation !== 'mine' || !F.lStatus) return false;
    try {
        return T.lists.hasPermissionToUpdateRecord(list.rec, {[F.lStatus.id]: {name: list.archived ? 'Active' : 'Archived'}});
    } catch {
        return false;
    }
}

export async function setListVisibility(T: Tables, F: Fields, rec: AirtableRecord, isPublic: boolean) {
    if (!F.lVisibility) throw new ActionError('שדה הנראות לא זמין באלמנט.');
    const fields = {[F.lVisibility.id]: {name: isPublic ? 'Public' : 'Private'}};
    const chk = T.lists.checkPermissionsForUpdateRecord(rec, fields);
    if (!chk.hasPermission) {
        throw new ActionError(
            'אין לך הרשאה לשנות פרטית/ציבורית. בדקו שיתוף הממשק (Can edit records) או הרשאות השדה Visibility.',
            chk.reasonDisplayString,
        );
    }
    await T.lists.updateRecordAsync(rec, fields);
}

export const heErr = (e: unknown) => (e instanceof ActionError ? e.he : 'הפעולה לא נשמרה. נסו שוב.');
export const detailErr = (e: unknown) => (e instanceof ActionError ? e.detail : e instanceof Error ? e.message : String(e));

/** a legacy single select gets {name} only when that choice already exists (the extension can't add choices) */
const legacyChoice = (f: Field | null, name: string) => (f && choiceNames(f).includes(name) ? {name} : null);

/**
 * structured dynamic-list cells: Mode = Dynamic, Source table ID (+ legacy select when possible),
 * Cond1..3 Field ID (+ legacy select) / Operator / Value – unused slots cleared.
 * Only fields configured (and not sensitive) for the source can be written.
 */
export function dynamicFields(F: Fields, source: Source, conds: Cond[]): {[id: string]: unknown} {
    if (!dynamicReady(F)) throw new ActionError('שדות הרשימה הדינמית לא מופעלים באלמנט.');
    if (!source.table) throw new ActionError(`הטבלה ״${source.he}״ לא זמינה לאלמנט.`);
    if (!source.active) throw new ActionError(`הטבלה ״${source.he}״ כבויה בהגדרות.`);
    const out: {[id: string]: unknown} = {[F.lMode!.id]: {name: 'Dynamic'}, [F.lSourceId!.id]: source.table.id};
    if (F.lSource) out[F.lSource.id] = legacyChoice(F.lSource, source.table.name);
    condSlots(F).forEach((slot, i) => {
        const c = conds[i];
        const sf = c?.key ? condField(source, c.key) : null;
        if (c?.key && (!sf || sf.issue || !sf.field)) throw new ActionError(`השדה ״${sf?.he ?? c.key}״ לא זמין לתנאים של ״${source.he}״.`);
        const f = sf?.field ?? null;
        out[slot.id!.id] = f ? f.id : null;
        if (slot.f) out[slot.f.id] = f ? legacyChoice(slot.f, f.name) : null;
        out[slot.o!.id] = f && c.op ? {name: c.op} : null;
        out[slot.v!.id] = f && c.value.trim() ? c.value.trim() : null;
    });
    return out;
}
export async function saveConditions(T: Tables, F: Fields, rec: AirtableRecord, source: Source, conds: Cond[]) {
    const fields = dynamicFields(F, source, conds);
    const chk = T.lists.checkPermissionsForUpdateRecord(rec, fields);
    if (!chk.hasPermission) throw new ActionError('אין לך הרשאה לשנות את התנאים של הרשימה.', chk.reasonDisplayString);
    await T.lists.updateRecordAsync(rec, fields);
}
/** the one "הצגת סימוני ✓" switch – still stored in List Type (Checklist / Regular) */
export async function setShowChecks(T: Tables, F: Fields, rec: AirtableRecord, on: boolean) {
    if (!F.lType) throw new ActionError('שדה סוג הרשימה לא זמין באלמנט.');
    const fields = {[F.lType.id]: {name: on ? 'Checklist' : 'Regular'}};
    const chk = T.lists.checkPermissionsForUpdateRecord(rec, fields);
    if (!chk.hasPermission) throw new ActionError('אין לך הרשאה לשנות את הרשימה הזו.', chk.reasonDisplayString);
    await T.lists.updateRecordAsync(rec, fields);
}

// ---------------- v0.5.7: delete list / sharing / description ----------------
/** List Items to delete (only in this list) vs. to unlink (also in another list – those stay for the other list) */
export function deletePlan(list: ListVM) {
    const del = list.ownItems.filter((i) => i.listIds.every((id) => id === list.id));
    const unlink = list.ownItems.filter((i) => i.listIds.some((id) => id !== list.id));
    return {del, unlink};
}
/** «מחק רשימה» is shown only to the list's owner, and only when the SDK allows every write the delete needs */
export function canDeleteList(T: Tables, F: Fields, list: ListVM): boolean {
    if (list.relation !== 'mine') return false;
    try {
        if (!T.lists.hasPermissionToDeleteRecord(list.rec)) return false;
        const {del, unlink} = deletePlan(list);
        if (del.length && !T.items.hasPermissionToDeleteRecords(del.map((i) => i.rec))) return false;
        if (unlink.length && F.iList && !T.items.hasPermissionToUpdateRecord(unlink[0].rec, {[F.iList.id]: []})) return false;
        return true;
    } catch {
        return false;
    }
}
export const DELETE_DENIED_HE = 'אין לך הרשאה למחוק את הרשימה הזו.';
/** removes the List Item records of this list (unlinks the shared ones), then the List record. Source records are never touched. */
export async function deleteList(T: Tables, F: Fields, list: ListVM) {
    const {del, unlink} = deletePlan(list);
    const iList = F.iList;
    const unlinkUpdates = iList
        ? unlink.map((i) => ({id: i.id, fields: {[iList.id]: links(i.rec, iList).filter((l) => l.id !== list.id).map((l) => ({id: l.id}))}}))
        : [];
    const chkL = T.lists.checkPermissionsForDeleteRecord(list.rec);
    if (!chkL.hasPermission) throw new ActionError(DELETE_DENIED_HE, chkL.reasonDisplayString);
    if (del.length) {
        const chkI = T.items.checkPermissionsForDeleteRecords(del.map((i) => i.rec));
        if (!chkI.hasPermission) throw new ActionError(DELETE_DENIED_HE, chkI.reasonDisplayString);
    }
    if (unlinkUpdates.length) {
        const chkU = T.items.checkPermissionsForUpdateRecords(unlinkUpdates);
        if (!chkU.hasPermission) throw new ActionError(DELETE_DENIED_HE, chkU.reasonDisplayString);
    }
    for (let k = 0; k < unlinkUpdates.length; k += 50) await T.items.updateRecordsAsync(unlinkUpdates.slice(k, k + 50));
    for (let k = 0; k < del.length; k += 50) await T.items.deleteRecordsAsync(del.slice(k, k + 50).map((i) => i.rec));
    await T.lists.deleteRecordAsync(list.rec);
    return {deleted: del.length, unlinked: unlink.length};
}
export function canSetShared(T: Tables, F: Fields, rec: AirtableRecord): boolean {
    if (!F.lShared) return false;
    try {
        return T.lists.hasPermissionToUpdateRecord(rec, {[F.lShared.id]: undefined});
    } catch {
        return false;
    }
}
export async function saveShared(T: Tables, F: Fields, rec: AirtableRecord, collabIds: string[]) {
    if (!F.lShared) throw new ActionError('שדה השיתוף (SharedWith) לא זמין באלמנט.');
    const fields = {[F.lShared.id]: [...new Set(collabIds)].map((id) => ({id}))};
    const chk = T.lists.checkPermissionsForUpdateRecord(rec, fields);
    if (!chk.hasPermission) throw new ActionError('אין לך הרשאה לשנות את השיתוף של הרשימה.', chk.reasonDisplayString);
    await T.lists.updateRecordAsync(rec, fields);
}
export async function saveDescription(T: Tables, F: Fields, rec: AirtableRecord, text: string) {
    if (!F.lDesc) throw new ActionError('שדה התיאור לא זמין באלמנט.');
    const fields = {[F.lDesc.id]: text.trim() ? text : null};
    const chk = T.lists.checkPermissionsForUpdateRecord(rec, fields);
    if (!chk.hasPermission) throw new ActionError('אין לך הרשאה לשנות את התיאור.', chk.reasonDisplayString);
    await T.lists.updateRecordAsync(rec, fields);
}
