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
    assets: "assets",
    "favicon.ico": "favicon.ico",
    "favicon.svg": "favicon.svg",
    "apple-touch-icon.png": "apple-touch-icon.png",
    "robots.txt": "robots.txt",
    _headers: "_headers",
  });

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

  // `posts` collection: every post, newest first.
  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi
      .getFilteredByGlob("src/content/posts/*.md")
      .sort((a, b) => b.data.date - a.data.date)
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
