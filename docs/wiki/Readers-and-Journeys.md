<sub>[Home](Home) › Business and product › Readers and journeys</sub>

# Readers and journeys

Who uses awonderfullife.ca, and the paths they take through it. There are no accounts and no analytics script, so this page describes the journeys the site is built for, using the routes and features in the code, not tracked behaviour.

> [!NOTE]
> **At a glance:**
> - Four kinds of visitor: a reader, a subscriber, a commenter, and a Namaz app user looking for help.
> - One owner journey: write a post, ship it, and send a newsletter issue.
> - No journey needs an account. The only identity a reader ever proves is an email address, and only to subscribe or to comment.
> - The site never blocks reading on the API: if the API is down, comments and appreciations quietly fail and every page still renders.

## Who comes

| Visitor | Arrives from | Wants | Touches the API? |
|---|---|---|---|
| **Reader** | search, a shared link, the RSS feed | to read an essay | only to show the appreciate count and comments |
| **Subscriber** | the "Stay Connected" card on home, About or a post | new essays by email | `POST /subscribe`, later `GET /unsubscribe` |
| **Commenter** | the comments section under a post | to respond | `POST /comments`, `GET /comments/verify` |
| **Namaz user** | the App Store's Support or Privacy link | help, or to check what the app collects | No |
| **Owner** | Cloudflare Access sign-in | to write and schedule an issue | `/admin/*` |

## A reader's journey

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":55}}}%%
flowchart LR
  A["🌐 Search result<br/>or shared link"]:::user --> P["📄 Post page"]:::ours
  H["🌐 Home page"]:::ours --> P
  P --> M["More reading<br/>3 related posts"]:::ours
  P --> N["Prev and next"]:::ours
  P --> K["Category kicker"]:::ours --> C["Category page"]:::ours
  AR["Archive<br/>search and years"]:::ours --> P
  C --> P
  P -.-> AP["Appreciate"]:::community
  P -.-> CM["Comment"]:::community
  P -.-> NL["Subscribe"]:::good
classDef ours fill:#FDE8EC,stroke:#E0193B,stroke-width:1.5px,color:#7A0A20
classDef community fill:#E6F2FC,stroke:#2E7CC0,stroke-width:1.5px,color:#123E66
classDef official fill:#F0EBFC,stroke:#7A5BD6,stroke-width:1.5px,color:#3B2B70
classDef user fill:#FDF3DC,stroke:#E39A0D,stroke-width:1.5px,color:#5E4004
classDef good fill:#E4F7EB,stroke:#18A04B,stroke-width:1.5px,color:#0A4F25
classDef infra fill:#F3F1EF,stroke:#8A817C,stroke-width:1.5px,color:#221F1E
classDef store fill:#FFFFFF,stroke:#221F1E,stroke-width:2px,color:#221F1E
```
*Read left to right: most readers land on a post; from there the kicker, related posts, prev and next, and the archive keep them reading. Dotted lines are optional actions that call the API.*

## A commenter's journey

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6"},"sequence":{"mirrorActors":false}}}%%
sequenceDiagram
  autonumber
  actor R as Reader
  participant W as Comments widget
  participant API as api.awonderfullife.ca
  participant E as Reader's inbox
  R->>W: Name, email, comment, Turnstile
  W->>API: POST /comments
  API-->>E: Magic link (24 hours)
  API-->>W: verification_sent
  rect rgb(253,232,236)
  R->>API: Click the link (GET /comments/verify)
  API-->>R: 302 to the post, sets 30-day cookie
  end
  R->>W: Next comment, same browser
  W->>API: POST /comments with cookie
  API-->>W: posted (no email this time)
```
*Read top to bottom: the first comment needs one email click; the highlighted step sets a session so later comments publish at once.*

## A subscriber's journey

1. Fills in the email field on the "Stay Connected" card and completes Turnstile.
2. Sees "Thanks, you're on the list." (single opt-in; no confirmation email).
3. Receives each issue at its scheduled time, usually Saturday 7pm Eastern, from the newsletter sending address, with replies going to the owner's inbox.
4. Clicks **Unsubscribe** in any issue (or uses the mail client's one-click unsubscribe). The row is deleted, and a plain "You've been unsubscribed." page confirms it.

## A Namaz user's journey

<p align="center"><img src="images/site-namaz-privacy.webp" width="860" alt="The Namaz privacy policy page on awonderfullife.ca: the heading Namaz, Privacy Policy, last updated 21 July 2026, a bold short version saying Namaz collects nothing about you, and sections What we collect, Your location, Weather (optional) and Notifications."></p>
<p align="center"><sub><em>The Namaz privacy page as an App Store visitor sees it, in the blog's own layout.</em></sub></p>

An iPhone user taps **App Support** or **Privacy Policy** on the App Store listing and lands on `/namaz/` or `/namaz/privacy/`. The pages use the blog's base layout, without the newsletter card, comments or appreciate button. See [Namaz app support pages](Namaz-App-Support).

## The owner's journey

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":55}}}%%
flowchart TB
  subgraph Post["Publish an essay"]
    direction LR
    W["📄 Write post<br/>one Markdown file"]:::ours --> H["Hero and<br/>thumbnail"]:::ours --> PR["🛠️ Pull request<br/>to main"]:::infra --> B["⚙️ Workers Build"]:::infra --> L["✅ Live on<br/>awonderfullife.ca"]:::good
  end
  subgraph Issue["Send a newsletter issue"]
    direction LR
    CO["🔐 Compose page<br/>behind Access"]:::ours --> Q[("🗄️ issues queue<br/>D1")]:::store --> S["⚙️ 15-minute cron<br/>sends when due"]:::ours --> I["Subscribers'<br/>inboxes"]:::user
  end
  Post --> Issue
classDef ours fill:#FDE8EC,stroke:#E0193B,stroke-width:1.5px,color:#7A0A20
classDef community fill:#E6F2FC,stroke:#2E7CC0,stroke-width:1.5px,color:#123E66
classDef official fill:#F0EBFC,stroke:#7A5BD6,stroke-width:1.5px,color:#3B2B70
classDef user fill:#FDF3DC,stroke:#E39A0D,stroke-width:1.5px,color:#5E4004
classDef good fill:#E4F7EB,stroke:#18A04B,stroke-width:1.5px,color:#0A4F25
classDef infra fill:#F3F1EF,stroke:#8A817C,stroke-width:1.5px,color:#221F1E
classDef store fill:#FFFFFF,stroke:#221F1E,stroke-width:2px,color:#221F1E
```
*Read each row left to right: a post ships by merging; an issue ships by queuing it, and the cron sends it at its scheduled time.*

## Related pages
- [Features catalogue](Features-Catalogue): every feature named here.
- [Comments and reactions](Comments-and-Reactions): the commenter and appreciate flows in depth.
- [Newsletter pipeline](Newsletter-Pipeline): the subscriber and owner flows in depth.
- [Adding a post](Adding-a-Post): the owner's writing journey, step by step.
- [Namaz app support pages](Namaz-App-Support): the app user's pages.

Last checked: 2026-11-09

<details><summary>Sources in the repo</summary>

- `src/_layouts/post.njk`, `src/_includes/newsletter*.njk`
- `assets/js/comments.js`, `assets/js/reactions.js`
- `api/src/index.ts`, `api/src/comments.ts`, `api/src/scheduled.ts`
- `src/content/namaz.md`, `src/content/namaz-privacy.md`
</details>
