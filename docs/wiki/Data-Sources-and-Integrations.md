<sub>[Home](Home) › Data › Data sources and integrations</sub>

# Data sources and integrations

Every place data comes from and every outside service the project talks to, with the direction of the data, the credential involved (by name only) and what happens when the service is unavailable. The content itself has one source, the git repository; everything else is either readers' own input or a service the API Worker calls.

> [!NOTE]
> **At a glance:**
> - Content source of truth: Markdown and JSON in git. There is no external CMS or data feed.
> - Reader input: emails, comments, appreciations, through the API Worker into D1.
> - Outbound services: Resend (email), Turnstile (bot check), Workers AI (moderation), Cloudflare Access (owner sign-in).
> - Browser-side third parties: Google Fonts on every page, Turnstile on pages with forms, Toast UI CDN on the owner's compose page.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":55}}}%%
flowchart LR
  GIT["📄 Git repository<br/>posts, site.json"]:::ours
  BR["🌐 Reader's browser<br/>forms, buttons"]:::user
  API["⚙️ API Worker"]:::ours
  D1[("🗄️ D1")]:::store
  subgraph Third["Third-party services"]
    direction TB
    TS["Turnstile<br/>siteverify"]:::official
    AI["Workers AI"]:::official
    ACC["🔐 Cloudflare Access<br/>JWKS"]:::infra
    RS["Resend"]:::official
  end
  IN["Reader's inbox"]:::user
  GIT -- "built pages" --> BR
  BR -- "email, comment,<br/>appreciate" --> API
  API <--> D1
  API -- "verify token" --> TS
  API -- "classify" --> AI
  API -- "fetch keys" --> ACC
  API -- "send" --> RS
  RS --> IN
classDef ours fill:#FDE8EC,stroke:#E0193B,stroke-width:1.5px,color:#7A0A20
classDef community fill:#E6F2FC,stroke:#2E7CC0,stroke-width:1.5px,color:#123E66
classDef official fill:#F0EBFC,stroke:#7A5BD6,stroke-width:1.5px,color:#3B2B70
classDef user fill:#FDF3DC,stroke:#E39A0D,stroke-width:1.5px,color:#5E4004
classDef good fill:#E4F7EB,stroke:#18A04B,stroke-width:1.5px,color:#0A4F25
classDef infra fill:#F3F1EF,stroke:#8A817C,stroke-width:1.5px,color:#221F1E
classDef store fill:#FFFFFF,stroke:#221F1E,stroke-width:2px,color:#221F1E
```
*Read left to right: built pages reach the reader; what the reader sends goes to the API, which stores it in D1 and calls outside services to check, moderate, authenticate and email.*

## Integration table

| Integration | Direction | Used by | Credential (name) | If it fails |
|---|---|---|---|---|
| **Git repository** | in (build) | Eleventy | none | no build, site stays on the last deploy |
| **Resend batch API** `api.resend.com/emails/batch` | out | scheduled send, compose test send, comment magic links | `RESEND_API_KEY` | issue marked `failed` if nothing sent; comment returns 503 `email_unavailable` if no key |
| **Turnstile siteverify** `challenges.cloudflare.com` | out | `/subscribe`, `POST /comments` | `TURNSTILE_SECRET`; public site key in `site.json` | fail closed: 403 `turnstile_failed` |
| **Workers AI** | out | comment moderation sweep | `AI` binding | heuristics only; comment kept |
| **Cloudflare Access** | in (JWT), out (JWKS) | `/admin/*` | `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` | 403 `forbidden` |
| **D1** `awonderfullife-api` | both | every API route and the cron | `DB` binding | route errors; `/admin/whoami` reports `db: error` |
| **Google Fonts** | browser | every page (Manrope) | none | system font fallback |
| **Turnstile widget script** | browser | pages with the newsletter card, posts (comments) | public site key | form cannot get a token |
| **Toast UI Editor CDN** | browser | `/admin/compose` | none | compose editor does not load |
| **Workers AI image API** | out (owner laptop) | `gen-hero.sh` | token and account in files under `$HOME` | no new hero |
| **Cloudflare GraphQL analytics** | out (owner laptop) | `cf-analytics.sh` | read-only analytics token | no report |

## Email on the domain

Two separate mail systems share the domain, by design:

| Purpose | System | Records |
|---|---|---|
| **Owner's inbox** | iCloud+ Custom Email Domain (v2.3.0) | apex MX to iCloud, SPF `include:icloud.com ~all`, DKIM `sig1._domainkey`, DMARC `p=none` with aggregate reports |
| **Newsletter and magic links** | Resend, sending subdomain `send.awonderfullife.ca` (v2.9.1) | its own SPF, DKIM and MX, set up through Cloudflare |

Replies to newsletter and comment emails go to the owner's iCloud inbox through `NEWSLETTER_REPLY_TO`. `docs/superpowers/tools/check-email-dns.sh` checks the iCloud records over DNS-over-HTTPS.

## Not integrated

No analytics vendor, no ad network, no social embeds, no third-party comment or newsletter service (Buttondown was retired in v2.8.0). Namaz's use of Apple WeatherKit happens inside the app, not on this site.

## Related pages
- [Data flow end to end](Data-Flow-End-to-End): these integrations in motion.
- [Secrets and configuration](Secrets-and-Configuration): where each credential lives.
- [Security and privacy](Security-and-Privacy): what each service can see.
- [Newsletter pipeline](Newsletter-Pipeline): Resend in depth.
- [Comments and reactions](Comments-and-Reactions): Turnstile and Workers AI in depth.

Last checked: 2026-11-09

<details><summary>Sources in the repo</summary>

- `api/src/*.ts`, `api/wrangler.jsonc`, `api/.dev.vars.example`
- `src/_layouts/base.njk`, `src/_data/site.json`, `api/src/admin.ts`
- `docs/superpowers/tools/*.sh`, `CHANGELOG.md` (v2.3.0, v2.8.0, v2.9.1)
</details>
