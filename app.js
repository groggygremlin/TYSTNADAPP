/* ============================================================
   TYSTNAD Companion - v18
   Canon: Players Booklet v2.5
   ============================================================ */

const VERSION = "v53";

// ---------- Canon data (Players Booklet v2.5) ----------

const SKILLS = [
  "Athletics", "Awareness", "Combat", "Finesse",
  "Ingenuity", "Lore", "Presence", "Sorcery"
];

const DICE = ["d6", "d8", "d10", "d12", "d20"];

// Extended ladder for Forage Rough die step-down; d4 is the floor (PB v2.5 Hexploration)
const FORAGE_DICE = ["d4", "d6", "d8", "d10", "d12", "d20"];

const CLASSES = {
  Warrior:  { hp: 12, defense: "d8", core: "Combat",  d8: ["Combat", "Athletics", "Presence"],  loadout: { armor: "medium", weapon: "standard" } },
  Rogue:    { hp: 11, defense: "d8", core: "Finesse", d8: ["Finesse", "Awareness", "Athletics"], loadout: { armor: "light",  weapon: "light"    } },
  Scholar:  { hp: 10, defense: "d6", core: "Lore",    d8: ["Lore", "Combat", "Ingenuity"],       loadout: { armor: "medium", weapon: "standard" } },
  Sorcerer: { hp: 9,  defense: "d6", core: "Sorcery", d8: ["Sorcery", "Presence", "Lore"],       loadout: { armor: "none",   weapon: "light"    } }
};


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

const SPELLS = [
  { id: "soul-spark",         tier: 1, name: "Soul Spark",         desc: "A creature you can see within 30 feet takes 1d6 damage. At Sorcerer level 3 and beyond, this increases to 1d8." },
  { id: "calm-heart",         tier: 1, name: "Calm Heart",         desc: "A creature you touch is immediately freed from fear or panic." },
  { id: "detect-corruption",  tier: 1, name: "Detect Corruption",  desc: "You sense undead, curses, or active spell effects within 60 feet for one minute." },
  { id: "frost-grip",         tier: 1, name: "Frost Grip",         desc: "A creature you can see within 30 feet cannot move on his next turn." },
  { id: "iron-skin",          tier: 1, name: "Iron Skin",          desc: "Until the start of your next turn, increase your Defense die by one step, maximum d12." },
  { id: "repelling-blast",    tier: 1, name: "Repelling Blast",    desc: "A creature you can see within 30 feet takes 2 damage and is pushed 10 feet away from you." },
  { id: "sanctify-food",      tier: 1, name: "Sanctify Food",      desc: "Spoiled food or tainted water you touch becomes safe to consume." },
  { id: "shielding-word",     tier: 1, name: "Shielding Word",     desc: "A creature you can see within 30 feet increases his Defense die by one step until the end of his next turn." },
  { id: "silence-step",       tier: 1, name: "Silence Step",       desc: "You make no sound while moving for one minute." },
  { id: "witchlight",         tier: 1, name: "Witchlight",         desc: "An object you touch sheds bright light in a 20-foot radius for one hour." },
  { id: "arcane-shell",       tier: 2, name: "Arcane Shell",       desc: "Until the start of your next turn, the first attack that hits you deals no damage." },
  { id: "blessed-strike",     tier: 2, name: "Blessed Strike",     desc: "A creature you touch treats his next attack as one difficulty tier easier." },
  { id: "consecrated-ground", tier: 2, name: "Consecrated Ground", desc: "Undead within a 20-foot radius centered on a point you can see treat their Threat as one tier lower for one minute." },
  { id: "flame-wave",         tier: 2, name: "Flame Wave",         desc: "Creatures in a 15-foot line before you take 1d8 damage." },
  { id: "hold-person",        tier: 2, name: "Hold Person",        desc: "A humanoid you can see within 40 feet must pass a Mind save at Normal (5+) or cannot act on his next turn. On a success, he is Shocked until the end of his next turn instead." },
  { id: "mind-lance",         tier: 2, name: "Mind Lance",         desc: "A creature you can see within 40 feet takes 1d10 damage and treats his next action as one difficulty tier harder." },
  { id: "mist-shroud",        tier: 2, name: "Mist Shroud",        desc: "A 30-foot radius centered on you becomes heavily obscured for ten minutes." },
  { id: "stone-passage",      tier: 2, name: "Stone Passage",      desc: "You open a 5-foot-wide gap in stone within 10 feet that remains for one minute." },
  { id: "windborne-leap",     tier: 2, name: "Windborne Leap",     desc: "You fly at your normal movement speed for one minute." },
  { id: "zone-of-truth",      tier: 2, name: "Zone of Truth",      desc: "Creatures within a 15-foot radius centered on a point you can see cannot knowingly speak lies for one minute." },
  { id: "aegis-field",        tier: 3, name: "Aegis Field",        desc: "You and all allies within 20 feet make all Defense rolls at Easy for three rounds." },
  { id: "crushing-weight",    tier: 3, name: "Crushing Weight",    desc: "A creature you can see within 40 feet takes 1d10 damage, falls prone, and cannot stand on his next turn." },
  { id: "death-mark",         tier: 3, name: "Death Mark",         desc: "A creature you can see within 50 feet takes 2d10 damage." },
  { id: "dimensional-step",   tier: 3, name: "Dimensional Step",   desc: "You instantly appear at any unoccupied location you can see within 50 feet." },
  { id: "fireburst",          tier: 3, name: "Fireburst",          desc: "All creatures within a 20-foot radius centered on a point you can see take 2d6 damage." },
  { id: "mass-dread",         tier: 3, name: "Mass Dread",         desc: "All hostile creatures within 30 feet who can see you must move away from you on their next turn by the safest available path." },
  { id: "spell-break",        tier: 3, name: "Spell Break",        desc: "One active spell effect you can see within 50 feet immediately ends." },
  { id: "veil-of-shadows",    tier: 3, name: "Veil of Shadows",    desc: "You and up to three allies within 15 feet become invisible until you move, attack, or cast a spell." },
  { id: "wall-of-stone",      tier: 3, name: "Wall of Stone",      desc: "A solid stone wall 20 feet long and 10 feet high rises from the ground within 30 feet and remains until destroyed." },
  { id: "wracking-curse",     tier: 3, name: "Wracking Curse",     desc: "A creature you can see within 50 feet takes 1d8 damage at the start of each of his turns for three turns. The effect ends early if the curse is broken." }
];

const CONDITIONS = [
  { id: "weary",         name: "Weary",
    desc: "All checks are one step harder. Easy becomes Normal. Normal becomes Hard. Hard stays Hard." },
  { id: "poisoned",      name: "Poisoned",
    desc: "1 damage per turn. Body save at end of each turn (difficulty set by source) to end the condition." },
  { id: "lethal-poison", name: "Lethal Poison",
    desc: "2 damage per turn. Body save at end of each turn (difficulty set by source) to end the condition." },
  { id: "diseased",      name: "Diseased",
    desc: "1 damage at the start of each day. Body save Hard (6+) once per day to end the condition." },
  { id: "frightened",    name: "Frightened",
    desc: "On your turn: move only. No attacks, spells, or skills. Defense is unaffected. Spirit save at end of each turn (difficulty set by source) to end the condition." },
  { id: "prone",         name: "Prone",
    desc: "Melee attacks Hard (6+). Defense vs melee Hard (6+). Defense vs ranged Easy (4+). Movement halved. Target prone: your melee Easy (4+), your ranged Hard (6+). Standing up costs a Quick Action." },
  { id: "shocked",       name: "Shocked",
    desc: "Only one Main Action per turn. Quick Action proceeds normally. Duration: as specified by source. Default: until end of your next turn." },
  { id: "burning",       name: "Burning",
    desc: "1d6 damage per turn. Body save Normal (5+) at end of each turn, or use a Full Action to extinguish. Either ends the condition." },
  { id: "immolation",    name: "Immolation",
    desc: "Engulfment in fire. 3d6 damage per turn. Body save Hard (6+) at end of each turn, or use a Full Action to extinguish. Either ends the condition." },
  { id: "blinded",       name: "Blinded",
    desc: "All your attacks Hard (6+). All your Defense rolls Hard (6+). Target blinded: your attacks Easy (4+), your Defense rolls Easy (4+). Both sides blinded: effects cancel." }
];

const STORAGE_KEY = "tystnad-character";

// ---------- Table Link (CAP-07) ----------
// Single backend base (production). Dev/testing: swap to "https://staging.playtystnad.com".
const BACKEND_BASE = "https://playtystnad.com";
const TABLELINK_KEY = "tystnad-tablelink"; // stores ONLY the device token (the sole secret)

const SKULL_IMG       = '<img class="verdict-skull" src="skull.webp" alt="Failure">';
const SKULL_IMG_DEATH = '<img class="verdict-skull verdict-skull--death" src="skull.webp" alt="Death">';

const SUCCESS_TEXTS = [
  "STRUCK TRUE", "IT LANDS", "A TELLING BLOW", "CLEAN AND TRUE",
  "THE FRONTIER YIELDS", "WORTHY OF THE TALE", "IT FINDS ITS MARK",
  "THE MARK IS MET", "YOUR WILL PREVAILS", "THE MOMENT IS YOURS",
  "NOTHING WASTED", "SWIFT AND SURE", "THE DARK GIVES GROUND",
  "THE DARK RECOILS", "NO HESITATION", "DONE, AND DONE WELL",
  "THE FRONTIER TAKES NOTE", "THE FRONTIER REMEMBERS", "YOUR AIM HOLDS",
  "YOUR HAND IS STEADY", "IT STRIKES HOME", "THE DEED IS DONE",
  "SHARP AND CERTAIN", "TRUE TO THE LAST", "MADE TO COUNT",
  "THE EFFORT HOLDS", "STRENGTH ANSWERS", "POWER ANSWERS",
  "THE OLD WAYS HOLD", "CARVED INTO THE TALE"
];

function randSuccessText() {
  return SUCCESS_TEXTS[Math.floor(Math.random() * SUCCESS_TEXTS.length)];
}

// ---------- State ----------

let character = null;
let pendingSkill = null;
let pendingSpellTier = null;
let rollLocked = false;
let pendingConfirmAction = null;
let attackMomentum = 0;
let defenseBonus = 0;
let pendingDefenseDamage = 0;
let forageRough = false;
let explosionState = null;
let hitState = null;

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
  if (!Number.isInteger(c.level) || c.level < 1 || c.level > 20) c.level = 1;
  if (!c.conditions || typeof c.conditions !== "object" || Array.isArray(c.conditions)) c.conditions = {};
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
    loadout: Object.assign({}, CLASSES[createState.cls].loadout),
    items: [],
    coins: 0,
    roles: [],
    skillTicks: {},
    supply: 0,
    level: 1,
    conditions: {}
  };
  save();
  renderSheet();
  hide($("screen-create"));
  showShell();
}

// ---------- Shell ----------

function fitName() {
  const el = $("sheet-name");
  el.style.fontSize = "";
  const container = el.parentElement;
  if (!container) return;
  const floor = 14;
  let size = 24;
  while (el.scrollWidth > container.clientWidth && size > floor) {
    size -= 0.5;
    el.style.fontSize = size + "px";
  }
}

function renderSheet() {
  $("sheet-name").textContent = character.name;
  fitName();
  $("sheet-class").textContent = character.cls;
  renderHP();
  renderSkillList();
  renderExpedition();
  renderInventory();
  $("inv-coins-in").value = character.coins > 0 ? character.coins : "";
  renderInit();
  const isSorcerer = character.cls === "Sorcerer";
  const sorceryTabBtn = document.querySelector(".sorcery-tab");
  if (sorceryTabBtn) isSorcerer ? show(sorceryTabBtn) : hide(sorceryTabBtn);
renderConditions();
}

function switchTab(tab) {
  document.querySelectorAll(".tab-panel").forEach((p) => hide(p));
  show($("tab-" + tab));
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  if (tab === "sorcery") renderSorceryTab();
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
  const hp = character.hpCur;
  const isDead = hp <= 0;

  const cur = $("hp-current");
  if (cur) {
    cur.textContent = hp;
    cur.classList.remove("hp-t3", "hp-t2", "hp-t1");
    if (hp <= 1) cur.classList.add("hp-t1");
    else if (hp === 2) cur.classList.add("hp-t2");
    else if (hp === 3) cur.classList.add("hp-t3");
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
    if (skill === CLASSES[character.cls].core) die.classList.add("core");
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

// ---------- Conditions ----------

function wearyShift(target) {
  return (character.conditions && character.conditions["weary"]) ? Math.min(target + 1, 6) : target;
}

function refreshWearyOverlay(overlayId) {
  const overlay = $(overlayId);
  const wearyOn = !!(character.conditions && character.conditions["weary"]);
  overlay.querySelectorAll(".diff-btn").forEach((btn) => {
    const base = parseInt(btn.dataset.target, 10);
    btn.querySelector("span").textContent = (wearyOn ? Math.min(base + 1, 6) : base) + "+";
  });
  const note = overlay.querySelector(".weary-note");
  if (note) { wearyOn ? show(note) : hide(note); }
}

function renderConditionStrip() {
  const strip = $("condition-strip");
  const active = CONDITIONS.filter((c) => character.conditions[c.id]);
  if (active.length > 0) {
    strip.textContent = active.map((c) => c.name).join(", ");
    show(strip);
  } else {
    strip.textContent = "";
    hide(strip);
  }
}

function renderConditions() {
  const grid = $("condition-chips");
  grid.innerHTML = "";
  CONDITIONS.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "cond-chip" + (character.conditions[c.id] ? " cond-chip--active" : "");
    btn.dataset.condId = c.id;
    btn.textContent = c.name;
    grid.appendChild(btn);
  });

  const list = $("condition-effects");
  list.innerHTML = "";
  const active = CONDITIONS.filter((c) => character.conditions[c.id]);
  if (active.length > 0) {
    active.forEach((c) => {
      const p = document.createElement("p");
      p.className = "cond-effect";
      const strong = document.createElement("strong");
      strong.textContent = c.name + ": ";
      p.appendChild(strong);
      p.appendChild(document.createTextNode(c.desc));
      list.appendChild(p);
    });
    show(list);
  } else {
    hide(list);
  }

  renderConditionStrip();
}

function toggleCondition(id) {
  character.conditions[id] = !character.conditions[id];
  save();
  renderConditions();
}

// ---------- Expedition section ----------

function renderExpedition() {
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
  $("supply-count").textContent = character.supply;
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
        show($("version-note"));
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
  let data;
  try { data = JSON.parse(jsonString); } catch (_) { throw new Error("invalid"); }
  if (!data || typeof data !== "object") throw new Error("invalid");
  // Validate before migrate for fields migrate would otherwise silently coerce
  if (data.level !== undefined &&
      (!Number.isInteger(data.level) || data.level < 1 || data.level > 20)) {
    throw new Error("invalid");
  }
  if (data.items !== undefined && !Array.isArray(data.items)) throw new Error("invalid");
  migrate(data);
  if (typeof data.name !== "string" || !data.name.trim()) throw new Error("invalid");
  if (!CLASSES[data.cls]) throw new Error("invalid");
  if (!data.skills || typeof data.skills !== "object") throw new Error("invalid");
  for (const s of SKILLS) {
    if (!DICE.includes(data.skills[s])) throw new Error("invalid");
  }
  if (!["d6", "d8", "d10", "d12"].includes(data.defense)) throw new Error("invalid");
  if (!Number.isInteger(data.hpMax) || data.hpMax < 1 || data.hpMax > 99) throw new Error("invalid");
  if (!Number.isInteger(data.hpCur) || data.hpCur < -99 || data.hpCur > data.hpMax) throw new Error("invalid");
  if (!Number.isInteger(data.level) || data.level < 1 || data.level > 20) throw new Error("invalid");
  if (!Number.isInteger(data.supply) || data.supply < 0) throw new Error("invalid");
  if (!Number.isInteger(data.coins) || data.coins < 0) throw new Error("invalid");
  if (!Array.isArray(data.items)) throw new Error("invalid");
  for (const item of data.items) {
    if (!item || typeof item !== "object" || typeof item.name !== "string" ||
        typeof item.lp !== "number" || item.lp < 0) throw new Error("invalid");
  }
  if (!data.conditions || typeof data.conditions !== "object" || Array.isArray(data.conditions)) throw new Error("invalid");
  const condIds = CONDITIONS.map(c => c.id);
  for (const k of Object.keys(data.conditions)) {
    if (!condIds.includes(k) || typeof data.conditions[k] !== "boolean") throw new Error("invalid");
  }
  if (!Array.isArray(data.roles)) throw new Error("invalid");
  for (const r of data.roles) {
    if (!EXPEDITION_ROLES.includes(r)) throw new Error("invalid");
  }
  if (!data.skillTicks || typeof data.skillTicks !== "object" || Array.isArray(data.skillTicks)) throw new Error("invalid");
  for (const k of Object.keys(data.skillTicks)) {
    if (!SKILLS.includes(k)) throw new Error("invalid");
  }
  return data;
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
  document.querySelectorAll(".momentum-btn").forEach((b) => {
    b.classList.toggle("selected", parseInt(b.dataset.momentum, 10) === 0);
  });
  refreshWearyOverlay("overlay-attack");
  show($("overlay-attack"));
}


function rollAttack(target) {
  const momentum = attackMomentum;
  const effective = wearyShift(target);
  hide($("overlay-attack"));
  const combatDie = character.skills["Combat"];
  const damageDie = damageDieForWeapon();
  performRollAttack(combatDie, damageDie, effective, momentum,
    effective !== target ? " (Weary)" : "");
}

function runFlicker(numEl, sides, onDone) {
  numEl.classList.add("rolling");
  let ticks = 0;
  const flicker = setInterval(() => {
    numEl.textContent = Math.floor(Math.random() * sides) + 1;
    ticks++;
    if (ticks >= 8) {
      clearInterval(flicker);
      numEl.classList.remove("rolling");
      onDone();
    }
  }, 60);
}

function performRollAttack(combatDie, damageDie, target, momentum, wearyNote) {
  if (rollLocked) return;
  rollLocked = true;

  const sides = dieSides(combatDie);
  const result = Math.floor(Math.random() * sides) + 1;
  const success = result >= target;

  if (success) tickSkill("Combat");

  const overlay = $("overlay-result");
  const numEl = $("result-number");
  const verdictEl = $("result-verdict");
  const ctxEl = $("result-context");
  ctxEl.classList.add("hidden");
  ctxEl.textContent = "";
  verdictEl.innerHTML = "";
  overlay.classList.remove("death-flood", "overlay--action", "overlay--act3");
  numEl.classList.remove("hidden");
  show(overlay);

  runFlicker(numEl, sides, () => {
    numEl.classList.add("hidden");
    numEl.textContent = "";
    if (success) {
      const dmgSides = dieSides(damageDie);
      hitState = { sides: dmgSides, momentum };
      overlay.classList.add("overlay--action");
      verdictEl.innerHTML =
        '<div class="attack-result">' +
        '<span class="strike-hit">HIT</span>' +
        '<button class="roll-damage-btn" onclick="startDamageRoll()">ROLL DAMAGE</button>' +
        "</div>";
      document.querySelector(".result-dismiss").classList.add("hidden");
      rollLocked = false;
    } else {
      verdictEl.innerHTML = SKULL_IMG;
      if (navigator.vibrate) navigator.vibrate(40);
      rollLocked = false;
    }
  });
}

function startDamageRoll() {
  if (!hitState) return;
  const { sides, momentum } = hitState;
  hitState = null;
  rollLocked = true;

  const overlay = $("overlay-result");
  const numEl = $("result-number");
  const verdictEl = $("result-verdict");
  overlay.classList.remove("overlay--action");
  verdictEl.innerHTML = "";
  numEl.classList.remove("hidden");

  runFlicker(numEl, sides, () => {
    const roll = Math.floor(Math.random() * sides) + 1;
    numEl.textContent = roll;
    explosionState = { sides, momentum, chain: [roll] };
    if (roll === sides && explosionState.chain.length < 20) {
      showExplosionWait(verdictEl);
    } else {
      finalizeExplosionChain(verdictEl);
    }
  });
}

function showExplosionWait(verdictEl) {
  const chain = explosionState.chain;
  const chainLabel = chain.join(" + ");
  let html = '<div class="attack-result">';
  html += '<span class="damage-chain">' + chainLabel + "</span>";
  html += '<span class="damage-explodes">EXPLODES</span>';
  html += '<button class="roll-again-btn" onclick="continueExplosionChain()">ROLL AGAIN</button>';
  html += "</div>";
  verdictEl.innerHTML = html;
  $("overlay-result").classList.add("overlay--action");
  document.querySelector(".result-dismiss").classList.add("hidden");
  if (navigator.vibrate) navigator.vibrate(30);
}

function continueExplosionChain() {
  if (!explosionState) return;
  const { sides } = explosionState;
  const numEl = $("result-number");
  const verdictEl = $("result-verdict");
  $("overlay-result").classList.remove("overlay--action");
  verdictEl.innerHTML = "";
  runFlicker(numEl, sides, () => {
    const roll = Math.floor(Math.random() * sides) + 1;
    numEl.textContent = roll;
    explosionState.chain.push(roll);
    if (roll === sides && explosionState.chain.length < 20) {
      showExplosionWait(verdictEl);
    } else {
      finalizeExplosionChain(verdictEl);
    }
  });
}

function finalizeExplosionChain(verdictEl) {
  const overlay = $("overlay-result");
  const numEl = $("result-number");
  numEl.classList.add("hidden");
  numEl.textContent = "";
  overlay.classList.remove("overlay--action");
  overlay.classList.add("overlay--act3");
  const { chain, momentum } = explosionState;
  const total = chain.reduce((a, b) => a + b, 0) + momentum;
  verdictEl.innerHTML =
    '<div class="prompt-card">' +
    '<span class="prompt-success-text">' + randSuccessText() + "</span>" +
    '<span class="prompt-total">' + total + "</span>" +
    '<span class="prompt-damage-label">DAMAGE</span>' +
    "</div>";
  document.querySelector(".result-dismiss").classList.remove("hidden");
  explosionState = null;
  rollLocked = false;
}

// ---------- Expedition effort rolls ----------

function openTravel() {
  $("travel-die-label").textContent = character.skills["Lore"];
  refreshWearyOverlay("overlay-travel");
  show($("overlay-travel"));
}

function rollTravel(target) {
  const effective = wearyShift(target);
  hide($("overlay-travel"));
  const die = character.skills["Lore"];
  performRoll(die, effective,
    "Travel " + die + " vs " + effective + "+" + (effective !== target ? " (Weary)" : ""),
    { tickSkill: "Lore" });
}

function openExplore() {
  $("explore-die-label").textContent = character.skills["Awareness"];
  refreshWearyOverlay("overlay-explore");
  show($("overlay-explore"));
}

function rollExplore(target) {
  const effective = wearyShift(target);
  hide($("overlay-explore"));
  const die = character.skills["Awareness"];
  performRollExplore(die, effective, effective !== target);
}

function performRollExplore(die, target, wearyActive) {
  if (rollLocked) return;
  rollLocked = true;

  const sides = dieSides(die);
  const result = Math.floor(Math.random() * sides) + 1;
  const success = result >= target;

  if (success) tickSkill("Awareness");

  $("result-context").textContent = "Explore " + die + " vs " + target + "+" + (wearyActive ? " (Weary)" : "");

  const overlay = $("overlay-result");
  const numEl = $("result-number");
  const verdictEl = $("result-verdict");
  verdictEl.innerHTML = "";
  overlay.classList.remove("death-flood");
  show(overlay);

  runFlicker(numEl, sides, () => {
    numEl.textContent = result;
    if (success) {
      const margin = result - target;
      verdictEl.innerHTML =
        '<span class="verdict-success">SUCCEEDED BY ' + margin + "</span>";
    } else {
      verdictEl.innerHTML = SKULL_IMG;
      if (navigator.vibrate) navigator.vibrate(40);
    }
    rollLocked = false;
  });
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
  if (gained > 0) { character.supply += gained; save(); renderInventory(); }

  $("result-context").textContent = "Forage " + die + (forageRough ? " (Rough)" : "");

  const overlay = $("overlay-result");
  const numEl = $("result-number");
  const verdictEl = $("result-verdict");
  verdictEl.innerHTML = "";
  overlay.classList.remove("death-flood");
  show(overlay);

  runFlicker(numEl, sides, () => {
    numEl.textContent = result;
    if (result >= 6) {
      verdictEl.innerHTML = '<span class="effort-result-label">+2 SUPPLY</span>';
    } else if (result >= 4) {
      verdictEl.innerHTML = '<span class="effort-result-label">+1 SUPPLY</span>';
    } else {
      verdictEl.innerHTML = SKULL_IMG;
      if (navigator.vibrate) navigator.vibrate(40);
    }
    rollLocked = false;
  });
}

function openCamp() {
  $("camp-die-label").textContent = character.skills["Awareness"];
  refreshWearyOverlay("overlay-camp");
  show($("overlay-camp"));
}

function rollCamp(target) {
  const effective = wearyShift(target);
  hide($("overlay-camp"));
  const die = character.skills["Awareness"];
  performRollCamp(die, effective, effective !== target);
}

function performRollCamp(die, target, wearyActive) {
  if (rollLocked) return;
  rollLocked = true;

  const sides = dieSides(die);
  const result = Math.floor(Math.random() * sides) + 1;
  const success = result >= target;

  if (success) tickSkill("Awareness");

  $("result-context").textContent = "Camp " + die + " vs " + target + "+" + (wearyActive ? " (Weary)" : "");

  const overlay = $("overlay-result");
  const numEl = $("result-number");
  const verdictEl = $("result-verdict");
  verdictEl.innerHTML = "";
  overlay.classList.remove("death-flood");
  show(overlay);

  runFlicker(numEl, sides, () => {
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
      verdictEl.innerHTML =
        '<div class="verdict-fail">' + SKULL_IMG +
        '<span class="fail-by">EXPOSED</span></div>';
      if (navigator.vibrate) navigator.vibrate(40);
    }
    rollLocked = false;
  });
}

// ---------- Cast Spell ----------

function castTier(tier) {
  const t = CAST_TIERS[tier];
  const effectiveTarget = wearyShift(t.target);

  character.hpCur = Math.max(character.hpCur - t.cost, -99);
  renderHP();
  save();

  if (character.hpCur <= 0) {
    const die = deathDie(character.hpCur);
    // Death Roll target is always 5 — Weary does not apply per canon
    performRoll(die, 5, "Tier " + tier + " · Death Roll " + die + " vs 5+",
      { death: true, casting: true });
  } else {
    const die = character.skills["Sorcery"];
    const wearyNote = effectiveTarget !== t.target ? " (Weary)" : "";
    performRoll(die, effectiveTarget,
      "Tier " + tier + " · Sorcery " + die + " vs " + effectiveTarget + "+" + wearyNote,
      { tickSkill: "Sorcery", cast: true });
  }
}

// ---------- Sorcery tab ----------

function adjustLevel(delta) {
  character.level = Math.min(Math.max(character.level + delta, 1), 20);
  renderSorceryTab();
  save();
}

function renderSorceryTab() {
  $("level-value").textContent = character.level;
  const list = $("spell-list-sorcery");
  list.innerHTML = "";
  const unlockLevel = { 1: 1, 2: 3, 3: 6 };
  [1, 2, 3].forEach((tier) => {
    const locked = character.level < unlockLevel[tier];
    const t = CAST_TIERS[tier];
    const hdr = document.createElement("p");
    hdr.className = "spell-tier-header";
    const tierName = document.createElement("span");
    tierName.className = "tier-name";
    tierName.textContent = "Tier " + tier;
    const tierMech = document.createElement("span");
    tierMech.className = "tier-mech";
    tierMech.textContent = locked
      ? " · Unlocks at Level " + unlockLevel[tier]
      : " · " + t.cost + " HP · " + t.target + "+";
    hdr.appendChild(tierName);
    hdr.appendChild(tierMech);
    list.appendChild(hdr);
    SPELLS.filter((s) => s.tier === tier).forEach((spell) => {
      const btn = document.createElement("button");
      btn.className = "spell-row" + (locked ? " spell-locked" : "");
      btn.dataset.spellId = spell.id;
      btn.disabled = locked;
      btn.textContent = spell.name;
      list.appendChild(btn);
    });
  });
}

function openSpell(spell) {
  $("spell-name-display").firstChild.textContent = spell.name + " ";
  $("spell-tier-badge").textContent = "Tier " + spell.tier;
  const t = CAST_TIERS[spell.tier];
  const effective = wearyShift(t.target);
  $("spell-cost-display").textContent = t.cost + " HP · " + effective + "+" +
    (effective !== t.target ? " (Weary)" : "") + " · Sorcery " + character.skills["Sorcery"];
  $("spell-desc-display").textContent = spell.desc;
  const warn = $("spell-cast-warning");
  const state = lpState(totalLP());
  if (state === "heavy") {
    warn.textContent = "Heavy: casting is not allowed.";
    show(warn);
  } else if (state === "overloaded") {
    warn.textContent = "Overloaded: casting is not allowed.";
    show(warn);
  } else {
    hide(warn);
  }
  pendingSpellTier = spell.tier;
  show($("overlay-spell"));
}

function castSpell() {
  hide($("overlay-spell"));
  castTier(pendingSpellTier);
}

// ---------- Rolling ----------

function openDifficulty(skill) {
  pendingSkill = skill;
  $("diff-skill-name").firstChild.textContent = skill + " ";
  $("diff-skill-die").textContent = character.skills[skill];
  refreshWearyOverlay("overlay-difficulty");
  show($("overlay-difficulty"));
}

function effectiveDefense() {
  const steps = { none: 0, light: 0, medium: 1, heavy: 2 }[character.loadout.armor] || 0;
  let die = character.defense;
  for (let i = 0; i < steps; i++) die = stepDie(die, 1);
  if (DICE.indexOf(die) > DICE.indexOf("d12")) die = "d12";
  return die;
}

function renderDefenseNote() {
  const armor = character.loadout.armor;
  const base = character.defense;
  let text;
  if (armor === "none") {
    text = "BASE " + base + " · NO ARMOR · +2 DAMAGE ON FAIL";
  } else if (armor === "light") {
    text = "BASE " + base + " · LIGHT ARMOR";
  } else if (armor === "medium") {
    text = "BASE " + base + " · MEDIUM ARMOR +1 STEP";
  } else {
    text = "BASE " + base + " · HEAVY ARMOR +2 STEPS";
  }
  $("def-armor-note").textContent = text;
}

function openDefense() {
  defenseBonus = 0;
  document.querySelectorAll(".bonus-btn").forEach((b) => {
    b.classList.toggle("selected", parseInt(b.dataset.bonus, 10) === 0);
  });
  $("def-edit-value").textContent = effectiveDefense();
  renderDefenseNote();
  refreshWearyOverlay("overlay-defense");
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
  show(overlay);

  runFlicker(numEl, sides, () => {
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
        notes += '<span class="survive-note">Further damage kills outright</span>';
        notes += '<button class="roll-damage-btn wake-btn" onclick="wakeAtOneHP(event)">WAKE AT 1 HP</button>';
        verdictEl.innerHTML =
          '<div class="verdict-fail"><span class="verdict-success">SURVIVES</span>' +
          notes + "</div>";
      } else if (opts.cast) {
        verdictEl.innerHTML =
          '<div class="verdict-fail"><span class="verdict-success">SUCCESS</span>' +
          '<span class="success-text">' + randSuccessText() + "</span></div>";
      } else {
        verdictEl.innerHTML = '<span class="verdict-success">SUCCESS</span>';
      }
    } else if (opts.death) {
      overlay.classList.add("death-flood");
      verdictEl.innerHTML =
        '<div class="verdict-fail">' + SKULL_IMG_DEATH +
        '<span class="verdict-death">DEATH</span></div>';
      if (navigator.vibrate) navigator.vibrate([80, 60, 160]);
    } else if (opts.shortfall) {
      verdictEl.innerHTML =
        '<div class="verdict-fail">' + SKULL_IMG +
        '<span class="fail-by">Failed by ' + (target - result) + '</span></div>';
      if (navigator.vibrate) navigator.vibrate(40);
    } else {
      verdictEl.innerHTML = SKULL_IMG;
      if (navigator.vibrate) navigator.vibrate(40);
    }
    rollLocked = false;
  });
}

function rollSkill(target) {
  const skill = pendingSkill;
  const die = character.skills[skill];
  const effective = wearyShift(target);
  hide($("overlay-difficulty"));
  performRoll(die, effective,
    skill + " " + die + " vs " + effective + "+" + (effective !== target ? " (Weary)" : ""),
    { tickSkill: skill });
}

function rollDefense(target) {
  const effective = wearyShift(target);
  hide($("overlay-defense"));
  performRollDefense(effective);
}

function performRollDefense(target) {
  if (rollLocked) return;
  rollLocked = true;

  const bonus = defenseBonus;
  const die = effectiveDefense();
  const sides = dieSides(die);
  const result = Math.floor(Math.random() * sides) + 1;
  const success = result >= target;

  const overlay = $("overlay-result");
  const numEl = $("result-number");
  const verdictEl = $("result-verdict");
  const ctxEl = $("result-context");
  ctxEl.classList.add("hidden");
  ctxEl.textContent = "";
  verdictEl.innerHTML = "";
  overlay.classList.remove("death-flood", "overlay--action", "overlay--act3");
  numEl.classList.remove("hidden");
  show(overlay);

  runFlicker(numEl, sides, () => {
    numEl.classList.add("hidden");
    numEl.textContent = "";
    if (success) {
      overlay.classList.add("overlay--act3");
      verdictEl.innerHTML = '<span class="strike-hit">UNTOUCHED</span>';
      document.querySelector(".result-dismiss").classList.remove("hidden");
    } else {
      const noArmor = character.loadout.armor === "none" ? 2 : 0;
      pendingDefenseDamage = Math.max(0, (target - result) + bonus + noArmor);
      overlay.classList.add("overlay--action");
      verdictEl.innerHTML =
        '<div class="verdict-fail">' + SKULL_IMG +
        '<span class="def-damage">Take ' + pendingDefenseDamage + ' Damage</span>' +
        '<button class="roll-damage-btn def-take-btn" onclick="takeDefenseDamage(this)">Take It</button>' +
        '<button class="def-dismiss-btn" onclick="closeDefenseFailure()">Dismiss</button>' +
        '</div>';
      if (navigator.vibrate) navigator.vibrate(40);
    }
    rollLocked = false;
  });
}

function closeResultOverlay() {
  const overlay = $("overlay-result");
  $("result-number").classList.remove("hidden");
  $("result-context").classList.remove("hidden");
  overlay.classList.remove("overlay--action", "overlay--act3", "death-flood");
  hide(overlay);
}

function wakeAtOneHP(ev) {
  ev.stopPropagation();
  character.hpCur = 1;
  save();
  renderHP();
  closeResultOverlay();
}

function takeDefenseDamage(btn) {
  if (btn) btn.disabled = true;
  adjustHP(-pendingDefenseDamage);
  closeResultOverlay();
  if (character.hpCur <= 0) openDeath();
}

function closeDefenseFailure() {
  closeResultOverlay();
}

// ---------- Navigation helpers ----------

function requireAbandon(action) {
  if (!character) { action(); return; }
  pendingConfirmAction = action;
  show($("overlay-confirm"));
}

/* ============================================================
   Table Link (CAP-07): link a device, join a GM's table, poll,
   and render pushed content. Fully additive; the solo/offline
   core above never reads or writes any of this state.
   ============================================================ */

let tlDevice = null;   // { token, ownsTableLink } or null
let tlSession = null;  // { sessionId, cursor, pollInterval } or null
let tlPollTimer = null;
let tlPolling = false;
let tlBusy = false;

// ---- Table Link persistence (the device token is the only stored secret) ----

function tlLoad() {
  try {
    const raw = localStorage.getItem(TABLELINK_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d.token !== "string" || !d.token) return null;
    return { token: d.token, ownsTableLink: !!d.ownsTableLink };
  } catch (e) {
    return null;
  }
}

function tlSave() {
  try {
    if (tlDevice && tlDevice.token) {
      localStorage.setItem(TABLELINK_KEY, JSON.stringify({
        token: tlDevice.token,
        ownsTableLink: !!tlDevice.ownsTableLink
      }));
    } else {
      localStorage.removeItem(TABLELINK_KEY);
    }
  } catch (e) { /* storage full or blocked: non-fatal */ }
}

// ---- Networking (cookieless bearer; one BACKEND_BASE) ----

async function tlApi(path, opts) {
  opts = opts || {};
  const method = opts.method || "GET";
  const auth = opts.auth !== false;
  const headers = {};
  if (opts.body) headers["Content-Type"] = "application/json";
  if (auth && tlDevice) headers["Authorization"] = "Bearer " + tlDevice.token;
  const res = await fetch(BACKEND_BASE + path, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  return { ok: res.ok, status: res.status, data };
}

// ---- Small UI helpers ----

function tlSetBanner(text) {
  const b = $("tl-conn-banner");
  if (b) { b.textContent = text; show(b); }
}
function tlClearBanner() {
  const b = $("tl-conn-banner");
  if (b) { hide(b); b.textContent = ""; }
}
function tlShowError(id, text) {
  const e = $(id);
  if (e) { e.textContent = text; show(e); }
}
function tlHideError(id) {
  const e = $(id);
  if (e) { hide(e); e.textContent = ""; }
}
function tlShowState(name) {
  ["link", "lobby", "session"].forEach((s) => {
    const el = $("tl-state-" + s);
    if (el) (s === name ? show : hide)(el);
  });
}

// ---- Screen enter / leave ----

function openTableLink() {
  hide($("screen-intro"));
  show($("screen-table"));
  tlClearBanner();
  tlHideError("tl-link-error");
  tlHideError("tl-join-error");
  hide($("tl-buy-prompt"));
  if (tlDevice) {
    tlRenderEntitlement();
    tlShowState("lobby");
    tlRefreshStatus();
  } else {
    tlShowState("link");
  }
}

function closeTableLink() {
  tlStopPolling();
  tlSession = null;
  hide($("screen-table"));
  renderIntro();
  show($("screen-intro"));
}

function tlDropToLink() {
  tlStopPolling();
  tlSession = null;
  tlDevice = null;
  tlSave();
  tlShowState("link");
  tlShowError("tl-link-error", "This device is no longer linked. Link it again.");
}

// ---- Device status / entitlement ----

async function tlRefreshStatus() {
  if (!tlDevice) return;
  try {
    const r = await tlApi("/api/v1/devices/status", { method: "POST" });
    if (r.status === 401) { tlDropToLink(); return; }
    if (r.ok && r.data) {
      tlDevice.ownsTableLink = !!r.data.ownsTableLink;
      tlSave();
      tlRenderEntitlement();
    }
    tlClearBanner();
  } catch (e) {
    tlSetBanner("You are offline. Connect to join a table.");
  }
}

function tlRenderEntitlement() {
  const el = $("tl-entitlement");
  if (!el) return;
  if (tlDevice && tlDevice.ownsTableLink) {
    el.textContent = "Device linked. You own Table Link.";
  } else {
    el.textContent = "Device linked. Join a Full House GM's table, or get Table Link to host your own party.";
  }
}

// ---- Link a device ----

async function tlDoLink() {
  const codeEl = $("tl-link-code");
  const labelEl = $("tl-device-label");
  const code = codeEl.value.trim();
  const label = labelEl.value.trim();
  tlHideError("tl-link-error");
  if (!code) { tlShowError("tl-link-error", "Enter the link code from your account page."); return; }
  if (tlBusy) return;
  tlBusy = true;
  const btn = $("tl-link-btn");
  btn.disabled = true;
  try {
    const body = { linkCode: code };
    if (label) body.deviceLabel = label.slice(0, 100);
    const r = await tlApi("/api/v1/devices/link", { method: "POST", body, auth: false });
    if (r.ok && r.data && r.data.deviceToken) {
      tlDevice = { token: r.data.deviceToken, ownsTableLink: !!r.data.ownsTableLink };
      tlSave();
      codeEl.value = "";
      labelEl.value = "";
      tlRenderEntitlement();
      tlShowState("lobby");
      tlClearBanner();
    } else {
      tlShowError("tl-link-error", tlLinkErrorText(r));
    }
  } catch (e) {
    tlShowError("tl-link-error", "Could not reach the server. Check your connection and try again.");
  } finally {
    tlBusy = false;
    btn.disabled = false;
  }
}

function tlLinkErrorText(r) {
  const code = r.data && r.data.error;
  if (r.status === 429 || code === "rate_limited") return "Too many attempts. Wait a while, then try again.";
  if (code === "link_code_required") return "Enter the link code from your account page.";
  if (code === "invalid_or_expired_code") return "That link code is unknown or has expired. Generate a fresh one on the site.";
  return "That did not work. Check the code and try again.";
}

// ---- Join a table ----

async function tlDoJoin() {
  const codeEl = $("tl-join-code");
  const nameEl = $("tl-display-name");
  const code = codeEl.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const name = nameEl.value.trim();
  tlHideError("tl-join-error");
  hide($("tl-buy-prompt"));
  if (!code) { tlShowError("tl-join-error", "Enter the join code your GM read out."); return; }
  if (!name) { tlShowError("tl-join-error", "Enter a display name for the table."); return; }
  if (tlBusy) return;
  tlBusy = true;
  const btn = $("tl-join-btn");
  btn.disabled = true;
  try {
    const r = await tlApi("/api/v1/table-sessions/join", {
      method: "POST",
      body: { joinCode: code, displayName: name.slice(0, 50) }
    });
    if (r.status === 401) { tlDropToLink(); return; }
    if (r.ok && r.data && r.data.sessionId) {
      tlSession = { sessionId: r.data.sessionId, cursor: 0, pollInterval: 2 };
      tlEnterSession();
    } else if (r.status === 403) {
      show($("tl-buy-prompt"));
      tlShowError("tl-join-error", "You need Table Link to join this table.");
    } else {
      tlShowError("tl-join-error", tlJoinErrorText(r));
    }
  } catch (e) {
    tlShowError("tl-join-error", "Could not reach the server. Check your connection and try again.");
  } finally {
    tlBusy = false;
    btn.disabled = false;
  }
}

function tlJoinErrorText(r) {
  const code = r.data && r.data.error;
  if (r.status === 429 || code === "rate_limited") return "Too many attempts. Wait a moment, then try again.";
  if (code === "session_full") return "That table is full. It seats six. Ask your GM.";
  if (code === "join_code_required") return "Enter the join code your GM read out.";
  if (code === "invalid_or_expired_code") return "That join code is unknown or has expired. Check it with your GM.";
  return "Could not join. Check the code and try again.";
}

// ---- In session ----

function tlEnterSession() {
  tlHideError("tl-join-error");
  hide($("tl-buy-prompt"));
  $("tl-feed").textContent = "";
  show($("tl-feed-empty"));
  $("tl-session-status").textContent = "Connected";
  $("tl-leave-btn").textContent = "Leave table";
  tlShowState("session");
  tlStartPolling();
}

function tlLeaveSession() {
  tlStopPolling();
  tlSession = null;
  tlClearBanner();
  tlRenderEntitlement();
  tlShowState("lobby");
}

function tlEndSession(reason) {
  tlStopPolling();
  const statusEl = $("tl-session-status");
  if (reason === 404 || reason === "closed") statusEl.textContent = "The table has closed.";
  else if (reason === 403) statusEl.textContent = "The GM removed you from this table.";
  else statusEl.textContent = "Disconnected from the table.";
  $("tl-leave-btn").textContent = "Back to lobby";
}

function tlStartPolling() {
  tlStopPolling();
  tlPolling = true;
  tlPoll();
}

function tlStopPolling() {
  tlPolling = false;
  if (tlPollTimer) { clearTimeout(tlPollTimer); tlPollTimer = null; }
}

function tlScheduleNextPoll() {
  if (!tlPolling) return;
  const secs = (tlSession && tlSession.pollInterval) || 2;
  tlPollTimer = setTimeout(tlPoll, Math.max(1, secs) * 1000);
}

async function tlPoll() {
  if (!tlPolling || !tlSession) return;
  const sid = tlSession.sessionId;
  let reschedule = true;
  try {
    const r = await tlApi("/api/v1/table-sessions/" + encodeURIComponent(sid) +
                          "/messages?after=" + tlSession.cursor);
    // The player may have left, unlinked, or joined a different session while this
    // request was in flight. Drop the stale response so it cannot leak a banner into
    // the lobby or contaminate a new session's feed/cursor.
    if (!tlPolling || !tlSession || tlSession.sessionId !== sid) { reschedule = false; return; }
    if (r.status === 401) { reschedule = false; tlStopPolling(); tlDropToLink(); return; }
    if (r.status === 404) { reschedule = false; tlEndSession(404); return; }
    if (r.status === 403) { reschedule = false; tlEndSession(403); return; }
    if (r.status === 429) {
      tlSetBanner("Slow down. Reconnecting shortly.");
      tlSession.pollInterval = Math.min(15, (tlSession.pollInterval || 2) * 2);
      return;
    }
    if (r.ok && r.data) {
      tlClearBanner();
      const sess = r.data.session;
      if (typeof r.data.pollIntervalSeconds === "number" && r.data.pollIntervalSeconds > 0) {
        tlSession.pollInterval = r.data.pollIntervalSeconds;
      }
      tlRenderMessages(r.data.messages);
      if (typeof r.data.nextCursor === "number") tlSession.cursor = r.data.nextCursor;
      if (sess && (sess.status === "closed" || sess.status === "expired")) {
        reschedule = false;
        tlEndSession("closed");
        return;
      }
      $("tl-session-status").textContent = "Connected";
    }
  } catch (e) {
    tlSetBanner("Reconnecting.");
  } finally {
    if (reschedule) tlScheduleNextPoll();
  }
}

// ---- Render pushed messages (textContent only; newest on top) ----

function tlRenderMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) return;
  hide($("tl-feed-empty"));
  const feed = $("tl-feed");
  messages.forEach((m) => {
    const card = tlBuildCard(m);
    if (card) feed.insertBefore(card, feed.firstChild);
  });
}

function tlBuildCard(m) {
  const p = (m && m.payload) || {};
  const card = document.createElement("div");
  card.className = "tl-card tl-card--" + ((m && m.type) || "unknown");
  if (m && m.type === "secret_text") {
    const kind = document.createElement("p");
    kind.className = "tl-card-kind";
    kind.textContent = "Secret";
    const body = document.createElement("p");
    body.className = "tl-card-body";
    body.textContent = p.text || "";
    card.appendChild(kind);
    card.appendChild(body);
  } else if (m && m.type === "rule") {
    const title = document.createElement("p");
    title.className = "tl-card-title";
    title.textContent = p.title || "Rule";
    const body = document.createElement("p");
    body.className = "tl-card-body";
    body.textContent = p.body || "";
    card.appendChild(title);
    card.appendChild(body);
  } else if (m && m.type === "image") {
    const img = document.createElement("img");
    img.className = "tl-card-img";
    img.alt = p.caption || "Shared image";
    img.src = BACKEND_BASE + (p.assetUrl || "");
    card.appendChild(img);
    if (p.caption) {
      const cap = document.createElement("p");
      cap.className = "tl-card-caption";
      cap.textContent = p.caption;
      card.appendChild(cap);
    }
  } else {
    return null;
  }
  return card;
}

// ---- Unlink ----

async function tlDoUnlink() {
  if (!tlDevice || tlBusy) return;
  tlBusy = true;
  const btn = $("tl-unlink-btn");
  btn.disabled = true;
  try {
    await tlApi("/api/v1/devices/unlink", { method: "POST" });
  } catch (e) {
    // Even if the call fails, clear locally: the token is this device's to drop.
  }
  tlStopPolling();
  tlSession = null;
  tlDevice = null;
  tlSave();
  tlHideError("tl-join-error");
  hide($("tl-buy-prompt"));
  tlShowState("link");
  tlBusy = false;
  btn.disabled = false;
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

  // Table Link (CAP-07)
  $("btn-join-table").addEventListener("click", openTableLink);
  $("tl-back").addEventListener("click", closeTableLink);
  $("tl-link-btn").addEventListener("click", tlDoLink);
  $("tl-join-btn").addEventListener("click", tlDoJoin);
  $("tl-unlink-btn").addEventListener("click", tlDoUnlink);
  $("tl-leave-btn").addEventListener("click", tlLeaveSession);

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

  // Defense damage bonus chips
  document.querySelectorAll(".bonus-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      defenseBonus = parseInt(btn.dataset.bonus, 10);
      document.querySelectorAll(".bonus-btn").forEach((b) => {
        b.classList.toggle("selected", b === btn);
      });
    });
  });

  // Defense die editing
  $("def-edit-stepper").addEventListener("click", (e) => {
    const btn = e.target.closest(".step-btn");
    if (!btn) return;
    const dir = parseInt(btn.dataset.dir, 10);
    const next = stepDie(character.defense, dir);
    character.defense = next === "d20" ? "d12" : next;
    save();
    $("def-edit-value").textContent = effectiveDefense();
    renderDefenseNote();
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
    if (character.supply > 0) { character.supply--; save(); renderInventory(); }
  });
  $("supply-plus").addEventListener("click", () => {
    character.supply++;
    save();
    renderInventory();
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

  // Conditions
  $("condition-chips").addEventListener("click", (e) => {
    const btn = e.target.closest(".cond-chip");
    if (!btn || !character) return;
    toggleCondition(btn.dataset.condId);
  });

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

  // Sorcery tab
  $("level-minus").addEventListener("click", () => adjustLevel(-1));
  $("level-plus").addEventListener("click", () => adjustLevel(1));
  $("spell-list-sorcery").addEventListener("click", (e) => {
    const btn = e.target.closest(".spell-row");
    if (!btn || btn.disabled) return;
    const spell = SPELLS.find((s) => s.id === btn.dataset.spellId);
    if (spell) openSpell(spell);
  });
  $("spell-cast-btn").addEventListener("click", castSpell);
  $("spell-cancel-btn").addEventListener("click", () => hide($("overlay-spell")));

  // Result overlay: dismiss on tap (suppressed mid-chain, HIT-wait, or defense-failure)
  $("overlay-result").addEventListener("click", () => {
    if (rollLocked || explosionState || hitState) return;
    const overlay = $("overlay-result");
    if (overlay.classList.contains("overlay--action")) return; // defense failure: explicit buttons only
    closeResultOverlay();
  });

  // Boot
  character = load();
  tlDevice = tlLoad();
  renderIntro();
  show($("screen-intro"));

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((e) => {
      console.error("Service worker registration failed:", e);
    });
  }
});
