# Liquid Glass — Design Spec (blog)

**Date:** 2026-06-15
**Status:** Documents shipped behaviour (`v2.4.0` → `v2.6.0`) and states the honest ceiling.
**Scope type:** Design-language note for the editorial blog. CSS-only material; no markup, no build.

## Goal & inspiration

Borrow the *feel* of Apple's **Liquid Glass** material (introduced iOS 26, refined in 27) — a translucent surface that refracts and brightens what scrolls beneath it, edged with a thin specular bevel — and apply it **selectively** to `awonderfullife.ca` without compromising the crisp editorial design.

This is a personal essay blog ("Data, life, and the space between."), white-paper crisp by intent. Glass here is an **accent, not the system** (see Brand fit). The aesthetic north star is "crispness over decoration": one genuine glass moment (the header) plus two minor frosted surfaces, over a body that stays plain white.

### The honest pure-CSS ceiling

Real Liquid Glass does **real-time edge refraction / lensing** — the surface bends and warps the content directly behind its rim, like a physical lens. That is a GPU-shader effect. Pure CSS cannot do it:

- `backdrop-filter` blurs/recolours what is behind a box but **cannot displace or warp** it — there is no per-pixel lensing along the edge.
- The only browser primitive that *can* displace pixels is SVG `feDisplacementMap` fed into `backdrop-filter: url(#…)`, which is **Chromium-only and experimental** (Safari/Firefox ignore it), expensive, and prone to artefacts. We deliberately do **not** ship it.

So what we ship **emulates** the material with three cheap, well-supported ingredients:

1. **Frost** — `backdrop-filter: blur() saturate() brightness()` (blur + colour lift + brighten the content behind).
2. **A specular bevel** — inset box-shadows that fake a bright top edge, a faint bright base, and a 1px inner light ring.
3. **A faint background glow** to give the frost something to refract at rest.

No lensing, no animated refraction — a static, convincing *suggestion* of glass that runs on every browser that supports `backdrop-filter`, and degrades to near-opaque panels where it doesn't.

## Tokens

Defined in `:root` in `assets/css/style.css`, quoted exactly:

```css
/* Liquid glass — Apple iOS-style material: frost + brighten + saturate the
   content behind, with a specular bevel (bright top edge, faint bright base). */
--glass-bg: rgba(255,255,255,0.6);
--glass-blur: blur(18px) saturate(1.8) brightness(1.06);
--glass-rim:
  inset 0 1px 0 rgba(255,255,255,0.9),
  inset 0 -1px 0 rgba(255,255,255,0.4),
  inset 0 0 0 1px rgba(255,255,255,0.22);
```

- `--glass-bg` — ~60% white fill, so the frost reads as a tinted pane rather than a solid panel.
- `--glass-blur` — the frost recipe: an 18px blur, saturation pushed to 1.8 (so colours behind bloom through), and a 1.06 brightness lift (the "lit glass" quality).
- `--glass-rim` — the specular bevel: bright top inset edge (0.9 alpha), faint bright base (0.4), 1px inner light ring (0.22).

The body carries a single refraction cue (not a token — an inline `background-image`):

```css
background-image: radial-gradient(60rem 26rem at 50% -10%, rgba(10,74,154,0.06), transparent 62%);
background-attachment: fixed;
```

A barely-there accent-blue (`--color-accent` = `#0a4a9a`) radial glow at the very top — present only so the frosted header has colour to refract. Everywhere else the body stays effectively white. There is no separate colour-pool layer (that is ezzi's approach; the blog deliberately stays crisp).

## Where glass is applied

Three surfaces, no more:

1. **The floating capsule header** — `header:not(.post-header)`. This is *the* glass moment and the one place glass genuinely belongs on a white editorial site.
   - **`v2.4.0`** introduced it as a compact **sticky frosted bar** (title + tagline inline, nav right) replacing the old tall static masthead, blurring the post text and hero illustrations scrolling beneath it.
   - **`v2.6.0`** evolved it into a **floating Liquid Glass capsule** — a detached, centred, rounded-pill bar inset from the viewport edges (`position: sticky; top: 0.9rem; max-width: var(--max-width); border-radius: var(--r-pill)`), with `--glass-rim` and a soft floating drop-shadow (`0 12px 32px -16px rgba(17,17,17,0.32)`).
   - **The post-title-bleed bug (`v2.4.2`):** post pages use `<header class="post-header">` for their title block, so an unscoped `header { … }` selector also frosted the post headline — drawing a stray rounded glass panel behind it. The fix is the `:not(.post-header)` scope on every site-header rule (and on the `@supports` fallback). Preserve it on any future header edit.

2. **The newsletter card** (`.newsletter`) — frosted with `--glass-blur` + `--glass-rim` and a soft shadow. The Buttondown form sits on glass. (Note: `v2.5.0` added owned `/subscribe` + `/unsubscribe` flows on the API worker; the on-page card styling is unchanged.)

3. **The faceted-browse chips** (`.facet-chip`) — pills on `archive.html` and each `categories/*.html`, given a lighter frost (`blur(8px) saturate(1.3)`) and `--glass-rim`.

The **homepage card grid stays crisp white** — illustrated cards are not glass. That restraint is the point.

## Brand fit

The blog is **crisp editorial**, and glass is a **selective accent** layered onto it — never the whole system. The contract is explicit in the `v2.4.0` changelog: "to keep crispness over decoration." One signature glass surface (the header), two supporting frosted surfaces (newsletter, chips), and an otherwise-plain white page. If a future change tempts glass onto body content or the card grid, it is out of character and should be resisted. (Contrast ezzi, where glass *is* the system — see that repo's companion spec.)

## Accessibility & i18n

- **No-`backdrop-filter` fallback.** An `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` block near the top of `style.css` makes each glass surface near-opaque where blur is unsupported: `header:not(.post-header)` → `rgba(255,255,255,0.96)` + a hairline border, `.newsletter` → `--color-bg-soft`, `.facet-chip` → solid `#fff`. Glass is decorative; nothing depends on it.
- **Legibility over translucency.** Text sits on ~60% white over an effectively-white body, so contrast against `--color-text` (`#111`) stays high. The header's brightness lift (`brightness(1.06)`) further protects the title/nav. No body text ever renders directly on a translucent pane.
- **Motion.** The blog's glass is **static** — there is no light-sweep or animated refraction here (that is an ezzi feature). The existing `@media (prefers-reduced-motion: reduce)` block governs other transitions; the glass material adds no motion to gate.
- **i18n.** The blog is English-only (LTR), so no RTL logical-property work is needed. (The logical-property discipline lives in ezzi's spec.)

## Versions

- **`v2.4.0`** — Liquid Glass editorial accents: frosted sticky header, frosted newsletter, glassy facet chips, background-glow refraction cue; tokens + `@supports` fallback introduced.
- **`v2.4.2`** — fix: scoped the site-header glass to `header:not(.post-header)` so it stops bleeding onto post titles.
- **`v2.6.0`** — Floating Liquid Glass capsule nav: the header becomes a detached, centred, rounded-pill glass bar with the specular rim and a floating shadow. CSS-only, no markup change across the pages.

## Out of scope

- **Real edge-refraction / lensing** (GPU shaders; Chromium-only experimental SVG `feDisplacementMap`) — explicitly *not* pursued; documented above as the ceiling.
- Animated light-sweeps or hover sheen on glass (an ezzi-only treatment; off-brand for the crisp blog).
- Extending glass to body content, the card grid, or post bodies.
- Dark mode.
