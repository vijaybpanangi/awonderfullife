<sub>[Home](Home) › Data › Data flow end to end</sub>

# Data flow end to end

Each kind of data in the system, followed from where it starts to where it ends up and when it is deleted. There are two very different flows: **content** moves at build time from git to static files and never touches a database; **reader data** moves at request time from a browser into D1 through the API Worker, and some of it leaves again as email.

> [!NOTE]
> **At a glance:**
> - Content: Markdown in git, built by Eleventy, served as files. No runtime data path.
> - Subscribers: browser to `/subscribe` to D1; out again only as newsletter recipients; deleted on unsubscribe.
> - Comments: browser to D1 as `unverified`, made `visible` by a magic link, checked by the cron, shown publicly without the email.
> - Appreciations: a count per post, plus a salted daily hash that the cron purges after the day ends.
> - Issues: owner's compose page or CLI to D1, sent by the cron at their scheduled time.

## The five flows on one page

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":55}}}%%
flowchart LR
  subgraph Build["Build time"]
    G["📄 Git<br/>posts, site.json"]:::ours --> E["⚙️ Eleventy +<br/>Pagefind"]:::ours --> S[("_site/<br/>static files")]:::store
  end
  subgraph Request["Request time"]
    B["🌐 Reader browser"]:::user
    O["👤 Owner<br/>compose page"]:::user
    API["⚙️ API Worker"]:::ours
    D[("🗄️ D1")]:::store
    C["⚙️ Cron<br/>every 15 min"]:::ours
  end
  S -- "pages" --> B
  B -- "email" --> API
  B -- "comment" --> API
  B -- "appreciate" --> API
  O -- "issue" --> API
  API <--> D
  C <--> D
  C -- "issues, via Resend" --> M["Subscriber<br/>inboxes"]:::user
  API -- "public comments,<br/>counts" --> B
classDef ours fill:#FDE8EC,stroke:#E0193B,stroke-width:1.5px,color:#7A0A20
classDef community fill:#E6F2FC,stroke:#2E7CC0,stroke-width:1.5px,color:#123E66
classDef official fill:#F0EBFC,stroke:#7A5BD6,stroke-width:1.5px,color:#3B2B70
classDef user fill:#FDF3DC,stroke:#E39A0D,stroke-width:1.5px,color:#5E4004
classDef good fill:#E4F7EB,stroke:#18A04B,stroke-width:1.5px,color:#0A4F25
classDef infra fill:#F3F1EF,stroke:#8A817C,stroke-width:1.5px,color:#221F1E
classDef store fill:#FFFFFF,stroke:#221F1E,stroke-width:2px,color:#221F1E
```
*Read left to right: content is fixed at build time; everything readers and the owner send passes through the API Worker into D1, and the cron turns queued issues into email.*

## Content

| Stage | Where | What happens |
|---|---|---|
| **Authored** | `src/content/posts/<slug>.md`, `src/_data/site.json` | owner writes front matter and body |
| **Built** | Workers Build, `npm run build` | Eleventy renders pages, feed, sitemap, JSON-LD; Pagefind indexes post bodies |
| **Served** | site Worker, `_site/` | static files with `_headers` |
| **Cached** | Cloudflare edge and browsers | HTML and CSS/JS revalidate; images immutable for a year |

## Subscriber email

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6"},"sequence":{"mirrorActors":false}}}%%
sequenceDiagram
  autonumber
  actor R as Reader
  participant API as API Worker
  participant T as Turnstile
  participant D as D1 subscribers
  R->>API: POST /subscribe {email, token, source}
  API->>API: trim, lowercase, 254 chars max, shape check
  API->>T: siteverify(token, IP)
  T-->>API: success
  API->>D: INSERT, or set status active on conflict
  API-->>R: {status: ok}
  Note over D: Later: each issue reads active rows
  R->>API: GET /unsubscribe?token
  API->>D: DELETE row by unsub_token
  API-->>R: "You've been unsubscribed."
```
*Read top to bottom: an email is checked, verified as human, stored with a random unsubscribe token, and deleted outright on unsubscribe.*

## Comments

`POST /comments` stores the comment as `unverified` with the email, creates a one-time token valid 24 hours in `comment_verifications`, and emails a link. Clicking it sets `status = 'visible'`, deletes the token and redirects to the post with a 30-day signed cookie. The next cron tick checks up to 50 unmoderated visible comments; any that fail become `removed` and are shown as a tombstone. The public list never includes the email; a removed comment shows neither name nor body. See [Comments and reactions](Comments-and-Reactions).

## Appreciations

`POST /reactions` hashes `REACTION_SALT`, the UTC day and the client IP with SHA-256, bumps a per-day per-post hit counter (capped at 10) in `reaction_events`, and if allowed increments `reactions.count`. The raw IP is never stored. Every cron tick deletes `reaction_events` rows from any day other than today.

## Newsletter issues

The owner writes an issue in the compose page or a Markdown file. It is rendered once (HTML and text, with a `{{UNSUB_URL}}` placeholder) and inserted into `issues` with a UTC `scheduled_at`. Every 15 minutes the cron selects due issues, claims each atomically (`queued` to `sending`), reads active subscribers, swaps in each subscriber's unsubscribe link, sends through Resend in batches of 100 and records `sent` or `failed` with counts. See [Newsletter pipeline](Newsletter-Pipeline).

## Retention

| Data | Kept until |
|---|---|
| **Subscriber row** (email, consent time, source, token) | the subscriber unsubscribes (row deleted) |
| **Issue** (rendered HTML and text, counts) | indefinitely; only `queued` issues can be unqueued (deleted) |
| **Comment** (name, email, body, status) | indefinitely; removed comments stay as tombstones |
| **Verification token** | used (deleted) or expired (left in place) |
| **Reaction count** | indefinitely |
| **Reaction event** (hash, slug, hits, day) | the end of its UTC day (purged by the cron) |
| **Theme and "appreciated" flags** | in the reader's own `localStorage` |

## Related pages
- [Data model](Data-Model): the tables and fields named here.
- [Data quality and processing](Data-Quality-and-Processing): every check along these paths.
- [Security and privacy](Security-and-Privacy): what is and is not personal data.
- [Build pipeline](Build-Pipeline): the content flow in depth.
- [API reference](API-Reference): each request in these diagrams.

Last checked: 2026-11-09

<details><summary>Sources in the repo</summary>

- `api/src/index.ts`, `api/src/comments.ts`, `api/src/reactions.ts`, `api/src/scheduled.ts`, `api/src/admin.ts`
- `api/migrations/0001` to `0005`
- `eleventy.config.js`, `package.json`, `_headers`
</details>
