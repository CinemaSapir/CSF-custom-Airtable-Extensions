import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    computeCounts,
    countEvents,
    countFilms,
    countModeForPhase,
    countProjects,
    formatCount,
    linkIds,
    type CountSlot,
    type CountsInput,
    type LinkedRec,
} from '../frontend/counts.ts';
import {CONFIG_DEFAULTS, WAVE_COLORS, fieldPart} from '../frontend/config.ts';
import {FALLBACK_TARGET_MS, FESTIVAL_FIRST_DAY, SCHEDULED_STATUS, isCancelledStatus} from '../frontend/festivalTarget.ts';

const ms = (iso: string) => Date.parse(iso);
const S = (id: string, start: string | null, status: 'm' | 'p' | 'x' | '', films: string[] = [], projects: string[] = []): CountSlot => ({
    id,
    startMs: start ? ms(start) : null,
    scheduled: status === 'm',
    cancelled: status === 'x',
    filmIds: films,
    projectIds: projects,
});

// m = משובץ, p = מתוכנן, x = בוטל, '' = empty status
const SLOTS: CountSlot[] = [
    S('s1', '2026-10-31T14:00:00Z', 'm', ['f1']),
    S('s2', '2026-11-02T18:00:00Z', 'm', ['f2'], ['p1']),
    S('s3', '2026-11-03T18:00:00Z', 'p', ['f2', 'f3'], ['p1']),
    S('s4', null, 'p', [], ['p2']),
    S('s5', '2026-11-04T18:00:00Z', 'x', ['f4'], ['p3']),
    S('s6', null, ''),
];
const FILMS: LinkedRec[] = [
    {id: 'f1', slotIds: []},
    {id: 'f2', slotIds: []},
    {id: 'f3', slotIds: []},
    {id: 'f4', slotIds: []},
    {id: 'f5', slotIds: ['s2']}, // link only on the Films side
    {id: 'f6', slotIds: []}, // no slot at all
];
const PROJECTS: LinkedRec[] = [
    {id: 'p1', slotIds: []},
    {id: 'p2', slotIds: []},
    {id: 'p3', slotIds: []},
    {id: 'p4', slotIds: ['s1']}, // Projects.Events side only, all משובץ
];
const BEFORE = ms('2026-10-10T12:00:00Z');
const DURING = ms('2026-11-02T12:00:00Z'); // s1 passed, s2 still to come

test('phase → mode', () => {
    assert.equal(countModeForPhase('before'), 'before');
    assert.equal(countModeForPhase('fallback'), 'before');
    assert.equal(countModeForPhase('live'), 'during');
    assert.equal(countModeForPhase('ended'), 'during');
});

test('אירועים: before = not משובץ, not בוטל; during = משובץ still to come', () => {
    assert.equal(countEvents(SLOTS, true, 'before', BEFORE), 3); // s3, s4, s6
    assert.equal(countEvents(SLOTS, true, 'during', DURING), 1); // s2
    assert.equal(countEvents(SLOTS, true, 'during', ms('2026-12-01T00:00:00Z')), 0);
    assert.equal(countEvents(null, true, 'before', BEFORE), null);
    assert.equal(countEvents(SLOTS, false, 'during', DURING), null);
    assert.equal(countEvents(SLOTS, false, 'before', BEFORE), 3); // Start not needed before
});

test('סרטים: before = no משובץ slot yet; during = a משובץ slot still to come; links from either side', () => {
    // f1 (s1 m) and f2 (s2 m) and f5 (s2 via Films side) are scheduled → f3, f4, f6 left
    assert.equal(countFilms(SLOTS, FILMS, true, true, 'before', BEFORE), 3);
    // during: s2 to come → f2, f5
    assert.equal(countFilms(SLOTS, FILMS, true, true, 'during', DURING), 2);
    assert.equal(countFilms(SLOTS, null, true, true, 'before', BEFORE), null);
    assert.equal(countFilms(SLOTS, FILMS, false, true, 'before', BEFORE), null);
    assert.equal(countFilms(null, FILMS, true, true, 'before', BEFORE), null);
});

test('מסגרות תוכן: projects with an open slot', () => {
    // before: p1 (s3 p), p2 (s4 p); p3 only בוטל; p4 only משובץ
    assert.equal(countProjects(SLOTS, PROJECTS, true, true, 'before', BEFORE), 2);
    // during: p1 (s2 to come)
    assert.equal(countProjects(SLOTS, PROJECTS, true, true, 'during', DURING), 1);
    assert.equal(countProjects(SLOTS, PROJECTS, false, true, 'before', BEFORE), null);
});

test('computeCounts: missing parts → null («—»), never throws', () => {
    const empty: CountsInput = {slots: null, hasStart: false, films: null, filmsLinked: false, projects: null, projectsLinked: false, invitations: null, tickets: null};
    assert.deepEqual(computeCounts(empty, 'before', BEFORE), {films: null, events: null, projects: null, invitations: null, tickets: null});
    const full: CountsInput = {slots: SLOTS, hasStart: true, films: FILMS, filmsLinked: true, projects: PROJECTS, projectsLinked: true, invitations: 8, tickets: 1830};
    assert.deepEqual(computeCounts(full, 'before', BEFORE), {films: 3, events: 3, projects: 2, invitations: 8, tickets: 1830});
    assert.deepEqual(computeCounts(full, 'live', DURING), {films: 2, events: 1, projects: 1, invitations: 8, tickets: 1830});
    assert.equal(formatCount(null), '—');
    assert.equal(formatCount(1830), '1,830');
    assert.equal(formatCount(0), '0');
});

test('linkIds accepts {id,name}[] and string[]; junk → []', () => {
    assert.deepEqual(linkIds([{id: 'rec1', name: 'a'}, 'rec2', null, 5]), ['rec1', 'rec2']);
    assert.deepEqual(linkIds(null), []);
    assert.deepEqual(linkIds('rec1'), []);
});

test('cancelled status is loose', () => {
    assert.equal(isCancelledStatus('בוטל'), true);
    assert.equal(isCancelledStatus(' בוטלה '), true);
    assert.equal(isCancelledStatus('משובץ'), false);
    assert.equal(isCancelledStatus(''), false);
    assert.equal(isCancelledStatus(null), false);
});

test('config defaults are slot-keyed and agree with the timer constants', () => {
    assert.equal(CONFIG_DEFAULTS.Title, 'יאללה היידה!');
    assert.equal(Date.parse(CONFIG_DEFAULTS.Date_1), FALLBACK_TARGET_MS);
    assert.equal(CONFIG_DEFAULTS.Date_2, FESTIVAL_FIRST_DAY);
    assert.equal(CONFIG_DEFAULTS.Option_List_1, SCHEDULED_STATUS);
    assert.equal(fieldPart(CONFIG_DEFAULTS.Source_Field_3), 'Status');
    assert.deepEqual([...WAVE_COLORS], ['#c9847a', '#c9b36a', '#7eb58a', '#6aabb8', '#8a94c4']);
    for (const k of Object.keys(CONFIG_DEFAULTS)) assert.match(k, /^[A-Za-z]+(_[A-Za-z]+)*(_\d+)?$/);
});
