# TYSTNAD Companion

## What this is

Player companion PWA for TYSTNAD, a dark fantasy tabletop RPG published by Tomas Egeborg (Groggy Gremlin). One Explorer, one screen, at the table. Live at https://groggygremlin.github.io/TYSTNADAPP/ from this PUBLIC repository via GitHub Pages.

The app is a die and a sheet, not a referee. The GM sets all difficulties, announces all Threat tiers, rolls party Initiative, and adjudicates all outcomes, including death.

## Your role

Implement scoped patches exactly as requested. Design decisions belong to Tomas. When unsure between two approaches, present both and let him choose. Do not invent features beyond the requested scope. Do not refactor unrelated code. Keep diffs minimal.

Present your plan before editing files on any task larger than a one-line fix. Never commit or push until Tomas explicitly orders it. Push equals deploy.

## Canon and reference files

* `canon/players/*.txt` = Players Booklet v2.5, page by page. `canon/gm/*.txt` = GM Booklet v1.6.
* Search canon BEFORE implementing or changing any game mechanic. Never guess a rule. Grep the .txt files; read only the relevant pages.
* The PDFs (canon/) always win over vault notes when they conflict. Flag conflicts to Tomas instead of resolving them silently.
* The Obsidian vault (MAXIMUS/ directory, access granted via .claude/settings.local.json) holds design notes. `MAXIMUS/TYSTNAD APP.md` is the app's design record: read its Status block at the start of any feature work. NEVER edit vault files without Tomas's explicit confirmation in the session.
* Before touching export/share, the service worker, or background layers, read the Hard-Won Platform Lessons section of MAXIMUS/TYSTNAD APP.md. Those bugs cost days; do not rediscover them.
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

## Tech constraints

* Vanilla JavaScript, HTML, CSS. No frameworks, no build step, no runtime dependencies. Ever.
* The sw.js asset cache list is the authoritative inventory of deployed files. Every deployed file must be listed there; never add, rename, or remove a deployed file without updating that list in the same patch. The current list and count live in the Tech section of MAXIMUS/TYSTNAD APP.md.
* All data in localStorage, key "tystnad-character". When the character schema changes, add migration in migrate() for older saves.
* Palette for all UI and CSS: bg #0c0a0b, panel #171416, bone #cfc9c0, ash #7d766f, blood #a11e24 / #d92b32, ember-light #d97a24, ember-strong #b96a33. No colors outside this palette in styles. Artwork assets (backgrounds, skull, icons, logo) are exempt; they are approved image files, not style choices.
* Phone-first. Tap targets 44px or larger. The death flood is the app's only dramatic visual; everything else stays clinical.

## Workflow, ALWAYS

* IMPORTANT: bump the CACHE version in sw.js (tystnad-vN to vN+1) in EVERY patch that changes any file. Without it, installed phones serve stale files.
* Run the jsdom smoke test before declaring any patch done. Extend assertions whenever the patch changes DOM structure, app logic, or the deployed file list. jsdom quirks: use url "http://localhost/" (for working localStorage), runScripts "outside-only", eval app.js inside the window load event, then dispatch DOMContentLoaded manually once.
* npm/jsdom are local test tooling ONLY and never get committed (gitignored along with smoke.js and package files).
* When a patch lands new or replaced asset files, verify them by byte size against the sizes stated in the spec before committing. Wrong size means the wrong file; stop and report.
* One commit per logical change with a short message. Push to main deploys via GitHub Pages, and only on Tomas's explicit order.
* If a Pages run sits in Queued and refuses to cancel: `git commit --allow-empty -m "Nudge deployment"` then `git push`.
* Immediately after every ordered push, update MAXIMUS/TYSTNAD APP.md without asking. This standing authorization covers that ONE file and that one step only; every other vault file, and any other kind of edit to the record, still requires Tomas's explicit confirmation in the session. Follow record discipline strictly: one version, one history entry. Append the new entry after the previous version's entry; NEVER merge text into an existing entry. Each entry states what changed, schema changes or "No schema change", the cache step (tystnad-vN to vN+1), and the assertion count. Update the Status block, the Tech file list, and any stale version references in the same edit.
