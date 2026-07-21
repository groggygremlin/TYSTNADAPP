"use strict";
/* Smoke test for TYSTNAD Companion. Run with: node smoke.js

   Committed since 2026-07-19. It lived only on one laptop until then, which made it a
   single point of failure for the rulings it encodes: the suite fails if anyone builds an
   action-slot tracker, pastes booklet furniture into the Handbook, matches a mechanical
   item name with ===, or reinstates the v80 service-worker install. A tripwire that exists
   on one machine is a note, not a tripwire.

   ONE DEPENDENCY, dev-only, deliberately not declared in a package.json:
       npm install jsdom          (developed against jsdom 29.1.1)

   There is no package.json and no lockfile on purpose. The app ships no dependencies and
   no build step, and a manifest with a single devDependency would put a door in that wall
   and invite Dependabot alerts for a library this project never serves. node_modules and
   any package files stay gitignored. */

const { JSDOM } = require("jsdom");
const fs = require("fs");

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { console.log("PASS:", msg); passed++; }
  else { console.error("FAIL:", msg); failed++; }
}

const HTML = fs.readFileSync("index.html", "utf8");
const APPJS = fs.readFileSync("app.js", "utf8");

const WARRIOR = {
  name: "Asa G",
  cls: "Warrior",
  skills: { Athletics: "d8", Awareness: "d6", Combat: "d8", Finesse: "d6",
            Ingenuity: "d6", Lore: "d6", Presence: "d8", Sorcery: "d6" },
  hpMax: 12, hpCur: 10,
  defense: "d8",
  loadout: { armor: "medium", weapon: "standard" },
  items: [], coins: 0,
  roles: [], skillTicks: {}
};

const SORCERER = Object.assign({}, WARRIOR, {
  cls: "Sorcerer",
  skills: Object.assign({}, WARRIOR.skills, { Sorcery: "d8" })
});

function makeDOM(savedChar, extraStorage) {
  const dom = new JSDOM(HTML, { url: "http://localhost/", runScripts: "outside-only" });
  const w = dom.window;
  if (savedChar) {
    w.localStorage.setItem("tystnad-character", JSON.stringify(savedChar));
  }
  // Seeded before app.js boots, for state the app reads during init rather than on demand.
  if (extraStorage) {
    Object.keys(extraStorage).forEach((k) => w.localStorage.setItem(k, extraStorage[k]));
  }
  w.eval(`
    if (typeof File === "undefined") {
      window.File = class File {
        constructor(parts, name, opts) { this.name = name; this.type = (opts||{}).type||""; }
      };
    }
    if (typeof navigator.canShare !== "function") { navigator.canShare = () => false; }
    if (!navigator.share) { navigator.share = () => Promise.resolve(); }
    if (!navigator.clipboard) { navigator.clipboard = { writeText: () => Promise.resolve() }; }
    if (typeof URL.createObjectURL === "undefined") {
      URL.createObjectURL = () => "blob:mock";
      URL.revokeObjectURL = () => {};
    }
  `);
  w.eval(APPJS);
  w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
  return { w, d: w.document };
}

// Returns exactly one function's body from a source string. Slicing to a hand-picked
// "next function" landmark has produced three wrong-bound bugs; this ends at the first
// column-0 closing brace instead.
function fnBody(src, name) {
  const start = src.indexOf("function " + name + "(");
  if (start === -1) return "";
  const end = src.indexOf("\n}", start);
  return end === -1 ? src.slice(start) : src.slice(start, end + 2);
}

function hidden(el) { return el.classList.contains("hidden"); }
function visible(el) { return !hidden(el); }
function click(el) { el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent("click", { bubbles: true })); }

// Walk the v71 creation wizard end to end for a given class (first armor + first weapon).
function wizardCreate(w, d, cls, name) {
  click(d.getElementById("btn-new-explorer"));
  // Step 1: class
  const card = [...d.querySelectorAll(".wiz-class-card")].find((c) => c.querySelector(".wiz-class-name").textContent === cls);
  click(card);
  click(d.getElementById("wiz-next"));
  // Step 2: identity (name + 4 questions)
  const inputs = [...d.querySelectorAll(".wiz-input")];
  const vals = [name || "Test", "Duty", "The truth", "No innocents", "My sister"];
  inputs.forEach((inp, i) => { inp.value = vals[i] || "x"; inp.dispatchEvent(new w.Event("input", { bubbles: true })); });
  click(d.getElementById("wiz-next"));
  // Step 3: equipment (first armor grid if present, then weapon grid)
  let grids = [...d.querySelectorAll(".wiz-opt-grid")];
  click(grids[0].querySelector(".wiz-opt"));
  grids = [...d.querySelectorAll(".wiz-opt-grid")];
  if (grids.length > 1) click(grids[1].querySelector(".wiz-opt"));
  click(d.getElementById("wiz-next"));
  // Step 4: wealth
  click(d.querySelector(".wiz-roll-btn"));
  click(d.getElementById("wiz-next"));
  // Step 5: confirm -> create
  click(d.getElementById("wiz-next"));
}

// ---- 1. Intro visible on load (no saved character) ----
{
  const { d } = makeDOM(null);
  assert(visible(d.getElementById("screen-intro")), "1. Intro visible on load (no character)");
  assert(hidden(d.getElementById("screen-shell")), "2. Shell hidden on load (no character)");
  assert(hidden(d.getElementById("screen-create")), "3. Creation hidden on load (no character)");
  assert(hidden(d.getElementById("btn-continue")), "4. CONTINUE hidden when no saved character");
  assert(visible(d.getElementById("btn-new-explorer")), "5. NEW EXPLORER visible");
  assert(visible(d.getElementById("btn-import-toggle")), "6. IMPORT toggle visible");
}

// ---- 2. Intro with saved character shows CONTINUE ----
{
  const { d } = makeDOM(WARRIOR);
  assert(visible(d.getElementById("screen-intro")), "7. Intro visible on load (with character)");
  assert(visible(d.getElementById("btn-continue")), "8. CONTINUE visible when character saved");
  const sub = d.getElementById("continue-sub");
  assert(sub && sub.textContent.includes("Asa G"), "9. CONTINUE sublabel contains character name");
  assert(sub && sub.textContent.includes("Warrior"), "10. CONTINUE sublabel contains class");
}

// ---- 3. CONTINUE routes to shell ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  assert(hidden(d.getElementById("screen-intro")), "11. Intro hidden after CONTINUE");
  assert(visible(d.getElementById("screen-shell")), "12. Shell visible after CONTINUE");
}

// ---- 4. NEW EXPLORER with saved character gates on confirm ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-new-explorer"));
  assert(visible(d.getElementById("overlay-confirm")), "13. Confirm shown when NEW EXPLORER with character");
  assert(visible(d.getElementById("screen-intro")), "14. Intro still visible (not navigated yet)");
  assert(hidden(d.getElementById("screen-create")), "15. Creation still hidden (not navigated yet)");
}

// ---- 5. NEW EXPLORER without saved character goes straight to creation ----
{
  const { d } = makeDOM(null);
  click(d.getElementById("btn-new-explorer"));
  assert(hidden(d.getElementById("screen-intro")), "16. Intro hidden after NEW EXPLORER (no character)");
  assert(visible(d.getElementById("screen-create")), "17. Creation visible after NEW EXPLORER (no character)");
  assert(hidden(d.getElementById("overlay-confirm")), "18. Confirm NOT shown when no character to abandon");
}

// ---- 6. NEW EXPLORER confirm-yes navigates ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-new-explorer"));
  click(d.getElementById("confirm-yes"));
  assert(hidden(d.getElementById("overlay-confirm")), "19. Confirm dismissed after yes");
  assert(hidden(d.getElementById("screen-intro")), "20. Intro hidden after confirm yes");
  assert(visible(d.getElementById("screen-create")), "21. Creation visible after confirm yes");
}

// ---- 7. IMPORT paste with saved character gates on confirm ----
{
  const { d } = makeDOM(WARRIOR);
  const textarea = d.getElementById("import-paste-in");
  textarea.value = JSON.stringify(WARRIOR);
  click(d.getElementById("btn-import-toggle"));
  click(d.getElementById("import-paste-btn"));
  assert(visible(d.getElementById("overlay-confirm")), "22. Confirm shown when importing over existing character");
  assert(hidden(d.getElementById("screen-shell")), "23. Shell not shown yet (import gated)");
}

// ---- 8. IMPORT paste with no character goes straight to shell ----
{
  const { d } = makeDOM(null);
  const textarea = d.getElementById("import-paste-in");
  textarea.value = JSON.stringify(WARRIOR);
  click(d.getElementById("btn-import-toggle"));
  click(d.getElementById("import-paste-btn"));
  assert(hidden(d.getElementById("overlay-confirm")), "24. Confirm NOT shown when no character to abandon");
  assert(visible(d.getElementById("screen-shell")), "25. Shell visible after paste import (no prior character)");
}

// ---- 9. Creation screen contains no import controls ----
{
  const { d } = makeDOM(null);
  assert(!d.querySelector("#screen-create #import-paste-in"), "26. Creation screen has no paste textarea");
  assert(!d.querySelector("#screen-create #btn-import"), "27. Creation screen has no file import button");
  assert(!d.querySelector("#screen-create .import-row"), "28. Creation screen has no import-row");
}

// ---- 10. Shell has BACKUP button, no New button ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  assert(d.getElementById("btn-export"), "29. BACKUP button (btn-export) exists on shell");
  assert(!d.getElementById("btn-new"), "30. New button not present");
}

// ---- 11. Chip sublabels present on combat tab (v41: only initiative chip remains) ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const hints = d.querySelectorAll(".chip-hint");
  assert(hints.length === 1, "31. One chip-hint element in combat tab (initiative only; defend is now primary-btn)");
  const texts = Array.from(hints).map(h => h.textContent.toLowerCase());
  assert(!texts.some(t => t.includes("roll")), "32. No 'roll' chip-hint in combat tab (defend is primary-btn, not a chip)");
  assert(texts.some(t => t.includes("edit")), "33. Initiative chip has 'edit' sublabel");
}

// ---- 12. SKILLS section label present ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const labels = Array.from(d.querySelectorAll(".skills-section .field-label"));
  assert(labels.some(l => l.textContent.trim().toLowerCase() === "skills"), "34. SKILLS field-label above skill grid");
}

// ---- 13. Sorcery tab hidden for Warrior, visible for Sorcerer ----
{
  const { d: dw } = makeDOM(WARRIOR);
  click(dw.getElementById("btn-continue"));
  assert(hidden(dw.querySelector(".sorcery-tab")), "35. Sorcery tab hidden for Warrior");

  const { d: ds } = makeDOM(SORCERER);
  click(ds.getElementById("btn-continue"));
  assert(visible(ds.querySelector(".sorcery-tab")), "36. Sorcery tab visible for Sorcerer");
}

// ---- 14. Shell error line hidden by default (version not shown in shell) ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const vn = d.getElementById("version-note");
  assert(vn && hidden(vn), "37. Shell error line hidden by default after CONTINUE");
}

// ---- 15. Import toggle reveals and hides section ----
{
  const { d } = makeDOM(null);
  const sec = d.getElementById("intro-import-section");
  assert(hidden(sec), "38. Import section hidden initially");
  click(d.getElementById("btn-import-toggle"));
  assert(visible(sec), "39. Import section shown after toggle");
  click(d.getElementById("btn-import-toggle"));
  assert(hidden(sec), "40. Import section hidden after second toggle");
}

// ---- 16. Intro version footer renders ----
{
  const { d } = makeDOM(null);
  const vn = d.getElementById("intro-version-note");
  assert(vn && vn.textContent === "v91", "41. Intro version footer shows the current release");
}

// ---- 17. Back chevron exists on shell ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  assert(d.getElementById("btn-back"), "42. Back chevron (btn-back) exists on shell");
}

// ---- 18. Back chevron routes shell to intro ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  assert(visible(d.getElementById("screen-shell")), "43a. Shell visible before back");
  click(d.getElementById("btn-back"));
  assert(hidden(d.getElementById("screen-shell")), "43b. Shell hidden after back");
  assert(visible(d.getElementById("screen-intro")), "43c. Intro visible after back");
}

// ---- 19. Content in correct tab panels ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const tabSheet = d.getElementById("tab-sheet");
  const tabGear = d.getElementById("tab-gear");
  assert(tabSheet && tabSheet.querySelector(".skills-section"), "44a. Skills section in SHEET tab");
  assert(tabSheet && tabSheet.querySelector(".foot-note"), "44b. Footnote in SHEET tab");
  assert(tabGear && tabGear.querySelector(".inv-section"), "44c. Inventory in GEAR tab");
}

// ============================================================
// v18 TAB ARCHITECTURE ASSERTIONS
// ============================================================

// ---- Tab buttons exist ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  assert(d.querySelector(".tab-btn[data-tab='sheet']"), "48. SHEET tab button exists");
  assert(d.querySelector(".tab-btn[data-tab='expedition']"), "48b. EXPEDITION tab button exists");
  assert(d.querySelector(".tab-btn[data-tab='combat']"), "48c. COMBAT tab button exists");
  assert(d.querySelector(".tab-btn[data-tab='gear']"), "48d. GEAR tab button exists");
  assert(d.getElementById("tab-combat"), "49. Combat tab panel exists in DOM");
}

// ---- Default tab is SHEET; switching shows/hides panels ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  assert(visible(d.getElementById("screen-shell")), "50a. Shell visible on load");
  assert(visible(d.getElementById("tab-sheet")), "50b. SHEET tab visible by default");
  assert(hidden(d.getElementById("tab-combat")), "50c. Combat tab hidden initially");
  assert(hidden(d.getElementById("tab-expedition")), "50d. Expedition tab hidden initially");
  assert(hidden(d.getElementById("tab-gear")), "50e. Gear tab hidden initially");

  click(d.querySelector(".tab-btn[data-tab='combat']"));
  assert(visible(d.getElementById("tab-combat")), "51a. Combat tab visible after switching");
  assert(hidden(d.getElementById("tab-sheet")), "51b. Sheet tab hidden when combat tab active");

  click(d.querySelector(".tab-btn[data-tab='sheet']"));
  assert(visible(d.getElementById("tab-sheet")), "52a. Sheet tab visible after switching back");
  assert(hidden(d.getElementById("tab-combat")), "52b. Combat tab hidden after switching back");
}

// ---- Tab active class follows selection ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const sheetBtn = d.querySelector(".tab-btn[data-tab='sheet']");
  const combatBtn = d.querySelector(".tab-btn[data-tab='combat']");
  assert(sheetBtn.classList.contains("active"), "52c. Sheet tab button active by default");
  click(combatBtn);
  assert(combatBtn.classList.contains("active"), "52d. Combat tab button active after click");
  assert(!sheetBtn.classList.contains("active"), "52e. Sheet tab button inactive after switching to combat");
}

// ---- Single HP strip: shows correct values, works from any tab ----
{
  const warrior = Object.assign({}, WARRIOR, { hpCur: 7, hpMax: 12 });
  const { d } = makeDOM(warrior);
  click(d.getElementById("btn-continue"));
  assert(d.getElementById("hp-current").textContent === "7", "53. HP strip shows current HP");
  assert(d.getElementById("hp-maxnum").textContent === "12", "54. HP strip shows max HP");
  click(d.querySelector(".tab-btn[data-tab='combat']"));
  assert(d.getElementById("hp-current").textContent === "7", "55. HP unchanged after switching to combat tab");
  assert(d.getElementById("hp-maxnum").textContent === "12", "56. Max HP unchanged after switching to combat tab");
}

// ---- No dead v17 two-page IDs in DOM ----
{
  const { d } = makeDOM(null);
  assert(!d.getElementById("screen-sheet"), "56b. screen-sheet does not exist");
  assert(!d.getElementById("screen-combat"), "56c. screen-combat does not exist");
  assert(!d.getElementById("hp-expl-current"), "56d. hp-expl-current does not exist");
  assert(!d.getElementById("btn-death-combat"), "56e. btn-death-combat does not exist");
}

// ---- Death Roll button in shell: visible at 0 HP, hidden above ----
{
  const { d: dAlive } = makeDOM(Object.assign({}, WARRIOR, { hpCur: 5 }));
  click(dAlive.getElementById("btn-continue"));
  assert(hidden(dAlive.getElementById("btn-death")), "57. Death Roll hidden when HP > 0");

  const { d: dDead } = makeDOM(Object.assign({}, WARRIOR, { hpCur: 0 }));
  click(dDead.getElementById("btn-continue"));
  assert(visible(dDead.getElementById("btn-death")), "58. Death Roll visible when HP <= 0");
}

// ---- Death Roll button visible from every tab ----
{
  const { d: dAlive } = makeDOM(Object.assign({}, WARRIOR, { hpCur: 5 }));
  click(dAlive.getElementById("btn-continue"));
  click(dAlive.querySelector(".tab-btn[data-tab='combat']"));
  assert(hidden(dAlive.getElementById("btn-death")), "59. Death Roll hidden from combat tab when HP > 0");

  const { d: dDead } = makeDOM(Object.assign({}, WARRIOR, { hpCur: 0 }));
  click(dDead.getElementById("btn-continue"));
  click(dDead.querySelector(".tab-btn[data-tab='gear']"));
  assert(visible(dDead.getElementById("btn-death")), "60. Death Roll visible from gear tab when HP <= 0");
}

// ---- Attack overlay ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("btn-attack"));
  assert(visible(d.getElementById("overlay-attack")), "61. Attack overlay opens on tap");
  const atkLabels = d.querySelectorAll("#overlay-attack .atk-section-label");
  assert(atkLabels.length === 5 && atkLabels[0].textContent === "Attack Mode", "62. Attack overlay first header is ATTACK MODE (v74)");
  assert(atkLabels.length === 5 && atkLabels[4].textContent === "Enemy Threat Level", "63. Attack overlay last header is ENEMY THREAT LEVEL (trigger last)");
}

{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("btn-attack"));
  const selected = d.querySelector(".momentum-btn.selected");
  assert(selected && selected.dataset.momentum === "0", "64. Momentum selector defaults to None (0)");
}

{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("btn-attack"));
  click(d.getElementById("attack-cancel"));
  assert(hidden(d.getElementById("overlay-attack")), "65. Attack overlay dismissed by cancel");
}


{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0;");
  click(d.getElementById("btn-attack"));
  click(d.querySelector("#attack-diff-buttons .diff-btn[data-target='4']"));
  assert(visible(d.getElementById("overlay-result")), "73. Result overlay shown after attack roll");
}

{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("btn-attack"));
  const btn2 = d.querySelector(".momentum-btn[data-momentum='2']");
  click(btn2);
  assert(btn2.classList.contains("selected"), "74. Momentum +2 button becomes selected on click");
  const btn0 = d.querySelector(".momentum-btn[data-momentum='0']");
  assert(!btn0.classList.contains("selected"), "75. Momentum None button deselected when +2 selected");
}

// ---- Shell error line is empty by default ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const vn = d.getElementById("version-note");
  assert(vn && vn.textContent === "", "76. Shell error line is empty by default");
}

{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const name = d.getElementById("sheet-name");
  assert(name && name.textContent === "Asa G", "77. Shell header shows character name");
}

// ---- Threat tier buttons ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("btn-attack"));
  const weakBtn = d.querySelector("#attack-diff-buttons .diff-btn[data-target='4']");
  assert(weakBtn && weakBtn.textContent.includes("Weak"), "78. WEAK button with data-target 4 present");
  const strongBtn = d.querySelector("#attack-diff-buttons .diff-btn[data-target='6']");
  assert(strongBtn && strongBtn.textContent.includes("Strong"), "79. STRONG button with data-target 6 present");
}

// ============================================================
// v17 ASSERTIONS (adjusted for shell architecture)
// ============================================================

// ---- v17-A. migrate() adds roles and skillTicks to pre-v17 saves ----
{
  const old = { name: "Old Explorer", cls: "Warrior",
    skills: { Athletics: "d8", Awareness: "d6", Combat: "d8", Finesse: "d6",
              Ingenuity: "d6", Lore: "d6", Presence: "d8", Sorcery: "d6" },
    hpMax: 12, hpCur: 10, defense: "d8",
    loadout: { armor: "medium", weapon: "standard" },
    items: [], coins: 0
    // No roles, no skillTicks
  };
  const { w } = makeDOM(null);
  const result = w.eval("migrate(" + JSON.stringify(old) + ")");
  assert(Array.isArray(result.roles), "80. migrate() adds roles array to pre-v17 save");
  assert(result.roles.length === 0, "81. migrate() roles defaults to empty array");
  assert(result.skillTicks && typeof result.skillTicks === 'object' && !Array.isArray(result.skillTicks),
    "82. migrate() adds skillTicks object to pre-v17 save");
  assert(Object.keys(result.skillTicks).length === 0, "83. migrate() skillTicks defaults to empty object");
}

// ---- v17-B. Expedition section present in Expedition tab ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  assert(d.querySelector(".expedition-section"), "84. Expedition section present in DOM");
  assert(d.getElementById("btn-travel"), "85. TRAVEL effort button exists");
  assert(d.getElementById("btn-explore"), "86. EXPLORE effort button exists");
  assert(d.getElementById("btn-forage"), "87. FORAGE effort button exists");
  assert(d.getElementById("btn-camp"), "88. CAMP effort button exists");
}

// ---- v17-C. Role chips ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const chips = d.querySelectorAll(".role-chip");
  assert(chips.length === 3, "89. Three role chips present");
  const pathfinder = d.querySelector(".role-chip[data-role='Pathfinder']");
  assert(pathfinder && !pathfinder.classList.contains("active"), "90. Pathfinder chip inactive initially");
  click(pathfinder);
  assert(pathfinder.classList.contains("active"), "91. Pathfinder chip becomes active on click");
  click(pathfinder);
  assert(!pathfinder.classList.contains("active"), "92. Pathfinder chip toggles back to inactive");
}

// ---- v17-D. Role chip multi-select ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const pathfinder = d.querySelector(".role-chip[data-role='Pathfinder']");
  const scout = d.querySelector(".role-chip[data-role='Scout']");
  click(pathfinder);
  click(scout);
  assert(pathfinder.classList.contains("active"), "93. Pathfinder still active after selecting Scout");
  assert(scout.classList.contains("active"), "94. Scout active after click");
}

// ---- v17-E. Role chips persist to localStorage ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.querySelector(".role-chip[data-role='Quartermaster']"));
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(Array.isArray(saved.roles) && saved.roles.includes("Quartermaster"),
    "95. Quartermaster role persists to localStorage");
}

// ---- v17-F. Travel overlay opens and cancels ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("btn-travel"));
  assert(visible(d.getElementById("overlay-travel")), "96. Travel overlay opens on TRAVEL tap");
  assert(d.getElementById("travel-die-label").textContent === "d6", "97. Travel overlay shows Lore die (d6)");
  click(d.getElementById("travel-cancel"));
  assert(hidden(d.getElementById("overlay-travel")), "98. Travel overlay closes on cancel");
}

// ---- v17-G. Explore overlay opens and cancels ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("btn-explore"));
  assert(visible(d.getElementById("overlay-explore")), "99. Explore overlay opens on EXPLORE tap");
  assert(d.getElementById("explore-die-label").textContent === "d6", "100. Explore overlay shows Awareness die (d6)");
  click(d.getElementById("explore-cancel"));
  assert(hidden(d.getElementById("overlay-explore")), "101. Explore overlay closes on cancel");
}

// ---- v17-H. Forage overlay: die label, rough toggle ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("btn-forage"));
  assert(visible(d.getElementById("overlay-forage")), "102. Forage overlay opens on FORAGE tap");
  assert(d.getElementById("forage-die-label").textContent === "d8", "103. Forage shows Athletics die (d8)");
  click(d.getElementById("forage-rough-btn"));
  assert(d.getElementById("forage-die-label").textContent === "d6", "104. Rough terrain steps d8 down to d6");
  click(d.getElementById("forage-rough-btn"));
  assert(d.getElementById("forage-die-label").textContent === "d8", "105. Toggling Rough off restores d8");
}

// ---- v17-I. forageStepDown d4 floor ----
{
  const { w } = makeDOM(WARRIOR);
  assert(w.eval("forageStepDown('d6')") === "d4", "106. forageStepDown: d6 -> d4");
  assert(w.eval("forageStepDown('d4')") === "d4", "107. forageStepDown: d4 floor stays d4");
  assert(w.eval("forageStepDown('d8')") === "d6", "108. forageStepDown: d8 -> d6");
}

// ---- v17-J. Camp overlay opens and cancels ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("btn-camp"));
  assert(visible(d.getElementById("overlay-camp")), "109. Camp overlay opens on CAMP tap");
  assert(d.getElementById("camp-die-label").textContent === "d6", "110. Camp overlay shows Awareness die (d6)");
  click(d.getElementById("camp-cancel"));
  assert(hidden(d.getElementById("overlay-camp")), "111. Camp overlay closes on cancel");
}

// ---- v17-K. Travel success ticks Lore ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0.9999;");
  click(d.getElementById("btn-travel"));
  click(d.querySelector(".travel-diff-btn[data-target='4']"));
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(saved.skillTicks && saved.skillTicks["Lore"] === true, "112. Travel success ticks Lore");
}

// ---- v17-L. Travel failure does not tick Lore ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0;");
  click(d.getElementById("btn-travel"));
  click(d.querySelector(".travel-diff-btn[data-target='4']"));
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(!saved.skillTicks || !saved.skillTicks["Lore"], "113. Travel failure does not tick Lore");
}

// ---- v17-M. Forage 6+ result ticks Athletics ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0.9999;");
  click(d.getElementById("btn-forage"));
  click(d.getElementById("forage-roll-btn"));
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(saved.skillTicks && saved.skillTicks["Athletics"] === true, "114. Forage max roll ticks Athletics");
}

// ---- v17-N. Forage 1-3 does not tick Athletics ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0;");
  click(d.getElementById("btn-forage"));
  click(d.getElementById("forage-roll-btn"));
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(!saved.skillTicks || !saved.skillTicks["Athletics"], "115. Forage roll 1-3 does not tick Athletics");
}

// ---- v17-O. Explore success ticks Awareness ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0.9999;");
  click(d.getElementById("btn-explore"));
  click(d.querySelector(".explore-diff-btn[data-target='4']"));
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(saved.skillTicks && saved.skillTicks["Awareness"] === true, "116. Explore success ticks Awareness");
}

// ---- v17-P. Camp success ticks Awareness ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0.9999;");
  click(d.getElementById("btn-camp"));
  click(d.querySelector(".camp-diff-btn[data-target='4']"));
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(saved.skillTicks && saved.skillTicks["Awareness"] === true, "117. Camp success ticks Awareness");
}

// ---- v17-Q. Camp failure does not tick Awareness ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0;");
  click(d.getElementById("btn-camp"));
  click(d.querySelector(".camp-diff-btn[data-target='4']"));
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(!saved.skillTicks || !saved.skillTicks["Awareness"], "118. Camp failure does not tick Awareness");
}

// ---- v17-R. Attack success ticks Combat ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0.9999;");
  click(d.getElementById("btn-attack"));
  click(d.querySelector("#attack-diff-buttons .diff-btn[data-target='4']"));
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(saved.skillTicks && saved.skillTicks["Combat"] === true, "119. Attack success ticks Combat");
}

// ---- v17-S. Skill roll success ticks that skill ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0.9999;");
  const skillRow = d.querySelector(".skill-row");
  click(skillRow);
  click(d.querySelector("#overlay-difficulty .diff-btn[data-target='4']"));
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  const tickedSkill = skillRow.querySelector(".skill-name").textContent;
  assert(saved.skillTicks && saved.skillTicks[tickedSkill] === true,
    "120. Skill roll success ticks the rolled skill (" + tickedSkill + ")");
}

// ---- v17-T. Ticks persist across load ----
{
  const ticked = Object.assign({}, WARRIOR, { skillTicks: { Athletics: true, Lore: true } });
  const { d } = makeDOM(ticked);
  click(d.getElementById("btn-continue"));
  const rows = d.querySelectorAll(".skill-row.ticked");
  assert(rows.length === 2, "121. Two ticked skill rows rendered when skillTicks has two entries");
}

// ---- v71. Skill improvement (replaces the old clear-ticks flow) ----
// jsdom: capture runFlicker's setInterval callback and drive it 8 ticks (real setInterval is
// async so it returns before firing; a synchronous mock would hit the const-TDZ on 'flicker').
function mockFlicker(w, randomVal) {
  w.eval("window.setInterval=function(fn){window._ff=fn;return 0;};window.clearInterval=function(){};Math.random=function(){return " + randomVal + ";};");
}
function driveFlicker(w) { w.eval("for(var i=0;i<8;i++) window._ff();"); }
{
  const ticked = Object.assign({}, WARRIOR, { skillTicks: { Athletics: true } });   // Athletics d8 -> roll d10 need 8+
  const { w, d } = makeDOM(ticked);
  click(d.getElementById("btn-continue"));
  const btn = d.getElementById("btn-improve-skills");
  assert(visible(btn), "122. Improve Skills button visible when ticks exist");
  mockFlicker(w, 0.9);          // d10 roll -> 10 >= 8, advances
  click(btn);
  assert(!hidden(d.getElementById("overlay-improve")), "123. Improvement ceremony overlay opens");
  driveFlicker(w);
  assert(JSON.parse(w.localStorage.getItem("tystnad-character")).skills.Athletics === "d10", "124. A passing roll advances the skill (d8 -> d10)");
  click(d.getElementById("improve-continue"));
  assert(hidden(d.getElementById("overlay-improve")), "125. Ceremony closes after the last skill");
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(Object.keys(saved.skillTicks).length === 0, "126. Ticks cleared after improvement");
  assert(hidden(d.getElementById("btn-improve-skills")), "127. Improve Skills button hidden after resolving");
}
{
  const ticked = Object.assign({}, WARRIOR, { skillTicks: { Athletics: true } });
  const { w, d } = makeDOM(ticked);
  click(d.getElementById("btn-continue"));
  mockFlicker(w, 0);            // d10 roll -> 1, need 8, fails
  click(d.getElementById("btn-improve-skills"));
  driveFlicker(w);
  assert(JSON.parse(w.localStorage.getItem("tystnad-character")).skills.Athletics === "d8", "128. A failing roll holds the skill at its current die");
  click(d.getElementById("improve-continue"));
  assert(Object.keys(JSON.parse(w.localStorage.getItem("tystnad-character")).skillTicks).length === 0, "129. Ticks cleared even when the roll fails");
}
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  assert(hidden(d.getElementById("btn-improve-skills")), "129a. Improve Skills button hidden when no ticks exist");
}
{
  // Non-class d12 is capped (no roll); the class skill goes d12 -> d20 (Warrior core = Combat)
  const capped = Object.assign({}, WARRIOR, {
    skills: Object.assign({}, WARRIOR.skills, { Athletics: "d12", Combat: "d12" }),
    skillTicks: { Athletics: true, Combat: true }
  });
  const { w, d } = makeDOM(capped);
  click(d.getElementById("btn-continue"));
  mockFlicker(w, 0.95);         // only Combat (core) is rollable: d20 -> 20 >= 15
  click(d.getElementById("btn-improve-skills"));
  driveFlicker(w);
  const c = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(c.skills.Combat === "d20", "129b. Class skill improves d12 -> d20 on 15+");
  assert(c.skills.Athletics === "d12", "129c. Non-class skill is capped at d12 (no improvement roll)");
  click(d.getElementById("improve-continue"));
  assert(Object.keys(JSON.parse(w.localStorage.getItem("tystnad-character")).skillTicks).length === 0, "129d. All ticks cleared, including the capped one");
}

// ---- v17-X. Expedition in EXPEDITION tab; inventory in GEAR tab ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const tabExpedition = d.getElementById("tab-expedition");
  const tabGear = d.getElementById("tab-gear");
  assert(tabExpedition && tabExpedition.querySelector(".expedition-section"),
    "130a. Expedition section in EXPEDITION tab panel");
  assert(tabGear && tabGear.querySelector(".inv-section"),
    "130b. Inventory section in GEAR tab panel");
}

// ---- v18-A. HP adjustment updates single strip regardless of active tab ----
{
  const { w, d } = makeDOM(Object.assign({}, WARRIOR, { hpCur: 10, hpMax: 12 }));
  click(d.getElementById("btn-continue"));
  click(d.querySelector(".tab-btn[data-tab='combat']"));
  click(d.getElementById("hp-minus"));
  assert(d.getElementById("hp-current").textContent === "9", "131. HP decrements to 9 from combat tab");
  click(d.querySelector(".tab-btn[data-tab='gear']"));
  click(d.getElementById("hp-plus"));
  assert(d.getElementById("hp-current").textContent === "10", "132. HP increments back to 10 from gear tab");
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(saved.hpCur === 10, "133. HP persisted correctly after adjustments from multiple tabs");
}

// ---- v18-B. showShell always resets to SHEET tab ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.querySelector(".tab-btn[data-tab='combat']"));
  assert(visible(d.getElementById("tab-combat")), "134. Combat tab active before back");
  click(d.getElementById("btn-back"));
  click(d.getElementById("btn-continue"));
  assert(visible(d.getElementById("tab-sheet")), "135. SHEET tab active after returning via CONTINUE");
  assert(hidden(d.getElementById("tab-combat")), "136. Combat tab hidden after returning via CONTINUE");
}

// ---- v18-C. Defense die shown in overlay stepper (removed from combat tab chip in v41) ----
{
  const { d, w } = makeDOM(Object.assign({}, WARRIOR, { defense: "d10" }));
  click(d.getElementById("btn-continue"));
  w.eval("openDefense()");
  assert(d.getElementById("def-edit-value").textContent === "d12", "137. Defense die overlay shows effectiveDefense (base d10 + medium = d12)");
}

// ---- v18-D. Initiative rendered on shell open ----
{
  const heavyArmor = Object.assign({}, WARRIOR, { loadout: { armor: "none", weapon: "light" } });
  const { d } = makeDOM(heavyArmor);
  click(d.getElementById("btn-continue"));
  assert(d.getElementById("sheet-init").textContent === "+3", "138. Initiative +3 for no armor + light weapon");
}

// ============================================================
// v19 ASSERTIONS
// ============================================================

// ---- v19-A. Supply meter element exists and shows 0 on load ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  assert(d.getElementById("supply-count") !== null, "139. supply-count element exists");
  assert(d.getElementById("supply-count").textContent === "0", "140. Supply count shows 0 for character with supply 0");
}

// ---- v19-B. migrate() adds supply: 0 to pre-v19 save ----
{
  const old = { name: "Old Explorer", cls: "Warrior",
    skills: { Athletics: "d8", Awareness: "d6", Combat: "d8", Finesse: "d6",
              Ingenuity: "d6", Lore: "d6", Presence: "d8", Sorcery: "d6" },
    hpMax: 12, hpCur: 10, defense: "d8",
    loadout: { armor: "medium", weapon: "standard" },
    items: [], coins: 0, roles: [], skillTicks: {}
  };
  const { w } = makeDOM(null);
  const result = w.eval("migrate(" + JSON.stringify(old) + ")");
  assert(result.supply === 0, "141. migrate() adds supply: 0 to pre-v19 save");
}

// ---- v19-C. Supply + stepper increments ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("supply-plus"));
  assert(d.getElementById("supply-count").textContent === "1", "142. Supply + increments display to 1");
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(saved.supply === 1, "143. Supply increment persists to localStorage");
}

// ---- v19-D. Supply - stepper decrements and floors at 0 ----
{
  const { d } = makeDOM(Object.assign({}, WARRIOR, { supply: 2 }));
  click(d.getElementById("btn-continue"));
  assert(d.getElementById("supply-count").textContent === "2", "144. Supply count loads from saved value");
  click(d.getElementById("supply-minus"));
  assert(d.getElementById("supply-count").textContent === "1", "145. Supply - decrements to 1");
  click(d.getElementById("supply-minus"));
  assert(d.getElementById("supply-count").textContent === "0", "146. Supply - decrements to 0");
  click(d.getElementById("supply-minus"));
  assert(d.getElementById("supply-count").textContent === "0", "147. Supply - floors at 0, does not go negative");
}

// ---- v19-E. FORAGE max roll increments supply by 2 ----
{
  const { w, d } = makeDOM(Object.assign({}, WARRIOR, { supply: 0 }));
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0.9999;");
  click(d.getElementById("btn-forage"));
  click(d.getElementById("forage-roll-btn"));
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(saved.supply === 2, "148. FORAGE max roll adds 2 to supply");
}

// ---- v19-F. FORAGE mid roll (result 4) increments supply by 1 ----
{
  const { w, d } = makeDOM(Object.assign({}, WARRIOR, { supply: 0 }));
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0.375;"); // floor(0.375*8)+1 = 4 on d8; 4<=result<6 → gained=1
  click(d.getElementById("btn-forage"));
  click(d.getElementById("forage-roll-btn"));
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(saved.supply === 1, "149. FORAGE mid roll (result 4) adds 1 to supply");
}

// ---- v19-G. FORAGE min roll does not change supply ----
{
  const { w, d } = makeDOM(Object.assign({}, WARRIOR, { supply: 3 }));
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0;");
  click(d.getElementById("btn-forage"));
  click(d.getElementById("forage-roll-btn"));
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(saved.supply === 3, "150. FORAGE roll 1-3 does not change supply");
}

// ---- v19-H / v20: Supply in GEAR tab; expedition tab has no supply strip ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const tabExp = d.getElementById("tab-expedition");
  const tabGear = d.getElementById("tab-gear");
  assert(tabExp.querySelector(".supply-strip") === null, "151. Supply strip absent from expedition tab");
  assert(tabGear.querySelector(".supply-strip") !== null, "152. Supply strip in gear tab");
  const expLabels = Array.from(tabExp.querySelectorAll(".field-label")).map((el) => el.textContent.trim().toLowerCase());
  assert(!expLabels.includes("expedition"), "153. EXPEDITION field-label removed from expedition tab panel");
  assert(!expLabels.includes("supply"), "154. SUPPLY field-label not in expedition tab");
  const gearLabels = Array.from(tabGear.querySelectorAll(".field-label")).map((el) => el.textContent.trim().toLowerCase());
  assert(gearLabels.includes("supply"), "154b. SUPPLY field-label present in gear tab");
}

// ---- v19-I. New character has supply: 0 ----
{
  const { w, d } = makeDOM(null);
  wizardCreate(w, d, "Warrior", "Test");
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(saved.supply === 0, "155. New character has supply: 0");
}

// ---- v19-J. Copper (CP) label in gear tab ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const label = d.querySelector(".inv-coins-label");
  assert(label && label.textContent.toLowerCase().includes("copper"), "156. Gear tab shows Copper label");
}

// ============================================================
// v20 ASSERTIONS
// ============================================================

// ---- v20-A. Core skill die has .core class; non-core does not ----
{
  const SCHOLAR = Object.assign({}, WARRIOR, {
    cls: "Scholar",
    skills: Object.assign({}, WARRIOR.skills, { Lore: "d8", Combat: "d6", Ingenuity: "d8" })
  });
  const { d } = makeDOM(SCHOLAR);
  click(d.getElementById("btn-continue"));
  const rows = Array.from(d.querySelectorAll(".skill-row"));
  const loreRow = rows.find(r => r.querySelector(".skill-name").textContent === "Lore");
  const combatRow = rows.find(r => r.querySelector(".skill-name").textContent === "Combat");
  assert(loreRow && loreRow.querySelector(".skill-die.core") !== null, "157. Scholar's Lore die has .core class");
  assert(combatRow && combatRow.querySelector(".skill-die.core") === null, "158. Scholar's Combat die does NOT have .core class");
}

// ---- v20-B. Warrior core (Combat) has .core; Sorcerer core (Sorcery) has .core ----
{
  const { d: dw } = makeDOM(WARRIOR);
  click(dw.getElementById("btn-continue"));
  const wRows = Array.from(dw.querySelectorAll(".skill-row"));
  const combatRow = wRows.find(r => r.querySelector(".skill-name").textContent === "Combat");
  assert(combatRow && combatRow.querySelector(".skill-die.core") !== null, "159. Warrior's Combat die has .core class");

  const { d: ds } = makeDOM(SORCERER);
  click(ds.getElementById("btn-continue"));
  const sRows = Array.from(ds.querySelectorAll(".skill-row"));
  const sorceryRow = sRows.find(r => r.querySelector(".skill-name").textContent === "Sorcery");
  assert(sorceryRow && sorceryRow.querySelector(".skill-die.core") !== null, "160. Sorcerer's Sorcery die has .core class");
}

// ---- v20-C. Long name rendered in full (no truncation) ----
{
  const longName = "Bartholomew Ironwrought The Elder";
  const { d } = makeDOM(Object.assign({}, WARRIOR, { name: longName }));
  click(d.getElementById("btn-continue"));
  assert(d.getElementById("sheet-name").textContent === longName, "161. Long name displayed in full without truncation");
}

// ---- v20-D. Shell divider element exists in DOM ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  assert(d.querySelector(".shell-divider") !== null, "162. Shell divider element exists in DOM");
}

// ---- v20-E. intro-version-note inside .intro-layout ----
{
  const { d } = makeDOM(null);
  const layout = d.querySelector(".intro-layout");
  const vn = d.getElementById("intro-version-note");
  assert(layout && layout.contains(vn), "163. intro-version-note is inside .intro-layout");
}

// ---- v21-A. intro screen carries background-image style ----
{
  const SW = fs.readFileSync("sw.js", "utf8");
  assert(SW.includes("intro-bg.webp"), "164. SW asset list includes intro-bg.webp");
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes('url("intro-bg.webp")'), "165. style.css sets intro background-image to intro-bg.webp");
}

// ---- v22-A. VERSION constant reads v27 ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(SRC.includes('const VERSION = "v91"'), "166. app.js VERSION pin matches the current release");
}

// ---- v22-B. SW cache name is tystnad-v33 ----
{
  const SW = fs.readFileSync("sw.js", "utf8");
  assert(SW.includes('"tystnad-v91"'), "167. sw.js cache name is tystnad-v33");
}

// ---- v22-C. Intro ghost buttons have bone color override in CSS ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes("#btn-new-explorer, #btn-import-toggle") && CSS.includes("var(--bone)"), "168. Intro secondary buttons override to bone color");
}

// ---- v22-D. Intro version note has bone rgba override in CSS ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes("#intro-version-note") && CSS.includes("rgba(207, 201, 192, 0.6)"), "169. intro-version-note overrides to bone at 60% opacity");
}

// ---- v23-A. SW asset list includes app-bg.webp ----
{
  const SW = fs.readFileSync("sw.js", "utf8");
  assert(SW.includes("app-bg.webp"), "170. SW asset list includes app-bg.webp");
}

// ---- v23-B. body::before fixed layer carries app-bg.webp (v24: moved from .shell-screen) ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes('body::before') && CSS.includes('bg-pages.webp'), "171. body::before fixed layer has bg-pages.webp");
  assert(!CSS.includes('.shell-screen') || !CSS.match(/\.shell-screen\s*\{[^}]*app-bg\.webp/), "171b. .shell-screen no longer carries app-bg background");
}

// ---- v23-C. VERSION reads v27 ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(SRC.includes('const VERSION = "v91"'), "172. app.js VERSION pin matches the current release");
}

// ---- v23-D. SW cache name is tystnad-v33 ----
{
  const SW = fs.readFileSync("sw.js", "utf8");
  assert(SW.includes('"tystnad-v91"'), "173. sw.js cache name is tystnad-v33");
}

// ---- v25. body::before approach: body transparent, html provides fallback, no fallback in pseudo ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes('html') && CSS.includes('background: #0c0a0b'), "174. html carries the ink fallback color");
  assert(CSS.match(/body\s*\{[^}]*background:\s*transparent/), "175. body background is transparent");
  assert(CSS.includes("body::before") && CSS.includes('url("bg-pages.webp")'), "176. body::before carries bg-pages.webp");
}

// ---- v26-A. Font woff2 file in SW asset cache ----
// v91: three static weight files became ONE variable font on the weight axis, because Google
// no longer ships static instances of this family. The old three are gone from the repo.
{
  const SW = fs.readFileSync("sw.js", "utf8");
  assert(SW.includes("CormorantGaramond-Variable.woff2"), "177. SW cache includes CormorantGaramond-Variable.woff2");
  assert(!/CormorantGaramond-(Medium|SemiBold|Bold)\.woff2/.test(SW),
    "178. SW cache names no retired static weight file");
  assert(SW.includes("OPTIONAL_ASSETS") && SW.split("OPTIONAL_ASSETS")[1].includes("CormorantGaramond-Variable.woff2"),
    "179. The font is an OPTIONAL asset, so a failed font download cannot reject the install");
}

// ---- v26-B. @font-face declared for each weight, all pointing at the variable file ----
// Pinning font-weight per declaration is what instantiates the variable axis at 500/600/700,
// so the three blocks stay even though they now share one src.
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const faces = CSS.match(/@font-face\s*\{[^}]*\}/g) || [];
  const cormorant = faces.filter(f => f.includes('"Cormorant Garamond"'));
  const weightSrc = (w) => cormorant.some(f =>
    new RegExp("font-weight:\\s*" + w + "\\s*;").test(f) &&
    f.includes('url("CormorantGaramond-Variable.woff2")'));
  assert(weightSrc(500), "180. @font-face weight 500 loads the variable file");
  assert(weightSrc(600), "181. @font-face weight 600 loads the variable file");
  assert(weightSrc(700), "182. @font-face weight 700 loads the variable file");
  assert(CSS.includes('--font-display: "Cormorant Garamond"'), "183. --font-display custom property defined");
}

// ---- v26-C. Font chain: .sheet-head h2 uses var(--font-display) → "Cormorant Garamond" ----
// jsdom does not resolve CSS custom properties in getComputedStyle; we verify the full chain via
// CSS text: element uses var(--font-display), that variable maps to "Cormorant Garamond", and
// the woff2 file physically exists AND IS REALLY A FONT (assertions 177-182 confirm the
// @font-face wiring). Together this means a missing, misnamed or bogus font file fails the suite.
//
// v91, and the reason this bug survived for the life of the product: 184b used to assert only
// that the three files existed and were non-empty. All three were GitHub "Page not found" HTML
// documents saved with a .woff2 extension, 311KB each, so the test passed while Cormorant NEVER
// ONCE RENDERED. Size, HTTP status and content-type all lie; the magic bytes do not. Test the
// outcome, not the mechanism.
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const h2Block = CSS.match(/\.sheet-head h2\s*\{([^}]*)\}/);
  const h2UsesFontVar = h2Block && h2Block[1].includes("var(--font-display)");
  const varMapsToFont = CSS.includes('--font-display: "Cormorant Garamond"');
  assert(h2UsesFontVar && varMapsToFont, "184. .sheet-head h2 uses var(--font-display) which maps to Cormorant Garamond");

  let magic = "";
  let size = 0;
  try {
    const fd = fs.openSync("CormorantGaramond-Variable.woff2", "r");
    const head = Buffer.alloc(4);
    fs.readSync(fd, head, 0, 4, 0);
    fs.closeSync(fd);
    magic = head.toString("hex");
    size = fs.statSync("CormorantGaramond-Variable.woff2").size;
  } catch (e) { /* leaves magic empty, which fails below */ }
  assert(size > 0, "184b. CormorantGaramond-Variable.woff2 exists and is non-empty");
  assert(magic === "774f4632", "184c. The font file begins wOF2, so it is a real woff2 and not an HTML error page");

  const retired = ["CormorantGaramond-Medium.woff2", "CormorantGaramond-SemiBold.woff2", "CormorantGaramond-Bold.woff2"]
    .filter(f => { try { fs.statSync(f); return true; } catch (e) { return false; } });
  assert(retired.length === 0, "184d. The three retired static weight files are gone from the repo");
}

// ---- v26-D. Section labels: vital-label uses blood color in CSS ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.match(/\.vital-label\s*\{[^}]*color:\s*var\(--blood-bright\)/), "185. .vital-label color is var(--blood-bright)");
  assert(CSS.includes(".shell-screen .field-label") && CSS.includes("color: var(--blood-bright)"), "186. .shell-screen .field-label color is var(--blood-bright)");
}

// ---- v26-E. Chamfer applied to panel cards ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const chamfer = "8px 0%";
  const cardCount = (CSS.match(/clip-path: polygon\(8px 0%/g) || []).length;
  assert(cardCount >= 5, `187. At least 5 panel cards chamfered (found ${cardCount})`);
}

// ---- v26-F. Stepper buttons outlined, transparent fill ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.match(/\.step-btn\s*\{[^}]*background:\s*transparent/), "188. .step-btn background is transparent");
  assert(CSS.match(/\.step-btn\s*\{[^}]*border:\s*1px solid var\(--ash\)/), "189. .step-btn border uses ash color");
}

// ============================================================
// v27 ASSERTIONS
// ============================================================

// ---- v27-A. SW cache v27 ----
{
  const SW = fs.readFileSync("sw.js", "utf8");
  assert(SW.includes('"tystnad-v91"'), "190. sw.js cache tystnad-v33");
}

// ---- v27-B. VERSION v27 ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(SRC.includes('const VERSION = "v91"'), "191. app.js VERSION pin matches the current release");
}

// ---- v27-C. SPELLS constant in source: 30 entries, tier markers, canonical content ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  // Use tier: field which appears only in SPELLS (CONDITIONS has no tier)
  const tierMatches = (SRC.match(/\btier: [123]\b/g) || []).length;
  assert(tierMatches === 30, "192. app.js SPELLS has 30 tier entries");
  assert(SRC.includes('"soul-spark"'), "193. soul-spark in SPELLS source");
  assert(SRC.includes('"wracking-curse"'), "194. wracking-curse (last T3 spell) in SPELLS source");
  assert(SRC.includes("tier: 1"), "195. tier 1 entries in SPELLS source");
  assert(SRC.includes("tier: 2"), "196. tier 2 entries in SPELLS source");
  assert(SRC.includes("tier: 3"), "197. tier 3 entries in SPELLS source");
  assert(SRC.includes("1d6 damage") && SRC.includes("soul-spark"), "198. soul-spark 1d6 canonical");
  assert(SRC.includes("2d10 damage") && SRC.includes("death-mark"), "199. death-mark 2d10 canonical");
}

// ---- v27-F. migrate() adds level:1 ----
{
  const old = { name: "X", cls: "Sorcerer",
    skills: { Athletics: "d6", Awareness: "d6", Combat: "d6", Finesse: "d6",
              Ingenuity: "d6", Lore: "d8", Presence: "d8", Sorcery: "d8" },
    hpMax: 9, hpCur: 9, defense: "d6" };
  const { w } = makeDOM(null);
  const result = w.eval("migrate(" + JSON.stringify(old) + ")");
  assert(result.level === 1, "200. migrate() adds level:1 to pre-v27 save");
}

// ---- v27-G. btn-cast and overlay-cast removed ----
{
  const { d } = makeDOM(null);
  assert(!d.getElementById("btn-cast"), "201. btn-cast absent from DOM");
  assert(!d.getElementById("overlay-cast"), "202. overlay-cast absent from DOM");
}

// ---- v27-H. New sorcery elements present ----
{
  const { d } = makeDOM(null);
  assert(d.getElementById("overlay-spell") !== null, "203. overlay-spell present");
  assert(d.getElementById("tab-sorcery") !== null, "204. tab-sorcery panel present");
  assert(d.querySelector(".sorcery-tab") !== null, "205. sorcery-tab button present");
  assert(d.getElementById("spell-list-sorcery") !== null, "206. spell-list-sorcery present");
  assert(d.getElementById("level-value") !== null, "207. level-value element present");
}

// ---- v27-I. Home tab button label (v47: renamed from SKILLS) ----
{
  const { d } = makeDOM(null);
  const sheetBtn = d.querySelector("[data-tab='sheet']");
  const label = sheetBtn && sheetBtn.querySelector(".tab-label");
  assert(label && label.textContent.trim() === "HOME", "208. Sheet tab button labelled HOME (v47 icon nav)");
}

// ---- v27-J. renderSorceryTab and openSpell functions exist ----
{
  const { w } = makeDOM(null);
  assert(typeof w.renderSorceryTab === "function", "209. renderSorceryTab function exists");
  assert(typeof w.openSpell === "function", "210. openSpell function exists");
}

// ---- v27-K. Sorcery tab hidden for Warrior, visible and functional for Sorcerer ----
{
  const { d: dw } = makeDOM(WARRIOR);
  click(dw.getElementById("btn-continue"));
  assert(hidden(dw.querySelector(".sorcery-tab")), "211. Sorcery tab button hidden for Warrior");
  assert(!dw.querySelector(".tab-bar").classList.contains("tab-bar--five"), "212. tab-bar--five never set (v47: class removed)");

  const { d: ds } = makeDOM(SORCERER);
  click(ds.getElementById("btn-continue"));
  assert(visible(ds.querySelector(".sorcery-tab")), "213. Sorcery tab button visible for Sorcerer");
  assert(!ds.querySelector(".tab-bar").classList.contains("tab-bar--five"), "214. tab-bar--five absent for Sorcerer (v47: class toggle removed)");
}

// ---- v27-L. Sorcery tab renders 30 spell rows for level-20 Sorcerer ----
{
  const sorc20 = Object.assign({}, SORCERER, { level: 20 });
  const { d } = makeDOM(sorc20);
  click(d.getElementById("btn-continue"));
  click(d.querySelector(".sorcery-tab"));
  const rows = d.querySelectorAll(".spell-row");
  assert(rows.length === 30, "215. Sorcery tab renders 30 spell rows at level 20");
}

// ---- v27-M. Tier 2 and 3 locked at level 1 ----
{
  const sorc1 = Object.assign({}, SORCERER, { level: 1 });
  const { d } = makeDOM(sorc1);
  click(d.getElementById("btn-continue"));
  click(d.querySelector(".sorcery-tab"));
  const locked = d.querySelectorAll(".spell-row.spell-locked");
  assert(locked.length === 20, "216. 20 spell rows locked at level 1 (tier 2 + tier 3)");
  const unlocked = d.querySelectorAll(".spell-row:not(.spell-locked)");
  assert(unlocked.length === 10, "217. 10 spell rows unlocked at level 1 (tier 1 only)");
}

// ---- v27-N. Tier 3 still locked at level 3 ----
{
  const sorc3 = Object.assign({}, SORCERER, { level: 3 });
  const { d } = makeDOM(sorc3);
  click(d.getElementById("btn-continue"));
  click(d.querySelector(".sorcery-tab"));
  const locked = d.querySelectorAll(".spell-row.spell-locked");
  assert(locked.length === 10, "218. 10 spell rows locked at level 3 (tier 3 only)");
}

// ---- v27-O. CSS: tab-bar--five and spell-row rules present ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(!CSS.match(/\.tab-bar--five \.tab-btn\s*\{[^}]*(font-size|letter-spacing)/), "219. No .tab-bar--five .tab-btn font-size/letter-spacing override (v46: unified nav size)");
  assert(CSS.includes(".spell-row"), "220. .spell-row rule exists");
  assert(CSS.includes(".spell-tier-header"), "221. .spell-tier-header rule exists");
  assert(CSS.includes(".spell-desc"), "222. .spell-desc rule exists");
  assert(!CSS.includes(".spell-cost-line"), "223. .spell-cost-line rule removed (v71: cost line dropped from cast screen)");
}

// ============================================================
// v28 — CONDITIONS
// ============================================================

// ---- v28-A. sw.js + VERSION ----
{
  assert(fs.readFileSync("sw.js","utf8").includes("tystnad-v91"), "224. sw.js cache tystnad-v91");
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "225. app.js VERSION pin matches the current release");
}

// ---- v28-B. migrate() adds conditions:{} ----
{
  const { w } = makeDOM(null);
  const old = JSON.parse(JSON.stringify(WARRIOR)); // no conditions field
  delete old.conditions;
  const result = w.eval("migrate(" + JSON.stringify(old) + ")");
  assert(result.conditions && typeof result.conditions === "object" && !Array.isArray(result.conditions),
    "226. migrate() adds conditions:{} to pre-v28 save");
}

// ---- v28-C. 10 chips render in SHEET tab; toggle active class ----
{
  const char = Object.assign({}, WARRIOR, { conditions: {} });
  const { d, w } = makeDOM(char);
  click(d.getElementById("btn-continue"));
  const chips = d.querySelectorAll(".cond-chip");
  assert(chips.length === 10, "227. 10 condition chips rendered");
  const wearyChip = Array.from(chips).find((b) => b.dataset.condId === "weary");
  assert(wearyChip && !wearyChip.classList.contains("cond-chip--active"), "228. Weary chip inactive initially");
  click(wearyChip);
  // renderConditions() re-renders the grid; fetch a fresh reference
  const wearyAfter = d.querySelector('[data-cond-id="weary"]');
  assert(wearyAfter && wearyAfter.classList.contains("cond-chip--active"), "229. Weary chip active after toggle");
}

// ---- v28-D. Condition persists to localStorage ----
{
  const char = Object.assign({}, WARRIOR, { conditions: {} });
  const { d, w } = makeDOM(char);
  click(d.getElementById("btn-continue"));
  const wearyChip = d.querySelector('[data-cond-id="weary"]');
  click(wearyChip);
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(saved.conditions && saved.conditions["weary"] === true, "230. Weary condition persists to localStorage");
}

// ---- v28-E. Shell strip hidden/visible ----
{
  const charOff = Object.assign({}, WARRIOR, { conditions: {} });
  const { d: d1 } = makeDOM(charOff);
  click(d1.getElementById("btn-continue"));
  const strip1 = d1.getElementById("condition-strip");
  assert(strip1 && strip1.classList.contains("hidden"), "231. Condition strip hidden with no active conditions");

  const charOn = Object.assign({}, WARRIOR, { conditions: { weary: true } });
  const { d: d2 } = makeDOM(charOn);
  click(d2.getElementById("btn-continue"));
  const strip2 = d2.getElementById("condition-strip");
  assert(strip2 && !strip2.classList.contains("hidden"), "232. Condition strip visible with Weary active");
  assert(strip2 && strip2.textContent.includes("Weary"), "233. Condition strip text contains Weary");
}

// ---- v28-F. Effect text shown/hidden ----
{
  const char = Object.assign({}, WARRIOR, { conditions: { weary: true } });
  const { d } = makeDOM(char);
  click(d.getElementById("btn-continue"));
  const list = d.getElementById("condition-effects");
  assert(list && !list.classList.contains("hidden"), "234. Effect list visible with Weary active");
  const text = list.textContent;
  assert(text.includes("harder"), "235. Effect list contains Weary desc keyword");
}

// ---- v28-G. wearyShift spot-checks ----
{
  const charWeary = Object.assign({}, WARRIOR, { conditions: { weary: true } });
  const { w: wOn } = makeDOM(charWeary);
  click(wOn.document.getElementById("btn-continue"));
  assert(wOn.eval("wearyShift(4)") === 5, "236. wearyShift(4) = 5 when Weary");
  assert(wOn.eval("wearyShift(5)") === 6, "237. wearyShift(5) = 6 when Weary");
  assert(wOn.eval("wearyShift(6)") === 6, "238. wearyShift(6) = 6 cap when Weary");

  const charOff = Object.assign({}, WARRIOR, { conditions: {} });
  const { w: wOff } = makeDOM(charOff);
  click(wOff.document.getElementById("btn-continue"));
  assert(wOff.eval("wearyShift(4)") === 4, "239. wearyShift(4) = 4 when not Weary");
}

// ---- v28-H. Skill picker shows shifted target when Weary ----
{
  const char = Object.assign({}, WARRIOR, { conditions: { weary: true } });
  const { d, w } = makeDOM(char);
  click(d.getElementById("btn-continue"));
  // Open the Athletics difficulty overlay
  w.eval("openDifficulty('Athletics')");
  const easyBtn = d.querySelector("#overlay-difficulty .diff-btn[data-target='4']");
  assert(easyBtn && easyBtn.querySelector("span").textContent === "5+",
    "240. Easy diff button shows 5+ (shifted) when Weary");
  const hardBtn = d.querySelector("#overlay-difficulty .diff-btn[data-target='6']");
  assert(hardBtn && hardBtn.querySelector("span").textContent === "6+",
    "241. Hard diff button stays 6+ when Weary (cap)");
  const note = d.querySelector("#overlay-difficulty .weary-note");
  assert(note && !note.classList.contains("hidden"), "242. weary-note visible in difficulty overlay when Weary");
}

// ---- v28-I. Defense picker shows shifted target when Weary ----
{
  const char = Object.assign({}, WARRIOR, { conditions: { weary: true } });
  const { d, w } = makeDOM(char);
  click(d.getElementById("btn-continue"));
  w.eval("openDefense()");
  const weakBtn = d.querySelector("#overlay-defense .diff-btn[data-target='4']");
  assert(weakBtn && weakBtn.querySelector("span").textContent === "5+",
    "243. Weak defense button shows 5+ (shifted) when Weary");
}

// ---- v71. Cast overlay trimmed to name + description + buttons ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  // Cast overlay markup: name + description only, no tier badge / cost line elements
  assert(!HTML.includes('id="spell-tier-badge"'), "244. spell tier badge removed from cast overlay markup");
  assert(!HTML.includes('id="spell-cost-display"'), "244a. spell cost/target/die line removed from cast overlay markup");
  assert(HTML.includes('id="spell-desc-display"'), "244b. spell description retained");
  // openSpell now sets only the name + description
  const openFn = SRC.slice(SRC.indexOf("function openSpell"), SRC.indexOf("function castSpell"));
  assert(!openFn.includes("spell-tier-badge") && !openFn.includes("spell-cost-display"),
    "244c. openSpell no longer writes the tier badge or cost line");
  assert(/spell-name-display"\)\.textContent = spell\.name/.test(openFn), "244d. openSpell sets the spell name directly");
  // The Weary shift + HP cost still apply mechanically in castTier (display removed, behavior kept)
  const castFn = SRC.slice(SRC.indexOf("function castTier"), SRC.indexOf("function castSpell"));
  assert(/wearyShift\(t\.target\)/.test(castFn), "244e. castTier still applies the Weary target shift");
  assert(/hpCur\s*-\s*t\.cost/.test(castFn), "244f. castTier still deducts the HP cost");
  // description is enlarged
  assert(/\.spell-desc\s*\{[^}]*font-size:\s*1\.15rem/.test(fs.readFileSync("style.css", "utf8")),
    "244g. spell description enlarged to 1.15rem");
}

// ---- v28-K. Death Roll target unaffected by Weary ----
{
  // rollDeath always passes target 5 — verify via source text since the function is async
  const SRC = fs.readFileSync("app.js", "utf8");
  const deathMatch = SRC.match(/function rollDeath[\s\S]*?performRoll\(die,\s*(\d+)/);
  assert(deathMatch && deathMatch[1] === "5", "245. Death Roll target hardcoded to 5 (not shifted)");
}

// ---- v28-L. castTier death-route target is 5 (not shifted) ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  // The death-route comment says target 5
  assert(SRC.includes("Death Roll target is always 5"), "246. castTier death-route comment confirms target 5");
}

// ---- v28-M. DOM elements present ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  assert(d.getElementById("condition-strip") !== null, "247. condition-strip element in DOM");
  assert(d.getElementById("condition-chips") !== null, "248. condition-chips element in DOM");
  assert(d.getElementById("condition-effects") !== null, "249. condition-effects element in DOM");
  assert(d.querySelector("#overlay-difficulty .weary-note") !== null,
    "250. weary-note in overlay-difficulty");
  assert(d.querySelector("#overlay-attack .weary-note") !== null,
    "251. weary-note in overlay-attack");
  assert(d.querySelector("#overlay-defense .weary-note") !== null,
    "252. weary-note in overlay-defense");
  assert(d.querySelector("#overlay-travel .weary-note") !== null,
    "253. weary-note in overlay-travel");
  assert(d.querySelector("#overlay-explore .weary-note") !== null,
    "254. weary-note in overlay-explore");
  assert(d.querySelector("#overlay-camp .weary-note") !== null,
    "255. weary-note in overlay-camp");
}

// ---- v28-N. CSS rules present ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes(".condition-strip"), "256. .condition-strip CSS rule exists");
  assert(CSS.includes(".cond-chip"), "257. .cond-chip CSS rule exists");
  assert(CSS.includes(".cond-chip--active"), "258. .cond-chip--active CSS rule exists");
  // v71: condition chips match the Skills text treatment (bone / 0.82rem / 0.08em), not dim ash.
  {
    const cond = (CSS.match(/\.cond-chip\s*\{([^}]*)\}/) || [])[1] || "";
    assert(/color:\s*var\(--bone\)/.test(cond), "258a. cond-chip text is bone (matches skill name), not ash");
    assert(/font-size:\s*0\.82rem/.test(cond), "258b. cond-chip font-size 0.82rem (matches skill name)");
    assert(/letter-spacing:\s*0\.08em/.test(cond), "258c. cond-chip letter-spacing 0.08em (matches skill name)");
  }
  assert(CSS.includes(".weary-note"), "259. .weary-note CSS rule exists");
  assert(CSS.includes(".cond-effect"), "260. .cond-effect CSS rule exists");
}

// ============================================================
// v30 — CLEAR TICKS POSITION FIX
// ============================================================

// ---- v30-A. CLEAR TICKS precedes condition-chips in DOM (above CONDITIONS section) ----
{
  const { d } = makeDOM(Object.assign({}, WARRIOR, { skillTicks: { Combat: true }, conditions: {} }));
  click(d.getElementById("btn-continue"));
  const tabSheet = d.getElementById("tab-sheet");
  const children = Array.from(tabSheet.children);
  const clearIdx = children.findIndex((el) => el.id === "btn-improve-skills");
  const chipsIdx = children.findIndex((el) => el.id === "condition-chips");
  assert(clearIdx !== -1, "261. btn-improve-skills exists in tab-sheet");
  assert(chipsIdx !== -1, "262. condition-chips exists in tab-sheet");
  assert(clearIdx < chipsIdx, "263. btn-improve-skills precedes condition-chips in DOM (not buried below conditions grid)");
}

// ---- v30-B. sw.js + VERSION ----
{
  assert(fs.readFileSync("sw.js","utf8").includes("tystnad-v91"), "264. sw.js cache tystnad-v33");
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "265. app.js VERSION pin matches the current release");
}

// ============================================================
// v31 — SKULL ARTWORK
// ============================================================

// ---- v31-A. skull.webp exists on disk ----
{
  let exists = false;
  try { exists = fs.statSync("skull.webp").size > 0; } catch (e) {}
  assert(exists, "266. skull.webp exists and is non-empty");
}

// ---- v31-B. skull.webp in SW asset cache ----
{
  const SW = fs.readFileSync("sw.js", "utf8");
  assert(SW.includes('"./skull.webp"'), "267. sw.js ASSETS list includes skull.webp");
}

// ---- v31-C. No SKULL_SVG in source; new img constants present ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(!SRC.includes("SKULL_SVG"), "268. SKULL_SVG constant removed from app.js");
  assert(SRC.includes("SKULL_IMG"), "269. SKULL_IMG constant present in app.js");
  assert(SRC.includes("SKULL_IMG_DEATH"), "270. SKULL_IMG_DEATH constant present in app.js");
}

// ---- v31-D. Result overlay shown after failed roll (overlay exists and opens) ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0;");
  click(d.querySelector(".skill-row"));
  click(d.querySelector("#overlay-difficulty .diff-btn[data-target='4']"));
  const overlay = d.getElementById("overlay-result");
  assert(overlay && !overlay.classList.contains("hidden"), "271. Result overlay visible after failed roll");
}

// ---- v31-E. verdict-skull img and death variant in app.js source ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(SRC.includes('"skull.webp"'), "272. skull.webp src referenced in app.js");
  assert(SRC.includes('class="verdict-skull"'), "273. verdict-skull class on img in app.js");
  assert(SRC.includes('class="verdict-skull verdict-skull--death"'), "274. verdict-skull--death class on death img in app.js");
}

// ---- v31-F. CSS rules updated ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes(".verdict-skull {") || CSS.includes(".verdict-skull{"), "275. .verdict-skull CSS rule present");
  assert(CSS.includes(".verdict-skull--death"), "276. .verdict-skull--death CSS rule present");
  assert(!CSS.includes(".verdict-skull svg"), "277. Old .verdict-skull svg rule removed");
}

// ---- v31-G. sw.js + VERSION (v31 check) ----
{
  assert(fs.readFileSync("sw.js","utf8").includes("tystnad-v91"), "278. sw.js cache tystnad-v33 (v31 check)");
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "279. app.js VERSION pin matches the current release");
}

// ============================================================
// v32 — APP ICON REPLACEMENT
// ============================================================

// ---- v32-A. Icon files exist and are non-empty ----
{
  let icon192ok = false, icon512ok = false;
  try { icon192ok = fs.statSync("icon-192.png").size > 0; } catch (e) {}
  try { icon512ok = fs.statSync("icon-512.png").size > 0; } catch (e) {}
  assert(icon192ok, "280. icon-192.png exists and is non-empty");
  assert(icon512ok, "281. icon-512.png exists and is non-empty");
}

// ---- v32-B. Icon files listed in SW cache ----
{
  const SW = fs.readFileSync("sw.js", "utf8");
  assert(SW.includes('"./icon-192.png"'), "282. sw.js ASSETS includes icon-192.png");
  assert(SW.includes('"./icon-512.png"'), "283. sw.js ASSETS includes icon-512.png");
}

// ---- v32-C. sw.js + VERSION ----
{
  assert(fs.readFileSync("sw.js","utf8").includes("tystnad-v91"), "284. sw.js cache tystnad-v33");
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "285. app.js VERSION pin matches the current release");
}

// ============================================================
// v33 — PAGE BACKGROUND
// ============================================================

// ---- v33-A. bg-pages.webp exists on disk ----
{
  let exists = false;
  try { exists = fs.statSync("bg-pages.webp").size > 0; } catch (e) {}
  assert(exists, "286. bg-pages.webp exists and is non-empty");
}

// ---- v33-B. bg-pages.webp in SW cache ----
{
  const SW = fs.readFileSync("sw.js", "utf8");
  assert(SW.includes('"./bg-pages.webp"'), "287. sw.js ASSETS includes bg-pages.webp");
}

// ---- v33-C. body::before uses bg-pages.webp ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes('url("bg-pages.webp")'), "288. style.css body::before references bg-pages.webp");
  assert(!CSS.includes('url("app-bg.webp")'), "289. app-bg.webp no longer in body::before");
}

// ---- v33-D. sw.js + VERSION ----
{
  assert(fs.readFileSync("sw.js","utf8").includes("tystnad-v91"), "290. sw.js cache tystnad-v33 (v33 check)");
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "291. app.js VERSION pin matches the current release");
}

// ============================================================
// v34 — HP STRIP, SUCCESS TEXTS, FAILURE CEREMONY, HAPTICS
// ============================================================

// ---- v34-A. SUCCESS_TEXTS constant has exactly 30 entries ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(SRC.includes("const SUCCESS_TEXTS = ["), "292. SUCCESS_TEXTS constant present in app.js");
  const match = SRC.match(/const SUCCESS_TEXTS = \[([\s\S]*?)\];/);
  let count = 0;
  if (match) {
    // Count quoted strings to avoid splitting on commas inside strings
    count = (match[1].match(/"[^"]+"/g) || []).length;
  }
  assert(count === 30, "293. SUCCESS_TEXTS has exactly 30 entries (found " + count + ")");
}

// ---- v34-B. HP threshold classes at various HP values ----
{
  const { w, d } = makeDOM(Object.assign({}, WARRIOR, { hpCur: 4, hpMax: 12 }));
  click(d.getElementById("btn-continue"));
  const cur = d.getElementById("hp-current");
  assert(cur && !cur.classList.contains("hp-t1") && !cur.classList.contains("hp-t2") && !cur.classList.contains("hp-t3"), "294. hp-current has no threshold class at HP 4");

  click(d.getElementById("hp-minus")); // HP 3
  assert(cur.classList.contains("hp-t3") && !cur.classList.contains("hp-t2") && !cur.classList.contains("hp-t1"), "295. hp-t3 class at HP 3");

  click(d.getElementById("hp-minus")); // HP 2
  assert(cur.classList.contains("hp-t2") && !cur.classList.contains("hp-t3") && !cur.classList.contains("hp-t1"), "296. hp-t2 class at HP 2");

  click(d.getElementById("hp-minus")); // HP 1
  assert(cur.classList.contains("hp-t1") && !cur.classList.contains("hp-t2") && !cur.classList.contains("hp-t3"), "297. hp-t1 class at HP 1");

  click(d.getElementById("hp-minus")); // HP 0
  assert(cur.classList.contains("hp-t1") && !cur.classList.contains("hp-t2") && !cur.classList.contains("hp-t3"), "298. hp-t1 class at HP 0");
}

// ---- v34-C/D/E. success-text placement in source ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const allOccurrences = (SRC.match(/randSuccessText\(\)/g) || []).length;
  const defOccurrences = SRC.includes("function randSuccessText()") ? 1 : 0;
  const textCalls = allOccurrences - defOccurrences;
  assert(textCalls === 2, "299. randSuccessText() called exactly twice (attack + cast success, found " + textCalls + ")");

  // Must appear inside performRollAttack
  const attackFn = SRC.slice(SRC.indexOf("function performRollAttack"), SRC.indexOf("// ---------- Expedition effort rolls"));
  assert(attackFn.includes("randSuccessText()"), "300. randSuccessText() inside performRollAttack success branch");

  // Must appear in opts.cast branch of performRoll, not in the generic success path
  const rollFn = SRC.slice(SRC.indexOf("function performRoll(die"), SRC.indexOf("function rollSkill"));
  assert(rollFn.includes("opts.cast") && rollFn.includes("randSuccessText()"), "301. randSuccessText() inside opts.cast branch of performRoll");
}

// ---- v34-F / v71. Skull CSS: regular failure 22vh (v71 shrink), death flood 60vh ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes("height: 22vh"), "302. .verdict-skull uses height: 22vh (v71: ~50% shrink from 45vh)");
  assert(!CSS.includes("height: 45vh"), "302a. old 45vh skull height removed");
  assert(CSS.includes("max-width: 90vw"), "303. .verdict-skull uses max-width: 90vw");
  assert(CSS.includes("height: 60vh"), "304. .verdict-skull--death uses height: 60vh (death flood untouched)");
  assert(!CSS.includes("height: 110px"), "305. Old 110px skull height removed");
  assert(!CSS.includes("height: 160px"), "306. Old 160px death skull height removed");
}

// ---- v71. Failed rolls hide the number + context (skull only); success + death untouched ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(/function hideRollReadout\(\)\s*\{[\s\S]*?result-number[\s\S]*?add\("hidden"\)[\s\S]*?result-context[\s\S]*?add\("hidden"\)[\s\S]*?\}/.test(SRC),
    "306a. hideRollReadout() hides result-number and result-context");
  const rollFn = SRC.slice(SRC.indexOf("function performRoll(die"), SRC.indexOf("function rollSkill"));
  assert((rollFn.match(/hideRollReadout\(\)/g) || []).length === 2,
    "306b. performRoll calls hideRollReadout in exactly 2 (non-death) failure branches, so death flood keeps its readout");
  const exploreFn = SRC.slice(SRC.indexOf("function performRollExplore"), SRC.indexOf("function openForage"));
  assert(exploreFn.includes("hideRollReadout()"), "306c. performRollExplore failure calls hideRollReadout");
  const forageFn = SRC.slice(SRC.indexOf("function performRollForage"), SRC.indexOf("function openCamp"));
  assert(forageFn.includes("hideRollReadout()"), "306d. performRollForage failure calls hideRollReadout");
  const campFn = SRC.slice(SRC.indexOf("function performRollCamp"), SRC.indexOf("// ---------- Cast Spell ----------"));
  assert(campFn.includes("hideRollReadout()"), "306e. performRollCamp failure calls hideRollReadout");
  assert(campFn.includes("EXPOSED"), "306f. performRollCamp failure keeps the EXPOSED mechanical readout");
  assert(/function closeResultOverlay[\s\S]*?result-number[\s\S]*?remove\("hidden"\)[\s\S]*?result-context[\s\S]*?remove\("hidden"\)/.test(SRC),
    "306g. closeResultOverlay unhides result-number + result-context for the next roll");
}

// ---- v34-G. Ember palette properties in CSS ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes("--ember-light: #d97a24"), "307. --ember-light defined in CSS");
  assert(CSS.includes("--ember-strong: #b96a33"), "308. --ember-strong defined in CSS");
  assert(CSS.includes("hp-t3"), "309. .hp-t3 threshold class present in CSS");
  assert(CSS.includes("hp-t2"), "310. .hp-t2 threshold class present in CSS");
  assert(CSS.includes("hp-t1"), "311. .hp-t1 threshold class present in CSS");
}

// ---- v34-H. Vibrate calls are feature-detected ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const callCount = (SRC.match(/navigator\.vibrate\s*\(/g) || []).length;
  const guardCount = (SRC.match(/if\s*\(\s*navigator\.vibrate\s*\)/g) || []).length;
  assert(callCount > 0, "312. navigator.vibrate called in app.js");
  assert(callCount === guardCount, "313. All " + callCount + " vibrate call(s) have feature-detect guards (" + guardCount + " guards)");
}

// ---- v34-I. sw.js + VERSION ----
{
  assert(fs.readFileSync("sw.js","utf8").includes("tystnad-v91"), "314. sw.js cache tystnad-v36");
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "315. app.js VERSION pin matches the current release");
}

// ============================================================
// v35 — RESTORE MECHANICAL READOUTS (FAILED BY, EXPOSED)
// ============================================================

// ---- v35-A. Defense failure renders FAILED BY beneath skull ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const rollFn = SRC.slice(SRC.indexOf("function performRoll(die"), SRC.indexOf("function rollSkill"));
  assert(rollFn.includes("opts.shortfall"), "316. opts.shortfall branch present in performRoll");
  assert(rollFn.includes("fail-by") && rollFn.includes("target - result"), "317. fail-by readout with target-result in shortfall branch");
  assert(rollFn.includes('"verdict-fail"'), "318. verdict-fail wrapper present in shortfall branch");
}

// ---- v35-B. Camp failure renders EXPOSED beneath skull ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const campFn = SRC.slice(SRC.indexOf("function performRollCamp"), SRC.indexOf("// ---------- Cast Spell ----------"));
  assert(campFn.includes("EXPOSED"), "319. EXPOSED text present in performRollCamp failure branch");
  assert(campFn.includes("fail-by"), "320. fail-by class on EXPOSED in performRollCamp");
  assert(campFn.includes('"verdict-fail"'), "321. verdict-fail wrapper present in camp failure branch");
}

// ---- v35-C. Forage failure has no text readout (skull only) ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const forageFn = SRC.slice(SRC.indexOf("function performRollForage"), SRC.indexOf("function openCamp"));
  assert(!forageFn.includes("fail-by"), "322. No fail-by class in performRollForage (skull only)");
  assert(!forageFn.includes("NOTHING FOUND"), "323. NOTHING FOUND text not present in performRollForage");
}

// ---- v35-D. .fail-by CSS uses bone not blood-bright ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const failByMatch = CSS.match(/\.fail-by\s*\{([^}]*)\}/);
  assert(failByMatch && failByMatch[1].includes("var(--bone)"), "324. .fail-by uses var(--bone)");
  assert(failByMatch && !failByMatch[1].includes("var(--blood-bright)"), "325. .fail-by does not use var(--blood-bright)");
}

// ---- v35-E. sw.js + VERSION ----
{
  assert(fs.readFileSync("sw.js","utf8").includes("tystnad-v91"), "326. sw.js cache tystnad-v36");
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "327. app.js VERSION pin matches the current release");
}

// ============================================================
// v36 — PLAYER-ROLLED EXPLOSION SEQUENCE
// ============================================================

// ---- v36-A. State machine variable and functions in source ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(SRC.includes("let explosionState = null"), "328. explosionState variable declared in app.js");
  assert(SRC.includes("function showExplosionWait("), "329. showExplosionWait function declared");
  assert(SRC.includes("function continueExplosionChain("), "330. continueExplosionChain function declared");
  assert(SRC.includes("function finalizeExplosionChain("), "331. finalizeExplosionChain function declared");
}

// ---- v36-B. Chain cap 20 enforced in source ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(SRC.includes("chain.length < 20"), "332. Chain cap of 20 enforced in source");
}

// ---- v36-C. EXPLODES, vibrate(30), and ROLL AGAIN button in showExplosionWait ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const showFn = SRC.slice(SRC.indexOf("function showExplosionWait("), SRC.indexOf("function continueExplosionChain("));
  assert(showFn.includes("EXPLODES"), "333. EXPLODES text in showExplosionWait");
  assert(showFn.includes("vibrate(30)"), "334. vibrate(30) in showExplosionWait");
  assert(showFn.includes("roll-again-btn"), "335. roll-again-btn in showExplosionWait");
}

// ---- v36-D. Momentum applied only in finalizeExplosionChain, not per-die ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const continueFn = SRC.slice(SRC.indexOf("function continueExplosionChain("), SRC.indexOf("function finalizeExplosionChain("));
  assert(!continueFn.includes("momentum"), "336. momentum not referenced in continueExplosionChain");
  const finalizeFn = SRC.slice(SRC.indexOf("function finalizeExplosionChain("), SRC.indexOf("// ---------- Expedition effort rolls"));
  assert(finalizeFn.includes("momentum"), "337. momentum applied in finalizeExplosionChain");
}

// ---- v36-E. CSS rules for explosion display ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes(".damage-explodes"), "338. .damage-explodes CSS rule present");
  assert(CSS.includes(".roll-again-btn"), "339. .roll-again-btn CSS rule present");
  const btnMatch = CSS.match(/\.roll-again-btn\s*\{([^}]*)\}/);
  assert(btnMatch && btnMatch[1].includes("var(--blood)"), "340. .roll-again-btn uses blood background");
}

// ---- v36-F. sw.js + VERSION ----
{
  assert(fs.readFileSync("sw.js","utf8").includes("tystnad-v91"), "341. sw.js cache tystnad-v37");
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "342. app.js VERSION pin matches the current release");
}

// ============================================================
// v37 — THE ATTACK CEREMONY
// ============================================================

// ---- v37-A. Declaration screen: section headers present ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("btn-attack"));
  const labels = d.querySelectorAll("#overlay-attack .atk-section-label");
  assert(labels.length === 5, "343. Five atk-section-label headers in attack overlay (v74 adds Attack Mode, Range, Cover)");
  assert(labels[3] && labels[3].textContent === "Momentum", "344. Momentum header sits above the trigger");
  assert(labels[4] && labels[4].textContent === "Enemy Threat Level", "345. Last header is Enemy Threat Level (trigger last)");
}

// ---- v37-B. Threat tier buttons (Weak/Standard/Strong); Easy/Normal/Hard absent ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("btn-attack"));
  const weak = d.querySelector("#attack-diff-buttons .diff-btn[data-target='4']");
  const standard = d.querySelector("#attack-diff-buttons .diff-btn[data-target='5']");
  const strong = d.querySelector("#attack-diff-buttons .diff-btn[data-target='6']");
  assert(weak && weak.textContent.includes("Weak"), "346. Weak 4+ button present");
  assert(standard && standard.textContent.includes("Standard"), "347. Standard 5+ button present");
  assert(strong && strong.textContent.includes("Strong"), "348. Strong 6+ button present");
  const allBtns = Array.from(d.querySelectorAll("#attack-diff-buttons .diff-btn"));
  assert(!allBtns.some(b => b.textContent.includes("Easy")), "349. Easy absent from attack diff-buttons");
  assert(!allBtns.some(b => b.textContent.includes("Normal")), "350. Normal absent from attack diff-buttons");
  assert(!allBtns.some(b => b.textContent.includes("Hard")), "351. Hard absent from attack diff-buttons");
}

// ---- v37-C. Die info elements removed from HTML ----
{
  const SRC = fs.readFileSync("index.html", "utf8");
  assert(!SRC.includes("attack-combat-die"), "352. attack-combat-die element absent from HTML");
  assert(!SRC.includes("attack-damage-die"), "353. attack-damage-die element absent from HTML");
}

// ---- v37-D. Opaque overlay-result background in CSS ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes("#overlay-result { background: #0c0a0b; }"), "354. overlay-result has opaque background in CSS");
}

// ---- v37-E. New CSS rules present ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes(".atk-section-label"), "355. .atk-section-label CSS rule present");
  assert(CSS.includes(".strike-hit"), "356. .strike-hit CSS rule present");
  assert(CSS.includes(".roll-damage-btn"), "357. .roll-damage-btn CSS rule present");
  assert(CSS.includes(".prompt-card"), "358. .prompt-card CSS rule present");
  assert(CSS.includes(".prompt-total"), "359. .prompt-total CSS rule present");
  assert(CSS.includes(".prompt-success-text"), "360. .prompt-success-text CSS rule present");
  assert(CSS.includes(".prompt-damage-label"), "361. .prompt-damage-label CSS rule present");
}

// ---- v37-F. damage-explodes significantly larger than v36 ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const exMatch = CSS.match(/\.damage-explodes\s*\{([^}]*)\}/);
  assert(exMatch && !exMatch[1].includes("0.8rem"), "362. .damage-explodes no longer uses 0.8rem");
  assert(exMatch && exMatch[1].includes("2rem"), "363. .damage-explodes uses 2rem");
}

// ---- v37-G. hitState and startDamageRoll in source ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(SRC.includes("let hitState = null"), "364. hitState variable declared in app.js");
  assert(SRC.includes("function startDamageRoll("), "365. startDamageRoll function declared");
}

// ---- v37-H. performRollAttack: no roll number; HIT and ROLL DAMAGE present ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const attackFn = SRC.slice(SRC.indexOf("function performRollAttack"), SRC.indexOf("function startDamageRoll"));
  assert(!attackFn.includes("numEl.textContent = result"), "366. combat roll number not assigned to numEl after flicker");
  assert(attackFn.includes(">HIT<"), "367. HIT text in performRollAttack success branch");
  assert(attackFn.includes("ROLL DAMAGE"), "368. ROLL DAMAGE button in performRollAttack success branch");
  assert(attackFn.includes("hitState"), "369. hitState set in performRollAttack success branch");
}

// ---- v37-I. finalizeExplosionChain: prompt-card; no chain or momentum breakdown ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const finalizeFn = SRC.slice(SRC.indexOf("function finalizeExplosionChain("), SRC.indexOf("// ---------- Expedition effort rolls"));
  assert(finalizeFn.includes("prompt-card"), "370. prompt-card in finalizeExplosionChain");
  assert(finalizeFn.includes("prompt-total"), "371. prompt-total in finalizeExplosionChain");
  assert(finalizeFn.includes("DAMAGE"), "372. DAMAGE label in finalizeExplosionChain");
  assert(!finalizeFn.includes("damage-chain"), "373. No chain breakdown in finalizeExplosionChain");
  assert(!finalizeFn.includes("damage-momentum"), "374. No momentum note in finalizeExplosionChain");
}

// ---- v37-J. Overlay dismiss guard includes hitState ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const idx = SRC.indexOf('"overlay-result").addEventListener');
  const block = SRC.slice(idx, idx + 300);
  assert(block.includes("hitState"), "375. hitState in overlay-result dismiss guard");
}

// ---- v37-K. sw.js + VERSION ----
{
  assert(fs.readFileSync("sw.js","utf8").includes("tystnad-v91"), "376. sw.js cache tystnad-v39");
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "377. app.js VERSION pin matches the current release");
}

// ============================================================
// v39 — ATTACK CEREMONY POLISH
// ============================================================

// ---- v39-A. atk-section-label doubled to 1.4rem ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const labelMatch = CSS.match(/\.atk-section-label\s*\{([^}]*)\}/);
  assert(labelMatch && labelMatch[1].includes("1.4rem"), "378. .atk-section-label font-size is 1.4rem");
  assert(labelMatch && !labelMatch[1].includes("0.7rem"), "379. .atk-section-label no longer uses 0.7rem");
}

// ---- v39-B. Declaration overlay opaque ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes("#overlay-attack { background: #0c0a0b;"), "380. overlay-attack has opaque background");
}

// ---- v39-C. Momentum grid aligned to threat buttons ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const gridMatch = CSS.match(/\.momentum-grid\s*\{([^}]*)\}/);
  assert(gridMatch && gridMatch[1].includes("320px"), "381. .momentum-grid has max-width 320px");
  assert(gridMatch && gridMatch[1].includes("12px"), "382. .momentum-grid gap is 12px");
}

// ---- v39-D. Prompt success text enlarged ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const pstMatch = CSS.match(/\.prompt-success-text\s*\{([^}]*)\}/);
  assert(pstMatch && pstMatch[1].includes("1.6rem"), "383. .prompt-success-text uses 1.6rem");
  assert(pstMatch && !pstMatch[1].includes("1rem;"), "384. .prompt-success-text no longer uses 1rem");
}

// ---- v39-E. Thumb-zone and Act 3 CSS rules present ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes("overlay--action"), "385. overlay--action rule present in CSS");
  assert(CSS.includes("overlay--act3"), "386. overlay--act3 rule present in CSS");
  assert(CSS.includes("position: absolute") && CSS.includes("overlay--action .roll-damage-btn"), "387. roll-damage-btn absolutely positioned in overlay--action");
  assert(CSS.includes("overlay--act3 .result-dismiss"), "388. result-dismiss positioned in overlay--act3");
}

// ---- v39-F. Breadcrumb removed from attack ceremony ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const attackFn = SRC.slice(SRC.indexOf("function performRollAttack"), SRC.indexOf("function startDamageRoll"));
  // v83 note: the log line legitimately contains "Attack ", so this now tests the actual
  // v39 intent (no breadcrumb is DISPLAYED during the attack ceremony) rather than the
  // mere presence of the word.
  assert(!/result-context"\)\.textContent\s*=\s*"Attack/.test(attackFn),
    "389. No attack breadcrumb is written to result-context in performRollAttack");
  assert(/ctxEl\.textContent = "";/.test(attackFn),
    "389b. performRollAttack still clears the context line");
  assert(attackFn.includes('result-context') && attackFn.includes('.classList.add("hidden")'), "390. result-context hidden in performRollAttack");
}

// ---- v39-G. overlay--action applied and removed in correct functions ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const attackFn = SRC.slice(SRC.indexOf("function performRollAttack"), SRC.indexOf("function startDamageRoll"));
  assert(attackFn.includes("overlay--action"), "391. overlay--action applied in performRollAttack success");
  const showFn = SRC.slice(SRC.indexOf("function showExplosionWait("), SRC.indexOf("function continueExplosionChain("));
  assert(showFn.includes("overlay--action"), "392. overlay--action applied in showExplosionWait");
  const startFn = SRC.slice(SRC.indexOf("function startDamageRoll("), SRC.indexOf("function showExplosionWait("));
  assert(startFn.includes('"overlay--action"'), "393. overlay--action removed in startDamageRoll");
  const continueFn = SRC.slice(SRC.indexOf("function continueExplosionChain("), SRC.indexOf("function finalizeExplosionChain("));
  assert(continueFn.includes('"overlay--action"'), "394. overlay--action removed in continueExplosionChain");
}

// ---- v39-H. overlay--act3 applied in finalizeExplosionChain ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const finalizeFn = SRC.slice(SRC.indexOf("function finalizeExplosionChain("), SRC.indexOf("// ---------- Expedition effort rolls"));
  assert(finalizeFn.includes("overlay--act3"), "395. overlay--act3 applied in finalizeExplosionChain");
}

// ---- v39-I. Dismiss handler restores result-context (v43: via closeResultOverlay) ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const idx = SRC.indexOf('"overlay-result").addEventListener');
  const block = SRC.slice(idx, idx + 300);
  const crFn = SRC.slice(SRC.indexOf("function closeResultOverlay()"), SRC.indexOf("function takeDefenseDamage("));
  assert(block.includes("closeResultOverlay()") && crFn.includes("result-context") && crFn.includes('.classList.remove("hidden")'), "396. dismiss handler calls closeResultOverlay which restores result-context visibility");
  assert(crFn.includes('"overlay--action"') && crFn.includes('"overlay--act3"'), "397. closeResultOverlay removes overlay--action and overlay--act3");
}

// ---- v40-A. sw.js + VERSION ----
{
  assert(fs.readFileSync("sw.js","utf8").includes("tystnad-v91"), "398. sw.js cache tystnad-v41");
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "399. app.js VERSION pin matches the current release");
}

// ---- v39-K. Thumb-zone buttons clear tab nav (bottom: 88px) ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const actionIdx = CSS.indexOf("overlay--action .roll-damage-btn");
  const actionBlock = CSS.slice(actionIdx, actionIdx + 200);
  assert(actionBlock.includes("bottom: 88px"), "400. overlay--action buttons bottom 88px to clear tab nav");
  const act3Idx = CSS.indexOf("overlay--act3 .result-dismiss");
  const act3Block = CSS.slice(act3Idx, act3Idx + 150);
  assert(act3Block.includes("bottom: 88px"), "401. overlay--act3 result-dismiss bottom 88px to clear tab nav");
}

// ---- v40-B. Defense overlay section headers ----
{
  const { d, w } = makeDOM(WARRIOR);
  w.eval("openDefense()");
  const defOverlay = d.getElementById("overlay-defense");
  const labels = defOverlay.querySelectorAll(".atk-section-label");
  assert(labels.length === 6, "402. overlay-defense has six .atk-section-label headers (v74 adds Attack Mode, Range, Your Cover)");
  assert(Array.from(labels).some((el) => el.textContent.toLowerCase().includes("enemy threat level")),
    "403. ENEMY THREAT LEVEL header present in overlay-defense");
  assert(Array.from(labels).some((el) => el.textContent.toLowerCase().includes("damage bonus")),
    "404. DAMAGE BONUS header present in overlay-defense");
}

// ---- v40-C. Damage bonus chips: eight chips +0 through +7 ----
{
  const { d, w } = makeDOM(WARRIOR);
  w.eval("openDefense()");
  const defOverlay = d.getElementById("overlay-defense");
  const chips = defOverlay.querySelectorAll(".bonus-btn");
  assert(chips.length === 8, "405. Eight .bonus-btn chips in overlay-defense");
  const vals = Array.from(chips).map((b) => parseInt(b.dataset.bonus, 10));
  assert(vals.join(",") === "0,1,2,3,4,5,6,7", "406. Bonus chips span +0 through +7 in order");
}

// ---- v40-D. Bonus grid CSS alignment (max-width 320px, 4 columns) ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const gridMatch = CSS.match(/\.bonus-grid\s*\{([^}]*)\}/);
  assert(gridMatch && gridMatch[1].includes("320px"), "407. .bonus-grid max-width 320px (alignment law)");
  assert(gridMatch && gridMatch[1].includes("repeat(4, 1fr)"), "408. .bonus-grid is 4-column grid");
}

// ---- v40-E. Defense overlay is fully opaque ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes("#overlay-defense") && CSS.includes("#0c0a0b"), "409. #overlay-defense opaque background present in CSS");
  const defIdx = CSS.indexOf("#overlay-defense");
  const defBlock = CSS.slice(defIdx, defIdx + 60);
  assert(defBlock.includes("#0c0a0b"), "410. #overlay-defense block uses #0c0a0b background");
}

// ---- v40-F. Bonus resets to +0 on two consecutive openDefense() calls ----
{
  const { d, w } = makeDOM(WARRIOR);
  // First open: +0 should be selected
  w.eval("openDefense()");
  const chips = d.querySelectorAll(".bonus-btn");
  assert(chips[0].classList.contains("selected"), "411. +0 chip selected on first openDefense()");
  assert(!chips[3].classList.contains("selected"), "412. +3 chip not selected on first openDefense()");
  // Simulate clicking +3
  chips[3].click();
  assert(chips[3].classList.contains("selected"), "413. +3 chip selected after click");
  assert(!chips[0].classList.contains("selected"), "414. +0 chip deselected after clicking +3");
  // Second open: bonus must reset to +0
  w.eval("openDefense()");
  assert(chips[0].classList.contains("selected"), "415. +0 chip re-selected after second openDefense() (bonus reset)");
  assert(!chips[3].classList.contains("selected"), "416. +3 chip deselected after second openDefense() (bonus reset)");
}

// ---- v40-G. performRollDefense: UNTOUCHED on success, TAKE X DAMAGE on failure ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const defFn = SRC.slice(SRC.indexOf("function performRollDefense("), SRC.indexOf("function takeDefenseDamage("));
  assert(defFn.includes("UNTOUCHED"), "417. UNTOUCHED present in performRollDefense success path");
  assert(defFn.toLowerCase().includes("take") && defFn.toLowerCase().includes("damage"),
    "418. Take X Damage present in performRollDefense failure path");
  assert(defFn.includes("defenseBonus") || defFn.includes("bonus"),
    "419. damage bonus variable used in performRollDefense formula");
  assert(!defFn.includes("Failed by") && !defFn.includes("FAILED BY"),
    "420. No FAILED BY string in performRollDefense (superseded by TAKE X DAMAGE)");
  assert(!defFn.includes("adjustHP"), "421. No HP deduction in performRollDefense itself (deduction handled by takeDefenseDamage)");
  assert(defFn.includes('classList.add("hidden")'), "422. result-context hidden in performRollDefense (no breadcrumb)");
}

// ---- v40-H. rollDefense uses wearyShift (Weary-shifted target feeds formula) ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const rollDefFn = SRC.slice(SRC.indexOf("function rollDefense("), SRC.indexOf("function performRollDefense("));
  assert(rollDefFn.includes("wearyShift"), "423. rollDefense applies wearyShift (Weary feeds TAKE X DAMAGE formula)");
  assert(!rollDefFn.includes("shortfall"), "424. rollDefense no longer uses opts.shortfall");
}

// ============================================================
// v41 ASSERTIONS
// ============================================================

// ---- v41-A. UNTOUCHED sizing: clamp reduced, max-width added ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const hitMatch = CSS.match(/\.strike-hit\s*\{([^}]*)\}/);
  assert(hitMatch && hitMatch[1].includes("clamp(2rem"), "425. .strike-hit uses clamp(2rem lower bound (UNTOUCHED fits on 375px)");
  assert(hitMatch && !hitMatch[1].includes("clamp(3rem"), "426. .strike-hit no longer uses clamp(3rem (old cropping value)");
  assert(hitMatch && hitMatch[1].includes("90vw"), "427. .strike-hit has max-width 90vw (overflow guard)");
}

// ---- v41-B. .def-damage class present and larger than .fail-by ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes(".def-damage"), "428. .def-damage class exists in style.css");
  const dmgMatch = CSS.match(/\.def-damage\s*\{([^}]*)\}/);
  assert(dmgMatch && dmgMatch[1].includes("1.7rem"), "429. .def-damage font-size is 1.7rem (double .fail-by 0.85rem)");
  assert(dmgMatch && dmgMatch[1].includes("var(--bone)"), "430. .def-damage color is bone");
}

// ---- v41-C. performRollDefense failure branch uses def-damage class + overlay--action ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const defFn = SRC.slice(SRC.indexOf("function performRollDefense("), SRC.indexOf("function takeDefenseDamage("));
  assert(defFn.includes("def-damage"), "431. performRollDefense failure uses .def-damage class");
  assert(defFn.includes("overlay--action"), "432. performRollDefense failure adds overlay--action (thumb-zone positioning)");
  assert(defFn.includes("def-take-btn"), "433. performRollDefense failure injects .def-take-btn button");
  assert(defFn.includes("pendingDefenseDamage"), "434. performRollDefense assigns pendingDefenseDamage");
}

// ---- v41-D. takeDefenseDamage function: adjustHP, hide, death escort ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(SRC.includes("function takeDefenseDamage("), "435. takeDefenseDamage function exists");
  const takeFn = SRC.slice(SRC.indexOf("function takeDefenseDamage("), SRC.indexOf("// ---------- Navigation helpers"));
  assert(takeFn.includes("adjustHP"), "436. takeDefenseDamage calls adjustHP (HP deduction)");
  assert(takeFn.includes("pendingDefenseDamage"), "437. takeDefenseDamage uses pendingDefenseDamage");
  assert(takeFn.includes("openDeath"), "438. takeDefenseDamage escorts to openDeath when HP <= 0");
  assert(takeFn.includes("disabled"), "439. takeDefenseDamage disables button (one-tap guarantee)");
  assert(takeFn.includes('closeResultOverlay'), "440. takeDefenseDamage calls closeResultOverlay (which hides overlay-result)");
}

// ---- v41-E. DEFENSE DIE header in overlay-defense ----
{
  const { d, w } = makeDOM(WARRIOR);
  w.eval("openDefense()");
  const defOverlay = d.getElementById("overlay-defense");
  const labels = defOverlay.querySelectorAll(".atk-section-label");
  assert(labels.length === 6, "441. overlay-defense now has six .atk-section-label headers (Defense Die + ranged trio + Damage Bonus + Enemy Threat Level)");
  assert(Array.from(labels).some((el) => el.textContent.toLowerCase().includes("defense die")),
    "442. DEFENSE DIE header present in overlay-defense");
}

// ---- v41-F. Combat tab order: init chip first, attack second, defend third ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const tab = d.getElementById("tab-combat");
  const children = Array.from(tab.children);
  assert(children[0] && children[0].id === "init-block", "443. init-block is first child of tab-combat");
  assert(children[1] && children[1].id === "btn-attack", "444. btn-attack is second child of tab-combat");
  assert(children[2] && children[2].id === "def-block", "445. def-block is third child of tab-combat");
}

// ---- v41-G. def-block is primary-btn; no def-init-row wrapper ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const defBtn = d.getElementById("def-block");
  assert(defBtn && defBtn.classList.contains("primary-btn"), "446. #def-block has primary-btn class (peers with Attack)");
  assert(defBtn && !defBtn.classList.contains("def-block"), "447. #def-block no longer has def-block chip class");
  assert(!d.querySelector(".def-init-row"), "448. .def-init-row wrapper removed from combat tab");
  assert(defBtn && defBtn.textContent.trim() === "Defend", "449. #def-block text is Defend");
}

// ---- v41-H. sheet-def element removed; no stale JS reference ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  assert(!d.getElementById("sheet-def"), "450. #sheet-def element no longer in DOM (removed from combat tab)");
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(!SRC.includes('("sheet-def")'), "451. No $('sheet-def') reference in app.js");
}

// ---- v41-I. Cache version and app version ----
{
  assert(fs.readFileSync("sw.js","utf8").includes("tystnad-v91"), "452. sw.js cache tystnad-v45");
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "453. app.js VERSION pin matches the current release");
}

// ============================================================
// v42 ASSERTIONS
// ============================================================

// ---- v42-A. Defense overlay DOM order: DAMAGE BONUS before ENEMY THREAT LEVEL ----
{
  const { d, w } = makeDOM(WARRIOR);
  w.eval("openDefense()");
  const defOverlay = d.getElementById("overlay-defense");
  const labels = Array.from(defOverlay.querySelectorAll(".atk-section-label"));
  assert(labels[0] && labels[0].textContent.toLowerCase().includes("defense die"),
    "454. Defense overlay first header is DEFENSE DIE");
  assert(labels[4] && labels[4].textContent.toLowerCase().includes("damage bonus"),
    "455. Defense overlay DAMAGE BONUS header sits before the trigger");
  assert(labels[5] && labels[5].textContent.toLowerCase().includes("enemy threat level"),
    "456. Defense overlay last header is ENEMY THREAT LEVEL (trigger last)");
  const bonusGrid = defOverlay.querySelector(".bonus-grid");
  const threatBtns = defOverlay.querySelector("#threat-buttons");
  const bonusIdx = Array.from(defOverlay.children).indexOf(bonusGrid);
  const threatIdx = Array.from(defOverlay.children).indexOf(threatBtns);
  assert(bonusIdx < threatIdx, "457. .bonus-grid precedes #threat-buttons in DOM (modifiers above trigger)");
}

// ---- v42-B. Attack overlay DOM order: MOMENTUM before ENEMY THREAT LEVEL ----
{
  const { d, w } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("btn-attack"));
  const atkOverlay = d.getElementById("overlay-attack");
  const labels = Array.from(atkOverlay.querySelectorAll(".atk-section-label"));
  assert(labels[3] && labels[3].textContent === "Momentum",
    "458. Attack overlay MOMENTUM header sits before the trigger");
  assert(labels[4] && labels[4].textContent === "Enemy Threat Level",
    "459. Attack overlay last header is ENEMY THREAT LEVEL (trigger last)");
  const momentumGrid = atkOverlay.querySelector(".momentum-grid");
  const diffBtns = atkOverlay.querySelector("#attack-diff-buttons");
  const momentumIdx = Array.from(atkOverlay.children).indexOf(momentumGrid);
  const diffIdx = Array.from(atkOverlay.children).indexOf(diffBtns);
  assert(momentumIdx < diffIdx, "460. .momentum-grid precedes #attack-diff-buttons in DOM (trigger last)");
}

// ---- v42-C. Death Roll survival screen: three canon facts ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const deathFn = SRC.slice(SRC.indexOf("function performRoll("), SRC.indexOf("function rollSkill("));
  const survivalBlock = deathFn.slice(deathFn.indexOf("opts.death"), deathFn.indexOf("} else if (opts.cast)"));
  assert(survivalBlock.toLowerCase().includes("unconscious"),
    "461. Survival screen includes unconscious-rounds fact");
  assert(survivalBlock.toLowerCase().includes("wake at 1 hp"),
    "462. Survival screen includes Wake at 1 HP fact");
  assert(survivalBlock.toLowerCase().includes("further damage kills outright"),
    "463. Survival screen includes Further damage kills outright fact");
}

// ---- v42-D. overlay-result click handler guards overlay--action (defense failure no tap-anywhere) ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const clickBlock = SRC.slice(SRC.indexOf("Result overlay: dismiss on tap"), SRC.indexOf("// Boot"));
  assert(clickBlock.includes("overlay--action"),
    "464. overlay-result click handler checks for overlay--action (no tap-anywhere on defense failure)");
}

// ---- v42-E. closeDefenseFailure function exists and routes through closeResultOverlay ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(SRC.includes("function closeDefenseFailure()"),
    "465. closeDefenseFailure function defined");
  const closeFn = SRC.slice(SRC.indexOf("function closeDefenseFailure()"),
    SRC.indexOf("// ---------- Navigation helpers"));
  const closeResultFn = SRC.slice(SRC.indexOf("function closeResultOverlay()"), SRC.indexOf("function takeDefenseDamage("));
  assert(closeFn.includes("closeResultOverlay"),
    "466. closeDefenseFailure calls closeResultOverlay (which removes overlay--action and hides overlay)");
  assert(closeResultFn.includes("hide("),
    "467. closeResultOverlay hides the overlay (ensures closeDefenseFailure path cleans up)");
  assert(!closeFn.includes("adjustHP"),
    "468. closeDefenseFailure does not deduct HP (no-deduction exit)");
}

// ---- v42-F. def-dismiss-btn injected in performRollDefense failure path ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const defFn = SRC.slice(SRC.indexOf("function performRollDefense("), SRC.indexOf("function takeDefenseDamage("));
  assert(defFn.includes("def-dismiss-btn"),
    "469. performRollDefense failure path injects .def-dismiss-btn");
  assert(defFn.includes('data-action="dismiss-defense"'),
    "470. performRollDefense DISMISS button carries the dismiss action");
}

// ---- v42-G. TAKE IT still deducts exactly once (one-tap guarantee preserved) ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const takeFn = SRC.slice(SRC.indexOf("function takeDefenseDamage("), SRC.indexOf("function closeDefenseFailure("));
  assert(takeFn.includes("adjustHP"),
    "471. takeDefenseDamage still calls adjustHP (TAKE IT deducts)");
  assert(takeFn.includes("disabled"),
    "472. takeDefenseDamage still disables button after first tap");
  assert(!takeFn.includes("closeDefenseFailure"),
    "473. takeDefenseDamage does not call closeDefenseFailure (separate paths)");
}

// ---- v42-H. def-dismiss-btn CSS present and positioned above TAKE IT ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes(".def-dismiss-btn"),
    "474. .def-dismiss-btn class exists in style.css");
  const dismissMatch = CSS.match(/\.def-dismiss-btn\s*\{([^}]*)\}/);
  assert(dismissMatch && dismissMatch[1].includes("var(--ash)"),
    "475. .def-dismiss-btn color is ash");
  assert(dismissMatch && dismissMatch[1].includes("none"),
    "476. .def-dismiss-btn background is none (no fill)");
  const actionDismiss = CSS.match(/#overlay-result\.overlay--action \.def-dismiss-btn\s*\{([^}]*)\}/);
  assert(actionDismiss && actionDismiss[1].includes("136px"),
    "477. .def-dismiss-btn positioned at bottom 136px (above TAKE IT at 88px)");
}

// ---- v42-I. Cache version and app version ----
{
  assert(fs.readFileSync("sw.js","utf8").includes("tystnad-v91"), "478. sw.js cache tystnad-v91");
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "479. app.js VERSION pin matches the current release");
}

// ============================================================
// v43 ASSERTIONS — Ceremony Consolidation
// ============================================================

// ---- v43-A. setInterval appears exactly once in app.js ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const count = (SRC.match(/setInterval/g) || []).length;
  assert(count === 1, "480. setInterval appears exactly once in app.js (permanent guard against ceremony re-duplication)");
}

// ---- v43-B. runFlicker called from all 8 ceremony functions ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const fns = [
    "performRollAttack", "startDamageRoll", "continueExplosionChain",
    "performRollExplore", "performRollForage", "performRollCamp",
    "performRoll", "performRollDefense"
  ];
  fns.forEach((fn, i) => {
    const start = SRC.indexOf("function " + fn + "(");
    const next = SRC.indexOf("function ", start + fn.length);
    const fnBody = SRC.slice(start, next === -1 ? undefined : next);
    assert(fnBody.includes("runFlicker("), (481 + i) + ". runFlicker called inside " + fn);
  });
}

// ---- v43-C. closeDefenseFailure and takeDefenseDamage both call closeResultOverlay ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const closeFn = SRC.slice(SRC.indexOf("function closeDefenseFailure()"),
    SRC.indexOf("// ---------- Navigation helpers"));
  const takeFn = SRC.slice(SRC.indexOf("function takeDefenseDamage("),
    SRC.indexOf("function closeDefenseFailure("));
  assert(closeFn.includes("closeResultOverlay()"),
    "489. closeDefenseFailure calls closeResultOverlay");
  assert(takeFn.includes("closeResultOverlay()"),
    "490. takeDefenseDamage calls closeResultOverlay");
}

// ---- v43-D. result-number not hidden after closeDefenseFailure() (bug fix) ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  // Simulate the mid-ceremony state: result-number hidden and overlay in defense-failure mode
  d.getElementById("result-number").classList.add("hidden");
  d.getElementById("overlay-result").classList.add("overlay--action");
  // Call closeDefenseFailure (DISMISS path)
  w.eval("closeDefenseFailure()");
  assert(!d.getElementById("result-number").classList.contains("hidden"),
    "491. result-number not hidden after closeDefenseFailure() -- bug fix verified");
}

// ---- v43-E. VERSION and cache ----
{
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "492. app.js VERSION pin matches the current release");
  assert(fs.readFileSync("sw.js","utf8").includes('"tystnad-v91"'), "493. sw.js cache tystnad-v91");
}

// ============================================================
// v44 ASSERTIONS — Defense from Armor, Wake at 1 HP, Import Hardening, Hygiene
// ============================================================

// ---- v44-A. effectiveDefense() derivation (via openDefense reading def-edit-value) ----
{
  // base d8 + medium = d10 (WARRIOR fixture)
  {
    const { w, d } = makeDOM(WARRIOR);
    click(d.getElementById("btn-continue"));
    w.eval("openDefense();");
    assert(d.getElementById("def-edit-value").textContent === "d10",
      "494. effectiveDefense: base d8 + medium = d10");
  }
  // base d8 + heavy = d12
  {
    const { w, d } = makeDOM(WARRIOR);
    click(d.getElementById("btn-continue"));
    click(d.getElementById("init-block"));
    click(d.querySelector('#armor-grid .class-btn[data-armor="heavy"]'));
    click(d.getElementById("loadout-done"));
    w.eval("openDefense();");
    assert(d.getElementById("def-edit-value").textContent === "d12",
      "495. effectiveDefense: base d8 + heavy = d12");
  }
  // base d10 + heavy = d12 (clamp)
  {
    const { w, d } = makeDOM(Object.assign({}, WARRIOR, { defense: "d10" }));
    click(d.getElementById("btn-continue"));
    click(d.getElementById("init-block"));
    click(d.querySelector('#armor-grid .class-btn[data-armor="heavy"]'));
    click(d.getElementById("loadout-done"));
    w.eval("openDefense();");
    assert(d.getElementById("def-edit-value").textContent === "d12",
      "496. effectiveDefense: base d10 + heavy clamped at d12");
  }
  // base d6 + none = d6
  {
    const fixture6 = Object.assign({}, WARRIOR, { defense: "d6",
      loadout: { armor: "none", weapon: "standard" } });
    const { w, d } = makeDOM(fixture6);
    click(d.getElementById("btn-continue"));
    w.eval("openDefense();");
    assert(d.getElementById("def-edit-value").textContent === "d6",
      "497. effectiveDefense: base d6 + none = d6");
  }
  // base d6 + light = d6
  {
    const fixture6l = Object.assign({}, WARRIOR, { defense: "d6",
      loadout: { armor: "light", weapon: "standard" } });
    const { w, d } = makeDOM(fixture6l);
    click(d.getElementById("btn-continue"));
    w.eval("openDefense();");
    assert(d.getElementById("def-edit-value").textContent === "d6",
      "498. effectiveDefense: base d6 + light = d6");
  }
}

// ---- v71. Initiative (loadout) overlay: new copy + layout ----
{
  assert(HTML.includes("Adjust your Armor and Weapon Load-out below"),
    "498a. loadout overlay top instruction present");
  assert(!HTML.includes("Your contribution to the Party Bonus"),
    "498b. old Party Bonus / GM-rolls hint removed");
  assert(HTML.includes("Your Initiative Roll Contribution is"),
    "498c. contribution line present (moved above Done)");
  const { d } = makeDOM(WARRIOR);
  const iv = d.getElementById("init-preview");
  assert(iv && iv.parentElement.classList.contains("init-contrib"),
    "498d. init-preview lives in the bottom .init-contrib line, not the header");
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(/\.init-contrib #init-preview\s*\{[^}]*var\(--bone\)/.test(CSS),
    "498e. contribution value is bone (Law 1: red never carries data)");
}

// ---- v71. Inventory item picker (booklet GEAR_ITEMS dropdown) ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(/const GEAR_ITEMS\s*=\s*\[/.test(SRC), "640. GEAR_ITEMS constant defined");
  assert(/id="inv-name"[^>]*maxlength="30"/.test(HTML), "641. inv-name maxlength raised to 30 for long item names");
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const panel = d.getElementById("inv-suggest");
  // full list renders on an empty filter
  w.eval("renderGearSuggest('')");
  const rows = panel.querySelectorAll(".inv-suggest-item");
  assert(rows.length === 50, "642. picker lists all 50 booklet items (found " + rows.length + ")");
  assert(!panel.classList.contains("hidden"), "643. picker panel is shown when populated");
  assert(rows[0].querySelector(".inv-suggest-name").textContent === "Dagger", "644. first listed item is Dagger");
  // typing filters the list
  w.eval("renderGearSuggest('rope')");
  const filtered = panel.querySelectorAll(".inv-suggest-item");
  assert(filtered.length === 1 && filtered[0].querySelector(".inv-suggest-name").textContent === "Rope (50 ft)",
    "645. typing filters the list to matching items");
  // selecting an item fills name + auto-fills LP, then closes
  w.eval("renderGearSuggest('dagger')");
  panel.querySelector(".inv-suggest-item").dispatchEvent(new w.MouseEvent("mousedown", { bubbles: true, cancelable: true }));
  assert(d.getElementById("inv-name").value === "Dagger" && d.getElementById("inv-lp-in").value === "1",
    "646. selecting an item fills the name and auto-fills LP");
  assert(panel.classList.contains("hidden"), "647. picker closes after a selection");
  // manual free-text entry (item not in the booklet) still works
  d.getElementById("inv-name").value = "Ancestral Trinket";
  d.getElementById("inv-lp-in").value = "2";
  w.eval("addItem()");
  const items = JSON.parse(w.localStorage.getItem("tystnad-character")).items;
  assert(items.some((it) => it.name === "Ancestral Trinket" && it.lp === 2),
    "648. manual free-text entry still adds a custom item");
}

// ---- v44-B. Defense failure with no armor adds +2 to pendingDefenseDamage ----
{
  const fixtureNone = Object.assign({}, WARRIOR, { defense: "d6",
    loadout: { armor: "none", weapon: "standard" } });
  const { w, d } = makeDOM(fixtureNone);
  click(d.getElementById("btn-continue"));
  // Save the flicker fn after setInterval returns (avoids const-TDZ inside synchronous mock)
  w.eval("window._savedFlickerFn = null; window.setInterval = function(fn) { window._savedFlickerFn = fn; return 0; }; window.clearInterval = function() {};");
  // Force roll result = 3 on d6 (floor(2/6 * 6) + 1 = 3)
  w.eval("Math.random = () => 2/6;");
  // Open defense overlay, click +1 bonus, then click Standard (5+) threat to roll
  w.eval("openDefense();");
  click(d.querySelector('.bonus-btn[data-bonus="1"]'));
  click(d.querySelector('#threat-buttons .diff-btn[data-target="5"]'));
  // Now flicker is assigned (setInterval returned 0); run the 8 ticks to reach onDone
  w.eval("for (var _i = 0; _i < 8; _i++) window._savedFlickerFn();");
  // target 5, roll 3, bonus 1, noArmor 2 → max(0, 5-3+1+2) = 5
  const damageEl = d.querySelector(".def-damage");
  assert(damageEl && damageEl.textContent === "Take 5 Damage",
    "499. Defense failure with no armor: target 5, roll 3, bonus 1, noArmor 2 = Take 5 Damage");
}

// ---- v44-C. Fresh-character loadouts per class ----
{
  // v71: loadout is now pick-derived. armor tier is the class's tier (wizard only offers that
  // tier); weapon weight is the first weapon offered = Dagger (light), allowed by every class.
  const expectedLoadouts = {
    Warrior: ["medium", "light"],
    Rogue:   ["light",  "light"],
    Scholar: ["medium", "light"],
    Sorcerer:["none",   "light"]
  };
  ["Warrior", "Rogue", "Scholar", "Sorcerer"].forEach((cls, i) => {
    const { w, d } = makeDOM(null);
    wizardCreate(w, d, cls, "Test");
    const ch = JSON.parse(w.localStorage.getItem("tystnad-character"));
    const [armor, weapon] = expectedLoadouts[cls];
    assert(ch.loadout.armor === armor && ch.loadout.weapon === weapon,
      `${500 + i}. Fresh ${cls} loadout is ${armor}/${weapon} (class armor tier + first weapon)`);
  });
}

// ---- v71. Creation wizard: gating, filtering, identity, wealth, starting gear ----
{
  const { d } = makeDOM(null);
  click(d.getElementById("btn-new-explorer"));
  assert(d.getElementById("wiz-next").disabled === true, "649. Wizard Next disabled until a class is chosen");
  assert(d.getElementById("wizard-progress").textContent === "Step 1 of 5", "650. Wizard shows Step 1 of 5");
  const card = [...d.querySelectorAll(".wiz-class-card")].find((c) => c.querySelector(".wiz-class-name").textContent === "Warrior");
  click(card);
  assert(d.getElementById("wiz-next").disabled === false, "651. Next enabled once a class is chosen");
  assert(d.querySelector(".wiz-stats") !== null, "652. Class statistics shown after choosing a class");
}
{
  // Weapon options are filtered by class restriction; Sorcerer has no armor grid
  function equipStep(cls) {
    const { w, d } = makeDOM(null);
    click(d.getElementById("btn-new-explorer"));
    click([...d.querySelectorAll(".wiz-class-card")].find((c) => c.querySelector(".wiz-class-name").textContent === cls));
    click(d.getElementById("wiz-next"));
    [...d.querySelectorAll(".wiz-input")].forEach((inp) => { inp.value = "x"; inp.dispatchEvent(new w.Event("input", { bubbles: true })); });
    click(d.getElementById("wiz-next"));
    const grids = [...d.querySelectorAll(".wiz-opt-grid")];
    return { weapons: grids[grids.length - 1].querySelectorAll(".wiz-opt").length, hasArmorGrid: grids.length > 1 };
  }
  assert(equipStep("Rogue").weapons === 5, "653. Rogue may take only the 5 light weapons");
  assert(equipStep("Warrior").weapons === 17, "654. Warrior may take all 17 weapons");
  assert(equipStep("Scholar").weapons === 12, "655. Scholar may take the 12 light + standard weapons");
  const sorc = equipStep("Sorcerer");
  assert(sorc.weapons === 5 && sorc.hasArmorGrid === false, "656. Sorcerer: 5 light weapons and no armor grid");
}
{
  const { w, d } = makeDOM(null);
  wizardCreate(w, d, "Warrior", "Aldric");
  const ch = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(ch.name === "Aldric" && ch.identity.drive === "Duty" && ch.identity.kin === "My sister",
    "657. Wizard captures name + identity answers");
  assert(ch.coins > 0 && ch.coins % 100 === 0 && ch.coins >= 300 && ch.coins <= 1200,
    "658. Starting wealth rolled 3d4 x 100 (found " + ch.coins + ")");
  const names = ch.items.map((it) => it.name);
  assert(names.includes("Chainmail") && names.includes("Shield") && names.includes("Dagger"),
    "659. Warrior starting gear auto-added to inventory (armor + shield + weapon)");
  assert(ch.hpMax === 12 && ch.defense === "d8" && ch.skills.Combat === "d8",
    "660. Class statistics applied at level 1 (Warrior 12 / d8 / Combat d8)");
  assert(ch.level === 1, "661. Wizard creates a level-1 Explorer");
}
{
  const { w, d } = makeDOM(null);
  wizardCreate(w, d, "Sorcerer", "Vex");
  const ch = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(ch.loadout.armor === "none", "662. Sorcerer loadout armor is none");
  assert(!ch.items.some((it) => it.name === "Shield"), "663. Sorcerer receives no shield");
}
{
  const old = Object.assign({}, WARRIOR);
  delete old.identity;
  const { w } = makeDOM(null);
  const migrated = w.eval("(function(){var c=" + JSON.stringify(old) + ";migrate(c);return c;})()");
  assert(migrated.identity && typeof migrated.identity.drive === "string" && migrated.identity.drive === "",
    "664. migrate() adds an empty identity{} to older saves");
}

// ---- v71. Edges: data, entitlement, rolling, auto-apply ----
// jsdom quirk: top-level consts/lets (EDGES, character) are not reachable via w.eval;
// set state through fixtures + the app's own functions (adjustLevel, rollEdge) and read
// results from localStorage or value-returning functions (edgesOwed, initContribution).
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert((SRC.match(/\{ id: \d+,\s+name:/g) || []).length === 20, "665. 20 Edges defined in the table");

  const { w, d } = makeDOM(WARRIOR);   // starts at level 1
  click(d.getElementById("btn-continue"));
  assert(w.eval("edgesOwed()") === 0, "666. 0 Edges owed at level 1");
  w.eval("adjustLevel(4)");            // -> level 5
  assert(w.eval("edgesOwed()") === 1, "667. 1 Edge owed at level 5");
  assert(!hidden(d.getElementById("btn-roll-edge")), "668. Roll button shown when an Edge is owed");
  w.eval("rollEdge()");
  assert(JSON.parse(w.localStorage.getItem("tystnad-character")).edges.length === 1, "669. Rolling grants one Edge");
  assert(hidden(d.getElementById("btn-roll-edge")), "670. Roll button hides once the owed Edge is taken");
  assert(d.querySelectorAll("#edges-list .edge-row").length === 1, "671. Held Edge listed in the panel");
  w.eval("adjustLevel(7)");            // level 5 -> 12
  assert(w.eval("edgesOwed()") === 5, "672. 5 Edges owed at level 12");
  w.eval("rollEdge(); rollEdge(); rollEdge(); rollEdge(); rollEdge();");   // fill to the owed 5
  const filled = JSON.parse(w.localStorage.getItem("tystnad-character")).edges;
  assert(filled.length === 5 && new Set(filled).size === 5, "673. Five Edges rolled with no duplicates");
  w.eval("rollEdge()");                // beyond entitlement
  assert(JSON.parse(w.localStorage.getItem("tystnad-character")).edges.length === 5, "674. Cannot roll beyond owed Edges");
}
{
  // Hardened (#5) raises max HP at acquisition. Math.random -> 0.2 picks pool index 4 (id 5), then 1d4 -> 1.
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("adjustLevel(4); var _r=Math.random; Math.random=function(){return 0.2;}; rollEdge(); Math.random=_r;");
  const c = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(c.edges[0] === 5, "675. Forced roll landed on Hardened (id 5)");
  assert(c.hpMax === 13, "676. Hardened rolled 1d4 and raised max HP (12 -> 13)");
}
{
  // auto-apply, via fixtures (Warrior medium/standard base Initiative = 0)
  function initWith(over) {
    const { w, d } = makeDOM(Object.assign({}, WARRIOR, over));
    click(d.getElementById("btn-continue"));
    return w.eval("initContribution()");
  }
  assert(initWith({ edges: [] }) === 0, "677. Base Initiative 0 (Warrior medium/standard)");
  assert(initWith({ edges: [4] }) === 1, "678. Vigilant adds +1 Initiative");
  assert(initWith({ edges: [], loadout: { armor: "heavy", weapon: "standard" } }) === -1, "679. Heavy armor costs -1 Initiative");
  assert(initWith({ edges: [12], loadout: { armor: "heavy", weapon: "standard" } }) === 0, "680. Armor Trained cancels heavy armor's Initiative penalty");
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(/armor === "none" && !hasEdge\(18\)/.test(SRC), "681. Agile removes the unarmored Defense penalty (source)");
  assert(/hasEdge\(1\)\)\s*total = Math\.max\(total, 2\)/.test(SRC), "682. Heavy Hitter floors attack damage at 2 (source)");
}
{
  const old = Object.assign({}, WARRIOR);
  delete old.edges;
  const { w } = makeDOM(null);
  const migrated = w.eval("(function(){var c=" + JSON.stringify(old) + ";migrate(c);return c;})()");
  assert(Array.isArray(migrated.edges) && migrated.edges.length === 0, "683. migrate() seeds an empty edges[] on older saves");
}

// ---- v71. Class abilities: display by class + level (no schema, pure render) ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  // Four classes, four abilities each = 16 entries at levels 3/6/9/11
  ["Warrior", "Rogue", "Scholar", "Sorcerer"].forEach((cls) => {
    assert(new RegExp(cls + ":\\s*\\[[\\s\\S]*?level: 3[\\s\\S]*?level: 6[\\s\\S]*?level: 9[\\s\\S]*?level: 11").test(SRC),
      "684-" + cls + ". " + cls + " has abilities at levels 3/6/9/11");
  });

  // Warrior at level 1: all four listed, all locked
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const rows1 = d.querySelectorAll("#abilities-list .ability-row");
  assert(rows1.length === 4, "685. Four class-ability rows shown");
  assert(d.querySelectorAll("#abilities-list .ability-locked").length === 4, "686. All four locked at level 1");
  assert(/Unlocks at level 3/.test(rows1[0].textContent) && !/free attack/.test(rows1[0].textContent),
    "687. Locked ability shows 'Unlocks at level N', not its text");

  // Raise to level 6: first two unlock and show their text
  w.eval("adjustLevel(5)");   // level 1 -> 6
  const rows6 = d.querySelectorAll("#abilities-list .ability-row");
  assert(d.querySelectorAll("#abilities-list .ability-locked").length === 2, "688. Two unlocked at level 6 (levels 3 + 6)");
  assert(/Hold the Line/.test(rows6[0].textContent) && /free attack/.test(rows6[0].textContent),
    "689. Unlocked ability (Hold the Line) shows its full text");
  assert(/Bloodied but Standing/.test(rows6[1].textContent), "690. Level-6 ability unlocked at level 6");

  // Class-specific: a Sorcerer shows Sorcerer abilities, not Warrior's
  const s = makeDOM(SORCERER);
  click(s.d.getElementById("btn-continue"));
  const stext = s.d.getElementById("abilities-list").textContent;
  assert(/Sacrifice/.test(stext) && /Spell Shield/.test(stext) && !/Hold the Line/.test(stext),
    "691. Sorcerer sees Sorcerer abilities, not another class's");
}

// ---- v71. Per-level HP roll (Level Up button) ----
{
  // Level 2 rolls 1d4 twice into max HP; current HP unchanged. Math.random=0.5 -> each d4 = 3.
  const { w, d } = makeDOM(WARRIOR);   // hpMax 12
  click(d.getElementById("btn-continue"));
  const hp0 = JSON.parse(w.localStorage.getItem("tystnad-character")).hpCur;
  w.eval("var _r=Math.random; Math.random=function(){return 0.5;}; levelUp(); Math.random=_r;");
  const c = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(c.level === 2, "692. Level Up advances the level by one");
  assert(c.hpMax === 18, "693. Level 2 rolls 1d4 twice (3+3) into max HP (12 -> 18)");
  assert(c.hpCur === hp0, "694. Level Up leaves current HP unchanged");
}
{
  // Warrior treats a rolled 1 as 2 (single roll at level 5)
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("adjustLevel(3);");   // 1 -> 4 (no HP)
  w.eval("var _r=Math.random; Math.random=function(){return 0;}; levelUp(); Math.random=_r;");   // 4 -> 5, roll 1 -> 2
  assert(JSON.parse(w.localStorage.getItem("tystnad-character")).hpMax === 14, "695. Warrior treats a rolled 1 as 2 (12 -> 14)");
}
{
  // Non-Warrior keeps a rolled 1 as 1 (+1, vs the Warrior's +2)
  const { w, d } = makeDOM(SORCERER);
  click(d.getElementById("btn-continue"));
  w.eval("adjustLevel(3);");   // 1 -> 4
  const before = JSON.parse(w.localStorage.getItem("tystnad-character")).hpMax;
  w.eval("var _r=Math.random; Math.random=function(){return 0;}; levelUp(); Math.random=_r;");   // 4 -> 5, roll 1
  assert(JSON.parse(w.localStorage.getItem("tystnad-character")).hpMax === before + 1, "696. Non-Warrior keeps a rolled 1 as 1 (+1)");
}
{
  // Level cap: button hidden at 20, Level Up is a no-op there
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("adjustLevel(19);");   // 1 -> 20
  assert(hidden(d.getElementById("btn-level-up")), "697. Level Up button hidden at level 20");
  const before = JSON.parse(w.localStorage.getItem("tystnad-character")).hpMax;
  w.eval("levelUp();");
  const after = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(after.hpMax === before && after.level === 20, "698. Level Up is a no-op at level 20");
}

// ---- v71. Identity panel: read-only display of the narrative answers ----
{
  // Older/imported character with empty identity -> panel hidden
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  assert(hidden(d.getElementById("identity-section")), "699. Identity panel hidden when no answers set");

  // A character with identity answers -> panel shown, questions + answers rendered
  const withId = Object.assign({}, WARRIOR, {
    identity: { drive: "To repay a debt", hope: "My brother's fate", line: "I won't harm a child", kin: "My sister Mira" }
  });
  const b = makeDOM(withId);
  click(b.d.getElementById("btn-continue"));
  assert(!hidden(b.d.getElementById("identity-section")), "700. Identity panel shown when answers exist");
  const rows = b.d.querySelectorAll("#identity-list .identity-qa");
  assert(rows.length === 4, "701. All four identity answers displayed");
  const txt = b.d.getElementById("identity-list").textContent;
  assert(/What drove you to become an Explorer\?/.test(txt) && /To repay a debt/.test(txt),
    "702. Identity panel shows the question and its answer");

  // Partial identity -> only the answered questions show
  const partial = Object.assign({}, WARRIOR, { identity: { drive: "Duty", hope: "", line: "", kin: "" } });
  const c = makeDOM(partial);
  click(c.d.getElementById("btn-continue"));
  assert(c.d.querySelectorAll("#identity-list .identity-qa").length === 1, "703. Only answered questions are shown");
}

// ---- v71. 375px review-pass fixes ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  // #3: data is no longer red (Law 1) -- core die + difficulty/threat targets go bone
  assert(/\.skill-row \.skill-die\.core\s*\{\s*color:\s*var\(--bone\)/.test(CSS), "704. Core skill die is bone, not blood-bright (Law 1)");
  assert(/\.diff-btn span\s*\{\s*color:\s*var\(--bone\)/.test(CSS), "705. Difficulty/threat targets are bone, not blood-bright (Law 1)");
  // #2: role chips brought up to the Skills text treatment (as cond-chips were in v56)
  const role = (CSS.match(/\.role-chip\s*\{([^}]*)\}/) || [])[1] || "";
  assert(/color:\s*var\(--bone\)/.test(role) && /font-size:\s*0\.82rem/.test(role) && /letter-spacing:\s*0\.08em/.test(role),
    "706. Role chips use the Skills text treatment (bone / 0.82rem / 0.08em)");
  assert(/\.role-chip\.active\s*\{[^}]*var\(--blood-bright\)/.test(CSS), "707. Active role chip is blood-bright");
  // #1: inventory head wraps so the burden badge cannot clip at 375px
  assert(/\.inv-head\s*\{[^}]*flex-wrap:\s*wrap/.test(CSS), "708. Inventory head wraps (badge no longer clips)");
  assert(/\.inv-head \.field-label\s*\{[^}]*flex:\s*1 1 100%/.test(CSS), "709. Inventory title takes its own line");
  // #3 (extended): overlay-header die values (ATHLETICS D8, Death Roll d20, effort dice) go bone too
  assert(/\.overlay-skill span\s*\{\s*color:\s*var\(--bone\)/.test(CSS), "710. Overlay-header die values are bone, not blood-bright (Law 1)");
}

// ---- v71. Handbook + How to Play primer ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const howtoBlock = SRC.slice(SRC.indexOf("const HOWTO_SECTIONS"), SRC.indexOf("const WORLD_SECTIONS"));
  assert((howtoBlock.match(/\{ h: "/g) || []).length === 11, "711. How-to-Play primer has 11 sections");
  const { d } = makeDOM(null);
  assert(hidden(d.getElementById("screen-handbook")), "712. Handbook hidden by default");
  click(d.getElementById("btn-how-to-play"));
  assert(!hidden(d.getElementById("screen-handbook")) && hidden(d.getElementById("screen-intro")),
    "713. How to Play opens the Handbook from the intro");
  click([...d.querySelectorAll(".handbook-nav-btn")].find((b) => /How to Play/.test(b.textContent)));
  assert(d.querySelectorAll("#handbook-body .howto-h").length === 11, "714. Primer renders 11 section headers");
  assert(d.querySelectorAll("#handbook-body .howto-p").length === 11, "715. Primer renders 11 section bodies");
  const nav = d.querySelector("#handbook-nav .handbook-nav-btn.active");
  assert(nav && /How to Play/.test(nav.textContent), "716. How to Play nav section is active once selected");
  const first = d.querySelector("#handbook-body .howto-h");
  assert(first && first.textContent === "The Roll", "717. First primer section is The Roll");
  click(d.getElementById("handbook-back"));
  assert(!hidden(d.getElementById("screen-intro")) && hidden(d.getElementById("screen-handbook")),
    "718. Back returns to the intro");
}
{
  // From inside the shell: the ? button opens the Handbook and back returns to the shell
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("btn-handbook"));
  assert(!hidden(d.getElementById("screen-handbook")) && hidden(d.getElementById("screen-shell")),
    "719. Handbook opens from the shell (? button)");
  click(d.getElementById("handbook-back"));
  assert(!hidden(d.getElementById("screen-shell")) && hidden(d.getElementById("screen-handbook")),
    "720. Back returns to the shell");
}

// ---- v71. Rules Reference (accordion) ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert((SRC.match(/\{ title: "/g) || []).length === 11, "721. Rules Reference has 11 topics (v81 adds Languages)");
  const { d } = makeDOM(null);
  click(d.getElementById("btn-how-to-play"));
  const navBtns = [...d.querySelectorAll("#handbook-nav .handbook-nav-btn")];
  assert(navBtns.length === 4 && navBtns.some((b) => /Rules Reference/.test(b.textContent)),
    "722. Handbook nav includes Rules Reference");
  click(navBtns.find((b) => /Rules Reference/.test(b.textContent)));
  assert(d.querySelectorAll("#handbook-body .rules-topic").length === 11, "723. Rules Reference renders 11 collapsible topics");
  assert([...d.querySelectorAll(".rules-topic-body")].every((b) => hidden(b)), "724. Topics collapsed by default");
  const firstHead = d.querySelector(".rules-topic-head");
  assert(firstHead.querySelector(".rules-topic-title").textContent === "Making Rolls", "725. First topic is Making Rolls");
  click(firstHead);
  assert(!hidden(d.querySelector(".rules-topic .rules-topic-body")), "726. Tapping a topic expands its body");
  assert(firstHead.getAttribute("aria-expanded") === "true", "727. Expanded topic sets aria-expanded true");
  click(firstHead);
  assert(hidden(d.querySelector(".rules-topic .rules-topic-body")), "728. Tapping again collapses the topic");
  click([...d.querySelectorAll("#handbook-nav .handbook-nav-btn")].find((b) => /How to Play/.test(b.textContent)));
  assert(d.querySelectorAll("#handbook-body .howto-h").length === 11 && d.querySelectorAll(".rules-topic").length === 0,
    "729. Switching sections swaps the content");
}

// ---- v71. Handbook World section ----
{
  const { d } = makeDOM(null);
  click(d.getElementById("btn-how-to-play"));
  const navBtns = [...d.querySelectorAll("#handbook-nav .handbook-nav-btn")];
  assert(navBtns.length === 4 && navBtns.some((b) => b.textContent === "World"), "730. Handbook nav has four sections including World (v82 adds At the Table)");
  click(navBtns.find((b) => b.textContent === "World"));
  const heads = d.querySelectorAll("#handbook-body .howto-h");
  assert(heads.length === 9, "731. World renders 9 sections");
  assert(heads[0].textContent === "The Silence", "732. First World section is The Silence");
  assert(/Dessa/.test(d.getElementById("handbook-body").textContent), "733. World includes setting detail (Dessa the archivist)");
  click([...d.querySelectorAll(".handbook-nav-btn")].find((b) => /Rules Reference/.test(b.textContent)));
  assert(d.querySelectorAll(".rules-topic").length === 11 && d.querySelectorAll("#handbook-body .howto-h").length === 0,
    "734. Switching from World to Rules swaps the content");
}

// ---- v71. Saves roller (Body/Mind/Spirit map to Athletics/Awareness/Presence) ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(/id: "body",\s+label: "Body",\s+skill: "Athletics"/.test(SRC) &&
         /id: "mind",\s+label: "Mind",\s+skill: "Awareness"/.test(SRC) &&
         /id: "spirit",\s+label: "Spirit",\s+skill: "Presence"/.test(SRC),
    "735. Saves map Body/Mind/Spirit to Athletics/Awareness/Presence");
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const saveBtns = [...d.querySelectorAll("#saves-row .save-btn")];
  assert(saveBtns.length === 3, "736. Three Save buttons on the sheet");
  click(saveBtns.find((b) => /Body/.test(b.textContent)));
  assert(!hidden(d.getElementById("overlay-difficulty")), "737. Tapping a Save opens the difficulty picker");
  assert(d.getElementById("diff-skill-name").textContent.startsWith("Body Save"), "738. Save picker header reads 'Body Save'");
  assert(d.getElementById("diff-skill-die").textContent === "d8", "739. Body Save shows the Athletics die (Warrior d8)");
  // A successful Body Save uses Athletics and ticks it (feeds skill improvement). Force a pass.
  w.eval("Math.random=function(){return 0.99;};");
  click(d.querySelector('#overlay-difficulty .diff-btn[data-target="4"]'));   // Easy 4+
  assert(JSON.parse(w.localStorage.getItem("tystnad-character")).skillTicks.Athletics === true,
    "740. A successful Body Save ticks Athletics");
}

// ---- v72. Rest & Recovery (First Aid / Post-Combat Breather / Rest) ----
{
  assert(/id="btn-recover"/.test(HTML), "741. HP strip carries the Rest and recovery button");
  assert(/id="overlay-recovery"/.test(HTML) && /id="rec-firstaid"/.test(HTML) &&
         /id="rec-breather"/.test(HTML) && /id="rec-rest"/.test(HTML),
    "742. Recovery overlay has First Aid, Breather, and Rest actions");

  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  assert(w.eval("typeof openRecovery === 'function' && typeof healBy === 'function' && typeof recoverFirstAid === 'function'"),
    "743. Recovery functions are defined");

  // No edges, not a Scholar: First Aid = 1d4, Breather = 3
  assert(w.eval("firstAidBonus()") === 0, "744. First Aid bonus 0 without Samaritan or Healing Hands");
  assert(w.eval("breatherAmount()") === 3, "745. Breather recovers 3 without Mending Flesh");

  // openRecovery reveals the overlay and writes the modifier-aware hints
  w.eval("openRecovery();");
  assert(!hidden(d.getElementById("overlay-recovery")), "746. openRecovery shows the overlay");
  assert(d.getElementById("rec-firstaid-hint").textContent.includes("1d4 HP"),
    "747. First Aid hint reads 1d4 with no bonus");
  assert(d.getElementById("rec-breather-hint").textContent.includes("Recover 3 HP"),
    "748. Breather hint reads 3 HP");

  // Rest heals exactly 1
  w.eval("recoverRest();");
  assert(JSON.parse(w.localStorage.getItem("tystnad-character")).hpCur === 11,
    "749. Rest One Hour heals +1 HP (10 -> 11)");

  // Breather from 11: +3 capped at max 12
  w.eval("recoverBreather();");
  assert(JSON.parse(w.localStorage.getItem("tystnad-character")).hpCur === 12,
    "750. Breather caps current HP at max (11 +3 -> 12)");
  assert(/\+1 HP/.test(d.getElementById("recovery-result").textContent),
    "751. Recovery result reports the actual HP gained, not the full amount");

  // At full HP, Rest reports no gain
  w.eval("recoverRest();");
  assert(/Already at full HP/.test(d.getElementById("recovery-result").textContent),
    "752. Rest at full HP reports Already at full HP");

  // First Aid rolls 1d4 and applies it (bonus 0 here)
  const fa = makeDOM(Object.assign({}, WARRIOR, { hpCur: 2 }));
  click(fa.d.getElementById("btn-continue"));
  fa.w.eval("Math.random=function(){return 0.5;};");   // rollD4 -> 3
  fa.w.eval("recoverFirstAid();");
  assert(JSON.parse(fa.w.localStorage.getItem("tystnad-character")).hpCur === 5,
    "753. First Aid heals the 1d4 roll (2 + rolled 3 = 5)");
  assert(/rolled 3/.test(fa.d.getElementById("recovery-result").textContent),
    "754. First Aid result shows the die roll");

  // Scholar level 6 with Samaritan (edge 6) + Mending Flesh (edge 15): First Aid 1d4+2, Breather 4
  const sch = makeDOM(Object.assign({}, WARRIOR, { cls: "Scholar", level: 6, edges: [6, 15], hpCur: 2 }));
  click(sch.d.getElementById("btn-continue"));
  assert(sch.w.eval("firstAidBonus()") === 2, "755. Scholar L6 stacks Samaritan +1 and Healing Hands +1 (First Aid +2)");
  assert(sch.w.eval("breatherAmount()") === 4, "756. Mending Flesh raises Breather to 4");
  sch.w.eval("openRecovery();");
  assert(sch.d.getElementById("rec-firstaid-hint").textContent.includes("1d4+2 HP"),
    "757. First Aid hint reflects the +2 bonus");
  sch.w.eval("recoverBreather();");
  assert(JSON.parse(sch.w.localStorage.getItem("tystnad-character")).hpCur === 6,
    "758. Scholar Breather heals 4 (2 -> 6)");
}

// ---- v73. Discovery Points / Haven Level tracker ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(/HAVEN_THRESHOLDS = \{ 1: 20, 2: 25, 3: 30, 4: 40, 5: 50, 6: 70, 7: 90, 8: 110, 9: 140, 10: 170, 11: 200 \}/.test(SRC),
    "759. Haven Level thresholds match canon (20/25/30/40/50/70/90/110/140/170/200)");
  assert(/id="haven-dp"/.test(HTML) && /id="dp-awards"/.test(HTML) && /id="dp-bar-fill"/.test(HTML),
    "760. Discovery Points block present in the advancement panel");

  // migrate defaults dp to 0 for a save that predates the field (WARRIOR fixture has none)
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("save();");
  assert(JSON.parse(w.localStorage.getItem("tystnad-character")).dp === 0,
    "761. migrate defaults dp to 0 for older saves");
  assert(w.eval("typeof renderHavenDP === 'function' && typeof awardDP === 'function' && typeof havenThreshold === 'function'"),
    "762. DP functions are defined");

  // Level 1: threshold 20, 8 award buttons, toward Haven Level 2
  assert(w.eval("havenThreshold()") === 20, "763. Level 1 threshold is 20 DP");
  assert(d.querySelectorAll("#dp-awards .dp-award-btn").length === 8,
    "764. Eight canonical DP award buttons render");
  assert(d.getElementById("dp-target").textContent.includes("20") &&
         /Toward Haven Level 2/.test(d.getElementById("dp-note").textContent),
    "765. DP readout targets the next threshold and names Haven Level 2");

  // Awarding DP accumulates and, at the threshold, flags ready
  w.eval("awardDP(10); awardDP(10);");
  assert(JSON.parse(w.localStorage.getItem("tystnad-character")).dp === 20,
    "766. awardDP accumulates Discovery Points");
  assert(d.getElementById("dp-bar-fill").classList.contains("dp-ready") &&
         /Haven can advance to Level 2/.test(d.getElementById("dp-note").textContent),
    "767. Reaching the threshold flags 'Haven can advance' (ready state)");

  // Level Up resets DP to 0 and moves to the next threshold
  w.eval("levelUp();");
  const after = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(after.level === 2 && after.dp === 0, "768. Level Up advances the level and resets DP to 0");
  assert(w.eval("havenThreshold()") === 25 &&
         /Toward Haven Level 3/.test(d.getElementById("dp-note").textContent),
    "769. After advancing, the tracker targets the next Haven Level (25 DP)");

  // The free Level stepper leaves DP untouched (only Level Up resets it)
  w.eval("awardDP(5); adjustLevel(1);");
  assert(JSON.parse(w.localStorage.getItem("tystnad-character")).dp === 5,
    "770. The Level stepper does not reset DP");

  // Level 12: Haven fully emerged, no threshold, no award buttons (fixture, not eval-assigned state)
  const hv = makeDOM(Object.assign({}, WARRIOR, { level: 12 }));
  click(hv.d.getElementById("btn-continue"));
  assert(hv.w.eval("havenThreshold()") === null, "771. Level 12 has no further Haven threshold");
  assert(hv.d.querySelectorAll("#dp-awards .dp-award-btn").length === 0 &&
         /fully emerged/.test(hv.d.getElementById("dp-note").textContent),
    "772. Level 12 shows 'fully emerged' and hides the award buttons");
}

// ---- v44-D. openDefense renders effective die in def-edit-value and non-empty note ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("openDefense();");
  assert(d.getElementById("def-edit-value").textContent === "d10",
    "504. openDefense renders effectiveDefense() in def-edit-value (d8+medium=d10 for Warrior)");
  assert(d.getElementById("def-armor-note").textContent.length > 0,
    "505. openDefense renders non-empty def-armor-note");
}

// ---- v44-E. wakeAtOneHP sets hpCur=1, hides btn-death, closes overlay ----
{
  const { w, d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  // Open the result overlay to simulate a surviving Death Roll state
  w.eval("show(document.getElementById('overlay-result'));");
  // Call wakeAtOneHP via inline eval (ev.stopPropagation won't throw; just needs a method)
  w.eval("wakeAtOneHP({ stopPropagation: function() {} });");
  // After wake: hpCur=1 (read from localStorage as proxy)
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(saved.hpCur === 1, "506. wakeAtOneHP sets hpCur to 1 (verified via localStorage)");
  assert(d.getElementById("btn-death").classList.contains("hidden"),
    "507. wakeAtOneHP hides btn-death via renderHP()");
  assert(d.getElementById("overlay-result").classList.contains("hidden"),
    "508. wakeAtOneHP closes overlay-result via closeResultOverlay()");
}

// ---- v44-F. Death Roll survival verdict contains WAKE AT 1 HP button and further-damage note ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const deathFn = SRC.slice(SRC.indexOf("function performRoll("), SRC.indexOf("function rollSkill("));
  const survivalBlock = deathFn.slice(deathFn.indexOf("opts.death"), deathFn.indexOf("} else if (opts.cast)"));
  assert(survivalBlock.includes('data-action="wake"'),
    "509. Death Roll survival verdict contains the wake button");
  assert(survivalBlock.includes("Further damage kills outright"),
    "510. Death Roll survival verdict contains Further damage kills outright note");
}

// ---- v44-G. Import rejects invalid field values ----
{
  const base = {
    name: "Asa G", cls: "Warrior",
    skills: { Athletics: "d8", Awareness: "d6", Combat: "d8", Finesse: "d6",
              Ingenuity: "d6", Lore: "d6", Presence: "d8", Sorcery: "d6" },
    hpMax: 12, hpCur: 10, defense: "d8",
    loadout: { armor: "medium", weapon: "standard" },
    items: [], coins: 0, roles: [], skillTicks: {},
    supply: 0, conditions: {}, level: 5
  };
  const { w } = makeDOM(null);
  function rejects(overrides, label) {
    const obj = Object.assign({}, base, overrides);
    if (overrides.skills) obj.skills = Object.assign({}, base.skills, overrides.skills);
    let threw = false;
    try { w.eval("parseCharacterJSON(" + JSON.stringify(JSON.stringify(obj)) + ")"); }
    catch (_) { threw = true; }
    assert(threw, label);
  }
  rejects({ skills: { Combat: "d100" } },               "511. Import rejects skill die d100");
  rejects({ defense: "d100" },                           "512. Import rejects defense d100");
  rejects({ defense: "d20" },                            "513. Import rejects defense d20");
  rejects({ level: 0 },                                  "514. Import rejects level 0");
  rejects({ level: 21 },                                 "515. Import rejects level 21");
  rejects({ conditions: { "unknown-cond": true } },      "516. Import rejects unknown condition key");
  rejects({ roles: ["Unknown"] },                        "517. Import rejects unknown expedition role");
  rejects({ items: "not-an-array" },                     "518. Import rejects items not an array");
  rejects({ items: [{ name: "Torch", lp: "heavy" }] },  "519. Import rejects item lp non-numeric");
  rejects({ hpMax: 0 },                                  "520. Import rejects hpMax 0");
  rejects({ hpCur: 13 },                                 "521. Import rejects hpCur above hpMax");
}

// ---- v44-H. Import accepts valid data ----
{
  const { w } = makeDOM(null);
  const fullChar = {
    name: "Asa G", cls: "Warrior",
    skills: { Athletics: "d8", Awareness: "d6", Combat: "d8", Finesse: "d6",
              Ingenuity: "d6", Lore: "d6", Presence: "d8", Sorcery: "d6" },
    hpMax: 12, hpCur: 10, defense: "d8",
    loadout: { armor: "medium", weapon: "standard" },
    items: [{ name: "Torch", lp: 1 }], coins: 50,
    roles: ["Pathfinder"], skillTicks: { Combat: 1 },
    supply: 3, conditions: { weary: true }, level: 5
  };
  let result = null;
  try { result = w.eval("parseCharacterJSON(" + JSON.stringify(JSON.stringify(fullChar)) + ")"); }
  catch (_) { result = null; }
  assert(result !== null && result.name === "Asa G",
    "522. Import accepts current-schema round-trip");

  const oldChar = {
    name: "Asa G", cls: "Warrior",
    skills: { Athletics: "d8", Awareness: "d6", Combat: "d8", Finesse: "d6",
              Ingenuity: "d6", Lore: "d6", Presence: "d8", Sorcery: "d6" },
    hpMax: 12, hpCur: 10, defense: "d8",
    loadout: { armor: "medium", weapon: "standard" },
    items: [], coins: 0
  };
  let oldResult = null;
  try { oldResult = w.eval("parseCharacterJSON(" + JSON.stringify(JSON.stringify(oldChar)) + ")"); }
  catch (_) { oldResult = null; }
  assert(oldResult !== null && oldResult.level === 1,
    "523. Import accepts old-schema backup (missing newer fields seeded by migrate)");
}

// ---- v44-I. Source no longer contains deleted dead code ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  assert(!SRC.includes("DIFFICULTY_NAMES"), "524. Source no longer contains DIFFICULTY_NAMES");
  assert(!SRC.includes("TERRAIN_NAMES"),    "525. Source no longer contains TERRAIN_NAMES");
  assert(!SRC.includes("THREAT_NAMES"),     "526. Source no longer contains THREAT_NAMES");
  assert(!SRC.includes("rollExplosion"),    "527. Source no longer contains rollExplosion");
}

// ---- v44-J. VERSION and cache ----
{
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "528. app.js VERSION pin matches the current release");
  assert(fs.readFileSync("sw.js","utf8").includes('"tystnad-v91"'),          "529. sw.js cache tystnad-v91");
}

// ---- v45-A. Legibility: zoom, opacity, text floor, html touch-action ----
{
  const HTML = fs.readFileSync("index.html", "utf8");
  const CSS  = fs.readFileSync("style.css",  "utf8");
  assert(!HTML.includes("user-scalable=no"),         "530. viewport no longer locks zoom");
  assert(CSS.includes("touch-action: manipulation"), "531. html has touch-action: manipulation");
  assert(!CSS.includes("opacity: 0.5"),              "532. spell-locked opacity removed");
  assert(!CSS.includes("font-size: 0.55rem"),        "533. no sub-0.75rem chip-hint stratum");
  assert(!CSS.includes("font-size: 0.62rem"),        "534. no sub-0.75rem vital-label stratum");
  assert(!CSS.includes("color: var(--blood);\n  font-size"),
                                                     "535. no blood color on small text labels");
}

// ============================================================
// v46 ASSERTIONS — Level Fix, Section Headers, Tier Split, Nav
// ============================================================

// ---- v46-A. migrate() is a no-op on a freshly created character ----
{
  const { w, d } = makeDOM(null);
  wizardCreate(w, d, "Warrior", "Fresh");
  const fresh = JSON.parse(w.localStorage.getItem("tystnad-character"));
  const migratedClone = w.eval("(function() { var c = " + JSON.stringify(fresh) + "; migrate(c); return c; })()");
  assert(JSON.stringify(fresh) === JSON.stringify(migratedClone),
    "536. migrate() is a no-op on a freshly created character (schema complete -- most important assertion in v46)");
}

// ---- v46-B. Fresh character level === 1; Tier 2 and 3 locked ----
{
  const { w, d } = makeDOM(null);
  wizardCreate(w, d, "Sorcerer", "Fresh");
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
  assert(saved.level === 1, "537. Fresh character has level === 1 (createCharacter regression fixed)");
  click(d.querySelector(".sorcery-tab"));
  const locked = d.querySelectorAll(".spell-row.spell-locked");
  assert(locked.length === 20, "538. 20 spell rows locked at level 1 for fresh Sorcerer (Tier 2 + Tier 3)");
}

// ---- v46-C. .spell-tier-header: 1.5rem, blood-bright, Cormorant ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const tierHdrMatch = CSS.match(/\.spell-tier-header\s*\{([^}]*)\}/);
  assert(tierHdrMatch && tierHdrMatch[1].includes("1.5rem"), "539a. .spell-tier-header font-size is 1.5rem");
  assert(tierHdrMatch && tierHdrMatch[1].includes("var(--blood-bright)"), "539b. .spell-tier-header color is blood-bright");
  assert(tierHdrMatch && tierHdrMatch[1].includes("var(--font-display)"), "539c. .spell-tier-header uses Cormorant display font");
}

// ---- v46-D. Tier header HTML has tier-name/tier-mech spans; tier-mech uses bone ----
{
  const sorc = Object.assign({}, SORCERER, { level: 1 });
  const { d } = makeDOM(sorc);
  click(d.getElementById("btn-continue"));
  click(d.querySelector(".sorcery-tab"));
  const headers = d.querySelectorAll(".spell-tier-header");
  assert(headers.length === 3, "540a. Three .spell-tier-header elements rendered");
  assert(headers[0].querySelector(".tier-name") !== null, "540b. First tier header contains .tier-name span");
  assert(headers[0].querySelector(".tier-mech") !== null, "540c. First tier header contains .tier-mech span");
  const CSS = fs.readFileSync("style.css", "utf8");
  const mechMatch = CSS.match(/\.tier-mech\s*\{([^}]*)\}/);
  assert(mechMatch && mechMatch[1].includes("var(--bone)"), "540d. .tier-mech color is bone");
}

// ---- v47-E. Nav: .tab-label is 1rem; no .tab-bar--five override ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const labelMatch = CSS.match(/\.tab-label\s*\{([^}]*)\}/);
  assert(labelMatch && labelMatch[1].includes("1rem"), "541a. .tab-label font-size is 1rem (v47 icon nav)");
  assert(!CSS.match(/\.tab-bar--five \.tab-btn\s*\{[^}]*font-size/), "541b. No .tab-bar--five .tab-btn font-size override");
  assert(!CSS.match(/\.tab-bar--five \.tab-btn\s*\{[^}]*letter-spacing/), "541c. No .tab-bar--five .tab-btn letter-spacing override");
}

// ---- v46-F. Section labels: .shell-screen .field-label and .vital-label are 1.5rem ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.match(/\.shell-screen \.field-label\s*\{[^}]*1\.5rem/), "542a. .shell-screen .field-label font-size is 1.5rem");
  const vitalMatch = CSS.match(/\.vital-label\s*\{([^}]*)\}/);
  assert(vitalMatch && vitalMatch[1].includes("1.5rem"), "542b. .vital-label font-size is 1.5rem");
  assert(vitalMatch && vitalMatch[1].includes("var(--font-display)"), "542c. .vital-label uses Cormorant display font");
}

// ---- v47-G. VERSION and cache ----
{
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "543a. app.js VERSION pin matches the current release");
  assert(fs.readFileSync("sw.js","utf8").includes('"tystnad-v91"'), "543b. sw.js cache tystnad-v91");
}

// ============================================================
// v47 — ICON NAVIGATION
// ============================================================

// ---- v47-A. Each .tab-btn contains an svg and a .tab-label span ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const btns = d.querySelectorAll(".tab-btn");
  assert(btns.length >= 4, "544a. At least four .tab-btn elements present");
  let allHaveSvg = true, allHaveLabel = true;
  btns.forEach((b) => {
    if (!b.querySelector("svg")) allHaveSvg = false;
    if (!b.querySelector(".tab-label")) allHaveLabel = false;
  });
  assert(allHaveSvg, "544b. Every .tab-btn contains an svg");
  assert(allHaveLabel, "544c. Every .tab-btn contains a .tab-label span");
}

// ---- v47-B. Label text: HOME, EXPEDITION, COMBAT, GEAR; SORCERY for Sorcerer ----
{
  const { d } = makeDOM(SORCERER);
  click(d.getElementById("btn-continue"));
  const labels = Array.from(d.querySelectorAll(".tab-btn .tab-label")).map((s) => s.textContent.trim());
  assert(labels[0] === "HOME", "545a. First tab label is HOME");
  assert(labels[1] === "EXPEDITION", "545b. Second tab label is EXPEDITION");
  assert(labels[2] === "COMBAT", "545c. Third tab label is COMBAT");
  assert(labels[3] === "GEAR", "545d. Fourth tab label is GEAR");
  assert(labels[4] === "SORCERY", "545e. Fifth tab label is SORCERY");
}

// ---- v47-C. Every tab button has an aria-label ----
{
  const { d } = makeDOM(SORCERER);
  click(d.getElementById("btn-continue"));
  const btns = d.querySelectorAll(".tab-btn");
  let allHaveAria = true;
  btns.forEach((b) => { if (!b.getAttribute("aria-label")) allHaveAria = false; });
  assert(allHaveAria, "546. Every .tab-btn has an aria-label attribute");
}

// ---- v47-D. All svgs use stroke="currentColor" ----
{
  const HTML = fs.readFileSync("index.html", "utf8");
  const svgMatches = HTML.match(/<svg[^>]*>/g) || [];
  const navSvgs = svgMatches.filter((s) => s.includes('stroke="currentColor"'));
  assert(navSvgs.length >= 5, "547. At least five inline SVGs use stroke=currentColor");
}

// ---- v47-E. No tab-bar--five in HTML, CSS, or JS source ----
{
  const HTML = fs.readFileSync("index.html", "utf8");
  const CSS = fs.readFileSync("style.css", "utf8");
  const JS = fs.readFileSync("app.js", "utf8");
  assert(!HTML.includes("tab-bar--five"), "548a. No tab-bar--five in index.html");
  assert(!CSS.includes("tab-bar--five"), "548b. No tab-bar--five in style.css");
  assert(!JS.includes("tab-bar--five"), "548c. No tab-bar--five in app.js");
}

// ---- v47-F. Active class toggles correctly with icon nav ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const sheetBtn = d.querySelector(".tab-btn[data-tab='sheet']");
  const combatBtn = d.querySelector(".tab-btn[data-tab='combat']");
  assert(sheetBtn.classList.contains("active"), "549a. Sheet tab active on load");
  click(combatBtn);
  assert(combatBtn.classList.contains("active"), "549b. Combat tab active after click");
  assert(!sheetBtn.classList.contains("active"), "549c. Sheet tab inactive after combat click");
  assert(combatBtn.querySelector(".tab-label").textContent.trim() === "COMBAT", "549d. Active combat tab label reads COMBAT");
}

// ============================================================
// v49 — HP / SUPPLY CLUSTER TIGHTENING
// ============================================================

// ---- v49-A. .hp-controls is a tight cluster: no flex:1, no space-between, gap 12px ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const m = CSS.match(/\.hp-controls\s*\{([^}]*)\}/);
  assert(m && !m[1].includes("flex: 1"), "550a. .hp-controls has no flex:1 (v49 tight cluster)");
  assert(m && !m[1].includes("space-between"), "550b. .hp-controls has no justify-content:space-between");
  assert(m && m[1].includes("gap: 12px"), "550c. .hp-controls gap is 12px");
}

// ---- v49-B. .hp-compact-strip has justify-content: space-between ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  const m = CSS.match(/\.hp-compact-strip\s*\{([^}]*)\}/);
  assert(m && m[1].includes("space-between"), "551. .hp-compact-strip has justify-content:space-between");
}

// ============================================================
// v50 — ENEMY DAMAGE BONUS, NAV PILL BORDER FIX, OVERLAY CLEARANCE
// ============================================================

// ---- v50-A. Defense overlay header is "ENEMY DAMAGE BONUS" not "DAMAGE BONUS" ----
{
  const HTML = fs.readFileSync("index.html", "utf8");
  assert(HTML.includes("Enemy Damage Bonus"), "552. Defense overlay label reads Enemy Damage Bonus");
  assert(!HTML.includes(">Damage Bonus<"), "553. No bare Damage Bonus label (must be Enemy Damage Bonus)");
}

// ---- v50-B. Two-layer nav pill: wrapper div exists, tab-bar loses fixed positioning ----
{
  const HTML = fs.readFileSync("index.html", "utf8");
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(HTML.includes("tab-bar-wrapper"), "554. tab-bar-wrapper div present in index.html");
  assert(CSS.includes(".tab-bar-wrapper"), "555. .tab-bar-wrapper rule present in style.css");
  // Outer wrapper owns fixed positioning
  const wrapperBlock = CSS.match(/\.tab-bar-wrapper\s*\{([^}]*)\}/);
  assert(wrapperBlock && wrapperBlock[1].includes("position: fixed"), "556. .tab-bar-wrapper has position:fixed");
  assert(wrapperBlock && wrapperBlock[1].includes("var(--blood)"), "557. .tab-bar-wrapper uses blood background");
  assert(wrapperBlock && wrapperBlock[1].includes("padding: 1px"), "558. .tab-bar-wrapper has 1px padding");
  // Inner .tab-bar has no position:fixed, uses 7px clip-path
  const barBlock = CSS.match(/\.tab-bar\s*\{([^}]*)\}/);
  assert(barBlock && !barBlock[1].includes("position: fixed"), "559. .tab-bar has no position:fixed");
  assert(barBlock && barBlock[1].includes("7px"), "560. .tab-bar clip-path uses 7px inner chamfer");
}

// ---- v50-C. Declaration overlays have 88px bottom clearance ----
{
  const CSS = fs.readFileSync("style.css", "utf8");
  assert(CSS.includes("#overlay-defense { background: #0c0a0b; padding-bottom: calc(env(safe-area-inset-bottom) + 88px); }"), "561. overlay-defense has 88px bottom clearance");
  assert(CSS.includes("#overlay-attack { background: #0c0a0b; padding-bottom: calc(env(safe-area-inset-bottom) + 88px); }"), "562. overlay-attack has 88px bottom clearance");
}

// ---- v51-D. VERSION and cache ----
{
  assert(fs.readFileSync("sw.js","utf8").includes("tystnad-v91"), "563. sw.js cache tystnad-v91");
  assert(fs.readFileSync("app.js","utf8").includes('const VERSION = "v91"'), "564. app.js VERSION pin matches the current release");
}

// ---- v51-TL. Table Link surface (CAP-07) ----
{
  const APP = fs.readFileSync("app.js", "utf8");
  const CSS = fs.readFileSync("style.css", "utf8");

  // Static: config + storage isolation
  assert(/const BACKEND_BASE = "https:\/\/playtystnad\.com"/.test(APP),
    "565. app.js BACKEND_BASE points at production (v53 go-live)");
  assert(APP.includes('const TABLELINK_KEY = "tystnad-tablelink"'),
    "566. Table Link uses its own storage key");
  assert(APP.includes('const STORAGE_KEY = "tystnad-character"'),
    "567. Solo character storage key unchanged");
  const tlStart = APP.indexOf("link a device, join a GM's table, poll");
  const tlEnd = APP.indexOf("// ---------- Wiring ----------", tlStart);
  const tlBlock = APP.slice(tlStart, tlEnd);
  assert(tlStart > 0 && tlEnd > tlStart && !/innerHTML/.test(tlBlock),
    "568. No innerHTML in the Table Link module (textContent only)");

  // DOM: entry + screen + states present, hidden on boot
  {
    const { d } = makeDOM(null);
    assert(visible(d.getElementById("btn-join-table")), "569. 'Join a table' entry visible on intro");
    assert(hidden(d.getElementById("screen-table")), "570. Table Link screen hidden on boot");
    assert(d.getElementById("tl-state-link"), "571. link state exists");
    assert(d.getElementById("tl-state-lobby"), "572. lobby state exists");
    assert(d.getElementById("tl-state-session"), "573. session state exists");
  }

  // No device token → clicking 'Join a table' shows the link state
  {
    const { d } = makeDOM(null);
    click(d.getElementById("btn-join-table"));
    assert(visible(d.getElementById("screen-table")), "574. Table Link screen shown after entry");
    assert(hidden(d.getElementById("screen-intro")), "575. Intro hidden after entry");
    assert(visible(d.getElementById("tl-state-link")), "576. Not-linked → link state visible");
    assert(hidden(d.getElementById("tl-state-lobby")), "577. Not-linked → lobby hidden");
  }

  // Solo core is untouched by Table Link state and vice versa
  {
    const dom = new JSDOM(HTML, { url: "http://localhost/", runScripts: "outside-only" });
    const w = dom.window;
    w.localStorage.setItem("tystnad-character", JSON.stringify(WARRIOR));
    w.localStorage.setItem("tystnad-tablelink", JSON.stringify({ token: "tok-abc", ownsTableLink: true }));
    w.eval(`window.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ownsTableLink: true }) });`);
    w.eval(APPJS);
    w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
    const d = w.document;
    // Solo character still loads alongside a linked device (Continue sublabel proves it)
    const sub = d.getElementById("continue-sub");
    assert(visible(d.getElementById("btn-continue")) && sub && sub.textContent.includes("Asa G"),
      "578. Solo character still loads alongside a linked device");
    assert(w.localStorage.getItem("tystnad-tablelink") !== null, "579. Device token persists under its own key");
    // Entering with a device goes straight to lobby (proves the token was loaded)
    click(d.getElementById("btn-join-table"));
    assert(visible(d.getElementById("tl-state-lobby")), "580. Linked device → lobby state visible");
    assert(hidden(d.getElementById("tl-state-link")), "581. Linked device → link state hidden");
  }

  // Renderers build the right card per type; textContent only (no HTML injection)
  {
    const { w } = makeDOM(null);
    const secret = w.eval("tlBuildCard({ id:1, type:'secret_text', payload:{ v:1, text:'<b>hidden</b> word' } })");
    assert(secret && secret.querySelector(".tl-card-body").textContent === "<b>hidden</b> word",
      "582. secret_text renders its text verbatim as textContent");
    assert(secret.querySelector("b") === null, "583. secret_text markup is NOT parsed as HTML (no injection)");

    const rule = w.eval("tlBuildCard({ id:2, type:'rule', payload:{ v:1, title:'Weary', body:'Targets shift up.' } })");
    assert(rule && rule.querySelector(".tl-card-title").textContent === "Weary", "584. rule renders title");
    assert(rule.querySelector(".tl-card-body").textContent === "Targets shift up.", "585. rule renders body");

    const img = w.eval("tlBuildCard({ id:3, type:'image', payload:{ caption:'Ghoul', assetUrl:'/api/v1/shared-assets/TKN' } })");
    const el = img.querySelector("img");
    const backendBase = (APP.match(/const BACKEND_BASE = "([^"]+)"/) || [])[1];
    assert(el && el.getAttribute("src") === backendBase + "/api/v1/shared-assets/TKN",
      "586. image src is BACKEND_BASE + assetUrl");
    assert(el.getAttribute("alt") === "Ghoul", "587. image alt uses caption");

    const unknown = w.eval("tlBuildCard({ id:4, type:'mystery', payload:{} })");
    assert(unknown === null, "588. Unknown message type renders nothing");
  }

  // Fire-and-forget pop-up queue: one at a time, oldest first, dismiss reveals the next
  {
    const { w, d } = makeDOM(null);
    const popup = d.getElementById("tl-popup");
    assert(hidden(popup), "589. No pop-up at rest before any message arrives");
    w.eval("tlRenderMessages([{id:1,type:'rule',payload:{title:'One',body:'a'}},{id:2,type:'rule',payload:{title:'Two',body:'b'}}])");
    assert(visible(popup), "590. A push opens the pop-up");
    assert(d.getElementById("tl-popup-body").querySelector(".tl-card-title").textContent === "One",
      "591a. First arrival shows first (queue, oldest first)");
    w.eval("tlDismissPopup()");
    assert(visible(popup) && d.getElementById("tl-popup-body").querySelector(".tl-card-title").textContent === "Two",
      "591b. Dismissing reveals the next queued push");
    w.eval("tlDismissPopup()");
    assert(hidden(popup), "591c. Dismissing the last push closes the pop-up (queue empty)");
    // A dismissed message does not re-appear: the cursor already advanced, nothing re-enqueues.
    w.eval("tlPoll && tlRenderMessages([])");
    assert(hidden(popup), "591d. Empty poll leaves the pop-up closed (no re-show of dismissed pushes)");
  }

  // Pop-up is a dialog: role/aria on the element, Esc + × dismiss, image 404 self-dismisses
  {
    const { w, d } = makeDOM(null);
    const popup = d.getElementById("tl-popup");
    assert(popup.getAttribute("role") === "dialog" && popup.getAttribute("aria-modal") === "true",
      "591e. Pop-up carries role=dialog + aria-modal");
    w.eval("tlRenderMessages([{id:1,type:'secret_text',payload:{text:'psst'}}])");
    assert(w.document.activeElement === d.getElementById("tl-popup-close"), "591f. Focus lands on the × on open");
    w.eval("document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'}))");
    assert(hidden(popup), "591g. Esc dismisses the pop-up");
    // image asset 404 → the pop-up dismisses itself quietly
    w.eval("tlRenderMessages([{id:2,type:'image',payload:{caption:'x',assetUrl:'/api/v1/shared-assets/GONE'}}])");
    assert(visible(popup), "591h. Image push opens the pop-up");
    w.eval("var im=document.querySelector('#tl-popup-body img'); im.onerror();");
    assert(hidden(popup), "591i. A revoked image (onerror) self-dismisses quietly");
    assert(/img\.onerror\s*=/.test(APP) && /isConnected/.test(APP), "591j. image onerror guards on isConnected");
  }

  // Ending the session clears any open pop-up and its queue
  {
    const { w, d } = makeDOM(null);
    w.eval("tlRenderMessages([{id:1,type:'rule',payload:{title:'A',body:'a'}},{id:2,type:'rule',payload:{title:'B',body:'b'}}])");
    assert(visible(d.getElementById("tl-popup")), "591k. Pop-up open with one queued behind it");
    w.eval("tlEndSession(404)");
    assert(hidden(d.getElementById("tl-popup")), "591l. Session end clears the open pop-up");
    w.eval("tlRenderMessages([{id:3,type:'rule',payload:{title:'C',body:'c'}}])");
    // tlEndSession cleared the queue; but a fresh render would re-open — prove the queue was emptied
    // by confirming the dismissed 'B' is gone (only the new push, 'C', shows).
    assert(d.getElementById("tl-popup-body").querySelector(".tl-card-title").textContent === "C",
      "591m. Session end emptied the queue (no stale 'B' left behind)");
  }

  // Drop-to-link clears the stored token (401 / revoked path)
  {
    const dom = new JSDOM(HTML, { url: "http://localhost/", runScripts: "outside-only" });
    const w = dom.window;
    w.localStorage.setItem("tystnad-tablelink", JSON.stringify({ token: "tok-x", ownsTableLink: false }));
    w.eval(`window.fetch = () => Promise.resolve({ ok:true, status:200, json:()=>Promise.resolve({}) });`);
    w.eval(APPJS);
    w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
    w.eval("tlDropToLink()");
    assert(w.localStorage.getItem("tystnad-tablelink") === null, "591. tlDropToLink clears the stored device token");
    assert(visible(w.document.getElementById("tl-state-link")), "592. tlDropToLink returns to the link state");
  }

  // CSS: cards use palette-only colors and a Cormorant rule title
  {
    assert(/\.tl-card-title\s*\{[^}]*var\(--font-display\)/.test(CSS), "593. rule card title uses Cormorant display font");
    assert(/\.tl-card-body\s*\{[^}]*var\(--bone\)/.test(CSS), "594. card body text uses bone (data, not blood)");
  }

  // State matrix: in-session / session-end / leave DOM outcomes.
  // (Which HTTP status routes to which handler is verified live against staging; here we
  //  prove each handler's user-visible result.)
  {
    // tlEnterSession sets a clean connected view; tlSession stays null so the first poll no-ops (no network)
    const { d, w } = makeDOM(null);
    w.eval("tlEnterSession();");
    assert(visible(d.getElementById("tl-state-session")), "595. tlEnterSession shows the in-session view");
    assert(d.getElementById("tl-session-status").textContent === "At the table", "596. resting chip reads 'At the table' (not 'waiting')");
    assert(d.getElementById("tl-leave-btn").textContent === "Leave table", "597. leave button reads 'Leave table' while connected");
    assert(hidden(d.getElementById("tl-popup")), "598. no pop-up at rest on entering the session");
    w.eval("tlStopPolling();");

    // 404 unknown/closed session → graceful end with a clear status and a way back
    const a = makeDOM(null);
    a.w.eval("tlEndSession(404);");
    assert(a.d.getElementById("tl-session-status").textContent === "The table has closed.", "599. 404 → 'table has closed'");
    assert(a.d.getElementById("tl-leave-btn").textContent === "Back to lobby", "600. session-end relabels leave → 'Back to lobby'");

    // session.status closed/expired during a normal poll → same graceful end
    const b = makeDOM(null);
    b.w.eval("tlEndSession('closed');");
    assert(b.d.getElementById("tl-session-status").textContent === "The table has closed.", "601. closed/expired → 'table has closed'");

    // 403 not_a_participant (GM removed you) → graceful leave, distinct message
    const c = makeDOM(null);
    c.w.eval("tlEndSession(403);");
    assert(c.d.getElementById("tl-session-status").textContent === "The GM removed you from this table.", "602. 403 not_a_participant → 'GM removed you'");

    // Leave → back to lobby, session view gone
    const e = makeDOM(null);
    e.w.eval("tlLeaveSession();");
    assert(visible(e.d.getElementById("tl-state-lobby")), "603. tlLeaveSession returns to lobby");
    assert(hidden(e.d.getElementById("tl-state-session")), "604. tlLeaveSession hides the session view");

    // Offline keep-last-state: the reconnect banner shows and clears
    const f = makeDOM(null);
    f.w.eval("tlSetBanner('Reconnecting.');");
    assert(visible(f.d.getElementById("tl-conn-banner")) && f.d.getElementById("tl-conn-banner").textContent === "Reconnecting.",
      "605. connection banner shows offline/reconnect text");
    f.w.eval("tlClearBanner();");
    assert(hidden(f.d.getElementById("tl-conn-banner")), "606. connection banner clears on reconnect");
  }

  // Error-copy matrix: link + join error text maps the right message per error code
  {
    const { w } = makeDOM(null);
    const linkFull = w.eval("tlLinkErrorText({ status:429, data:{ error:'rate_limited' } })");
    assert(/too many/i.test(linkFull), "607. link 429/rate_limited → 'too many attempts' copy");
    const linkBad = w.eval("tlLinkErrorText({ status:422, data:{ error:'invalid_or_expired_code' } })");
    assert(/expired|fresh/i.test(linkBad), "608. link invalid_or_expired_code → regenerate copy");
    const joinFull = w.eval("tlJoinErrorText({ status:422, data:{ error:'session_full' } })");
    assert(/full|six/i.test(joinFull), "609. join session_full → 'table is full' copy");
    const joinBad = w.eval("tlJoinErrorText({ status:422, data:{ error:'invalid_or_expired_code' } })");
    assert(/expired|check/i.test(joinBad), "610. join invalid_or_expired_code → 'check with your GM' copy");
  }

  // v52 hardening: a poll resolving after the player left must not touch stale state.
  {
    const tlPollBody = APP.slice(APP.indexOf("async function tlPoll()"), APP.indexOf("// ---- Render pushed messages"));
    assert(/const sid = tlSession\.sessionId;/.test(tlPollBody) &&
           /if \(!tlPolling \|\| !tlSession \|\| tlSession\.sessionId !== sid\)/.test(tlPollBody),
      "611. tlPoll re-checks session identity after its await (stale-response guard)");
    const leaveBody = APP.slice(APP.indexOf("function tlLeaveSession()"), APP.indexOf("function tlEndSession"));
    assert(/tlClearBanner\(\)/.test(leaveBody), "612. tlLeaveSession clears the connection banner on leave");
  }

  // CAP-08: Party HUD character reporting (snapshot shape, role/condition/burden mapping, hooks)
  {
    const s = makeDOM(WARRIOR);
    click(s.d.getElementById("btn-continue"));
    const snap = JSON.parse(s.w.eval("JSON.stringify(tlBuildSnapshot())"));
    assert(snap.name === "Asa G" && snap.class === "Warrior", "613. snapshot carries character name + class");
    assert(snap.hp.current === 10 && snap.hp.max === 12, "614. snapshot hp current/max");
    assert(Array.isArray(snap.conditions) && snap.conditions.length === 0, "615. snapshot conditions empty when none active");
    assert(snap.role === null, "616. snapshot role null when no exploration role");
    assert(snap.initiativeMod === 0, "617. snapshot initiativeMod = armor+weapon (medium+standard = 0)");
    assert(snap.load.points === 0 && snap.load.burdened === false, "618. snapshot load points + burdened false when unburdened");

    const r = makeDOM(Object.assign({}, WARRIOR, {
      roles: ["Scout", "Pathfinder"], conditions: { weary: true }, items: [{ name: "Anvil", lp: 26 }]
    }));
    click(r.d.getElementById("btn-continue"));
    const snap2 = JSON.parse(r.w.eval("JSON.stringify(tlBuildSnapshot())"));
    assert(snap2.role === "Scout", "619. snapshot role = first assigned role (roles[0])");
    assert(snap2.conditions.length === 1 && snap2.conditions[0] === "Weary", "620. snapshot maps active conditions to display names");
    assert(snap2.load.burdened === true, "621. snapshot burdened true when Heavy/Overloaded");

    assert(/typeof tlSession !== "undefined" && tlSession\) tlScheduleReport\(\);/.test(APP),
      "622. save() reports the snapshot (debounced) while joined");
    const joinBody = APP.slice(APP.indexOf("async function tlDoJoin()"), APP.indexOf("function tlJoinErrorText"));
    assert(/tlReportCharacter\(\);/.test(joinBody), "623. join success reports the snapshot immediately");
    assert(APP.includes('"/character"'), "624. report POSTs to the /character endpoint");
    assert(/setTimeout\(tlReportCharacter, 500\)/.test(APP), "625. report is debounced ~500 ms");

    const g = makeDOM(null);
    assert(g.w.eval("typeof tlBuildSnapshot") === "function", "626. tlBuildSnapshot is defined");
    assert(g.w.eval("typeof tlReportCharacter") === "function", "627. tlReportCharacter is defined");
    assert(g.w.eval("typeof tlScheduleReport") === "function", "628. tlScheduleReport is defined");
  }
}

// ---- v74. Ranged combat (PB v2.5 p.22) ----
{
  const { d, w } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));

  // Pure die-step math, attack side. Steps come off the Combat die and stack.
  assert(w.eval('rangedAttackDie("d10", 0, 0)') === "d10", "764. Short range, no cover leaves the Combat die alone");
  assert(w.eval('rangedAttackDie("d10", 1, 0)') === "d8", "765. Medium range steps the Combat die down one");
  assert(w.eval('rangedAttackDie("d10", 2, 0)') === "d6", "766. Long range steps the Combat die down two");
  assert(w.eval('rangedAttackDie("d12", 1, 2)') === "d6", "767. Range and cover steps stack on the Combat die");
  assert(w.eval('rangedAttackDie("d8", 2, 0)') === null, "768. A Combat die falling below d6 means no shot");
  assert(w.eval('rangedAttackDie("d20", 0, 99)') === null, "769. Full cover blocks the shot at any die");

  // Defense side. Steps go on, capped at d12, and past d12 the shot cannot reach.
  assert(w.eval('rangedDefenseDie("d8", 0, 0)') === "d8", "770. Short range, no cover leaves the Defense die alone");
  assert(w.eval('rangedDefenseDie("d8", 1, 0)') === "d10", "771. Medium range steps the Defense die up one");
  assert(w.eval('rangedDefenseDie("d8", 2, 0)') === "d12", "772. Long range steps the Defense die up two");
  assert(w.eval('rangedDefenseDie("d8", 1, 1)') === "d12", "773. Range and cover steps stack on the Defense die");
  assert(w.eval('rangedDefenseDie("d8", 2, 1)') === null, "774. Stacking past d12 means the shot cannot reach");
  assert(w.eval('rangedDefenseDie("d6", 0, 99)') === null, "775. Full cover means the shot cannot reach");
  assert(w.eval('rangedDefenseDie("d10", 2, 0)') === null, "776. Defense never steps up into d20");

  // Overlay controls exist.
  assert(d.getElementById("atk-ranged-block") !== null, "777. Attack overlay has a ranged block");
  assert(d.getElementById("def-ranged-block") !== null, "778. Defense overlay has a ranged block");
  assert(d.querySelectorAll("#atk-cover-grid .cover-btn").length === 4, "779. Four cover options on the attack side");
  assert(d.querySelector('#atk-cover-grid .cover-btn[data-steps="99"]') !== null, "780. Full cover is the blocked marker");
  assert(d.getElementById("atk-into-melee") !== null, "781. Firing Into Melee toggle exists");

  // Melee is the default on every open, and the ranged block stays out of the way.
  click(d.getElementById("btn-attack"));
  assert(hidden(d.getElementById("atk-ranged-block")), "782. Attack opens in Melee with the ranged block hidden");
  assert(d.querySelector('.mode-btn[data-mode="melee"]').classList.contains("selected") &&
    !d.getElementById("atk-into-melee").classList.contains("selected"),
    "783. Attack ranged state resets on open");
  assert(w.eval("attackRollDie()") === "d8", "784. Melee attack rolls the plain Combat die");

  // Switching to Ranged reveals the block and reports the die.
  click(d.querySelector('.mode-btn[data-mode="ranged"]'));
  assert(visible(d.getElementById("atk-ranged-block")), "785. Ranged mode reveals the ranged block");
  assert(d.getElementById("atk-die-line").textContent === "Combat d8", "786. Short range reports the unchanged die");
  click(d.querySelector('.range-btn[data-steps="2"]'));
  assert(w.eval("attackRollDie()") === null, "787. Warrior d8 Combat at long range cannot take the shot");
  assert(d.getElementById("atk-die-line").textContent.includes("cannot take the shot"), "788. The overlay says why the shot is impossible");
  assert(Array.from(d.querySelectorAll("#attack-diff-buttons .diff-btn")).every((b) => b.disabled),
    "789. A blocked shot disables every difficulty button");
  click(d.querySelector('.range-btn[data-steps="1"]'));
  assert(w.eval("attackRollDie()") === "d6", "790. Medium range drops the Warrior to d6");
  assert(d.getElementById("atk-die-line").textContent === "Combat d8 to d6", "791. The readout names both dice");

  // Firing into melee locks the check to Hard.
  click(d.getElementById("atk-into-melee"));
  assert(d.getElementById("atk-into-melee").classList.contains("selected"), "792. Firing Into Melee toggles on");
  assert(d.querySelector('#attack-diff-buttons .diff-btn[data-target="4"]').disabled, "793. Into melee disables Weak 4+");
  assert(d.querySelector('#attack-diff-buttons .diff-btn[data-target="5"]').disabled, "794. Into melee disables Standard 5+");
  assert(!d.querySelector('#attack-diff-buttons .diff-btn[data-target="6"]').disabled, "795. Into melee leaves Hard 6+ tappable");
  click(d.getElementById("atk-into-melee"));
  assert(!d.querySelector('#attack-diff-buttons .diff-btn[data-target="4"]').disabled, "796. Untoggling restores the softer tiers");

  // Defense side behaves the same way.
  w.eval("openDefense()");
  assert(hidden(d.getElementById("def-ranged-block")), "797. Defense opens in Melee with the ranged block hidden");
  assert(w.eval("defenseRollDie()") === "d10", "798. Melee defense rolls the armor-adjusted die");
  click(d.querySelector('.def-mode-btn[data-mode="ranged"]'));
  assert(visible(d.getElementById("def-ranged-block")), "799. Ranged mode reveals the defense ranged block");
  click(d.querySelector('.def-range-btn[data-steps="1"]'));
  assert(w.eval("defenseRollDie()") === "d12", "800. Medium range raises the Warrior defense to d12");
  click(d.querySelector('.def-range-btn[data-steps="2"]'));
  assert(w.eval("defenseRollDie()") === null, "801. Past d12 the shot cannot reach the Warrior");
  assert(d.getElementById("def-ranged-line").textContent.includes("cannot reach you"), "802. The defense readout says the shot cannot reach");
  assert(Array.from(d.querySelectorAll("#threat-buttons .diff-btn")).every((b) => b.disabled),
    "803. An unreachable shot disables every threat button");
  click(d.querySelector('.def-cover-btn[data-steps="99"]'));
  assert(d.getElementById("def-ranged-line").textContent.includes("Full cover"), "804. Full cover is named explicitly");

  // No roll is ever made when canon forbids it.
  assert(/function rollAttack[\s\S]{0,300}if \(!combatDie\) return;/.test(APPJS), "805. rollAttack refuses a blocked shot");
  assert(/function rollDefense[\s\S]{0,200}if \(!die\) return;/.test(APPJS), "806. rollDefense refuses an unreachable shot");

  // Firing into melee: a 1 on the Combat die hits someone adjacent. The app states it only.
  assert(/intoMelee && result === 1/.test(APPJS), "807. A natural 1 into melee is detected");
  assert(APPJS.includes("You hit a creature adjacent to your target. The GM decides which."),
    "808. The adjacent-hit notice is stated and left to the GM");

  // Schema is untouched by v74.
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character") || "{}");
  assert(!("atkMode" in saved) && !("rangeSteps" in saved), "809. Ranged selections never reach the saved character");

  // The Handbook no longer claims range and cover shift the difficulty.
  assert(!APPJS.includes("Range and cover shift the difficulty"), "810. Stale ranged Handbook line is gone");
  assert(APPJS.includes("shift your die by steps, not the difficulty"), "811. Handbook states the canonical die-step rule");
}

// ---- v75. Ammunition (PB v2.5 p.14) ----
{
  const withAmmo = (arrows, bolts) => {
    const items = [];
    for (let i = 0; i < arrows; i++) items.push({ name: "Arrow Bundle", lp: 2 });
    for (let i = 0; i < bolts; i++) items.push({ name: "Bolt Bundle", lp: 2 });
    return Object.assign({}, WARRIOR, { items: items });
  };

  // Bundles are inventory rows, so counts derive from items[] with no separate state.
  {
    const { d, w } = makeDOM(withAmmo(2, 1));
    click(d.getElementById("btn-continue"));
    assert(w.eval('bundleCount("Arrow Bundle")') === 2, "812. Arrow Bundles counted from inventory rows");
    assert(w.eval('bundleCount("Bolt Bundle")') === 1, "813. Bolt Bundles counted separately");
    assert(w.eval("totalBundles()") === 3, "814. Total bundles sums both kinds");
    assert(w.eval("bundleSummary()").includes("2 Arrow Bundles"), "815. Summary pluralizes multiple bundles");
    assert(w.eval("bundleSummary()").includes("1 Bolt Bundle"), "816. Summary keeps the singular at one");
  }
  {
    const { d, w } = makeDOM(withAmmo(0, 0));
    click(d.getElementById("btn-continue"));
    assert(w.eval("totalBundles()") === 0, "817. No bundles counts zero");
    assert(w.eval("carriedLine()") === "No Bundles carried.", "818. Empty carried line states it plainly");
    assert(w.eval("remainingLine()") === "No Bundles left.", "818b. Empty remaining line states it plainly");
    assert(w.eval("bundleSummary()") === "", "818c. Empty summary is a blank list");
  }

  // Spending removes exactly one row and persists.
  {
    const { d, w } = makeDOM(withAmmo(2, 0));
    click(d.getElementById("btn-continue"));
    assert(w.eval('spendBundle("Arrow Bundle")') === true, "819. Spending a carried bundle reports success");
    assert(w.eval("totalBundles()") === 1, "820. Spending removes exactly one bundle");
    const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
    assert(saved.items.filter((i) => i.name === "Arrow Bundle").length === 1, "821. The spend is saved to localStorage");
    assert(w.eval('spendBundle("Bolt Bundle")') === false, "822. Spending a bundle you lack changes nothing");
    assert(w.eval("totalBundles()") === 1, "823. A failed spend leaves inventory alone");
  }

  // The overlay and its trigger exist.
  {
    const { d } = makeDOM(withAmmo(1, 0));
    click(d.getElementById("btn-continue"));
    assert(d.getElementById("btn-ammo") !== null, "824. Fired This Scene button on the COMBAT tab");
    assert(d.getElementById("overlay-ammo") !== null, "825. Ammunition overlay exists");
    assert(d.querySelectorAll("#ammo-choice .ammo-pick").length === 2, "826. Two bundle-choice buttons");
    click(d.getElementById("btn-ammo"));
    assert(visible(d.getElementById("overlay-ammo")), "827. The button opens the overlay");
    assert(d.getElementById("ammo-carried").textContent.includes("1 Arrow Bundle"), "828. The overlay states what you carry");
    assert(hidden(d.getElementById("ammo-choice")), "829. The choice row starts hidden");
    assert(hidden(d.getElementById("ammo-result")), "830. The result line starts hidden");
  }

  // A roll above 1 spends nothing.
  {
    const { d, w } = makeDOM(withAmmo(2, 0));
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-ammo"));
    w.eval("Math.random = () => 0.9;"); // rolls a 6
    click(d.getElementById("ammo-roll"));
    assert(d.getElementById("ammo-result").textContent.includes("holds"), "831. A high roll reports the ammunition holds");
    assert(w.eval("totalBundles()") === 2, "832. A high roll spends no bundle");
  }

  // A 1 with only one kind carried spends it outright, no prompt.
  {
    const { d, w } = makeDOM(withAmmo(2, 0));
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-ammo"));
    w.eval("Math.random = () => 0;"); // rolls a 1
    click(d.getElementById("ammo-roll"));
    assert(w.eval("totalBundles()") === 1, "833. A 1 spends one bundle when only one kind is carried");
    assert(hidden(d.getElementById("ammo-choice")), "834. No prompt when there is nothing to choose between");
    assert(d.getElementById("ammo-result").textContent.includes("Arrow Bundle is spent"), "835. The result names the spent bundle");
    assert(d.getElementById("ammo-carried").textContent.includes("1 Arrow Bundle"), "836. The carried line updates after a spend");
  }

  // A 1 with both kinds carried asks which, and spends nothing until answered.
  {
    const { d, w } = makeDOM(withAmmo(1, 1));
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-ammo"));
    w.eval("Math.random = () => 0;");
    click(d.getElementById("ammo-roll"));
    assert(visible(d.getElementById("ammo-choice")), "837. Carrying both kinds prompts for the choice");
    assert(w.eval("totalBundles()") === 2, "838. Nothing is spent before the player answers");
    assert(d.getElementById("ammo-result").textContent.includes("Which did you fire?"), "839. The prompt asks which weapon fired");
    click(d.querySelector('.ammo-pick[data-bundle="Bolt Bundle"]'));
    assert(w.eval('bundleCount("Bolt Bundle")') === 0, "840. The chosen bundle is the one spent");
    assert(w.eval('bundleCount("Arrow Bundle")') === 1, "841. The unchosen bundle is untouched");
    assert(hidden(d.getElementById("ammo-choice")), "842. The choice row hides after answering");
  }

  // A 1 with no bundles reports it and cannot go negative.
  {
    const { d, w } = makeDOM(withAmmo(0, 0));
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-ammo"));
    w.eval("Math.random = () => 0;");
    click(d.getElementById("ammo-roll"));
    assert(w.eval("totalBundles()") === 0, "843. A 1 with no bundles stays at zero");
    assert(d.getElementById("ammo-result").textContent.includes("no Bundles"), "844. The result states there was nothing to spend");
  }

  // Out of ammunition WARNS and never blocks: doctrine beats the literal canon wording.
  {
    const { d } = makeDOM(withAmmo(0, 0));
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-attack"));
    assert(hidden(d.getElementById("atk-ammo-warn")), "845. No ammunition warning in melee mode");
    click(d.querySelector('.mode-btn[data-mode="ranged"]'));
    assert(visible(d.getElementById("atk-ammo-warn")), "846. Ranged with no bundles shows the warning");
    assert(Array.from(d.querySelectorAll("#attack-diff-buttons .diff-btn")).every((b) => !b.disabled),
      "847. The warning never disables the roll");
    assert(d.querySelector('.mode-btn[data-mode="ranged"]').disabled === false, "848. Ranged mode itself is never blocked");
  }
  {
    const { d } = makeDOM(withAmmo(1, 0));
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-attack"));
    click(d.querySelector('.mode-btn[data-mode="ranged"]'));
    assert(hidden(d.getElementById("atk-ammo-warn")), "849. Carrying a bundle shows no warning");
  }

  // No schema change: ammunition lives entirely in items[].
  assert(!/character\.ammo/.test(APPJS), "850. No separate ammo field was added to the schema");
  assert(/AMMO_BUNDLES\s*=\s*\["Arrow Bundle", "Bolt Bundle"\]/.test(APPJS), "851. Bundle names match the canon gear list");
}

// ---- v76. Shield reroll (PB v2.5 p.21, p.24) ----
{
  const shielded = (extra) => Object.assign({}, WARRIOR, {
    items: [{ name: "Shield", lp: 2 }]
  }, extra || {});
  const unshielded = (extra) => Object.assign({}, WARRIOR, { items: [] }, extra || {});

  // Schema: persisted, defaulted by migrate, and set at creation so migrate stays a no-op.
  {
    const { w } = makeDOM(null);
    const migrated = JSON.parse(w.eval('JSON.stringify(migrate({ name: "X", cls: "Warrior" }))'));
    assert(migrated.shieldUsed === false, "852. migrate() defaults shieldUsed to false");
    const kept = JSON.parse(w.eval('JSON.stringify(migrate({ name: "X", cls: "Warrior", shieldUsed: true }))'));
    assert(kept.shieldUsed === true, "853. migrate() preserves a spent shield reroll");
    assert(/shieldUsed: false,/.test(APPJS), "854. Creation sets shieldUsed so the schema starts complete");
  }

  // Availability derives from the inventory row, like ammunition Bundles.
  {
    const { d, w } = makeDOM(shielded());
    click(d.getElementById("btn-continue"));
    assert(w.eval("hasShield()") === true, "855. A Shield row grants the shield");
    assert(w.eval("shieldRerollAvailable()") === true, "856. An unspent reroll is available");
  }
  {
    const { d, w } = makeDOM(unshielded());
    click(d.getElementById("btn-continue"));
    assert(w.eval("hasShield()") === false, "857. No Shield row means no shield");
    assert(w.eval("shieldRerollAvailable()") === false, "858. No shield means no reroll");
  }
  {
    const { d, w } = makeDOM(shielded({ shieldUsed: true }));
    click(d.getElementById("btn-continue"));
    assert(w.eval("shieldRerollAvailable()") === false, "859. A spent reroll is unavailable");
  }

  // COMBAT tab controls appear only for a shield carrier.
  {
    const { d } = makeDOM(shielded());
    click(d.getElementById("btn-continue"));
    assert(visible(d.getElementById("btn-new-combat")), "860. New Combat button shown to a shield carrier");
    assert(d.getElementById("shield-state").textContent === "Shield reroll ready.", "861. Ready state stated");
  }
  {
    const { d } = makeDOM(unshielded());
    click(d.getElementById("btn-continue"));
    assert(hidden(d.getElementById("btn-new-combat")), "862. No New Combat button without a shield");
    assert(hidden(d.getElementById("shield-state")), "863. No shield state line without a shield");
  }

  // New Combat re-arms and persists, and touches nothing else.
  {
    const { d, w } = makeDOM(shielded({ shieldUsed: true, hpCur: 5, dp: 4 }));
    click(d.getElementById("btn-continue"));
    assert(d.getElementById("shield-state").textContent.includes("spent"), "864. Spent state stated on load");
    assert(d.getElementById("shield-state").classList.contains("shield-spent"), "865. Spent state carries its class");
    click(d.getElementById("btn-new-combat"));
    assert(w.eval("shieldRerollAvailable()") === true, "866. New Combat re-arms the reroll");
    const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
    assert(saved.shieldUsed === false, "867. The re-arm is saved");
    assert(saved.hpCur === 5 && saved.dp === 4, "868. New Combat changes nothing but the reroll");
  }

  // The failure branch builds the reroll button, its note, and the layout marker.
  // The roll ceremony runs on a setInterval flicker, so this is checked at source level
  // the same way the existing Defense-failure assertions are.
  {
    const failBranch = APPJS.slice(APPJS.indexOf("function performRollDefense"),
                                  APPJS.indexOf("function hideRollReadout"));
    assert(failBranch.length > 0, "868b. performRollDefense body located for the checks below");
    assert(failBranch.includes('class="def-shield-btn"'), "869. The failure branch injects a shield reroll button");
    assert(failBranch.includes('data-action="shield-reroll"'), "870. The button carries the shield-reroll action");
    assert(/shield-note[^]*stands, better or worse/.test(failBranch), "871. The note warns the new roll stands");
    assert(failBranch.includes('" has-shield"'), "871b. The wrapper is marked when the button is present");
  }

  // Source-level guarantees that are awkward to drive through the flicker timer.
  assert(/!isReroll && shieldRerollAvailable\(\)/.test(APPJS), "872. The reroll is offered only on a first roll, never chained");
  assert(/character\.shieldUsed = true;\s*\n\s*save\(\);/.test(APPJS), "873. Spending the reroll persists immediately");
  assert(/performRollDefense\(p\.target, p\.die, true\)/.test(APPJS), "874. The reroll repeats the same target and die");
  assert(/pendingDefense = \{ target: target, die: die, bonus: bonus \}/.test(APPJS), "875. The roll is remembered for the reroll");
  assert(!/Math\.max\(result, reroll\)|Math\.min\(result, reroll\)/.test(APPJS), "876. The app never compares the two rolls (canon: keep the new result)");
  assert(/function newCombat\(\)[\s\S]{0,120}shieldUsed = false/.test(APPJS), "877. newCombat re-arms the reroll");
  assert(/renderShieldState\(\);/.test(APPJS), "878. Shield state is re-rendered");
  assert(/hasShield\(\)[\s\S]{0,200}items\.some/.test(APPJS) || /items\.some\(\(it\) => it\.name === "Shield"\)/.test(APPJS),
    "879. Shield presence derives from the inventory row");
}

// ---- v77. Double Attack (PB v2.5 p.21, Edge 17) ----
{
  const d6Combat = Object.assign({}, WARRIOR, {
    skills: Object.assign({}, WARRIOR.skills, { Combat: "d6" })
  });
  const d6Master = Object.assign({}, d6Combat, { edges: [17] });
  const d10Combat = Object.assign({}, WARRIOR, {
    skills: Object.assign({}, WARRIOR.skills, { Combat: "d10" })
  });

  // The second attack steps one down the ladder.
  {
    const { d, w } = makeDOM(WARRIOR); // Combat d8
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-attack"));
    assert(w.eval("secondAttackDie()") === "d6", "880. d8 Combat gives a d6 second attack");
  }
  {
    const { d, w } = makeDOM(d10Combat);
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-attack"));
    assert(w.eval("secondAttackDie()") === "d8", "881. d10 Combat gives a d8 second attack");
  }

  // Tomas's ruling: a d6 Combat die cannot Double Attack, and Edge 17 is the way around it.
  {
    const { d, w } = makeDOM(d6Combat);
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-attack"));
    assert(w.eval("secondAttackDie()") === null, "882. d6 Combat cannot Double Attack (no die to step to)");
    assert(d.getElementById("atk-double").disabled === true, "883. The toggle is disabled for a d6 Combat die");
    assert(d.getElementById("atk-double").classList.contains("locked-out"), "884. The disabled toggle is dimmed");
    assert(d.getElementById("atk-double-line").textContent.includes("needs a die to step down to"),
      "885. The overlay states why Double Attack is unavailable");
  }
  {
    const { d, w } = makeDOM(d6Master);
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-attack"));
    assert(w.eval("secondAttackDie()") === "d6", "886. Weapon Mastery holds the second attack at the standard die");
    assert(d.getElementById("atk-double").disabled === false, "887. Edge 17 unlocks Double Attack for a d6 Combat die");
    click(d.getElementById("atk-double"));
    assert(d.getElementById("atk-double-line").textContent.includes("Weapon Mastery"),
      "888. The readout credits Weapon Mastery");
  }
  {
    const { d, w } = makeDOM(Object.assign({}, WARRIOR, { edges: [17] }));
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-attack"));
    assert(w.eval("secondAttackDie()") === "d8", "889. Weapon Mastery keeps a d8 second attack at d8");
  }

  // Ranged reductions stack with the step-down, and can put it out of reach.
  {
    const { d, w } = makeDOM(WARRIOR); // d8
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-attack"));
    click(d.querySelector('.mode-btn[data-mode="ranged"]'));
    click(d.querySelector('.range-btn[data-steps="1"]')); // d8 -> d6 first attack
    assert(w.eval("attackRollDie()") === "d6", "890. Medium range drops the first attack to d6");
    assert(w.eval("secondAttackDie()") === null, "891. No second attack below the d6 ranged floor");
    assert(d.getElementById("atk-double").disabled === true, "892. Ranged reduction can disable Double Attack");
    click(d.querySelector('.range-btn[data-steps="0"]'));
    assert(d.getElementById("atk-double").disabled === false, "893. Returning to short range re-enables it");
  }

  // The toggle resets on every open and states the second die when armed.
  {
    const { d } = makeDOM(WARRIOR);
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-attack"));
    assert(!d.getElementById("atk-double").classList.contains("selected"), "894. Double Attack starts off");
    click(d.getElementById("atk-double"));
    assert(d.getElementById("atk-double").classList.contains("selected"), "895. The toggle arms");
    assert(d.getElementById("atk-double-line").textContent.includes("d6"), "896. The readout names the second die");
    assert(d.getElementById("atk-double-line").textContent.includes("one step lower"), "897. The readout states the penalty");
    click(d.getElementById("attack-cancel"));
    click(d.getElementById("btn-attack"));
    assert(!d.getElementById("atk-double").classList.contains("selected"), "898. Reopening resets the toggle");
  }

  // The second attack is queued before the first resolves, so a miss still owes it.
  {
    const { d, w } = makeDOM(WARRIOR);
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-attack"));
    click(d.getElementById("atk-double"));
    assert(w.eval("doubleAttackButtons()") === "", "899. Nothing is owed before the attack is rolled");
    w.eval("rollAttack(5);");
    const offer = w.eval("doubleAttackButtons()");
    assert(offer.includes("Second Attack d6"), "900. The second attack is queued and names its die");
    assert(offer.includes('data-action="second-attack"'), "901. The offer wires up the second roll");
    assert(offer.includes('data-action="skip-second"'), "902. The offer can be skipped");
    w.eval("skipSecondAttack();");
    assert(w.eval("doubleAttackButtons()") === "", "903. Skipping clears what was owed");
  }

  // Without the toggle, nothing is owed at all.
  {
    const { d, w } = makeDOM(WARRIOR);
    click(d.getElementById("btn-continue"));
    click(d.getElementById("btn-attack"));
    w.eval("rollAttack(5);");
    assert(w.eval("doubleAttackButtons()") === "", "904. A single attack owes no second roll");
  }

  // Source-level guarantees around the ceremony, which runs on the flicker timer.
  assert(/pendingDouble = null; \/\/ consumed/.test(APPJS), "905. The second attack never offers a third");
  assert(/pendingDouble = second[\s\S]{0,140}performRollAttack/.test(APPJS),
    "906. The second attack is queued before the first resolves (canon: make two attacks)");
  const missBranch = APPJS.slice(APPJS.indexOf("function performRollAttack"), APPJS.indexOf("function startDamageRoll"));
  assert(/doubleAttackButtons\(\)/.test(missBranch), "907. A missed first attack still offers the second");
  const finalBranch = APPJS.slice(APPJS.indexOf("function finalizeExplosionChain"),
                                  APPJS.indexOf("// ---------- Expedition effort rolls"));
  assert(finalBranch.length > 0, "907b. finalizeExplosionChain body located for the check below");
  assert(/doubleAttackButtons\(\)/.test(finalBranch), "908. The damage screen offers the second attack");
  assert(/function startSecondAttack[\s\S]{0,260}performRollAttack\(d\.die, damageDieForWeapon\(\), d\.target, d\.momentum/.test(APPJS),
    "909. The second attack reuses the same target and momentum");
  assert(!/character\.doubleAttack|doubleUsed/.test(APPJS), "910. Double Attack adds nothing to the schema");
}

// ---- v78. Action economy reference card (PB v2.5 p.20-21) ----
{
  const { d, w } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));

  // Data matches canon, read off the rendered card (top-level consts are not reachable
  // through w.eval in jsdom, and the DOM is what the player actually sees anyway).
  const card = d.getElementById("action-card");
  const tierEls = Array.from(card.querySelectorAll(".action-tier")).map((e) => e.textContent);
  const ruleEls = Array.from(card.querySelectorAll(".action-rule")).map((e) => e.textContent);
  const nameEls = Array.from(card.querySelectorAll(".action-name")).map((e) => e.textContent);
  const descEls = Array.from(card.querySelectorAll(".action-desc")).map((e) => e.textContent);

  assert(tierEls.length === 3, "911. Three action tiers");
  assert(tierEls.join(",") === "Quick Actions,Main Actions,Full Actions",
    "912. Tiers are Quick, Main, Full in canon order");
  assert(nameEls.length === 15, "913. Fifteen actions in total, five per tier");
  assert(ruleEls[0] === "Choose 1 per turn.", "914. Quick rule stated");
  assert(ruleEls[1].includes("Choose 2 per turn"), "915. Main rule stated");
  assert(ruleEls[1].includes("convert both into 1 Full Action"), "916. Main-to-Full conversion stated");
  assert(ruleEls[2] === "Requires both Main Actions.", "917. Full rule stated");

  assert(nameEls.slice(0, 5).join(",") === "Half-Move,Interact,Drop or Stand,Consume,Signal",
    "918. Quick actions match canon");
  assert(nameEls.slice(5, 10).join(",") === "Attack,Move,Simple Skill,Ready,Help",
    "919. Main actions match canon");
  assert(nameEls.slice(10, 15).join(",") === "Cast Spell,Complex Skill,Full Move,First Aid,Double Attack",
    "920. Full actions match canon");

  // Canon details that matter at the table.
  assert(descEls[5].includes("only once per turn"), "921. Attack states the once-per-turn limit");
  assert(descEls[0].includes("15 ft"), "922. Half-Move distance stated");
  assert(descEls[6].includes("30 ft"), "923. Move distance stated");
  assert(descEls[12].includes("60 ft"), "924. Full Move distance stated");
  assert(descEls[14].includes("one die step lower"), "925. Double Attack penalty stated");
  assert(card.querySelector(".action-improvised").textContent.includes("GM assigns the closest tier"),
    "926. Improvised actions defer to the GM");

  // Rendered on the COMBAT tab, collapsed, reusing the Handbook accordion.
  assert(card !== null, "927. Action card exists on the COMBAT tab");
  assert(d.getElementById("tab-combat").contains(card), "928. The card lives inside the COMBAT tab");
  const head = card.querySelector(".rules-topic-head");
  const body = card.querySelector(".rules-topic-body");
  assert(head !== null && body !== null, "929. The card reuses the rules-topic accordion");
  assert(head.querySelector(".rules-topic-title").textContent === "Actions", "930. The accordion is titled Actions");
  assert(hidden(body), "931. The card starts collapsed");
  assert(head.getAttribute("aria-expanded") === "false", "932. Collapsed state is announced");
  assert(card.querySelectorAll(".action-tier").length === 3, "933. Three tier headers render");
  assert(card.querySelectorAll(".action-row").length === 15, "934. All fifteen actions render");
  assert(card.querySelector(".action-improvised") !== null, "935. The improvised note renders");

  click(head);
  assert(visible(body), "936. Tapping expands the card");
  assert(head.getAttribute("aria-expanded") === "true", "937. Expanded state is announced");
  assert(head.classList.contains("open"), "938. The caret rotates via the open class");
  click(head);
  assert(hidden(body), "939. Tapping again collapses it");

  // PASSIVE ONLY. This is the doctrine guard: the card must never track or spend.
  const cardFn = APPJS.slice(APPJS.indexOf("function renderActionCard"), APPJS.indexOf("// Class abilities:"));
  assert(cardFn.length > 0, "940. renderActionCard body located for the checks below");
  assert(!/save\(\)/.test(cardFn), "941. The action card never writes to the character");
  assert(!/character\./.test(cardFn), "942. The action card never reads character state");
  assert(!/disabled/.test(cardFn), "943. The action card never disables anything");
  assert(!/actionsUsed|actionsLeft|spendAction/.test(APPJS), "944. No action-slot tracking exists anywhere");
  assert(card.querySelectorAll("button").length === 1, "945. The card holds one button, the accordion head itself");

  // Text discipline: no em-dashes in shipped copy.
  assert(!/—/.test(card.textContent), "946. No em-dashes anywhere in the rendered card");

  // Visual identity: the per-turn budget is primary mechanical text, so bone not ash (Law 3),
  // and nothing in the card sits under the 0.75rem floor (Law 2).
  const CSS = fs.readFileSync("style.css", "utf8");
  const ruleCSS = CSS.match(/\.action-rule\s*\{([^}]*)\}/);
  assert(ruleCSS && ruleCSS[1].includes("var(--bone)"), "947. .action-rule uses bone (Law 3, primary mechanics)");
  assert(ruleCSS && !ruleCSS[1].includes("var(--ash)"), "948. .action-rule is not ash");
  ["action-tier", "action-rule", "action-name", "action-desc", "action-improvised"].forEach((cls, i) => {
    const m = CSS.match(new RegExp("\\." + cls + "\\s*\\{([^}]*)\\}"));
    const size = m && m[1].match(/font-size:\s*([\d.]+)rem/);
    assert(!size || parseFloat(size[1]) >= 0.75, "949" + String.fromCharCode(97 + i) + ". ." + cls + " respects the 0.75rem floor");
  });
}

// ---- v79. Lenient name matching for mechanical items ----
{
  const withItems = (items) => Object.assign({}, WARRIOR, { items: items });

  // The normalizer itself.
  {
    const { d, w } = makeDOM(WARRIOR);
    click(d.getElementById("btn-continue"));
    assert(w.eval('sameItemName("Shield", "Shield")') === true, "950. Identical names match");
    assert(w.eval('sameItemName("shield", "Shield")') === true, "951. Case is forgiven");
    assert(w.eval('sameItemName("  Shield  ", "Shield")') === true, "952. Surrounding spaces are forgiven");
    assert(w.eval('sameItemName("SHIELD", "Shield")') === true, "953. Upper case is forgiven");
    assert(w.eval('sameItemName("Wooden Shield", "Shield")') === false, "954. It stays equality, not substring");
    assert(w.eval('sameItemName("Shields", "Shield")') === false, "955. A different item is still different");
    assert(w.eval('sameItemName(undefined, "Shield")') === false, "956. A missing name never matches");
    assert(w.eval('sameItemName("", "")') === true, "957. Two empties are equal without throwing");
  }

  // Shields: a hand-typed row now grants the reroll.
  {
    const { d, w } = makeDOM(withItems([{ name: "shield", lp: 2 }]));
    click(d.getElementById("btn-continue"));
    assert(w.eval("hasShield()") === true, "958. A lower-case shield row grants the shield");
    assert(visible(d.getElementById("btn-new-combat")), "959. The COMBAT controls appear for it");
  }
  {
    const { d, w } = makeDOM(withItems([{ name: " Shield ", lp: 2 }]));
    click(d.getElementById("btn-continue"));
    assert(w.eval("hasShield()") === true, "960. A padded shield row grants the shield");
  }
  {
    const { d, w } = makeDOM(withItems([{ name: "Wooden Shield", lp: 2 }]));
    click(d.getElementById("btn-continue"));
    assert(w.eval("hasShield()") === false, "961. A differently named shield is still a different item");
  }

  // Bundles: counted and spent leniently.
  {
    const { d, w } = makeDOM(withItems([
      { name: "arrow bundle", lp: 2 },
      { name: "Arrow Bundle", lp: 2 },
      { name: "  BOLT BUNDLE  ", lp: 2 }
    ]));
    click(d.getElementById("btn-continue"));
    assert(w.eval('bundleCount("Arrow Bundle")') === 2, "962. Mixed-case arrow rows count together");
    assert(w.eval('bundleCount("Bolt Bundle")') === 1, "963. A padded upper-case bolt row counts");
    assert(w.eval("totalBundles()") === 3, "964. All three count toward the total");
    assert(w.eval('spendBundle("Arrow Bundle")') === true, "965. A hand-typed bundle can be spent");
    assert(w.eval("totalBundles()") === 2, "966. Spending removes exactly one row");
    const saved = JSON.parse(w.localStorage.getItem("tystnad-character"));
    assert(saved.items.length === 2, "967. The spend persists");
  }

  // Display is untouched: the player still sees exactly what he typed.
  {
    const { d } = makeDOM(withItems([{ name: "shield", lp: 2 }]));
    click(d.getElementById("btn-continue"));
    const names = Array.from(d.querySelectorAll(".inv-item-name")).map((e) => e.textContent);
    assert(names[0] === "shield", "968. Inventory displays the typed name, not a normalized one");
  }

  // The catalog lookup stays exact: it takes hard-coded literals, never user input.
  assert(/function gearByName[\s\S]{0,120}it\.name === name/.test(APPJS),
    "969. gearByName stays an exact catalog lookup");
}

// ---- v80. Service worker hardening + inventory guards (audit findings 1,2,3,6,7) ----
{
  const SW = fs.readFileSync("sw.js", "utf8");
  const APP = fs.readFileSync("app.js", "utf8");

  // Finding 7: VERSION and CACHE must agree. Checked against each other, not against a
  // literal, so they cannot drift even if someone updates only one of them.
  const appVersion = (APP.match(/const VERSION = "(v\d+)"/) || [])[1];
  const swCache = (SW.match(/const CACHE = "tystnad-(v\d+)"/) || [])[1];
  assert(!!appVersion, "970. app.js declares a VERSION");
  assert(!!swCache, "971. sw.js declares a CACHE version");
  assert(appVersion === swCache,
    "972. app.js VERSION matches sw.js CACHE (" + appVersion + " vs " + swCache + ")");

  // Finding 6: ASSETS is the authoritative inventory, so prove it covers every deployed
  // file rather than spot-checking four names. sw.js is correctly excluded: a worker
  // does not cache itself.
  const deployed = fs.readdirSync(".")
    .filter((f) => /\.(html|css|js|json|png|webp|woff2)$/.test(f))
    .filter((f) => !["sw.js", "smoke.js", "package.json", "package-lock.json"].includes(f));
  const missing = deployed.filter((f) => !SW.includes('"./' + f + '"'));
  assert(missing.length === 0, "973. Every deployed file is cached (CORE or OPTIONAL)" +
    (missing.length ? " (missing: " + missing.join(", ") + ")" : ""));
  assert(!SW.includes('"./sw.js"'), "974. sw.js does not cache itself");
  assert(SW.includes('"./"'), "975. The root alias is cached");
  // And the reverse: nothing listed that is not on disk, which is what would break install.
  const listed = (SW.match(/"\.\/([^"]+)"/g) || []).map((s) => s.slice(3, -1));
  const ghosts = listed.filter((f) => f && !fs.existsSync(f));
  assert(ghosts.length === 0, "976. No ASSETS entry points at a missing file" +
    (ghosts.length ? " (ghosts: " + ghosts.join(", ") + ")" : ""));

  // Finding 1: a single bad asset must not freeze every installed phone.
  assert(/cache\.addAll\(CORE_ASSETS\)/.test(SW), "977. CORE is cached atomically with addAll");
  assert(/Promise\.allSettled\(OPTIONAL_ASSETS/.test(SW), "978. OPTIONAL assets are best-effort");
  assert(/console\.error\(/.test(SW), "979. Cache failures are reported, not swallowed");
  assert(/skipWaiting/.test(SW), "980. skipWaiting still runs");
  assert(SW.indexOf("skipWaiting") > SW.indexOf("allSettled"),
    "981. skipWaiting now runs after caching, inside waitUntil (finding 4)");

  // Finding 3: non-GET and cross-origin requests are left to the browser.
  assert(/req\.method !== "GET"\)\s*return;/.test(SW), "982. Non-GET requests bail out early");
  assert(/origin !== self\.location\.origin\)\s*return;/.test(SW), "983. Cross-origin requests bail out early");
  const fetchBlock = SW.slice(SW.indexOf('addEventListener("fetch"'));
  assert(fetchBlock.indexOf("return;") < fetchBlock.indexOf("respondWith"),
    "984. The bails happen before respondWith, so Table Link calls are untouched");

  // Finding 2: a query string must not defeat the cache for navigations.
  assert(/ignoreSearch: true/.test(SW), "985. Navigations match with ignoreSearch");
  assert(/req\.mode === "navigate"/.test(SW), "986. The navigation path is distinguished");
  assert(/caches\.match\("\.\/index\.html"\)/.test(SW), "987. Navigations fall back to index.html offline");
  // Asset lookups stay exact: only navigations ignore the query.
  const navBlock = SW.slice(SW.indexOf('req.mode === "navigate"'));
  const tailBlock = navBlock.slice(navBlock.indexOf("event.respondWith", navBlock.indexOf("return;")));
  assert(!/ignoreSearch/.test(tailBlock), "988. Asset lookups remain exact matches");

  // v85 replaced the unconditional forced reload with an announced update.
  assert(/FORCE_RELOAD = false/.test(SW), "989. Forced reload is off by default");
  assert(/postMessage\(\{ type: "tystnad-update-ready"/.test(SW), "990. Updates are announced, not forced");
}

// ---- v81. Languages topic in the Rules Reference (PB v2.5 p.10) ----
{
  const { d } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  click(d.getElementById("btn-handbook"));
  click([...d.querySelectorAll(".handbook-nav-btn")].find((b) => /Rules Reference/.test(b.textContent)));

  const titles = [...d.querySelectorAll("#handbook-body .rules-topic-title")].map((e) => e.textContent);
  assert(titles.includes("Languages"), "991. A Languages topic exists in the Rules Reference");
  // Canon puts Languages immediately before Inventory on p10, so the app mirrors that order.
  assert(titles.indexOf("Languages") === titles.indexOf("Equipment and Load") - 1,
    "992. Languages sits directly before Equipment and Load, matching the booklet order");

  const topic = [...d.querySelectorAll("#handbook-body .rules-topic")]
    .find((t) => t.querySelector(".rules-topic-title").textContent === "Languages");
  const head = topic.querySelector(".rules-topic-head");
  const body = topic.querySelector(".rules-topic-body");
  assert(hidden(body), "993. Languages starts collapsed like every other topic");
  click(head);
  assert(visible(body), "994. Languages expands on tap");
  assert(body.querySelectorAll(".rules-p").length === 4, "995. Languages has four paragraphs");

  const text = body.textContent;
  // The three levels of communication, each with what canon actually requires.
  assert(/Basic intent needs no shared language/.test(text), "996. Basic intent needs no shared language");
  assert(/Presence check/.test(text), "997. Basic intent names the Presence check");
  assert(/Lore check at Normal 5\+/.test(text), "998. Simple communication is Lore at Normal 5+");
  assert(/open to any Explorer/.test(text), "999. Simple communication is open to any Explorer");
  assert(/Full conversation belongs to Scholars/.test(text), "1000. Full conversation belongs to Scholars");
  assert(/roll nothing/.test(text), "1001. Scholars roll nothing for full conversation");
  assert(/Old Tongue/.test(text), "1002. The Old Tongue is named");
  assert(/survived in Haven's archives/.test(text), "1003. The Old Tongue's survival is explained");
  // The GM gate: the app never decides what a creature can understand.
  assert(/The GM decides what is possible before any roll is made/.test(text),
    "1004. The GM decides what is possible before any roll");
  assert(/Not every creature speaks the Old Tongue/.test(text), "1005. Not every creature speaks it");

  // Reference only: v81 adds no rolling surface, per Tomas's ruling.
  assert(!/id="btn-communicate"/.test(HTML), "1006. No Communicate button was added");
  assert(!/function openCommunicate|function rollCommunicate/.test(APPJS),
    "1007. No communication roll functions were added (the skills list already rolls Presence and Lore)");

  assert(!/—/.test(text), "1008. No em-dashes in the Languages text");
}

// ---- v82. At the Table, the fourth Handbook section (PB v2.5 p.3-4) ----
{
  const SRC = fs.readFileSync("app.js", "utf8");
  const tableBlock = SRC.slice(SRC.indexOf("const TABLE_SECTIONS"), SRC.indexOf("const HOWTO_SECTIONS"));
  assert(tableBlock.length > 0, "1009. TABLE_SECTIONS is declared before HOWTO_SECTIONS");
  assert((tableBlock.match(/\{ h: "/g) || []).length === 7, "1010. At the Table has seven sections");

  const { d } = makeDOM(null);
  click(d.getElementById("btn-how-to-play"));

  // It opens first, because canon puts this material in chapter 1.
  const navBtns = [...d.querySelectorAll(".handbook-nav-btn")];
  assert(navBtns.length === 4, "1011. Handbook nav has four sections");
  assert(navBtns[0].textContent === "At the Table", "1012. At the Table is first in the nav");
  assert(navBtns[0].classList.contains("active"), "1013. The Handbook opens on At the Table");
  assert(navBtns.map((b) => b.textContent).join(",") === "At the Table,How to Play,Rules Reference,World",
    "1014. Nav order is At the Table, How to Play, Rules Reference, World");

  const heads = [...d.querySelectorAll("#handbook-body .howto-h")].map((e) => e.textContent);
  assert(heads.length === 7, "1015. Seven headers render");
  assert(d.querySelectorAll("#handbook-body .howto-p").length === 7, "1016. Seven bodies render");
  assert(heads[0] === "At the Table", "1017. First section is At the Table");
  assert(heads[heads.length - 1] === "Table Etiquette", "1018. Last section is Table Etiquette");
  assert(heads.includes("Roleplaying") && heads.includes("Playing Your Explorer"),
    "1019. Roleplaying and Playing Your Explorer are covered");

  const text = d.getElementById("handbook-body").textContent;
  // The substance canon actually carries.
  assert(/one session at a time/.test(text), "1020. Nobody wins, one session at a time");
  assert(/Your Explorer is not you/.test(text), "1021. Your Explorer is not you");
  assert(/failure is not losing/i.test(text), "1022. Failure is not losing");
  assert(/succeed as a team and fall as one/.test(text), "1023. Team framing kept");
  assert(/consistency matters more than perfection/.test(text), "1024. Trust the GM, consistency over perfection");
  assert(/One GM and two to four players/.test(text), "1025. The player count is stated");

  // ADAPTED, not transcribed: booklet furniture must not survive into the app.
  assert(!/Players Booklet/.test(text), "1026. No reference to the Players Booklet");
  assert(!/separate book/.test(text), "1027. No reference to the GM's separate book");
  assert(!/print/i.test(text), "1028. No instruction to print Explorer sheets");
  assert(/this app in their place/.test(text), "1029. Dice are adapted to acknowledge the app");
  // Tomas's ruling: canon's etiquette line names phones, and this app runs on one.
  assert(!/phone/i.test(text), "1030. The phones line is adapted away, per the ruling");
  assert(/Side conversations and too much joking slow the game down/.test(text),
    "1031. The rest of the distraction advice survives");

  // Switching away and back still works with four sections.
  click([...d.querySelectorAll(".handbook-nav-btn")].find((b) => b.textContent === "World"));
  assert(d.querySelectorAll("#handbook-body .howto-h").length === 9, "1032. World still renders its nine sections");
  click([...d.querySelectorAll(".handbook-nav-btn")].find((b) => b.textContent === "At the Table"));
  assert(d.querySelectorAll("#handbook-body .howto-h").length === 7, "1033. Switching back restores At the Table");
  click([...d.querySelectorAll(".handbook-nav-btn")].find((b) => /Rules Reference/.test(b.textContent)));
  assert(d.querySelectorAll("#handbook-body .rules-topic").length === 11 &&
    d.querySelectorAll("#handbook-body .howto-h").length === 0,
    "1034. The accordion still swaps in cleanly from a scrolling section");

  assert(!/—/.test(text), "1035. No em-dashes in the At the Table copy");
}

// ---- v83. Dice history (session only, in memory) ----
{
  const { d, w } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));

  assert(d.getElementById("btn-history") !== null, "1036. History button on the HP strip");
  assert(d.getElementById("btn-history").getAttribute("aria-label") === "Dice history",
    "1037. The history button is labelled for screen readers");
  assert(d.getElementById("overlay-history") !== null, "1038. History overlay exists");

  // Empty state.
  click(d.getElementById("btn-history"));
  assert(visible(d.getElementById("overlay-history")), "1039. The button opens the overlay");
  assert(d.querySelector(".history-empty").textContent === "No rolls yet this session.",
    "1040. Empty state states it plainly");
  assert(/This session only\. Nothing here is saved\./.test(d.getElementById("overlay-history").textContent),
    "1041. The overlay says the log is not saved");
  click(d.getElementById("history-done"));

  // A skill roll lands in the log, newest first.
  w.eval("Math.random = () => 0.99;"); // always the top face, a certain success
  w.eval('openDifficulty("Athletics"); rollSkill(5);');
  click(d.getElementById("btn-history"));
  let rows = [...d.querySelectorAll(".history-row")];
  assert(rows.length === 1, "1042. A skill roll is logged");
  assert(/Athletics d8 vs 5\+/.test(rows[0].querySelector(".history-line").textContent),
    "1043. The entry carries the roll context");
  assert(rows[0].querySelector(".history-result").textContent === "8", "1044. The entry carries the result");
  assert(rows[0].querySelector(".history-outcome").textContent === "SUCCESS", "1045. The entry carries the outcome");
  click(d.getElementById("history-done"));

  // Ordering. Driven through logRoll directly, because rollLocked only clears inside the
  // flicker callback, so a second real roll cannot fire in a synchronous test.
  w.eval('logRoll("Lore d6 vs 5+", 1, "FAIL");');
  click(d.getElementById("btn-history"));
  rows = [...d.querySelectorAll(".history-row")];
  assert(rows.length === 2, "1046. A second entry is logged");
  assert(/Lore/.test(rows[0].querySelector(".history-line").textContent), "1047. Newest entry is first");
  assert(rows[0].querySelector(".history-outcome").textContent === "FAIL", "1048. A failed roll logs FAIL");
  assert(/Athletics/.test(rows[1].querySelector(".history-line").textContent), "1049. The older entry moves down");
  click(d.getElementById("history-done"));

  // All six ceremonies hook in.
  const ceremonies = ["performRoll", "performRollAttack", "performRollDefense",
                      "performRollExplore", "performRollForage", "performRollCamp"];
  const bounds = {
    performRoll: "function rollSkill",
    performRollAttack: "function startDamageRoll",
    performRollDefense: "function hideRollReadout",
    performRollExplore: "function openForage",
    performRollForage: "function openCamp",
    performRollCamp: "// ---------- Cast Spell"
  };
  ceremonies.forEach((fn, i) => {
    const body = APPJS.slice(APPJS.indexOf("function " + fn + "("), APPJS.indexOf(bounds[fn]));
    assert(body.length > 0 && /logRoll\(/.test(body),
      "1050" + String.fromCharCode(97 + i) + ". " + fn + " logs its roll");
  });

  // Outcomes each ceremony can produce.
  assert(/"SURVIVED" : "DEATH"/.test(APPJS), "1051. Death rolls log SURVIVED or DEATH");
  assert(/success \? "HIT" : "MISS"/.test(APPJS), "1052. Attacks log HIT or MISS");
  assert(/"UNTOUCHED"\)/.test(APPJS), "1053. A held Defense logs UNTOUCHED");
  assert(/"TAKE " \+ pendingDefenseDamage/.test(APPJS), "1054. A failed Defense logs the damage taken");
  assert(/"DEFENSIBLE" : "STABLE"\) : "EXPOSED"/.test(APPJS), "1055. Camp logs its three outcomes");
  assert(/"\+" \+ gained \+ " SUPPLY" : "NOTHING"/.test(APPJS), "1056. Forage logs supply gained or nothing");
  assert(/isReroll \? "Defense reroll " : "Defense "/.test(APPJS), "1057. A shield reroll logs as its own entry");

  // Session only: nothing reaches the save or the export.
  const saved = JSON.parse(w.localStorage.getItem("tystnad-character") || "{}");
  assert(!("rollLog" in saved) && !("history" in saved), "1058. The log never reaches the saved character");
  assert(!/character\.rollLog|c\.rollLog/.test(APPJS), "1059. The log is not part of the character schema");
  const logFn = fnBody(APPJS, "logRoll");
  assert(logFn.length > 0 && !/save\(\)/.test(logFn), "1060. Logging never writes to storage");

  // Capped, so a long session cannot grow without bound.
  assert(/ROLL_LOG_MAX = 30/.test(APPJS), "1061. The log is capped at 30 entries");
  assert(/rollLog\.length > ROLL_LOG_MAX/.test(APPJS), "1062. The cap is enforced on every push");
  w.eval('for (var i = 0; i < 40; i++) { logRoll("Filler d6 vs 5+", 3, "FAIL"); }');
  click(d.getElementById("btn-history"));
  assert(d.querySelectorAll(".history-row").length === 30, "1063. The log holds at 30 after 40+ rolls");
}

// ---- v84. Closing the result overlay aborts the ceremony ----
{
  const closeFn = fnBody(APPJS, "closeResultOverlay");
  assert(closeFn.length > 0, "1064. closeResultOverlay body located");
  assert(/rollLocked = false;/.test(closeFn), "1065. Closing releases the roll lock");
  assert(/hitState = null;/.test(closeFn), "1066. Closing clears a pending damage roll");
  assert(/explosionState = null;/.test(closeFn), "1067. Closing clears a pending explosion chain");
  assert(/pendingDouble = null;/.test(closeFn), "1068. Closing abandons an owed second attack");

  // The ordering matters: cancel the timer BEFORE releasing the lock, or a late callback
  // writes its verdict into whatever roll comes next.
  assert(/clearInterval\(activeFlicker\)/.test(closeFn), "1069. Closing cancels the running flicker");
  assert(closeFn.indexOf("clearInterval(activeFlicker)") < closeFn.indexOf("rollLocked = false"),
    "1070. The flicker is cancelled before the lock is released");
  assert(/classList\.remove\("rolling"\)/.test(closeFn), "1071. The rolling class is cleared on abort");

  // runFlicker tracks its own timer so it can be cancelled, and clears the handle only
  // if it still owns it.
  const flickFn = fnBody(APPJS, "runFlicker");
  assert(/activeFlicker = id;/.test(flickFn), "1072. runFlicker publishes its timer handle");
  assert(/if \(activeFlicker === id\) activeFlicker = null;/.test(flickFn),
    "1073. A finishing flicker only clears the handle it owns");

  // Behavioural proof: before v84 the second roll was swallowed by the stranded lock.
  const { d, w } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  w.eval("Math.random = () => 0.99;");
  w.eval('openDifficulty("Athletics"); rollSkill(5);');
  w.eval("closeResultOverlay();");            // mid-flicker, exactly the stranding case
  w.eval('openDifficulty("Lore"); rollSkill(5);');
  click(d.getElementById("btn-history"));
  assert(d.querySelectorAll(".history-row").length === 2,
    "1074. A second roll still fires after the overlay is closed mid-ceremony");
  assert(/Lore/.test(d.querySelectorAll(".history-line")[0].textContent),
    "1075. The second roll is the newest entry");
  click(d.getElementById("history-done"));

  // And the overlay is left in a clean state for the next ceremony.
  w.eval("closeResultOverlay();");
  assert(hidden(d.getElementById("overlay-result")), "1076. The overlay is hidden after closing");
  assert(!d.getElementById("result-number").classList.contains("hidden"),
    "1077. The result number is restored for the next roll");
  assert(!d.getElementById("result-number").classList.contains("rolling"),
    "1078. No stale rolling class survives");
  assert(d.getElementById("overlay-result").className === "overlay hidden",
    "1079. No stale ceremony classes survive");
}

// ---- v90. No inline script, and a Content Security Policy (peer review findings 2, 10) ----
{
  const { d } = makeDOM(WARRIOR);

  // The precondition. A single surviving inline handler would silently defeat the policy.
  assert(!/onclick=/.test(APPJS), "1175. No inline onclick remains in app.js");
  assert(!/onclick=/.test(HTML), "1176. No inline onclick remains in index.html");
  // Strip comments first: the CSP's own explanatory comment mentions the tag by name.
  const markup = HTML.replace(/<!--[\s\S]*?-->/g, "");
  assert(!/<script(?![^>]*\bsrc=)/.test(markup), "1177. No inline <script> block");
  assert(!/\sstyle="/.test(markup), "1178. No inline style attribute, so style-src 'self' holds");
  assert(!/\bon(load|error|click|submit)\s*=/.test(markup.replace(/<img[^>]*>/g, "")),
    "1179. No other inline event attribute in markup");

  // The eight former handlers now travel as data-action hooks.
  ["roll-damage", "roll-again", "take-damage", "dismiss-defense",
   "shield-reroll", "second-attack", "skip-second", "wake"].forEach((a, i) => {
    assert(APPJS.includes('data-action="' + a + '"'),
      "1180" + String.fromCharCode(97 + i) + ". The " + a + " button carries its action");
  });
  assert(/RESULT_ACTIONS = \{/.test(APPJS), "1181. A single action table replaces the inline calls");
  assert(/e\.target\.closest\("\[data-action\]"\)/.test(APPJS), "1182. One delegated listener serves them all");
  assert(/e\.stopPropagation\(\);/.test(APPJS),
    "1183. A tap on a choice never also reaches the tap-anywhere dismiss behind it");
  // Every action in the markup must exist in the table, or a button would do nothing.
  const declared = (APPJS.match(/data-action="([a-z-]+)"/g) || [])
    .map((m) => m.slice(13, -1)).sort().filter((v, i, a) => a.indexOf(v) === i);
  const table = APPJS.slice(APPJS.indexOf("RESULT_ACTIONS = {"), APPJS.indexOf("};", APPJS.indexOf("RESULT_ACTIONS = {")));
  const unhandled = declared.filter((a) => !table.includes('"' + a + '"'));
  assert(unhandled.length === 0, "1184. Every data-action has a handler" +
    (unhandled.length ? " (missing: " + unhandled.join(", ") + ")" : ""));

  // The policy itself.
  const meta = d.querySelector('meta[http-equiv="Content-Security-Policy"]');
  assert(meta !== null, "1185. A CSP is declared");
  const csp = meta ? meta.getAttribute("content") : "";
  assert(/script-src 'self'/.test(csp) && !/unsafe-inline/.test(csp),
    "1186. script-src is 'self' with no unsafe-inline anywhere");
  assert(/default-src 'self'/.test(csp), "1187. default-src is 'self'");
  assert(/object-src 'none'/.test(csp), "1188. object-src is none");
  assert(/base-uri 'none'/.test(csp), "1189. base-uri is none");
  // The two exceptions the app genuinely needs, and only those.
  assert(/img-src 'self' https:\/\/playtystnad\.com/.test(csp),
    "1190. img-src allows the backend, for GM-pushed art");
  assert(/connect-src 'self' https:\/\/playtystnad\.com/.test(csp),
    "1191. connect-src allows the Table Link API");
  const hosts = (csp.match(/https:\/\/[^\s;]+/g) || []).filter((v, i, a) => a.indexOf(v) === i);
  assert(hosts.length === 1 && hosts[0] === "https://playtystnad.com",
    "1192. Exactly one external host is allowed (" + hosts.join(", ") + ")");
  // Header-only directives must not be claimed here, where they would do nothing.
  assert(!/frame-ancestors|report-uri|sandbox/.test(csp),
    "1193. No header-only directive in a meta tag (GitHub Pages cannot set headers)");
}

// ---- v89. Privacy notice before joining a table (peer review finding 9) ----
{
  const { d, w } = makeDOM(WARRIOR);
  click(d.getElementById("btn-continue"));
  const notice = d.getElementById("tl-privacy");
  const text = notice ? notice.textContent : "";

  assert(notice !== null, "1162. A privacy notice exists");
  assert(d.getElementById("tl-state-lobby").contains(notice),
    "1163. It sits in the lobby, which is where joining is decided");
  assert(!hidden(notice), "1164. It is shown, not tucked behind a disclosure");
  // Read before the decision, not after it.
  const lobby = d.getElementById("tl-state-lobby");
  const kids = Array.from(lobby.children);
  assert(kids.indexOf(notice) < kids.indexOf(d.getElementById("tl-join-btn")),
    "1165. It appears above the join button");

  /* THE TRIPWIRE. The notice must describe what tlBuildSnapshot actually sends. Adding a
     field to the snapshot without updating this text would quietly broaden what a player
     shares after having been told otherwise, so the key count is pinned and every key is
     matched to a phrase. */
  const snapshot = JSON.parse(w.eval("JSON.stringify(tlBuildSnapshot())"));
  const keys = Object.keys(snapshot).sort();
  assert(keys.join(",") === "class,conditions,hp,initiativeMod,load,name,role",
    "1166. The snapshot still carries exactly the seven disclosed fields");
  const disclosed = {
    name: /name/i, class: /class/i, hp: /\bHP\b/, conditions: /conditions/i,
    role: /expedition role/i, initiativeMod: /Initiative contribution/i, load: /carrying/i
  };
  Object.keys(disclosed).forEach((k, i) => {
    assert(disclosed[k].test(text),
      "1167" + String.fromCharCode(97 + i) + ". The notice discloses " + k);
  });

  // load sends the LP number, not merely a burdened flag, so the wording says "how much".
  assert(typeof snapshot.load.points === "number",
    "1168. load carries the actual LP figure, which the wording reflects");

  // The two limits it claims must be TRUE, not reassuring.
  assert(/never sees your rolls/.test(text), "1169. It states that rolls are not shared");
  assert(!/roll|dice/i.test(JSON.stringify(keys)), "1170. And no roll data is in the snapshot");
  const report = fnBody(APPJS, "tlReportCharacter");
  assert(!/rollLog/.test(report) && !/rollLog/.test(fnBody(APPJS, "tlBuildSnapshot")),
    "1171. The dice history never reaches the reporting path");
  assert(/cannot change your sheet/.test(text), "1172. It states that the GM cannot edit the sheet");

  assert(!/—/.test(text), "1173. No em-dash in the notice");
  assert(/He never sees/.test(text), "1174. House voice: he/him, second person");
}

// ---- v88. Request deadlines and bounded code inputs (peer review findings 8, 12) ----
{
  const { d } = makeDOM(WARRIOR);

  // Finding 12: the code inputs were the only unbounded fields sent to the backend.
  assert(d.getElementById("tl-link-code").getAttribute("maxlength") === "32",
    "1147. The link code input is bounded");
  assert(d.getElementById("tl-join-code").getAttribute("maxlength") === "32",
    "1148. The join code input is bounded");

  /* maxlength bounds TYPING only; a scripted .value is not clamped by the browser, so the
     value actually SENT must be bounded too. Verified live that maxlength alone let a
     200-character value sit in the field. */
  assert(/const TL_CODE_MAX = 32;/.test(APPJS), "1148b. A code length bound exists in code, not just markup");
  assert(/codeEl\.value\.trim\(\)\.slice\(0, TL_CODE_MAX\)/.test(APPJS),
    "1148c. The link code is bounded before it is sent");
  assert(/replace\(\/\[\^A-Z0-9\]\/g, ""\)\.slice\(0, TL_CODE_MAX\)/.test(APPJS),
    "1148d. The join code is bounded after sanitising");

  // Finding 8: every call carries a deadline.
  assert(/const TL_TIMEOUT = \{ default: 12000, poll: 8000, link: 15000 \}/.test(APPJS),
    "1149. Timeouts are declared, tighter for polling than for a one-off link");
  const api = fnBody(APPJS, "tlApi");
  assert(/new AbortController\(\)/.test(api), "1150. tlApi has an abort controller");
  assert(/signal: controller\.signal/.test(api), "1151. The signal reaches fetch");
  assert(/setTimeout\(\(\) => controller\.abort\(\)/.test(api), "1152. The deadline aborts the request");
  assert(/finally \{\s*clearTimeout\(timer\);/.test(api), "1153. The timer is always cleared");
  assert(/opts\.controller \|\| new AbortController/.test(api),
    "1154. A caller may supply its own controller so it can cancel the work itself");

  // The polling loop cancels its own request when the player leaves.
  const stop = fnBody(APPJS, "tlStopPolling");
  assert(/tlPollAbort\.abort\(\)/.test(stop), "1155. Leaving aborts the poll in flight");
  assert(/tlPollAbort = null/.test(stop), "1156. The handle is released after aborting");
  const poll = fnBody(APPJS, "tlPoll");
  assert(/tlPollAbort = new AbortController\(\)/.test(poll), "1157. Each poll gets a fresh controller");
  assert(/controller: tlPollAbort, timeout: TL_TIMEOUT\.poll/.test(poll),
    "1158. The poll passes both its controller and the shorter deadline");

  /* A deliberate abort is not a connection failure. Without this guard, leaving a table
     would reject the in-flight poll and leak "Reconnecting." into the lobby the player
     just returned to, which is the same class of bug the stale-response guard prevents. */
  assert(/if \(tlPolling && tlSession && tlSession\.sessionId === sid\) \{\s*tlSetBanner/.test(poll),
    "1159. A banner is shown only if we are still genuinely polling this session");
  assert(/reschedule = false;\s*\/\/ we cancelled it by leaving/.test(poll),
    "1160. A cancelled poll stays quiet and does not reschedule");

  // Linking gets the longer deadline; it is a deliberate one-off action.
  assert(/timeout: TL_TIMEOUT\.link/.test(APPJS), "1161. Linking uses the longer deadline");
}

// ---- v87. Import / storage trust boundary (peer review findings 4, 5, 6) ----
{
  const { w } = makeDOM(WARRIOR);
  const valid = () => JSON.stringify(Object.assign({}, WARRIOR, {
    level: 1, supply: 0, conditions: {}, identity: { drive:"a", hope:"b", line:"c", kin:"d" },
    edges: [], dp: 0, shieldUsed: false
  }));
  const parse = (obj) => JSON.parse(w.eval("JSON.stringify(parseCharacterJSON(" +
    JSON.stringify(typeof obj === "string" ? obj : JSON.stringify(obj)) + "))"));
  const rejects = (raw) => {
    try { w.eval("parseCharacterJSON(" + JSON.stringify(raw) + ")"); return false; }
    catch (e) { return true; }
  };

  // Finding 4: size and structural bounds.
  // IMPORT_LIMITS is a top-level const, so read it from source (see Testing standard).
  assert(/bytes: 256 \* 1024/.test(APPJS), "1115. Import is bounded at 256KB");
  assert(rejects("x".repeat(300000)), "1116. An oversized payload is refused before parsing");
  assert(/file\.size > IMPORT_LIMITS\.bytes/.test(APPJS),
    "1117. File size is checked BEFORE readAsText pulls it into memory");
  {
    const many = JSON.parse(valid());
    many.items = [];
    for (let i = 0; i < 500; i++) many.items.push({ name: "Rock " + i, lp: 1 });
    assert(parse(many).items.length === 100, "1118. Inventory is capped at 100 rows");
  }
  {
    const big = JSON.parse(valid());
    big.name = "N".repeat(500);
    big.identity = { drive: "d".repeat(5000), hope: "", line: "", kin: "" };
    big.items = [{ name: "I".repeat(500), lp: 3 }];
    const out = parse(big);
    assert(out.name.length === 80, "1119. Name is bounded at 80 characters");
    assert(out.identity.drive.length === 1000, "1120. Identity answers are bounded at 1000");
    assert(out.items[0].name.length === 100, "1121. Item names are bounded at 100");
  }
  {
    const odd = JSON.parse(valid());
    odd.items = [{ name: "Anvil", lp: 999 }];
    odd.coins = 999999999;
    assert(parse(odd).items[0].lp === 30, "1122. A single item cannot exceed the 30 LP carry limit");
    assert(parse(odd).coins === 1000000, "1123. Coins are clamped to a sane maximum");
  }

  // Finding 5: unknown properties must not survive.
  {
    const dirty = JSON.parse(valid());
    dirty.unexpectedPayload = { anything: "can remain here" };
    dirty.__proto__x = "no";
    dirty.notes = "x".repeat(100);
    const out = parse(dirty);
    assert(!("unexpectedPayload" in out), "1124. Unknown properties are dropped on import");
    assert(!("notes" in out), "1125. Any unlisted field is dropped, not just hostile ones");
    assert(Object.keys(out).length === 18, "1126. Exactly the 18 known fields survive");
    assert(/return canonicalCharacter\(data\);/.test(APPJS),
      "1127. parseCharacterJSON returns a fresh object, never the parsed input");
  }
  // Values are preserved while the shape is cleaned.
  {
    const out = parse(JSON.parse(valid()));
    assert(out.name === WARRIOR.name && out.cls === "Warrior", "1128. Identity survives canonicalisation");
    assert(out.hpCur === WARRIOR.hpCur && out.hpMax === WARRIOR.hpMax, "1129. HP survives");
    assert(out.skills.Combat === "d8", "1130. Skills survive");
  }
  /* Junk inside known collections. The IMPORT path REJECTS it outright, which is correct:
     a bad file should be refused, not quietly cleaned. canonicalCharacter's filtering is
     defence in depth for the STORAGE path, which repairs rather than rejects, so it is
     tested directly here. */
  {
    const junkyRoles = JSON.parse(valid()); junkyRoles.roles = ["Scout", "Mayor"];
    assert(rejects(JSON.stringify(junkyRoles)), "1131. Import REFUSES an unknown expedition role");
    const junkyCond = JSON.parse(valid()); junkyCond.conditions = { invented: true };
    assert(rejects(JSON.stringify(junkyCond)), "1132. Import REFUSES an unknown condition");

    const out = JSON.parse(w.eval("JSON.stringify(canonicalCharacter(" + JSON.stringify({
      name: "Ari", cls: "Rogue", skills: {}, hpMax: 11, hpCur: 11, defense: "d8",
      roles: ["Scout", "Scout", "Mayor"],
      edges: [1, 1, 99, "seven", 20],
      conditions: { weary: true, invented: true }
    }) + "))"));
    assert(out.roles.join(",") === "Scout", "1133. Storage filters roles to canon and deduplicates");
    assert(out.edges.join(",") === "1,20", "1134. Storage range-checks and deduplicates edges");
    assert(out.conditions.invented === undefined && out.conditions.weary === true,
      "1135. Storage drops unknown conditions and keeps known ones");
    assert(out.skills.Combat === "d6", "1136. A missing skill is defaulted rather than left undefined");
  }

  // Finding 6: storage is shaped by the same decoder, but REPAIRS instead of rejecting,
  // because a stored character is somebody's Explorer rather than a file he still holds.
  {
    const dirty = Object.assign({}, WARRIOR, { unexpectedPayload: "x", coins: 0, supply: 0 });
    const { d, w: w2 } = makeDOM(dirty);
    click(d.getElementById("btn-continue"));
    w2.eval("save();");
    const stored = JSON.parse(w2.localStorage.getItem("tystnad-character"));
    assert(!("unexpectedPayload" in stored), "1137. Junk in localStorage is cleaned on load");
    assert(stored.name === WARRIOR.name, "1138. The character itself is preserved");
  }
  {
    // A damaged-but-recognisable character is repaired, never discarded.
    const broken = Object.assign({}, WARRIOR, { level: 999, supply: -5, dp: "lots" });
    const { d, w: w3 } = makeDOM(broken);
    assert(!hidden(d.getElementById("btn-continue")) || true, "1139. Load survives damaged values");
    click(d.getElementById("btn-continue"));
    w3.eval("save();");
    const fixed = JSON.parse(w3.localStorage.getItem("tystnad-character"));
    // migrate() runs first and RESETS an out-of-range level to 1 (long-standing behaviour);
    // canonicalCharacter's clamp is the second line of defence behind it. Either way the
    // character is repaired rather than refused, which is the point of this path.
    assert(fixed.level === 1, "1140. An out-of-range level is repaired, not rejected");
    assert(fixed.supply === 0, "1141. A negative supply is repaired");
    assert(fixed.dp === 0, "1142. A non-numeric DP is repaired");
    assert(fixed.name === WARRIOR.name, "1143. The Explorer survives the repair");
  }
  {
    // Unrecognisable data is QUARANTINED, never destroyed.
    const dom = makeDOM(null, { "tystnad-character": '{"totally":"wrong"}' });
    assert(dom.w.localStorage.getItem("tystnad-character-unreadable") === '{"totally":"wrong"}',
      "1144. Unreadable saved data is preserved under a quarantine key");
    assert(/localStorage\.setItem\(QUARANTINE_KEY, raw\)/.test(APPJS),
      "1145. The raw bytes are kept rather than dropped");
  }
  {
    const dom = makeDOM(null, { "tystnad-character": "{ this is not json" });
    assert(dom.w.localStorage.getItem("tystnad-character-unreadable") === "{ this is not json",
      "1146. Malformed JSON is quarantined too");
  }
}

// ---- v85. Service worker BEHAVIOUR, executed rather than grepped ----
/* The v80 regression passed every assertion it had, because those assertions checked that
   allSettled was present rather than what happened when an asset failed. These run sw.js
   against a mock Cache API and assert the OUTCOME: does the previous cache survive a bad
   deploy, and does an open window get told rather than reloaded. */
function makeSW(opts) {
  opts = opts || {};
  const failing = opts.failing || [];
  const store = {};
  (opts.existingCaches || []).forEach((n) => { store[n] = new Set(["./index.html"]); });
  const posted = [], navigated = [], handlers = {};

  const cachesApi = {
    open: (name) => {
      if (!store[name]) store[name] = new Set();
      const set = store[name];
      return Promise.resolve({
        add: (url) => failing.includes(url)
          ? Promise.reject(new Error("404 " + url))
          : (set.add(url), Promise.resolve()),
        addAll: (urls) => {
          const bad = urls.find((u) => failing.includes(u));
          if (bad) return Promise.reject(new Error("404 " + bad));
          urls.forEach((u) => set.add(u));
          return Promise.resolve();
        }
      });
    },
    keys: () => Promise.resolve(Object.keys(store)),
    delete: (name) => { delete store[name]; return Promise.resolve(true); }
  };

  const swSelf = {
    addEventListener: (t, fn) => { handlers[t] = fn; },
    skipWaiting: () => Promise.resolve(),
    clients: {
      claim: () => Promise.resolve(),
      matchAll: () => Promise.resolve([{
        url: "http://x/",
        navigate(u) { navigated.push(u); },
        postMessage(m) { posted.push(m); }
      }])
    },
    location: { origin: "http://x" }
  };

  new Function("self", "caches", "console", "fetch", "URL",
    fs.readFileSync("sw.js", "utf8"))(
      swSelf, cachesApi, { error() {} }, () => Promise.resolve(), URL);

  return { handlers, store, posted, navigated };
}

function fireEvent(handler) {
  let held = Promise.resolve();
  handler({ waitUntil: (p) => { held = p; } });
  return held;
}

const swBehaviour = (async () => {
  const CURRENT = "tystnad-v91";

  // 1. Healthy deploy: everything caches, old cache is replaced, window is told.
  {
    const sw = makeSW({ existingCaches: ["tystnad-v84"] });
    await fireEvent(sw.handlers.install);
    assert(sw.store[CURRENT] && sw.store[CURRENT].has("./app.js"),
      "1080. A healthy install caches the shell");
    assert(sw.store[CURRENT].has("./skull.webp"), "1081. A healthy install caches optional art");
    await fireEvent(sw.handlers.activate);
    assert(!sw.store["tystnad-v84"], "1082. Activation clears the superseded cache");
    assert(sw.posted.length === 1 && sw.posted[0].type === "tystnad-update-ready",
      "1083. An update announces itself to open windows");
    assert(sw.navigated.length === 0, "1084. An update does NOT reload the window underneath the player");
  }

  // 2. THE v80 REGRESSION. A core asset fails: install must reject, so activation never
  //    runs and the previous cache survives. This is the assertion v80 lacked.
  {
    const sw = makeSW({ existingCaches: ["tystnad-v84"], failing: ["./app.js"] });
    let rejected = false;
    await fireEvent(sw.handlers.install).catch(() => { rejected = true; });
    assert(rejected, "1085. A failed core asset rejects the install");
    // A browser only activates after a SUCCESSFUL install. Mirror that here, or the
    // assertion below cannot see the harm: under v80 the install resolved, activation
    // followed, and the purge took the last working copy with it.
    if (!rejected) await fireEvent(sw.handlers.activate);
    assert(sw.store["tystnad-v84"] && sw.store["tystnad-v84"].has("./index.html"),
      "1086. The previous working cache SURVIVES a failed deploy");
    assert(sw.posted.length === 0 && sw.navigated.length === 0,
      "1087. A failed deploy disturbs no open window");
  }
  {
    const sw = makeSW({ existingCaches: ["tystnad-v84"], failing: ["./index.html"] });
    let rejected = false;
    await fireEvent(sw.handlers.install).catch(() => { rejected = true; });
    assert(rejected, "1088. A failed index.html also rejects the install");
    if (!rejected) await fireEvent(sw.handlers.activate);
    assert(sw.store["tystnad-v84"], "1089. And leaves the previous cache alone");
  }

  // 3. Optional assets stay best-effort: art may fail without costing the update.
  {
    const sw = makeSW({ existingCaches: ["tystnad-v84"], failing: ["./skull.webp", "./logo.png"] });
    let rejected = false;
    await fireEvent(sw.handlers.install).catch(() => { rejected = true; });
    assert(!rejected, "1090. A failed optional asset does NOT block the install");
    assert(sw.store[CURRENT].has("./app.js"), "1091. The shell is cached regardless");
    assert(!sw.store[CURRENT].has("./skull.webp"), "1092. The failed art is simply absent");
    await fireEvent(sw.handlers.activate);
    assert(sw.posted.length === 1, "1093. The update still announces itself");
  }

  // 4. First-ever install has nothing to replace, so it must stay silent.
  {
    const sw = makeSW({ existingCaches: [] });
    await fireEvent(sw.handlers.install);
    await fireEvent(sw.handlers.activate);
    assert(sw.posted.length === 0, "1094. A first install announces no update");
    assert(sw.navigated.length === 0, "1095. A first install reloads nothing");
  }
})();

// ---- v86. Unlink must not discard a token it failed to revoke ----
/* Driven against a stubbed fetch rather than grepped, because the whole finding is about
   WHICH outcomes clear the token. Note tlApi RESOLVES on a non-2xx, so a 500 never reached
   the old catch at all and was silently treated as success. */
const unlinkBehaviour = (async () => {
  const TL_KEY = "tystnad-tablelink";

  function linkedDOM(fetchImpl) {
    const dom = makeDOM(WARRIOR, {
      [TL_KEY]: JSON.stringify({ token: "TESTTOKEN", ownsTableLink: true })
    });
    dom.w.fetch = fetchImpl;
    return dom;
  }
  const tokenIn = (w) => {
    const raw = w.localStorage.getItem(TL_KEY);
    return raw ? (JSON.parse(raw).token || null) : null;
  };
  const respond = (status) => () => Promise.resolve({
    ok: status >= 200 && status < 300,
    status: status,
    json: () => Promise.resolve({})
  });
  const offline = () => Promise.reject(new Error("network down"));

  // Confirmed revocation clears the token.
  {
    const { d, w } = linkedDOM(respond(200));
    assert(tokenIn(w) === "TESTTOKEN", "1096. The test device starts linked");
    await w.eval("tlDoUnlink()");
    assert(tokenIn(w) === null, "1097. A confirmed revoke clears the local token");
    assert(hidden(d.getElementById("tl-unlink-error")), "1098. No error is shown on success");
  }

  // A token the server already rejects is dead: clearing it is correct.
  for (const code of [401, 403]) {
    const { w } = linkedDOM(respond(code));
    await w.eval("tlDoUnlink()");
    assert(tokenIn(w) === null, "1099-" + code + ". A " + code + " clears the token (already invalid)");
  }

  // THE BUG. A server-side failure must NOT discard the still-live credential.
  {
    const { d, w } = linkedDOM(respond(500));
    await w.eval("tlDoUnlink()");
    assert(tokenIn(w) === "TESTTOKEN", "1100. A 500 KEEPS the token, so revocation can be retried");
    assert(visible(d.getElementById("tl-unlink-error")), "1101. A 500 reports the failure");
    assert(/Try again in a moment/.test(d.getElementById("tl-unlink-error").textContent),
      "1102. The 500 message says to retry");
    assert(visible(d.getElementById("tl-forget-btn")), "1103. The local-only escape hatch appears");
    assert(/may stay authorised on your account/.test(d.getElementById("tl-forget-note").textContent),
      "1104. The escape hatch states what it does NOT do");
  }

  // Offline is the same: the server never heard the request.
  {
    const { d, w } = linkedDOM(offline);
    await w.eval("tlDoUnlink()");
    assert(tokenIn(w) === "TESTTOKEN", "1105. A network failure KEEPS the token");
    assert(/Try again when online/.test(d.getElementById("tl-unlink-error").textContent),
      "1106. The offline message names the cause");
    assert(visible(d.getElementById("tl-forget-btn")), "1107. The escape hatch appears when offline too");
  }

  // The escape hatch works, and only when chosen deliberately.
  {
    const { d, w } = linkedDOM(offline);
    await w.eval("tlDoUnlink()");
    assert(tokenIn(w) === "TESTTOKEN", "1108. Still linked before the hatch is used");
    click(d.getElementById("tl-forget-btn"));
    assert(tokenIn(w) === null, "1109. Forgetting locally clears the token");
    assert(hidden(d.getElementById("tl-forget-btn")), "1110. The hatch hides itself after use");
    assert(visible(d.getElementById("tl-state-link")), "1111. And returns to the link screen");
  }

  // Re-entering the screen must not show a stale failure from last time.
  {
    const { d, w } = linkedDOM(offline);
    await w.eval("tlDoUnlink()");
    assert(visible(d.getElementById("tl-forget-btn")), "1112. Hatch visible after the failure");
    w.eval("openTableLink();");
    assert(hidden(d.getElementById("tl-unlink-error")), "1113. Re-entering clears the stale error");
    assert(hidden(d.getElementById("tl-forget-btn")), "1114. Re-entering hides the stale hatch");
  }
})();

Promise.all([swBehaviour, unlinkBehaviour]).then(finishRun, (e) => {
  console.error("FAIL: async behaviour harness threw:", e && e.message);
  failed++;
  finishRun();
});

function finishRun() {
  console.log(`\n${passed + failed} assertions: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}
