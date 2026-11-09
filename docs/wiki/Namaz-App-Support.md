<sub>[Home](Home) › Business and product › Namaz app support pages</sub>

# Namaz app support pages

awonderfullife.ca hosts the two public web pages that Apple requires for the owner's iOS app **Namaz (Prayer Times & Qibla)**: a support page at `/namaz/` and a privacy policy at `/namaz/privacy/`. The app itself is not in this repository. These pages are ordinary Eleventy Markdown pages using the blog's base layout, added on 2026-07-21 as two direct commits to `main` (no pull request, no version tag yet).

> [!NOTE]
> **At a glance:**
> - `/namaz/` is the App Store **Support URL**; `/namaz/privacy/` is the **Privacy Policy URL** used in App Store Connect and TestFlight.
> - The policy says the app collects nothing: no accounts, no servers, no analytics, no ads; location stays on the device.
> - The only outside service the app can contact is Apple's WeatherKit, and only if the reader turns on Dynamic Weather.
> - Both pages are live and return 200; neither is in `sitemap.xml` yet.

<p align="center"><img src="images/site-namaz-privacy.webp" width="860" alt="The Namaz privacy policy page: heading, last updated 21 July 2026, a bold summary that Namaz collects nothing about you, then sections on what is collected, location, optional weather and notifications."></p>
<p align="center"><sub><em>The privacy page in the blog's layout: the same header, typography and dark-mode support as every other page.</em></sub></p>

## How the pages are built

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":55}}}%%
flowchart LR
  A["📄 src/content/namaz.md<br/>permalink /namaz/index.html"]:::ours
  B["📄 src/content/namaz-privacy.md<br/>permalink /namaz/privacy/index.html"]:::ours
  L["base.njk layout<br/>seoType: about"]:::ours
  E["⚙️ Eleventy build"]:::ours
  O[("_site/namaz/")]:::store
  W["🌐 Site Worker<br/>auto-trailing-slash"]:::ours
  S["App Store listing<br/>Support and Privacy links"]:::official
  U["👤 iPhone user"]:::user
  A --> E
  B --> E
  L --> E
  E --> O --> W
  S --> U --> W
classDef ours fill:#FDE8EC,stroke:#E0193B,stroke-width:1.5px,color:#7A0A20
classDef community fill:#E6F2FC,stroke:#2E7CC0,stroke-width:1.5px,color:#123E66
classDef official fill:#F0EBFC,stroke:#7A5BD6,stroke-width:1.5px,color:#3B2B70
classDef user fill:#FDF3DC,stroke:#E39A0D,stroke-width:1.5px,color:#5E4004
classDef good fill:#E4F7EB,stroke:#18A04B,stroke-width:1.5px,color:#0A4F25
classDef infra fill:#F3F1EF,stroke:#8A817C,stroke-width:1.5px,color:#221F1E
classDef store fill:#FFFFFF,stroke:#221F1E,stroke-width:2px,color:#221F1E
```
*Read left to right: two Markdown files render through the shared layout into `_site/namaz/`; the App Store links bring users straight there.*

| Page | Source | Output | Public URL |
|---|---|---|---|
| **Support** | `src/content/namaz.md` | `_site/namaz/index.html` | `https://awonderfullife.ca/namaz/` |
| **Privacy policy** | `src/content/namaz-privacy.md` | `_site/namaz/privacy/index.html` | `https://awonderfullife.ca/namaz/privacy/` |

Both set `layout: base.njk`, `seoType: about` and `mainClass: "container"`. They do not set `newsletter`, so there is no sign-up card, and they are not posts, so there are no comments, appreciate button or search indexing. Requests to `/namaz` (no slash) get a 307 to `/namaz/` from the Worker's `html_handling: auto-trailing-slash`.

## What the pages say (summary)

**Support:** a short description (next prayer and countdown over a living sky, Qibla direction, gentle reminders), a contact email, a link to the privacy policy, and a note on accuracy: times are computed on the device, built with Dawoodi Bohra practice in mind with a one-time calibration to a community timetable, plus the common methods (MWL, ISNA, Umm al-Qura, Egyptian, Karachi, Tehran).

**Privacy policy (last updated 21 July 2026):**

| Topic | What the policy states |
|---|---|
| **Collection** | nothing; no servers, no account |
| **Location** | used only on the device for prayer times and Qibla; manual entry possible |
| **Weather** | optional Dynamic Weather asks Apple WeatherKit with an approximate location; governed by Apple's policy |
| **Notifications** | local notifications only; no push server |
| **On-device data** | settings stay on the device and go when the app is deleted |
| **Third parties** | no analytics, advertising or tracking SDKs |
| **Children** | safe for all ages, because nothing is collected |

## Things to know

> [!IMPORTANT]
> These URLs are registered with Apple. Do not move or rename `namaz.md` or `namaz-privacy.md`'s permalinks, or the App Store review and the listing links will break. If the app's data practices change, update the policy and its "Last updated" date in the same release as the app.

- **Social preview:** because both pages use `seoType: about`, their Open Graph image is the author portrait and their JSON-LD node is an `AboutPage` about the author. A dedicated `seoType` with an app icon would describe them better (see [Roadmap](Roadmap)).
- **Sitemap:** `src/content/sitemap.njk` lists home, about, archive, categories and posts only. Add the two Namaz URLs if you want search engines to find them directly.
- **House style:** both page titles and a few sentences use em dashes (for example between "Namaz" and "Privacy Policy" in the privacy page title). The site's editorial rules ban them in prose; a small copy edit would bring these pages in line.
- **Release record:** the two commits are not yet in `CHANGELOG.md` or tagged.

## Related pages
- [About the blog](About-the-Blog): the domain as a personal platform.
- [Build pipeline](Build-Pipeline): how a Markdown page becomes a URL.
- [SEO and discoverability](SEO-and-Discoverability): `seoType` and the sitemap.
- [Release history](Release-History): the 2026-07-21 entry.
- [Security and privacy](Security-and-Privacy): the site's own privacy posture.

Last checked: 2026-11-09

<details><summary>Sources in the repo</summary>

- `src/content/namaz.md`, `src/content/namaz-privacy.md`
- `src/_layouts/base.njk`, `src/_includes/head-seo.njk`, `eleventy/jsonld.mjs`, `src/content/sitemap.njk`
- `wrangler.jsonc` (`html_handling`)
- git: `a092c88`, `d005a0c` (2026-07-21)
</details>
