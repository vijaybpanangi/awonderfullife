import markdownIt from "markdown-it";

import {
  cardDate,
  bylineDate,
  rfc822Date,
  isoDate,
  readingTime,
  absoluteUrl,
  cleanUrl,
  htmlDecode,
  xmlEscape,
  byYear,
  byCategory,
  categoryName,
  postNeighbors,
} from "./eleventy/filters.mjs";
import { buildGraph } from "./eleventy/jsonld.mjs";

export default function (eleventyConfig) {
  // Markdown-it: html passthrough ON, typographer OFF. Post bodies contain
  // literal curly quotes transcribed from the legacy pages; typographer would
  // "smarten" straight quotes/dashes and corrupt text that is already correct.
  const md = markdownIt({ html: true, typographer: false });
  eleventyConfig.setLibrary("md", md);

  // Passthrough copy, object form, paths relative to the project root.
  eleventyConfig.addPassthroughCopy({
    "favicon.ico": "favicon.ico",
    "favicon.svg": "favicon.svg",
    "apple-touch-icon.png": "apple-touch-icon.png",
    "robots.txt": "robots.txt",
    _headers: "_headers",
  });

  // assets/ copied separately with a filter: staging-images/ is pre-optimization
  // source art (gitignored, never meant to be public) and must never land in
  // _site/. Everything else under assets/ (css, js, images) still copies.
  eleventyConfig.addPassthroughCopy(
    { assets: "assets" },
    { filter: ["**/*", "!staging-images/**", "!staging-images"] }
  );

  // Date / URL / text filters shared by every template.
  eleventyConfig.addFilter("cardDate", cardDate);
  eleventyConfig.addFilter("bylineDate", bylineDate);
  eleventyConfig.addFilter("rfc822Date", rfc822Date);
  eleventyConfig.addFilter("isoDate", isoDate);
  eleventyConfig.addFilter("readingTime", readingTime);
  eleventyConfig.addFilter("absoluteUrl", absoluteUrl);
  eleventyConfig.addFilter("cleanUrl", cleanUrl);
  eleventyConfig.addFilter("htmlDecode", htmlDecode);
  eleventyConfig.addFilter("xmlEscape", xmlEscape);
  eleventyConfig.addFilter("byYear", byYear);
  eleventyConfig.addFilter("byCategory", byCategory);
  eleventyConfig.addFilter("categoryName", categoryName);
  eleventyConfig.addFilter("postNeighbors", postNeighbors);

  // JSON-LD @graph builder (mirrors docs/superpowers/tools/seo-inject.py).
  // Registered as a Nunjucks global so jsonld.njk can call it as a function:
  // jsonLdGraph(site, ctx) | safe (addShortcode only supports tag-call syntax).
  eleventyConfig.addNunjucksGlobal("jsonLdGraph", (site, ctx) => buildGraph(site, ctx));

  // `posts` collection: every post, newest first. Same-day ties fall back to
  // Array.sort's stability, which preserves the glob's alphabetical-by-slug
  // order — matching every same-date group in the corpus except one: the two
  // 2024-11-18 posts. There, the legacy site's OWN chronological ordering
  // (archive.html, index.html, AND the hand-authored prev/next chain across
  // all four neighboring posts — six surfaces in total) consistently places
  // "Confronting Inequality" before "India and Pakistan", the reverse of
  // alphabetical. feed.xml is the only legacy surface using the alphabetical
  // order for this pair, and it was added later (v2.15.0) than archive.html's
  // ordering (present since the very first commit) — see task-3-report.md
  // finding P1 (controller-approved, Task 3 review 2026-07-10) for the full
  // evidence trail. SAME_DAY_TIE_BREAK overrides the stable-sort default for
  // just this one documented pair.
  const SAME_DAY_TIE_BREAK = {
    "the-united-states-and-canada-uneasy-neighbors-shared-failures": 0,
    "india-and-pakistan-twin-dreams-divided-bound-by-hope": 1,
  };
  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi
      .getFilteredByGlob("src/content/posts/*.md")
      .sort((a, b) => {
        const dateDiff = b.data.date - a.data.date;
        if (dateDiff !== 0) return dateDiff;
        const aOrder = SAME_DAY_TIE_BREAK[a.fileSlug];
        const bOrder = SAME_DAY_TIE_BREAK[b.fileSlug];
        if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
        return 0; // preserve stable (alphabetical) order for every other tie
      })
  );

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md"],
  };
}
