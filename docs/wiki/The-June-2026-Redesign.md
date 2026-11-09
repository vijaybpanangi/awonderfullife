<sub>[Home](Home) › Business and product › The June 2026 redesign</sub>

# The June 2026 redesign

The "Quiet Magazine" redesign, released as `v2.0.0` on 2026-06-11 (PR #2), gave the blog the page structure it still has: a featured opener and illustrated card grid on the home page, card grids on category pages, display-scale titles, breakout heroes, reading times and prev/next links on posts. It also replaced the sixteen stand-in images with a single generated illustration series. The rest of June then layered on glass, comments, an owned newsletter and, at the end, photoreal covers.

> [!NOTE]
> **At a glance:**
> - Home: featured opener plus card grid (2-up then; 3-up since v2.16.5).
> - Posts: display title, breakout hero, `N MIN READ`, prev and next.
> - Images: 16 flat editorial illustrations (terracotta, slate blue, cream) from Cloudflare Workers AI, 1.5 MB in all.
> - The illustrations were themselves replaced by photoreal covers within a week (v2.12.1, v2.14.0).

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"Nunito, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#FFFFFF","primaryTextColor":"#221F1E","primaryBorderColor":"#C9C2BE","lineColor":"#8A817C","clusterBkg":"#FAF8F6","clusterBorder":"#E4DEDA","edgeLabelBackground":"#FFFFFF","tertiaryColor":"#FAF8F6","cScale0":"#F3F1EF","cScaleLabel0":"#221F1E","cScaleInv0":"#8A817C","cScale1":"#FDE8EC","cScaleLabel1":"#7A0A20","cScaleInv1":"#E0193B","cScale2":"#E6F2FC","cScaleLabel2":"#123E66","cScaleInv2":"#2E7CC0","cScale3":"#FDF3DC","cScaleLabel3":"#5E4004","cScaleInv3":"#E39A0D","cScale4":"#F0EBFC","cScaleLabel4":"#3B2B70","cScaleInv4":"#7A5BD6","cScale5":"#E4F7EB","cScaleLabel5":"#0A4F25","cScaleInv5":"#18A04B","cScale6":"#F3F1EF","cScaleLabel6":"#221F1E","cScaleInv6":"#8A817C","cScale7":"#E6F2FC","cScaleLabel7":"#123E66","cScaleInv7":"#2E7CC0","cScale8":"#FDF3DC","cScaleLabel8":"#5E4004","cScaleInv8":"#E39A0D","cScale9":"#F0EBFC","cScaleLabel9":"#3B2B70","cScaleInv9":"#7A5BD6","cScale10":"#E4F7EB","cScaleLabel10":"#0A4F25","cScaleInv10":"#18A04B","cScale11":"#F3F1EF","cScaleLabel11":"#221F1E","cScaleInv11":"#8A817C","git0":"#F3F1EF","gitBranchLabel0":"#221F1E"}}}%%
timeline
  title June 2026 on top of Quiet Magazine
  2026-06-11 : v2.0.0 Quiet Magazine : 16 generated illustrations
  2026-06-14 : v2.1.0 API spine at api.awonderfullife.ca
  2026-06-15 : SEO foundation : iCloud mail : Liquid Glass : owned newsletter and scheduled sends
  2026-06-16 : house style : photoreal covers : comments : favicon
  2026-06-18 : 3-up grid : wider layout : ambient backdrop : cache fix
```
*Read top to bottom: the redesign on the 11th, then a week of features that turned the blog into a small platform.*

## What changed

| Area | Before (May) | After (June 11) |
|---|---|---|
| **Home** | thumbnail list of every post | featured opener (newest post) and a 2-column illustrated card grid |
| **Category pages** | compact lists | illustrated card grids, facets kept |
| **Post title** | fixed `2.25rem` | `clamp(2.2rem, 5vw, 3.2rem)` |
| **Hero** | inside the text column | breakout beyond the column with a `--breakout` clamp |
| **Byline** | date only | `· N MIN READ` (words divided by 200) |
| **Navigation** | none | prev and next at the foot of each post |
| **About photo** | round | square editorial frame |
| **Stylesheet** | about 421 lines | about 480 lines (today about 1,100) |

## The illustration series

The images were produced with `docs/superpowers/tools/gen-hero.sh`, which calls a Cloudflare Workers AI image model with a fixed style prompt: flat editorial illustration, paper-grain texture, terracotta, slate blue and cream, no text. Every image was viewed and several were regenerated for style or cohesion; posts about real people used symbolic scenes rather than likenesses. Seeds, prompts and alt texts were recorded in `docs/superpowers/specs/2026-06-11-image-manifest.md`. The India and Pakistan image, rated weakest for cohesion, was regenerated in v2.1.1.

Within days the owner preferred photoreal covers: five in v2.12.1, the rest in v2.14.0, nine of them "composed" with the title in the image. The manifest was rewritten for the new series. See [Hero photography](Hero-Photography).

## How it was built

The work followed the project's brainstorm, spec, plan, execute method: a spec (`docs/superpowers/specs/2026-06-11-quiet-magazine-redesign-design.md`), a 13-task plan (`docs/superpowers/plans/2026-06-11-quiet-magazine-redesign.md`), and task-by-task execution with review between tasks. Three spec items were consciously dropped and recorded in the ROADMAP: Manrope 800 was never loaded, the background stayed pure white, and the 68-character measure was not adopted at the time (the column was narrowed later, in v2.15.0).

## Related pages
- [The May 2026 redesign](The-May-2026-Redesign): the foundation this built on.
- [Design system](Design-System): the design today.
- [Hero photography](Hero-Photography): the image series since.
- [Release history](Release-History): every June release.
- [Decisions log](Decisions-Log): why illustration, then photography.

Last checked: 2026-11-09

<details><summary>Sources in the repo</summary>

- `docs/superpowers/specs/2026-06-11-quiet-magazine-redesign-design.md`, `docs/superpowers/plans/2026-06-11-quiet-magazine-redesign.md`
- `docs/superpowers/specs/2026-06-11-image-manifest.md`, `docs/superpowers/tools/gen-hero.sh`
- `CHANGELOG.md` (v2.0.0 to v2.17.2), `ROADMAP.md` (Accepted deviations)
</details>
