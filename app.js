/* ============================================================
   TYSTNAD Companion - v6
   Canon: Players Booklet v2.5
   ============================================================ */

"use strict";

// ---------- Canon data (Players Booklet v2.5) ----------

const SKILLS = [
  "Athletics", "Awareness", "Combat", "Finesse",
  "Ingenuity", "Lore", "Presence", "Sorcery"
];

const DICE = ["d6", "d8", "d10", "d12", "d20"];

const CLASSES = {
  Warrior:  { hp: 12, defense: "d8", core: "Combat",  d8: ["Combat", "Athletics", "Presence"] },
  Rogue:    { hp: 11, defense: "d8", core: "Finesse", d8: ["Finesse", "Awareness", "Athletics"] },
  Scholar:  { hp: 10, defense: "d6", core: "Lore",    d8: ["Lore", "Combat", "Ingenuity"] },
  Sorcerer: { hp: 9,  defense: "d6", core: "Sorcery", d8: ["Sorcery", "Presence", "Lore"] }
};

const DIFFICULTY_NAMES = { 4: "Easy 4+", 5: "Normal 5+", 6: "Hard 6+" };
const THREAT_NAMES = { 4: "Weak 4+", 5: "Standard 5+", 6: "Strong 6+" };

/* Initiative contribution by loadout (canon PB v2.5).
   Medium armor and standard weapons contribute 0. */
const INIT_ARMOR = { none: 2, light: 1, medium: 0, heavy: -1 };
const INIT_WEAPON = { light: 1, standard: 0, heavy: -1 };

/* Spell tiers (canon PB v2.5): cost in HP, Sorcery target to cast.
   The cost is paid on success, failure, and death alike. */
const CAST_TIERS = {
  1: { cost: 1, target: 4 },
  2: { cost: 2, target: 5 },
  3: { cost: 3, target: 6 }
};

const STORAGE_KEY = "tystnad-character";

const SKULL_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Failure" role="img">
  <path fill="#d92b32" d="M50 6C27 6 12 22 12 44c0 12 5 21 13 27v11c0 3 2 5 5 5h4v-8c0-1.5 1-2.5 2.5-2.5S39 77.5 39 79v8h7v-8c0-1.5 1-2.5 2.5-2.5S51 77.5 51 79v8h7v-8c0-1.5 1-2.5 2.5-2.5S63 77.5 63 79v8h4c3 0 5-2 5-5V71c8-6 13-15 13-27C85 22 73 6 50 6z"/>
  <circle fill="#0c0a0b" cx="35" cy="44" r="9"/>
  <circle fill="#0c0a0b" cx="65" cy="44" r="9"/>
  <path fill="#0c0a0b" d="M50 52l6 12H44z"/>
</svg>`;

// ---------- State ----------

let character = null;   // { name, cls, skills: {name: die}, hpMax, hpCur, defense }
let pendingSkill = null;
let rollLocked = false;

// ---------- Persistence ----------

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(character));
  } catch (e) {
    console.error("Save failed:", e);
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || !data.skills) return null;
    return migrate(data);
  } catch (e) {
    console.error("Load failed:", e);
    return null;
  }
}

/* Characters saved before v6 lack loadout, items, and coins.
   Default loadout is medium armor and a standard weapon: contribution 0. */
function migrate(c) {
  if (!c.loadout || !INIT_ARMOR.hasOwnProperty(c.loadout.armor)) {
    c.loadout = { armor: "medium", weapon: "standard" };
  }
  if (!INIT_WEAPON.hasOwnProperty(c.loadout.weapon)) {
    c.loadout.weapon = "standard";
  }
  if (!Array.isArray(c.items)) c.items = [];
  if (typeof c.coins !== "number" || isNaN(c.coins)) c.coins = 0;
  return c;
}

// ---------- Helpers ----------

const $ = (id) => document.getElementById(id);

function dieSides(die) {
  return parseInt(die.slice(1), 10);
}

function stepDie(die, dir) {
  const i = DICE.indexOf(die);
  const next = Math.min(Math.max(i + dir, 0), DICE.length - 1);
  return DICE[next];
}

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

// ---------- Creation screen ----------

const createState = {
  cls: null,
  skills: {},
  defense: "d8"
};

function initCreateScreen() {
  SKILLS.forEach((s) => { createState.skills[s] = "d6"; });
  createState.cls = null;
  createState.defense = "d8";
  $("in-name").value = "";
  $("in-hp").value = "";
  renderSkillEditors();
  renderDefense();
  document.querySelectorAll("#class-grid .class-btn").forEach((b) => b.classList.remove("selected"));
  validateCreate();
}

function renderSkillEditors() {
  const wrap = $("skill-editors");
  wrap.innerHTML = "";
  SKILLS.forEach((skill) => {
    const row = document.createElement("div");
    row.className = "skill-editor";

    const name = document.createElement("span");
    name.className = "skill-editor-name";
    name.textContent = skill;

    const stepper = document.createElement("div");
    stepper.className = "stepper";

    const minus = document.createElement("button");
    minus.className = "step-btn";
    minus.textContent = "\u2212";
    minus.setAttribute("aria-label", "Lower " + skill);
    minus.addEventListener("click", () => {
      createState.skills[skill] = stepDie(createState.skills[skill], -1);
      value.textContent = createState.skills[skill];
    });

    const value = document.createElement("span");
    value.className = "step-value";
    value.textContent = createState.skills[skill];

    const plus = document.createElement("button");
    plus.className = "step-btn";
    plus.textContent = "+";
    plus.setAttribute("aria-label", "Raise " + skill);
    plus.addEventListener("click", () => {
      createState.skills[skill] = stepDie(createState.skills[skill], 1);
      value.textContent = createState.skills[skill];
    });

    stepper.appendChild(minus);
    stepper.appendChild(value);
    stepper.appendChild(plus);
    row.appendChild(name);
    row.appendChild(stepper);
    wrap.appendChild(row);
  });
}

function renderDefense() {
  $("def-value").textContent = createState.defense;
}

function applyClassDefaults(cls) {
  createState.cls = cls;
  const def = CLASSES[cls];
  SKILLS.forEach((s) => {
    createState.skills[s] = def.d8.includes(s) ? "d8" : "d6";
  });
  createState.defense = def.defense;
  $("in-hp").value = def.hp;
  renderSkillEditors();
  renderDefense();
  validateCreate();
}

function validateCreate() {
  const nameOk = $("in-name").value.trim().length > 0;
  const hpOk = parseInt($("in-hp").value, 10) > 0;
  const clsOk = createState.cls !== null;
  $("btn-create").disabled = !(nameOk && hpOk && clsOk);
}

function createCharacter() {
  const hpMax = parseInt($("in-hp").value, 10);
  character = {
    name: $("in-name").value.trim(),
    cls: createState.cls,
    skills: Object.assign({}, createState.skills),
    hpMax: hpMax,
    hpCur: hpMax,
    defense: createState.defense,
    loadout: { armor: "medium", weapon: "standard" },
    items: [],
    coins: 0
  };
  save();
  renderSheet();
  hide($("screen-create"));
  show($("screen-sheet"));
}

// ---------- Sheet screen ----------

function renderSheet() {
  $("sheet-name").textContent = character.name;
  $("sheet-class").textContent = character.cls;
  $("sheet-def").textContent = character.defense;
  renderHP();
  renderSkillList();
  renderInit();
  renderInventory();
  $("inv-coins-in").value = character.coins > 0 ? character.coins : "";
  // Cast Spell belongs to Sorcerers alone.
  const castBtn = $("btn-cast");
  const row = $("row-actions");
  if (character.cls === "Sorcerer") {
    show(castBtn);
    row.classList.remove("single");
  } else {
    hide(castBtn);
    row.classList.add("single");
  }
}

function renderHP() {
  const cur = $("hp-current");
  cur.textContent = character.hpCur;
  $("hp-maxnum").textContent = character.hpMax;
  cur.classList.toggle("low", character.hpCur <= Math.floor(character.hpMax / 3));
  // The Death Roll waits at 0 HP and below.
  const deathBtn = $("btn-death");
  if (character.hpCur <= 0) {
    show(deathBtn);
  } else {
    hide(deathBtn);
  }
}

function renderSkillList() {
  const list = $("skill-list");
  list.innerHTML = "";
  const core = CLASSES[character.cls] ? CLASSES[character.cls].core : null;
  SKILLS.forEach((skill) => {
    const btn = document.createElement("button");
    btn.className = "skill-row";

    const name = document.createElement("span");
    name.className = "skill-name";
    name.textContent = skill;

    const die = document.createElement("span");
    die.className = "skill-die" + (skill === core ? " core" : "");
    die.textContent = character.skills[skill];

    btn.appendChild(name);
    btn.appendChild(die);
    btn.addEventListener("click", () => openDifficulty(skill));
    list.appendChild(btn);
  });
}

function adjustHP(delta) {
  // HP runs negative. The Death Roll die shrinks with the depth (canon PB v2.5).
  character.hpCur = Math.min(Math.max(character.hpCur + delta, -99), character.hpMax);
  renderHP();
  save();
}

// ---------- Max HP editing ----------

function openMaxHP() {
  $("maxhp-value").textContent = character.hpMax;
  show($("overlay-maxhp"));
}

function adjustMaxHP(delta) {
  const next = Math.min(Math.max(character.hpMax + delta, 1), 99);
  character.hpMax = next;
  // Lowering max clamps current. Raising max does not heal.
  if (character.hpCur > character.hpMax) {
    character.hpCur = character.hpMax;
  }
  $("maxhp-value").textContent = character.hpMax;
  renderHP();
  save();
}

// ---------- Initiative contribution ----------

function initContribution() {
  return INIT_ARMOR[character.loadout.armor] + INIT_WEAPON[character.loadout.weapon];
}

function fmtSigned(n) {
  return (n >= 0 ? "+" : "") + n;
}

function renderInit() {
  $("sheet-init").textContent = fmtSigned(initContribution());
}

function renderLoadoutButtons() {
  document.querySelectorAll("#armor-grid .class-btn").forEach((b) => {
    b.classList.toggle("selected", b.dataset.armor === character.loadout.armor);
  });
  document.querySelectorAll("#weapon-grid .class-btn").forEach((b) => {
    b.classList.toggle("selected", b.dataset.weapon === character.loadout.weapon);
  });
  $("init-preview").textContent = fmtSigned(initContribution());
}

function openLoadout() {
  renderLoadoutButtons();
  show($("overlay-loadout"));
}

// ---------- Inventory and Load Points ----------

/* Load thresholds (canon PB v2.5):
   0-23 Unburdened. 24-27 Heavy: no Full Actions, Sorcerers cannot cast.
   28-30 Overloaded: 1 Main Action only, no Full Actions, Sorcerers cannot cast.
   Coins: every 100 coins, or part thereof, counts as 1 LP. */

function coinLP() {
  return character.coins > 0 ? Math.ceil(character.coins / 100) : 0;
}

function totalLP() {
  let sum = coinLP();
  character.items.forEach((it) => { sum += it.lp; });
  return sum;
}

function lpState(total) {
  if (total >= 28) return "overloaded";
  if (total >= 24) return "heavy";
  return "unburdened";
}

function renderInventory() {
  const list = $("inv-list");
  list.innerHTML = "";
  character.items.forEach((it, i) => {
    const row = document.createElement("div");
    row.className = "inv-item";

    const name = document.createElement("span");
    name.className = "inv-item-name";
    name.textContent = it.name;

    const lp = document.createElement("span");
    lp.className = "inv-item-lp";
    lp.textContent = it.lp + " LP";

    const del = document.createElement("button");
    del.className = "inv-del";
    del.textContent = "\u00d7";
    del.setAttribute("aria-label", "Remove " + it.name);
    del.addEventListener("click", () => {
      character.items.splice(i, 1);
      renderInventory();
      save();
    });

    row.appendChild(name);
    row.appendChild(lp);
    row.appendChild(del);
    list.appendChild(row);
  });

  const total = totalLP();
  const state = lpState(total);

  $("inv-lp").textContent = total;
  document.querySelector(".inv-total").classList.toggle("overmax", total > 30);

  const badge = $("inv-badge");
  badge.textContent = state.toUpperCase();
  badge.classList.toggle("heavy", state === "heavy");
  badge.classList.toggle("overloaded", state === "overloaded");

  const cLP = coinLP();
  $("coin-lp").textContent = cLP > 0 ? "+" + cLP + " LP" : "";

  const hint = $("inv-hint");
  if (state === "heavy") {
    hint.textContent = "Heavy: no Full Actions. Sorcerers cannot cast.";
    show(hint);
  } else if (state === "overloaded") {
    hint.textContent = "Overloaded: 1 Main Action only. Sorcerers cannot cast.";
    show(hint);
  } else {
    hide(hint);
  }
}

function addItem() {
  const name = $("inv-name").value.trim();
  const lp = parseInt($("inv-lp-in").value, 10);
  if (!name || isNaN(lp) || lp < 0) return;
  character.items.push({ name: name, lp: Math.min(lp, 30) });
  $("inv-name").value = "";
  $("inv-lp-in").value = "";
  renderInventory();
  save();
}

function setCoins(raw) {
  const n = parseInt(raw, 10);
  character.coins = isNaN(n) || n < 0 ? 0 : Math.min(n, 999999);
  renderInventory();
  save();
}

// ---------- Export / Import ----------

function exportCharacter() {
  const json = JSON.stringify(character, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const safe = character.name
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "explorer";
  const filename = safe + ".json";

  // File share: iOS Safari and Android Chrome when the target app accepts files.
  if (typeof navigator.canShare === "function") {
    const file = new File([blob], filename, { type: "application/json" });
    if (navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: character.name })
        .catch(() => triggerDownload(blob, filename));
      return;
    }
  }
  // Text share: Android Chrome share sheet (Drive, Files, email, etc.).
  if (navigator.share) {
    navigator.share({ title: filename, text: json })
      .catch(() => triggerDownload(blob, filename));
    return;
  }
  triggerDownload(blob, filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so the download manager can claim the URL first.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importCharacter(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (
        !data || typeof data !== "object" ||
        typeof data.name !== "string" || !data.name ||
        typeof data.cls !== "string" || !CLASSES[data.cls] ||
        typeof data.skills !== "object" || !data.skills ||
        !(data.hpMax > 0) ||
        typeof data.hpCur !== "number" ||
        typeof data.defense !== "string"
      ) throw new Error("invalid");
      character = migrate(data);
      save();
      renderSheet();
      hide($("screen-create"));
      show($("screen-sheet"));
    } catch (_) {
      show($("import-error"));
    }
  };
  reader.onerror = () => show($("import-error"));
  reader.readAsText(file);
}

// ---------- Cast Spell ----------

function openCast() {
  $("cast-die-label").textContent = character.skills["Sorcery"];
  const warn = $("cast-warning");
  const state = lpState(totalLP());
  if (state === "heavy") {
    warn.textContent = "You are Heavy. Casting is not allowed while Heavy.";
    show(warn);
  } else if (state === "overloaded") {
    warn.textContent = "You are Overloaded. Casting is not allowed while Overloaded.";
    show(warn);
  } else {
    hide(warn);
  }
  show($("overlay-cast"));
}

/* Casting (canon PB v2.5): pay the HP cost, then roll Sorcery against
   the tier target. The cost is paid on success and failure alike.
   If paying the cost drops you to 0 HP or below, skip the Sorcery roll
   and make a Death Roll immediately. Survive, and the spell takes
   effect as you fall unconscious. Die, and it fizzles. */
function castTier(tier) {
  const t = CAST_TIERS[tier];
  hide($("overlay-cast"));

  character.hpCur = Math.max(character.hpCur - t.cost, -99);
  renderHP();
  save();

  if (character.hpCur <= 0) {
    const die = deathDie(character.hpCur);
    performRoll(die, 5, "Tier " + tier + " \u00b7 Death Roll " + die + " vs 5+",
      { death: true, casting: true });
  } else {
    const die = character.skills["Sorcery"];
    performRoll(die, t.target, "Tier " + tier + " \u00b7 Sorcery " + die + " vs " + t.target + "+", {});
  }
}

// ---------- Rolling ----------

function openDifficulty(skill) {
  pendingSkill = skill;
  $("diff-skill-name").firstChild.textContent = skill + " ";
  $("diff-skill-die").textContent = character.skills[skill];
  show($("overlay-difficulty"));
}

function openDefense() {
  $("def-edit-value").textContent = character.defense;
  show($("overlay-defense"));
}

// ---------- Death Roll ----------

/* Death Roll die by HP depth (canon PB v2.5):
   0 HP: d20. -1: d12. -2: d10. -3: d8. -4 or below: d6. */
function deathDie(hp) {
  if (hp >= 0) return "d20";
  if (hp === -1) return "d12";
  if (hp === -2) return "d10";
  if (hp === -3) return "d8";
  return "d6";
}

function openDeath() {
  $("death-die-label").textContent = deathDie(character.hpCur);
  show($("overlay-death"));
}

function rollDeath() {
  const die = deathDie(character.hpCur);
  hide($("overlay-death"));
  performRoll(die, 5, "Death Roll " + die + " vs 5+", { death: true });
}

/* Shared roll runner. opts:
   shortfall: on failure, also display FAILED BY (target minus roll).
     Used for Defense, where the shortfall is the base damage taken
     before the monster's damage bonus. The player adjusts HP himself.
   death: Death Roll mode. Success shows SURVIVES and rolls 1d6
     unconscious rounds. Failure shows DEATH and floods the overlay.
     The app changes nothing on death. Rerolls (Nine Lives, Not Yet)
     and the final ruling belong to the table. */
function performRoll(die, target, context, opts) {
  if (rollLocked) return;
  rollLocked = true;
  opts = opts || {};

  const sides = dieSides(die);
  const result = Math.floor(Math.random() * sides) + 1;

  $("result-context").textContent = context;

  const overlay = $("overlay-result");
  const numEl = $("result-number");
  const verdictEl = $("result-verdict");
  verdictEl.innerHTML = "";
  overlay.classList.remove("death-flood");
  numEl.classList.add("rolling");
  show(overlay);

  let ticks = 0;
  const flicker = setInterval(() => {
    numEl.textContent = Math.floor(Math.random() * sides) + 1;
    ticks++;
    if (ticks >= 8) {
      clearInterval(flicker);
      numEl.classList.remove("rolling");
      numEl.textContent = result;
      if (result >= target) {
        if (opts.death) {
          const rounds = Math.floor(Math.random() * 6) + 1;
          let notes = "";
          if (opts.casting) {
            notes += '<span class="survive-note">The spell takes effect</span>';
          }
          notes += '<span class="survive-note">Unconscious ' + rounds +
            (rounds === 1 ? " round" : " rounds") + "</span>";
          verdictEl.innerHTML =
            '<div class="verdict-fail"><span class="verdict-success">SURVIVES</span>' +
            notes + "</div>";
        } else {
          verdictEl.innerHTML = '<span class="verdict-success">SUCCESS</span>';
        }
      } else if (opts.death) {
        overlay.classList.add("death-flood");
        verdictEl.innerHTML =
          '<div class="verdict-fail"><span class="verdict-skull">' + SKULL_SVG + "</span>" +
          '<span class="verdict-death">DEATH</span></div>';
      } else if (opts.shortfall) {
        verdictEl.innerHTML =
          '<div class="verdict-fail"><span class="verdict-skull">' + SKULL_SVG + "</span>" +
          '<span class="fail-by">Failed by ' + (target - result) + "</span></div>";
      } else {
        verdictEl.innerHTML = '<span class="verdict-skull">' + SKULL_SVG + "</span>";
      }
      rollLocked = false;
    }
  }, 60);
}

function rollSkill(target) {
  const skill = pendingSkill;
  const die = character.skills[skill];
  hide($("overlay-difficulty"));
  performRoll(die, target, skill + " " + die + " vs " + DIFFICULTY_NAMES[target], {});
}

function rollDefense(target) {
  const die = character.defense;
  hide($("overlay-defense"));
  performRoll(die, target, "Defense " + die + " vs " + THREAT_NAMES[target], { shortfall: true });
}

// ---------- Wiring ----------

document.addEventListener("DOMContentLoaded", () => {

  // Creation
  $("class-grid").addEventListener("click", (e) => {
    const btn = e.target.closest(".class-btn");
    if (!btn) return;
    document.querySelectorAll("#class-grid .class-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    applyClassDefaults(btn.dataset.class);
  });

  $("def-stepper").addEventListener("click", (e) => {
    const btn = e.target.closest(".step-btn");
    if (!btn) return;
    // Defense die caps at d12 per global rule.
    const dir = parseInt(btn.dataset.dir, 10);
    const next = stepDie(createState.defense, dir);
    createState.defense = next === "d20" ? "d12" : next;
    renderDefense();
  });

  $("in-name").addEventListener("input", validateCreate);
  $("in-hp").addEventListener("input", validateCreate);
  $("btn-create").addEventListener("click", createCharacter);

  // Export
  $("btn-export").addEventListener("click", exportCharacter);

  // Import
  $("btn-import").addEventListener("click", () => {
    hide($("import-error"));
    $("import-file").click();
  });
  $("import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) importCharacter(file);
    e.target.value = "";
  });

  // Sheet
  $("hp-minus").addEventListener("click", () => adjustHP(-1));
  $("hp-plus").addEventListener("click", () => adjustHP(1));
  $("hp-max-btn").addEventListener("click", openMaxHP);
  $("def-block").addEventListener("click", openDefense);

  $("btn-new").addEventListener("click", () => show($("overlay-confirm")));
  $("confirm-no").addEventListener("click", () => hide($("overlay-confirm")));
  $("confirm-yes").addEventListener("click", () => {
    hide($("overlay-confirm"));
    character = null;
    localStorage.removeItem(STORAGE_KEY);
    initCreateScreen();
    hide($("screen-sheet"));
    show($("screen-create"));
  });

  // Max HP overlay
  $("maxhp-minus").addEventListener("click", () => adjustMaxHP(-1));
  $("maxhp-plus").addEventListener("click", () => adjustMaxHP(1));
  $("maxhp-done").addEventListener("click", () => hide($("overlay-maxhp")));

  // Skill difficulty overlay
  document.querySelectorAll("#overlay-difficulty .diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => rollSkill(parseInt(btn.dataset.target, 10)));
  });
  $("diff-cancel").addEventListener("click", () => {
    pendingSkill = null;
    hide($("overlay-difficulty"));
  });

  // Defense threat overlay
  document.querySelectorAll("#overlay-defense .diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => rollDefense(parseInt(btn.dataset.target, 10)));
  });
  $("def-cancel").addEventListener("click", () => hide($("overlay-defense")));

  // Defense die editing (persistent, capped at d12 per global rule)
  $("def-edit-stepper").addEventListener("click", (e) => {
    const btn = e.target.closest(".step-btn");
    if (!btn) return;
    const dir = parseInt(btn.dataset.dir, 10);
    const next = stepDie(character.defense, dir);
    character.defense = next === "d20" ? "d12" : next;
    $("def-edit-value").textContent = character.defense;
    $("sheet-def").textContent = character.defense;
    save();
  });

  // Death Roll
  $("btn-death").addEventListener("click", openDeath);
  $("death-roll-btn").addEventListener("click", rollDeath);
  $("death-cancel").addEventListener("click", () => hide($("overlay-death")));

  // Initiative loadout
  $("init-block").addEventListener("click", openLoadout);
  $("armor-grid").addEventListener("click", (e) => {
    const btn = e.target.closest(".class-btn");
    if (!btn) return;
    character.loadout.armor = btn.dataset.armor;
    renderLoadoutButtons();
    renderInit();
    save();
  });
  $("weapon-grid").addEventListener("click", (e) => {
    const btn = e.target.closest(".class-btn");
    if (!btn) return;
    character.loadout.weapon = btn.dataset.weapon;
    renderLoadoutButtons();
    renderInit();
    save();
  });
  $("loadout-done").addEventListener("click", () => hide($("overlay-loadout")));

  // Inventory
  $("inv-add-btn").addEventListener("click", addItem);
  $("inv-coins-in").addEventListener("input", (e) => setCoins(e.target.value));

  // Cast Spell
  $("btn-cast").addEventListener("click", openCast);
  document.querySelectorAll("#overlay-cast .diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => castTier(parseInt(btn.dataset.tier, 10)));
  });
  $("cast-cancel").addEventListener("click", () => hide($("overlay-cast")));

  // Result overlay dismisses on tap, but not mid-flicker
  $("overlay-result").addEventListener("click", () => {
    if (rollLocked) return;
    hide($("overlay-result"));
    $("overlay-result").classList.remove("death-flood");
  });

  // Boot
  character = load();
  if (character) {
    renderSheet();
    show($("screen-sheet"));
  } else {
    initCreateScreen();
    show($("screen-create"));
  }

  // PWA service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((e) => {
      console.error("Service worker registration failed:", e);
    });
  }
});
