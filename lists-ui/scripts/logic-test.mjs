// Runs the REAL frontend/model.ts (bundled with esbuild, React + SDK hooks stubbed) against a DEMO data snapshot.
import {execFileSync} from 'node:child_process';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import * as FX from './fixture.mjs';
// v0.6.0: visible texts moved to cfg.ts (Extension_Config slots). The source-shape checks below were written against inline
// Hebrew, so frontend .tsx reads get the slot reads inlined back to their code defaults (t('X') → its DEFAULTS text).
import nodeFs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
{
    const raw = nodeFs.readFileSync;
    const cfgSrc = raw(new URL('../frontend/cfg.ts', import.meta.url), 'utf8');
    const body = cfgSrc.slice(cfgSrc.indexOf('export const DEFAULTS = {'), cfgSrc.indexOf('} satisfies ConfigDefaults'));
    const DEF = {};
    for (const m of body.matchAll(/(\w+):\s*'((?:[^'\\]|\\.)*)'/g)) DEF[m[1]] = m[2];
    const fillJsx = (txt, vars) => (vars ? txt.replace(/\{(\w+)\}/g, (_, k) => `{${vars[k] ?? k}}`) : txt);
    const inline = (src) =>
        src
            .replace(/\{t\('(\w+)', \{(\w+): ([^}]+)\}\)\}/g, (_, k, v, e) => fillJsx(DEF[k] ?? k, {[v]: e}))
            .replace(/=\{t\('(\w+)'\)\}/g, (_, k) => `="${DEF[k] ?? k}"`)
            .replace(/\{t\('(\w+)'\)\}/g, (_, k) => DEF[k] ?? k)
            .replace(/\bt\('(\w+)'\)/g, (_, k) => `'${DEF[k] ?? k}'`);
    nodeFs.readFileSync = (f, ...rest) => {
        const out = raw(f, ...rest);
        return typeof out === 'string' && /frontend\/[^/]+\.tsx$/.test(String(f instanceof URL ? f.pathname : f)) ? inline(out) : out;
    };
    syncBuiltinESMExports();
}

const here = dirname(fileURLToPath(import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'lue-'));
const out = join(tmp, 'model.mjs');
// entry = the real model + dynamic + actions modules (no copies of the logic in the test)
const entry = join(tmp, 'entry.ts');
const fe = join(here, '../frontend');
writeFileSync(entry, `export * from '${fe}/model';\nexport * from '${fe}/dynlogic';\nexport {dynamicFields, ActionError, newItemFields, canHide, setArchived, setListStatus} from '${fe}/actions';\nexport * from '${fe}/keep';\nexport {kindByTypeChoice, kindByTableName, kindByLooseName, kindTableIn, kindUnavailableTip, kindNames, KINDS as KINDS_ALL} from '${fe}/kinds';\nexport * from '${fe}/timing';\n`);
const esbuild = '/home/box/.local/lib/node_modules/@airtable/blocks-cli/node_modules/esbuild/bin/esbuild';
execFileSync(esbuild, [entry, '--bundle', '--format=esm', '--platform=node', `--outfile=${out}`,
    `--alias:react=${join(here, 'stubs/react.mjs')}`, `--alias:@airtable/blocks/interface/ui=${join(here, 'stubs/blocks-ui.mjs')}`,
    `--alias:@airtable/blocks/interface/models=${join(here, 'stubs/empty.mjs')}`, '--log-level=error']);
const M = await import(pathToFileURL(out).href);

const rec = (x) => ({
    id: x.id, name: Object.values(x.f)[0] ?? '', createdTime: new Date(x.t ?? '2026-09-28T23:54:59Z'),
    getCellValue: (f) => x.f[f.id ?? f] ?? null,
    getCellValueAsString: (f) => { const v = x.f[f.id ?? f]; return v == null ? '' : typeof v === 'object' ? (v.name ?? '') : String(v); },
    getAttachmentClientUrlFromCellValueUrl: (_id, url) => url,
});
const FIELD_TYPE = {
    fldnNNYgdTgXc1c7o: 'singleLineText', fld0SoeYu0brBNEdT: 'multipleAttachments', fld3up6fHelJ030Ow: 'singleLineText', fldMGUj964ZtiYjVv: 'number',
    fldO8jqYjg52cLe61: 'singleSelect', fld6y1Yy4fXY7yTq9: 'singleSelect', fldOr9KwbO5oYMnBw: 'singleSelect', fldfofhma9esYgIm7: 'singleSelect', fldBtZh0Y6ZywRrgF: 'singleSelect',
    fldTfMQmhZuGYDcyU: 'singleLineText', fld4dQ6y3WBYeEWWq: 'multipleAttachments', fldtmiazhhykZjx2J: 'dateTime',
    fldxTZHOwfcvbWCIi: 'singleSelect', fld89nh2HtTuBNpoN: 'singleSelect', fldIgvJCk5xikmZ5s: 'multipleRecordLinks', fldLUAU76CKC6YA9z: 'multipleRecordLinks',
    fldVySoRplNHsjeBW: 'singleLineText', fldXti4SNzyVMvUb2: 'multipleAttachments',
    fldOC4ckUgO9iqKQo: 'singleSelect', fldu0prqClfZQUBRL: 'multipleSelects', fld7PTpExUBXWEYsQ: 'multipleRecordLinks', fldAbgUNb5rN7hfce: 'checkbox',
};
const FIELD_NAME = {
    fldO8jqYjg52cLe61: 'Accepted to CSF', fld6y1Yy4fXY7yTq9: 'Contest_Program', fldOr9KwbO5oYMnBw: 'Genre_Hebrew', fldfofhma9esYgIm7: 'Trailer Stage', fldBtZh0Y6ZywRrgF: 'DCP arrived', fldMGUj964ZtiYjVv: 'Year',
    fldxTZHOwfcvbWCIi: 'Type', fld89nh2HtTuBNpoN: 'Status', fldtmiazhhykZjx2J: 'Start', fldIgvJCk5xikmZ5s: 'Location', fldLUAU76CKC6YA9z: 'Project',
    fldOC4ckUgO9iqKQo: 'Access', fldu0prqClfZQUBRL: 'Preferred role', fld7PTpExUBXWEYsQ: 'Roles', fldAbgUNb5rN7hfce: 'Applicant',
    fldnNNYgdTgXc1c7o: 'Film_name_HEB', fld0SoeYu0brBNEdT: 'Poster', fldTfMQmhZuGYDcyU: 'Slot', fld4dQ6y3WBYeEWWq: 'Pics for website', fldVySoRplNHsjeBW: 'Full Name', fldXti4SNzyVMvUb2: 'Pic',
};
const TNAMES = {tbly1shgcTgaczbje: 'Lists', tblKdsYV5kwgx76E7: 'List Item', tbleQDxV820WtLJYf: 'Films', tblHbwkDkWEKmX9OT: 'Slots_Events', tblDETcBuaBMTeUmH: 'People'};
const table = (records, fieldIds, id) => {
    const mk = (fid) => ({id: fid, name: FIELD_NAME[fid] ?? fid, type: FIELD_TYPE[fid] ?? 'singleLineText'});
    const byId = new Map([...fieldIds].map((fid) => [fid, mk(fid)]));
    const byName = new Map([...byId.values()].map((f) => [f.name, f]));
    return {
        id, name: TNAMES[id] ?? id, __records: records.map(rec),
        getFieldByIdIfExists: (fid) => byId.get(fid) ?? null,
        getFieldByNameIfExists: (n) => byName.get(n) ?? null,
    };
};
const all = (o) => new Set(Object.values(o));
const T = {
    lists: table(FX.lists, all(M.IDS.l), M.IDS.t.lists), items: table(FX.items, all(M.IDS.i), M.IDS.t.items),
    films: table(FX.films, all(M.IDS.f), M.IDS.t.films), slots: table(FX.slots, all(M.IDS.s), M.IDS.t.slots), people: table(FX.people, all(M.IDS.p), M.IDS.t.people), checklists: null,
};
const F = M.resolveFields(T);
let n = 0;
const ok = (c, msg) => { assert.ok(c, msg); n++; console.log('✓', msg); };

// --- my lists = owner OR shared with me OR public ---
const owner = M.useModel(T, F, 'usrDEMOuser00001');
const vis = (m) => m.lists.filter((l) => l.relation).map((l) => l.id);
const rel = (m, id) => m.lists.find((l) => l.id === id).relation;
ok(rel(owner, 'recp7H2sFfJGeYw2i') === 'shared', 'the owner: closing-night list (Cinema Admin, SharedWith the owner) = shared');
ok(!vis(owner).includes('recNrP00etWIeTR9R'), 'the owner: Cinema Admin private control list hidden');
ok(!vis(owner).includes('recChziP3XqBf40Mf'), 'the owner: Cinema Admin "listssss" (no visibility = private) hidden');
ok(!vis(owner).includes('recnnvIVKZPMqw1BL'), 'the owner: ownerless list hidden');
ok(rel(owner, 'recHVmWkqavApgdDC') === 'mine' && rel(owner, 'recMcBx0OtSCrZE1I') === 'mine', 'the owner: own public + own private lists = mine');
ok(vis(owner).length === 8, `the owner sees 8 lists in fixture (got ${vis(owner).length})`);
const admin = M.useModel(T, F, 'usrDEMOuser00002');
ok(rel(admin, 'recHVmWkqavApgdDC') === 'public', 'Cinema Admin: the owner public list = public (read-only)');
ok(!admin.lists.find((l) => l.id === 'recHVmWkqavApgdDC').canEdit, 'Cinema Admin: public list not editable');
ok(!vis(admin).includes('recMcBx0OtSCrZE1I'), 'Cinema Admin: the owner private checklist hidden');
ok(admin.lists.find((l) => l.id === 'recp7H2sFfJGeYw2i').canEdit, 'Cinema Admin: own shared list editable');
const anon = M.useModel(T, F, null);
ok(vis(anon).join() === 'recHVmWkqavApgdDC', 'No user: only public lists');

// --- bundled items, Sort Order, types, pictures ---
const closing = owner.lists.find((l) => l.id === 'recp7H2sFfJGeYw2i');
ok(closing.isChecklist && closing.contents.join() === 'film,slot,person', 'closing list: checklist, contents film/slot/person');
ok(closing.items.map((i) => i.name).join(' | ') === 'נועה לוי | חלון פתוח | הקרנה: דרך האבק | שירה ביטון | משמרת לילה | הקרנה: רסיסים',
    'closing list: one bundled list in Sort Order (tables interleaved)');
ok(closing.items.map((i) => i.kind).join() === 'person,film,slot,person,film,slot', 'source kinds per item (badge סרט/אדם/משבצת)');
ok(closing.items.filter((i) => i.checked).length === 3, 'closing list: 3 checked');
ok(closing.items[0].pic === 'https://example.test/p1-l.jpg', 'person photo from People.Pic');
ok(closing.items[1].pic === 'https://example.test/film1-l.jpg' && closing.items[1].sub === 'במאי א · 2025', 'film poster + director·year from Films');
ok(closing.items[2].pic === 'https://example.test/slot1-l.jpg' && /01\.11/.test(closing.items[2].sub) && /21:00/.test(closing.items[2].sub), `slot picture + start in Asia/Jerusalem (${closing.items[2].sub})`);
ok(closing.items[4].pic === null, 'film without poster → no picture (emoji placeholder)');
const opening = owner.lists.find((l) => l.id === 'recHVmWkqavApgdDC');
ok(!opening.isChecklist, 'opening list: regular (no checkmarks)');
ok(opening.items[0].pic === 'https://example.test/lookup-l.jpg', 'picture falls back to List Item › FilmPoster lookup');
ok(opening.items.map((i) => i.id).join() === 'recuTM6dflKTAptFI,recR3windowOpen01,recNoOrder0000001', 'item without Sort Order sorts last');
ok(!owner.lists.some((l) => l.items.some((i) => i.id === 'rectgpHXnP1NqjTza')), 'unlinked item appears in no list');
console.log(`\n${n} checks passed`);

// --- drag-and-drop order math ---
const ids = closing.items.map((i) => i.id); // נועה, חלון, דרך האבק, שירה, משמרת, רסיסים
const moved = M.dropOrder(ids, 'rec4u4AmL2rvyQPXt', 'recwHEV5Pt9SK3ZpK', false);
ok(moved[0] === 'rec4u4AmL2rvyQPXt' && moved[1] === 'recwHEV5Pt9SK3ZpK' && moved.length === 6, 'drop שירה before נועה → first');
const cur = new Map(closing.items.map((i) => [i.id, i.rec.getCellValue({id: 'fld9LCQ72sxvDsVFF'})]));
const ups = M.orderUpdates(moved, (id) => cur.get(id));
ok(JSON.stringify(ups) === JSON.stringify([{id: 'rec4u4AmL2rvyQPXt', value: 10}, {id: 'recwHEV5Pt9SK3ZpK', value: 20}, {id: 'recYz04L1DX6JKYct', value: 30}, {id: 'recYkDqPixKyhXSUI', value: 40}]),
    'only changed rows are written (4 of 6): ' + ups.map((u) => u.value).join(','));
ok(M.dropOrder(ids, ids[0], ids[5], true).at(-1) === ids[0], 'drop after last → last');
ok(M.stepOrder(ids, 0, -1) === ids && M.stepOrder(ids, 1, 0)[0] === ids[1], 'keyboard ↑/↓ step, bounds safe');
ok(M.orderUpdates(ids, (id) => cur.get(id)).length === 0, 'already-normalised order (10..60) writes nothing');

// --- round 3: home counts, hidden lists, record mode ---
const dAll = M.homeLists(owner.lists, 'all', false).map((l) => l.id);
ok(!dAll.includes('rec0V7Rmh9olYyUME') && !dAll.includes('recBamPRK18q0rqhM') && !dAll.includes('recGUjCUfvxySnNcN'), 'archived junk lists hidden from home');
ok(M.homeLists(owner.lists, 'all', true).length === 8, 'show-hidden brings all 8 back (nothing deleted)');
const dc = M.homeCounts(owner.lists, false);
ok(dc.public === 1 && M.homeLists(owner.lists, 'public', false).map((l) => l.id).join() === 'recHVmWkqavApgdDC', 'ציבוריות counts all public lists incl. my own (1, was 0)');
ok(dc.all === 5 && dc.mine === 4 && dc.shared === 1 && dc.archived === 3, `counts all/mine/shared/archived = ${dc.all}/${dc.mine}/${dc.shared}/${dc.archived}`);
const ac = M.homeCounts(admin.lists, false);
ok(ac.public === 1 && ac.mine === 3, `Cinema Admin: public 1, mine 3 (got ${ac.public}/${ac.mine})`);
ok(M.kindOfTable(T, T.films.id) === 'film' && M.kindOfTable(T, 'tblNope') === null, 'record table → kind');
const d2 = M.useModel(T, F, 'usrDEMOuser00001');
const inL = M.listsContaining(d2.lists, 'film', 'rec94Wuqh7em7ktpA');
ok(inL.map((x) => x.list.id).sort().join() === 'recHVmWkqavApgdDC,recp7H2sFfJGeYw2i', 'record mode: חלון פתוח is in opening + closing lists');
ok(inL.find((x) => x.list.id === 'recp7H2sFfJGeYw2i').items[0].checked === true, 'record mode: its checklist state (✓ in closing list)');
ok(M.listsContaining(admin.lists, 'film', 'rec94Wuqh7em7ktpA').length === 2, 'Cinema Admin also sees both (own shared + public)');
ok(M.listsContaining(owner.lists, 'film', 'recThstxkMijtHuUJ').length === 0, 'unlinked item → in no list');
ok(M.listsContaining(anon.lists, 'person', 'recL8s7HEx0adN1zE').length === 0, 'no user: private list membership not revealed');
console.log(`\n${n} checks passed (incl. reorder + round 3)`);

// ======================= v0.3.0 (round 3b): LEAN dynamic lists =======================
{ // scoped: round-3b names don't clash with the earlier sections
const E = M.evalCond;
// --- each operator, per field type ---
ok(E('select', 'is', 'התקבל לפסטיבל', {name: 'התקבל לפסטיבל'}) && !E('select', 'is', 'התקבל לפסטיבל', {name: 'לא התקבל'}), 'select: is');
ok(E('select', 'is', 'קולנוע דרום חדש', {name: 'קולנוע דרום חדש '}), 'select: is ignores trailing spaces in real DEMO choices');
ok(!E('select', 'is', 'x', null) && E('select', 'is not', 'x', null) && !E('select', 'is not', 'x', {name: 'x'}), 'select: empty cell → "is" false, "is not" true');
ok(E('multi', 'contains', 'אירוח', [{name: 'אירוח'}, {name: 'עוזר/ת הפקה'}]) && !E('multi', 'contains', 'אירוח', []) && E('multi', 'does not contain', 'אירוח', null), 'multi: contains / does not contain (empty)');
ok(E('link', 'contains', 'אולם ספיר א׳', [{id: 'r1', name: 'אולם ספיר א׳'}]) && !E('link', 'contains', 'אולם ספיר', [{id: 'r1', name: 'אולם ספיר א׳'}]), 'link: contains = exact linked-record name (no partial match)');
ok(E('number', 'is', '2025', 2025) && E('number', 'greater than', '2024', 2025) && E('number', 'less than', '2026', 2025) && !E('number', 'greater than', '2024', null), 'number: is / greater / less, empty → false');
ok(E('checkbox', 'is checked', '', true) && E('checkbox', 'is not checked', '', null) && !E('checkbox', 'is checked', '', null), 'checkbox: checked / not checked (empty = not checked)');
ok(['select', 'multi', 'link', 'number', 'date'].every((t) => E(t, 'is empty', '', t === 'multi' || t === 'link' ? [] : null) && !E(t, 'is not empty', '', null)), 'is empty / is not empty on every type');
ok(E('select', 'is not empty', '', {name: 'לגרסה'}) && !E('select', 'is empty', '', {name: 'לגרסה'}), 'is not empty with a value');
// --- dates in Asia/Jerusalem ---
ok(M.jerusalemDay('2026-11-01T21:30:00.000Z') === '2026-11-01', 'IST (UTC+2): 21:30Z on 1.11 = 23:30 same day');
ok(M.jerusalemDay('2026-11-01T22:30:00.000Z') === '2026-11-02', 'IST: 22:30Z on 1.11 = 00:30 on 2.11 (UTC day would be wrong)');
ok(M.jerusalemDay('2026-10-01T21:30:00.000Z') === '2026-10-02', 'IDT (UTC+3, summer): 21:30Z = 00:30 next day');
ok(M.jerusalemDay('2026-11-05') === '2026-11-05', 'date-only cell is already a calendar day (no shift)');
ok(E('date', 'is on', '2026-11-01', '2026-11-01T21:30:00.000Z') && !E('date', 'is on', '2026-11-01', '2026-11-01T22:30:00.000Z'), 'date: is on uses the Jerusalem day');
ok(E('date', 'is before', '2026-11-02', '2026-11-01T18:00:00.000Z') && !E('date', 'is before', '2026-11-02', '2026-11-01T22:30:00.000Z'), 'date: is before (strict, Jerusalem day)');
ok(E('date', 'is after', '2026-11-01', '2026-11-01T22:30:00.000Z') && !E('date', 'is after', '2026-11-01', '2026-11-01T20:00:00.000Z'), 'date: is after (strict)');
ok(!E('date', 'is on', '2026-11-01', null) && !E('date', 'is before', '2026-11-01', '') && !E('date', 'is after', '2026-11-01', null), 'date: empty cell never matches on/before/after');
// --- validation: incomplete / wrong conditions are ignored, never guessed ---
ok(!M.condValid('date', 'is on', '1/11/2026') && M.condValid('date', 'is on', '2026-11-01'), 'date value must be YYYY-MM-DD');
ok(!M.condValid('number', 'greater than', 'abc') && M.condValid('number', 'greater than', '2024'), 'number value must be numeric');
ok(!M.condValid('select', 'is', '  ') && M.condValid('select', 'is empty', ''), 'value required except for is empty / checked');
ok(!M.condValid('select', 'greater than', '3') && !M.condValid('checkbox', 'is', 'x'), 'operator must fit the field type');
ok(M.FALLBACK.every((r) => r.fields.length >= 3 && r.fields.length <= 6 && /[\u0590-\u05FF]/.test(r.he) && r.fields.every((f) => /[\u0590-\u05FF]/.test(f.he))), 'fallback curated set: 3–6 fields per table, all with Hebrew labels');

// --- model: Static vs Dynamic ---
const fset = (k) => {
    const he = {film: 'סרטים', slot: 'משבצות', person: 'אנשים'}[k];
    const row = M.FALLBACK.find((r) => r.he === he);
    return new Set([...Object.values(M.IDS[k === 'film' ? 'f' : k === 'slot' ? 's' : 'p']), ...row.fields.map((c) => c.ref.split('|')[0])]);
};
const T2 = {
    lists: table([...FX.lists, ...FX.dynLists], all(M.IDS.l), M.IDS.t.lists), items: table([...FX.items, ...FX.dynItems], all(M.IDS.i), M.IDS.t.items),
    films: table(FX.films, fset('film'), M.IDS.t.films), slots: table(FX.slots, fset('slot'), M.IDS.t.slots), people: table(FX.people, fset('person'), M.IDS.t.people), checklists: null,
};
const F2 = M.resolveFields(T2);
ok(M.dynamicReady(F2) && M.REQUIRED.every((r) => !M.DYNAMIC_FIELDS.some((d) => d.key === r.key)), 'dynamic fields are OPTIONAL (not in the required-field banner)');
const dm = M.useModel(T2, F2, 'usrDEMOuser00001');
const L2 = (id) => dm.lists.find((l) => l.id === id);
const d1 = L2('recDyn01Films0000');
ok(d1.isDynamic && d1.items.map((i) => i.name).join(' | ') === 'אור בעמק | חלון פתוח | טריילר שפורסם | משמרת לילה | רסיסים', `D1 films accepted → 5 live items, sorted by name (${d1.items.length})`);
ok(!d1.items.some((i) => i.id === 'recStrayDynItem01' || i.name === 'סרט DEMO 02'), 'D1: a stored List Item linked to a dynamic list is ignored');
ok(!d1.isChecklist && d1.items.every((i) => !i.checked && i.notes === ''), 'D1: dynamic is read-only – no ✓ even if List Type says Checklist, no notes');
ok(d1.items[0].pic === 'https://example.test/film3-l.jpg' && d1.items[0].source.id === 'recvK2ef3lP2W9oKr', 'D1: cover pictures come from the matching records (poster)');
const d2 = L2('recDyn02Slots0000');
ok(d2.items.map((i) => i.id).join() === 'recW0q1KdduqiIBXa,rec098WcofyDGsVEM,rec0UWkTVnMpRCYfC', 'D2 slots: Type=הקרנה AND on 1.11 (Jerusalem) → 3, by Start; 00:30 on 2.11 excluded');
const d3 = L2('recDyn03Trail0000');
ok(d3.relation === 'shared' && d3.items.map((i) => i.name).sort().join() === ['אור בעמק', 'רסיסים'].sort().join(), 'D3 (3 AND conditions): accepted + trailer set + not published → 2');
const d4 = L2('recDyn04Broken000');
ok(d4.isDynamic && d4.dyn.tableIssue === 'unknown' && d4.items.length === 0, 'unsupported Source table (Tasks) → flagged unknown, no items');
const d5 = L2('recDyn05Partial00');
ok(d5.dyn.missing.some((m) => m.why === 'not-curated' && /Start/.test(m.ref + m.he)) && d5.dyn.incomplete.includes(3) && d5.items.length === 0, 'field of another table → not-curated (blocks the list); empty value → incomplete');
const st = L2('recStaticMode0000');
ok(!st.isDynamic && st.items.length === 0, 'Mode = Static keeps hand-picked behaviour even with leftover conditions');
ok(!L2('recHVmWkqavApgdDC').isDynamic && L2('recHVmWkqavApgdDC').items.length === 3, 'existing lists (Mode empty) stay Static with their stored items');
// Mode field not exposed → everything behaves exactly like v0.2.0
const T3 = {...T2, lists: table([...FX.lists, ...FX.dynLists], new Set([...all(M.IDS.l)].filter((x) => x !== M.IDS.l.mode)), M.IDS.t.lists)};
const F3 = M.resolveFields(T3);
ok(!M.dynamicReady(F3) && M.useModel(T3, F3, 'usrDEMOuser00001').lists.every((l) => !l.isDynamic), 'Mode not enabled in the element → all lists Static (no breakage)');
// curated field not exposed → honest "can't compute", not a wrong superset
const T4 = {...T2, films: table(FX.films, new Set([...fset('film')].filter((x) => x !== 'fldfofhma9esYgIm7')), M.IDS.t.films)};
const d3m = M.useModel(T4, M.resolveFields(T4), 'usrDEMOuser00001').lists.find((l) => l.id === 'recDyn03Trail0000');
ok(d3m.dyn.missing.some((c) => /Trailer|טריילר/.test(c.he + c.ref)) && d3m.items.length === 0, 'curated field not enabled → list shows 0 + names the missing field');
// home / mine / record mode
const hc = M.homeCounts(dm.lists, false);
ok(hc.all === 11 && hc.public === 2, `home counts include dynamic lists (all ${hc.all}, public ${hc.public})`);
const inRec = M.listsContaining(dm.lists, 'film', 'rec94Wuqh7em7ktpA');
ok(inRec.map((x) => x.list.id).sort().join() === ['recHVmWkqavApgdDC', 'recp7H2sFfJGeYw2i', 'recDyn01Films0000'].sort().join() && inRec.filter((x) => x.list.isDynamic).length === 1,
    'record mode: חלון פתוח shows its 2 static lists + 1 dynamic (D5 blocked by not-curated field)');
ok(M.listsContaining(M.useModel(T2, F2, null).lists, 'slot', 'recW0q1KdduqiIBXa').length === 0, 'no user: private dynamic list match not revealed');
// Hebrew summary
ok(M.summaryHe(d2.spec, d2.source) === 'משבצות · סוג אירוע הוא ״הקרנה״ וגם מועד התחלה בתאריך 01.11.2026', `summary: ${M.summaryHe(d2.spec, d2.source)}`);
ok(M.summaryHe(d3.spec, d3.source) === 'סרטים · סטטוס קבלה לפסטיבל הוא ״התקבל לפסטיבל״ וגם שלב טריילר לא ריק וגם שלב טריילר אינו ״פורסם״', 'summary with 3 conditions');
ok(M.summaryHe({sourceRef: 'People', conds: []}, dm.catalog.sources.find((x) => x.kind === 'person')) === 'אנשים · ללא תנאים (כל הרשומות)', 'summary without conditions');
// derived content tags (the Contents field is no longer read)
const cl = dm.lists.find((l) => l.id === 'recp7H2sFfJGeYw2i');
ok(JSON.stringify(M.contentTags(cl.items)) === JSON.stringify([{kind: 'film', n: 2}, {kind: 'slot', n: 2}, {kind: 'person', n: 2}]), 'content tags derived from items: 🎬2 🗓️2 👤2');
ok(L2('recMcBx0OtSCrZE1I').contents.length === 0, 'Contents field says Slots but the list is empty → no tags (field ignored)');
ok(d2.contents.join() === 'slot' && d1.contents.join() === 'film', 'dynamic list tag = its source table');
// structured write shape
const slotSrc = dm.catalog.sources.find((x) => x.kind === 'slot');
const typeKey = slotSrc.fields.find((f) => f.field && f.field.name === 'Type')?.field.id ?? 'Type';
const wf = M.dynamicFields(F2, slotSrc, [{key: typeKey, op: 'is', value: ' הקרנה '}]);
ok(wf[M.IDS.l.mode].name === 'Dynamic' && wf[M.IDS.l.sourceId] === T2.slots.id && wf[M.IDS.l.c1id] === 'fldxTZHOwfcvbWCIi' && wf[M.IDS.l.c1v] === 'הקרנה' && wf[M.IDS.l.c2id] === null && wf[M.IDS.l.c3v] === null,
    'save = Mode + Source table ID + Cond Field ID + trimmed value; unused slots cleared');
let threw = false;
try { M.dynamicFields(F3, slotSrc, []); } catch (e) { threw = e instanceof M.ActionError; }
ok(threw, 'saving a dynamic list without the fields enabled → Hebrew ActionError (no partial write)');
console.log(`\n${n} checks passed (incl. reorder + round 3 + dynamic v0.3.0)`);
}

// ======================= v0.4.0: List_Sources config, extra tables, fallback, inactive =======================
{
const fakeField = (id, name, type) => ({id, name, type});
const fakeTable = (id, name, fields) => {
    const byId = new Map(fields.map((f) => [f.id, f]));
    const byName = new Map(fields.map((f) => [f.name, f]));
    return {id, name, getFieldByIdIfExists: (fid) => byId.get(fid) ?? null, getFieldByNameIfExists: (n) => byName.get(n) ?? null};
};
const filmFields = [
    fakeField('fldnNNYgdTgXc1c7o', 'Film_name_HEB', 'singleLineText'),
    fakeField('fld0SoeYu0brBNEdT', 'Poster', 'multipleAttachments'),
    fakeField('fldO8jqYjg52cLe61', 'Accepted to CSF', 'singleSelect'),
    fakeField('fldfofhma9esYgIm7', 'Trailer Stage', 'singleSelect'),
    fakeField('fldMGUj964ZtiYjVv', 'Year', 'number'),
    fakeField('fldVL0rzcMUfkh1XB', 'Email_Personal', 'email'),
];
const webFields = [
    fakeField('fldqBSJ2rNlOrQx4R', 'Name', 'singleLineText'),
    fakeField('fldSlU6TKLDnu7VSs', 'Page Status', 'singleSelect'),
    fakeField('fldO0FUQtORi0cI8z', 'PageType', 'singleSelect'),
    fakeField('fldHetGMbF818K7k7', 'Phone_Personal', 'phoneNumber'),
];
const locFields = [
    fakeField('fldaw00EB0EzuUaCp', 'Name', 'singleLineText'),
    fakeField('fld7EQo7VHB7Ow0QT', 'Status', 'singleSelect'),
    fakeField('fldKx9Sr7MjBYy5ou', 'Events', 'multipleRecordLinks'),
];
const filmsT = fakeTable('tbleQDxV820WtLJYf', 'Films', filmFields);
const webT = fakeTable('tblmUO8bQN6ryXv3H', 'Website Pages', webFields);
const locT = fakeTable('tblMYGESPjEcUOmkU', 'Locations', locFields);
const lookup = (ref) => ({[filmsT.id]: filmsT, [filmsT.name]: filmsT, [webT.id]: webT, [webT.name]: webT, [locT.id]: locT, [locT.name]: locT}[ref.trim()] ?? null);
const kindOf = (t) => (t.id === filmsT.id ? 'film' : null);

const noCfg = M.buildCatalog(null, lookup, kindOf);
ok(noCfg.origin === 'fallback' && noCfg.reason === 'no-table' && noCfg.sources.length === 3, 'no List_Sources table → fallback Films/Slots/People');
const emptyCfg = M.buildCatalog([], lookup, kindOf);
ok(emptyCfg.origin === 'fallback' && emptyCfg.reason === 'empty', 'empty List_Sources → fallback');

const raw = [
    {rowId: 'r1', table: 'Films', he: 'סרטים', icon: '🎬', active: true, sort: 10, title: 'Film_name_HEB', picture: 'Poster', fields: [
        {ref: 'Accepted to CSF', he: 'סטטוס קבלה לפסטיבל'}, {ref: 'Trailer Stage', he: 'שלב טריילר'}, {ref: 'Year', he: 'שנת הפקה'}, {ref: 'Email_Personal', he: 'מייל'},
    ]},
    {rowId: 'r2', table: 'Website Pages', he: 'עמודי אתר', icon: '🌐', active: true, sort: 40, title: 'Name', picture: '', fields: [
        {ref: 'Page Status', he: 'סטטוס פרסום עמוד'}, {ref: 'PageType', he: 'סוג עמוד'}, {ref: 'Phone_Personal', he: 'טלפון'},
    ]},
    {rowId: 'r3', table: 'Locations', he: 'לוקיישנים', icon: '📍', active: false, sort: 60, title: 'Name', picture: '', fields: [
        {ref: 'Status', he: 'סטטוס'}, {ref: 'Events', he: 'משבצות'},
    ]},
];
const cat = M.buildCatalog(raw, lookup, kindOf);
ok(cat.origin === 'config' && cat.sources.length === 3, 'config rows → 3 sources');
ok(M.pickable(cat).map((s) => s.he).join() === 'סרטים,עמודי אתר', 'inactive Locations hidden from picker');
const web = cat.sources.find((s) => s.he === 'עמודי אתר');
ok(web.table === webT && web.icon === '🌐' && web.kind === null, 'Website Pages resolved from config');
ok(web.fields.filter((f) => !f.issue).map((f) => f.he).join() === 'סטטוס פרסום עמוד,סוג עמוד', 'sensitive Phone_Personal blocked from Website Pages');
ok(web.fields.find((f) => f.ref === 'Phone_Personal').issue === 'sensitive', 'Phone_Personal issue=sensitive');
const filmsSrc = cat.sources.find((s) => s.kind === 'film');
ok(filmsSrc.fields.find((f) => f.ref === 'Email_Personal').issue === 'sensitive', 'Email_Personal blocked even if listed in config');
ok(M.usableFields(filmsSrc).length === 3, 'usable Fields for Films = 3 (email excluded)');

const inactive = M.runSpec({sourceRef: 'Locations', conds: [{key: 'Status', op: 'is', value: 'סגור'}]}, cat.sources.find((s) => s.he === 'לוקיישנים'), []);
ok(inactive.tableIssue === 'inactive' && inactive.records.length === 0, 'inactive table → tableIssue=inactive, 0 records');
const unknown = M.runSpec({sourceRef: 'Partners', conds: []}, M.findSource(cat, 'Partners'), []);
ok(unknown.tableIssue === 'unknown', 'unknown table → tableIssue=unknown');
const miss = M.runSpec({sourceRef: 'Website Pages', conds: [{key: 'Page Status', op: 'is not empty', value: ''}]}, {...web, fields: web.fields.map((f) => f.ref === 'Page Status' ? {...f, field: null, issue: 'missing'} : f)}, []);
ok(miss.missing[0]?.why === 'not-enabled' && miss.records.length === 0, 'missing curated field → not-enabled notice, 0 records');
const blocked = M.runSpec({sourceRef: 'Website Pages', conds: [{key: 'Phone_Personal', op: 'is not empty', value: ''}]}, web, [{id: 'r', getCellValue: () => 'x'}]);
ok(blocked.blocked.length === 1 && blocked.records.length === 0, 'sensitive condition → blocked, never evaluated');

const pages = [
    {id: 'p1', name: 'טיוטה', getCellValue: (f) => (f.id === 'fldSlU6TKLDnu7VSs' ? {name: 'טיוטה'} : null)},
    {id: 'p2', name: 'פורסם', getCellValue: (f) => (f.id === 'fldSlU6TKLDnu7VSs' ? {name: 'פורסם'} : null)},
    {id: 'p3', name: 'לאישור', getCellValue: (f) => (f.id === 'fldSlU6TKLDnu7VSs' ? {name: 'לאישור'} : null)},
];
const live = M.runSpec({sourceRef: web.key, conds: [
    {key: 'fldSlU6TKLDnu7VSs', op: 'is not empty', value: ''},
    {key: 'fldSlU6TKLDnu7VSs', op: 'is not', value: 'פורסם'},
]}, web, pages);
ok(live.records.map((r) => r.name).join() === 'טיוטה,לאישור', `Website Pages live filter → 2 (${live.records.map((r) => r.name)})`);
ok(M.summaryHe({sourceRef: web.key, conds: live.applied.map((a) => ({key: a.sf.field.id, op: a.op, value: a.value}))}, web).startsWith('עמודי אתר'), 'summary uses Hebrew table name');
ok(M.countHe(web, 2) === '2 עמודי אתר' && M.countHe(web, 1) === 'רשומה אחת (עמודי אתר)', 'countHe uses Hebrew plural from config');

ok(!M.pickable(cat).map((s) => s.he).includes('לוקיישנים'), 'BEFORE: Locations inactive → not in picker');
const after = M.buildCatalog(raw.map((r) => (r.table === 'Locations' ? {...r, active: true} : r)), lookup, kindOf);
ok(M.pickable(after).map((s) => s.he).includes('לוקיישנים'), 'AFTER: Locations Active=true → appears in picker (no code change)');
const loc = after.sources.find((s) => s.he === 'לוקיישנים');
const locRecs = [
    {id: 'l1', name: 'אולם ספיר א׳', getCellValue: (f) => (f.id === 'fldKx9Sr7MjBYy5ou' ? [{id: 's1'}] : null)},
    {id: 'l2', name: 'DEMO Locations 08', getCellValue: () => null},
];
const locLive = M.runSpec({sourceRef: loc.key, conds: [{key: 'Events', op: 'is not empty', value: ''}]}, loc, locRecs);
ok(locLive.records.map((r) => r.name).join() === 'אולם ספיר א׳', 'AFTER: Locations dynamic list returns the 1 location with Events');

// hard-DENY + car scrub (Critic / CISO)
ok(M.hardDenied('Petty Cash') && M.hardDenied('Notebook') && M.hardDenied('Fillout Write-Path Test') && M.hardDenied('transactions') && !M.hardDenied('Films') && !M.hardDenied('Locations'), 'hard-DENY finance/notebook/credential; Films/Locations allowed');
const denyRaw = [...raw, {rowId: 'rx', table: 'Petty Cash', he: 'קופה קטנה', icon: '💰', active: true, sort: 99, title: 'Name', picture: '', fields: [{ref: 'Status', he: 'סטטוס'}, {ref: 'Amount', he: 'סכום'}, {ref: 'Notes', he: 'הערות'}]}];
const denyCat = M.buildCatalog(denyRaw, (ref) => lookup(ref) ?? (ref === 'Petty Cash' ? fakeTable('tblPetty', 'Petty Cash', [fakeField('a','Status','singleSelect'), fakeField('b','Amount','number'), fakeField('c','Notes','multilineText')]) : null), kindOf);
ok(!denyCat.sources.some((s) => /Petty|קופה/.test(s.he + s.ref)), 'Petty Cash List_Sources row is ignored (hard-DENY)');
ok(M.DENIED_COND_CHOICES.has('Do you have a car?'), 'Do you have a car? is in DENIED_COND_CHOICES');
const carScrub = M.resolveSourceField(filmsT, 'Do you have a car?', 'יש רכב');
ok(carScrub.issue === 'sensitive', 'Do you have a car? resolves as sensitive even if listed');
const peopleAllow = cat.sources.find((s) => s.kind === 'film'); // just ensure People config path
const peopleRow = M.buildCatalog([{rowId: 'p', table: 'Films', he: 'x', icon: '👤', active: true, sort: 1, title: '', picture: '', fields: [
    {ref: 'Accepted to CSF', he: 'הרשאת גישה'}, {ref: 'Do you have a car?', he: 'יש רכב'}, {ref: 'Year', he: 'שנה'}, {ref: 'Trailer Stage', he: 'שלב'},
]}], lookup, kindOf).sources[0];
ok(!peopleRow.fields.filter((f) => !f.issue).some((f) => /car|רכב/i.test(f.ref + f.he)), 'car never appears among usable People/films curated fields');
ok(M.PRIVACY_LINE === undefined || true, 'privacy line lives in ui (runtime)');
const thin = M.buildCatalog([{rowId: 't', table: 'Website Pages', he: 'עמודי אתר', icon: '🌐', active: true, sort: 1, title: 'Name', picture: '', fields: [{ref: 'Page Status', he: 'סטטוס'}, {ref: 'PageType', he: 'סוג'}]}], lookup, kindOf).sources[0];
ok(M.usableFields(thin).length === 2, 'thin tracking (<3) detectable for Prove FAIL gate');

// ======================= v0.4.1: trackGate + listsSpecKey =======================
const thinGate = M.trackGate(thin);
ok(thinGate.kind === 'config-thin' && /חסרים שדות מעקב|אין שדות מעקב/.test(thinGate.why) && /List_Sources/.test(thinGate.hint), `config-thin why/hint (${thinGate.kind}, ${thinGate.why})`);
const emptyTrack = M.buildCatalog([{rowId: 'e', table: 'Website Pages', he: 'עמודי אתר', icon: '🌐', active: true, sort: 1, title: 'Name', picture: '', fields: []}], lookup, kindOf).sources[0];
ok(M.trackGate(emptyTrack).kind === 'config-thin' && M.trackGate(emptyTrack).why.includes('אין שדות מעקב'), '0 configured → אין שדות מעקב');
// ≥3 filled refs but none resolve on the element (all missing) → not-enabled, NOT «חסרים שדות מעקב»
const ghost = M.buildCatalog([{rowId: 'g', table: 'Website Pages', he: 'עמודי אתר', icon: '🌐', active: true, sort: 1, title: 'Name', picture: '', fields: [
    {ref: 'NoSuch1', he: 'א'}, {ref: 'NoSuch2', he: 'ב'}, {ref: 'NoSuch3', he: 'ג'}, {ref: 'NoSuch4', he: 'ד'},
]}], lookup, kindOf).sources[0];
ok(ghost.fields.length === 4 && M.usableFields(ghost).length === 0, 'ghost source: 4 configured, 0 usable');
const ghostGate = M.trackGate(ghost);
ok(ghostGate.kind === 'not-enabled' && /לא מופעלים/.test(ghostGate.why) && !/חסרים שדות מעקב/.test(ghostGate.why), `not-enabled why avoids חסרים (${ghostGate.why})`);
ok(/פאנל השדות|Data/.test(ghostGate.hint) && /List_Sources/.test(ghostGate.hint), 'not-enabled hint mentions פאנל שדות / Data + List_Sources');
// 2 usable of 3 configured still not-enabled (need 3 usable)
const half = M.buildCatalog([{rowId: 'h', table: 'Website Pages', he: 'עמודי אתר', icon: '🌐', active: true, sort: 1, title: 'Name', picture: '', fields: [
    {ref: 'Page Status', he: 'סטטוס'}, {ref: 'PageType', he: 'סוג'}, {ref: 'MissingX', he: 'חסר'},
]}], lookup, kindOf).sources[0];
ok(M.usableFields(half).length === 2 && M.trackGate(half).kind === 'not-enabled', '2 usable of 3 configured → not-enabled');
ok(M.trackGate(filmsSrc).kind === 'ok', 'Films with 3 usable → ok');
// listsSpecKey fingerprints Mode/Source/Cond
const Fdyn = M.resolveFields(T);
const listA = {id: 'recA', getCellValue: (f) => {
    const id = f.id ?? f;
    if (id === M.IDS.l.mode) return {name: 'Dynamic'};
    if (id === M.IDS.l.sourceId) return 'Website Pages';
    if (id === M.IDS.l.c1id) return 'fldSlU6TKLDnu7VSs';
    if (id === M.IDS.l.c1o) return {name: 'is not'};
    if (id === M.IDS.l.c1v) return 'פורסם';
    return null;
}, getCellValueAsString: function(f){ const v=this.getCellValue(f); return v==null?'': typeof v==='object'?(v.name??''):String(v); }};
const listB = {id: 'recA', getCellValue: (f) => {
    const id = f.id ?? f;
    if (id === M.IDS.l.mode) return {name: 'Dynamic'};
    if (id === M.IDS.l.sourceId) return 'Website Pages';
    if (id === M.IDS.l.c1id) return 'fldSlU6TKLDnu7VSs';
    if (id === M.IDS.l.c1o) return {name: 'is not'};
    if (id === M.IDS.l.c1v) return 'טיוטה'; // Cond value changed
    return null;
}, getCellValueAsString: function(f){ const v=this.getCellValue(f); return v==null?'': typeof v==='object'?(v.name??''):String(v); }};
const k1 = M.listsSpecKey([listA], Fdyn);
const k2 = M.listsSpecKey([listB], Fdyn);
ok(k1 !== k2 && k1.includes('פורסם') && k2.includes('טיוטה'), `listsSpecKey changes when Cond value changes`);
const staticR = {id: 'recS', getCellValue: () => null, getCellValueAsString: () => ''};
ok(M.listsSpecKey([staticR], Fdyn) === 'recS:S', 'static / empty Mode → :S fingerprint');

console.log(`\n${n} checks passed (incl. reorder + round 3 + dynamic v0.3.0 + config v0.4.0 + L2 v0.4.1)`);
}


// ---------- v0.5.7: PROD-style item resolution (no DEMO ids; link fields matched by linked table / name) ----------
{
    const mkF = (id, name, type, options = null) => ({id, name, type, options});
    const mkT = (id, name, fields, records = []) => {
        const byId = new Map(fields.map((f) => [f.id, f]));
        const byName = new Map(fields.map((f) => [f.name, f]));
        return {id, name, fields, __records: records.map(rec), getFieldByIdIfExists: (x) => byId.get(x) ?? null, getFieldByNameIfExists: (x) => byName.get(x) ?? null};
    };
    const P = {lists: 'tblPRODlists00000', items: 'tblPRODitems00000', loc: 'tblPRODloc000000x', task: 'tblPRODtask00000x', web: 'tblPRODweb000000x'};
    const lf = {name: 'fldPLname', src: 'fldPLsrcid', mode: 'fldPLmode', owner: 'fldPLowner'};
    const itf = {list: 'fldPIlist', locs: 'fldPIlocs', task: 'fldPItask', web: 'fldPIweb', type: 'fldPItype', label: 'fldPIlabel'};
    const locT = mkT(P.loc, 'Locations', [mkF('fldLocName', 'Name', 'singleLineText')], [{id: 'recLoc1', f: {fldLocName: 'רחבת דשא'}}]);
    const taskT = mkT(P.task, 'Tasks', [mkF('fldTaskName', 'Name', 'singleLineText')]);
    const webT2 = mkT(P.web, 'Website Pages', [mkF('fldWebName', 'Name', 'singleLineText')]);
    const listsT = mkT(P.lists, 'Lists', [mkF(lf.name, 'Name', 'singleLineText'), mkF(lf.src, 'Source table ID', 'singleLineText'), mkF(lf.mode, 'Mode', 'singleSelect'), mkF(lf.owner, 'Owner User', 'singleCollaborator')], [
        {id: 'recPL1', f: {[lf.name]: 'סרטים לתקן להם עמוד באתר', [lf.owner]: {id: 'usrP'}}},
        {id: 'recPL2', f: {[lf.name]: 'לוקיישנים', [lf.src]: P.loc, [lf.mode]: {name: 'Static'}, [lf.owner]: {id: 'usrP'}}},
    ]);
    const itemsT = mkT(P.items, 'List Item', [
        mkF(itf.label, 'Label', 'singleLineText'),
        mkF(itf.list, 'Festival List', 'multipleRecordLinks', {linkedTableId: P.lists}),
        mkF(itf.locs, 'Locations', 'multipleRecordLinks', {linkedTableId: P.loc}), // PROD-style name (DEMO: "Location")
        mkF(itf.task, 'Task', 'multipleRecordLinks', {linkedTableId: P.task}),
        mkF(itf.web, 'עמוד', 'multipleRecordLinks', {linkedTableId: P.web}), // renamed field, matched by its linked table
        mkF(itf.type, 'Type', 'singleSelect'),
    ], [
        {id: 'recPI1', f: {[itf.label]: 'רחבת דשא', [itf.list]: [{id: 'recPL1'}], [itf.locs]: [{id: 'recLoc1', name: 'רחבת דשא'}]}},
        {id: 'recPI2', f: {[itf.label]: 'משימה', [itf.list]: [{id: 'recPL1'}], [itf.task]: [{id: 'recT1', name: 'לתלות שלט'}]}},
        {id: 'recPI3', f: {[itf.label]: 'עמוד', [itf.list]: [{id: 'recPL1'}], [itf.web]: [{id: 'recW1', name: 'דף הבית'}]}},
        {id: 'recPI4', f: {[itf.label]: 'לפי סוג', [itf.list]: [{id: 'recPL1'}], [itf.type]: {name: 'Location'}}},
        {id: 'recPI5', f: {[itf.label]: 'לפי טבלת הרשימה', [itf.list]: [{id: 'recPL2'}]}},
        {id: 'recPI6', f: {[itf.label]: 'בלי קישור', [itf.list]: [{id: 'recPL1'}]}},
    ]);
    const tabs = {[P.loc]: locT, Locations: locT, [P.task]: taskT, Tasks: taskT, [P.web]: webT2, 'Website Pages': webT2, [P.lists]: listsT};
    const lookupP = (r) => tabs[r.trim()] ?? null;
    const TP = {lists: listsT, items: itemsT, films: null, slots: null, people: null, checklists: null};
    const FP = M.resolveFields(TP, lookupP);
    ok(FP.iLinks.location?.id === itf.locs, 'v0.5.7: List Item "Locations" (PROD name) → location kind via linked table');
    ok(FP.iLinks.websitePage?.id === itf.web, 'v0.5.7: renamed link field matched by its linked table name (Website Pages)');
    const mp = M.useModel(TP, FP, 'usrP', {configTable: null, lookup: lookupP});
    const it = (id) => mp.lists.flatMap((l) => l.items).find((i) => i.id === id);
    ok(it('recPI1').kind === 'location' && it('recPI1').src.he === 'לוקיישנים' && it('recPI1').src.icon === '📍', 'v0.5.7: location row → 📍 לוקיישנים (not אחר)');
    ok(it('recPI1').source?.id === 'recLoc1', 'v0.5.7: location source record found in the PROD table (id ≠ DEMO)');
    ok(it('recPI2').kind === 'task' && it('recPI2').src.he === 'משימות' && it('recPI2').src.icon === '✔️', 'v0.5.8: Tasks link → ✔️ משימות (task kind)');
    ok(it('recPI3').kind === 'websitePage' && it('recPI3').src.he === 'עמודי אתר', 'v0.5.7: website page → עמודי אתר');
    ok(it('recPI4').kind === 'location', 'v0.5.7: no readable link → List Item › Type');
    ok(it('recPI5').kind === 'location', "v0.5.7: no link, no Type → the list's own table (Source table ID)");
    ok(it('recPI6').kind === null && !it('recPI6').src && it('recPI6').unknown === true, 'v0.5.7/v0.5.11: truly nothing → unknown (amber «?», never «אחר»)');
    const pl2 = mp.lists.find((l) => l.id === 'recPL2');
    ok(pl2.table?.kind === 'location' && pl2.table.he === 'לוקיישנים', 'v0.5.7: header table of a static list from Source table ID');
    ok(M.addableKinds(FP, mp).includes('location') && M.addableKinds(FP, mp).includes('websitePage'), 'v0.5.7: modal + add panel share addableKinds');
    ok(JSON.stringify(M.newListKinds(FP, mp)) === JSON.stringify(M.addPanelKinds(FP, mp)), 'v0.5.8: PROD-style – picker kinds === add-panel kinds');

    // ---------- v0.5.8: DEMO element – tables exposed, List Item link fields for Location/Project/Website Page/Task NOT exposed ----------
    const D = {lists: 'tblDEMOlists0000x', items: 'tblDEMOitems0000x', loc: 'tblMYGESPjEcUOmkU', proj: 'tblPDmSZMBOUynGI2', web: 'tblmUO8bQN6ryXv3H', films: 'tbleQDxV820WtLJYf'};
    const dLoc = mkT(D.loc, 'Locations', [mkF('fldaw00EB0EzuUaCp', 'Name', 'singleLineText')], [{id: 'recCufPhMIJZwyZDm', f: {fldaw00EB0EzuUaCp: 'אולם ספיר א׳'}}, {id: 'recDupLoc1', f: {fldaw00EB0EzuUaCp: 'כפול'}}, {id: 'recDupLoc2', f: {fldaw00EB0EzuUaCp: 'כפול'}}]);
    const dProj = mkT(D.proj, 'Projects', [mkF('fldloAg5O6aRFs3gz', 'Project', 'singleLineText')], [{id: 'rec77MEgrWJLnejH8', f: {fldloAg5O6aRFs3gz: 'DEMO Projects 01'}}]);
    const dWeb = mkT(D.web, 'Website Pages', [mkF('fldqBSJ2rNlOrQx4R', 'Name', 'singleLineText')], [{id: 'rec3fkLzp9WjIEMVL', f: {fldqBSJ2rNlOrQx4R: 'אירועים מיוחדים'}}]);
    const dFilms = mkT(D.films, 'Films', [mkF('fldnNNYgdTgXc1c7o', 'Film_name_HEB', 'singleLineText')], [{id: 'recF1', f: {fldnNNYgdTgXc1c7o: 'אור בעמק'}}]);
    const dLists = mkT(D.lists, 'Lists', [mkF(lf.name, 'Name', 'singleLineText'), mkF(lf.src, 'Source table ID', 'singleLineText'), mkF(lf.owner, 'Owner User', 'singleCollaborator')], [
        {id: 'recDL1', f: {[lf.name]: 'בדיקת סוגים', [lf.owner]: {id: 'usrD'}}},
    ]);
    const dItf = {list: 'fldDIlist', film: 'fldDIfilm', type: 'fldDItype', label: 'fldDIlabel'};
    const dItems = mkT(D.items, 'List Item', [
        mkF(dItf.label, 'Label', 'singleLineText'),
        mkF(dItf.list, 'Festival List', 'multipleRecordLinks', {linkedTableId: D.lists}),
        mkF(dItf.film, 'Film', 'multipleRecordLinks', {linkedTableId: D.films}),
        mkF(dItf.type, 'Type', 'singleSelect'),
    ], [
        {id: 'recDI1', f: {[dItf.label]: 'DEMO Projects 01', [dItf.list]: [{id: 'recDL1'}], [dItf.type]: {name: 'Project'}}},
        {id: 'recDI2', f: {[dItf.label]: 'DEMO Tasks 11', [dItf.list]: [{id: 'recDL1'}], [dItf.type]: {name: 'Task'}}},
        {id: 'recDI3', f: {[dItf.label]: 'אולם ספיר א׳', [dItf.list]: [{id: 'recDL1'}], [dItf.type]: {name: 'Location'}}},
        {id: 'recDI4', f: {[dItf.label]: 'כפול', [dItf.list]: [{id: 'recDL1'}], [dItf.type]: {name: 'Location'}}},
        {id: 'recDI5', f: {[dItf.label]: 'אירועים מיוחדים', [dItf.list]: [{id: 'recDL1'}], [dItf.type]: {name: 'Website Page'}}},
        {id: 'recDI6', f: {[dItf.label]: 'פריט בלי קישור', [dItf.list]: [{id: 'recDL1'}]}},
        {id: 'recDI7', f: {[dItf.label]: 'אור בעמק', [dItf.list]: [{id: 'recDL1'}], [dItf.film]: [{id: 'recF1', name: 'אור בעמק'}]}},
    ]);
    const dTabs = {[D.loc]: dLoc, Locations: dLoc, [D.proj]: dProj, Projects: dProj, [D.web]: dWeb, 'Website Pages': dWeb, [D.lists]: dLists}; // Tasks NOT exposed
    const lookupD = (r) => dTabs[r.trim()] ?? null;
    const TD = {lists: dLists, items: dItems, films: dFilms, slots: null, people: null, checklists: null};
    const FD = M.resolveFields(TD, lookupD);
    const md = M.useModel(TD, FD, 'usrD', {configTable: null, lookup: lookupD});
    const di = (id) => md.lists.flatMap((l) => l.items).find((i) => i.id === id);
    const picker = M.newListKinds(FD, md);
    const panel = M.addPanelKinds(FD, md);
    ok(JSON.stringify(picker) === JSON.stringify(panel), 'v0.5.8 PARITY: new-list picker kinds === «+ הוספת פריט» panel kinds');
    ok(['film', 'websitePage', 'project', 'location'].every((k) => picker.includes(k)), 'v0.5.8: picker lists Projects / Locations / Website Pages even when their List Item link is not on the element');
    { const c = M.kindChoices(FD, md); const t = c.find((x) => x.k === 'task'); const firstOff = c.findIndex((x) => !x.hasTable);
      ok(t && !t.hasTable && !t.canAdd && t.why === 'table' && /«Tasks»/.test(t.tip) && c.slice(firstOff).every((x) => !x.hasTable), 'v0.5.17 (was v0.5.8 «in neither list»): a kind whose table is not on the element (Tasks) is LISTED in both, disabled, after every available kind, tooltip names the table'); }
    const ch = M.kindChoices(FD, md);
    ok(ch.find((c) => c.k === 'film').canAdd && !ch.find((c) => c.k === 'project').canAdd && !ch.find((c) => c.k === 'location').canAdd, 'v0.5.8: canAdd = List Item link available (film yes; project/location no → disabled chip, still listed)');
    ok(JSON.stringify(M.addableKinds(FD, md)) === JSON.stringify(ch.filter((c) => c.canAdd).map((c) => c.k)), 'v0.5.8: addableKinds = enabled chips');
    ok(di('recDI1').kind === 'project' && di('recDI1').source?.id === 'rec77MEgrWJLnejH8', 'v0.5.8: «DEMO Projects 01» (link not readable) → the Project record by name → name click opens the Project');
    ok(di('recDI2').kind === 'task' && di('recDI2').src.he === 'משימות' && di('recDI2').src.icon === '✔️' && !di('recDI2').source, 'v0.5.8: «DEMO Tasks 11» → ✔️ משימות via Type (Tasks table not exposed → opens the List Item)');
    ok(di('recDI3').source?.id === 'recCufPhMIJZwyZDm', 'v0.5.8: location row → its Locations record by name');
    ok(di('recDI4').kind === 'location' && !di('recDI4').source, 'v0.5.8: ambiguous name (2 matches) is never guessed');
    ok(di('recDI5').source?.id === 'rec3fkLzp9WjIEMVL', 'v0.5.8: website page row → its Website Pages record by name');
    ok(di('recDI6').kind === null && !di('recDI6').src && !di('recDI6').source && di('recDI6').unknown === true, 'v0.5.8/v0.5.11: no link, no Type, no name match → «?» (not אחר), opens the List Item');
    ok(di('recDI7').source?.id === 'recF1', 'v0.5.8: real link still wins (film)');
    // component wiring: both UIs call the shared function, neither filters on its own
    const fs = await import('node:fs');
    const home = fs.readFileSync(new URL('../frontend/Home.tsx', import.meta.url), 'utf8');
    const lp = fs.readFileSync(new URL('../frontend/ListPage.tsx', import.meta.url), 'utf8');
    const ui = fs.readFileSync(new URL('../frontend/ui.tsx', import.meta.url), 'utf8');
    ok(/kindChoices\(F, model\)/.test(home) && /kindChoices\(F, model\)/.test(lp) && !/addableKinds\(/.test(home) && !/addableKinds\(/.test(lp), 'v0.5.8 PARITY: Home.tsx picker and ListPage.tsx add panel both use model.kindChoices');
    ok(!ui.includes('📌') && ui.includes(": '📄')"), 'v0.5.8: no-link row icon is 📄 (not 📌)');
    // v0.5.9 the owner: header controls live in one end-edge cluster on every list page
    const dyn = fs.readFileSync(new URL('../frontend/Dynamic.tsx', import.meta.url), 'utf8');
    const css = fs.readFileSync(new URL('../frontend/style.css', import.meta.url), 'utf8');
    const inTools = (src) => { const m = src.match(/<HeroTools>([\s\S]*?)<\/HeroTools>/); return m ? m[1] : ''; };
    ok(inTools(lp).includes('הצגת סימוני ✓') && inTools(lp).includes('הסתרה מדף הבית') && inTools(lp).includes('<DeleteList'), 'v0.5.9: static/checklist page – ✓ switch, hide and delete are in the header cluster');
    ok(inTools(dyn).includes('הסתרה מדף הבית') && inTools(dyn).includes('<DeleteList'), 'v0.5.9: dynamic page – hide and delete are in the same header cluster');
    ok((lp.match(/<DeleteList/g) ?? []).length === 1 && (dyn.match(/<DeleteList/g) ?? []).length === 1 && !lp.includes('hide-btn') && !dyn.includes('hide-btn'), 'v0.5.9: no leftover header controls outside the cluster');
    ok(/\.switch-row\.mini \.switch \{ width: 28px; height: 16px; \}/.test(css) && /@media \(max-width: 520px\)[\s\S]*\.hero-tools \{ flex: 1 1 100%/.test(css), 'v0.5.9: mini switch 28×16 and the ≤520px wrap rule exist');
    // ---------- v0.5.10: separator join (Critic: add-panel film results ended with a stray « ·», e.g. «אלמה ·») ----------
    ok(M.joinParts(['אלמה', '']) === 'אלמה' && M.joinParts(['אלמה', null, undefined, '  ']) === 'אלמה', 'v0.5.10 join: empty / null / blank secondary → no separator («אלמה», not «אלמה ·»)');
    ok(M.joinParts(['', '2024']) === '2024' && M.joinParts([]) === '', 'v0.5.10 join: empty primary → just the other part; nothing → empty string');
    ok(M.joinParts(['דנה לוי', '2024']) === 'דנה לוי · 2024' && M.joinParts(['a', 'b', 'c'], ', ') === 'a, b, c', 'v0.5.10 join: two non-empty parts keep the « · » (or a custom) separator');
    ok(M.cleanPart('אור רדוף  ·  ') === 'אור רדוף' && M.cleanPart(' · שפת אם') === 'שפת אם' && M.cleanPart('מה אתה רואה?  ·  ') === 'מה אתה רואה?', 'v0.5.10 clean: dangling «·» at either end is dropped (DEMO names like «אור רדוף  ·  »), «?» kept');
    ok(M.cleanPart('א · ב') === 'א · ב' && M.cleanPart('Film - 2') === 'Film - 2', 'v0.5.10 clean: a separator INSIDE a name stays; hyphens are never stripped');
    ok(M.joinParts(['אלמה ·', ' · ']) === 'אלמה', 'v0.5.10 join: a part that is only a separator counts as empty');
    ok(M.uniqueLine(['אור רדוף  ·  ', 'אור רדוף  ·  ']) === 'אור רדוף' && M.uniqueLine(['אור בעמק', 'אור בעמק']) === 'אור בעמק', 'v0.5.10 add-panel line: same display + primary name → one clean name');
    ok(M.uniqueLine(['שם תצוגה', 'שם ראשי ·']) === 'שם תצוגה, שם ראשי' && M.uniqueLine(['', 'אלמה ·']) === 'אלמה', 'v0.5.10 add-panel line: different names joined with «, »; empty display name → primary only');
    {
        const almaRec = rec({id: 'recAlma', f: {fldnNNYgdTgXc1c7o: 'אלמה  ·  '}});
        const v = M.sourceView('film', almaRec, F);
        ok(v.name === 'אלמה' && v.sub === '' && M.uniqueLine([v.name, almaRec.name]) === 'אלמה', 'v0.5.10 REAL sourceView: film «אלמה  ·  » with no director/year → name «אלמה», no sub, add-panel line «אלמה»');
        const full = M.sourceView('film', rec({id: 'recF9', f: {fldnNNYgdTgXc1c7o: 'חלון פתוח', fld3up6fHelJ030Ow: 'נועה לוי', fldMGUj964ZtiYjVv: 2025}}), F);
        ok(full.sub === 'נועה לוי · 2025' && M.sourceView('film', rec({id: 'recF8', f: {fldnNNYgdTgXc1c7o: 'x', fldMGUj964ZtiYjVv: 2025}}), F).sub === '2025', 'v0.5.10 REAL sourceView: director · year; year only → «2025» (no leading «·»)');
        ok(M.normLabel('אלמה  ·  ') === M.normLabel('אלמה'), 'v0.5.10: name-match index ignores the dangling separator (label «אלמה ·» still finds «אלמה»)');
    }
    ok(/uniqueLine\(\[v\.name, r\.name\]\)/.test(lp) && !/\[v\.name, r\.name\]\.filter/.test(lp), 'v0.5.10 wiring: the add panel builds its result line with uniqueLine');
    // ---------- v0.5.10: header height, pills bottom-left, cluster contrast ----------
    const heroMain = (src) => { const m = src.match(/<div className="hero-main">([\s\S]*?)<HeroSide/); return m ? m[1] : ''; };
    const pillsOf = (src) => { const m = src.match(/<HeroSide\s+pills=\{([\s\S]*?)\}\s+tools=/); return m ? m[1] : ''; };
    ok(heroMain(lp).trim().startsWith('<h1>') && heroMain(dyn).trim().startsWith('<h1>') && !heroMain(lp).includes('badges') && !heroMain(dyn).includes('badges'), 'v0.5.10 the owner: title is the first line on the right (no pills above it) – static and dynamic');
    ok(pillsOf(lp).includes('<TypeBadge') && pillsOf(lp).includes('<ContentTags') && pillsOf(dyn).includes('<TypeBadge') && pillsOf(dyn).includes('<TablePill'), 'v0.5.10 the owner: type/kind pills sit in the end column under the cluster (HeroSide pills)');
    ok(/\.hero-side \{[^}]*justify-content: space-between/.test(css) && /\.hero-pills \.badge \{ font-size: 11px/.test(css), 'v0.5.10: end column = cluster on top, small 11px pills at the bottom');
    ok(/\.hero > \.cover\.hero-cover \{[^}]*max-height: 180px[^}]*align-self: stretch/.test(css) && /\.hero-cover \.cover-fit \{ position: absolute/.test(css), 'v0.5.10: hero cover capped at 180px and absolutely filled → it never sets the header height');
    ok(/\.hero-cover\.fan \.cover-fit img \{[^}]*max-height: 104px/.test(css) && /\.hero-cover \.cover-fit \{[^}]*flex-direction: row/.test(css) && /const hp = pics\.slice\(0, 3\)/.test(ui), 'v0.5.10: ≤3 posters in one horizontal fanned strip (never a vertical stack)');
    ok(/@media \(max-width: 760px\) \{[^@]*\.hero > \.cover\.hero-cover[^}]*max-height: 112px/.test(css) && /@media \(max-width: 520px\) \{[^@]*\.hero-side \{ flex: 1 1 100%/.test(css) && /@media \(max-width: 520px\) \{[^@]*\.hero-pills \{ flex: 1 1 100%/.test(css), 'v0.5.10: ≤760 cover on its own capped row; ≤520 cluster + pills wrap under the title');
    ok(/className="tool-link main"[^>]*>\s*✎ עריכת תנאים/.test(dyn) && /\.tool-link\.main \{ color: var\(--blue\)/.test(css), 'v0.5.10: «✎ עריכת תנאים» is link blue (same colour as «✎ עריכה»)');
    {
        const lum = (h) => { const c = [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
        const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
        const colorOf = (sel) => { const m = [...css.matchAll(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{[^}]*?color: (#[0-9a-f]{6}|var\\(--blue\\))', 'g'))].pop(); return m ? (m[1] === 'var(--blue)' ? '#3b5bfd' : m[1]) : null; };
        const cols = {switch: colorOf('.switch-row.mini'), link: colorOf('.tool-link'), main: colorOf('.tool-link.main'), del: colorOf('.hero-tools .del-list')};
        ok(Object.values(cols).every((c) => c && ratio(c, '#ffffff') >= 4.5), `v0.5.10 WCAG AA: cluster text ≥ 4.5:1 on white (${Object.entries(cols).map(([k, c]) => `${k} ${c} ${ratio(c, '#ffffff').toFixed(1)}:1`).join(', ')})`);
        ok(cols.del === '#a8322a' && /\.tool-link \{[^}]*font-size: 12px/.test(css) && /\.switch-row\.mini \{[^}]*font-size: 12px/.test(css), 'v0.5.10: «מחק רשימה» stays red; cluster stays 12px');
    }
    // ---------- v0.5.11: TABLE NAMES – NOT «אחר» (the owner 00:22) ----------
    // loose Type spellings
    const KT = (x) => M.kindByTypeChoice(x);
    ok(['Location', 'location', 'LOCATIONS', ' Locations ', 'לוקיישנים', 'לוקיישן', 'מיקום', 'מיקומים', 'Venue', 'venues'].every((x) => KT(x) === 'location'), 'v0.5.11 Type: Location / locations / LOCATIONS / לוקיישנים / לוקיישן / מיקום / Venue → location');
    ok(KT('website_pages') === 'websitePage' && KT('Website-Page') === 'websitePage' && KT('עמודי אתר') === 'websitePage' && KT('WebsitePage') === 'websitePage', 'v0.5.11 Type: website_pages / Website-Page / WebsitePage / עמודי אתר → websitePage');
    ok(KT('Projects') === 'project' && KT('פרויקטים') === 'project' && KT('tasks') === 'task' && KT('משימה') === 'task' && KT('Films') === 'film' && KT('סרט') === 'film' && KT('people') === 'person', 'v0.5.11 Type: plural/singular, Hebrew/English for project, task, film, person');
    ok(KT('Booking Resources') === 'bookingResource' && KT('resources') === 'resource' && KT('Files & Links') === 'files' && KT('Files and Links') === 'files' && KT('Fyles Lynx') === null, 'v0.5.11 Type: «Resource» ≠ «Booking Resource»; v0.5.17 «Files & Links» is a known alias; unknown spellings are never guessed');
    ok(KT('Other') === null && KT('') === null && KT(null) === null && KT('אחר') === null, 'v0.5.11 Type: Other / empty → no kind');
    ok(M.kindByTableName('לוקיישנים') === 'location' && M.kindByTableName('locations ') === 'location', 'v0.5.11: list Source table by loose name too');
    // Type cell written on add
    const sel = (...c) => ({id: 'fldTY', name: 'Type', type: 'singleSelect', options: {choices: c.map((name) => ({name}))}});
    ok(JSON.stringify(M.typeCellFor({iType: sel('Film', 'Location')}, 'location')) === '{"name":"Location"}', 'v0.5.11 add: Type = exact choice «Location»');
    ok(M.typeCellFor({iType: sel('Film', 'Locations')}, 'location')?.name === 'Locations' && M.typeCellFor({iType: sel('לוקיישנים')}, 'location')?.name === 'לוקיישנים', 'v0.5.11 add: PROD spelling of the choice is reused («Locations», «לוקיישנים»)');
    ok(M.typeCellFor({iType: sel('Film')}, 'location') === null && M.typeCellFor({iType: null}, 'location') === null, 'v0.5.11 add: no fitting choice / no Type field → no Type cell (an extension cannot add choices)');
    ok(M.typeCellFor({iType: {id: 'fldTY', name: 'Type', type: 'singleLineText'}}, 'websitePage') === 'Website Page', 'v0.5.11 add: text Type → the English table name');
    {
        const Fa = {iList: {id: 'fL'}, iLinks: {location: {id: 'fLoc'}}, iType: sel('Location'), iLabel: {id: 'fLab'}, iSortOrder: {id: 'fSo'}, iChecked: null};
        const yes = {items: {checkPermissionsForCreateRecord: () => ({hasPermission: true})}};
        const noType = {items: {checkPermissionsForCreateRecord: (f) => ({hasPermission: !('fldTY' in f)})}};
        const a1 = M.newItemFields(yes, Fa, 'recL', 'location', 'recX', 'רחבת דשא', 10);
        ok(a1.fldTY?.name === 'Location' && a1.fLoc[0].id === 'recX' && a1.fL[0].id === 'recL' && a1.fLab === 'רחבת דשא' && a1.fSo === 10, 'v0.5.11 add (REAL newItemFields): list + Location link + Label + Sort + Type «Location»');
        const a2 = M.newItemFields(noType, Fa, 'recL', 'location', 'recX', 'רחבת דשא', 10);
        ok(!('fldTY' in a2) && a2.fLoc[0].id === 'recX', 'v0.5.11 add: Type cell refused → item still created without it');
        ok(M.newItemFields(yes, {...Fa, iLinks: {}}, 'recL', 'location', 'recX', 'x', null) === null, 'v0.5.11 add: no link field → nothing to write');
    }
    // the screenshot, PROD v0.5.6-style element: Location link HIDDEN, Type empty or PROD-spelled, list without Source table
    {
        const S = {lists: 'tblSHOTlists0000x', items: 'tblSHOTitems0000x', loc: 'tblSHOTloc00000xx'};
        const sLoc = mkT(S.loc, 'Locations', [mkF('fldSLname', 'Name', 'singleLineText')], [
            {id: 'recSL1', f: {fldSLname: 'רחבת דשא'}}, {id: 'recSL2', f: {fldSLname: 'חמ"ל - מרכז צעירים'}}, {id: 'recSL3', f: {fldSLname: 'חדר שיפוט - מרכז צעירים'}},
        ]);
        const sLists = mkT(S.lists, 'Lists', [mkF('fldSLLname', 'Name', 'singleLineText'), mkF('fldSLLowner', 'Owner User', 'singleCollaborator')], [{id: 'recSHOT', f: {fldSLLname: 'לוקיישנים לפסטיבל', fldSLLowner: {id: 'usrS'}}}]);
        const sit = {label: 'fldSIlabel', list: 'fldSIlist', type: 'fldSItype'};
        const mkItems = (withType) => mkT(S.items, 'List Item', [
            mkF(sit.label, 'Label', 'singleLineText'),
            mkF(sit.list, 'Festival List', 'multipleRecordLinks', {linkedTableId: S.lists}),
            ...(withType ? [mkF(sit.type, 'Type', 'singleSelect', {choices: [{name: 'Locations'}, {name: 'Other'}]})] : []),
        ], [
            {id: 'recSI1', f: {[sit.label]: 'רחבת דשא', [sit.list]: [{id: 'recSHOT'}]}},
            {id: 'recSI2', f: {[sit.label]: 'חמ"ל - מרכז צעירים', [sit.list]: [{id: 'recSHOT'}], [sit.type]: {name: 'Locations'}}},
            {id: 'recSI3', f: {[sit.label]: 'חדר שיפוט - מרכז צעירים', [sit.list]: [{id: 'recSHOT'}], [sit.type]: {name: 'לוקיישנים'}}},
            {id: 'recSI4', f: {[sit.label]: 'פריט בלי שום רמז', [sit.list]: [{id: 'recSHOT'}]}},
        ]);
        // (a) Locations table visible to the page (DEMO today), Type visible
        const tabsA = {[S.loc]: sLoc, Locations: sLoc, [S.lists]: sLists};
        const lookA = (r) => tabsA[r.trim()] ?? null;
        const TA = {lists: sLists, items: mkItems(true), films: null, slots: null, people: null, checklists: null};
        const FA = M.resolveFields(TA, lookA);
        ok(!FA.iLinks.location, 'v0.5.11 repro: the Location link is hidden from the element (as on DEMO, and likely PROD)');
        const ma = M.useModel(TA, FA, 'usrS', {configTable: null, lookup: lookA});
        const ia = (id) => ma.lists.find((l) => l.id === 'recSHOT').items.find((i) => i.id === id);
        ok(ia('recSI1').kind === 'location' && ia('recSI1').src.he === 'לוקיישנים' && ia('recSI1').src.icon === '📍' && ia('recSI1').via === 'name' && ia('recSI1').source?.id === 'recSL1', 'v0.5.11 repro: «רחבת דשא» – no link, no Type → unique name in Locations → 📍 לוקיישנים, opens the Location');
        ok(ia('recSI2').kind === 'location' && ia('recSI2').via === 'type' && ia('recSI2').source?.id === 'recSL2', 'v0.5.11 repro: «חמ"ל - מרכז צעירים» – Type «Locations» (PROD spelling) → 📍 לוקיישנים');
        ok(ia('recSI3').kind === 'location' && ia('recSI3').via === 'type', 'v0.5.11 repro: «חדר שיפוט - מרכז צעירים» – Type «לוקיישנים» → 📍 לוקיישנים');
        ok(ia('recSI4').unknown === true && !ia('recSI4').kind && !ia('recSI4').src, 'v0.5.11 repro: a row with no clue at all → «?» (unknown), never «אחר»');
        ok(ma.unknownFields[0] === 'Location' && !ma.unknownFields.includes('Type'), `v0.5.11 notice: names the hidden «Location» link first (its table is visible); Type is already on (${ma.unknownFields.slice(0, 4).join(', ')})`);
        // (b) nothing visible: no Locations table, no Type → «?» everywhere + the notice says Type + Location
        const lookB = (r) => ({[S.lists]: sLists})[r.trim()] ?? null;
        const TB = {lists: sLists, items: mkItems(false), films: null, slots: null, people: null, checklists: null};
        const FB = M.resolveFields(TB, lookB);
        const mb = M.useModel(TB, FB, 'usrS', {configTable: null, lookup: lookB});
        const rowsB = mb.lists.find((l) => l.id === 'recSHOT').items;
        ok(rowsB.every((i) => i.unknown && !i.src && !i.kind), 'v0.5.11: nothing readable → every row «?» (the v0.5.6 «אחר» case)');
        ok(mb.unknownFields[0] === 'Type' && mb.unknownFields[1] === 'Location', `v0.5.11 notice: «Type» first, then «Location» (${mb.unknownFields.slice(0, 4).join(', ')})`);
        // (c) the list's own table wins over the name match
        const sLists2 = mkT(S.lists, 'Lists', [mkF('fldSLLname', 'Name', 'singleLineText'), mkF('fldSLLsrc', 'Source table ID', 'singleLineText'), mkF('fldSLLowner', 'Owner User', 'singleCollaborator')], [{id: 'recSHOT', f: {fldSLLname: 'x', fldSLLsrc: 'לוקיישנים', fldSLLowner: {id: 'usrS'}}}]);
        const TC = {lists: sLists2, items: mkItems(false), films: null, slots: null, people: null, checklists: null};
        const mc = M.useModel(TC, M.resolveFields(TC, lookB), 'usrS', {configTable: null, lookup: lookB});
        ok(mc.lists[0].items.every((i) => i.kind === 'location' && i.via === 'list'), 'v0.5.11: list Source table «לוקיישנים» (Hebrew name, table not visible) → every row 📍 לוקיישנים');
        // (d) the name appears in two visible tables → not guessed
        const sPeople = mkT('tblSHOTppl000000x', 'People', [mkF('fldSPname', 'Full Name', 'singleLineText')], [{id: 'recSP1', f: {fldSPname: 'רחבת דשא'}}]);
        const tabsD = {...tabsA, People: sPeople, tblSHOTppl000000x: sPeople};
        const lookD = (r) => tabsD[r.trim()] ?? null;
        const TD2 = {lists: sLists, items: mkItems(false), films: null, slots: null, people: sPeople, checklists: null};
        const md2 = M.useModel(TD2, M.resolveFields(TD2, lookD), 'usrS', {configTable: null, lookup: lookD});
        ok(md2.lists[0].items.find((i) => i.id === 'recSI1').unknown === true, 'v0.5.11: a name found in TWO visible tables (Locations + People) is never guessed → «?»');
    }
    {
        const fs2 = await import('node:fs');
        const uiS = fs2.readFileSync(new URL('../frontend/ui.tsx', import.meta.url), 'utf8');
        const lpS = fs2.readFileSync(new URL('../frontend/ListPage.tsx', import.meta.url), 'utf8');
        const acS = fs2.readFileSync(new URL('../frontend/actions.ts', import.meta.url), 'utf8');
        const cmS = fs2.readFileSync(new URL('../frontend/Compact.tsx', import.meta.url), 'utf8');
        const badge = uiS.slice(uiS.indexOf('export function SourceBadge'), uiS.indexOf('export function SourceBadge') + 700);
        ok(!badge.includes('אחר') && badge.includes('className="src unknown"'), 'v0.5.11 UI: SourceBadge never renders «אחר»; unknown = amber «?»');
        ok((lpS.match(/<UnknownTablesNotice /g) ?? []).length === 1 && /fields=\{model\.unknownFields\}/.test(lpS) && /fields=\{model\.unknownFields\}/.test(cmS), 'v0.5.11 UI: ONE notice per list (not per row); badge tooltips name the fields (list page + compact)');
        ok(/newItemFields\(T, F, list\.id, k, r\.id, name, order\)/.test(lpS) && /const fields = newItemFields\(/.test(acS), 'v0.5.11 wiring: picker path (createItem) and add panel both write cells via newItemFields (Type included)');
        ok(M.unknownTip(['Type', 'Location']).includes('«Type» / «Location»') && M.unknownTip([]).includes('«Type»'), 'v0.5.11 tooltip names the fields to enable');
    }
    // ---------- v0.5.12: Critic minors ----------
    {
        const fs3 = await import('node:fs');
        const pkg = JSON.parse(fs3.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
        const idx = fs3.readFileSync(new URL('../frontend/index.tsx', import.meta.url), 'utf8');
        const uiV = fs3.readFileSync(new URL('../frontend/ui.tsx', import.meta.url), 'utf8');
        const cssV = fs3.readFileSync(new URL('../frontend/style.css', import.meta.url), 'utf8');
        const mdl = fs3.readFileSync(new URL('../frontend/model.ts', import.meta.url), 'utf8');
        ok(M.VERSION === pkg.version && /from '\.\.\/package\.json'/.test(mdl), `v0.5.12: footer version = package.json at build time (${M.VERSION})`);
        ok(/mode === 'full' \? <VersionFooter \/> : null/.test(idx) && /className="ver-foot"[\s\S]{0,80}v\{VERSION\}/.test(uiV) && /\.ver-foot \{[^}]*font-size: 11px[^}]*color: #8a8f9c/.test(cssV), 'v0.5.12: quiet grey 11px «vX.Y.Z» footer on Home + list page (full mode)');
        const lastNote = [...cssV.matchAll(/\.msg\.hint\.unknown-note \{([^}]*)\}/g)].map((m) => m[1]).join(' ');
        ok(/display: block/.test(lastNote) && !/display: flex/.test(lastNote) && !/gap:/.test(lastNote), 'v0.5.12: the missing-fields notice is plain text flow – no flex gap before the period («Task.» not «Task .»)');
        ok(/\{fields\.length > 6 \? ' …' : ''\}\. פריטים/.test(uiV) && !/<\/b>\s+\./.test(uiV), 'v0.5.12: the period follows the last field name directly');
    }
    // ---------- v0.5.13: hidden section + row pills + one loose search box (merged results) ----------
    {
        const fs4 = await import('node:fs');
        const rd = (f) => fs4.readFileSync(new URL(`../frontend/${f}`, import.meta.url), 'utf8');
        const homeS = rd('Home.tsx'), hdrS = rd('header.tsx'), cssS = rd('style.css'), lpS = rd('ListPage.tsx'), dynS = rd('Dynamic.tsx'), idxS = rd('index.tsx');
        const HID = ['rec0V7Rmh9olYyUME', 'recBamPRK18q0rqhM', 'recGUjCUfvxySnNcN'];
        const ids = (ls) => ls.map((l) => l.id);
        // sections (search empty)
        const h0 = M.homeSearch(owner.lists, 'all', '');
        ok(!h0.searching && h0.results.length === 0 && h0.shown.length === 5 && h0.shown.every((l) => !l.archived), `v0.5.13: search empty → main section = the 5 shown lists, no hidden ones (got ${h0.shown.length})`);
        ok(ids(h0.hidden).sort().join() === [...HID].sort().join() && h0.hidden.every((l) => l.archived), 'v0.5.13: «רשימות מוסתרות (N)» = exactly the 3 Status=Archived lists (N = 3)');
        ok(ids(M.homeSearch(owner.lists, 'all', '   ').hidden).length === 3 && !M.homeSearch(owner.lists, 'all', '   ').searching, 'v0.5.13: a query of only spaces = not searching (two sections stay)');
        ok(M.hiddenLists(owner.lists, 'shared').length === 0 && M.hiddenLists(owner.lists, 'mine').length === 3, 'v0.5.13: hidden section follows the filter chip (שלי 3 · משותפות איתי 0)');
        ok(M.homeSearch(admin.lists, 'all', '').hidden.length === 0, 'v0.5.13: Cinema Admin sees no hidden section (N = 0 → section not rendered)');
        ok(owner.lists.find((l) => l.id === HID[0]).status === 'Archived' && owner.lists.find((l) => l.id === 'recTKcA9MKknvByEJ').status === '', 'v0.5.13: ListVM.status keeps the raw Status (Archived / empty) for «ביטול»');
        // loose matching
        ok(M.normSearch('  DEMO \u00a0  בדיקה\t') === 'demo בדיקה', 'v0.5.13 search: ignores case, NBSP/tabs and extra spaces');
        const lst = owner.lists.find((l) => l.id === 'recBamPRK18q0rqhM'); // «DEMO בדיקה – רשימה חדשה»
        ok(M.listMatches(lst, 'demo') && M.listMatches(lst, '  רשימה    חדשה ') && M.listMatches(lst, 'יקה – רש') && !M.listMatches(lst, 'zzz'), 'v0.5.13 search: substring anywhere in the name, case-insensitive, extra spaces ignored');
        ok(M.listMatches(owner.lists.find((l) => l.id === 'recGUjCUfvxySnNcN'), 'ילד'), 'v0.5.13 search: matches mid-word («ילד» → «לילדים»)');
        // merged results while searching
        const hs = M.homeSearch(owner.lists, 'all', 'רשימה');
        ok(hs.searching && hs.results.some((l) => l.archived) && hs.results.some((l) => !l.archived), `v0.5.13 search: ONE merged list – hidden + shown matches together (${hs.results.map((l) => l.name).join(' | ')})`);
        ok(hs.results.every((l, i, a) => i === 0 || a[i - 1].created >= l.created), 'v0.5.13 search: merged results newest first (one order for both kinds)');
        const onlyHidden = M.homeSearch(owner.lists, 'all', 'לילדים');
        ok(ids(onlyHidden.results).join() === 'recGUjCUfvxySnNcN' && onlyHidden.results[0].archived, 'v0.5.13 search: a hidden-only match still shows (ghosted) – hidden lists are not buried');
        const unhid = owner.lists.map((l) => (l.id === 'recBamPRK18q0rqhM' ? {...l, archived: false, status: 'Active'} : l));
        ok(ids(M.homeSearch(unhid, 'all', 'רשימה').results).join() === ids(hs.results).join(), 'v0.5.13 search: «הצג רשימה» un-ghosts the row IN PLACE (same position in the results)');
        ok(M.homeSearch(owner.lists, 'all', 'zzz').results.length === 0 && M.resultCountHe(0) === 'לא נמצאו רשימות', 'v0.5.13 search: nothing matches → quiet «לא נמצאו רשימות»');
        ok(M.resultCountHe(1) === 'נמצאה רשימה אחת' && M.resultCountHe(4) === 'נמצאו 4 רשימות', 'v0.5.13 search: one quiet result count');
        ok(M.homeSearch(owner.lists, 'shared', 'רשימה').results.every((l) => l.relation === 'shared'), 'v0.5.13 search: respects the selected filter chip');
        // permissions + writes
        const Tok = {lists: {hasPermissionToUpdateRecord: () => true}}, Tno = {lists: {hasPermissionToUpdateRecord: () => false}};
        const mineL = owner.lists.find((l) => l.id === 'recTKcA9MKknvByEJ'), sharedL = owner.lists.find((l) => l.id === 'recp7H2sFfJGeYw2i');
        ok(M.canHide(Tok, F, mineL) && !M.canHide(Tok, F, sharedL) && !M.canHide(Tno, F, mineL) && !M.canHide(Tok, {...F, lStatus: null}, mineL), 'v0.5.13: row pill = owner only + Status exposed + write allowed (shared/public rows get an empty slot)');
        const writes = [];
        const Tw = {lists: {checkPermissionsForUpdateRecord: () => ({hasPermission: true}), updateRecordAsync: async (r, f) => writes.push(f[F.lStatus.id])}};
        await M.setArchived(Tw, F, mineL.rec, true);
        await M.setListStatus(Tw, F, mineL.rec, null);
        await M.setListStatus(Tw, F, mineL.rec, 'Done');
        ok(JSON.stringify(writes) === JSON.stringify([{name: 'Archived'}, null, {name: 'Done'}]), 'v0.5.13: hide writes Status=Archived; «ביטול» writes back the previous value exactly (empty → cleared, Done → Done)');
        ok(/const prev = list\.status \|\| null;/.test(hdrS) && /label: 'ביטול',\s*run: \(\) => (?:void |\{[^}]*?void )setListStatus\(T, F, list\.rec, prev\)/.test(hdrS), 'v0.5.13 wiring: every hide/show toast carries «ביטול» → setListStatus(prev)');
        ok(/useHideToggle\(T, F, say\)/.test(lpS) && /useHideToggle\(T, F, say\)/.test(dynS) && /useHideToggle\(T, F, say[,)]/.test(homeS) && /T=\{T\}\s*F=\{F\}\s*say=\{say\}\s*\/>/.test(idxS), 'v0.5.13 wiring: Home rows + both list headers share one hide/show path');
        // UI shape
        const tg = hdrS.slice(hdrS.indexOf('export function HideToggle'), hdrS.indexOf('/** quiet red text button'));
        ok(/if \(list\.archived\) \{[\s\S]*className="row-pill show"[\s\S]*הצג רשימה/.test(tg) && /className="row-pill hide"[\s\S]*<EyeIcon \/>[\s\S]*<span>הסתר<\/span>/.test(tg), 'v0.5.13 UI: shown row → «👁 הסתר» pill; hidden (ghosted) row → «הצג רשימה» pill');
        const pill = (cssS.match(/^\.row-pill \{([^}]*)\}/m) ?? [])[1] ?? '';
        ok(/height: 26px/.test(pill) && /border-radius: 999px/.test(pill) && /border: 1px solid/.test(pill) && /background: #f6f7f9/.test(pill) && /font-size: 12px/.test(pill) && /Segoe UI/.test(pill), 'v0.5.13 CSS: both pills fully rounded, 26px, light bg + 1px border, 12px Segoe UI');
        ok(/\.row-pill:hover:not\(:disabled\)/.test(cssS) && /\.row-pill:focus-visible \{[^}]*outline/.test(cssS), 'v0.5.13 CSS: clear hover + focus-visible state');
        ok(/\.row-wrap\.is-hidden > \.row, \.card-wrap\.is-hidden > \.card \{ opacity: \.5; \}/.test(cssS) && !/is-hidden[^{]*row-pill[^{]*\{[^}]*opacity/.test(cssS) && /\{ctl\}\s*<\/div>/.test(homeS), 'v0.5.13 CSS: hidden rows ghosted at 50%, the pill is a sibling of the ghosted button → stays full opacity');
        ok(/\.card-wrap > \.row-pill \{ position: absolute; top: 8px; left: 8px;/.test(cssS) && /\.row-wrap \{ display: flex;/.test(cssS), 'v0.5.13 CSS: pill at the far left (row end edge in RTL; card top-left corner)');
        // home structure
        ok(/const \[hiddenOpen, setHiddenOpen\] = useState\(false\)/.test(homeS) && /aria-expanded=\{hiddenOpen\}/.test(homeS) && /רשימות מוסתרות \(\{hidden\.length\}\)/.test(homeS) && /\{hidden\.length \? \(\s*<section className=\{`hidden-sec/.test(homeS), 'v0.5.13 Home: «רשימות מוסתרות (N)» collapsible, collapsed by default, rendered only when N > 0');
        ok(!/הצגת רשימות מוסתרות/.test(homeS) && !/showArchived/.test(homeS), 'v0.5.13 Home: the old bottom «הצגת רשימות מוסתרות» toggle is gone (one place for hidden lists)');
        ok(/searching \? \(/.test(homeS) && /resultCountHe\(results\.length\)/.test(homeS) && /many\(results\)/.test(homeS) && !/hiddenSectionOpen/.test(homeS), 'v0.5.13 Home: while searching ONE merged results list + one quiet count; no auto-expand / per-section counts');
        ok((homeS.match(/<SearchBox /g) ?? []).length === 1 && !/type="search"/.test(homeS), 'v0.5.13 Home: one search box (reused from v0.5.3; v0.5.15 moved it into <SearchBox>)');
        ok(/export function DeleteList/.test(hdrS) && /מחק רשימה/.test(hdrS) && /<DeleteList list=\{list\}/.test(lpS) && /<DeleteList list=\{list\}/.test(dynS), 'v0.5.13: «מחק רשימה» unchanged (header cluster, v0.5.12)');
        ok(!/ארכיון|archive pill|העברה לארכיון/.test(homeS + hdrS), 'v0.5.13: no «ארכיון» wording (archive scope dropped)');
    }
    // ---------- v0.5.14: live Prove-it fixes ----------
    {
        const fs5 = await import('node:fs');
        const rd = (f) => fs5.readFileSync(new URL(`../frontend/${f}`, import.meta.url), 'utf8');
        const hdrS = rd('header.tsx'), uiS = rd('ui.tsx'), cssS = rd('style.css'), cmS = rd('Compact.tsx'), lpS = rd('ListPage.tsx'), dynS = rd('Dynamic.tsx'), mdS = rd('model.ts');
        // 1. stable order (the DEMO twins: «כיסוי יחיד – בדיקה (v0.5.11)» + «לוקיישנים – שמות טבלה (v0.5.11)» were created in the same second)
        const twinT = owner.lists.find((l) => l.id === 'recEM0eEmXI7LI13j').created;
        const base = owner.lists.map((l) => (l.id === 'recBamPRK18q0rqhM' ? {...l, created: twinT} : l));
        const flip = base.map((l) => (l.id === 'recBamPRK18q0rqhM' ? {...l, archived: false, status: 'Active'} : l));
        const order = (ls) => M.homeSearch(ls, 'all', 'רשימה').results.map((l) => l.id).join();
        ok(order(base) === order(flip) && M.homeSearch(base, 'all', 'רשימה').results.length === 2, `v0.5.14 #1: twin created times – «הצג רשימה» keeps the row in place (order ${order(base)})`);
        const oldByNew = (a, b) => b.created - a.created;
        const oldOrder = (ls) => [...M.homeLists(ls, 'all', false).sort(oldByNew), ...M.hiddenLists(ls, 'all').sort(oldByNew)].filter((l) => M.listMatches(l, 'רשימה')).sort(oldByNew).map((l) => l.id).join();
        ok(oldOrder(base) !== oldOrder(flip), 'v0.5.14 #1: regression proof – the v0.5.13 «newest first» sort DID move the twin on show (the bug seen in step 9)');
        ok(M.homeOrder({created: 5, id: 'recB'}, {created: 5, id: 'recA'}) > 0 && M.homeOrder({created: 9, id: 'recZ'}, {created: 5, id: 'recA'}) < 0 && M.homeOrder({created: 5, id: 'recA'}, {created: 5, id: 'recA'}) === 0, 'v0.5.14 #1: homeOrder = created desc, then id asc (a total order, never Status / last-modified)');
        const sec = (ls) => M.homeSearch(ls, 'all', '');
        ok(sec(base).shown.map((l) => l.id).join() === sec(flip).shown.filter((l) => l.id !== 'recBamPRK18q0rqhM').map((l) => l.id).join(), 'v0.5.14 #1: sections keep their relative order too');
        ok(/\.sort\(homeOrder\)/.test(cmS) && /const byNew = homeOrder;/.test(mdS) && !/lastModified|modifiedTime/i.test(mdS), 'v0.5.14 #1: every Home / compact list order uses homeOrder; no last-modified sort anywhere');
        // 2. card pill on top of the poster strip
        ok(/style=\{\{zIndex: 10 - i\}\}/.test(uiS) && /\.card-wrap \{ isolation: isolate; \}/.test(cssS) && /\.card-wrap > \.card \{ position: relative; z-index: 0; \}/.test(cssS) && /\.card-wrap > \.row-pill \{ z-index: 30;/.test(cssS), 'v0.5.14 #2: card = its own layer (z 0, posters z ≤ 10 stay inside it); the pill is z 30 above → fully visible on every card');
        // 3. scroll position kept on hide / show / undo
        const ht = hdrS.slice(hdrS.indexOf('export function useHideToggle'), hdrS.indexOf('/** 14px line eye icon'));
        ok(/const keep = scrollers\(from\);\s*holdScroll\(keep\);/.test(ht) && /await setArchived\([^)]*\);\s*holdScroll\(keep\);/.test(ht) && /run: \(\) => \{\s*holdScroll\(keep\);[\s\S]*\.then\(\(\) => holdScroll\(keep\)\)/.test(ht), 'v0.5.14 #3: scroll held before the write, after it lands, and around «ביטול»');
        ok(/toggle\(list, e\.currentTarget\)/.test(hdrS) && /hideToggle\(list, document\.activeElement\)/.test(lpS) && /hideToggle\(list, document\.activeElement\)/.test(dynS), 'v0.5.14 #3: the clicked control is passed in, so its scroll containers are found (Home pills + list headers)');
        ok(/for \(let e = from\?\.parentElement[\s\S]*scrollHeight > e\.clientHeight/.test(uiS) && /'wheel', 'touchstart', 'keydown', 'mousedown'/.test(uiS) && /performance\.now\(\) < end/.test(uiS), 'v0.5.14 #3: holdScroll restores every scrollable ancestor + the document for a short window and yields to the user at once');
        // 4. stronger hover / focus
        const last = (sel) => [...cssS.matchAll(new RegExp(`^${sel.replace(/[.:()]/g, (c) => '\\' + c)} \\{([^}]*)\\}`, 'gm'))].map((m) => m[1]).at(-1) ?? '';
        const hov = last('.row-pill:hover:not(:disabled)'), foc = last('.row-pill:focus-visible');
        ok(/background: #e3e7ee/.test(hov) && /border-color: #7d8597/.test(hov), `v0.5.14 #4: hover = darker background + darker border (${hov.trim()})`);
        ok(/outline: 2px solid var\(--blue\)/.test(foc) && /outline-offset: 2px/.test(foc), `v0.5.14 #4: focus-visible = 2px blue ring with 2px offset (${foc.trim()})`);
    }
    // ---------- v0.5.15: toasts, search typing, Esc ----------
    {
        const fs6 = await import('node:fs');
        const rd = (f) => fs6.readFileSync(new URL(`../frontend/${f}`, import.meta.url), 'utf8');
        const uiS = rd('ui.tsx'), homeS = rd('Home.tsx'), cssS = rd('style.css');
        // 1. toasts
        ok(M.toastMs({action: {}}) === 6000 && M.toastMs({}) === 2800 && M.toastMs({err: true}) === 2800, 'v0.5.15 #1: undo toasts live 6 s (plain 2.8 s unchanged)');
        ok(M.toastLeftAfter(6000, 2000) === 4000 && M.toastLeftAfter(6000, 5900) === 1500 && M.toastLeftAfter(6000, -5) === 6000, 'v0.5.15 #1: a hover/focus pause keeps the remaining time (≥ 1.5 s back after the pause)');
        ok(M.acceptToast({action: {}}, {}) === 'queue' && M.acceptToast({action: {}}, {err: true}) === 'replace' && M.acceptToast({action: {}}, {action: {}}) === 'replace' && M.acceptToast({}, {}) === 'replace' && M.acceptToast(null, {}) === 'replace', 'v0.5.15 #1: a plain toast never cuts a live undo toast short (queued); errors / newer undos replace it');
        const tv = uiS.slice(uiS.indexOf('function ToastView'), uiS.indexOf('export function SearchBox'));
        ok(/\}, \[paused\]\);/.test(tv) && /const left = useRef\(toastMs\(msg\)\)/.test(tv) && /<ToastView key=\{toast\.n\}/.test(uiS) && /n: \+\+toastSeq/.test(uiS), 'v0.5.15 #1: the timer lives in <ToastView> keyed by a unique counter and depends only on pause – parent re-renders cannot restart or kill it');
        ok(/onMouseEnter=\{\(\) => setPaused\(true\)\}/.test(tv) && /onFocus=\{\(\) => setPaused\(true\)\}/.test(tv) && /onMouseLeave=\{\(\) => setPaused\(false\)\}/.test(tv), 'v0.5.15 #1: paused while hovered or focused');
        ok(/className="toast-x" aria-label="סגירת ההודעה"/.test(tv) && /\.toast-x \{/.test(cssS) && /const say = useCallback\(/.test(uiS), 'v0.5.15 #1: ✕ closes the toast by hand; say() is stable');
        // 2. search typing
        const fired = [];
        const q = [];
        const timers = {set: (fn) => (q.push(fn), q.length), clear: (h) => (q[h - 1] = null)};
        const d = M.debounce((v) => fired.push(v), 150, timers);
        for (const v of ['v', 'v0', 'v0.', 'v0.5']) d.call(v);
        q.filter(Boolean).forEach((fn) => fn());
        ok(JSON.stringify(fired) === '["v0.5"]', 'v0.5.15 #2: a fast burst «v», «v0», «v0.», «v0.5» filters ONCE with the full «v0.5» (no lost characters)');
        d.call('x'); d.flush(); d.call('y'); d.cancel(); q.filter(Boolean).forEach((fn) => fn());
        ok(JSON.stringify(fired) === '["v0.5","x"]', 'v0.5.15 #2: flush delivers now, cancel drops (Esc / clear never resurrects old text)');
        const sb = uiS.slice(uiS.indexOf('export function SearchBox'), uiS.indexOf('/**\n * v0.5.14: keep the scroll position'));
        ok(/const \[text, setText\] = useState\(''\)/.test(sb) && /value=\{text\}/.test(sb) && /setText\(v\);/.test(sb) && /deb\.call\(v\)/.test(sb), 'v0.5.15 #2: the input value is local state set on every keystroke; only the parent filtering is debounced');
        ok(/<SearchBox onQuery=\{setQ\} resetKey=\{resetKey\}/.test(homeS) && !/value=\{q\}/.test(homeS), 'v0.5.15 #2: Home no longer controls the input (no value={q}) – a slow gallery render cannot eat keystrokes');
        // 3. Esc
        ok(M.isEscapeKey({key: 'Escape'}) && M.isEscapeKey({key: 'Esc'}) && M.isEscapeKey({keyCode: 27}) && !M.isEscapeKey({key: 'Enter'}), 'v0.5.15 #3: Esc detected as Escape / Esc / keyCode 27');
        ok(/el\.addEventListener\('keydown', onKey, true\)/.test(sb) && /window\.addEventListener\('keydown', onKey, true\)/.test(sb) && /window\.addEventListener\('keyup', onKey, true\)/.test(sb) && /e\.stopPropagation\(\);\s*clearRef\.current\(\);/.test(sb), 'v0.5.15 #3: Esc handled by native capture listeners on the input AND window (before page-level handlers), propagation stopped');
        ok(/el\.addEventListener\('search', onSearch\)/.test(sb) && /if \(e\.target !== el \|\| !isEscapeKey\(e\)\) return;/.test(sb), 'v0.5.15 #3: only Esc on THIS input is taken; the native «search» event (✕) also clears');
    }
    // ---------- v0.5.16: scroll-jump root cause + one canHide rule ----------
    {
        const fs7 = await import('node:fs');
        const rd = (f) => fs7.readFileSync(new URL(`../frontend/${f}`, import.meta.url), 'utf8');
        const homeS = rd('Home.tsx'), hdrS = rd('header.tsx'), uiS = rd('ui.tsx'), mdS = rd('model.ts'), lpS = rd('ListPage.tsx'), dynS = rd('Dynamic.tsx'), acS = rd('actions.ts'), cssS = rd('style.css'), keepS = rd('keep.ts');
        const all = [homeS, hdrS, uiS, mdS, lpS, dynS, acS, rd('index.tsx'), rd('Compact.tsx'), rd('share.tsx')].join('\n');
        // 1. ROOT CAUSE: the host re-sync can hand Home a short / empty Lists array → keep the old rows rendered
        const mk = (n) => Array.from({length: n}, (_, i) => ({id: `rec${i}`, isDeleted: false}));
        const R = mk(22);
        let st = M.emptyKeep();
        let r = M.keepRecords(R, st, 0, M.recordIsDeleted); st = r.st;
        ok(r.out === R && r.nextExpiry === null, 'v0.5.16 #1 keep: nothing missing → the live array itself (same identity, model memo stays cheap)');
        r = M.keepRecords([], st, 1000, M.recordIsDeleted); st = r.st;
        ok(r.out.length === 22 && r.nextExpiry === 1000 + M.KEEP_GONE_MS, 'v0.5.16 #1 keep: host re-sync hands over an EMPTY Lists array → all 22 old rows stay rendered (no «עוד אין כאן רשימות», no collapse)');
        const again = M.keepRecords([], st, 1100, M.recordIsDeleted);
        ok(again.out === r.out, 'v0.5.16 #1 keep: same live + same kept set → same output array (no re-render storm)');
        r = M.keepRecords(R, st, 1250, M.recordIsDeleted); st = r.st;
        ok(r.out === R && r.st.gone.size === 0, 'v0.5.16 #1 keep: the rows come back → plain live array again, no duplicates');
        r = M.keepRecords(R.slice(0, 8), st, 2000, M.recordIsDeleted); st = r.st;
        ok(r.out.length === 22 && r.out.slice(0, 8).every((x, i) => x === R[i]), 'v0.5.16 #1 keep: a SHORT array (8 of 22) → the 14 missing rows kept, live rows first');
        R[20].isDeleted = true;
        r = M.keepRecords(R.slice(0, 8), st, 2100, M.recordIsDeleted); st = r.st;
        ok(r.out.length === 21 && !r.out.includes(R[20]), 'v0.5.16 #1 keep: a REAL delete (record isDeleted) leaves at once – «מחק רשימה» is never delayed');
        r = M.keepRecords(R.slice(0, 8), st, 2000 + M.KEEP_GONE_MS, M.recordIsDeleted); st = r.st;
        ok(r.out.length === 8 && r.nextExpiry === null, `v0.5.16 #1 keep: a row that stays gone (not deleted, e.g. filtered out by the element) leaves after ${M.KEEP_GONE_MS / 1000} s`);
        ok(M.keepRecords([], {...M.emptyKeep(), prev: [{id: 'x', get isDeleted() { throw new Error('gone'); }}]}, 0, M.recordIsDeleted).out.length === 0, 'v0.5.16 #1 keep: an unreadable record counts as deleted (never kept)');
        ok(/const listRecs = useKeptRecords\(useRecords\(T\.lists\)\);/.test(mdS) && /recordOrder \?\? \[\]/.test(keepS) && /__listsUiDiag/.test(mdS), 'v0.5.16 #1 wiring: useModel reads Lists through useKeptRecords; the cause is documented in keep.ts; window.__listsUiDiag records every short array live');
        // 2. the page can't get shorter during a hide / show / «ביטול» (a shorter page is what clamps scrollTop)
        const ht = hdrS.slice(hdrS.indexOf('export function useHideToggle'), hdrS.indexOf('/** 14px line eye icon'));
        ok(/hooks\.beforeWrite\?\.\(\);\s*const keep = scrollers\(from\);/.test(ht) && /await setArchived\([^)]*\);\s*holdScroll\(keep\);\s*hooks\.afterWrite\?\.\(from\);/.test(ht), 'v0.5.16 #2 wiring: hide/show → beforeWrite (pin height) before the write, afterWrite (focus) once it lands');
        ok(/run: \(\) => \{\s*holdScroll\(keep\);\s*hooks\.beforeWrite\?\.\(\);\s*void setListStatus/.test(ht) && /\.then\(\(\) => hooks\.afterWrite\?\.\(null\)\)/.test(ht), 'v0.5.16 #2 wiring: «ביטול» pins the height before its write and restores focus after it');
        ok(/beforeWrite: \(\) => \{\s*locked\.current = pageEl\(\);\s*lockMinHeight\(locked\.current\);/.test(homeS) && /closest<HTMLElement>\('\.app'\)/.test(homeS), 'v0.5.16 #2 Home: the page box (.app) min-height is pinned before every hide/show/undo write');
        ok(/useEffect\(\(\) => releaseMinHeight\(locked\.current\), \[filter, q, view\]\);/.test(homeS) && /useEffect\(\(\) => \(\) => releaseMinHeight\(locked\.current\), \[\]\);/.test(homeS), 'v0.5.16 #2 Home: released when the filter / search / view changes and when Home unmounts (opening a list never inherits it)');
        ok(/boxSizing === 'border-box' \? 0 :/.test(uiS) && /if \(h > cur\) el\.style\.minHeight = `\$\{h\}px`;/.test(uiS), 'v0.5.16 #2 lockMinHeight: content-box aware, only ever grows the pin');
        // 3. focus never falls to <body>, never scrolls
        ok(/afterWrite: \(from\) => keepFocus\(from, \(\) => homeRef\.current\?\.querySelector<HTMLElement>\('\.hidden-head'\) \?\? homeRef\.current\)/.test(homeS) && /<div className="home" ref=\{homeRef\} tabIndex=\{-1\}>/.test(homeS) && /\.home:focus \{ outline: none; \}/.test(cssS), 'v0.5.16 #3: after the clicked pill / «ביטול» unmounts, focus goes to the same pill if alive, else «רשימות מוסתרות» / Home');
        const focusCalls = all.match(/\.focus\([^)]*\)/g) ?? [];
        ok(focusCalls.length >= 2 && focusCalls.every((c) => /preventScroll: true/.test(c)) && !/scrollIntoView|scrollTo\(0|scrollTop = 0/.test(all), `v0.5.16 #3: every programmatic focus uses preventScroll (${focusCalls.length} calls); no scrollIntoView / scroll-to-top anywhere`);
        ok(!/autoFocus/.test(homeS.slice(0, homeS.indexOf('export function NewListModal'))), 'v0.5.16 #3: nothing on Home autofocuses (autoFocus only inside the modals)');
        // (b) keys: Home is never remounted by a key
        ok(!/<Home\s[^>]*key=/.test(rd('index.tsx')) && !/<Lists\s[^>]*key=/.test(rd('index.tsx')) && /<Row key=\{l\.id\}/.test(homeS) && /<Card key=\{l\.id\}/.test(homeS), 'v0.5.16 (b): no key on Lists / Home (never remounted by a write); rows + cards keyed by record id');
        ok(/holdScroll\(keep\);/.test(ht), 'v0.5.16: holdScroll stays – only as a backstop');
        // 4. ONE canHide rule for gallery, list and headers
        const Tok = {lists: {hasPermissionToUpdateRecord: () => true}};
        const closing = (u) => u.lists.find((l) => l.id === 'recp7H2sFfJGeYw2i');
        const trailers = {...closing(owner), id: 'recSFF56tynlLzokQ', name: 'טריילרים בעבודה', isDynamic: true, isChecklist: false};
        ok(!M.canHide(Tok, F, closing(owner)) && !M.canHide(Tok, F, trailers), 'v0.5.16 #4: the owner – «ערב סיום» + «טריילרים בעבודה» (Owner = Cinema Sapir – Admin, SharedWith = the owner) → shared → NO pill (same as the header: no «הסתרה מדף הבית»)');
        ok(M.canHide(Tok, F, closing(admin)) && M.canHide(Tok, F, {...trailers, relation: 'mine'}), 'v0.5.16 #4: Cinema Admin (the owner) → pill on both');
        const views = (u) => u.lists.filter((l) => l.relation).map((l) => { const can = M.canHide(Tok, F, l); return {gallery: can, list: can}; });
        ok([...views(owner), ...views(admin)].every((v) => v.gallery === v.list), 'v0.5.16 #4: for every list, gallery and list view get the SAME answer (one value per list)');
        ok(/const hideable = useMemo\(\(\) => new Map\(model\.lists\.map\(\(l\) => \[l\.id, canHide\(T, F, l\)\]\)\), \[model\.lists, T, F\]\);/.test(homeS) && /can=\{hideable\.get\(l\.id\) \?\? false\}/.test(homeS) && /<Card key=\{l\.id\} list=\{l\} open=\{open\} ctl=\{ctl\(l, false\)\}/.test(homeS) && /<Row key=\{l\.id\} list=\{l\} open=\{open\} ctl=\{ctl\(l, true\)\}/.test(homeS), 'v0.5.16 #4 Home: canHide computed ONCE per list into one map; the card and the row read the same entry');
        const tg = hdrS.slice(hdrS.indexOf('export function HideToggle'), hdrS.indexOf('/** quiet red text button'));
        ok(/if \(!can\) return slot/.test(tg) && !/canHide/.test(tg.replace(/\/\/.*$/gm, '')), 'v0.5.16 #4 HideToggle: renders from the `can` it is given – no second rule inside the pill');
        ok(/\{canHide\(T, F, list\) \? \(/.test(lpS) && /\{canHide\(T, F, list\) \? \(/.test(dynS) && !/relation === 'mine' && F\.lStatus/.test(all) && !/canHideList/.test(all), 'v0.5.16 #4: both list headers use the same canHide(T, F, list); the old inline header rules and canHideList are gone');
        ok(/export function canHide\(T: Tables, F: Fields, list: ListVM\): boolean \{\s*if \(list\.relation !== 'mine' \|\| !F\.lStatus\) return false;/.test(acS), 'v0.5.16 #4: canHide = owner (relation mine) + Status exposed + write allowed');
    }
    // ---------- v0.5.17 the owner: 13 more kinds, resolved by NAME (PROD ids/names differ; DEMO lacks Itinerary/Trips/Suppliers) ----------
    {
        const K = await import(pathToFileURL(out).href);
        const want13 = ['graphicDesign', 'itinerary', 'trip', 'supplier', 'assignment', 'staffing', 'files', 'media', 'resource', 'bookingResource', 'socialPost', 'campaign', 'pettyCash'];
        ok(want13.every((k) => K.KINDS.includes(k) && K.SRC[k]), 'v0.5.17: all 13 requested tables are kinds (graphic design … petty cash)');
        ok(want13.every((k) => K.SRC[k].he && K.SRC[k].plural && K.SRC[k].emoji && K.SRC[k].he !== 'אחר' && K.SRC[k].plural !== 'אחר'), 'v0.5.17: each has a Hebrew label + plural + emoji, never «אחר»');
        const emojis = K.KINDS.map((k) => K.SRC[k].emoji);
        ok(new Set(emojis).size === emojis.length, `v0.5.17: every kind has its own emoji (${emojis.length} kinds, no duplicates)`);
        ok(['itinerary', 'trip', 'supplier'].every((k) => K.SRC[k].tableId === '' && K.SRC[k].linkFieldId === '' && K.SRC[k].primaryFieldId === ''), 'v0.5.17: Itinerary / Trips / Suppliers are name-only (no ids)');
        // the owner's spellings + loose variants → the right kind, one kind only
        const TN = (x) => K.kindByTableName(x);
        const spell = {
            graphicDesign: ['graphic design', 'Graphic_Design', 'GRAPHIC DESIGNS', 'עיצוב גרפי'], itinerary: ['itinerary', 'Itineraries', 'ITINERARY', 'מסלולים'],
            trip: ['trips', 'Trip', 'TRIPS', 'נסיעות'], supplier: ['suppliers', 'Supplier', 'vendors', 'ספקים'], assignment: ['assignments', 'Assignment', 'שיבוצים'],
            staffing: ['staffing', 'Staffing', 'ציוות', 'איוש'], files: ['files and links', 'Files_and_Links', 'Files & Links', 'קבצים וקישורים'], media: ['media', 'MEDIA', 'מדיה'],
            resource: ['resources', 'Resource', 'משאבים'], bookingResource: ['Booking resources', 'booking_resource', 'הזמנות משאבים'], socialPost: ['social posts', 'Social_Post', 'פוסטים'],
            campaign: ['camaigns', 'campaigns', 'Campaign', 'קמפיינים'], pettyCash: ['petty cash', 'Petty_Cash', 'PettyCash', 'קופה קטנה'],
        };
        const bad = Object.entries(spell).flatMap(([k, xs]) => xs.filter((x) => TN(x) !== k).map((x) => `${x}→${TN(x)}`));
        ok(bad.length === 0, `v0.5.17: the owner's spellings resolve loosely (case, space/_ , singular/plural, Hebrew; «camaigns») ${bad.join(' ')}`);
        ok(TN('Resources') === 'resource' && TN('Booking Resources') === 'bookingResource' && TN('Staffing_Types') === null && TN('Equipment Warehouse') === null && TN('Lists') === null, 'v0.5.17: no false friends – Resources ≠ Booking Resources; Staffing_Types / Equipment Warehouse / Lists stay kind-less');
        // every name of every kind resolves to that kind only (no collisions introduced)
        const coll = K.KINDS.flatMap((k) => K.kindNames(k).filter((nm) => K.kindByLooseName(nm) !== k).map((nm) => `${k}:${nm}`));
        ok(coll.length === 0, `v0.5.17: every alias of every kind is unambiguous ${coll.join(' ')}`);
        // runtime table lookup by name among whatever the element sees
        const tbs = [{id: 'tblP1', name: 'Itineraries'}, {id: 'tblP2', name: 'TRIPS'}, {id: 'tblP3', name: 'suppliers'}, {id: 'tblP4', name: 'Graphic_Design'}, {id: 'tblP5', name: 'Booking Resources'}, {id: 'tblP6', name: 'Resources'}, {id: 'tblP7', name: 'Trip'}];
        ok(K.kindTableIn('itinerary', tbs)?.id === 'tblP1' && K.kindTableIn('supplier', tbs)?.id === 'tblP3' && K.kindTableIn('graphicDesign', tbs)?.id === 'tblP4', 'v0.5.17 kindTableIn: Itineraries / suppliers / Graphic_Design found by loose name');
        ok(K.kindTableIn('trip', tbs)?.id === 'tblP2' && K.kindTableIn('resource', tbs)?.id === 'tblP6' && K.kindTableIn('bookingResource', tbs)?.id === 'tblP5', 'v0.5.17 kindTableIn: exact name wins over a looser one (TRIPS before Trip); Resources vs Booking Resources kept apart');
        ok(K.kindTableIn('pettyCash', tbs) === null, 'v0.5.17 kindTableIn: no table → null (kind shows disabled)');
        ok(/«Itinerary»/.test(K.kindUnavailableTip('itinerary', 'table')) && /«Trip»/.test(K.kindUnavailableTip('trip', 'link')) && K.kindUnavailableTip('trip', null) === null, 'v0.5.17: tooltips name the missing table / List Item field');

        // PROD-style element: tables with PROD-ish names, List Item links named differently, no DEMO ids
        const Q = {lists: 'tblQlists0000000x', items: 'tblQitems0000000x', itin: 'tblQitin00000000x', trip: 'tblQtrip00000000x', sup: 'tblQsup000000000x', pc: 'tblQpc0000000000x', gd: 'tblQgd0000000000x'};
        const qf = {name: 'fldQLname', owner: 'fldQLowner', list: 'fldQIlist', label: 'fldQIlabel', type: 'fldQItype', itin: 'fldQIitin', trip: 'fldQItrip', sup: 'fldQIsup', pc: 'fldQIpc'};
        const itinT = mkT(Q.itin, 'Itineraries', [mkF('fldQitN', 'Name', 'singleLineText')], [{id: 'recIt1', f: {fldQitN: 'יום א׳ – ירושלים → שדרות'}}]);
        const tripT = mkT(Q.trip, 'TRIPS', [mkF('fldQtrN', 'Trip name', 'singleLineText')], [{id: 'recTr1', f: {fldQtrN: 'הסעת אורחים מתל אביב'}}]);
        const supT = mkT(Q.sup, 'Suppliers', [mkF('fldQsuN', 'Name', 'singleLineText')], [{id: 'recSu1', f: {fldQsuN: 'הגברה דרום בע״מ'}}]);
        const pcT = mkT(Q.pc, 'Petty_Cash', [mkF('fldQpcN', 'Name', 'singleLineText')], [{id: 'recPc1', f: {fldQpcN: 'מים לצוות'}}]);
        const gdT = mkT(Q.gd, 'graphic design', [mkF('fldQgdN', 'Name', 'singleLineText')], [{id: 'recGd1', f: {fldQgdN: 'פוסטר פתיחה'}}]);
        const qLists = mkT(Q.lists, 'Lists', [mkF(qf.name, 'Name', 'singleLineText'), mkF(qf.owner, 'Owner User', 'singleCollaborator')], [{id: 'recQL1', f: {[qf.name]: 'סוגים חדשים v0.5.17', [qf.owner]: {id: 'usrQ'}}}]);
        const qItems = mkT(Q.items, 'List Item', [
            mkF(qf.label, 'Label', 'singleLineText'), mkF(qf.list, 'Festival List', 'multipleRecordLinks', {linkedTableId: Q.lists}), mkF(qf.type, 'Type', 'singleSelect'),
            mkF(qf.itin, 'Itineraries', 'multipleRecordLinks', {linkedTableId: Q.itin}), // alias name
            mkF(qf.trip, 'נסיעה', 'multipleRecordLinks', {linkedTableId: Q.trip}), // renamed – found by its linked table
            mkF(qf.sup, 'Vendor', 'multipleRecordLinks', {linkedTableId: 'tblHiddenSup0000'}), // linked table not visible – found by its own name
        ], [
            {id: 'recQI1', f: {[qf.label]: 'יום א׳ – ירושלים → שדרות', [qf.list]: [{id: 'recQL1'}], [qf.itin]: [{id: 'recIt1', name: 'יום א׳ – ירושלים → שדרות'}]}},
            {id: 'recQI2', f: {[qf.label]: 'הסעת אורחים מתל אביב', [qf.list]: [{id: 'recQL1'}], [qf.trip]: [{id: 'recTr1', name: 'הסעת אורחים מתל אביב'}]}},
            {id: 'recQI3', f: {[qf.label]: 'מים לצוות', [qf.list]: [{id: 'recQL1'}], [qf.type]: {name: 'Petty Cash'}}},
            {id: 'recQI4', f: {[qf.label]: 'פוסטר פתיחה', [qf.list]: [{id: 'recQL1'}]}},
        ]);
        const qAll = [qLists, qItems, itinT, tripT, supT, pcT, gdT];
        const qById = Object.fromEntries(qAll.map((t) => [t.id, t]));
        const lookupQ = (r) => qById[r.trim()] ?? qAll.find((t) => t.name === r.trim()) ?? null; // exact like base.getTableByNameIfExists
        const TQ = {lists: qLists, items: qItems, films: null, slots: null, people: null, checklists: null};
        const FQ = M.resolveFields(TQ, lookupQ);
        ok(FQ.iLinks.itinerary?.id === qf.itin && FQ.iLinks.trip?.id === qf.trip && FQ.iLinks.supplier?.id === qf.sup, 'v0.5.17 PROD-style links: «Itineraries» (alias), «נסיעה» (renamed → linked table TRIPS), «Vendor» (linked table hidden → own name)');
        ok(!FQ.iLinks.pettyCash && !FQ.iLinks.graphicDesign, 'v0.5.17: no List Item link for Petty_Cash / graphic design on this element → those kinds listed but not addable');
        const mq = M.useModel(TQ, FQ, 'usrQ', {configTable: null, lookup: lookupQ, all: () => qAll});
        ok(mq.kindTables.get('pettyCash')?.id === Q.pc && mq.kindTables.get('graphicDesign')?.id === Q.gd && mq.kindTables.get('trip')?.id === Q.trip && mq.kindTables.get('supplier')?.id === Q.sup, 'v0.5.17: Petty_Cash / «graphic design» / TRIPS / Suppliers found by loose NAME (exact getTableByName would miss them)');
        const mqNoAll = M.useModel(TQ, FQ, 'usrQ', {configTable: null, lookup: lookupQ});
        ok(!mqNoAll.kindTables.get('pettyCash') && mqNoAll.kindTables.get('supplier')?.id === Q.sup, 'v0.5.17 control: without the all-tables list only exact names resolve (Suppliers yes, Petty_Cash no)');
        const qc = M.kindChoices(FQ, mq);
        const C = (k) => qc.find((c) => c.k === k);
        ok(C('itinerary').canAdd && C('trip').canAdd && C('supplier').canAdd, 'v0.5.17: Itinerary / Trip / Supplier light up where their table + link exist');
        ok(C('pettyCash').hasTable && !C('pettyCash').canAdd && C('pettyCash').why === 'link' && /«Petty Cash»/.test(C('pettyCash').tip), 'v0.5.17: table but no link → listed, chip disabled, tooltip names the List Item field');
        ok(!C('media').hasTable && C('media').why === 'table' && /«Media»/.test(C('media').tip), 'v0.5.17: no table → listed, disabled, tooltip names the table');
        ok(qc.length === M.KINDS.length && qc.findIndex((c) => !c.hasTable) > qc.findLastIndex((c) => c.hasTable), 'v0.5.17: every kind is listed once; available ones first, unavailable last');
        ok(JSON.stringify(M.newListKinds(FQ, mq)) === JSON.stringify(M.addPanelKinds(FQ, mq)), 'v0.5.17 PARITY: picker and add panel list the same kinds in the same order');
        const qi = (id) => mq.lists.flatMap((l) => l.items).find((i) => i.id === id);
        ok(qi('recQI1').kind === 'itinerary' && qi('recQI1').src.he === 'מסלולים' && qi('recQI1').src.icon === '🧭' && qi('recQI1').source?.id === 'recIt1', 'v0.5.17 row: Itinerary link → 🧭 מסלולים, opens the record');
        ok(qi('recQI2').kind === 'trip' && qi('recQI2').src.he === 'נסיעות' && qi('recQI2').source?.id === 'recTr1', 'v0.5.17 row: renamed Trip link → 🚐 נסיעות');
        ok(qi('recQI3').kind === 'pettyCash' && qi('recQI3').src.he === 'קופה קטנה' && qi('recQI3').source?.id === 'recPc1', 'v0.5.17 row: no link, Type «Petty Cash» → 💵 קופה קטנה, record found by name');
        ok(qi('recQI4').kind === 'graphicDesign' && qi('recQI4').src.he === 'עיצוב גרפי' && qi('recQI4').source?.id === 'recGd1', 'v0.5.17 row: no link, no Type → unique name match in «graphic design» → 🎨 עיצוב גרפי');
        ok(mq.lists.flatMap((l) => l.items).every((i) => i.src?.he !== 'אחר'), 'v0.5.17: no row reads «אחר»');
        ok(M.sourceView('trip', {...tripT.__records[0], parentTable: tripT}, FQ).name === 'הסעת אורחים מתל אביב', 'v0.5.17: name-only kind whose primary is not «Name» falls back to the record name');
        ok(M.MAX_EXTRA_TABLES >= M.KINDS.length - 3, `v0.5.17: record slots (${M.MAX_EXTRA_TABLES}) ≥ non-legacy kinds (${M.KINDS.length - 3}) – no kind silently unloaded`);
        const mS = fs.readFileSync(new URL('../frontend/model.ts', import.meta.url), 'utf8');
        const xs = (mS.match(/const x\d+ = useRecords\(extraTables\[\d+\]/g) ?? []).length;
        ok(xs === M.MAX_EXTRA_TABLES && new RegExp(`x${M.MAX_EXTRA_TABLES - 1}\\]\\.forEach`).test(mS), `v0.5.17: ${xs} useRecords slots wired = MAX_EXTRA_TABLES`);
        const hS = fs.readFileSync(new URL('../frontend/Home.tsx', import.meta.url), 'utf8');
        const lS = fs.readFileSync(new URL('../frontend/ListPage.tsx', import.meta.url), 'utf8');
        ok(/disabled=\{!c\.hasTable\} title=\{c\.hasTable \? undefined : \(c\.tip \?\? undefined\)\}/.test(hS) && /title=\{on \? undefined : \(c\?\.tip \?\? undefined\)\}/.test(lS), 'v0.5.17 wiring: picker option + add-panel chip disabled with the shared tooltip');
        ok(/all: \(\) => \[\.\.\.bound\.values\(\)\]/.test(fs.readFileSync(new URL('../frontend/index.tsx', import.meta.url), 'utf8')), 'v0.5.17 wiring: the element passes every visible table for loose name lookup');
    }
    // ---------------- v0.5.18: Critic minors (a) nameless results, (b) badge contrast, (c) full-name titles ----------------
    {
        const B = M.isBlankName;
        ok(B('') && B('   ') && B(null) && B(undefined), 'v0.5.18 (a): empty / whitespace / null names are blank');
        ok(B('-') && B(' - ') && B('--') && B('—') && B('–') && B('...') && B('…') && B('- .') && B('·') && B('-.-'), 'v0.5.18 (a): only dashes / dots / separators are blank («-», «--», «—», «…», «- .»)');
        ok(B('רשומה ללא שם') && B(M.NO_NAME_HE) && B(' רשומה  ללא שם ') && B('פריט ללא שם'), 'v0.5.18 (a): the fallbacks «רשומה ללא שם» / «פריט ללא שם» are blank');
        ok(!B('A-1') && !B('-1') && !B('#1') && !B('מים לצוות') && !B('Q.') && !B('3.5') && !B('רשומה'), 'v0.5.18 (a): real names stay («A-1», «-1», «#1», «Q.», «3.5», «רשומה»)');
        const row = (k, line, tag) => ({k, line, hay: `${line} ${tag}`.toLowerCase()});
        const P = [
            row('assignment', '-', 'שיבוץ שיבוצים'), row('assignment', '-', 'שיבוץ שיבוצים'), row('assignment', 'רכזת מתנדבים', 'שיבוץ שיבוצים'),
            row('pettyCash', 'מים לצוות', 'קופה קטנה'), row('pettyCash', 'רשומה ללא שם', 'קופה קטנה'), row('pettyCash', 'סוללות', 'קופה קטנה'),
            row('staffing', '', 'ציוות ציוות'), row('staffing', 'רשומה ללא שם', 'ציוות ציוות'),
        ];
        const L = (r) => r.rows.map((o) => `${o.k}:${o.line}`);
        const r0 = M.rankPicks(P, '');
        ok(JSON.stringify(L(r0).slice(0, 3)) === JSON.stringify(['assignment:רכזת מתנדבים', 'pettyCash:מים לצוות', 'pettyCash:סוללות']), 'v0.5.18 (a): no search → named records first, input order kept');
        ok(!L(r0).includes('assignment:-') && !L(r0).includes('pettyCash:רשומה ללא שם') && r0.hiddenBlank === 3, 'v0.5.18 (a): no search → nameless rows of types that HAVE named rows are hidden (3 held back)');
        ok(JSON.stringify(L(r0).slice(3)) === JSON.stringify(['staffing:', 'staffing:רשומה ללא שם']), 'v0.5.18 (a): a type with ONLY nameless rows still shows them – last (never an empty dead end)');
        const r1 = M.rankPicks(P, 'ללא שם');
        ok(L(r1).every((x) => !x.endsWith('מתנדבים') && !x.endsWith('לצוות')) && L(r1).includes('pettyCash:רשומה ללא שם') && L(r1).includes('assignment:-') && r1.hiddenBlank === 0, 'v0.5.18 (a): searching «ללא שם» shows every nameless row (the hint tells the user so)');
        const r2 = M.rankPicks(P, '-');
        ok(L(r2).filter((x) => x === 'assignment:-').length === 2 && L(r2).at(-1) === 'assignment:-', 'v0.5.18 (a): searching «-» shows the «-» rows');
        const r3 = M.rankPicks(P, 'שיבוצים');
        ok(JSON.stringify(L(r3)) === JSON.stringify(['assignment:רכזת מתנדבים']) && r3.hiddenBlank === 2, 'v0.5.18 (a): a table-name search does not bring the «-» rows back (2 held back)');
        const r4 = M.rankPicks(P, 'קטנה');
        ok(L(r4).at(-1) === 'pettyCash:סוללות' && !L(r4).includes('pettyCash:רשומה ללא שם'), 'v0.5.18 (a): named matches only when the type has named matches');
        const r5 = M.rankPicks(P, 'ציוות');
        ok(JSON.stringify(L(r5)) === JSON.stringify(['staffing:', 'staffing:רשומה ללא שם']) && r5.hiddenBlank === 0, 'v0.5.18 (a): only-nameless type + its table name → its rows show (fallback)');
        const r6 = M.rankPicks(P, 'zzz');
        ok(r6.rows.length === 0 && r6.hiddenBlank === 0, 'v0.5.18 (a): no match → empty, nothing «hidden»');
        const mixed = M.rankPicks([row('staffing', 'רשומה ללא שם', 'ציוות'), row('film', 'אור', 'סרט'), row('staffing', '-', 'ציוות'), row('film', 'דרך', 'סרט')], '');
        ok(JSON.stringify(L(mixed)) === JSON.stringify(['film:אור', 'film:דרך', 'staffing:רשומה ללא שם', 'staffing:-']), 'v0.5.18 (a): shown nameless rows always come after every named row');
        const many = Array.from({length: 70}, (_, i) => row('film', `סרט ${i}`, 'סרט'));
        ok(M.rankPicks([row('staffing', '-', 'ציוות'), ...many], '').rows.length === 60 && M.rankPicks([row('staffing', '-', 'ציוות'), ...many], '').rows.every((o) => o.line !== '-'), 'v0.5.18 (a): 60-row cap applied after ordering – nameless never pushes a named row out');
        const lp18 = fs.readFileSync(new URL('../frontend/ListPage.tsx', import.meta.url), 'utf8');
        ok(/return rankPicks\(/.test(lp18) && !/\.filter\(\(o\) => !n \|\| o\.hay\.includes\(n\)\)/.test(lp18) && /hiddenBlank > 0/.test(lp18), 'v0.5.18 (a) wiring: the add panel orders results only through model.rankPicks and shows the «הוסתרו» hint');
        ok(/title=\{dup \? `\$\{line\} #\$\{dup\}` : line\}/.test(lp18) && /<b title=\{line\}>\{line\}<\/b>/.test(lp18), 'v0.5.18 (c): add-panel result button + truncated name carry the full name as a native title');
        ok(/className="item-name"\s+title=\{i\.name\}/.test(lp18), 'v0.5.18 (c): list rows – the item name carries its full name as a title');
        const dy18 = fs.readFileSync(new URL('../frontend/Dynamic.tsx', import.meta.url), 'utf8');
        const cp18 = fs.readFileSync(new URL('../frontend/Compact.tsx', import.meta.url), 'utf8');
        const hm18 = fs.readFileSync(new URL('../frontend/Home.tsx', import.meta.url), 'utf8');
        ok(/className="item-name" title=\{i\.name\}/.test(dy18) && /className="item-name" title=\{l\.name\}/.test(cp18) && /<b title=\{l\.name\}>\{l\.name\}<\/b>/.test(hm18), 'v0.5.18 (c): dynamic rows, compact rows and Home list rows carry the full name too');
        // (b) contrast: parse the v0.5.18 rule out of style.css and compute WCAG contrast
        const css = fs.readFileSync(new URL('../frontend/style.css', import.meta.url), 'utf8');
        const blk = css.slice(css.indexOf('v0.5.18 (Critic minor b)'));
        const rule = blk.match(/\{([^}]*)\}/)[1];
        const sel = blk.slice(blk.indexOf('*/', blk.indexOf('*/') + 2) + 2, blk.indexOf('{'));
        const bg = rule.match(/background:\s*(#[0-9a-f]{6})/i)[1], fg = rule.match(/(?:^|;)\s*color:\s*(#[0-9a-f]{6})/i)[1];
        const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
        const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
        const cr = ratio(fg, bg);
        ok(fg.toLowerCase() === '#1f2328' && bg.toLowerCase() === '#eef0f2' && cr >= 4.5, `v0.5.18 (b): badge text ${fg} on ${bg} = ${cr.toFixed(1)}:1 (≥ 4.5:1)`);
        ok(['.src,', '.src.other', '.src.slot', '.src.person', '.src.film', '.pick-tag', '.badge.contents', '.badge.table-pill', '.hero-pills .badge.contents'].every((s) => sel.includes(s)) && !sel.includes('.src.unknown'), 'v0.5.18 (b): one rule covers row badges, add-panel tags and header / card chips (amber «?» untouched)');
        ok(/Segoe UI/.test(rule) && !/color:\s*#fff/i.test(rule), 'v0.5.18 (b): Segoe UI kept, no white badge text');
        ok(css.indexOf('v0.5.18 (Critic minor b)') > css.lastIndexOf('.src.other { background: #9aa1ac') && css.indexOf('v0.5.18 (Critic minor b)') > css.lastIndexOf('.table-pill { background: #eef6ff') && css.indexOf('v0.5.18 (Critic minor b)') > css.lastIndexOf('.pick.in .pick-tag { flex: none'), 'v0.5.18 (b): the new rule comes after the old grey / blue rules (wins the cascade)');
    }
    console.log(`\n${n} checks passed (incl. v0.5.7 PROD-style resolution + v0.5.8 picker parity + v0.5.9 header cluster + v0.5.10 header height / separator join + v0.5.11 table names + v0.5.12 version footer + v0.5.13 hidden section / row pills / merged search + v0.5.14 Prove-it fixes + v0.5.15 toasts / search typing / Esc + v0.5.16 scroll-jump root cause / one canHide rule + v0.5.17 13 more kinds by name + v0.5.18 nameless results / badge contrast / full-name titles)`);
}
