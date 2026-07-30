# TYSTNAD Companion

## What this is

Player companion PWA for TYSTNAD, a dark fantasy tabletop RPG published by Tomas Egeborg (Groggy Gremlin). One Explorer, one screen, at the table. Live at https://groggygremlin.github.io/TYSTNADAPP/ from this PUBLIC repository via GitHub Pages.

The app is a die and a sheet, not a referee. The GM sets all difficulties, announces all Threat tiers, rolls party Initiative, and adjudicates all outcomes, including death.

## Phase 2: POLISH (feature freeze, in force)

IMPORTANT: Tomas ruled a feature freeze on 2026-07-22, effective immediately, binding the GM site, the Owlbear Rodeo panel, and this app. It ends only on Tomas's explicit order in session. There is no end date and no expiry, and nothing is inferred from a passing mention of a new idea. While it holds, this section outranks every scope instruction below it: a request that reads as in scope elsewhere in this file is still frozen if it fails the test here.

Allowed, and nothing else:

1. Text edits
2. Bug fixes
3. Graphical enhancements
4. Testing
5. Content re-arrangements
6. Completion of content of a kind that already ships

The tie-breaker: it is a FEATURE, and frozen, if it adds a new user-reachable capability, a new route or endpoint, a new stored field, a new cache entry, a new entitlement, or a new dependency. It is ALLOWED if it changes how an existing capability looks, reads, or behaves correctly, or fills in content of a kind that already ships. In doubt equals frozen: stop and ask Tomas.

Why this exists, because the reason changes what you do. A week of fast feature work outran Tomas's own knowledge of what shipped, to the point where he does not trust the texts the app presents to players. The phase's real work is a verification pass: read, check and correct everything the app says on screen, against canon and against what the code actually does. The freeze holds the ground still while that happens. Reading it as "build less" is a misreading. The correct reading is "go back over what you already built, and make it true."

Clauses that stop it leaking:

* Flags are flagged, never fixed. A DEBT flag found now goes in the report and nowhere near the code.
* A blocker that can only be fixed by building something escalates to Tomas, and is not built.
* Do not propose features. Not as an aside, not as a "while we're here", not as a suggestion in a completion report. Record it for after the freeze.
* Only Tomas lifts it, explicitly.

## Your role

Implement scoped patches exactly as requested. Design decisions belong to Tomas. When unsure between two approaches, present both and let him choose. Do not invent features beyond the requested scope. Do not refactor unrelated code. Keep diffs minimal.

Present your plan before editing files on any task larger than a one-line fix. Never commit or push until Tomas explicitly orders it. Push equals deploy.

## Canon and reference files

* `canon/players/*.txt` = Players Booklet v2.5, page by page. `canon/gm/*.txt` = GM Booklet v1.6.
* Search canon BEFORE implementing or changing any game mechanic. Never guess a rule. Grep the .txt files; read only the relevant pages.
* The PDFs (canon/) always win over vault notes when they conflict. Flag conflicts to Tomas instead of resolving them silently.
* The Obsidian vault holds design notes. ONE master vault since 2026-07-20: `/Users/tegeborg/Documents/Obsidian_GG_AB/GroggyGremlin_AB`, access granted via .claude/settings.local.json. Cite vault documents by full path from the vault root. The pre-migration `MAXIMUS/` and `DEV/` shorthands resolve to nothing.
* `SOFTWARE_DEV/COMPANION_APP/TYSTNAD APP.md` is the app's design record: read its Status block at the start of any feature work. Everything app-side lives under `SOFTWARE_DEV/COMPANION_APP/`, with handover contracts in its `HANDOVERS/` subfolder. NEVER edit vault files without Tomas's explicit confirmation in the session.
* IMPORTANT: two retired vaults remain on disk under `Documents/The Dawn Of Kythera/`, suffixed `_RETIRED_20260720`. NEVER read or write them. They hold superseded copies of every document above, so a write that lands there looks like success and changes nothing real.
* Before touching export/share, the service worker, or background layers, read the Hard-Won Platform Lessons section of `SOFTWARE_DEV/COMPANION_APP/TYSTNAD APP.md`. Those bugs cost days; do not rediscover them.
* IMPORTANT: canon/ contains the full text of PAID products. It is gitignored. NEVER commit, push, or copy canon content into any committed file. Never quote more than a rule's numbers into code comments.

## Hard rules, game canon (PB v2.5)

* Difficulty tiers: Easy 4+, Normal 5+, Hard 6+. Monster Threat tiers for Defense: Weak 4+, Standard 5+, Strong 6+.
* Skills (8): Athletics, Awareness, Combat, Finesse, Ingenuity, Lore, Presence, Sorcery. Dice ladder d6, d8, d10, d12, d20 (d20 core skill only).
* Defense die caps at d12 globally. No exceptions.
* No healing via Sorcery. Ever.
* Death Roll: 0 HP d20, -1 d12, -2 d10, -3 d8, -4 or below d6. Target always 5. Survive = unconscious 1d6 rounds.
* Weary (condition) shifts every roll target up one step (Easy 4+ to 5+, Normal 5+ to 6+, Hard stays 6+), including casting and Defense. The Death Roll is exempt: its target is always 5.
* Casting: Tier 1 costs 1 HP at 4+, Tier 2 costs 2 HP at 5+, Tier 3 costs 3 HP at 6+. Cost is paid on success, failure, and death alike. Cost dropping HP to 0 or below skips the Sorcery roll and forces an immediate Death Roll.
* Load Points: 30 max. 0-23 Unburdened. 24-27 Heavy. 28-30 Overloaded. Every started 100 coins = 1 LP.
* Initiative contribution: armor None +2 / Light +1 / Medium 0 / Heavy -1; weapon Light or unarmed +1 / Standard 0 / Heavy -1.
* All user-facing text: he/him as neutral pronoun, second person for the reader, NO em-dashes anywhere, positive declarative voice.

## Hard rules, app authority

* Never auto-deduct HP, with ONE exception: spell casting costs (exact and canonical).
* Never auto-roll the Death Roll, with ONE exception: canon's cast-into-death rule routes there automatically after a deliberate tier tap.
* Never roll party Initiative. The app shows the character's contribution only.
* Load states warn, never block (inventory data may be stale; rulings belong to the table).
* Conditions are toggled by the player and displayed by the app. The app never auto-applies a condition, never auto-damages from one, and never blocks an action because of one. The Weary target shift is the single sanctioned mechanical effect.
* On a failed Death Roll the app changes NOTHING. No locking, no prompts, no auto-abandon.
* Nothing GM-facing. No opposed rolls. The app never sets difficulty.

## Defense die semantics (v44)

`character.defense` is the BASE Defense die (what the class grants). The effective die shown in the Defense overlay and used in Defense rolls is derived at read time by `effectiveDefense()`: no armor and light armor leave the die unchanged; medium armor steps it up 1; heavy armor steps it up 2. The effective die is capped at d12 globally. A character with no armor takes +2 extra damage on a failed Defense roll (the `noArmor` penalty in `performRollDefense`). Per-class starting loadouts: Warrior medium/standard, Rogue light/light, Scholar medium/standard, Sorcerer none/light.

## Visual identity laws (v46)

* Law 1 -- Blood contrast: Use `var(--blood-bright)` (#d92b32) for all text-color uses on labels, headers, and chips. `var(--blood)` (#a11e24) is reserved for borders, backgrounds, and very large display text (2rem+). Any new text rule using blood must use blood-bright. Red marks structure; red never carries mechanics or data (use bone for those).
* Law 2 -- Text floor: No font-size below 0.75rem. When adding new labels or chips, start at 0.75rem. Section headers are display elements: Cormorant Garamond, 1.5rem, blood-bright, weight 600, letter-spacing 0.06em. Apply via `.shell-screen .field-label`, `.vital-label`, and `.spell-tier-header`.
  * **Exception, ruled by Tomas 2026-07-29 (v117):** `.init-block-row .vital-label` is 1.1rem. The Combat tab's Initiative label stopped being a section header at v106, when it moved inline to sit beside its own value, and at 1.5rem its caps broke to three lines and held the block at 105px against the half-height Tomas asked for. Scoped to that one block; `.vital-label` itself remains 1.5rem and only one element wears the class. Assertions 1535 to 1539 hold both halves, so the exception cannot spread and cannot be "corrected" back.
* Law 3 -- Cost and survival text: `.spell-cost-line`, `.survive-note`, and `.tier-mech` use `var(--bone)`, not ash. Spell costs, death-survival notices, and tier mechanics are primary information.
* Law 4 -- Navigation (v47): Icon-based nav with active-label chip. Five inline SVG stroke glyphs in index.html (ratified 2026-07-08): house/HOME, hexagon/EXPEDITION, bolt/COMBAT, bag/GEAR, flame/SORCERY. Inactive tabs show icon only; active tab shows icon plus full name in a panel-hi chip. `.tab-label` is hidden by default, `display: inline` on `.tab-btn.active`. `.tab-btn` is a flex row with 48px min-height, no font-size. `.tab-bar--five` class and toggle are fully removed. First tab is HOME (JS panel ID and data-tab remain `sheet`). `aria-label` is mandatory on every button.
* Zoom: `user-scalable=no` is removed from the viewport meta. `touch-action: manipulation` on `html` prevents double-tap zoom without blocking pinch.

## Tech constraints

* Vanilla JavaScript, HTML, CSS. No frameworks, no build step, no runtime dependencies. Ever.
* IMPORTANT: "no third-party runtime scripts" is a SECURITY BOUNDARY, not a style preference. The Table Link device token lives in localStorage, which is safe ONLY because nothing else executes in this origin. An analytics tag, a support widget, or a hosted font or script served under the GitHub Pages origin would be able to read that token, and the player cannot revoke what he never knew was taken. Never widen `script-src` in the CSP casually, and never add a third-party script "just for a moment" to debug. If one is ever genuinely needed, the token must move out of localStorage first, and that is a design conversation with Tomas rather than a patch. Ratified 2026-07-22 on a peer reviewer's point that the token's safety is a property of the whole origin, not of the app's own code.
* The sw.js asset cache list is the authoritative inventory of deployed files. Every deployed file must be listed there; never add, rename, or remove a deployed file without updating that list in the same patch. The current list and count live in the Tech section of `SOFTWARE_DEV/COMPANION_APP/TYSTNAD APP.md`.
* All data in localStorage, key "tystnad-character". When the character schema changes, add migration in migrate() for older saves.
* Palette for all UI and CSS: bg #0c0a0b, panel #171416, bone #cfc9c0, ash #7d766f, blood #a11e24 / #d92b32, ember-light #d97a24, ember-strong #b96a33. No colors outside this palette in styles. Artwork assets (backgrounds, skull, icons, logo) are exempt; they are approved image files, not style choices.
* Phone-first. Tap targets 44px or larger. The death flood is the app's only dramatic visual; everything else stays clinical.

## Workflow, ALWAYS

* IMPORTANT: bump the CACHE version in sw.js (tystnad-vN to vN+1) in EVERY patch that changes a DEPLOYED file, and bump VERSION in app.js to match. Without it, installed phones serve stale files. The test is whether the change can reach a phone: everything in the sw.js ASSETS list always counts. Repo-only files that are never served (.gitignore, CLAUDE.md, smoke.js and other test tooling) do NOT get a bump, because bumping forces every installed phone to re-download every asset for a change it can never observe. Such a commit is also unversioned: it is not vN+1, since nothing a user can see changed. Ratified 2026-07-19.
* Run the jsdom smoke test before declaring any patch done. Extend assertions whenever the patch changes DOM structure, app logic, or the deployed file list. jsdom quirks: use url "http://localhost/" (for working localStorage), runScripts "outside-only", eval app.js inside the window load event, then dispatch DOMContentLoaded manually once.
* smoke.js IS committed (since 2026-07-19). It holds the assertions that enforce design rulings, and it must survive any one machine. node_modules and package files stay gitignored, and there is deliberately NO package.json: the app ships no dependencies and no build step, and a manifest holding a single devDependency would weaken that rule and attract Dependabot alerts for a library this project never serves. smoke.js documents its one dev dependency (`npm install jsdom`) in its own header instead. It is still not a deployed file, so it never triggers a cache bump.
* IMPORTANT: when a patch lands new or replaced BINARY asset files (fonts, images, icons), verify the MAGIC BYTES before committing, not only the byte size: `head -c4 file | xxd -p` and `file -b file`. woff2 starts `774f4632`, PNG `89504e47`, WebP `52494646` with `WEBP` at offset 8. Then check the size against the spec where one states it. Ratified 2026-07-21, after three CormorantGaramond woff2 files turned out to be GitHub "Page not found" HTML pages saved with a font extension: 311KB each, plausible size, correct content-type, HTTP 200, and Cormorant never rendered once from v26 to v91. Size, status and content-type all lie about a binary; the magic bytes do not. A close-enough fallback hides the failure from every human glance, and a screenshot will not show it.
* One commit per logical change with a short message. Push to main deploys via GitHub Pages, and only on Tomas's explicit order.
* If a Pages run sits in Queued and refuses to cancel: `git commit --allow-empty -m "Nudge deployment"` then `git push`.
* Immediately after every ordered push, update `SOFTWARE_DEV/COMPANION_APP/TYSTNAD APP.md` in the master vault without asking. This standing authorization covers that ONE file and that one step only; every other vault file, and any other kind of edit to the record, still requires Tomas's explicit confirmation in the session. Follow record discipline strictly: one version, one history entry. Append the new entry after the previous version's entry; NEVER merge text into an existing entry. Each entry states what changed, schema changes or "No schema change", the cache step (tystnad-vN to vN+1), and the assertion count. Update the Status block, the Tech file list, and any stale version references in the same edit.
