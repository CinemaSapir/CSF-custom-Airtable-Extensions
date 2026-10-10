// Snapshot of DEMO data read via the Airtable connector 2026-09-29 ~03:55 IDT (only the fields the logic needs)
const D = {id: 'usrDEMOuser00001', name: 'Demo User'};
const C = {id: 'usrDEMOuser00002', name: 'Cinema Sapir - Admin'};
const sel = (name) => ({name});
export const lists = [
    {id: 'rec0V7Rmh9olYyUME', archived: true, t: '2026-09-28T10:59:05Z', f: {fldyacBe9ofvaMVsR: 'לבדוק לתוכניה', fldZx4aGH5kDImB9F: D}},
    {id: 'recBamPRK18q0rqhM', archived: true, t: '2026-09-28T11:07:16Z', f: {fldyacBe9ofvaMVsR: 'DEMO בדיקה – רשימה חדשה', fldZx4aGH5kDImB9F: D}},
    {id: 'recChziP3XqBf40Mf', t: '2026-09-28T23:46:29Z', f: {fldyacBe9ofvaMVsR: 'listssss', fldZx4aGH5kDImB9F: C}},
    {id: 'recEM0eEmXI7LI13j', t: '2026-09-28T23:57:36Z', f: {fldyacBe9ofvaMVsR: 'צוות אירוח – רשימה חדשה', fldZx4aGH5kDImB9F: D, fldA9w74oRsJ5OX6c: sel('Private'), fldtwojtq3e3UnqPN: sel('Regular'), fld7hO2xMIbwoHIfM: [sel('People')]}},
    {id: 'recGUjCUfvxySnNcN', archived: true, t: '2026-09-28T10:59:05Z', f: {fldyacBe9ofvaMVsR: 'לילדים', fldZx4aGH5kDImB9F: D}},
    {id: 'recHVmWkqavApgdDC', t: '2026-09-28T23:52:43Z', f: {fldyacBe9ofvaMVsR: 'הקרנות פתיחה – מועמדים', fldZx4aGH5kDImB9F: D, fldA9w74oRsJ5OX6c: sel('Public'), fldtwojtq3e3UnqPN: sel('Regular'), fld7hO2xMIbwoHIfM: [sel('Films')]}},
    {id: 'recMcBx0OtSCrZE1I', t: '2026-09-28T23:52:43Z', f: {fldyacBe9ofvaMVsR: 'בדיקת אולמות – משבצות הקרנה', fldZx4aGH5kDImB9F: D, fldA9w74oRsJ5OX6c: sel('Private'), fldtwojtq3e3UnqPN: sel('Checklist'), fld7hO2xMIbwoHIfM: [sel('Slots')]}},
    {id: 'recNrP00etWIeTR9R', t: '2026-09-28T23:52:43Z', f: {fldyacBe9ofvaMVsR: 'טיוטה פרטית – Cinema Admin (בקרה)', fldZx4aGH5kDImB9F: C, fldA9w74oRsJ5OX6c: sel('Private'), fldtwojtq3e3UnqPN: sel('Regular'), fld7hO2xMIbwoHIfM: [sel('Films')]}},
    {id: 'recTKcA9MKknvByEJ', t: '2026-09-28T10:59:05Z', f: {fldyacBe9ofvaMVsR: 'מועדפים שלי', fldZx4aGH5kDImB9F: D}},
    {id: 'recp7H2sFfJGeYw2i', t: '2026-09-28T23:52:43Z', f: {fldyacBe9ofvaMVsR: 'ערב סיום – סרטים, משבצות ואנשים', fldZx4aGH5kDImB9F: C, fldcxl9JgDzwAdW2p: [D], fldA9w74oRsJ5OX6c: sel('Private'), fldtwojtq3e3UnqPN: sel('Checklist'), fld7hO2xMIbwoHIfM: [sel('Films'), sel('Slots'), sel('People')]}},
    {id: 'recnnvIVKZPMqw1BL', t: '2026-09-28T10:59:05Z', f: {fldyacBe9ofvaMVsR: 'רשימה בלי בעלים (DEMO)'}},
    {id: 'rec1ksNhPCJ1X2vTl', t: '2026-09-23T22:59:47Z', f: {fldyacBe9ofvaMVsR: 'תיק DEMO 03'}},
];
const L = (id) => [{id}];
const att = (id) => [{id: 'att' + id, url: `https://example.test/${id}.jpg`, type: 'image/jpeg', thumbnails: {large: {url: `https://example.test/${id}-l.jpg`}, small: {url: `https://example.test/${id}-s.jpg`}}}];
export const items = [
    // closing night (mixed, checklist) – Sort Order interleaves tables on purpose
    {id: 'recYz04L1DX6JKYct', f: {fldg8Saxci0zhm4NN: L('recp7H2sFfJGeYw2i'), fldwlzLaMQW1ryscN: [{id: 'rec94Wuqh7em7ktpA', name: 'חלון פתוח'}], fld9LCQ72sxvDsVFF: 20, fldDTMOaOt0NSX4P9: true}},
    {id: 'recGRPzp0NNmDoDvg', f: {fldg8Saxci0zhm4NN: L('recp7H2sFfJGeYw2i'), fldwlzLaMQW1ryscN: [{id: 'rec7OeX5uWdDXb0d9', name: 'משמרת לילה'}], fld9LCQ72sxvDsVFF: 50}},
    {id: 'recYkDqPixKyhXSUI', f: {fldg8Saxci0zhm4NN: L('recp7H2sFfJGeYw2i'), fldmXZi2cXp5LFlLE: [{id: 'rec098WcofyDGsVEM', name: 'הקרנה: דרך האבק'}], fld9LCQ72sxvDsVFF: 30}},
    {id: 'recH63cejDWWPPdSB', f: {fldg8Saxci0zhm4NN: L('recp7H2sFfJGeYw2i'), fldmXZi2cXp5LFlLE: [{id: 'rec0UWkTVnMpRCYfC', name: 'הקרנה: רסיסים'}], fld9LCQ72sxvDsVFF: 60, fldDTMOaOt0NSX4P9: true}},
    {id: 'recwHEV5Pt9SK3ZpK', f: {fldg8Saxci0zhm4NN: L('recp7H2sFfJGeYw2i'), fldiBsiB716dSWmzZ: [{id: 'recL8s7HEx0adN1zE', name: 'נועה לוי'}], fld9LCQ72sxvDsVFF: 10, fldDTMOaOt0NSX4P9: true, fldRCylyeJvrhMp5g: 'הערה'}},
    {id: 'rec4u4AmL2rvyQPXt', f: {fldg8Saxci0zhm4NN: L('recp7H2sFfJGeYw2i'), fldiBsiB716dSWmzZ: [{id: 'recKYdQSPyLeqnz4a', name: 'שירה ביטון'}], fld9LCQ72sxvDsVFF: 40}},
    // opening (regular): one item with lookup-only picture (no Films record bound)
    {id: 'recuTM6dflKTAptFI', f: {fldg8Saxci0zhm4NN: L('recHVmWkqavApgdDC'), fldwlzLaMQW1ryscN: [{id: 'recXXnotloaded', name: 'צללים בדרום'}], fld9LCQ72sxvDsVFF: 10, fldCo0QvVgnfRENzA: [{linkedRecordId: 'recXXnotloaded', value: att('lookup')[0]}]}},
    // unlinked orphan from round 1 (must not appear anywhere)
    {id: 'rectgpHXnP1NqjTza', f: {fldwlzLaMQW1ryscN: [{id: 'recThstxkMijtHuUJ', name: 'דרך האבק'}]}},
    // an item with no Sort Order sorts after ordered ones
    {id: 'recNoOrder0000001', f: {fldg8Saxci0zhm4NN: L('recHVmWkqavApgdDC'), fldSO66paWwKaEuGZ: 'ללא סדר', fldkINrUOJxUF67mT: 1}},
];
export const films = [
    {id: 'rec94Wuqh7em7ktpA', f: {fldnNNYgdTgXc1c7o: 'חלון פתוח', fld0SoeYu0brBNEdT: att('film1'), fld3up6fHelJ030Ow: 'במאי א', fldMGUj964ZtiYjVv: 2025}},
    {id: 'rec7OeX5uWdDXb0d9', f: {fldnNNYgdTgXc1c7o: 'משמרת לילה'}},
];
export const slots = [{id: 'rec098WcofyDGsVEM', f: {fldTfMQmhZuGYDcyU: 'הקרנה: דרך האבק', fld4dQ6y3WBYeEWWq: att('slot1'), fldtmiazhhykZjx2J: '2026-11-01T19:00:00.000Z'}}];
export const people = [{id: 'recL8s7HEx0adN1zE', f: {fldVySoRplNHsjeBW: 'נועה לוי', fldXti4SNzyVMvUb2: att('p1')}}];

// round 3: junk test lists are hidden with Status = Archived (never deleted)
for (const l of lists) if (l.archived) l.f.fld6mZZQnhlZGPoyu = sel('Archived');
// round 3 seed: חלון פתוח also in the opening list (record-mode demo)
items.push({id: 'recR3windowOpen01', f: {fldg8Saxci0zhm4NN: L('recHVmWkqavApgdDC'), fldwlzLaMQW1ryscN: [{id: 'rec94Wuqh7em7ktpA', name: 'חלון פתוח'}], fld9LCQ72sxvDsVFF: 40, fldRCylyeJvrhMp5g: 'מועמד חזק לפתיחה'}});

// ---------- v0.3.0 (round 3b): dynamic lists ----------
// curated source-field values on the fixture films / slots (mirrors DEMO 2026-09-29 ~07:50 IDT, trimmed)
const FILM_ACCEPTED = 'fldO8jqYjg52cLe61', FILM_PROGRAM = 'fld6y1Yy4fXY7yTq9', FILM_TRAILER = 'fldfofhma9esYgIm7', FILM_YEAR = 'fldMGUj964ZtiYjVv';
Object.assign(films[0].f, {[FILM_ACCEPTED]: sel('התקבל לפסטיבל')}); // חלון פתוח (Year 2025 already set)
Object.assign(films[1].f, {[FILM_ACCEPTED]: sel('התקבל לפסטיבל')}); // משמרת לילה
films.push(
    {id: 'recvK2ef3lP2W9oKr', f: {fldnNNYgdTgXc1c7o: 'אור בעמק', [FILM_ACCEPTED]: sel('התקבל לפסטיבל'), [FILM_TRAILER]: sel('לגרסה'), [FILM_PROGRAM]: sel('ביכורים'), fld0SoeYu0brBNEdT: att('film3')}},
    {id: 'recdzQhYpsV8LLEOg', f: {fldnNNYgdTgXc1c7o: 'רסיסים', [FILM_ACCEPTED]: sel('התקבל לפסטיבל'), [FILM_TRAILER]: sel('לאישור'), [FILM_PROGRAM]: sel('קולנוע דרום חדש '), [FILM_YEAR]: 2024}},
    {id: 'recPublished00001', f: {fldnNNYgdTgXc1c7o: 'טריילר שפורסם', [FILM_ACCEPTED]: sel('התקבל לפסטיבל'), [FILM_TRAILER]: sel('פורסם')}},
    {id: 'rec3Xv5YSOCWu6dwS', f: {fldnNNYgdTgXc1c7o: 'סרט DEMO 02', [FILM_TRAILER]: sel('מועמד')}},
);
const SLOT_TYPE = 'fldxTZHOwfcvbWCIi', SLOT_LOC = 'fldIgvJCk5xikmZ5s';
Object.assign(slots[0].f, {[SLOT_TYPE]: sel('הקרנה'), [SLOT_LOC]: [{id: 'recmPOhTS7stVsM9m', name: 'אולם ספיר ב׳'}]}); // 2026-11-01T19:00Z = 21:00 IST
slots.push(
    {id: 'recW0q1KdduqiIBXa', f: {fldTfMQmhZuGYDcyU: 'הקרנה: צללים בדרום', [SLOT_TYPE]: sel('הקרנה'), [SLOT_LOC]: [{id: 'recCufPhMIJZwyZDm', name: 'אולם ספיר א׳'}], fldtmiazhhykZjx2J: '2026-11-01T18:00:00.000Z'}},
    {id: 'rec0UWkTVnMpRCYfC', f: {fldTfMQmhZuGYDcyU: 'הקרנה: רסיסים', [SLOT_TYPE]: sel('הקרנה'), fldtmiazhhykZjx2J: '2026-11-01T21:30:00.000Z'}}, // 23:30 IST, still 1.11
    {id: 'recLateNight00001', f: {fldTfMQmhZuGYDcyU: 'הקרנת חצות', [SLOT_TYPE]: sel('הקרנה'), fldtmiazhhykZjx2J: '2026-11-01T22:30:00.000Z'}}, // UTC 1.11 but 00:30 IST on 2.11
    {id: 'recuEWWV1KdJbWiIv', f: {fldTfMQmhZuGYDcyU: 'הקרנה: חלון פתוח', [SLOT_TYPE]: sel('הקרנה'), fldtmiazhhykZjx2J: '2026-11-03T17:30:00.000Z'}},
    {id: 'rec00LybIQj1n2vGW', f: {fldTfMQmhZuGYDcyU: 'DEMO Slot 07'}},
);
const MODE = 'fld4MPMiB46amYP6N', SRCT = 'fld7BHRTkygfkvki9';
const cond = (n, key, op, value) => ({[['fldr32AuQUwtnXROf', 'fldJqq23SSzVPGpkX', 'fldse72Il6oJNUtBs'][n]]: key ? sel(key) : null, [['fld06aKWYs0tPLZ2H', 'fldtfHy7Y9yYqk3vT', 'fldwJVKuKYTlBkIf8'][n]]: op ? sel(op) : null, [['fld7jj9YQ9wpXt110', 'fld06djIc0nuqgJxh', 'fldjBL9PywjVnylSv'][n]]: value ?? null});
export const dynLists = [
    {id: 'recDyn01Films0000', t: '2026-09-29T05:00:00Z', f: {fldyacBe9ofvaMVsR: 'סרטים שהתקבלו לפסטיבל', fldZx4aGH5kDImB9F: D, fldA9w74oRsJ5OX6c: sel('Public'), fldtwojtq3e3UnqPN: sel('Checklist'), [MODE]: sel('Dynamic'), [SRCT]: sel('Films'), ...cond(0, 'Accepted to CSF', 'is', 'התקבל לפסטיבל')}},
    {id: 'recDyn02Slots0000', t: '2026-09-29T05:01:00Z', f: {fldyacBe9ofvaMVsR: 'הקרנות 1.11', fldZx4aGH5kDImB9F: D, fldA9w74oRsJ5OX6c: sel('Private'), [MODE]: sel('Dynamic'), [SRCT]: sel('Slots_Events'), ...cond(0, 'Type', 'is', 'הקרנה'), ...cond(1, 'Start', 'is on', '2026-11-01')}},
    {id: 'recDyn03Trail0000', t: '2026-09-29T05:02:00Z', f: {fldyacBe9ofvaMVsR: 'טריילרים בעבודה', fldZx4aGH5kDImB9F: C, fldcxl9JgDzwAdW2p: [D], [MODE]: sel('Dynamic'), [SRCT]: sel('Films'), ...cond(0, 'Accepted to CSF', 'is', 'התקבל לפסטיבל'), ...cond(1, 'Trailer Stage', 'is not empty'), ...cond(2, 'Trailer Stage', 'is not', 'פורסם')}},
    {id: 'recDyn04Broken000', t: '2026-09-29T05:03:00Z', f: {fldyacBe9ofvaMVsR: 'טבלה לא נתמכת', fldZx4aGH5kDImB9F: D, [MODE]: sel('Dynamic'), [SRCT]: sel('Tasks'), ...cond(0, 'Status', 'is', 'x')}},
    {id: 'recDyn05Partial00', t: '2026-09-29T05:04:00Z', f: {fldyacBe9ofvaMVsR: 'תנאי חלקי', fldZx4aGH5kDImB9F: D, [MODE]: sel('Dynamic'), [SRCT]: sel('Films'), ...cond(0, 'Year', 'greater than', '2024'), ...cond(1, 'Start', 'is on', '2026-11-01'), ...cond(2, 'Accepted to CSF', 'is')}},
    {id: 'recStaticMode0000', t: '2026-09-29T05:05:00Z', f: {fldyacBe9ofvaMVsR: 'סטטית מפורשת', fldZx4aGH5kDImB9F: D, [MODE]: sel('Static'), [SRCT]: sel('Films'), ...cond(0, 'Accepted to CSF', 'is', 'התקבל לפסטיבל')}},
];
// a stray List Item linked to a DYNAMIC list must be ignored (dynamic items are computed, not stored)
export const dynItems = [{id: 'recStrayDynItem01', f: {fldg8Saxci0zhm4NN: [{id: 'recDyn01Films0000'}], fldwlzLaMQW1ryscN: [{id: 'rec3Xv5YSOCWu6dwS', name: 'סרט DEMO 02'}]}}];
