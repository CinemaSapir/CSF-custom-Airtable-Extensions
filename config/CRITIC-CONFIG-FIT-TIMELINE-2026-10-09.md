# Critic — does the timeline fit Extension_Config? (2026-10-09 19:50 IL, read-only)

**Compared:** the design (`DESIGN-EXTENSION-CONFIG-2026-10-09.md` §4, row `program-by-day`) against the live DEMO page and the A-v4 mockup.
- **(a) Live page:** pagPs4kng0DiKgxrl «פרוגרמה - לפי יום», appiN9MrP73g6R9hi, a customElement on Slots_Events. It was read with `list_pages_for_base` and `list_records_for_page`, plus the earlier screenshots in `/workspace/evidence-program-hide-empty-2026-10-09/`.
  - The connector does not expose a custom element's in-page controls: `describe_page_element` only returns generic element schemas. Live toggle and dropdown states therefore come from those screenshots.
- **(b) A-v4:** `/workspace/csf-days-screens-2026-10-09/mockups/A-v4-timeline.html`.
- Nothing in Airtable was changed.

**Verdict: the pattern fits about 80%.**
- Toggles, dropdowns, texts and the Option_List legend map cleanly.
- Four structural gaps:
  - Toggles have no label slot.
  - A-v4 needs 13 tables, more than the 10 Source_Table slots.
  - Facet filters cross tables, while Filter_N takes one field each.
  - «רק שלי» needs a "current user" value.
- A-v4 and the live page are **different variants**: columns are tables in A-v4 and Locations on the live page. They should be two Variant rows, `by-location` (live) and `timeline` (A-v4).

## 1. Control-by-control

Legend: ✅ match · ⚠️ mismatch · ➕ no slot yet

### Identity, texts
| Item (live / A-v4) | Config slot | | Fix |
|---|---|---|---|
| Page name «פרוגרמה - לפי יום» / banner title «טיימליין» | Title | ⚠️ two names | Pick one: Title = «טיימליין» on the `timeline` variant, keep «פרוגרמה – לפי יום» on `by-location`. the owner decides. |
| Day banner «יום 2 · יום ב׳ 2.11.26» | Heading_1 (pattern `יום {n} · {date}`) | ➕ | Put the pattern in Heading_1 and list the tokens in Slot_Map. |
| Phase names הכנות / פסטיבל / פירוק וסיכום | Heading_2–4 | ➕ | Map to Heading_2–4. |
| Column headers = table names (13) | Table_Heading_1–10 | ⚠️ 13 > 10 | Put the table → label mapping in **Option_List_1** (see §3), not in Table_Heading. Use Table_Heading_1 only for the axis «שעה». |
| Search placeholder «חיפוש…» | Helper_Text_1 | ➕ | Map to Helper_Text_1. |
| Res menu note «כמה זמן רואים במסך אחד…» | Helper_Text_2 | ➕ | Map to Helper_Text_2. |
| Window line «↔ עוקב אחרי הסינון של ציר הזמן…» | Helper_Text_3 | ➕ | Map to Helper_Text_3. |
| Strip tooltips «סגור · N פריטים היום · לחצו לפתיחה» and «ריק ביום הזה · לחצו לפתיחה» | Helper_Text_4–5 | ➕ | Map to Helper_Text_4–5. |
| «חתך רוחב», «כל היום», «X מתוך Y», «↔ כמו בציר הזמן», «נקה הכל ✕», «נקה סינון חלון ✕» | Content_Text_1–6 | ➕ | Map to Content_Text_1–6. |
| «אין פריטים שתואמים לסינון», «אין אירועים מתוזמנים בחתך הזה», «אין פריטים בחלון לפי הסינון שלו» | Empty_State_Text_1–3 | ➕ | Map to Empty_State_Text_1–3. |
| «עכשיו», «קפיצה ל…», «קפוץ», «ביטול» | Button_Text_1–4 | ➕ | Map to Button_Text_1–4. |

### Toggles (checked = starts ON)
| Live label (state) / A-v4 label (default) | Config slot (design) | | Fix |
|---|---|---|---|
| «הסתר מיקומים ריקים» (live **OFF**) / «כווץ טבלאות ריקות ביום» (A-v4 **ON**) | Toggle_1, design: ON | ⚠️ wording ×2; live default differs | **One concept, one name: «כווץ עמודות ריקות».** On `by-location` a column is a location, on `timeline` a table. A-v4 retracts to a strip instead of hiding, so «כווץ» is the accurate word. Tick Toggle_1 on both rows; the live page is OFF today, so it needs the Omni prompt. |
| «כווץ משבצות ריק» (live **ON**) / «כווץ שעות ריקות» (A-v4 **OFF**; v3 said «כווץ זמן ריק») | Toggle_2, design: no default stated | ⚠️ wording ×3; defaults differ | Name: **«כווץ שעות ריקות»**. The default needs the owner's call. Suggest OFF on `timeline`, because Res now controls zoom, and ON on `by-location`. Write the default into the design. |
| — / «חתך רוחב (חלון למעלה)» (ON) | none | ➕ | Toggle_3 = cross-section shown, ticked. |
| — / «↔ כמו בציר הזמן» window linked (ON) | none | ➕ | Toggle_4 = window follows the timeline filters, ticked. |
| — / «רק שלי» (OFF) | none | ➕ | Toggle_5 = starts OFF. The match rule is in §2. |
| — / window «רק שלי» (OFF) | none | ➕ | Same rule as Toggle_5. No separate default is needed: unlinking copies the timeline state. |
| Toggle labels in general | — | ⚠️ **gap** | Toggle_N holds only the default; there is no label slot. Rule: Toggle_N's label = Content_Text_(10+N). Toggle_1–5 → Content_Text_11–15 uses all 15 Content_Text slots, so the design must state this rule or add Toggle_Label_1–10 (a new Omni prompt). |

### Dropdowns
| Live (default) / A-v4 (default) | Config slot | | Fix |
|---|---|---|---|
| «צבע לפי» (סוג ארוע) / none: A-v4 colours by table | Dropdown_1 = `Slots_Events.Type` | ⚠️ | `timeline`: Dropdown_1, label empty, default «טבלה» (fixed setting). `by-location`: keep `Slots_Events.Type`. Spelling: «סוג **אירוע**», not «סוג ארוע». The live page also says «סוג משבצת» in its top filter, so use one name: «סוג משבצת». |
| «ערכת צבעים» (ברירת מחדל) / none: fixed crimson theme | Dropdown_2 | ⚠️ | `timeline`: label empty, so the setting is hidden; theme from Color_1–3 (§3). |
| «סקאלת זמן» (30 דקות) / «רזולוציה» (6 שעות במסך) | Duration_1 = 30 min | ⚠️ **different concept** | The live value is a row scale; A-v4's is the time one screen shows. Use one word, **«רזולוציה»**. Make it **Dropdown_3**: empty source, so choices come from Option_List_3 (`60 \| שעה`, `180 \| 3 שעות`, `360 \| 6 שעות`, `720 \| 12 שעות`, `1440 \| יממה`), default `360`. Retire Duration_1 for `timeline`. |
| «גודל טקסט» (רגיל) / none | Dropdown_3 (design) | ⚠️ slot clash with Res | Move to Dropdown_4, label empty, default רגיל, or drop it on `timeline`. |
| «תצוגה שנייה» (פרויקט) / none: card sub-line is fixed | Dropdown_4 (design) | ⚠️ | Hidden on `timeline`, or Dropdown_5, label empty. |
| «יום» (Sun 01.11, English weekday) / replaced by «קפיצה ל…» picker | Dropdown_5 = day | ⚠️ | `timeline`: Jump-to is a picker, not a dropdown, so it gets Button_Text_2–4, Date_1 (first day) and Date_2 (last day). If the live page keeps «יום», format it «יום א׳ 1.11». |
| «טבלאות» (all 13) / none on live | none | ➕ | Comes from Option_List_1 (§3). No Dropdown slot is needed: it is a multi-select of the table list. |
| Res steps, cross-section 20% | none | ➕ | Res is Dropdown_3 above. Band: **Number_1 = 0.2** (fraction of the screen). Max window cards: Number_2 = 6. Strip width: Number_3 = 30 (px). |

### Filters (label filled = shown in page; empty = hidden fixed)
| Live / A-v4 | Config slot | | Fix |
|---|---|---|---|
| Live top bar: הפקה, תוכן, סטטוס, סוג משבצת, Location, מסגרות תוכן (native page filters) / A-v4: מיקום/אולם, אדם/צוות, סרט, סטטוס | Filter_1–4 | ⚠️ different sets; «Location» in English, «מיקום/אולם», «מיקומים» | One word: **«מיקום»**. Shown filters on `timeline`: Filter_1 «מיקום», Filter_2 «אדם», Filter_3 «סרט», Filter_4 «סטטוס». «אדם/צוות» collides with the «צוות» table; rename to «אדם». |
| A-v4 facets span 13 tables (e.g. hall via the linked slot) | Filter_N = one `Table.Field` | ⚠️ **gap** | Allow several fields joined with `\|`, e.g. `Slots_Events.Location \| Staffing.Slots_Events.Location \| …`, or put a facet map in Advanced_JSON. The design should state which. |
| «סטטוס» values are mixed: Todo / In progress / Done, and Tasks' לא התחילה / בתהליך / הושלמה | Filter_4 + Option_List_2 | ⚠️ | Option_List_2 maps each status value to one Hebrew label (`Todo \| לביצוע`, `לא התחילה \| לביצוע` …). |
| «חיפוש» free text | none | ➕ | Not a filter slot. The placeholder is Helper_Text_1. |
| «רק שלי» | none | ➕ **gap** | Filter_5 = `People` link, value token **`@me`**, label «רק שלי». The design needs (1) a value token for the current user and (2) Source_Field_1 = `People.User` (or equivalent) to map the Airtable user to a People record. |
| Hidden fixed filters | Filter_N, label empty | ⚠️ missing | See §2. |

### Legend
| Live / A-v4 | Config slot | | Fix |
|---|---|---|---|
| Live: about 18 legend chips, Type → Airtable select colour / A-v4: 13 table colours, a dot plus a coloured header edge, **no icons** (the owner's order) | Option_List_1 `ערך \| תווית \| צבע \| אייקון`, Icon_1–10 | ⚠️ the design example puts an emoji in the 4th part | Mark the icon part **optional, blank = no icon, render nothing (no placeholder)** in the design and the hook. Leave Icon_1–10 empty on `timeline`. Lists can keep its icons; same format, different row. |
| Live colours are Airtable select colours (blueBright…); A-v4 uses crimson #dc043b plus muted tints | Color_1–10 | ⚠️ | `timeline`: Color_1 #dc043b (theme/banner, festival), Color_2 #7d1f3f (prep), Color_3 #4f5466 (wrap-up). Table colours go in Option_List_1's colour part. |
| Legend title | Title (design: "Title, legend title") | ⚠️ Title is already the page title | Legend title → Heading_5. |

### Controls with no slot at all (UI state, not config)
| A-v4 control | Proposal |
|---|---|
| Column ✕ retract / strip reopen | Per-user state, remembered locally like toggle flips; no config slot. Texts: Helper_Text_4–5. Optional Advanced_JSON `{"closedByDefault":[…]}` if the owner ever wants a table to start closed. |
| «עכשיו» | Button_Text_1. Behaviour: real Israel time; outside the programme it falls back to Date_1 (first day) / Date_2 (last day). |
| «קפיצה ל…» picker | Button_Text_2–4. Quick times «בוקר 09:00 · צהריים 13:00 · ערב 19:00 · לילה 22:30» → Option_List_4 (`09:00 \| בוקר` …). |
| «תצוגה» menu (holds Toggle_2–4) | The menu name goes in Tab_Label_1. |

## 2. Hidden fixed filters the page needs (label empty)
The live page currently returns 48 Slots_Events, 24 of them «DEMO Slot NN» with **no Start**. Those cannot be placed on a timeline.
1. `Slots_Events.Start` · is not empty.
2. `Slots_Events.Type` · is not · `למחיקה|לא מוגדר / לא לשבץ`.
3. `Slots_Events.Start` · is after · Date_1 − 1 day (programme range; the first prep day is 16.10). This needs a value token, `@Date_1`, or keep it in code.
4. `Tasks.Status` · is not · `בוטלה|הועברה לאחר`.
5. Keep cancelled slots **visible**, struck through, as A-v4 does. So no filter on `Slots_Events.Status = בוטל`; say so in Slot_Map.

**Gap:** there are only 5 Filter slots for 13 tables, and they are shared with the 4 shown filters plus «רק שלי». Fix: per-table "has a date" rules stay in code, and extra hidden filters go in Advanced_JSON `{"hiddenFilters":[…]}`. Otherwise Filter_N must grow to ×10 (a new Omni prompt).

## 3. Sources (enable on the element)
- Design §4 lists Source_Table_1–5 = Slots_Events, Tasks, Projects, Locations, Areas.
- The live element already has 15 tables enabled: Slots_Events, Tasks, Projects, Locations, Complexes, Requests, Roles, Areas, finance_team_approval, Budget_lines, Partners, Documents, Petty Cash, Notebook, Files and Links.
- **A-v4 also needs:** Staffing, Invitations, Itinerary, Lodging, Booking Resources, Social Posts, transactions, Approvals, plus People, Films, Festival Days (facets and «רק שלי») and Extension_Config itself.
- That is 13 timeline tables plus 3 lookup tables, more than Source_Table_1–10. **Fix:** Option_List_1 is the table list, one line per table: `Staffing | צוות | #9e1a44 |` (icon blank). Source_Table_1–3 hold only People / Films / Festival Days.
- Design `Source_Field` "Day": the live element's Day field is **None**. Remove it from §4, or set it to `Slots_Events.Festival Days`.

## 4. Countdown mockup — shared visual language?
`/workspace/countdown-mockup-2026-10-09/` exists (index.html plus 3 PNGs). **Verdict: not yet one language.**

| | Countdown | A-v4 timeline | Fix |
|---|---|---|---|
| Font | 'Segoe UI', 'Open Sans', 'Noto Sans Hebrew' | "Segoe UI", Heebo, Rubik, "Open Sans" | ⚠️ Same first choice, different fallbacks, so the box renders them differently. Use one stack: `'Segoe UI', Heebo, 'Open Sans', sans-serif`. |
| Digits | clock and fractions `direction:ltr`, tabular-nums ✅ | times in `<bdi dir=ltr>` ✅, no tabular-nums | ✅ Add `font-variant-numeric:tabular-nums` to the A-v4 clock and times. |
| Theme colour | none; tiles use `hsl(i*54)` hue wheel and title gradient = **rainbow**; cream background #faf7f2 | crimson #dc043b plus muted crimson-family tints; grey background #f5f5f7 | ⚠️ Rainbow breaks the owner's "not a rainbow / match base theme" note. Countdown tiles should take Color_1–5 from the same crimson family. Choose one background (cream or cool grey) for both. |
| Pills | one pill («הפסטיבל חי», radius 999, green) | filter, window and legend pills radius 12–14, crimson tint | ⚠️ Shared pill: radius 999, 12.5–13px/700, tint = 12% of the colour, border = the colour. Make the «חי» dot crimson, or keep green as the only "live" colour in both. |
| Toggles | none | crimson switch 30×16 | Countdown has no toggle yet. When Toggle_1 (seconds) gets a UI, reuse A-v4's `.tog`. |
| Radii / cards | 16–20px, soft shadow | 7–10px, flat | ⚠️ Pick one card radius (12px) and shadow. |

## 5. Top fixes (order)
1. One name per concept: «כווץ עמודות ריקות», «כווץ שעות ריקות», «רזולוציה», «מיקום», «אדם», «סוג משבצת». Write them into the Slot_Map defaults.
2. Two Variant rows, `by-location` (live) and `timeline` (A-v4), with defaults stated: Toggle_1 ON; Toggle_2 the owner's call; Toggle_3 and 4 ON; Toggle_5 OFF.
3. Add the toggle-label rule (Toggle_N label = Content_Text_(10+N)), or new Toggle_Label_N fields.
4. Option_List_1 = the table list (value|label|colour|blank icon), to get past the 10 Source_Table and 10 Table_Heading limits.
5. Res = Dropdown_3 with Option_List_3 steps (default 360); the 20% band = Number_1.
6. «רק שלי» = Filter_5 with an `@me` token plus a People↔User Source_Field (a design addition).
7. Hidden fixed filters: Start not empty; Type not למחיקה / לא לשבץ; programme date range. Overflow goes to Advanced_JSON.
8. The icon part of Option_List is optional and blank renders nothing. Countdown adopts the crimson family instead of the rainbow.
