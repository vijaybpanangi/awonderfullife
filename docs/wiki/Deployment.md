<sub>[Home](Home) › Operations › Deployment and release</sub>

# Deployment and release

How a change reaches production, and how it is recorded. Both Workers deploy from GitHub `main` through Cloudflare Workers Builds: the site on every push, the API on pushes that touch `api/`. There is no staging environment and no deploy workflow in GitHub. Every release then gets a semver tag on its merge commit, a `CHANGELOG.md` entry and a row in the README release table.

> [!NOTE]
> **At a glance:**
> - Site: push to `main`, Workers Build runs `npm ci && npm run build`, uploads `_site/`; live in about 30 seconds.
> - API: push to `main` touching `api/*`, Workers Build runs `npm ci` then `npx wrangler deploy` from `api/`; `cd api && npm run deploy` still works by hand.
> - D1 migrations are never applied by a build; run them deliberately with Wrangler.
> - Versioning: major for a redesign or structural shift, minor for a feature, patch for a fix, content or docs.

## The path of a change

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6","cScale0":"#F3F1EF","cScaleLabel0":"#221F1E","cScaleInv0":"#8A817C","cScale1":"#FDE8EC","cScaleLabel1":"#7A0A20","cScaleInv1":"#E0193B","cScale2":"#E6F2FC","cScaleLabel2":"#123E66","cScaleInv2":"#2E7CC0","cScale3":"#FDF3DC","cScaleLabel3":"#5E4004","cScaleInv3":"#E39A0D","cScale4":"#F0EBFC","cScaleLabel4":"#3B2B70","cScaleInv4":"#7A5BD6","cScale5":"#E4F7EB","cScaleLabel5":"#0A4F25","cScaleInv5":"#18A04B","cScale6":"#F3F1EF","cScaleLabel6":"#221F1E","cScaleInv6":"#8A817C","cScale7":"#E6F2FC","cScaleLabel7":"#123E66","cScaleInv7":"#2E7CC0","cScale8":"#FDF3DC","cScaleLabel8":"#5E4004","cScaleInv8":"#E39A0D","cScale9":"#F0EBFC","cScaleLabel9":"#3B2B70","cScaleInv9":"#7A5BD6","cScale10":"#E4F7EB","cScaleLabel10":"#0A4F25","cScaleInv10":"#18A04B","cScale11":"#F3F1EF","cScaleLabel11":"#221F1E","cScaleInv11":"#8A817C","git0":"#F3F1EF","gitBranchLabel0":"#221F1E"}}}%%
gitGraph
  commit id: "main"
  branch feature
  checkout feature
  commit id: "change"
  commit id: "CHANGELOG, README row"
  checkout main
  merge feature id: "merge = deploy"
  commit id: "tag vX.Y.Z" type: HIGHLIGHT
```
*Read left to right: work happens on a branch, the merge to `main` triggers the Workers Builds, and the merge commit is tagged with the release number.*

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":55}}}%%
flowchart LR
  M["🛠️ Merge to main"]:::infra --> Q{"Touches api/?"}:::ours
  M --> SB["⚙️ Site Workers Build<br/>npm ci, npm run build"]:::infra
  SB --> SL["✅ awonderfullife.ca<br/>new _site/"]:::good
  Q -- "yes" --> AB["⚙️ API Workers Build<br/>npm ci, wrangler deploy"]:::infra --> AL["✅ api.awonderfullife.ca"]:::good
  Q -- "no" --> NO["API unchanged"]:::infra
  MG["Migration needed?"]:::ours -. "by hand,<br/>before or after" .-> D1[("🗄️ D1")]:::store
classDef ours fill:#FDE8EC,stroke:#E0193B,stroke-width:1.5px,color:#7A0A20
classDef community fill:#E6F2FC,stroke:#2E7CC0,stroke-width:1.5px,color:#123E66
classDef official fill:#F0EBFC,stroke:#7A5BD6,stroke-width:1.5px,color:#3B2B70
classDef user fill:#FDF3DC,stroke:#E39A0D,stroke-width:1.5px,color:#5E4004
classDef good fill:#E4F7EB,stroke:#18A04B,stroke-width:1.5px,color:#0A4F25
classDef infra fill:#F3F1EF,stroke:#8A817C,stroke-width:1.5px,color:#221F1E
classDef store fill:#FFFFFF,stroke:#221F1E,stroke-width:2px,color:#221F1E
```
*Read left to right: every merge rebuilds the site; only API changes redeploy the API; database migrations are a separate, manual step.*

## Releasing, step by step

1. Branch from `main`, make the change, run `npm run build` (and `cd api && npm test` for API changes).
2. Add a `CHANGELOG.md` entry at the top, headed with the version, a title and the UTC merge time, in the same format as the entries already there.
3. Add a row to the README "Release history" table: version, time, PR link, summary.
4. Open a pull request and merge it.
5. Tag the merge commit: `git tag -a vX.Y.Z -m "vX.Y.Z: summary" && git push origin vX.Y.Z`.
6. Watch the build in the Cloudflare dashboard and check the live site.

## Versioning rules

| Bump | When | Examples |
|---|---|---|
| **Major** | redesign, identity or structural shift | v2.0.0 Quiet Magazine; v3.0.0 Eleventy |
| **Minor** | new feature or notable enhancement | v3.1.0 dark mode; v3.4.0 appreciate |
| **Patch** | fix, content, docs | v3.5.2 portrait cache fix; v3.5.4 new post |

Tags were back-filled to v1.0.0 on 2026-06-15 (v2.4.1). Latest tag: `v3.5.7` (2026-07-16).

## Deploy history in short

| Period | Site deploy | API deploy |
|---|---|---|
| **2026-05-27 to 2026-07-10** | Workers Build, no build step, repo root as assets (with `.assetsignore`) | from 2026-06-13: `cd api && npm run deploy` by hand |
| **2026-06-20 onward** | same | Workers Build on `api/*` changes |
| **2026-07-10 onward (v3.0.0)** | Workers Build `npm ci && npm run build`, assets `./_site` | same |

> [!WARNING]
> The v3.0.0 cut-over needed the site build command set in the dashboard **before** the merge, because the merge also moved the asset directory to `./_site`. Any future change to the build command or output folder must be made in the dashboard and in `wrangler.jsonc` together.

## Rolling back

- **Fastest:** Cloudflare dashboard, the Worker, **Deployments**, pick the last good one, **Rollback**. No rebuild.
- **Cleanest:** `git revert` the bad merge and push; the Workers Build redeploys. Git and production stay in step.
- **Database:** D1 has point-in-time recovery (Time Travel) in the dashboard and Wrangler; there are no down migrations in the repo.

## Related pages
- [Release history](Release-History): every release made this way.
- [GitHub Actions](GitHub-Actions): why deploys are not in Actions.
- [Cloudflare](Cloudflare): the Workers Build settings.
- [Runbooks](Runbooks): migrations, rollbacks, secrets.
- [Build pipeline](Build-Pipeline): what the site build does.

Last checked: 2026-11-09

<details><summary>Sources in the repo</summary>

- `wrangler.jsonc`, `api/wrangler.jsonc`, `package.json`, `api/package.json`
- `CLAUDE.md` (Build, run, deploy; Releases and versioning), `README.md`, `CHANGELOG.md` (v2.4.1, v3.0.0), `ROADMAP.md`
- `git tag`
</details>
