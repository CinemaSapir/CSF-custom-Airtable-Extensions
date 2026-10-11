// horizontal v0.1.4 — the UX Critic's 8 REVISE points (open since v0.1.0) + the Cushion label pattern (parent 08:01)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  NOW_TAG_GAP,
  ghostClash,
  hallLabelPos,
  hhmm,
  packBars,
  placeLabel,
  showNowTag,
} from "../frontend/logic/hcore";
import { buildDays, type Item } from "../frontend/logic/core";
import { HCSS } from "../frontend/hstyles";
const src = readFileSync("frontend/HTimeline.tsx", "utf8");
const days = buildDays("2026-11-01", "2026-11-03", "2026-11-01");
const it = (o: Partial<Item>): Item =>
  ({
    id: "r",
    table: "Slots_Events",
    name: "n",
    s: 600,
    e: 660,
    hall: [],
    people: [],
    films: [],
    sub: "",
    st: null,
    flag: null,
    fx: {},
    ...o,
  }) as unknown as Item;

test("#1 sticky labels: pinned at the visible right edge, slid in from the left edge, never into a neighbour; faded when short", () => {
  // bar crossing the right edge (viewU = 100): label pinned at 102, may run past the bar into free lane room
  assert.deepEqual(
    placeLabel(
      { u0: 40, u1: 160, ext: 160, rb: Infinity, ra: Infinity },
      90,
      100,
      1000,
    ),
    { r: 102, w: 90, clip: false },
  );
  // …but not into the next bar of its lane (ra = 20) → faded (clip)
  assert.deepEqual(
    placeLabel(
      { u0: 40, u1: 160, ext: 160, rb: Infinity, ra: 20 },
      120,
      100,
      1000,
    ),
    { r: 102, w: 78, clip: true },
  );
  // bar starting near the left edge (viewEnd = 1000): label slides right (earlier time) into free room so its end stays visible
  assert.deepEqual(
    placeLabel(
      { u0: 950, u1: 1100, ext: 1100, rb: 200, ra: Infinity },
      120,
      0,
      1000,
    ),
    { r: 878, w: 120, clip: false },
  );
  // no free room before it → stays at the bar start, faded at the edge
  assert.deepEqual(
    placeLabel(
      { u0: 950, u1: 1100, ext: 1100, rb: 0, ra: Infinity },
      120,
      0,
      1000,
    ),
    { r: 950, w: 48, clip: true },
  );
  // the bar itself off screen → no label
  assert.equal(placeLabel({ u0: 10, u1: 90, ext: 90 }, 60, 100, 1000), null);
  assert.equal(
    placeLabel({ u0: 1200, u1: 1300, ext: 1300 }, 60, 0, 1000),
    null,
  );
  // packBars measures the free room on each side of a bar in its lane
  const { bars } = packBars(
    [it({ id: "a", s: 600, e: 660 }), it({ id: "b", s: 700, e: 760 })],
    days,
    (m) => m,
    () => 10,
  );
  const a = bars.find((x) => x.item.id === "a")!,
    b = bars.find((x) => x.item.id === "b")!;
  assert.equal(a.lane, b.lane);
  assert.equal(a.rb, Infinity);
  assert.equal(a.ra, b.u0 - a.ext - 4);
  assert.equal(b.rb, b.u0 - a.ext - 4);
  assert.match(
    src,
    /const P = noText \|\| L\?\.full \? null : placeLabel\(b, withT \? visW - 4 : b\.lab, sl, sl \+ W\);/,
  );
});
test("#1/#3 Cushion: a too-long name fades (mask) instead of a hard cut / spill; hover = full name, only the covered neighbour dims", () => {
  assert.match(
    HCSS,
    /\.htl \.hlab\.lclip\{-webkit-mask-image:linear-gradient\(to right,transparent 0,black 26px\)/,
  );
  assert.match(HCSS, /\.htl \.hlab\.hov\{z-index:9;background:white/);
  assert.match(HCSS, /\.htl \.hb\.dim,\.htl \.hlab\.dim\{opacity:\.28/);
  assert.match(
    src,
    /const dim = !!\(hov && hov\.t === t && hov\.id !== i\.id && hov\.top === top/,
  );
});
test("#3 root cause: the vertical hour-label rule (.hlab translateY(-50%)) no longer lifts the name labels onto the lane above", () => {
  assert.match(HCSS, /\.htl \.hlab\{transform:none;line-height:normal\}/);
});
test("#2 a label crossing the cross-section strip → the lens keeps its highlight, no second title", () => {
  assert.match(
    src,
    /const dupe = !!\(L && P && P\.r < sb && P\.r \+ P\.w > sa\);/,
  );
  assert.match(src, /\{dupe \? null : \(/);
});
test("#4 one time tag: the now tag hides next to the strip clock tag (viewport px on both sides)", () => {
  assert.equal(showNowTag(500, 503), false);
  assert.equal(showNowTag(500, 500 + NOW_TAG_GAP), true);
  assert.equal(showNowTag(500, null), true);
  assert.equal(showNowTag(null, 10), false);
  assert.match(src, /showNowTag\(uOf\(nowM\) - sl, xp\.yc\)/);
});
test("#5 24-hour time everywhere: typed text field, normalised", () => {
  assert.doesNotMatch(src, /type="time"/);
  assert.equal(hhmm("13:00"), "13:00");
  assert.equal(hhmm("930"), "09:30");
  assert.equal(hhmm("9"), "09:00");
  assert.equal(hhmm("21.15"), "21:15");
  assert.equal(hhmm("2359"), "23:59");
  assert.equal(hhmm("24:00"), null);
  assert.equal(hhmm("1 PM"), null);
});
test("#6 window: flex lines (cards sized to their names, lines filled), 12.5px names + 28px cards kept, no mid-word breaks", () => {
  assert.match(
    HCSS,
    /\.htl \.win \.wslide>\.wbody>\.wg\{display:flex;flex-wrap:wrap/,
  );
  assert.match(
    HCSS,
    /\.htl \.win \.wg>\.wc\{flex:1 1 auto;height:var\(--wcH\);min-width:150px;max-width:380px/,
  );
  assert.match(HCSS, /\.htl \.wc \.nm\{overflow-wrap:break-word\}/);
  assert.match(HCSS, /\.htl \.wc \.nm\{font-size:12\.5px/);
  assert.match(HCSS, /\.htl\{--wcH:28px\}/);
});
test("#7 hall labels: aligned to their group line; 2 lines, full header width below the header lines", () => {
  assert.deepEqual(hallLabelPos(4, 60, 0, false), { top: 6, wide: false });
  assert.deepEqual(hallLabelPos(70, 60, 1, false), { top: 72, wide: true });
  assert.deepEqual(hallLabelPos(70, 60, 1, true), { top: 71, wide: true });
  assert.match(
    HCSS,
    /\.htl \.hrh \.hgl2\{white-space:normal;display:-webkit-box;-webkit-line-clamp:2/,
  );
  assert.match(src, /<div className="hgsep2" style=\{\{top: g\.y - 3\}\} \/>/);
});
test("#8 the create-drag ghost names its clashes", () => {
  const items = [
    it({ id: "a", s: 600, e: 660, name: "A" }),
    it({ id: "b", s: 700, e: 760, name: "B" }),
    it({ id: "c", table: "Staffing", s: 600, e: 700 }),
  ];
  assert.deepEqual(
    ghostClash(items, "Slots_Events", 630, 710).map((i) => i.name),
    ["A", "B"],
  );
  assert.deepEqual(ghostClash(items, "Slots_Events", 660, 700), []);
  assert.match(src, /clash=\{ghostClash\(filtered, t, ghost\.a, ghost\.b\)\}/);
  assert.match(src, /⚠ חופף ל-/);
});
