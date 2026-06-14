# Project documentation

This folder holds design specs and implementation plans produced through the **superpowers** workflow Claude uses on this project.

- `specs/` — design specs (the *what* and *why*). One markdown file per project, named `YYYY-MM-DD-<topic>-design.md`. Each spec captures the locked-in decisions from a brainstorming session before any code is written.
- `plans/` — implementation plans (the *how*). One markdown file per project, named `YYYY-MM-DD-<topic>.md`. Each plan decomposes a spec into bite-sized, sequenced tasks with exact code, file paths, and verification commands.

The convention is: brainstorm → spec → plan → execute. Specs and plans are committed to git so the reasoning travels with the code.

## Existing documents

- `specs/2026-05-27-website-redesign-design.md` — the original redesign spec (Manrope typography, white + editorial blue palette, hero photography, faceted browsing, five-category taxonomy).
- `plans/2026-05-27-website-redesign.md` — the 12-task implementation plan that built the redesign.
- `specs/2026-06-11-quiet-magazine-redesign-design.md` — the Quiet Magazine visual refresh (featured homepage, illustrated card grids, breakout heroes, prev/next nav).
- `specs/2026-06-11-image-manifest.md` — the AI-generated hero illustration manifest (seeds, prompts, alt text, file sizes).
- `plans/2026-06-11-quiet-magazine-redesign.md` — the implementation plan for the Quiet Magazine redesign.
- `specs/2026-06-13-api-spine-foundation-design.md` — the Phase-1 platform-spine design (the `api.awonderfullife.ca` Worker, Cloudflare Access gating, D1).
- `plans/2026-06-13-api-spine-foundation.md` — the task-by-task plan that built the spine.
