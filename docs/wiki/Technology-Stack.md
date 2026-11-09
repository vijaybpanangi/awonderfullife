<sub>[Home](Home) › Architecture › Technology stack</sub>

# Technology stack

Every tool the project uses, what it does here, and why it was chosen. The stack is deliberately small: a static site generator with three dev dependencies, and an API Worker with two runtime dependencies. There is no front-end framework, no CSS framework and no bundler for the site; the browser gets one stylesheet and three tiny scripts.

> [!NOTE]
> **At a glance:**
> - Site: Eleventy 3 (Nunjucks and Markdown), markdown-it, Pagefind; Node 18 or newer.
> - API: TypeScript on Cloudflare Workers, `jose` for JWTs, `marked` for email Markdown.
> - Tests: Vitest 4 with `@cloudflare/vitest-pool-workers`, running in workerd against a local D1.
> - Hosting, data and security: Cloudflare Workers, Workers Builds, D1, Access, Turnstile, Workers AI; email by Resend.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":55}}}%%
flowchart TB
  subgraph Site["Static site (repo root)"]
    direction LR
    E["Eleventy 3<br/>Nunjucks + Markdown"]:::ours
    MI["markdown-it<br/>HTML on, typographer off"]:::ours
    PF["Pagefind<br/>search index"]:::ours
  end
  subgraph Api["API Worker (api/)"]
    direction LR
    TSX["TypeScript<br/>Workers runtime"]:::ours
    J["jose<br/>JWT verify and sign"]:::ours
    MK["marked<br/>issue Markdown"]:::ours
  end
  subgraph Plat["Cloudflare"]
    direction LR
    WK["Workers +<br/>Static Assets"]:::infra
    D1[("D1")]:::store
    AC["Access, Turnstile,<br/>Workers AI"]:::infra
  end
  RS["Resend"]:::official
  Site --> WK
  Api --> WK
  Api --> D1
  Api --> AC
  Api --> RS
classDef ours fill:#FDE8EC,stroke:#E0193B,stroke-width:1.5px,color:#7A0A20
classDef community fill:#E6F2FC,stroke:#2E7CC0,stroke-width:1.5px,color:#123E66
classDef official fill:#F0EBFC,stroke:#7A5BD6,stroke-width:1.5px,color:#3B2B70
classDef user fill:#FDF3DC,stroke:#E39A0D,stroke-width:1.5px,color:#5E4004
classDef good fill:#E4F7EB,stroke:#18A04B,stroke-width:1.5px,color:#0A4F25
classDef infra fill:#F3F1EF,stroke:#8A817C,stroke-width:1.5px,color:#221F1E
classDef store fill:#FFFFFF,stroke:#221F1E,stroke-width:2px,color:#221F1E
```
*Read top to bottom: two small toolchains, both deployed to Cloudflare; only the API side touches data and outside services.*

## Site

| Tool | Version | Role | Why |
|---|---|---|---|
| **Eleventy** | `@11ty/eleventy` ^3.0.0 (3.1.6 installed) | builds every page from `src/` into `_site/` | turned a hand-edited HTML site into one file per post (v3.0.0) |
| **Nunjucks** | bundled with Eleventy | layouts, includes, macros | familiar templating, data cascade, pagination |
| **markdown-it** | ^14.2.0 | renders post bodies | HTML passthrough for legacy posts; typographer off so text stays as written |
| **Pagefind** | 1.5.2 (pinned) | static search index over `_site/` | no server, no third-party search, zero cost (v3.2.0) |
| **Manrope** | Google Fonts, weights 400 to 700 | the only typeface | closest free match to the owner's reference font |
| **Plain CSS** | `assets/css/style.css`, about 1,100 lines | tokens, components, dark mode, Liquid Glass | one cacheable file, no build step |
| **Vanilla JS** | `theme.js`, `comments.js`, `reactions.js` | dark toggle, comments widget, appreciate | tiny, dependency-free, `textContent` only |
| **Node** | `engines.node >=18` | build runtime | pinned floor for a deterministic Workers Build |

## API Worker

| Tool | Version | Role |
|---|---|---|
| **TypeScript** | ^6.0.3 | the Worker source, `tsc --noEmit` typecheck |
| **jose** | ^6.2.3 | verifies Cloudflare Access JWTs against the team JWKS; signs and verifies the HS256 comment session |
| **marked** | ^18.0.5 | renders newsletter Markdown in `render.mjs` |
| **Wrangler** | ^4.100.0 (4.103.0 installed) | dev server, deploy, D1 migrations and queries, secrets |
| **@cloudflare/workers-types** | ^4.20260613.1 | runtime types |
| **Vitest** | 4.1.8 | test runner |
| **@cloudflare/vitest-pool-workers** | ^0.16.15 | runs tests inside workerd with a local D1 (v4 plugin API `cloudflareTest`) |
| **Toast UI Editor** | 3.2.2 from its CDN | the rich editor on `/admin/compose` (owner only) |

## Platforms and services

| Service | Used for | Page |
|---|---|---|
| **Cloudflare Workers** | both Workers, static assets, custom domains | [Cloudflare](Cloudflare) |
| **Cloudflare Workers Builds** | build and deploy on push to `main` | [Deployment and release](Deployment) |
| **Cloudflare D1** | the API's database `awonderfullife-api` | [Data model](Data-Model) |
| **Cloudflare Access** | sign-in for `/admin*` | [Security and privacy](Security-and-Privacy) |
| **Cloudflare Turnstile** | bot check on subscribe and comments | [Data quality and processing](Data-Quality-and-Processing) |
| **Cloudflare Workers AI** | comment moderation; hero generation script | [Comments and reactions](Comments-and-Reactions) |
| **Resend** | newsletter sends and comment magic links | [Newsletter pipeline](Newsletter-Pipeline) |
| **iCloud+ Custom Email Domain** | the owner's inbox on the domain | [Data sources and integrations](Data-Sources-and-Integrations) |
| **GitHub** | source, pull requests, tags, this wiki | [GitHub Actions](GitHub-Actions) |

## Not used, on purpose

- **No front-end framework or bundler.** The site is static HTML, so nothing needs hydrating.
- **No CMS.** Posts are Markdown in git; the history is the audit trail.
- **No analytics script.** Traffic comes from Cloudflare zone analytics only.
- **No third-party comments or newsletter service.** Both were brought in house (see [Decisions log](Decisions-Log)).

## Related pages
- [Site architecture](Site-Architecture): how the pieces fit.
- [Repository map](Repository-Map): where each tool's files live.
- [Local development](Local-Development): installing and running them.
- [Testing and quality](Testing-and-Quality): the Vitest setup.

Last checked: 2026-11-09

<details><summary>Sources in the repo</summary>

- `package.json`, `package-lock.json`, `api/package.json`, `api/package-lock.json`
- `api/vitest.config.ts`, `api/tsconfig.json`, `api/src/admin.ts`
- `src/_layouts/base.njk`, `assets/css/style.css`, `assets/js/`
</details>
