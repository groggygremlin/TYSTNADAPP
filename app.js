/* ============================================================
   TYSTNAD Companion - v18
   Canon: Players Booklet v2.5
   ============================================================ */

const VERSION = "v72";

// ---------- Canon data (Players Booklet v2.5) ----------

const SKILLS = [
  "Athletics", "Awareness", "Combat", "Finesse",
  "Ingenuity", "Lore", "Presence", "Sorcery"
];

const DICE = ["d6", "d8", "d10", "d12", "d20"];

// Extended ladder for Forage Rough die step-down; d4 is the floor (PB v2.5 Hexploration)
const FORAGE_DICE = ["d4", "d6", "d8", "d10", "d12", "d20"];

// Per class (PB v2.5 p.12): core skill (d20-capable), starting HP, Defense die, the three
// d8 skills (all others d6), starting loadout tier, whether a shield is granted, and which
// weapon weights the class may take at creation. desc = the booklet's one-line pitch.
const CLASSES = {
  Warrior:  { hp: 12, defense: "d8", core: "Combat",  d8: ["Combat", "Athletics", "Presence"],  loadout: { armor: "medium", weapon: "standard" }, shield: true,  weapons: ["light", "standard", "heavy"], desc: "Grit and steel. You fight on the front line and hold it." },
  Rogue:    { hp: 11, defense: "d8", core: "Finesse", d8: ["Finesse", "Awareness", "Athletics"], loadout: { armor: "light",  weapon: "light"    }, shield: false, weapons: ["light"],                     desc: "Precision and perception. You move unseen and bring back what others did not live to report." },
  Scholar:  { hp: 10, defense: "d6", core: "Lore",    d8: ["Lore", "Combat", "Ingenuity"],       loadout: { armor: "medium", weapon: "standard" }, shield: true,  weapons: ["light", "standard"],         desc: "Knowledge and versatility. You turn what others miss into survival." },
  Sorcerer: { hp: 9,  defense: "d6", core: "Sorcery", d8: ["Sorcery", "Presence", "Lore"],       loadout: { armor: "none",   weapon: "light"    }, shield: false, weapons: ["light"],                     desc: "Magical power at physical cost. Every spell is a calculated risk." }
};

// The five identity questions (PB v2.5 p.11 step 3). Name is asked separately as the first.
const IDENTITY_QS = [
  { key: "drive", q: "What drove you to become an Explorer?" },
  { key: "hope",  q: "What do you hope to find beyond Haven's borders?" },
  { key: "line",  q: "What line will you not cross, even to secure the frontier?" },
  { key: "kin",   q: "Who in Haven would miss you most?" }
];

// Edges (PB v2.5 p.13): gained at levels 5, 7, 8, 10, 12; roll d20, reroll duplicates.
// id = the d20 number. `auto` marks the ones the app applies to its own math (Heavy Hitter,
// Vigilant, Armor Trained, Agile, and Hardened's one-time HP roll); the rest are display-only.
const EDGE_LEVELS = [5, 7, 8, 10, 12];
const EDGES = [
  { id: 1,  name: "Heavy Hitter",     auto: true,  desc: "Any successful weapon attack deals a minimum of 2 damage." },
  { id: 2,  name: "Iron Constitution", desc: "Your saves against disease are one tier easier." },
  { id: 3,  name: "Poison-Hardened",   desc: "Your saves against poison are one tier easier." },
  { id: 4,  name: "Vigilant",         auto: true,  desc: "Your Initiative contribution is increased by 1." },
  { id: 5,  name: "Hardened",         auto: true,  desc: "Roll 1d4 as you gain this Edge and add the result to your maximum HP permanently." },
  { id: 6,  name: "Samaritan",         desc: "Your First Aid heals 1d4+1 HP instead of 1d4." },
  { id: 7,  name: "Cat's Landing",     desc: "Reduce falling damage by 2d6." },
  { id: 8,  name: "Diplomat",          desc: "Your Presence checks to calm hostility are made at Easy." },
  { id: 9,  name: "Field Medic",       desc: "Your First Aid takes a Main Action instead of a Full Action." },
  { id: 10, name: "Unshaken",          desc: "Your saves against fear are one tier easier." },
  { id: 11, name: "Pack Horse",        desc: "You ignore all Heavy Load penalties at 24 to 27 LP." },
  { id: 12, name: "Armor Trained",    auto: true,  desc: "Heavy armor does not affect your Initiative contribution." },
  { id: 13, name: "Nine Lives",        desc: "Once, ever, you may reroll a failed Death roll." },
  { id: 14, name: "Blind Sight",       desc: "You no longer suffer penalties from the Blinded condition while in melee combat." },
  { id: 15, name: "Mending Flesh",     desc: "Your Post-Combat Breather recovers 4 HP instead of 3." },
  { id: 16, name: "Quick Feet",        desc: "Rising from Prone no longer costs a Quick Action." },
  { id: 17, name: "Weapon Mastery",    desc: "When you use the Double Attack Full Action, the second attack uses your standard Combat die instead of one step lower." },
  { id: 18, name: "Agile",            auto: true,  desc: "You no longer take +2 damage when unarmored." },
  { id: 19, name: "Reactive",          desc: "Your Defense die against projectiles is increased by one step, maximum d12." },
  { id: 20, name: "Precise Shot",      desc: "You no longer suffer range penalties when firing a bow or crossbow." }
];
function hasEdge(id) { return Array.isArray(character.edges) && character.edges.includes(id); }
function edgesOwed() { return EDGE_LEVELS.filter((l) => l <= character.level).length; }

// Class abilities (PB v2.5 p.12-13): four per class, unlocked at levels 3, 6, 9, 11.
// Pure display, derived from class + level -- no roll, no stored state.
const CLASS_ABILITIES = {
  Warrior: [
    { level: 3,  name: "Hold the Line", desc: "Once per combat, if an enemy tries to move past you, you may make an immediate free attack against that enemy." },
    { level: 6,  name: "Bloodied but Standing", desc: "When you drop below half HP, you deal +1 damage on all successful attacks until the end of combat." },
    { level: 9,  name: "Fear Us", desc: "Once per turn, any kill you make triggers a free attack against an enemy in weapon range." },
    { level: 11, name: "Not Yet", desc: "Once per session, when making a Death Roll, you may roll twice and keep the better result." }
  ],
  Rogue: [
    { level: 3,  name: "Ghost Step", desc: "Once per combat, on your turn, you may move up to 15 feet without spending any action." },
    { level: 6,  name: "Reading the Room", desc: "At the start of combat, choose one enemy to study. As long as you keep him in sight, your Defense rolls against him are Easy, regardless of his threat level." },
    { level: 9,  name: "Exploited Opening", desc: "When an ally's attack succeeds against a target within your reach, you may immediately make a free attack against that same target." },
    { level: 11, name: "Vanish", desc: "Once per session, you fade from enemy focus entirely. For 2 rounds, no enemy may target you with an attack. The moment you attack, the effect ends." }
  ],
  Scholar: [
    { level: 3,  name: "Studied", desc: "When encountering a creature, trap, or ruin for the first time, you may ask the GM one honest question about it." },
    { level: 6,  name: "Healing Hands", desc: "Your First Aid always heals +1 HP on a successful attempt." },
    { level: 9,  name: "Field Knowledge", desc: "You can identify any poison, substance, potion, gas, or inedible plant on sight or by examination. You never consume something dangerous by accident and may warn your companions before they touch something harmful." },
    { level: 11, name: "Institutional Memory", desc: "Three times per expedition, when the party makes a Travel, Explore, Forage, or Camp check, you may declare it an automatic success." }
  ],
  Sorcerer: [
    { level: 3,  name: "Sacrifice", desc: "Once per session, you may cast one Tier 1 or Tier 2 spell without paying its HP cost." },
    { level: 6,  name: "Unravel", desc: "Once per session, you may cast any spell as a Main Action instead of a Full Action." },
    { level: 9,  name: "Siphon", desc: "When an enemy creature dies within 30 feet, you immediately recover 1 HP." },
    { level: 11, name: "Spell Shield", desc: "Once per combat, you may reroll any failed save against magic." }
  ]
};

// Handbook (v68): a second surface for teaching + reference. Sections grow over time;
// "How to Play" is the first. Content is distilled from the Player Booklet, house voice.
const HANDBOOK_SECTIONS = [
  { id: "howto", label: "How to Play" },
  { id: "rules", label: "Rules Reference" },
  { id: "world", label: "World" }
];
const HOWTO_SECTIONS = [
  { h: "The Roll", p: "When an outcome is in doubt, the GM sets a difficulty: Easy 4+, Normal 5+, or Hard 6+. You roll the die for the skill in play and meet or beat that number to succeed. Anything easier than Easy simply works. Anything harder than Hard is beyond reach until you change your approach." },
  { h: "Your Dice", p: "Your level in a skill is a die: d6 for the untrained, up through d8, d10, and d12, to d20 for true mastery. Skills cap at d12. Only your class skill can reach d20." },
  { h: "The Eight Skills", p: "Athletics is body and endurance. Awareness notices what is hidden. Combat strikes. Finesse is precision and stealth. Ingenuity solves. Lore remembers. Presence sways. Sorcery casts, for Sorcerers alone." },
  { h: "Hit Points and Death", p: "Hit Points measure what you can take before you fall. At 0 or below you make a Death Roll: d20 at 0, stepping down to d6 at -4 or worse, and you need 5 or higher to survive. Survive and you drop unconscious for 1d6 rounds, then wake at 1 HP. Fail and your Explorer is gone." },
  { h: "Saves", p: "When you must resist an effect, the GM calls for a Save: Body with Athletics, Mind with Awareness, or Spirit with Presence. Succeed and you shrug the effect off or soften it." },
  { h: "Conditions", p: "The GM applies conditions like Poisoned, Frightened, or Weary as the frontier earns them, and you track them on your sheet. Weary is the one the app enforces: it shifts every roll target up one step." },
  { h: "Combat", p: "You give the GM your Initiative contribution and he rolls the party's order. On your turn you Attack against the enemy's threat tier, or you Defend by rolling your Defense die when a blow lands on you." },
  { h: "Sorcery", p: "A Sorcerer trades health for power. Every spell costs HP, paid whether the casting succeeds or fails. Spend past 0 and the Death Roll comes for you." },
  { h: "The Expedition", p: "Beyond Haven you Travel to cross ground, Explore to uncover it, Forage to feed the party, and Camp to hold through the night. Your expedition role shapes which of these you lead." },
  { h: "Load", p: "You carry up to 30 Load Points. Past 23 you are Heavy, past 27 Overloaded. The app warns you, and the table rules on what it means." },
  { h: "Advancement", p: "You grow on two rhythms. At each session's end, every skill you used well rolls to improve. And as the party's discoveries raise Haven's level, everyone gains HP, class abilities, and Edges together." }
];

// World (v70): the setting, distilled from the booklet (p4-7), house voice, read top to bottom.
const WORLD_SECTIONS = [
  { h: "The Silence", p: "Two hundred and fifty years ago, the world went silent. Caravans crossing the borders never came back. Pilgrims vanished beyond the hills. Messengers rode out and no answer followed. The sky did not burn and the crops still grew; the absence was human. Those who left to understand it never returned, and monster activity near the outer settlements rose each time someone tried. Departure beyond Haven's borders was banned, and Haven survived by staying put." },
  { h: "Haven", p: "Haven is two towns, six villages, four farms, and a misty lake, some six thousand people living within fifty kilometers, ringed by mountains, forest, and swamp. Lake Stillwater gives fish year-round and the farms bring surplus in good years. Neighbors know each other's names, and their parents' names before them. It is a good life, and the Explorers who leave for the frontier are not fleeing misery. They are leaving something they love and mean to protect." },
  { h: "What Haven Fears", p: "Children learn early never to pass the markers at the field's edge. Nobody calls it fear; those are simply the rules, and they have always been the rules. Someone is always awake at the frontier's edge, and dogs sleep lightly near the treeline. Every family carries a quiet story: a fishing crew that came back one fewer and would not say why. It is not one threat. It is the pattern beneath them all, and the pattern is what wakes people at three in the morning." },
  { h: "The Explorer Initiative", p: "Three months ago the Council voted, narrowly, to authorize the Explorer Initiative, and granted it twelve months to prove its worth. You are among the very first Explorers Haven has ever sanctioned. There is no tradition to follow, no veterans to consult, and no maps of what lies beyond. Your work will either justify exploration or confirm that the ban should never have been lifted." },
  { h: "Brume", p: "Brume is a fishing town built low and close to the water, its rooftops always faintly damp. Its people work hard without ever calling it hard work, and they are quiet, though never unfriendly. Brume deeply distrusts the Initiative. The lake provides, Haven has survived ten generations by staying close to what works, and until change proves itself good, caution is held to be the wiser position." },
  { h: "Aldenmere", p: "Aldenmere is where Haven thinks out loud. Its market runs three days a week, and its civic hall holds Haven's official memory: Council decisions, settlement reports, and incident logs going back to the first years after the Silence. The archivist, Dessa, has held her post for thirty years and will find you anything in a heartbeat, though she will not tell you what it means. The Explorer Initiative's office is a single room on the hall's east side, and its door is always open." },
  { h: "The Villages and Farms", p: "The villages sit between Haven's heart and its edges, each built around a single purpose the rest depends on: timber, stone, the roads and crossings. Those closest to the frontier have the sharpest eyes and the fewest illusions. And there are four farms, four families, two hundred and fifty years of the same names on the same land, and Haven eats because of them. They hold no Council seat, but when a farm family speaks, the Council listens." },
  { h: "The Council of Three", p: "Haven is governed by three neighbors, elected by every citizen over twenty-five, serving five-year terms and ruling by majority. Their authority comes from reputation and judgment, not inheritance or influence. The vote for the Initiative passed two to one, and the dissenting Elder has not softened. He attends every debrief as the Explorers return, asking precise questions and recording each answer. Both sides read every expedition as proof of their own case." },
  { h: "The Present", p: "Along the edges of settled land, the wild has grown bolder. Wolves and giant spiders in ruins sealed generations ago, goblin bands taking chickens in the night. Each event alone is containable; together they trace a clear pattern of exposure. Something may be pushing them Haven's way, too deliberate for hunger and too patient for coincidence. Whatever is behind it has not shown itself. The perimeter tightens." }
];

// Rules Reference (v69): the booklet's mechanics, tightened for the app, as collapsible topics.
const RULES_TOPICS = [
  { title: "Making Rolls", paras: [
    "When an outcome is in doubt, the GM sets the difficulty: Easy 4+, Normal 5+, or Hard 6+. You roll the die for the skill in play and meet or beat that number to succeed.",
    "Do not roll when you do not need to. Anything easier than Easy succeeds on its own. Anything harder than Hard is impossible as attempted, until you change your approach or find another way."
  ] },
  { title: "Skills", paras: [
    "Your level in a skill is a die: d6 for the untrained, then d8, d10, d12, and d20 for true mastery. Skills cap at d12. Only your class skill can reach d20.",
    "The eight skills: Athletics (body, endurance, force), Awareness (notice, spot, track), Combat (strike), Finesse (precision, stealth, sleight), Ingenuity (invent, solve), Lore (recall, read, identify), Presence (persuade, intimidate, deceive), and Sorcery (cast, Sorcerers only).",
    "Skill improvement: at the end of a session, every skill you used successfully rolls to advance. Roll the next die up and meet the threshold: d6 to d8 on 6+, d8 to d10 on 8+, d10 to d12 on 10+, d12 to d20 on 15+ (class skill only)."
  ] },
  { title: "Saves", paras: [
    "When you must resist an effect, the GM sets a difficulty and calls for a Save: Body with Athletics (poison, disease, force, paralysis), Mind with Awareness (illusions, deception, traps), or Spirit with Presence (fear, charm, compulsion). Succeed and you resist or reduce the effect."
  ] },
  { title: "Hit Points, Death and Recovery", paras: [
    "Hit Points measure what you absorb before you fall. Everyone starts at 8 HP plus a class bonus: Warrior +4 (12), Rogue +3 (11), Scholar +2 (10), Sorcerer +1 (9).",
    "Death Roll: at 0 HP you roll a d20, stepping down to d6 at -4 or worse, and you need 5 or higher. Survive and you fall unconscious for 1d6 rounds, then wake at 1 HP. While unconscious you cannot act or defend, and any further damage kills you outright. Fail the Death Roll and your Explorer is dead.",
    "First Aid heals 1d4 HP to a willing or unconscious target and needs a Healer's Kit. It works once after damage is taken, and new damage allows another attempt. It does not wake the unconscious.",
    "Resting: a Post-Combat Breather (5 minutes, 1 bandage) recovers 3 HP. Light activity recovers 1 HP every two hours. A proper rest recovers 1 HP per hour and needs 1 bandage per rest."
  ] },
  { title: "Advancement", paras: [
    "You grow on two rhythms. Skills improve session by session through use. Levels advance for the whole party as Haven grows.",
    "Discovery Points (DP) are earned for outcomes brought home: secured assets, neutralized threats, mapped hexes, recovered insights. They are awarded when you return to Haven and report. Reach a threshold and Haven levels, and the entire party gains one level together.",
    "Haven Level thresholds (DP): 1 to 2 is 20, 2 to 3 is 25, 3 to 4 is 30, 4 to 5 is 40, 5 to 6 is 50, 6 to 7 is 70, 7 to 8 is 90, 8 to 9 is 110, 9 to 10 is 140, 10 to 11 is 170, 11 to 12 is 200. DP reset each level.",
    "On level up you gain HP (roll 1d4, twice at levels 2 and 4), a class ability at levels 3, 6, 9, and 11, and an Edge at levels 5, 7, 8, 10, and 12."
  ] },
  { title: "Combat", paras: [
    "Surprise: a surprising side acts alone for one round, then Initiative is rolled as normal.",
    "Initiative: roll once at the start of combat and it lasts the whole fight. Roll d20, add the Party Bonus and the GM's Preparation modifier (Attentive +1, Neutral 0, Distracted -1), and compare to the opposition target (small or quick 12, standard 10, large or slow 8). Meet or beat it and the party acts first, completing all its actions before the other side.",
    "Party Bonus: each Explorer contributes from his loadout (no armor +2, light +1, heavy -1; light weapon or unarmed +1, heavy weapon -1), summed across the party.",
    "Momentum: the Initiative winner's margin grants bonus damage. Margin 3 to 4 is +1 damage for 1 round. Margin 5 or more is +2 for 2 rounds.",
    "Actions per turn: one Quick Action and two Main Actions, or convert both Main Actions into one Full Action. Quick: Half-Move, Interact, Drop or Stand, Consume, Signal. Main: Attack (once per turn), Move, Simple Skill, Ready, Help. Full: Cast Spell, Complex Skill, Full Move, First Aid, Double Attack (the second attack one die step lower).",
    "Attacking: the GM sets the difficulty, and you roll your Combat skill and your weapon damage die. On a hit, deal the damage. If the damage die rolls its maximum, roll again and add it, repeating until it is not maximum (exploding damage).",
    "Defending: when a monster strikes you, roll your Defense die against its threat (Weak 4+, Standard 5+, Strong 6+). Success takes no damage. Failure takes the target minus your roll, plus the monster's damage bonus.",
    "The Defense die is set by class (Warrior and Rogue d8, Scholar and Sorcerer d6) and raised only by armor: light no change, medium one step up, heavy two steps up. With no armor you use the base die but take +2 extra damage on a failed Defense. A shield lets you reroll one failed Defense per combat.",
    "Ranged: bows and crossbows need ammunition, tracked in bundles. Range and cover shift the difficulty, as the GM rules."
  ] },
  { title: "Hexploration", paras: [
    "The frontier is a grid of hexes, each 24 miles of wilderness. You cross them, explore them, map them, and mark them. The farther from Haven, the greater the danger and the greater the reward.",
    "A field day is 24 hours and holds up to three efforts of about 8 hours each: Travel, Explore, Forage, and Camp. One must be Camp or the party gains Weariness. At day's end, deduct 1 Supply.",
    "Efforts are led by roles: the Pathfinder leads Travel (Lore), the Scout leads Explore and judges Camp safety (Awareness), and the Quartermaster leads Forage (Athletics).",
    "Terrain sets the effort difficulty and how far a Travel effort carries you (Easy 4+, Standard 5+, Rough 6+). A hex is Mapped after three successful Explores, after which Travel in it is Easy.",
    "Supply: deduct 1 per day, or 2 under strain (two Travels, severe weather, two combats, hauling a companion). With no Supply, Starvation sets in. Forage results: 1 to 3 nothing, 4 to 5 gain 1 Supply, 6 or more gain 2.",
    "Camp safety: the Scout rolls Awareness against the terrain's difficulty. Exposed (a failed roll) offers no safety and Weariness cannot clear. Stable (meets it) rests normally. Defensible (beats it by 2 or more) rests normally and cannot be surprised in the night.",
    "Returning to Haven: report your findings to claim Discovery Points, then resupply and rest before the next expedition."
  ] },
  { title: "Conditions", paras: [
    "Conditions are applied by the GM and tracked on your sheet. Weary is the one the app enforces: it shifts every roll target up one step (Easy becomes Normal, Normal becomes Hard, Hard stays Hard), and it does not touch the Death Roll.",
    "The ten conditions: Weary, Poisoned, Lethal Poison, Diseased, Frightened, Prone, Shocked, Burning, Immolation, and Blinded. Toggle one on your sheet to read its full effect."
  ] },
  { title: "Equipment and Load", paras: [
    "You carry up to 30 Load Points. Every carried item costs at least 1 LP, and worn clothing does not count. Worn armor uses its normal Load; carried armor counts double. Every 100 coins, or part thereof, is 1 LP.",
    "Load thresholds: 0 to 23 Unburdened (act normally); 24 to 27 Heavy (you cannot convert two Main Actions into a Full Action, and Sorcerers cannot cast); 28 to 30 Overloaded (one Main Action only, no Full Actions, and Sorcerers cannot cast).",
    "Weapons come in three weights: Light (1d6 damage), Standard (1d8), and Heavy (1d10). Armor comes in Light, Medium, and Heavy, and it sets both your Defense die step and your Initiative contribution."
  ] },
  { title: "Sorcery", paras: [
    "Only Sorcerers cast, and casting is a Full Action. Every spell costs HP, paid whether it succeeds or fails. If the cost drops you to 0 or below, you skip the Sorcery roll and go straight to a Death Roll.",
    "Spells sit in three tiers by cost and Sorcery target: Tier 1 costs 1 HP at 4+, Tier 2 costs 2 HP at 5+, Tier 3 costs 3 HP at 6+. Higher tiers unlock as you level. Sorcery never heals."
  ] }
];


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

// Booklet equipment list (PB v2.5 p.14): name + Load Points only, for the inventory
// picker. Armor uses its WORN LP (the common case); the player edits the LP for a
// carried set. "Supply" is omitted here (it has its own Supply counter). Ruled into the
// public app by Tomas, same as the SPELLS list (v27 ruling).
const GEAR_ITEMS = [
  // Weapons (weight = combat/damage tier: light 1d6, standard 1d8, heavy 1d10)
  { name: "Dagger", lp: 1, weight: "light" },
  { name: "Shortsword", lp: 2, weight: "light" },
  { name: "Hand Axe", lp: 2, weight: "light" },
  { name: "Club", lp: 2, weight: "light" },
  { name: "Staff", lp: 2, weight: "light" },
  { name: "Throwing Axe", lp: 3, weight: "standard" },
  { name: "Longsword", lp: 3, weight: "standard" },
  { name: "Battleaxe", lp: 3, weight: "standard" },
  { name: "Mace", lp: 3, weight: "standard" },
  { name: "Spear", lp: 3, weight: "standard" },
  { name: "Shortbow", lp: 3, weight: "standard" },
  { name: "Crossbow", lp: 4, weight: "standard" },
  { name: "Greatsword", lp: 5, weight: "heavy" },
  { name: "Greataxe", lp: 5, weight: "heavy" },
  { name: "Warhammer", lp: 5, weight: "heavy" },
  { name: "Halberd", lp: 5, weight: "heavy" },
  { name: "Longbow", lp: 4, weight: "heavy" },
  // Ammunition
  { name: "Arrow Bundle", lp: 2 },
  { name: "Bolt Bundle", lp: 2 },
  // Armor (worn LP; armor = Defense tier)
  { name: "Leather Armor", lp: 2, armor: "light" },
  { name: "Padded Armor", lp: 2, armor: "light" },
  { name: "Chainmail", lp: 4, armor: "medium" },
  { name: "Scale Armor", lp: 4, armor: "medium" },
  { name: "Studded Leather", lp: 4, armor: "medium" },
  { name: "Plate Armor", lp: 6, armor: "heavy" },
  { name: "Half-Plate", lp: 6, armor: "heavy" },
  { name: "Banded Mail", lp: 6, armor: "heavy" },
  { name: "Shield", lp: 2 },
  // Adventuring gear
  { name: "Rope (50 ft)", lp: 4 },
  { name: "Torch (bundle of 5)", lp: 2 },
  { name: "Lantern", lp: 2 },
  { name: "Oil Flask", lp: 1 },
  { name: "Bedroll", lp: 3 },
  { name: "Bandages (5 uses)", lp: 1 },
  { name: "Climbing Kit", lp: 4 },
  { name: "Lockpicks", lp: 1 },
  { name: "Tent (2-person)", lp: 5 },
  { name: "Backpack", lp: 1 },
  { name: "Healer's Kit", lp: 3 },
  { name: "Grappling Hook", lp: 2 },
  { name: "Crowbar", lp: 3 },
  { name: "Chalk (10 pieces)", lp: 1 },
  { name: "Iron Spikes (bundle of 10)", lp: 2 },
  // Miscellaneous
  { name: "Tinderbox", lp: 1 },
  { name: "Steel Mirror", lp: 1 },
  { name: "Ink and Quill", lp: 1 },
  { name: "Parchment (10 sheets)", lp: 1 },
  { name: "Blank Map", lp: 1 },
  { name: "Fishing Tackle", lp: 2 },
  { name: "Manacles", lp: 3 }
];

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
let pendingSave = null;   // save label ("Body"/"Mind"/"Spirit") when the roll is a Save
let pendingSpellTier = null;

// Saves (PB v2.5 p.9): a Save is a skill roll against a GM difficulty.
const SAVES = [
  { id: "body",   label: "Body",   skill: "Athletics" },
  { id: "mind",   label: "Mind",   skill: "Awareness" },
  { id: "spirit", label: "Spirit", skill: "Presence" }
];
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
  // CAP-08: while joined to a table, report the character snapshot (debounced).
  if (typeof tlSession !== "undefined" && tlSession) tlScheduleReport();
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
  // v61: Explorer identity answers (name lives at top level; these are the four narrative ones)
  if (!c.identity || typeof c.identity !== "object" || Array.isArray(c.identity)) c.identity = {};
  ["drive", "hope", "line", "kin"].forEach((k) => {
    if (typeof c.identity[k] !== "string") c.identity[k] = "";
  });
  // v62: Edges held (array of Edge ids 1-20)
  if (!Array.isArray(c.edges)) c.edges = [];
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

// Small DOM builder (textContent only; never innerHTML for dynamic text).
function ce(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function damageDieForWeapon() {
  return WEAPON_DAMAGE[character.loadout.weapon] || "d8";
}

// ---------- Creation screen ----------

// ---- Creation wizard (v61): mandatory step-by-step, level-1 canonical Explorer ----
// Steps: class -> identity -> equipment -> wealth -> confirm. Next is gated per step.
// Leveled Explorers are still entered via Import.

const WIZ_STEPS = ["class", "identity", "equipment", "wealth", "confirm"];

const createState = {
  step: 0,
  cls: null,
  name: "",
  identity: { drive: "", hope: "", line: "", kin: "" },
  armor: null,       // chosen armor item name, or "none" when the class wears none
  weapon: null,      // chosen weapon item name
  wealth: null,      // rolled starting Copper (null until rolled)
  wealthDice: null   // the three d4 results, for display
};

function initCreateScreen() {
  createState.step = 0;
  createState.cls = null;
  createState.name = "";
  createState.identity = { drive: "", hope: "", line: "", kin: "" };
  createState.armor = null;
  createState.weapon = null;
  createState.wealth = null;
  createState.wealthDice = null;
  renderWizard();
}

function gearByName(name) { return GEAR_ITEMS.find((it) => it.name === name) || null; }
function armorsForClass(cls) {
  const tier = CLASSES[cls].loadout.armor;
  return tier === "none" ? [] : GEAR_ITEMS.filter((it) => it.armor === tier);
}
function weaponsForClass(cls) {
  const allowed = CLASSES[cls].weapons;
  return GEAR_ITEMS.filter((it) => it.weight && allowed.includes(it.weight));
}

function wizardStepComplete() {
  const s = createState;
  switch (WIZ_STEPS[s.step]) {
    case "class": return s.cls !== null;
    case "identity":
      return s.name.trim().length > 0 &&
        IDENTITY_QS.every((it) => (s.identity[it.key] || "").trim().length > 0);
    case "equipment": {
      const needArmor = CLASSES[s.cls].loadout.armor !== "none";
      return (!needArmor || s.armor !== null) && s.weapon !== null;
    }
    case "wealth": return s.wealth !== null;
    case "confirm": return true;
    default: return false;
  }
}

function updateWizardNext() {
  $("wiz-next").disabled = !wizardStepComplete();
}

function renderWizard() {
  const body = $("wizard-body");
  body.innerHTML = "";
  const step = createState.step;
  $("wizard-progress").textContent = "Step " + (step + 1) + " of " + WIZ_STEPS.length;
  [buildClassStep, buildIdentityStep, buildEquipmentStep, buildWealthStep, buildConfirmStep][step](body);
  $("wiz-back").classList.toggle("hidden", step === 0);
  $("wiz-next").textContent = step === WIZ_STEPS.length - 1 ? "Create Explorer" : "Next";
  updateWizardNext();
}

function buildClassStep(body) {
  body.appendChild(ce("h2", "wiz-title", "Choose Your Class"));
  body.appendChild(ce("p", "wiz-lead", "Your class sets your starting HP, Defense, and skills, and which skill can reach legendary mastery (d20)."));
  const grid = ce("div", "wiz-class-grid");
  Object.keys(CLASSES).forEach((cls) => {
    const card = ce("button", "wiz-class-card");
    if (createState.cls === cls) card.classList.add("selected");
    card.appendChild(ce("span", "wiz-class-name", cls));
    card.appendChild(ce("span", "wiz-class-desc", CLASSES[cls].desc));
    card.addEventListener("click", () => {
      createState.cls = cls;
      createState.armor = null;   // dependent picks reset when the class changes
      createState.weapon = null;
      renderWizard();
    });
    grid.appendChild(card);
  });
  body.appendChild(grid);
  if (createState.cls) body.appendChild(buildClassStats(createState.cls));
}

function buildClassStats(cls) {
  const def = CLASSES[cls];
  const panel = ce("div", "wiz-stats");
  panel.appendChild(ce("p", "wiz-stats-line", "Starting HP " + def.hp + "  ·  Defense " + def.defense + "  ·  Core skill " + def.core + " (reaches d20)"));
  const skills = ce("div", "wiz-stats-skills");
  SKILLS.forEach((s) => {
    const chip = ce("span", "wiz-skill-chip", s + " " + (def.d8.includes(s) ? "d8" : "d6"));
    if (s === def.core) chip.classList.add("core");
    skills.appendChild(chip);
  });
  panel.appendChild(skills);
  return panel;
}

function buildTextField(label, value, onInput, maxlen) {
  const wrap = ce("label", "wiz-field");
  wrap.appendChild(ce("span", "wiz-field-label", label));
  const input = document.createElement("input");
  input.type = "text";
  input.className = "wiz-input";
  input.maxLength = maxlen;
  input.value = value || "";
  input.autocomplete = "off";
  input.addEventListener("input", (e) => onInput(e.target.value));
  wrap.appendChild(input);
  return wrap;
}

function buildIdentityStep(body) {
  body.appendChild(ce("h2", "wiz-title", "Establish Your Identity"));
  body.appendChild(ce("p", "wiz-lead", "Answer who you are in Haven. Every question is required."));
  body.appendChild(buildTextField("What is your name?", createState.name,
    (v) => { createState.name = v; updateWizardNext(); }, 24));
  IDENTITY_QS.forEach((it) => {
    body.appendChild(buildTextField(it.q, createState.identity[it.key],
      (v) => { createState.identity[it.key] = v; updateWizardNext(); }, 120));
  });
}

function buildEquipmentStep(body) {
  const cls = createState.cls;
  const def = CLASSES[cls];
  body.appendChild(ce("h2", "wiz-title", "Starting Equipment"));
  body.appendChild(ce("p", "wiz-lead", "Choose your armor and weapon. Your class decides what you may carry" +
    (def.shield ? "; you also carry a shield." : ".")));

  body.appendChild(ce("p", "wiz-section-label", "Armor"));
  const armors = armorsForClass(cls);
  if (!armors.length) {
    createState.armor = "none";
    body.appendChild(ce("p", "wiz-note", "Sorcerers wear no armor."));
  } else {
    const ag = ce("div", "wiz-opt-grid");
    armors.forEach((it) => {
      const b = ce("button", "wiz-opt", it.name + " · " + it.lp + " LP");
      if (createState.armor === it.name) b.classList.add("selected");
      b.addEventListener("click", () => { createState.armor = it.name; renderWizard(); });
      ag.appendChild(b);
    });
    body.appendChild(ag);
  }

  body.appendChild(ce("p", "wiz-section-label", "Weapon"));
  const wg = ce("div", "wiz-opt-grid");
  weaponsForClass(cls).forEach((it) => {
    const b = ce("button", "wiz-opt", it.name + " · " + it.lp + " LP");
    if (createState.weapon === it.name) b.classList.add("selected");
    b.addEventListener("click", () => { createState.weapon = it.name; renderWizard(); });
    wg.appendChild(b);
  });
  body.appendChild(wg);
}

function buildWealthStep(body) {
  body.appendChild(ce("h2", "wiz-title", "Determine Starting Wealth"));
  body.appendChild(ce("p", "wiz-lead", "Roll 3d4 and multiply by 100. This is your starting Copper."));
  const rollBtn = ce("button", "primary-btn slim wiz-roll-btn", createState.wealth === null ? "Roll 3d4" : "Rolled");
  rollBtn.disabled = createState.wealth !== null;
  const result = ce("p", "wiz-wealth-result");
  if (createState.wealth !== null) {
    const d = createState.wealthDice;
    result.textContent = d[0] + " + " + d[1] + " + " + d[2] + " = " + (d[0] + d[1] + d[2]) + " × 100 = " + createState.wealth + " Copper";
  }
  rollBtn.addEventListener("click", () => {
    const d = [rollD4(), rollD4(), rollD4()];
    createState.wealthDice = d;
    createState.wealth = (d[0] + d[1] + d[2]) * 100;
    renderWizard();
  });
  body.appendChild(rollBtn);
  body.appendChild(result);
}

function rollD4() { return Math.floor(Math.random() * 4) + 1; }

function addSummary(wrap, label, value) {
  const row = ce("div", "wiz-sum-row");
  row.appendChild(ce("span", "wiz-sum-label", label));
  row.appendChild(ce("span", "wiz-sum-value", value));
  wrap.appendChild(row);
}

function buildConfirmStep(body) {
  const s = createState;
  const def = CLASSES[s.cls];
  body.appendChild(ce("h2", "wiz-title", "Confirm"));
  body.appendChild(ce("p", "wiz-lead", "Review your Explorer. Haven needs you."));
  const sum = ce("div", "wiz-summary");
  addSummary(sum, "Name", s.name.trim());
  addSummary(sum, "Class", s.cls);
  addSummary(sum, "HP", String(def.hp));
  addSummary(sum, "Defense", def.defense);
  addSummary(sum, "Core skill", def.core + " (d20)");
  addSummary(sum, "Armor", s.armor === "none" ? "None" : s.armor);
  if (def.shield) addSummary(sum, "Shield", "Yes");
  addSummary(sum, "Weapon", s.weapon);
  addSummary(sum, "Starting Copper", String(s.wealth));
  // Identity answers stack (question over answer) so long text stays readable.
  IDENTITY_QS.forEach((it) => {
    const qa = ce("div", "wiz-sum-qa");
    qa.appendChild(ce("span", "wiz-sum-q", it.q));
    qa.appendChild(ce("span", "wiz-sum-a", s.identity[it.key].trim()));
    sum.appendChild(qa);
  });
  body.appendChild(sum);
}

function wizardNext() {
  if (!wizardStepComplete()) return;
  if (createState.step === WIZ_STEPS.length - 1) { createCharacter(); return; }
  createState.step++;
  renderWizard();
}

function wizardBack() {
  if (createState.step > 0) { createState.step--; renderWizard(); }
}

function createCharacter() {
  const s = createState;
  const def = CLASSES[s.cls];
  const skills = {};
  SKILLS.forEach((sk) => { skills[sk] = def.d8.includes(sk) ? "d8" : "d6"; });

  // Starting gear -> inventory items; the loadout tiers derive from the picks.
  const items = [];
  let armorTier = "none";
  if (s.armor && s.armor !== "none") {
    const a = gearByName(s.armor);
    if (a) { items.push({ name: a.name, lp: a.lp }); armorTier = a.armor; }
  }
  if (def.shield) {
    const sh = gearByName("Shield");
    if (sh) items.push({ name: sh.name, lp: sh.lp });
  }
  let weaponWeight = "light";
  const w = gearByName(s.weapon);
  if (w) { items.push({ name: w.name, lp: w.lp }); weaponWeight = w.weight; }

  character = {
    name: s.name.trim(),
    cls: s.cls,
    skills: skills,
    hpMax: def.hp,
    hpCur: def.hp,
    defense: def.defense,
    loadout: { armor: armorTier, weapon: weaponWeight },
    items: items,
    coins: s.wealth || 0,
    roles: [],
    skillTicks: {},
    supply: 0,
    level: 1,
    conditions: {},
    edges: [],
    identity: {
      drive: s.identity.drive.trim(),
      hope: s.identity.hope.trim(),
      line: s.identity.line.trim(),
      kin: s.identity.kin.trim()
    }
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
  renderAbilities();
  renderEdges();
  renderIdentity();
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

// ---------- Rest & Recovery (PB v2.5 p.9-10, p.24) ----------
// Player-triggered HP recovery. The app rolls and records; it never blocks on
// inventory (Healer's Kit / bandages are ruled at the table). Character edges and
// abilities that modify these actions auto-apply.

function firstAidBonus() {
  // Samaritan edge -> 1d4+1; Scholar Healing Hands (level 6+) -> +1 more.
  let b = 0;
  if (hasEdge(6)) b += 1;
  if (character.cls === "Scholar" && character.level >= 6) b += 1;
  return b;
}

function breatherAmount() { return hasEdge(15) ? 4 : 3; } // Mending Flesh edge -> 4

function openRecovery() {
  const r = $("recovery-result");
  r.textContent = "";
  hide(r);
  const b = firstAidBonus();
  $("rec-firstaid-hint").textContent =
    "Heal 1d4" + (b ? "+" + b : "") + " HP. Requires a Healer's Kit.";
  $("rec-breather-hint").textContent =
    "Recover " + breatherAmount() + " HP. Requires 1 bandage.";
  show($("overlay-recovery"));
}

function healBy(amount, label) {
  const before = character.hpCur;
  character.hpCur = Math.min(character.hpCur + amount, character.hpMax);
  const gained = character.hpCur - before;
  renderHP();
  save();
  const r = $("recovery-result");
  r.textContent = gained > 0
    ? label + ": +" + gained + " HP  (" + character.hpCur + "/" + character.hpMax + ")"
    : "Already at full HP.";
  show(r);
}

function recoverFirstAid() {
  const roll = rollD4();
  healBy(roll + firstAidBonus(), "First Aid (rolled " + roll + ")");
}
function recoverBreather() { healBy(breatherAmount(), "Breather"); }
function recoverRest() { healBy(1, "Rest"); }

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
  const impBtn = $("btn-improve-skills");
  if (impBtn) { anyTick ? show(impBtn) : hide(impBtn); }
}

// ---------- Skill ticks ----------

function tickSkill(name) {
  if (!character.skillTicks[name]) {
    character.skillTicks[name] = true;
    renderSkillList();
    save();
  }
}

// Skill improvement (PB v2.5 p.8): at session end, each ticked skill rolls the next die up
// and advances on a threshold. Non-class skills cap at d12; the class (core) skill reaches d20.
const IMPROVE = {
  d6:  { die: "d8",  need: 6 },
  d8:  { die: "d10", need: 8 },
  d10: { die: "d12", need: 10 },
  d12: { die: "d20", need: 15 }   // class (core) skill only
};
let improveQueue = [];

function improveSkills() {
  const core = CLASSES[character.cls] ? CLASSES[character.cls].core : null;
  improveQueue = SKILLS.filter((s) => character.skillTicks[s]).map((s) => {
    const cur = character.skills[s];
    const step = IMPROVE[cur];
    if (!step) return null;                        // already d20 (mastered core)
    if (cur === "d12" && s !== core) return null;  // non-core caps at d12
    return { skill: s, cur: cur, next: step.die, need: step.need };
  }).filter(Boolean);
  if (!improveQueue.length) {                      // ticks exist but nothing rollable: just clear
    character.skillTicks = {};
    renderSkillList();
    save();
    return;
  }
  improveNext();
}

function improveNext() {
  const overlay = $("overlay-improve");
  if (!improveQueue.length) {                      // sequence done: clear all ticks
    character.skillTicks = {};
    renderSkillList();
    save();
    hide(overlay);
    return;
  }
  const item = improveQueue.shift();
  $("improve-context").textContent = item.skill + "  " + item.cur + " → " + item.next;
  const numEl = $("improve-number");
  const verdictEl = $("improve-verdict");
  verdictEl.textContent = "";
  hide($("improve-continue"));
  show(overlay);
  const sides = dieSides(item.next);
  runFlicker(numEl, sides, () => {
    const roll = Math.floor(Math.random() * sides) + 1;
    numEl.textContent = roll;
    if (roll >= item.need) {
      character.skills[item.skill] = item.next;
      renderSkillList();
      save();
      verdictEl.appendChild(ce("span", "improve-up", "Advanced to " + item.next));
      if (navigator.vibrate) navigator.vibrate(30);
    } else {
      verdictEl.appendChild(ce("span", "improve-stay", "Holds at " + item.cur));
    }
    show($("improve-continue"));
  });
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
  let armorInit = INIT_ARMOR[character.loadout.armor];
  // Armor Trained (Edge 12): heavy armor no longer costs Initiative.
  if (character.loadout.armor === "heavy" && hasEdge(12)) armorInit = 0;
  let total = armorInit + INIT_WEAPON[character.loadout.weapon];
  // Vigilant (Edge 4): +1 Initiative contribution.
  if (hasEdge(4)) total += 1;
  return total;
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
  hideGearSuggest();
  renderInventory();
  save();
}

// ---- Inventory item picker: a scrollable booklet-item dropdown over the Item field.
// The field stays free-text (manual entry still works); picking an item fills its name
// and auto-fills the LP. Filtered live by what is typed. ----

function renderGearSuggest(filter) {
  const panel = $("inv-suggest");
  const q = (filter || "").trim().toLowerCase();
  const matches = q ? GEAR_ITEMS.filter((it) => it.name.toLowerCase().includes(q)) : GEAR_ITEMS;
  panel.textContent = "";
  if (!matches.length) { hideGearSuggest(); return; }
  matches.forEach((it) => {
    const row = document.createElement("div");
    row.className = "inv-suggest-item";
    row.setAttribute("role", "option");
    const nm = document.createElement("span");
    nm.className = "inv-suggest-name";
    nm.textContent = it.name;
    const lp = document.createElement("span");
    lp.className = "inv-suggest-lp";
    lp.textContent = it.lp + " LP";
    row.appendChild(nm);
    row.appendChild(lp);
    // mousedown (not click) so the pick lands before the input's blur closes the panel.
    row.addEventListener("mousedown", (e) => {
      e.preventDefault();
      $("inv-name").value = it.name;
      $("inv-lp-in").value = it.lp;
      hideGearSuggest();
    });
    panel.appendChild(row);
  });
  show(panel);
  $("inv-name").setAttribute("aria-expanded", "true");
}

function hideGearSuggest() {
  hide($("inv-suggest"));
  $("inv-name").setAttribute("aria-expanded", "false");
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
  let total = chain.reduce((a, b) => a + b, 0) + momentum;
  // Heavy Hitter (Edge 1): a successful weapon attack deals a minimum of 2 damage.
  if (hasEdge(1)) total = Math.max(total, 2);
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
      hideRollReadout();
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
      hideRollReadout();
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
      hideRollReadout();
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

// ---------- Advancement: Level + Edges (all classes) ----------

function adjustLevel(delta) {
  character.level = Math.min(Math.max(character.level + delta, 1), 20);
  renderAbilities();
  renderEdges();
  renderSorceryTab();
  save();
}

// Level Up (PB v2.5 p.12): advance one level and roll 1d4 into max HP (twice at levels 2
// and 4). Warrior treats a rolled 1 as 2. Current HP is unchanged. Deliberate action,
// separate from the free Level stepper.
function levelUp() {
  if (character.level >= 20) return;
  const newLevel = character.level + 1;
  const count = (newLevel === 2 || newLevel === 4) ? 2 : 1;
  const applied = [];
  for (let i = 0; i < count; i++) {
    let roll = Math.floor(Math.random() * 4) + 1;
    if (character.cls === "Warrior" && roll === 1) roll = 2;
    applied.push(roll);
  }
  const gain = applied.reduce((a, b) => a + b, 0);
  character.hpMax += gain;
  character.level = newLevel;
  save();
  renderHP();
  renderAbilities();
  renderEdges();
  renderSorceryTab();
  showLevelUpReveal(newLevel, applied, gain);
}

function showLevelUpReveal(level, applied, gain) {
  $("levelup-title").textContent = "Level " + level;
  $("levelup-dice").textContent = "Rolled " + applied.join(" and ");
  $("levelup-gain").textContent = "Maximum HP increased by " + gain + ".";
  show($("overlay-levelup"));
}

// The Edges panel lives on HOME so every class can set Level and manage Edges.
function renderEdges() {
  $("level-value").textContent = character.level;
  $("btn-level-up").classList.toggle("hidden", character.level >= 20);
  const owed = edgesOwed();
  const held = character.edges || [];
  const available = Math.max(0, owed - held.length);
  const rollBtn = $("btn-roll-edge");
  if (available > 0) {
    rollBtn.textContent = available === 1 ? "Roll an Edge" : "Roll an Edge (" + available + " available)";
    show(rollBtn);
  } else {
    hide(rollBtn);
  }
  const list = $("edges-list");
  list.innerHTML = "";
  hide($("edges-empty"));
  if (!held.length) { show($("edges-empty")); return; }
  held.forEach((id) => {
    const e = EDGES.find((x) => x.id === id);
    if (!e) return;
    const row = ce("div", "edge-row");
    row.appendChild(ce("p", "edge-name", e.name));
    row.appendChild(ce("p", "edge-desc", e.desc));
    list.appendChild(row);
  });
}

function rollEdge() {
  const held = character.edges || (character.edges = []);
  if (held.length >= edgesOwed()) return;              // not owed one
  const pool = EDGES.map((e) => e.id).filter((id) => !held.includes(id));  // reroll-duplicates == pick from unheld
  if (!pool.length) return;
  const id = pool[Math.floor(Math.random() * pool.length)];
  held.push(id);
  let bonus = "";
  if (id === 5) {                                       // Hardened: roll 1d4, raise max HP
    const roll = Math.floor(Math.random() * 4) + 1;
    character.hpMax += roll;
    bonus = "Maximum HP increased by " + roll + ".";
  }
  save();
  renderEdges();
  renderHP();
  showEdgeReveal(id, bonus);
}

function showEdgeReveal(id, bonus) {
  const e = EDGES.find((x) => x.id === id);
  $("edge-reveal-name").textContent = e.name;
  $("edge-reveal-desc").textContent = e.desc;
  const bonusEl = $("edge-reveal-bonus");
  if (bonus) { bonusEl.textContent = bonus; show(bonusEl); } else { hide(bonusEl); }
  show($("overlay-edge"));
}

// Identity: read-only display of the four narrative answers (name is in the header).
// Hidden entirely when none are set (older/imported saves).
function renderIdentity() {
  const id = character.identity || {};
  const list = $("identity-list");
  list.innerHTML = "";
  let any = false;
  IDENTITY_QS.forEach((it) => {
    const val = (id[it.key] || "").trim();
    if (!val) return;
    any = true;
    const qa = ce("div", "identity-qa");
    qa.appendChild(ce("p", "identity-q", it.q));
    qa.appendChild(ce("p", "identity-a", val));
    list.appendChild(qa);
  });
  $("identity-section").classList.toggle("hidden", !any);
}

// ---------- Handbook (teaching + reference) ----------

let handbookFrom = "screen-intro";

function openHandbook(fromId) {
  handbookFrom = fromId;
  hide($(fromId));
  renderHandbook("howto");
  show($("screen-handbook"));
  window.scrollTo(0, 0);
}

function closeHandbook() {
  hide($("screen-handbook"));
  show($(handbookFrom));
}

function renderHandbook(section) {
  const nav = $("handbook-nav");
  nav.textContent = "";
  HANDBOOK_SECTIONS.forEach((s) => {
    const b = ce("button", "handbook-nav-btn" + (s.id === section ? " active" : ""), s.label);
    b.addEventListener("click", () => renderHandbook(s.id));
    nav.appendChild(b);
  });
  const body = $("handbook-body");
  body.textContent = "";
  if (section === "howto" || section === "world") {
    const sections = section === "howto" ? HOWTO_SECTIONS : WORLD_SECTIONS;
    sections.forEach((sec) => {
      body.appendChild(ce("h3", "howto-h", sec.h));
      body.appendChild(ce("p", "howto-p", sec.p));
    });
  } else if (section === "rules") {
    RULES_TOPICS.forEach((t) => {
      const topic = ce("div", "rules-topic");
      const head = ce("button", "rules-topic-head");
      head.setAttribute("aria-expanded", "false");
      head.appendChild(ce("span", "rules-topic-title", t.title));
      head.appendChild(ce("span", "rules-topic-caret", "›"));
      const bodyEl = ce("div", "rules-topic-body hidden");
      t.paras.forEach((p) => bodyEl.appendChild(ce("p", "rules-p", p)));
      head.addEventListener("click", () => {
        const nowOpen = bodyEl.classList.toggle("hidden") === false;
        head.classList.toggle("open", nowOpen);
        head.setAttribute("aria-expanded", nowOpen ? "true" : "false");
      });
      topic.appendChild(head);
      topic.appendChild(bodyEl);
      body.appendChild(topic);
    });
  }
}

// Class abilities: display the character's four, unlocked by level (locked ones note when).
function renderAbilities() {
  const list = $("abilities-list");
  list.innerHTML = "";
  const abilities = CLASS_ABILITIES[character.cls] || [];
  abilities.forEach((a) => {
    const unlocked = character.level >= a.level;
    const row = ce("div", "ability-row" + (unlocked ? "" : " ability-locked"));
    row.appendChild(ce("p", "ability-name", "Level " + a.level + " · " + a.name));
    row.appendChild(ce("p", "ability-desc", unlocked ? a.desc : "Unlocks at level " + a.level + "."));
    list.appendChild(row);
  });
}

function renderSorceryTab() {
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
  $("spell-name-display").textContent = spell.name;
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
  pendingSave = null;
  $("diff-skill-name").firstChild.textContent = skill + " ";
  $("diff-skill-die").textContent = character.skills[skill];
  refreshWearyOverlay("overlay-difficulty");
  show($("overlay-difficulty"));
}

// A Save maps to a fixed skill and rolls against the GM's difficulty like any skill check.
function openSave(saveId) {
  const s = SAVES.find((x) => x.id === saveId);
  if (!s) return;
  pendingSkill = s.skill;
  pendingSave = s.label;
  $("diff-skill-name").firstChild.textContent = s.label + " Save ";
  $("diff-skill-die").textContent = character.skills[s.skill];
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
      hideRollReadout();
      verdictEl.innerHTML =
        '<div class="verdict-fail">' + SKULL_IMG +
        '<span class="fail-by">Failed by ' + (target - result) + '</span></div>';
      if (navigator.vibrate) navigator.vibrate(40);
    } else {
      hideRollReadout();
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
  const weary = effective !== target ? " (Weary)" : "";
  const label = pendingSave ? pendingSave + " Save · " + skill : skill;
  pendingSave = null;
  hide($("overlay-difficulty"));
  performRoll(die, effective, label + " " + die + " vs " + effective + "+" + weary, { tickSkill: skill });
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
      // Agile (Edge 18) removes the +2 unarmored penalty.
      const noArmor = (character.loadout.armor === "none" && !hasEdge(18)) ? 2 : 0;
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

// On a failed roll the rolled number and the context line are noise: the skull says "you failed".
// Hide both so only the skull (plus any mechanical readout) and TAP TO CONTINUE remain.
// closeResultOverlay() unhides them again for the next roll.
function hideRollReadout() {
  $("result-number").classList.add("hidden");
  $("result-context").classList.add("hidden");
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
let tlQueue = [];            // pending pushed messages, shown one pop-up at a time (in-memory)
let tlPopupOpen = false;     // a pop-up is currently displayed
let tlPopupLastFocus = null; // element to restore focus to when the queue empties

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

// ---- Character reporting (CAP-08: Party HUD snapshot) ----
// One read-only snapshot POSTed to the session on join and on any vital change
// (debounced). The GM only views it; the app stays authoritative for the character.

let tlReportTimer = null;

function tlBuildSnapshot() {
  const points = totalLP();
  return {
    name: character.name,
    class: character.cls,
    hp: { current: character.hpCur, max: character.hpMax },
    conditions: CONDITIONS.filter((c) => character.conditions[c.id]).map((c) => c.name),
    // roles[] is multi-select in-app; the HUD wants one. Send the first assigned (Tomas ruling), null if none.
    role: (character.roles && character.roles.length) ? character.roles[0] : null,
    initiativeMod: initContribution(),
    load: { points: points, burdened: lpState(points) !== "unburdened" }
  };
}

async function tlReportCharacter() {
  if (!tlSession || !tlPolling || !tlDevice) return;
  const sid = tlSession.sessionId;
  try {
    await tlApi("/api/v1/table-sessions/" + encodeURIComponent(sid) + "/character", {
      method: "POST",
      body: tlBuildSnapshot()
    });
    // Best-effort: any failure (403 after removal, offline) is non-fatal; the next change retries.
  } catch (e) { /* swallow */ }
}

function tlScheduleReport() {
  if (tlReportTimer) clearTimeout(tlReportTimer);
  tlReportTimer = setTimeout(tlReportCharacter, 500);
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
      tlReportCharacter(); // CAP-08: fill the GM's box immediately with the current snapshot
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
  tlClearPopups();
  $("tl-session-status").textContent = "At the table";
  $("tl-leave-btn").textContent = "Leave table";
  tlShowState("session");
  tlStartPolling();
}

function tlLeaveSession() {
  tlStopPolling();
  tlClearPopups();
  tlSession = null;
  tlClearBanner();
  tlRenderEntitlement();
  tlShowState("lobby");
}

function tlEndSession(reason) {
  tlStopPolling();
  tlClearPopups();
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

// ---- Pushed messages: fire-and-forget pop-ups (textContent only; one at a time) ----
//
// The GM pushes and moves on. Each newly-polled message becomes a dismissible pop-up.
// New arrivals queue behind the current one; dismissing the × reveals the next, so a
// burst of shares never buries the phone in stacked modals. The server's after=cursor
// already delivers each message once, and the cursor lives only in memory, so a dismissed
// pop-up cannot reappear and no dismissed-id set is needed.

function tlRenderMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) return;
  messages.forEach((m) => {
    if (m && (m.type === "secret_text" || m.type === "rule" || m.type === "image")) {
      tlQueue.push(m);
    }
  });
  if (!tlPopupOpen) tlShowNextPopup();
}

function tlShowNextPopup() {
  const m = tlQueue.shift();
  if (!m) { tlHidePopup(); return; }
  const card = tlBuildCard(m);
  if (!card) { tlShowNextPopup(); return; }   // unknown type: skip, try the next
  const body = $("tl-popup-body");
  body.textContent = "";
  body.appendChild(card);
  if (!tlPopupOpen) {
    tlPopupLastFocus = document.activeElement;
    document.addEventListener("keydown", tlPopupKeydown, true);
    show($("tl-popup"));
    tlPopupOpen = true;
  }
  $("tl-popup-close").focus();
}

function tlDismissPopup() {
  if (!tlPopupOpen) return;
  if (tlQueue.length) tlShowNextPopup();   // reveal the next queued share
  else tlHidePopup();
}

function tlHidePopup() {
  hide($("tl-popup"));
  $("tl-popup-body").textContent = "";
  tlPopupOpen = false;
  document.removeEventListener("keydown", tlPopupKeydown, true);
  if (tlPopupLastFocus && typeof tlPopupLastFocus.focus === "function") tlPopupLastFocus.focus();
  tlPopupLastFocus = null;
}

// Leaving, being removed, or the table closing clears everything pending and on screen.
function tlClearPopups() {
  tlQueue = [];
  tlHidePopup();
}

// Dialog keyboard contract: Esc dismisses; Tab is trapped on the sole focusable control (×).
function tlPopupKeydown(e) {
  if (!tlPopupOpen) return;
  if (e.key === "Escape") { e.preventDefault(); tlDismissPopup(); return; }
  if (e.key === "Tab") { e.preventDefault(); $("tl-popup-close").focus(); }
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
    // A revoked asset 404s: dismiss this pop-up quietly, no error state shown to the player.
    // Guard on isConnected so a late error from an already-dismissed image cannot close a later one.
    img.onerror = () => { if (img.isConnected) tlDismissPopup(); };
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

  // Creation wizard nav
  $("wiz-next").addEventListener("click", wizardNext);
  $("wiz-back").addEventListener("click", wizardBack);

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
  $("btn-how-to-play").addEventListener("click", () => openHandbook("screen-intro"));
  $("btn-handbook").addEventListener("click", () => openHandbook("screen-shell"));
  $("handbook-back").addEventListener("click", closeHandbook);

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
  $("tl-popup-close").addEventListener("click", tlDismissPopup);

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
  $("btn-recover").addEventListener("click", openRecovery);
  $("rec-firstaid").addEventListener("click", recoverFirstAid);
  $("rec-breather").addEventListener("click", recoverBreather);
  $("rec-rest").addEventListener("click", recoverRest);
  $("rec-done").addEventListener("click", () => hide($("overlay-recovery")));

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
  // Item picker dropdown: open on focus, filter on input, close on blur/Escape.
  $("inv-name").addEventListener("focus", (e) => renderGearSuggest(e.target.value));
  $("inv-name").addEventListener("input", (e) => renderGearSuggest(e.target.value));
  $("inv-name").addEventListener("blur", () => hideGearSuggest());
  $("inv-name").addEventListener("keydown", (e) => { if (e.key === "Escape") hideGearSuggest(); });
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
  $("btn-improve-skills").addEventListener("click", improveSkills);
  $("improve-continue").addEventListener("click", improveNext);
  $("saves-row").addEventListener("click", (e) => {
    const btn = e.target.closest(".save-btn");
    if (btn) openSave(btn.dataset.save);
  });

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

  // Advancement: Level + Edges (HOME)
  $("level-minus").addEventListener("click", () => adjustLevel(-1));
  $("level-plus").addEventListener("click", () => adjustLevel(1));
  $("btn-roll-edge").addEventListener("click", rollEdge);
  $("edge-reveal-done").addEventListener("click", () => hide($("overlay-edge")));
  $("btn-level-up").addEventListener("click", levelUp);
  $("levelup-done").addEventListener("click", () => hide($("overlay-levelup")));
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
