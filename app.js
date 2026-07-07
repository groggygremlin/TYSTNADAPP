/* ============================================================
   TYSTNAD Companion - v18
   Canon: Players Booklet v2.5
   ============================================================ */

const VERSION = "v19";

// ---------- Canon data (Players Booklet v2.5) ----------

const SKILLS = [
  "Athletics", "Awareness", "Combat", "Finesse",
  "Ingenuity", "Lore", "Presence", "Sorcery"
];

const DICE = ["d6", "d8", "d10", "d12", "d20"];

// Extended ladder for Forage Rough die step-down; d4 is the floor (PB v2.5 Hexploration)
const FORAGE_DICE = ["d4", "d6", "d8", "d10", "d12", "d20"];

const CLASSES = {
  Warrior:  { hp: 12, defense: "d8", core: "Combat",  d8: ["Combat", "Athletics", "Presence"] },
  Rogue:    { hp: 11, defense: "d8", core: "Finesse", d8: ["Finesse", "Awareness", "Athletics"] },
  Scholar:  { hp: 10, defense: "d6", core: "Lore",    d8: ["Lore", "Combat", "Ingenuity"] },
  Sorcerer: { hp: 9,  defense: "d6", core: "Sorcery", d8: ["Sorcery", "Presence", "Lore"] }
};

const DIFFICULTY_NAMES = { 4: "Easy 4+", 5: "Normal 5+", 6: "Hard 6+" };
const TERRAIN_NAMES    = { 4: "Easy 4+", 5: "Standard 5+", 6: "Rough 6+" };
const THREAT_NAMES     = { 4: "Weak 4+", 5: "Standard 5+", 6: "Strong 6+" };

const INIT_ARMOR  = { none: 2, light: 1, medium: 0, heavy: -1 };
const INIT_WEAPON = { light: 1, standard: 0, heavy: -1 };

/* Weapon damage dice (PB v2.5 equipment chapter):
   Light 1d6, Standard 1d8, Heavy 1d10.
   Unarmed maps to the light bucket; separate ruling awaited. */
const WEAPON_DAMAGE = { light: "d6", standard: "d8", heavy: "d10" };

/* Spell tiers (PB v2.5): cost in HP, Sorcery target to cast.
   Cost paid on success, failure, and death alike. */
const CAST_TIERS = {
  1: { cost: 1, target: 4 },
  2: { cost: 2, target: 5 },
  3: { cost: 3, target: 6 }
};

const EXPEDITION_ROLES = ["Pathfinder", "Scout", "Quartermaster"];

const STORAGE_KEY = "tystnad-character";

const SKULL_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Failure" role="img">
  <path fill="#d92b32" d="M50 6C27 6 12 22 12 44c0 12 5 21 13 27v11c0 3 2 5 5 5h4v-8c0-1.5 1-2.5 2.5-2.5S39 77.5 39 79v8h7v-8c0-1.5 1-2.5 2.5-2.5S51 77.5 51 79v8h7v-8c0-1.5 1-2.5 2.5-2.5S63 77.5 63 79v8h4c3 0 5-2 5-5V71c8-6 13-15 13-27C85 22 73 6 50 6z"/>
  <circle fill="#0c0a0b" cx="35" cy="44" r="9"/>
  <circle fill="#0c0a0b" cx="65" cy="44" r="9"/>
  <path fill="#0c0a0b" d="M50 52l6 12H44z"/>
</svg>`;

// ---------- State ----------

let character = null;
let pendingSkill = null;
let rollLocked = false;
let pendingConfirmAction = null;
let attackMomentum = 0;
let forageRough = false;

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

function migrate(c) {
  if (!c.loadout || !INIT_ARMOR.hasOwnProperty(c.loadout.armor)) {
    c.loadout = { armor: "medium", weapon: "standard" };
  }
  if (!INIT_WEAPON.hasOwnProperty(c.loadout.weapon)) {
    c.loadout.weapon = "standard";
  }
  if (!Array.isArray(c.items)) c.items = [];
  if (typeof c.coins !== "number" || isNaN(c.coins)) c.coins = 0;
  // v17: expedition roles and skill ticks
  if (!Array.isArray(c.roles)) c.roles = [];
  if (!c.skillTicks || typeof c.skillTicks !== "object" || Array.isArray(c.skillTicks)) {
    c.skillTicks = {};
  }
  if (typeof c.supply !== "number" || isNaN(c.supply) || c.supply < 0) c.supply = 0;
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

function forageStepDown(die) {
  const i = FORAGE_DICE.indexOf(die);
  if (i <= 0) return FORAGE_DICE[0]; // floor at d4
  return FORAGE_DICE[i - 1];
}

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

function damageDieForWeapon() {
  return WEAPON_DAMAGE[character.loadout.weapon] || "d8";
}

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
    minus.textContent = "−";
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
    coins: 0,
    roles: [],
    skillTicks: {},
    supply: 0
  };
  save();
  renderSheet();
  hide($("screen-create"));
  showShell();
}

// ---------- Shell ----------

function renderSheet() {
  $("version-note").textContent = VERSION;
  $("sheet-name").textContent = character.name;
  $("sheet-class").textContent = character.cls;
  renderHP();
  renderSkillList();
  renderExpedition();
  renderInventory();
  $("inv-coins-in").value = character.coins > 0 ? character.coins : "";
  $("sheet-def").textContent = character.defense;
  renderInit();
  if (character.cls === "Sorcerer") {
    show($("btn-cast"));
  } else {
    hide($("btn-cast"));
  }
}

function switchTab(tab) {
  document.querySelectorAll(".tab-panel").forEach((p) => hide(p));
  show($("tab-" + tab));
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
}

function showShell() {
  switchTab("sheet");
  show($("screen-shell"));
}

// ---------- Intro screen ----------

function renderIntro() {
  $("intro-version-note").textContent = VERSION;
  if (character) {
    $("continue-sub").textContent = character.name + " · " + character.cls;
    show($("btn-continue"));
  } else {
    hide($("btn-continue"));
  }
  hide($("intro-import-section"));
}

// ---------- HP ----------

function renderHP() {
  const isLow = character.hpCur <= Math.floor(character.hpMax / 3);
  const isDead = character.hpCur <= 0;

  const cur = $("hp-current");
  if (cur) {
    cur.textContent = character.hpCur;
    cur.classList.toggle("low", isLow);
  }
  const maxnum = $("hp-maxnum");
  if (maxnum) maxnum.textContent = character.hpMax;

  const death = $("btn-death");
  if (death) { isDead ? show(death) : hide(death); }
}

function adjustHP(delta) {
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
  if (character.hpCur > character.hpMax) {
    character.hpCur = character.hpMax;
  }
  $("maxhp-value").textContent = character.hpMax;
  renderHP();
  save();
}

// ---------- Skill list ----------

function renderSkillList() {
  const list = $("skill-list");
  list.innerHTML = "";
  SKILLS.forEach((skill) => {
    const btn = document.createElement("button");
    btn.className = "skill-row";
    if (character.skillTicks[skill]) btn.classList.add("ticked");
    btn.setAttribute("aria-label", "Roll " + skill);

    const name = document.createElement("span");
    name.className = "skill-name";
    name.textContent = skill;

    const die = document.createElement("span");
    die.className = "skill-die";
    die.textContent = character.skills[skill];

    btn.appendChild(name);
    btn.appendChild(die);
    btn.addEventListener("click", () => openDifficulty(skill));
    list.appendChild(btn);
  });

  const anyTick = Object.keys(character.skillTicks).some((k) => character.skillTicks[k]);
  const clearBtn = $("btn-clear-ticks");
  if (clearBtn) { anyTick ? show(clearBtn) : hide(clearBtn); }
}

// ---------- Skill ticks ----------

function tickSkill(name) {
  if (!character.skillTicks[name]) {
    character.skillTicks[name] = true;
    renderSkillList();
    save();
  }
}

function openClearTicks() {
  show($("overlay-clear-ticks"));
}

function confirmClearTicks() {
  character.skillTicks = {};
  renderSkillList();
  save();
  hide($("overlay-clear-ticks"));
}

// ---------- Expedition section ----------

function renderExpedition() {
  $("supply-count").textContent = character.supply;
  document.querySelectorAll(".role-chip").forEach((btn) => {
    btn.classList.toggle("active", character.roles.indexOf(btn.dataset.role) !== -1);
  });
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
    del.textContent = "×";
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
  const safe = character.name
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "explorer";

  if (!navigator.share) {
    triggerDownload(new Blob([json], { type: "application/json" }), safe + ".json");
    return;
  }

  const file = new File([json], safe + ".tystnad.txt", { type: "text/plain" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: character.name })
      .catch((err) => {
        if (err.name === "AbortError") return;
        $("version-note").textContent = VERSION + " · " + err.name;
        openExportOverlay(json);
      });
    return;
  }

  openExportOverlay(json);
}

function openExportOverlay(json) {
  $("export-json").textContent = json;
  hide($("export-copied"));
  show($("overlay-export"));
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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseCharacterJSON(jsonString) {
  const data = JSON.parse(jsonString);
  if (
    !data || typeof data !== "object" ||
    typeof data.name !== "string" || !data.name ||
    typeof data.cls !== "string" || !CLASSES[data.cls] ||
    typeof data.skills !== "object" || !data.skills ||
    !(data.hpMax > 0) ||
    typeof data.hpCur !== "number" ||
    typeof data.defense !== "string"
  ) throw new Error("invalid");
  return migrate(data);
}

function applyImport(data) {
  character = data;
  save();
  renderSheet();
  hide($("screen-intro"));
  hide($("screen-create"));
  showShell();
}

function importCharacter(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = parseCharacterJSON(e.target.result);
      requireAbandon(() => applyImport(data));
    } catch (_) {
      show($("import-error"));
    }
  };
  reader.onerror = () => show($("import-error"));
  reader.readAsText(file);
}

function importFromPaste() {
  try {
    const data = parseCharacterJSON($("import-paste-in").value);
    requireAbandon(() => applyImport(data));
  } catch (_) {
    show($("import-error"));
  }
}

// ---------- Attack ----------

function openAttack() {
  attackMomentum = 0;
  $("attack-combat-die").textContent = character.skills["Combat"];
  $("attack-damage-die").textContent = damageDieForWeapon();
  document.querySelectorAll(".momentum-btn").forEach((b) => {
    b.classList.toggle("selected", parseInt(b.dataset.momentum, 10) === 0);
  });
  show($("overlay-attack"));
}

function rollExplosion(die) {
  const sides = dieSides(die);
  const chain = [];
  let cap = 0;
  let roll;
  do {
    roll = Math.floor(Math.random() * sides) + 1;
    chain.push(roll);
    cap++;
  } while (roll === sides && cap < 20);
  return chain;
}

function rollAttack(target) {
  const momentum = attackMomentum;
  hide($("overlay-attack"));
  const combatDie = character.skills["Combat"];
  const damageDie = damageDieForWeapon();
  performRollAttack(combatDie, damageDie, target, momentum);
}

function performRollAttack(combatDie, damageDie, target, momentum) {
  if (rollLocked) return;
  rollLocked = true;

  const sides = dieSides(combatDie);
  const result = Math.floor(Math.random() * sides) + 1;
  const success = result >= target;

  // Apply persistent effects immediately; animation is purely visual
  if (success) tickSkill("Combat");

  $("result-context").textContent = "Attack " + combatDie + " vs " + DIFFICULTY_NAMES[target];

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
      if (success) {
        const chain = rollExplosion(damageDie);
        const base = chain.reduce((a, b) => a + b, 0);
        const total = base + momentum;
        let html = '<div class="attack-result">';
        html += '<span class="damage-total">' + total + "</span>";
        if (chain.length > 1) {
          html += '<span class="damage-chain">' + chain.join(" + ") + "</span>";
        }
        if (momentum > 0) {
          html += '<span class="damage-momentum">+' + momentum + " Momentum</span>";
        }
        html += "</div>";
        verdictEl.innerHTML = html;
      } else {
        verdictEl.innerHTML = '<span class="verdict-skull">' + SKULL_SVG + "</span>";
      }
      rollLocked = false;
    }
  }, 60);
}

// ---------- Expedition effort rolls ----------

function openTravel() {
  $("travel-die-label").textContent = character.skills["Lore"];
  show($("overlay-travel"));
}

function rollTravel(target) {
  hide($("overlay-travel"));
  const die = character.skills["Lore"];
  performRoll(die, target,
    "Travel " + die + " vs " + TERRAIN_NAMES[target],
    { tickSkill: "Lore" });
}

function openExplore() {
  $("explore-die-label").textContent = character.skills["Awareness"];
  show($("overlay-explore"));
}

function rollExplore(target) {
  hide($("overlay-explore"));
  const die = character.skills["Awareness"];
  performRollExplore(die, target);
}

function performRollExplore(die, target) {
  if (rollLocked) return;
  rollLocked = true;

  const sides = dieSides(die);
  const result = Math.floor(Math.random() * sides) + 1;
  const success = result >= target;

  if (success) tickSkill("Awareness");

  $("result-context").textContent = "Explore " + die + " vs " + TERRAIN_NAMES[target];

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
      if (success) {
        const margin = result - target;
        verdictEl.innerHTML =
          '<span class="verdict-success">SUCCEEDED BY ' + margin + "</span>";
      } else {
        verdictEl.innerHTML = '<span class="verdict-skull">' + SKULL_SVG + "</span>";
      }
      rollLocked = false;
    }
  }, 60);
}

function openForage() {
  forageRough = false;
  $("forage-rough-btn").classList.remove("selected");
  $("forage-die-label").textContent = character.skills["Athletics"];
  show($("overlay-forage"));
}

function rollForage() {
  hide($("overlay-forage"));
  let die = character.skills["Athletics"];
  if (forageRough) die = forageStepDown(die);
  performRollForage(die);
}

function performRollForage(die) {
  if (rollLocked) return;
  rollLocked = true;

  const sides = dieSides(die);
  const result = Math.floor(Math.random() * sides) + 1;

  if (result >= 4) tickSkill("Athletics");

  const gained = result >= 6 ? 2 : result >= 4 ? 1 : 0;
  if (gained > 0) { character.supply += gained; save(); renderExpedition(); }

  $("result-context").textContent = "Forage " + die + (forageRough ? " (Rough)" : "");

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
      if (result >= 6) {
        verdictEl.innerHTML = '<span class="effort-result-label">+2 SUPPLY</span>';
      } else if (result >= 4) {
        verdictEl.innerHTML = '<span class="effort-result-label">+1 SUPPLY</span>';
      } else {
        verdictEl.innerHTML = '<span class="effort-result-label" style="color:var(--ash)">NOTHING FOUND</span>';
      }
      rollLocked = false;
    }
  }, 60);
}

function openCamp() {
  $("camp-die-label").textContent = character.skills["Awareness"];
  show($("overlay-camp"));
}

function rollCamp(target) {
  hide($("overlay-camp"));
  const die = character.skills["Awareness"];
  performRollCamp(die, target);
}

function performRollCamp(die, target) {
  if (rollLocked) return;
  rollLocked = true;

  const sides = dieSides(die);
  const result = Math.floor(Math.random() * sides) + 1;
  const success = result >= target;

  if (success) tickSkill("Awareness");

  $("result-context").textContent = "Camp " + die + " vs " + TERRAIN_NAMES[target];

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
      if (success) {
        const margin = result - target;
        if (margin >= 2) {
          verdictEl.innerHTML =
            '<div class="attack-result">' +
            '<span class="effort-result-label">DEFENSIBLE</span>' +
            '<span class="effort-result-margin">Succeeded by ' + margin + "</span>" +
            "</div>";
        } else {
          verdictEl.innerHTML = '<span class="effort-result-label">STABLE</span>';
        }
      } else {
        verdictEl.innerHTML = '<span class="effort-result-exposed">EXPOSED</span>';
      }
      rollLocked = false;
    }
  }, 60);
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

function castTier(tier) {
  const t = CAST_TIERS[tier];
  hide($("overlay-cast"));

  character.hpCur = Math.max(character.hpCur - t.cost, -99);
  renderHP();
  save();

  if (character.hpCur <= 0) {
    const die = deathDie(character.hpCur);
    performRoll(die, 5, "Tier " + tier + " · Death Roll " + die + " vs 5+",
      { death: true, casting: true });
  } else {
    const die = character.skills["Sorcery"];
    performRoll(die, t.target, "Tier " + tier + " · Sorcery " + die + " vs " + t.target + "+",
      { tickSkill: "Sorcery" });
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

/* Generic roll runner. opts:
   tickSkill: string -- ticks that skill on success.
   shortfall: bool -- on failure show FAILED BY X (Defense use).
   death: bool -- Death Roll mode with SURVIVES / DEATH display.
   casting: bool -- with death:true, shows "The spell takes effect" on survival. */
function performRoll(die, target, context, opts) {
  if (rollLocked) return;
  rollLocked = true;
  opts = opts || {};

  const sides = dieSides(die);
  const result = Math.floor(Math.random() * sides) + 1;
  const success = result >= target;

  // Apply persistent effects immediately; animation is purely visual
  if (success && opts.tickSkill) tickSkill(opts.tickSkill);

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
      if (success) {
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
  performRoll(die, target, skill + " " + die + " vs " + DIFFICULTY_NAMES[target],
    { tickSkill: skill });
}

function rollDefense(target) {
  const die = character.defense;
  hide($("overlay-defense"));
  performRoll(die, target, "Defense " + die + " vs " + THREAT_NAMES[target], { shortfall: true });
}

// ---------- Navigation helpers ----------

function requireAbandon(action) {
  if (!character) { action(); return; }
  pendingConfirmAction = action;
  show($("overlay-confirm"));
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

  // Import: file picker
  $("btn-import").addEventListener("click", () => {
    hide($("import-error"));
    $("import-file").click();
  });
  $("import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) importCharacter(file);
    e.target.value = "";
  });

  // Import: paste
  $("import-paste-btn").addEventListener("click", () => {
    hide($("import-error"));
    importFromPaste();
  });

  // Export overlay
  $("export-copy-btn").addEventListener("click", () => {
    navigator.clipboard.writeText($("export-json").textContent)
      .then(() => show($("export-copied")))
      .catch(() => show($("export-copied")));
  });
  $("export-close").addEventListener("click", () => hide($("overlay-export")));

  // HP strip (single, in shell)
  $("hp-minus").addEventListener("click", () => adjustHP(-1));
  $("hp-plus").addEventListener("click", () => adjustHP(1));
  $("hp-max-btn").addEventListener("click", openMaxHP);
  $("def-block").addEventListener("click", openDefense);

  // Intro navigation
  $("btn-continue").addEventListener("click", () => {
    renderSheet();
    hide($("screen-intro"));
    showShell();
  });
  $("btn-back").addEventListener("click", () => {
    renderIntro();
    hide($("screen-shell"));
    show($("screen-intro"));
  });
  $("btn-new-explorer").addEventListener("click", () => {
    requireAbandon(() => {
      character = null;
      localStorage.removeItem(STORAGE_KEY);
      initCreateScreen();
      hide($("screen-intro"));
      show($("screen-create"));
    });
  });
  $("btn-import-toggle").addEventListener("click", () => {
    const sec = $("intro-import-section");
    if (sec.classList.contains("hidden")) { show(sec); } else { hide(sec); }
  });

  // Tab bar
  document.querySelector(".tab-bar").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });

  // Confirm overlay (abandon)
  $("confirm-no").addEventListener("click", () => {
    pendingConfirmAction = null;
    hide($("overlay-confirm"));
  });
  $("confirm-yes").addEventListener("click", () => {
    hide($("overlay-confirm"));
    if (pendingConfirmAction) {
      const fn = pendingConfirmAction;
      pendingConfirmAction = null;
      fn();
    }
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

  // Defense die editing
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

  // Death Roll (single button in shell)
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

  // Expedition roles
  document.querySelectorAll(".role-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const role = btn.dataset.role;
      const idx = character.roles.indexOf(role);
      if (idx === -1) {
        character.roles.push(role);
      } else {
        character.roles.splice(idx, 1);
      }
      renderExpedition();
      save();
    });
  });

  // Supply steppers
  $("supply-minus").addEventListener("click", () => {
    if (character.supply > 0) { character.supply--; save(); renderExpedition(); }
  });
  $("supply-plus").addEventListener("click", () => {
    character.supply++;
    save();
    renderExpedition();
  });

  // Effort buttons
  $("btn-travel").addEventListener("click", openTravel);
  $("btn-explore").addEventListener("click", openExplore);
  $("btn-forage").addEventListener("click", openForage);
  $("btn-camp").addEventListener("click", openCamp);

  // Travel overlay
  document.querySelectorAll(".travel-diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => rollTravel(parseInt(btn.dataset.target, 10)));
  });
  $("travel-cancel").addEventListener("click", () => hide($("overlay-travel")));

  // Explore overlay
  document.querySelectorAll(".explore-diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => rollExplore(parseInt(btn.dataset.target, 10)));
  });
  $("explore-cancel").addEventListener("click", () => hide($("overlay-explore")));

  // Forage overlay
  $("forage-rough-btn").addEventListener("click", () => {
    forageRough = !forageRough;
    $("forage-rough-btn").classList.toggle("selected", forageRough);
    const base = character.skills["Athletics"];
    $("forage-die-label").textContent = forageRough ? forageStepDown(base) : base;
  });
  $("forage-roll-btn").addEventListener("click", rollForage);
  $("forage-cancel").addEventListener("click", () => hide($("overlay-forage")));

  // Camp overlay
  document.querySelectorAll(".camp-diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => rollCamp(parseInt(btn.dataset.target, 10)));
  });
  $("camp-cancel").addEventListener("click", () => hide($("overlay-camp")));

  // Clear ticks
  $("btn-clear-ticks").addEventListener("click", openClearTicks);
  $("clear-ticks-yes").addEventListener("click", confirmClearTicks);
  $("clear-ticks-no").addEventListener("click", () => hide($("overlay-clear-ticks")));

  // Attack overlay
  $("btn-attack").addEventListener("click", openAttack);
  document.querySelectorAll(".momentum-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      attackMomentum = parseInt(btn.dataset.momentum, 10);
      document.querySelectorAll(".momentum-btn").forEach((b) => {
        b.classList.toggle("selected", b === btn);
      });
    });
  });
  document.querySelectorAll("#attack-diff-buttons .diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => rollAttack(parseInt(btn.dataset.target, 10)));
  });
  $("attack-cancel").addEventListener("click", () => hide($("overlay-attack")));

  // Cast Spell
  $("btn-cast").addEventListener("click", openCast);
  document.querySelectorAll("#overlay-cast .diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => castTier(parseInt(btn.dataset.tier, 10)));
  });
  $("cast-cancel").addEventListener("click", () => hide($("overlay-cast")));

  // Result overlay: dismiss on tap
  $("overlay-result").addEventListener("click", () => {
    if (rollLocked) return;
    hide($("overlay-result"));
    $("overlay-result").classList.remove("death-flood");
  });

  // Boot
  character = load();
  renderIntro();
  show($("screen-intro"));

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((e) => {
      console.error("Service worker registration failed:", e);
    });
  }
});
