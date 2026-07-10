#!/usr/bin/env node
// scripts/migrate-posts.mjs
//
// Converts every legacy posts/<slug>.html page into src/content/posts/<slug>.md
// for the Eleventy re-platform (PR 1). Deterministic and idempotent: re-running
// against unchanged legacy input produces byte-identical .md output.
//
// Front matter is assembled from FIVE legacy sources per post:
//   - posts/<slug>.html      title (h1), category (kicker), byline (date/minRead),
//                            description (meta), heroAlt (img alt), dek (.post-dek),
//                            heroTitled (header class), body (.post-content).
//   - feed.xml               guid (verbatim, frozen with .html suffix).
//   - categories/<cat>.html  excerpt (card excerpt on the post's own category page).
//   - index.html             excerptHome (only recorded if it differs from excerpt);
//                            card title cross-checked against h1 for diagnostics.
//   - archive.html           listTitle (only recorded if the archive-list title text
//                            differs from the post's own h1 — see NOTE below; no
//                            post in the current corpus does).
//
// Byte-fidelity rules (see .superpowers/sdd/task-2-brief.md):
//   - `description` and `heroAlt` are consumed by templates via `{{ x | safe }}`
//     INSIDE an HTML attribute (meta content= / img alt=). They must therefore be
//     stored RAW (entities intact, e.g. "&quot;"), not HTML-decoded — decoding would
//     inject a literal `"` into a double-quoted attribute and corrupt the page.
//     Extracted via regex against the raw file text (not cheerio's decoded .attr()).
//   - `title` / `excerpt` / `excerptHome` / `dek` are consumed as plain HTML TEXT
//     content, so entity-decoding (cheerio's default .text() behaviour) is correct
//     and matches the brief ("title — HTML-entity decoded").
//   - The post-content body and any <section class="post-references"> block are
//     extracted via raw substring slicing (not cheerio re-serialization), so
//     literal curly quotes / ellipses / attribute quoting survive byte-for-byte
//     into turndown's input and the final raw-HTML passthrough block.
//
// NOTE on listTitle: the brief names "the-united-states-and-canada..." as the post
// whose list title differs from its h1. Direct inspection of the current legacy
// pages shows NO such difference for that post (h1, archive.html, index.html card,
// categories/politics.html card, and feed.xml all read "Confronting Inequality: The
// American and Canadian Experience"). The one real byte-level title discrepancy
// found is on apple-intelligence-ai-for-us-everyday-users: index.html's card and
// categories/technology.html's card use a straight apostrophe ("Apple's"), while
// the post's own h1, archive.html, AND feed.xml's <title> all use a curly
// apostrophe ("Apple’s"). Controller adjudication (task-2 review, 2026-07-10):
// the h1 + archive.html + feed.xml consensus is authoritative — feed.xml being
// the frozen, subscriber-facing surface where a silent change matters most — and
// the straight apostrophe on the card surfaces is a legacy typo. listTitle is
// therefore derived from archive.html, set ONLY when the archive-list title text
// differs from the post's own h1 (no post in the current corpus does, so no .md
// carries listTitle). Card-level differences (index.html / categories/<cat>.html)
// are logged as diagnostics — known legacy typos, corrected in the generated
// output — never written to front matter. Net effect for apple-intelligence:
// generated feed.xml and archive.html match legacy exactly; the index card, the
// technology category card, and the post-nav blocks on its two chronological
// neighbors (2024-election-results-a-call-for-change, dream-big-transforming-
// education-for-every-child) intentionally differ from legacy by one character
// (curly apostrophe replacing the straight-apostrophe typo). Documented in
// task-2-report.md for Task 3's parity allowlist.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import TurndownService from "turndown";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_DIR = path.join(ROOT, "posts");
const CATEGORIES_DIR = path.join(ROOT, "categories");
const OUT_DIR = path.join(ROOT, "src/content/posts");
const FEED_PATH = path.join(ROOT, "feed.xml");
const ARCHIVE_PATH = path.join(ROOT, "archive.html");
const INDEX_PATH = path.join(ROOT, "index.html");

const MONTHS = {
  JANUARY: "01", FEBRUARY: "02", MARCH: "03", APRIL: "04",
  MAY: "05", JUNE: "06", JULY: "07", AUGUST: "08",
  SEPTEMBER: "09", OCTOBER: "10", NOVEMBER: "11", DECEMBER: "12",
};

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

// Slices the substring strictly between the first occurrence of `openTag` and
// the first occurrence of `closeTag` that follows it, returning both the
// verbatim outer slice (tags included) and the inner content, plus the index
// range consumed (so callers can splice the outer slice back out of a parent
// string exactly). Assumes no nested occurrence of the same tag pair between
// them — true for every post-content/post-references pair in this corpus
// (verified: no nested <div> inside .post-content, no nested <section> inside
// .post-references, across all 17 legacy posts).
function extractOuter(html, openTag, closeTag) {
  const start = html.indexOf(openTag);
  if (start === -1) return null;
  const innerStart = start + openTag.length;
  const closeIdx = html.indexOf(closeTag, innerStart);
  if (closeIdx === -1) return null;
  const end = closeIdx + closeTag.length;
  return {
    outer: html.slice(start, end),
    inner: html.slice(innerStart, closeIdx),
    start,
    end,
  };
}

function extractRawAttr(rawHtml, re) {
  const m = re.exec(rawHtml);
  return m ? m[1] : null;
}

// Fail-loud guard for mandatory front-matter fields: silently serializing a
// null/undefined/empty extraction into YAML would produce a plausible-looking
// but corrupt .md (e.g. `guid: "null"`). Same posture as parseByline: throw
// with the slug and field name the moment an extraction comes back empty.
function requireField(value, slug, field) {
  if (value === null || value === undefined || value === "") {
    throw new Error(`${slug}: failed to extract mandatory field "${field}"`);
  }
  return value;
}

// --- turndown setup --------------------------------------------------------

function makeTurndownService() {
  const td = new TurndownService({
    headingStyle: "atx", // preserve ## / ### levels, never normalize
    emDelimiter: "*",
  });

  // <table> has no built-in commonmark rule in turndown (no GFM plugin
  // installed), so without this it would flatten every cell into its own
  // orphaned paragraph. `.keep()` preserves the whole element's outerHTML,
  // which markdown-it (html:true) passes through as a raw HTML block.
  td.keep(["table"]);

  // Inline links that carry target="_blank"/rel="noopener..." can't be
  // expressed by turndown's default `[text](href)` rule without losing those
  // attributes. addRule (not .keep — the built-in `a` rule in `this.array`
  // would win over a `.keep()` filter every time, since keep is only
  // consulted as a fallback) intercepts just these anchors and keeps their
  // raw outerHTML inline; plain links still convert to normal markdown links.
  td.addRule("keepAttributedAnchors", {
    filter: (node) =>
      node.nodeName === "A" && (node.getAttribute("target") || node.getAttribute("rel")),
    replacement: (_content, node) => node.outerHTML,
  });

  return td;
}

// --- per-post extraction ----------------------------------------------------

function parseByline(bylineText, slug) {
  // "VIJAY PANANGIPALLY · MARCH 04, 2025 · 9 MIN READ"
  const parts = bylineText.split("·").map((s) => s.trim());
  const dateMatch = /^([A-Z]+) (\d{2}), (\d{4})$/.exec(parts[1]);
  if (!dateMatch) {
    throw new Error(`${slug}: unrecognized byline date segment: ${JSON.stringify(parts[1])}`);
  }
  const [, monthName, day, year] = dateMatch;
  const month = MONTHS[monthName];
  if (!month) throw new Error(`${slug}: unknown month name: ${monthName}`);
  const date = `${year}-${month}-${day}`;

  const minReadMatch = /^(\d+) MIN READ$/.exec(parts[2]);
  if (!minReadMatch) {
    throw new Error(`${slug}: unrecognized byline minRead segment: ${JSON.stringify(parts[2])}`);
  }
  const minRead = parseInt(minReadMatch[1], 10);

  return { date, minRead };
}

function extractGuid(feedRaw, slug) {
  const marker = `/posts/${slug}.html`;
  const idx = feedRaw.indexOf(marker);
  if (idx === -1) return null;
  const itemStart = feedRaw.lastIndexOf("<item>", idx);
  const itemEnd = feedRaw.indexOf("</item>", idx);
  if (itemStart === -1 || itemEnd === -1) return null;
  const item = feedRaw.slice(itemStart, itemEnd);
  const m = /<guid[^>]*>([^<]*)<\/guid>/.exec(item);
  return m ? m[1] : null;
}

function extractArchiveTitle(archiveRaw, slug) {
  const re = new RegExp(`href="posts/${slug}">([^<]*)</a>`);
  const m = re.exec(archiveRaw);
  return m ? m[1] : null;
}

// A post's card link (index.html or a categories/<cat>.html grid) or, for the
// single most-recent post, index.html's <section class="featured"> opener —
// same shape either way (link followed by sibling <p>/<h2> elements in the
// same parent), so one helper covers both, keyed off the link's href.
function findCardLink($, slug, hrefPrefix) {
  const link = $(
    `a.card-link[href="${hrefPrefix}${slug}"], a.featured-link[href="${hrefPrefix}${slug}"]`
  );
  return link.length ? link : null;
}

function extractExcerpt($, slug, hrefPrefix) {
  const link = findCardLink($, slug, hrefPrefix);
  if (!link) return null;
  const excerpt = link.parent().find("p.post-excerpt").first();
  return excerpt.length ? excerpt.text().trim() : null;
}

function extractCardTitle($, slug, hrefPrefix) {
  const link = findCardLink($, slug, hrefPrefix);
  if (!link) return null;
  const h2 = link.find("h2.post-title").first();
  return h2.length ? h2.text().trim() : null;
}

function migrateOne(slug, ctx) {
  const rawHtml = readText(path.join(POSTS_DIR, `${slug}.html`));
  const $ = cheerio.load(rawHtml);

  const header = $("header.post-header");
  const headerClass = header.attr("class") || "";
  const heroTitled = headerClass.split(/\s+/).includes("is-hero-titled");

  const title = requireField(header.children("h1").first().text().trim(), slug, "title (h1)");

  const kickerHref = header.find("a.kicker").attr("href") || "";
  const category = requireField(
    kickerHref.split("/").filter(Boolean).pop(),
    slug,
    "category (kicker href)"
  );

  const bylineText = requireField(
    header.find("p.post-byline").text().trim(),
    slug,
    "byline (p.post-byline)"
  );
  const { date, minRead } = parseByline(bylineText, slug);

  const dekEm = header.find(".post-dek em");
  const dek = dekEm.length ? dekEm.text().trim() : null;

  const description = requireField(
    extractRawAttr(rawHtml, /<meta name="description" content="([^"]*)">/),
    slug,
    "description (meta)"
  );
  const heroAlt = requireField(
    extractRawAttr(rawHtml, /<img class="post-hero"[^>]*\balt="([^"]*)"/),
    slug,
    "heroAlt (post-hero alt)"
  );

  const guid = requireField(extractGuid(ctx.feedRaw, slug), slug, "guid (feed.xml <guid>)");

  // listTitle: set ONLY when archive.html's list title text differs from h1
  // (the h1 + archive.html + feed.xml consensus is authoritative per the
  // module-level NOTE; no post in the current corpus differs, so no .md gets
  // listTitle). Card-title differences on index.html are known legacy typos:
  // logged as diagnostics, corrected in the generated output, never persisted.
  const categoryDoc = ctx.categoryDocs[category];
  const archiveTitle = requireField(
    extractArchiveTitle(ctx.archiveRaw, slug),
    slug,
    "archive.html list title"
  );
  const listTitle = archiveTitle !== title ? archiveTitle : null;

  const indexCardTitle = extractCardTitle(ctx.indexDoc, slug, "posts/");
  if (indexCardTitle && indexCardTitle !== title) {
    ctx.diagnostics.push(
      `${slug}: index.html card title (${JSON.stringify(indexCardTitle)}) differs from h1 ` +
        `(${JSON.stringify(title)}) — treated as a legacy card typo (h1/archive/feed ` +
        `consensus wins); generated cards will show the h1 text`
    );
  }

  // excerpt / excerptHome
  const categoryExcerpt = categoryDoc ? extractExcerpt(categoryDoc, slug, "../posts/") : null;
  const indexExcerpt = extractExcerpt(ctx.indexDoc, slug, "posts/");
  const excerpt = requireField(
    categoryExcerpt ?? indexExcerpt,
    slug,
    `excerpt (categories/${category}.html card, index.html fallback)`
  );
  const excerptHome =
    indexExcerpt !== null && categoryExcerpt !== null && indexExcerpt !== categoryExcerpt
      ? indexExcerpt
      : null;

  // Body: raw-slice .post-content (verbatim bytes in, so curly quotes/entities
  // reach turndown unchanged), pull out .post-references (if present) before
  // conversion, convert the remainder, then re-append the references section
  // as a verbatim raw HTML block.
  const contentSlice = extractOuter(rawHtml, '<div class="post-content">', "</div>");
  if (!contentSlice) throw new Error(`${slug}: could not locate .post-content`);

  let bodyForTurndown = contentSlice.inner;
  let referencesHtml = null;
  const refSlice = extractOuter(
    contentSlice.inner,
    '<section class="post-references">',
    "</section>"
  );
  if (refSlice) {
    referencesHtml = refSlice.outer;
    bodyForTurndown =
      contentSlice.inner.slice(0, refSlice.start) + contentSlice.inner.slice(refSlice.end);
  }

  const markdownBody = ctx.turndown.turndown(bodyForTurndown).trim();
  const body = referencesHtml ? `${markdownBody}\n\n${referencesHtml.trim()}` : markdownBody;

  return {
    title,
    listTitle,
    date,
    category,
    description,
    excerpt,
    excerptHome,
    heroAlt,
    heroTitled,
    dek,
    minRead,
    guid,
    body,
  };
}

// --- YAML front matter serialization ----------------------------------------

// Mirrors the human-authored reference post's style: double-quote by default;
// fall back to single-quote when the value contains a literal `"` (so it
// doesn't need escaping); if it contains both quote characters, double-quote
// with backslash escaping. Curly quotes/apostrophes (U+2018-2019) are not
// YAML-special and never need escaping under any of these branches.
function yamlScalar(value) {
  const str = String(value);
  if (!str.includes('"')) return `"${str}"`;
  if (!str.includes("'")) return `'${str}'`;
  return `"${str.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function serialize(data) {
  const lines = ["---"];
  lines.push(`title: ${yamlScalar(data.title)}`);
  if (data.listTitle) lines.push(`listTitle: ${yamlScalar(data.listTitle)}`);
  lines.push(`date: ${data.date}`);
  lines.push(`category: ${data.category}`);
  lines.push(`description: ${yamlScalar(data.description)}`);
  lines.push(`excerpt: ${yamlScalar(data.excerpt)}`);
  if (data.excerptHome) lines.push(`excerptHome: ${yamlScalar(data.excerptHome)}`);
  lines.push(`heroAlt: ${yamlScalar(data.heroAlt)}`);
  if (data.heroTitled) lines.push(`heroTitled: true`);
  if (data.dek) lines.push(`dek: ${yamlScalar(data.dek)}`);
  lines.push(`minRead: ${data.minRead}`);
  lines.push(`guid: ${yamlScalar(data.guid)}`);
  lines.push("---");
  return `${lines.join("\n")}\n${data.body.trim()}\n`;
}

// --- main --------------------------------------------------------------------

function main() {
  const slugs = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(/\.html$/, ""))
    .sort();

  const feedRaw = readText(FEED_PATH);
  const archiveRaw = readText(ARCHIVE_PATH);
  const indexDoc = cheerio.load(readText(INDEX_PATH));
  const categoryDocs = {};
  for (const f of fs.readdirSync(CATEGORIES_DIR)) {
    if (!f.endsWith(".html")) continue;
    const slug = f.replace(/\.html$/, "");
    categoryDocs[slug] = cheerio.load(readText(path.join(CATEGORIES_DIR, f)));
  }

  const ctx = {
    feedRaw,
    archiveRaw,
    indexDoc,
    categoryDocs,
    turndown: makeTurndownService(),
    diagnostics: [],
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const report = [];
  for (const slug of slugs) {
    const data = migrateOne(slug, ctx);
    const outPath = path.join(OUT_DIR, `${slug}.md`);
    const doc = serialize(data);

    if (slug === "built-with-ai-here-to-stay" && fs.existsSync(outPath)) {
      const existing = readText(outPath);
      if (existing === doc) {
        report.push({ slug, status: "unchanged (matches hand-migrated reference)" });
      } else {
        report.push({ slug, status: "DIFFERS FROM REFERENCE — not overwritten, see stderr" });
        process.stderr.write(
          `\n[migrate-posts] WARNING: generated output for reference post "${slug}" ` +
            `differs from the existing hand-migrated file. Left the file untouched.\n` +
            `Existing length: ${existing.length}, generated length: ${doc.length}\n`
        );
        continue;
      }
    } else {
      report.push({
        slug,
        status: "written",
        listTitle: data.listTitle,
        excerptHome: data.excerptHome,
        heroTitled: data.heroTitled,
      });
    }

    fs.writeFileSync(outPath, doc, "utf8");
  }

  console.log(`Migrated ${report.length} posts:`);
  for (const r of report) {
    console.log(
      `  ${r.slug}: ${r.status}` +
        (r.listTitle ? ` [listTitle set]` : "") +
        (r.excerptHome ? ` [excerptHome set]` : "") +
        (r.heroTitled ? ` [heroTitled]` : "")
    );
  }
  if (ctx.diagnostics.length) {
    console.log(`\nDiagnostics (title-source cross-checks):`);
    for (const d of ctx.diagnostics) console.log(`  - ${d}`);
  }
}

main();
