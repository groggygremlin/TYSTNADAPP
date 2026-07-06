# TYSTNAD Companion

## What this is

Player companion PWA for TYSTNAD, a dark fantasy tabletop RPG published by Tomas Egeborg (Groggy Gremlin). One Explorer, one screen, at the table. Live at https://groggygremlin.github.io/TYSTNADAPP/ from this PUBLIC repository via GitHub Pages.

The app is a die and a sheet, not a referee. The GM sets all difficulties, announces all Threat tiers, rolls party Initiative, and adjudicates all outcomes, including death.

## Your role

Implement scoped patches exactly as requested. Design decisions belong to Tomas. When unsure between two approaches, present both and let him choose. Do not invent features beyond the requested scope. Do not refactor unrelated code. Keep diffs minimal.

## Canon and reference files

- `canon/players/*.txt` = Players Booklet v2.5, page by page. `canon/gm/*.txt` = GM Booklet v1.6.
- Search canon BEFORE implementing or changing any game mechanic. Never guess a rule. Grep the .txt files; read only the relevant pages.
- The PDFs (canon/) always win over vault notes when they conflict. Flag conflicts to Tomas instead of resolving them silently.
- The Obsidian vault (MAXIMUS/ directory, added via --add-dir) holds design notes. `MAXIMUS/TYSTNAD APP.md` is the app's design record: read it at the start of any feature work. NEVER edit vault files without Tomas's explicit confirmation in the session.
- IMPORTANT: canon/ contains the full text of PAID products. It is gitignored. NEVER commit, push, or copy canon content into any committed file. Never quote more than a rule's numbers into code comments.

## Hard rules, game canon (PB v2.5)

- Difficulty tiers: Easy 4+, Normal 5+, Hard 6+. Monster Threat tiers for Defense: Weak 4+, Standard 5+, Strong 6+.
- Skills (8): Athletics, Awareness, Combat, Finesse, Ingenuity, Lore, Presence, Sorcery. Dice ladder d6, d8, d10, d12, d20 (d20 core skill only).
- Defense die caps at d12 globally. No exceptions.
- No healing via Sorcery. Ever.
- Death Roll: 0 HP d20, -1 d12, -2 d10, -3 d8, -4 or below d6. Target always 5. Survive = unconscious 1d6 rounds.
- Casting: Tier 1 costs 1 HP at 4+, Tier 2 costs 2 HP at 5+, Tier 3 costs 3 HP at 6+. Cost is paid on success, failure, and death alike. Cost dropping HP to 0 or below skips the Sorcery roll and forces an immediate Death Roll.
- Load Points: 30 max. 0-23 Unburdened. 24-27 Heavy. 28-30 Overloaded. Every started 100 coins = 1 LP.
- Initiative contribution: armor None +2 / Light +1 / Medium 0 / Heavy -1; weapon Light or unarmed +1 / Standard 0 / Heavy -1.
- All user-facing text: he/him as neutral pronoun, second person for the reader, NO em-dashes anywhere, positive declarative voice.

## Hard rules, app authority

- Never auto-deduct HP, with ONE exception: spell casting costs (exact and canonical).
- Never auto-roll the Death Roll, with ONE exception: canon's cast-into-death rule routes there automatically after a deliberate tier tap.
- Never roll party Initiative. The app shows the character's contribution only.
- Load states warn, never block (inventory data may be stale; rulings belong to the table).
- On a failed Death Roll the app changes NOTHING. No locking, no prompts, no auto-abandon.
- Nothing GM-facing. No opposed rolls. The app never sets difficulty.

## Tech constraints

- Vanilla JavaScript, HTML, CSS. No frameworks, no build step, no runtime dependencies. Ever.
- Exactly 7 deployed files: index.html, style.css, app.js, manifest.json, sw.js, icon-192.png, icon-512.png.
- All data in localStorage, key "tystnad-character". When the character schema changes, add migration in migrate() for older saves.
- Palette: bg #0c0a0b, panel #171416, bone #cfc9c0, ash #7d766f, blood #a11e24 / #d92b32. No colors outside this palette.
- Phone-first. Tap targets 44px or larger. The death flood is the app's only dramatic visual; everything else stays clinical.

## Workflow, ALWAYS

- IMPORTANT: bump the CACHE version in sw.js (tystnad-vN to vN+1) in EVERY patch that changes any file. Without it, installed phones serve stale files.
- For multi-feature patches, write and run a jsdom smoke test before declaring done. jsdom quirks: use url "http://localhost/" (for working localStorage), runScripts "outside-only", eval app.js inside the window load event, then dispatch DOMContentLoaded manually once.
- npm/jsdom are local test tooling ONLY and never get committed (gitignored along with smoke.js and package files).
- One commit per logical change with a short message. Push to main deploys via GitHub Pages.
- If a Pages run sits in Queued and refuses to cancel: `git commit --allow-empty -m "Nudge deployment"` then `git push`.
- After completing a feature, remind Tomas to update MAXIMUS/TYSTNAD APP.md, but only write to it after his explicit confirmation.
