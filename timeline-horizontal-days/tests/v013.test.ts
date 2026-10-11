// horizontal v0.1.3 (the owner 06:57): readable window names, colour-coded cross-section toggle, neutral day titles,
// day titles = the Festival Days record names (matched by Date, Israel calendar date)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fdDate, hDayTitle } from "../frontend/logic/hcore";
import { buildDays, dayBar } from "../frontend/logic/core";
import { HCSS } from "../frontend/hstyles";
const src = readFileSync("frontend/HTimeline.tsx", "utf8");
const idx = readFileSync("frontend/index.tsx", "utf8");

// the DEMO base's Festival Days table (CSF DEMO v1.3 260924, read 2026-10-11 via the Airtable MCP): Name (primary) + Date (date only)
const DEMO_FD: Array<{ Name: string; Date: string }> = [
  ["2026-10-16", "יום ו׳ 16.10.26"],
  ["2026-10-17", "שבת 17.10.26"],
  ["2026-10-18", "יום א׳ 18.10.26"],
  ["2026-10-19", "יום ב׳ 19.10.26"],
  ["2026-10-20", "יום ג׳ 20.10.26"],
  ["2026-10-21", "יום ד׳ 21.10.26"],
  ["2026-10-22", "יום ה׳ 22.10.26"],
  ["2026-10-23", "יום ו׳ 23.10.26"],
  ["2026-10-24", "שבת 24.10.26"],
  ["2026-10-25", "יום א׳ 25.10.26"],
  ["2026-10-26", "יום ב׳ 26.10.26"],
  ["2026-10-27", "יום ג׳ 27.10.26"],
  ["2026-10-28", "יום ד׳ 28.10.26"],
  ["2026-10-29", "יום ה׳ 29.10.26"],
  ["2026-10-30", "יום ו׳ 30.10.26"],
  ["2026-10-31", "שבת 31.10.26 · ערב הפסטיבל"],
  ["2026-11-01", "יום א׳ 1.11.26 · פתיחה"],
  ["2026-11-02", "יום ב׳ 2.11.26"],
  ["2026-11-03", "יום ג׳ 3.11.26"],
  ["2026-11-04", "יום ד׳ 4.11.26"],
  ["2026-11-05", "יום ה׳ 5.11.26"],
  ["2026-11-06", "יום ו׳ 6.11.26"],
  ["2026-11-07", "מוצ״ש 7.11.26 · נעילה"],
  ["2026-11-08", "יום א׳ 8.11.26"],
  ["2026-11-09", "יום ב׳ 9.11.26"],
  ["2026-11-10", "יום ג׳ 10.11.26"],
].map(([Date, Name]) => ({ Date, Name }));
/** the same name map index.tsx builds (fdDate of the Date cell → first record name per date) */
const namesFrom = (recs: Array<{ Name: string; Date: unknown }>) => {
  const o: { [d: string]: string } = {};
  for (const r of recs) {
    const ds = fdDate(r.Date);
    if (ds && !o[ds]) o[ds] = r.Name;
  }
  return o;
};

test("#4 DEMO Festival Days: every title == its record Name, verbatim (no invented phase words)", () => {
  const days = buildDays(
    "2026-10-16",
    "2026-11-10",
    "2026-11-01",
    namesFrom(DEMO_FD),
  );
  assert.equal(days.length, 26);
  for (const d of days) {
    const rec = DEMO_FD.find((r) => r.Date === d.date)!;
    assert.equal(hDayTitle(d).t, rec.Name, d.date);
    assert.equal(
      hDayTitle(d).s,
      "",
      "the DEMO names carry their date → no subtitle",
    );
  }
  const t = days.map((d) => hDayTitle(d).t).join("|");
  assert.doesNotMatch(t, /עוד \d+ ימים|עוד יום|יום \d+ · פסטיבל|פירוק · יום/);
  // the root cause: the shared core dayBar (also used by the vertical) titles days from the day NUMBER, not the record
  const old = days.map((d) => dayBar(d, 7).t);
  assert.equal(old[0], "הכנות · עוד 16 ימים");
  assert.equal(old[17], "יום 2 · פסטיבל");
  assert.ok(old.filter((x, k) => x !== hDayTitle(days[k]).t).length >= 25);
});
test("#4 Date matched as an Israel calendar date (dateTime field → no off-by-one); bad cells skipped", () => {
  assert.equal(fdDate("2026-10-31"), "2026-10-31");
  assert.equal(
    fdDate("2026-10-30T22:00:00.000Z"),
    "2026-10-31",
    "midnight Israel (UTC+2 in winter) = 22:00Z the day before",
  );
  assert.equal(
    fdDate("2026-10-24T21:30:00.000Z"),
    "2026-10-25",
    "UTC+3 (summer time until 25.10)",
  );
  assert.equal(fdDate("2026-11-01T10:00:00.000Z"), "2026-11-01");
  assert.equal(fdDate(["2026-11-02"]), "2026-11-02");
  assert.equal(fdDate(""), null);
  assert.equal(fdDate("31/10/2026"), null);
  const days = buildDays(
    "2026-10-30",
    "2026-11-01",
    "2026-11-01",
    namesFrom([{ Name: "ערב", Date: "2026-10-30T22:00:00.000Z" }]),
  );
  assert.equal(hDayTitle(days[1]).t, "ערב");
  assert.equal(
    hDayTitle(days[0]).t,
    "יום ו׳ 30.10.26",
    "no record → the plain date",
  );
});
test("#4 no Festival Days record / name without a date → plain date (subtitle = date only when the name lacks it)", () => {
  const days = buildDays("2026-11-01", "2026-11-02", "2026-11-01", {
    "2026-11-02": "יום תחרות",
  });
  assert.deepEqual(hDayTitle(days[0]), { t: "יום א׳ 1.11.26", s: "" });
  assert.deepEqual(hDayTitle(days[1]), { t: "יום תחרות", s: "יום ב׳ 2.11.26" });
  assert.deepEqual(hDayTitle(null), { t: "", s: "" });
});
test("#4 every day title in the UI goes through hDayTitle; status panel flags hidden Festival Days fields", () => {
  assert.doesNotMatch(src, /dayBar\(/);
  assert.equal((src.match(/hDayTitle\(/g) || []).length, 6);
  assert.match(
    idx,
    /const ds = fdDate\(v\.raw\(FESTIVAL_DAY_FIELDS\.date\)\);/,
  );
  assert.match(
    idx,
    /Festival Days · Date \(התאמה לתאריך\)[\s\S]*?'לא נמצא ✗'[\s\S]*?כותרות הימים = התאריך בלבד/,
  );
  assert.match(
    idx,
    /Festival Days · שם \(כותרת היום\)[\s\S]*?השדה הראשי מוסתר מהאלמנט/,
  );
});
test("#1 window names back to 12.5px, 2 lines clamped, card stays 28px", () => {
  assert.match(HCSS, /\.htl\{--wcH:28px\}/);
  assert.match(
    HCSS,
    /\.htl \.wc \.nm\{font-size:12\.5px;[^}]*-webkit-line-clamp:2/,
  );
  assert.doesNotMatch(HCSS, /\.wc \.nm\{font-size:9px/);
});
test("#2 cross-section title + toggle in the cross-section colour; #3 day titles in ink", () => {
  assert.match(HCSS, /\.htl \.wh b\{color:var\(--sdk-redDark1\)\}/);
  assert.match(
    HCSS,
    /\.htl \.wh \.tog\.on \.sw\{background:var\(--sdk-redDark1\)\}/,
  );
  assert.match(HCSS, /\.htl \.ban \.ctr \.big\{color:var\(--sdk-grayDark1\)\}/);
  assert.match(
    HCSS,
    /\.htl \.hdp\{background:white;color:var\(--sdk-grayDark1\)/,
  );
  assert.doesNotMatch(src, /className="hdp"[^>]*phaseBg/);
});
