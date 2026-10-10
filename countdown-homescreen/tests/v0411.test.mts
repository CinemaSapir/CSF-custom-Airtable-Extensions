// v0.4.11 (the owner 15:05): PROD clock was wrong because Start was hidden on the element → say so; shorter clock labels.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../frontend/festivalTarget.ts';
const src = readFileSync(new URL('../frontend/index.tsx', import.meta.url), 'utf8');
test('right-pane clock labels are the short ones', () => {
    assert.match(src, /label: 'שעון · יום יעד \(0 = 31\.10\)'/);
    assert.match(src, /label: 'שעון · סטטוסים \(ריק = משובץ\)'/);
    assert.doesNotMatch(src, /שעון · שם המשבצת היעד/);
});
test('status panel: ✗ line per hidden needed field (Start, Status, End, day link, Festival Days Date / Notes / day number)', () => {
    assert.match(src, /✗ \$\{he\} \(\$\{hidden\}\) מוסתר באלמנט/);
    for (const he of ['שדה ההתחלה', 'שדה הסטטוס', 'שדה הסיום', 'שדה הקישור ליום', 'שדה התאריך של Festival Days', 'שדה ההערות של Festival Days', 'שדה מספר היום']) assert.ok(src.includes(`need('${he}'`), he);
    assert.match(src, /notes: \[\.\.\.fieldAlerts,/);
});
test('clock hint says the field may be hidden', () => {
    const t = T.computeTarget({kind: 'noFields', missing: ['Start']}, Date.now());
    assert.equal(t.phase, 'fallback');
    assert.match(t.hint!, /Start — מוסתרים באלמנט או לא קיימים/);
});
