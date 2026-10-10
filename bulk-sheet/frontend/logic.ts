/**
 * Pure logic for the bulk sheet: parsing pasted blocks, normalising, and per-row validation.
 * No Airtable imports here, so it can be unit-tested with plain node (see ../scripts/logic-test.mjs).
 */

export const NCOL = 7;
export const COL = {name: 0, pPhone: 1, pEmail: 2, role: 3, rPhone: 4, rEmail: 5, partner: 6} as const;
export const COL_LABELS = ['שם', 'טלפון אישי', 'אימייל אישי', 'תפקיד', 'טלפון עבודה', 'אימייל עבודה', 'שותף עסקי'];
export const COL_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז'];
export const STATUS_LETTER = 'ח';
export const LTR_COLS = new Set<number>([COL.pPhone, COL.pEmail, COL.rPhone, COL.rEmail]);

export const TIP_DUP_PHONE = 'מספר הטלפון הזה מקושר למישהו אחר';
export const TIP_DUP_EMAIL = 'כתובת האימייל הזו מקושרת למישהו אחר';

// ---------------------------------------------------------------------------
// normalising
// ---------------------------------------------------------------------------
/** digits only; leading 972 and leading 0 are the same prefix (+972 52… == 052…) */
export function normPhone(s: string): string {
    let d = (s || '').replace(/\D/g, '');
    if (d.startsWith('972')) d = d.slice(3);
    while (d.startsWith('0')) d = d.slice(1);
    return d;
}
/** case- and space-insensitive */
export function normEmail(s: string): string {
    return (s || '').replace(/\s+/g, '').toLowerCase();
}
/** trim + collapse inner whitespace; case-insensitive for latin letters */
export function normName(s: string): string {
    return (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}
export function cleanText(s: string): string {
    return (s || '').replace(/\s+/g, ' ').trim();
}
export function isValidEmail(s: string): boolean {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}
export function isPlausiblePhone(s: string): boolean {
    const d = (s || '').replace(/\D/g, '');
    return d.length >= 9 && d.length <= 13;
}

// ---------------------------------------------------------------------------
// paste parsing (Excel / Google Sheets copy = TSV, rows separated by newlines, cells with
// newlines/tabs/quotes wrapped in double quotes)
// ---------------------------------------------------------------------------
export function parseTSV(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let i = 0;
    let inQuotes = false;
    const src = text.replace(/\r\n?/g, '\n');
    while (i < src.length) {
        const ch = src[i];
        if (inQuotes) {
            if (ch === '"') {
                if (src[i + 1] === '"') {
                    cell += '"';
                    i += 2;
                    continue;
                }
                inQuotes = false;
                i++;
                continue;
            }
            cell += ch;
            i++;
            continue;
        }
        if (ch === '"' && cell === '') {
            inQuotes = true;
            i++;
            continue;
        }
        if (ch === '\t') {
            row.push(cell);
            cell = '';
            i++;
            continue;
        }
        if (ch === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
            i++;
            continue;
        }
        cell += ch;
        i++;
    }
    if (cell !== '' || row.length) {
        row.push(cell);
        rows.push(row);
    }
    return rows.map((r) => r.map((c) => c.replace(/\n/g, ' ').trim()));
}

/** Blocks that are one plain value go to the browser's normal paste. */
export function isBlockPaste(text: string): boolean {
    return /[\t\n\r]/.test(text.replace(/[\r\n]+$/, ''));
}

/** Serialize a block of cells to TSV (Excel / Sheets friendly). */
export function toTSV(rows: string[][]): string {
    return rows
        .map((row) =>
            row
                .map((cell) => {
                    const s = cell ?? '';
                    if (/[\t\n\r"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
                    return s;
                })
                .join('\t'),
        )
        .join('\n');
}

/** drop fully blank rows */
export function nonBlankRows(rows: string[][]): string[][] {
    return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// ---------------------------------------------------------------------------
// header row detection (a normal Excel copy includes the header row)
// ---------------------------------------------------------------------------
const IGNORE = -1;
function normHeader(s: string): string {
    return (s || '')
        .toLowerCase()
        .replace(/[\u0591-\u05c7]/g, '') // niqqud
        .replace(/["'`׳״:*()[\]{}#.,;!?\-_/\\]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
/** Which sheet column a header cell names; IGNORE for status-like columns; null if it is not a known header. */
export function classifyHeader(cell: string): number | null {
    const h = normHeader(cell);
    if (!h) return null;
    const has = (...words: string[]) => words.some((w) => h.includes(w));
    const isRole = has('תפקיד', 'role');
    // עבודה / work marks the role phone and role email (טלפון עבודה, אימייל עבודה). It must not
    // by itself name the role column, or a header that only says עבודה would land in תפקיד.
    const isWork = isRole || has('עבודה', 'work');
    const isPhone = has('טלפון', 'נייד', 'phone', 'mobile', 'tel', 'פלאפון');
    const isEmail = has('אימייל', 'מייל', 'דוא ל', 'דואל', 'email', 'e mail', 'mail');
    const isPersonal = has('אישי', 'personal', 'private');
    if (isPhone && isEmail) return null;
    if (isPhone) return isWork && !isPersonal ? COL.rPhone : COL.pPhone;
    if (isEmail) return isWork && !isPersonal ? COL.rEmail : COL.pEmail;
    if (has('גוף שותף', 'שותף עסקי', 'שותף', 'partner', 'ארגון', 'organization', 'organisation')) return COL.partner;
    if (isRole) return COL.role;
    if (has('סטטוס', 'תיקון', 'status', 'הערות', 'notes')) return IGNORE;
    if (/^(שם|שם מלא|שם פרטי ומשפחה|name|full name|שם איש קשר|איש קשר|contact)$/.test(h) || has('full name', 'שם מלא')) return COL.name;
    if (h === 'שם' || h.startsWith('שם ') || h === 'name') return COL.name;
    return null;
}
export type HeaderInfo = {
    isHeader: boolean;
    /** pasted column j → sheet column (IGNORE = drop); null when the header does not map unambiguously */
    mapping: number[] | null;
};
/**
 * A first row is a header when it has at least 2 non-empty cells, no cell looks like data
 * (an email or 7+ digits), and every non-empty cell is a known column name.
 */
export function detectHeader(row: string[]): HeaderInfo {
    const cells = row.map((c) => (c || '').trim());
    const filled = cells.filter(Boolean);
    if (filled.length < 2) return {isHeader: false, mapping: null};
    if (filled.some((c) => c.includes('@') || c.replace(/\D/g, '').length >= 7)) return {isHeader: false, mapping: null};
    const cls = cells.map((c) => (c ? classifyHeader(c) : IGNORE));
    const known = cls.filter((x, j) => cells[j] && x !== null).length;
    if (known < filled.length) {
        // mostly headers (e.g. one unknown extra column) still counts as a header row, but no auto-mapping
        return {isHeader: known >= 2 && known >= filled.length - 1, mapping: null};
    }
    const used = cls.filter((x): x is number => x !== null && x !== IGNORE);
    const unique = new Set(used).size === used.length;
    return {isHeader: true, mapping: unique ? (cls as number[]) : null};
}

export type PastePlan = {
    /** rows to write, each already laid out as a full sheet row (NCOL cells) */
    rows: {cells: (string | undefined)[]}[];
    note: '' | 'header-skipped' | 'header-mapped';
};
/**
 * Turn a pasted block into sheet rows starting at column `startCol`.
 * `undefined` in a cell means "leave the existing value" (outside the pasted area).
 */
export function planPaste(block: string[][], startCol: number): PastePlan {
    let rows = nonBlankRows(block);
    let note: PastePlan['note'] = '';
    let mapping: number[] | null = null;
    if (rows.length) {
        const h = detectHeader(rows[0]);
        if (h.isHeader) {
            rows = rows.slice(1);
            note = 'header-skipped';
            if (h.mapping) {
                const positional = h.mapping.every((col, j) => col === IGNORE || col === startCol + j);
                if (!positional) {
                    mapping = h.mapping;
                    note = 'header-mapped';
                }
            }
        }
    }
    const out = rows.map((cells) => {
        const full: (string | undefined)[] = Array(NCOL).fill(undefined);
        if (mapping) {
            // every mapped sheet column is written (so stale values under it are replaced)
            for (const col of mapping) if (col !== IGNORE) full[col] = '';
            cells.forEach((val, j) => {
                const col = mapping![j];
                if (col !== undefined && col !== IGNORE) full[col] = val;
            });
        } else {
            cells.forEach((val, j) => {
                const col = startCol + j;
                if (col < NCOL) full[col] = val;
            });
        }
        return {cells: full};
    });
    return {rows: out, note};
}

// ---------------------------------------------------------------------------
// Hebrew count grammar
// ---------------------------------------------------------------------------
export const he = {
    rows: (n: number) => (n === 1 ? 'שורה אחת' : `${n} שורות`),
    send: (n: number) => (n === 1 ? 'שלח שורה אחת' : `שלח ${n} שורות`),
    ready: (n: number) => (n === 1 ? 'שורה אחת מוכנה' : `${n} מוכנות`),
    review: (n: number) => (n === 1 ? 'שורה אחת לבדיקה' : `${n} לבדיקה`),
    reviewLeft: (n: number) => (n === 1 ? 'שורה אחת לבדיקה תישאר בטבלה' : `${n} שורות לבדיקה יישארו בטבלה`),
    added: (n: number) => (n === 0 ? 'לא נוספו אנשים' : n === 1 ? 'נוסף אדם אחד' : `נוספו ${n} אנשים`),
    updated: (n: number) => (n === 0 ? '' : n === 1 ? 'עודכן אחד' : `עודכנו ${n}`),
    newM: (n: number) => (n === 1 ? 'חדש אחד' : `${n} חדשים`),
    updM: (n: number) => (n === 1 ? 'עדכון אחד' : `${n} עדכונים`),
    rolesNew: (n: number) => (n === 1 ? 'תפקיד חדש אחד' : `${n} תפקידים חדשים`),
    rolesUpd: (n: number) => (n === 1 ? 'תפקיד אחד עודכן' : `${n} תפקידים עודכנו`),
    assigned: (n: number) => (n === 1 ? 'שיבוץ אחד' : `${n} שיבוצים`),
    failed: (n: number) => (n === 1 ? 'שורה אחת נכשלה ונשארה בטבלה' : `${n} שורות נכשלו ונשארו בטבלה`),
    noRole: (n: number) =>
        n === 1 ? 'אדם אחד נוסף ללא תפקיד ולכן לא יופיע בספר הטלפונים:' : `${n} אנשים נוספו ללא תפקיד ולכן לא יופיעו בספר הטלפונים:`,
};

// ---------------------------------------------------------------------------
// validation
// ---------------------------------------------------------------------------
export type ExPerson = {id: string; name: string; phone: string; email: string};
export type ExRole = {id: string; name: string; phone: string; email: string; partnerIds: string[]};
export type ExAssignment = {id: string; personIds: string[]; roleIds: string[]; open: boolean};
export type PartnerLookup = (name: string) => {status: 'found'; id: string; name: string} | {status: 'missing'} | {status: 'multi'} | {status: 'pending'};

export type Ctx = {
    people: ExPerson[];
    roles: ExRole[];
    assignments: ExAssignment[];
    partner: PartnerLookup;
    /** false when the field is not enabled on the element — typing into that column is then flagged */
    has: {pPhone: boolean; pEmail: boolean; rPhone: boolean; rEmail: boolean; partner: boolean; assign: boolean};
};

export type RowState = 'empty' | 'new' | 'update' | 'same' | 'dup' | 'warn' | 'error' | 'pending';

export type Plan = {
    personKey: string | null; // 'p:rec…' or 'p:new:<normName>'
    personId: string | null;
    personName: string;
    personFields: {phone?: string; email?: string};
    roleKey: string | null;
    roleId: string | null;
    roleName: string;
    roleFields: {phone?: string; email?: string; partnerId?: string};
    assign: boolean;
};

export type RowCheck = {
    state: RowState;
    label: string;
    detail: string; // tooltip on the status cell (all issues)
    cellTips: {[col: number]: string};
    /** columns that collide with something (stronger red border) */
    dupCols: number[];
    plan: Plan | null;
    /** a new person with no role: will not show in the phone book (amber note) */
    noRole: boolean;
};

const EMPTY: RowCheck = {state: 'empty', label: '', detail: '', cellTips: {}, dupCols: [], plan: null, noRole: false};

function indexBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
    const m = new Map<string, T[]>();
    for (const it of items) {
        const k = key(it);
        if (!k) continue;
        const arr = m.get(k);
        if (arr) arr.push(it);
        else m.set(k, [it]);
    }
    return m;
}

type Owner = {key: string; label: string; short: string; row?: number};
/** msg = full sentence (tooltip); short = what the status cell shows */
type Issue = {msg: string; short: string; col: number | null; kind: 'error' | 'dup' | 'warn' | 'note'};

/** Reverse the data columns of every row (for a mirrored RTL/LTR paste). */
export function flipColumns(rows: string[][]): string[][] {
    return rows.map((v) => [...v].reverse());
}
/** Move the data of column `from` to position `to` in every row (headers stay put). */
export function moveColumn(rows: string[][], from: number, to: number): string[][] {
    if (from === to) return rows.map((v) => [...v]);
    return rows.map((v) => {
        const n = [...v];
        const [x] = n.splice(from, 1);
        n.splice(to, 0, x);
        return n;
    });
}

function rowKey(v: string[]): string {
    return [
        normName(v[COL.name]),
        normPhone(v[COL.pPhone]),
        normEmail(v[COL.pEmail]),
        normName(v[COL.role]),
        normPhone(v[COL.rPhone]),
        normEmail(v[COL.rEmail]),
        normName(v[COL.partner]),
    ].join('\u0001');
}

export function validateRows(rows: string[][], ctx: Ctx): RowCheck[] {
    const peopleByName = indexBy(ctx.people, (p) => normName(p.name));
    const rolesByName = indexBy(ctx.roles, (r) => normName(r.name));
    const peopleById = new Map(ctx.people.map((p) => [p.id, p]));
    const rolesById = new Map(ctx.roles.map((r) => [r.id, r]));

    // phone / email owners from existing records
    const phoneOwners = new Map<string, Owner[]>();
    const emailOwners = new Map<string, Owner[]>();
    const add = (m: Map<string, Owner[]>, k: string, o: Owner) => {
        if (!k) return;
        const arr = m.get(k) ?? [];
        if (!arr.some((x) => x.key === o.key)) arr.push(o);
        m.set(k, arr);
    };
    for (const p of ctx.people) {
        const o = {key: `p:${p.id}`, label: p.name, short: p.name};
        const d = normPhone(p.phone);
        if (d.length >= 7) add(phoneOwners, d, o);
        add(emailOwners, normEmail(p.email), o);
    }
    for (const r of ctx.roles) {
        const o = {key: `r:${r.id}`, label: `התפקיד ${r.name}`, short: `התפקיד ${r.name}`};
        const d = normPhone(r.phone);
        if (d.length >= 7) add(phoneOwners, d, o);
        add(emailOwners, normEmail(r.email), o);
    }

    // first pass: resolve person / role keys per row
    type Pre = {blank: boolean; name: string; role: string; personKey: string | null; personIds: string[]; roleKey: string | null; roleIds: string[]};
    const pre: Pre[] = rows.map((v) => {
        const blank = v.every((c) => !c || !c.trim());
        const name = cleanText(v[COL.name]);
        const role = cleanText(v[COL.role]);
        const pm = name ? peopleByName.get(normName(name)) ?? [] : [];
        const rm = role ? rolesByName.get(normName(role)) ?? [] : [];
        return {
            blank,
            name,
            role,
            personIds: pm.map((p) => p.id),
            personKey: name ? (pm.length === 1 ? `p:${pm[0].id}` : `p:new:${normName(name)}`) : null,
            roleIds: rm.map((r) => r.id),
            roleKey: role ? (rm.length === 1 ? `r:${rm[0].id}` : `r:new:${normName(role)}`) : null,
        };
    });

    // phone / email owners contributed by the sheet rows themselves
    for (let i = 0; i < rows.length; i++) {
        const v = rows[i];
        const p = pre[i];
        if (p.blank) continue;
        const pOwner = {key: p.personKey ?? `row:${i}`, label: `${p.name || 'ללא שם'} (שורה ${i + 1})`, short: `שורה ${i + 1}`, row: i};
        const rOwner = {key: p.roleKey ?? `row:${i}:r`, label: `התפקיד ${p.role || '?'} (שורה ${i + 1})`, short: `שורה ${i + 1}`, row: i};
        const pd = normPhone(v[COL.pPhone]);
        if (pd.length >= 7) add(phoneOwners, pd, pOwner);
        add(emailOwners, normEmail(v[COL.pEmail]), pOwner);
        const rd = normPhone(v[COL.rPhone]);
        if (rd.length >= 7) add(phoneOwners, rd, rOwner);
        add(emailOwners, normEmail(v[COL.rEmail]), rOwner);
    }

    // role → person keys among sheet rows (same role may be linked from many assignments; same person+role only once)
    const sheetRoleHolders = new Map<string, {personKey: string; row: number; name: string}[]>();
    pre.forEach((p, i) => {
        if (p.blank || !p.roleKey || !p.personKey) return;
        const arr = sheetRoleHolders.get(p.roleKey) ?? [];
        arr.push({personKey: p.personKey, row: i, name: p.name});
        sheetRoleHolders.set(p.roleKey, arr);
    });

    // exact duplicate rows + same person/role with conflicting contact details (first row wins)
    const firstRowByKey = new Map<string, number>();
    const firstContact = new Map<string, {row: number; val: string}>();

    return rows.map((v, i): RowCheck => {
        const p = pre[i];
        if (p.blank) return EMPTY;
        const issues: Issue[] = [];
        const tips: {[c: number]: string} = {};
        const issue = (kind: Issue['kind'], msg: string, col: number | null, tip?: string, short?: string) => {
            issues.push({kind, msg: tip ?? msg, short: short ?? msg, col});
            if (col !== null && !tips[col]) tips[col] = tip ?? msg;
        };

        const pPhone = cleanText(v[COL.pPhone]);
        const pEmail = normEmail(v[COL.pEmail]);
        const rPhone = cleanText(v[COL.rPhone]);
        const rEmail = normEmail(v[COL.rEmail]);
        const partnerName = cleanText(v[COL.partner]);
        const pd = normPhone(pPhone);
        const rd = normPhone(rPhone);

        // --- exact duplicate row
        const rk = rowKey(v);
        const firstRow = firstRowByKey.get(rk);
        if (firstRow !== undefined) issue('dup', `שורה כפולה (שורה ${firstRow + 1})`, COL.name, `השורה הזו זהה לשורה ${firstRow + 1}`, `שורה כפולה (שורה ${firstRow + 1})`);
        else firstRowByKey.set(rk, i);

        // --- hard errors
        if (!p.name && !p.role) issue('error', 'חסר שם', COL.name, 'חסר שם (או לפחות תפקיד)', 'חסר שם');
        else if (!p.name && (pPhone || pEmail)) issue('error', 'חסר שם', COL.name, 'יש טלפון/אימייל אישי בלי שם', 'חסר שם');
        if (!p.role && (rPhone || rEmail || partnerName))
            issue('error', 'חסר תפקיד', COL.role, 'יש פרטי תפקיד בלי תפקיד', 'חסר תפקיד');

        // --- field availability
        const notOnElement = (col: number, ok: boolean) => {
            if (!ok && cleanText(v[col])) issue('warn', `השדה ${COL_LABELS[col]} לא מופעל ברכיב`, col, undefined, 'שדה לא מופעל');
        };
        notOnElement(COL.pPhone, ctx.has.pPhone);
        notOnElement(COL.pEmail, ctx.has.pEmail);
        notOnElement(COL.rPhone, ctx.has.rPhone);
        notOnElement(COL.rEmail, ctx.has.rEmail);
        notOnElement(COL.partner, ctx.has.partner);

        // --- ambiguous names (which existing record to update?)
        if (p.name && p.personIds.length > 1)
            issue('dup', `יש ${p.personIds.length} אנשים בשם "${p.name}" — לא ברור את מי לעדכן`, COL.name, undefined, `${p.personIds.length} אנשים בשם הזה`);
        if (p.role && p.roleIds.length > 1)
            issue('dup', `יש ${p.roleIds.length} תפקידים בשם "${p.role}" — לא ברור את מי לעדכן`, COL.role, undefined, `${p.roleIds.length} תפקידים בשם הזה`);

        // --- format
        if (pPhone && !isPlausiblePhone(pPhone)) issue('warn', 'מספר הטלפון לא נראה תקין', COL.pPhone, undefined, 'טלפון לא תקין');
        if (rPhone && !isPlausiblePhone(rPhone)) issue('warn', 'טלפון העבודה לא נראה תקין', COL.rPhone, undefined, 'טלפון עבודה לא תקין');
        if (pEmail && !isValidEmail(pEmail)) issue('warn', 'כתובת האימייל לא תקינה', COL.pEmail, undefined, 'אימייל לא תקין');
        if (rEmail && !isValidEmail(rEmail)) issue('warn', 'אימייל העבודה לא תקין', COL.rEmail, undefined, 'אימייל עבודה לא תקין');

        // --- phone / email collisions (existing People + Roles + other rows)
        const dupCheck = (col: number, owners: Map<string, Owner[]>, k: string, me: string | null, base: string, shortBase: string, kind: 'dup' | 'note') => {
            if (!k) return;
            const all = owners.get(k) ?? [];
            // the value already belongs to this very record in Airtable: the other rows are the ones in conflict
            const ownsIt = all.some((o) => o.row === undefined && o.key === me);
            const others = all.filter((o) => o.key !== me && o.row !== i && !(ownsIt && o.row !== undefined));
            if (others.length) {
                const full = `${base}: ${others.map((o) => o.label).join(', ')}`;
                issue(kind, full, col, full, `${shortBase} ${others[0].short}${others.length > 1 ? ` +${others.length - 1}` : ''}`);
            }
        };
        // personal phone/email still block. Work phone/email only flag, so the row can still be sent.
        if (pd.length >= 7) dupCheck(COL.pPhone, phoneOwners, pd, p.personKey, TIP_DUP_PHONE, 'הטלפון של', 'dup');
        dupCheck(COL.pEmail, emailOwners, pEmail, p.personKey, TIP_DUP_EMAIL, 'האימייל של', 'dup');
        if (rd.length >= 7) dupCheck(COL.rPhone, phoneOwners, rd, p.roleKey, TIP_DUP_PHONE, 'הטלפון של', 'note');
        dupCheck(COL.rEmail, emailOwners, rEmail, p.roleKey, TIP_DUP_EMAIL, 'האימייל של', 'note');

        // --- same person / role in an earlier row with a different contact value
        const contactConflict = (ownerKey: string | null, field: string, col: number, val: string, what: string) => {
            if (!ownerKey || !val || firstRow !== undefined) return;
            const k = `${ownerKey}|${field}`;
            const f = firstContact.get(k);
            if (!f) firstContact.set(k, {row: i, val});
            else if (f.val !== val)
                issue('dup', `סתירה עם שורה ${f.row + 1}: ${what} אחר לאותו ${ownerKey.startsWith('p:') ? 'אדם' : 'תפקיד'}`, col, undefined, `סתירה עם שורה ${f.row + 1}`);
        };
        contactConflict(p.personKey, 'phone', COL.pPhone, pd, 'טלפון');
        contactConflict(p.personKey, 'email', COL.pEmail, pEmail, 'אימייל');
        contactConflict(p.roleKey, 'phone', COL.rPhone, rd, 'טלפון');
        contactConflict(p.roleKey, 'email', COL.rEmail, rEmail, 'אימייל');

        // --- partner (matched by exact name; never created here)
        let partnerId: string | undefined;
        let pending = false;
        if (partnerName && ctx.has.partner) {
            if (!p.role) issue('warn', 'שותף עסקי נשמר על התפקיד — מלאו תפקיד', COL.partner, undefined, 'שותף עסקי בלי תפקיד');
            else {
                const res = ctx.partner(partnerName);
                if (res.status === 'found') partnerId = res.id;
                else if (res.status === 'pending') pending = true;
                else if (res.status === 'multi') issue('dup', `יש כמה שותפים עסקיים בשם "${partnerName}"`, COL.partner, undefined, 'כמה שותפים עסקיים בשם הזה');
                else issue('warn', 'שותף עסקי לא נמצא', COL.partner, 'שותף עסקי לא נמצא — כתבו שם קיים בדיוק (לא יוצרים שותפים עסקיים חדשים מכאן)', 'שותף עסקי לא נמצא');
            }
        }

        // --- assignments: a role is a record linked FROM an assignment, not the assignment itself.
        // Many people may share one role (each gets their own assignment linking to that role).
        // Only the same person + same role is "already assigned".
        const personId = p.personKey && p.personIds.length === 1 ? p.personIds[0] : null;
        const roleId = p.roleKey && p.roleIds.length === 1 ? p.roleIds[0] : null;
        let assign = false;
        let assignExists = false;
        if (p.personKey && p.roleKey && ctx.has.assign) {
            const mine = roleId && personId
                ? ctx.assignments.filter((a) => a.open && a.roleIds.includes(roleId) && a.personIds.includes(personId))
                : [];
            const earlierSame = (sheetRoleHolders.get(p.roleKey) ?? []).filter((h) => h.personKey === p.personKey && h.row < i);
            assignExists = mine.length > 0 || earlierSame.length > 0;
            assign = !assignExists;
        }

        // --- the write plan
        const personFields: Plan['personFields'] = {};
        const exP = personId ? peopleById.get(personId) : undefined;
        if (p.name) {
            if (pPhone && ctx.has.pPhone && (!exP || normPhone(exP.phone) !== pd)) personFields.phone = pPhone;
            if (pEmail && ctx.has.pEmail && (!exP || normEmail(exP.email) !== pEmail)) personFields.email = pEmail;
        }
        const roleFields: Plan['roleFields'] = {};
        const exR = roleId ? rolesById.get(roleId) : undefined;
        if (p.role) {
            if (rPhone && ctx.has.rPhone && (!exR || normPhone(exR.phone) !== rd)) roleFields.phone = rPhone;
            if (rEmail && ctx.has.rEmail && (!exR || normEmail(exR.email) !== rEmail)) roleFields.email = rEmail;
            if (partnerId && (!exR || !exR.partnerIds.includes(partnerId))) roleFields.partnerId = partnerId;
        }
        const newPerson = !!p.name && !personId;
        const newRole = !!p.role && !roleId;
        const changes = newPerson || newRole || assign || Object.keys(personFields).length > 0 || Object.keys(roleFields).length > 0;
        // an existing person+role assignment only counts as a duplicate when the row would add nothing else
        if (assignExists && !changes && !issues.length) issue('dup', 'השיבוץ הזה כבר קיים', COL.role, `השיבוץ ${p.name} ← ${p.role} כבר קיים`, 'השיבוץ כבר קיים');

        const notes = issues.filter((x) => x.kind === 'note');
        const blocking = issues.filter((x) => x.kind !== 'note');
        const dupCols = Array.from(new Set(issues.filter((x) => x.kind !== 'warn' && x.col !== null).map((x) => x.col as number)));
        const detail = blocking.map((x) => x.msg).join(' · ');
        const more = blocking.length > 1 ? ` (+${blocking.length - 1})` : '';
        const errs = blocking.filter((x) => x.kind === 'error');
        const dups = blocking.filter((x) => x.kind === 'dup');
        const warns = blocking.filter((x) => x.kind === 'warn');
        const base = {cellTips: tips, dupCols, plan: null, noRole: false};
        if (errs.length) return {...base, state: 'error', label: `✗ ${errs[0].short}${more}`, detail};
        if (dups.length) return {...base, state: 'dup', label: `⚠ ${dups[0].short}${more}`, detail};
        if (warns.length) return {...base, state: 'warn', label: `⚠ ${warns[0].short}${warns.length > 1 ? ` (+${warns.length - 1})` : ''}`, detail: warns.map((x) => x.msg).join(' · ')};
        if (pending) return {...base, state: 'pending', label: '… בודק שותף עסקי', detail: ''};
        if (!changes) return {...base, state: 'same', label: '• ללא שינוי', detail: 'הכל כבר קיים ומעודכן'};

        const plan: Plan = {personKey: p.personKey, personId, personName: p.name, personFields, roleKey: p.roleKey, roleId, roleName: p.role, roleFields, assign};
        const bits: string[] = [];
        if (newPerson) bits.push('אדם חדש');
        else if (personId) {
            if (personFields.phone) bits.push(COL_LABELS[COL.pPhone]);
            if (personFields.email) bits.push(COL_LABELS[COL.pEmail]);
        }
        if (newRole) bits.push('תפקיד חדש');
        // Name a phone, email, or partner write on an existing role, and also on a new role
        // for someone who already exists (that row is an update). A brand-new person stays ✓ מוכן,
        // so their new role does not list those fields in the status.
        if (roleId || (newRole && personId)) {
            if (roleFields.phone) bits.push(COL_LABELS[COL.rPhone]);
            if (roleFields.email) bits.push(COL_LABELS[COL.rEmail]);
            if (roleFields.partnerId) bits.push(COL_LABELS[COL.partner]);
        }
        if (assign) bits.push('שיבוץ');
        if (assignExists) bits.push('השיבוץ כבר קיים');
        const isUpdate = !!personId || !!roleId;
        // a brand-new person with no role will not appear in the phone book (it lists assignments)
        const noRole = newPerson && !p.role;
        const joined = bits.join(' + ');
        // An update names what changed (תפקיד חדש, the phone label, the email label). A brand-new row stays ✓ מוכן.
        let label = isUpdate ? (joined ? `✓ ${joined}` : '✓ עדכון') : '✓ מוכן';
        let detailText = joined;
        if (noRole) {
            label = '✓ מוכן · ללא תפקיד';
            detailText += ' · ללא תפקיד, ולכן לא יופיע בספר הטלפונים (אפשר להוסיף תפקיד בעמודה ד)';
        }
        if (notes.length) {
            label += ` · ⚠ ${notes[0].short}${notes.length > 1 ? ` (+${notes.length - 1})` : ''}`;
            const noteText = notes.map((x) => x.msg).join(' · ');
            detailText = detailText ? `${detailText} · ${noteText}` : noteText;
        }
        return {state: isUpdate ? 'update' : 'new', label, detail: detailText, cellTips: tips, dupCols, plan, noRole};
    });
}

export function chunk<T>(arr: T[], n: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
}
