<sub>[Home](Home) › Architecture › Site architecture</sub>

# Site architecture

awonderfullife.ca is two independent Cloudflare Workers built from one repository. The **site Worker** (`awonderfullife`, repo root) has no code of its own: it serves the static files Eleventy writes to `_site/`, with headers from `_headers`. The **API Worker** (`awonderfullife-api`, folder `api/`) is TypeScript on the Workers runtime: it answers the browser features that need a server, runs a cron every 15 minutes, and owns the only database, a D1 SQLite database. Each Worker has its own Cloudflare Workers Build, so a push to `main` rebuilds whichever side changed. The split keeps reading fast and unbreakable: if the API is down, every page still loads.

> [!NOTE]
> **At a glance:**
> - Site Worker: static assets only, `assets.directory: ./_site`, clean URLs via `html_handling: auto-trailing-slash`.
> - API Worker: custom domain `api.awonderfullife.ca`, `workers_dev` off, D1 binding `DB`, Workers AI binding `AI`, cron `*/15 * * * *`.
> - Browsers talk to the API cross-origin (CORS allows only the apex and `www` origins).
> - Owner routes under `/admin` are gated by Cloudflare Access at the edge and re-verified in code.
> - No server-side rendering: pages are built once at deploy time.

## Context

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":55}}}%%
flowchart LR
  subgraph People["Who uses it"]
    direction TB
    R["👤 Readers<br/>in a browser"]:::user
    O["👤 Owner<br/>signed in with Access"]:::user
    N["📱 Namaz users<br/>from the App Store"]:::user
  end
  SYS["⚙️ awonderfullife.ca<br/>two Workers, one D1"]:::ours
  subgraph Services["Services it relies on"]
    direction TB
    RS["Resend<br/>sends email"]:::official
    TS["Turnstile<br/>bot check"]:::official
    AI["Workers AI<br/>comment check"]:::official
    GF["Google Fonts<br/>Manrope"]:::official
  end
  GH["🛠️ GitHub<br/>source of truth"]:::infra
  R --> SYS
  O --> SYS
  N --> SYS
  SYS --> RS
  SYS --> TS
  SYS --> AI
  R -. "font files" .-> GF
  GH == "Workers Builds" ==> SYS
classDef ours fill:#FDE8EC,stroke:#E0193B,stroke-width:1.5px,color:#7A0A20
classDef community fill:#E6F2FC,stroke:#2E7CC0,stroke-width:1.5px,color:#123E66
classDef official fill:#F0EBFC,stroke:#7A5BD6,stroke-width:1.5px,color:#3B2B70
classDef user fill:#FDF3DC,stroke:#E39A0D,stroke-width:1.5px,color:#5E4004
classDef good fill:#E4F7EB,stroke:#18A04B,stroke-width:1.5px,color:#0A4F25
classDef infra fill:#F3F1EF,stroke:#8A817C,stroke-width:1.5px,color:#221F1E
classDef store fill:#FFFFFF,stroke:#221F1E,stroke-width:2px,color:#221F1E
```
*Read left to right: three kinds of visitor reach one system on Cloudflare, which leans on four outside services; GitHub feeds every deploy.*

## Containers

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":55}}}%%
flowchart TB
  B["🌐 Browser"]:::user
  subgraph Edge["Cloudflare edge"]
    direction LR
    SW["⚙️ awonderfullife<br/>static assets"]:::ours
    ACC["🔐 Cloudflare Access<br/>/admin paths"]:::infra
    AW["⚙️ awonderfullife-api<br/>fetch + scheduled"]:::ours
  end
  A[("_site/<br/>HTML, CSS, JS,<br/>images, pagefind")]:::store
  D[("🗄️ D1<br/>subscribers, issues,<br/>comments, reactions")]:::store
  B -- "GET pages" --> SW
  SW --> A
  B -- "subscribe, comments,<br/>reactions (CORS)" --> AW
  B -- "/admin/compose" --> ACC --> AW
  AW <--> D
  CRON["⚙️ Cron<br/>every 15 min"]:::infra --> AW
classDef ours fill:#FDE8EC,stroke:#E0193B,stroke-width:1.5px,color:#7A0A20
classDef community fill:#E6F2FC,stroke:#2E7CC0,stroke-width:1.5px,color:#123E66
classDef official fill:#F0EBFC,stroke:#7A5BD6,stroke-width:1.5px,color:#3B2B70
classDef user fill:#FDF3DC,stroke:#E39A0D,stroke-width:1.5px,color:#5E4004
classDef good fill:#E4F7EB,stroke:#18A04B,stroke-width:1.5px,color:#0A4F25
classDef infra fill:#F3F1EF,stroke:#8A817C,stroke-width:1.5px,color:#221F1E
classDef store fill:#FFFFFF,stroke:#221F1E,stroke-width:2px,color:#221F1E
```
*Read top to bottom: pages come from the static Worker; anything a reader sends goes to the API Worker; the owner's pages pass through Access first; the cron wakes the API Worker on its own.*

## The two Workers side by side

| | Site Worker | API Worker |
|---|---|---|
| **Name** | `awonderfullife` | `awonderfullife-api` |
| **Config** | `wrangler.jsonc` | `api/wrangler.jsonc` |
| **Code** | none (assets only) | `api/src/index.ts` and modules |
| **Domain** | `awonderfullife.ca`, `www` (301 to apex by a Redirect Rule) | `api.awonderfullife.ca` (custom domain) |
| **Bindings** | none | `DB` (D1), `AI` (Workers AI) |
| **Triggers** | HTTP | HTTP and cron `*/15 * * * *` |
| **Build** | `npm ci && npm run build` | `npm ci`, then `npx wrangler deploy` (root `api`) |
| **Deploys when** | any push to `main` | a push to `main` touching `api/*` |
| **Tests** | none (visual check) | 61 Vitest tests in workerd |
| **compatibility_date** | `2026-05-27` (`nodejs_compat`) | `2026-06-13` |

## Inside the API Worker

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":55}}}%%
flowchart LR
  F["fetch()<br/>index.ts router"]:::ours
  F --> H["/health"]:::ours
  F --> SU["/subscribe<br/>/unsubscribe"]:::ours
  F --> CM["comments.ts<br/>/comments"]:::ours
  F --> RE["reactions.ts<br/>/reactions"]:::ours
  F --> AD["admin.ts<br/>/admin/*"]:::ours
  AD --> AX["access.ts<br/>JWT check"]:::ours
  SU --> TU["turnstile.ts"]:::ours
  CM --> TU
  S["scheduled()<br/>every 15 min"]:::ours --> SS["runScheduledSend"]:::ours
  S --> MO["runCommentModeration"]:::ours
  S --> PU["purgeReactionEvents"]:::ours
  AD --> RN["render.mjs<br/>schedule.mjs"]:::ours
classDef ours fill:#FDE8EC,stroke:#E0193B,stroke-width:1.5px,color:#7A0A20
classDef community fill:#E6F2FC,stroke:#2E7CC0,stroke-width:1.5px,color:#123E66
classDef official fill:#F0EBFC,stroke:#7A5BD6,stroke-width:1.5px,color:#3B2B70
classDef user fill:#FDF3DC,stroke:#E39A0D,stroke-width:1.5px,color:#5E4004
classDef good fill:#E4F7EB,stroke:#18A04B,stroke-width:1.5px,color:#0A4F25
classDef infra fill:#F3F1EF,stroke:#8A817C,stroke-width:1.5px,color:#221F1E
classDef store fill:#FFFFFF,stroke:#221F1E,stroke-width:2px,color:#221F1E
```
*Read left to right: one router fans out to five route groups; the scheduled handler runs three jobs on every tick.*

Design choices that matter:

- **Dependency injection for tests.** `createWorker(overrides)` takes stand-ins for `getAccessEmail`, `verifyTurnstile` and `sendBatch`, so tests never call Cloudflare Access, Turnstile or Resend.
- **One email template.** `src/render.mjs` is plain JavaScript so both the Worker and the Node CLI (`scripts/send-issue.mjs`) render issues identically.
- **Graceful degradation.** No `RESEND_API_KEY`: scheduled sends skip. No `COMMENT_SECRET`: comments still work, one email per comment. No `AI`: moderation uses heuristics only. No `REACTION_SALT`: `POST /reactions` returns 503, reads still work.

## Why this shape

The blog started as a static site on Cloudflare Workers Static Assets (May 2026). When the owner wanted an owned newsletter, adding a second Worker on a subdomain kept the static site untouched and cacheable, and let the API grow (newsletter, comments, reactions) without ever putting a server in the path of a page view. See the [Decisions log](Decisions-Log).

## Related pages
- [Technology stack](Technology-Stack): each tool in these diagrams.
- [Build pipeline](Build-Pipeline): how `_site/` is made.
- [Page lifecycle](Page-Lifecycle): one request, step by step.
- [Cloudflare](Cloudflare): every Cloudflare product in use.
- [API reference](API-Reference): every route.
- [Data flow end to end](Data-Flow-End-to-End): the data that crosses these boxes.

Last checked: 2026-11-09

<details><summary>Sources in the repo</summary>

- `wrangler.jsonc`, `api/wrangler.jsonc`, `_headers`
- `api/src/index.ts`, `api/src/scheduled.ts`, `api/src/comments.ts`, `api/src/reactions.ts`, `api/src/admin.ts`
- `CLAUDE.md` (The API worker), `docs/superpowers/specs/2026-06-13-api-spine-foundation-design.md`
</details>
