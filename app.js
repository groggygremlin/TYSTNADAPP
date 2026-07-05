/* ============================================================
   TYSTNAD Companion - MVP
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
    return data;
  } catch (e) {
    console.error("Load failed:", e);
    return null;
  }
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
  // Default all skills to d6
  SKILLS.forEach((s) => { createState.skills[s] = "d6"; });
  createState.cls = null;
  createState.defense = "d8";
  $("in-name").value = "";
  $("in-hp").value = "";
  renderSkillEditors();
  renderDefense();
  document.querySelectorAll(".class-btn").forEach((b) => b.classList.remove("selected"));
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
    defense: createState.defense
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
}

function renderHP() {
  const cur = $("hp-current");
  cur.textContent = character.hpCur;
  $("hp-maxnum").textContent = character.hpMax;
  cur.classList.toggle("low", character.hpCur <= Math.floor(character.hpMax / 3));
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
  character.hpCur = Math.min(Math.max(character.hpCur + delta, 0), character.hpMax);
  renderHP();
  save();
}

// ---------- Rolling ----------

function openDifficulty(skill) {
  pendingSkill = skill;
  $("diff-skill-name").firstChild.textContent = skill + " ";
  $("diff-skill-die").textContent = character.skills[skill];
  show($("overlay-difficulty"));
}

function roll(target) {
  if (rollLocked) return;
  rollLocked = true;

  const skill = pendingSkill;
  const die = character.skills[skill];
  const sides = dieSides(die);
  const result = Math.floor(Math.random() * sides) + 1;

  hide($("overlay-difficulty"));

  $("result-context").textContent =
    skill + " " + die + " vs " + DIFFICULTY_NAMES[target];

  const numEl = $("result-number");
  const verdictEl = $("result-verdict");
  verdictEl.innerHTML = "";
  numEl.classList.add("rolling");
  show($("overlay-result"));

  // Brief flicker of random faces, then the true result lands.
  let ticks = 0;
  const flicker = setInterval(() => {
    numEl.textContent = Math.floor(Math.random() * sides) + 1;
    ticks++;
    if (ticks >= 8) {
      clearInterval(flicker);
      numEl.classList.remove("rolling");
      numEl.textContent = result;
      if (result >= target) {
        verdictEl.innerHTML = '<span class="verdict-success">SUCCESS</span>';
      } else {
        verdictEl.innerHTML = '<span class="verdict-skull">' + SKULL_SVG + "</span>";
      }
      rollLocked = false;
    }
  }, 60);
}

// ---------- Wiring ----------

document.addEventListener("DOMContentLoaded", () => {

  // Creation
  $("class-grid").addEventListener("click", (e) => {
    const btn = e.target.closest(".class-btn");
    if (!btn) return;
    document.querySelectorAll(".class-btn").forEach((b) => b.classList.remove("selected"));
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

  // Sheet
  $("hp-minus").addEventListener("click", () => adjustHP(-1));
  $("hp-plus").addEventListener("click", () => adjustHP(1));

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

  // Difficulty overlay
  document.querySelectorAll(".diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => roll(parseInt(btn.dataset.target, 10)));
  });
  $("diff-cancel").addEventListener("click", () => {
    pendingSkill = null;
    hide($("overlay-difficulty"));
  });

  // Result overlay dismisses on tap, but not mid-flicker
  $("overlay-result").addEventListener("click", () => {
    if (rollLocked) return;
    hide($("overlay-result"));
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
