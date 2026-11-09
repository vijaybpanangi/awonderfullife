<sub>[Home](Home) › Business and product › The five categories</sub>

# The five categories

Every essay belongs to exactly one of five categories: Reflection, Society, Politics, Technology and Travel. The taxonomy was chosen in the May 2026 redesign from a survey of the sixteen posts that existed then, and it has not changed since. Categories drive the kicker above every title, the category pages, the facet chips, the breadcrumb in structured data and the related-posts strip.

> [!NOTE]
> **At a glance:**
> - Five categories, defined once in `src/_data/site.json` (`slug` and display `name`).
> - A post sets `category:` to one slug; everything else is generated.
> - Counts on 2026-11-09: Reflection 3, Society 3, Politics 5, Technology 4, Travel 3 (18 in all).
> - Adding a category is a deliberate decision, not a casual edit: see below.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6"}}}%%
pie showData
  title Posts per category (18 posts)
  "Politics" : 5
  "Technology" : 4
  "Reflection" : 3
  "Society" : 3
  "Travel" : 3
```
*Real counts from the `category:` front matter of every file in `src/content/posts/`.*

## The categories

| Category | Slug | Posts | What belongs here |
|---|---|---|---|
| **Reflection** | `reflection` | 3 | Personal essays on character, endurance and lives well lived: integrity and empathy, Ratan Tata, unfinished work |
| **Society** | `society` | 3 | How we live together: economic data versus real life, education for every child, the 1947 partition |
| **Politics** | `politics` | 5 | Elections and leadership in the United States and Canada, seen from north of the border |
| **Technology** | `technology` | 4 | Apple Intelligence and Siri across three essays, and building software with AI |
| **Travel** | `travel` | 3 | Winter in Toronto, an electric road trip across Canada, stories from beyond borders |

## Where a category shows up

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":55}}}%%
flowchart LR
  F["📄 category: politics<br/>in front matter"]:::ours
  S[("site.json<br/>slug and name")]:::store
  F --> K["Kicker link<br/>/categories/politics"]:::ours
  S --> K
  F --> CP["Category page<br/>card grid"]:::ours
  F --> FC["Facet chip<br/>with count"]:::ours
  F --> BC["BreadcrumbList<br/>Home › Politics › Post"]:::ours
  F --> RP["More reading<br/>same category first"]:::ours
  F --> PF["Pagefind meta<br/>category"]:::ours
classDef ours fill:#FDE8EC,stroke:#E0193B,stroke-width:1.5px,color:#7A0A20
classDef community fill:#E6F2FC,stroke:#2E7CC0,stroke-width:1.5px,color:#123E66
classDef official fill:#F0EBFC,stroke:#7A5BD6,stroke-width:1.5px,color:#3B2B70
classDef user fill:#FDF3DC,stroke:#E39A0D,stroke-width:1.5px,color:#5E4004
classDef good fill:#E4F7EB,stroke:#18A04B,stroke-width:1.5px,color:#0A4F25
classDef infra fill:#F3F1EF,stroke:#8A817C,stroke-width:1.5px,color:#221F1E
classDef store fill:#FFFFFF,stroke:#221F1E,stroke-width:2px,color:#221F1E
```
*Read left to right: one front-matter value plus the shared list in `site.json` feeds six places on the site.*

- **Kicker:** `<a class="kicker" href="/categories/<slug>">` above every title, on home, category pages and posts. Always absolute and extension-less.
- **Category page:** `src/content/categories.njk` paginates over `site.categories`, writing `categories/<slug>.html` with a 2-up card grid.
- **Facets:** `src/_includes/facets.njk` renders a chip per category with its live count, plus period chips for the years that category has posts in.
- **Structured data:** posts carry `articleSection` and a `BreadcrumbList` (see [SEO and discoverability](SEO-and-Discoverability)).
- **Related posts:** the `relatedPosts` filter prefers the same category.
- **Search:** posts carry `data-pagefind-meta="category:..."`.

## Adding or renaming a category

> [!IMPORTANT]
> Renaming a slug changes public URLs (`/categories/<slug>`) and every post that uses it. Add a new slug rather than renaming an existing one, unless you also add a redirect.

1. Add `{ "slug": "...", "name": "..." }` to `categories` in `src/_data/site.json`.
2. Set `category:` on the posts that belong there.
3. `npm run build`. The category page, chips, counts and sitemap entry appear automatically.

## Related pages
- [Post catalogue](Post-Catalog): every post with its category.
- [Content and editorial](Content-and-Editorial): writing rules for every category.
- [Data model](Data-Model): `site.json` and front matter fields.
- [Decisions log](Decisions-Log): why five, and why these.

Last checked: 2026-11-09

<details><summary>Sources in the repo</summary>

- `src/_data/site.json`, `src/content/categories.njk`, `src/_includes/facets.njk`
- `src/_layouts/post.njk`, `eleventy/filters.mjs` (`byCategory`, `categoryName`, `relatedPosts`)
- `docs/superpowers/specs/2026-05-27-website-redesign-design.md`
</details>
