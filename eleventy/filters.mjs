// Small, single-purpose Nunjucks filters shared by every template.
// Dates in front matter are UTC midnight (Eleventy/js-yaml parses `date: 2026-07-10`
// as a UTC Date), so every formatter below reads UTC getters. A local-time formatter
// would render the day before/after depending on the machine's timezone.

import { readFileSync } from "node:fs";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

// "March 04, 2025" — full month name, zero-padded day, comma year.
export function cardDate(value) {
  const d = toDate(value);
  return `${MONTHS[d.getUTCMonth()]} ${pad2(d.getUTCDate())}, ${d.getUTCFullYear()}`;
}

// "MARCH 04, 2025" — same shape, uppercased (byline / featured post-date).
export function bylineDate(value) {
  return cardDate(value).toUpperCase();
}

// "Fri, 10 Jul 2026 00:00:00 +0000" — RFC 822 for RSS pubDate/lastBuildDate.
export function rfc822Date(value) {
  const d = toDate(value);
  const dow = DAYS_SHORT[d.getUTCDay()];
  const day = pad2(d.getUTCDate());
  const mon = MONTHS_SHORT[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${dow}, ${day} ${mon} ${year} 00:00:00 +0000`;
}

// "2026-07-10" — for sitemap <lastmod> and JSON-LD datePublished/dateModified.
export function isoDate(value) {
  const d = toDate(value);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

// words/200 rounded, minimum 1. Only invoked when a post has no minRead pinned.
export function readingTime(html) {
  const text = String(html || "").replace(/<[^>]*>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Joins an absolute site origin (no trailing slash, e.g. site.url) with a
// root-relative path, producing exactly one slash between them.
export function absoluteUrl(path, base) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "");
  return b + (p.startsWith("/") ? p : `/${p}`);
}

// Normalizes an Eleventy `page.url` (which always keeps the .html extension
// for our flat-file output) down to the root-relative, extension-less path
// used in every href/canonical/sitemap entry.
export function cleanUrl(url) {
  if (url === "/" || url === "/index.html") return "/";
  return url.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
}

// Decodes the small set of HTML entities that show up in hand-authored meta
// description attributes (front matter stores those verbatim, entities and
// all, per the migration brief) so JSON-LD can carry the real characters.
export function htmlDecode(str) {
  return String(str || "")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Matches Python's html.escape(quote=True) (used by the legacy seo-inject.py
// tooling) byte for byte, including &#x27; (hex) for apostrophes rather than
// Nunjucks' own &#39;. Used with `| safe` so it isn't escaped a second time.
export function xmlEscape(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Reads a JPEG's intrinsic pixel dimensions straight from its SOF marker, so
// `og:image:width`/`height` carry the real size of whichever image a page uses.
// Our OG images are heterogeneous (post heroes ~1536x1024, the About portrait
// 595x592, the default 1600x896), so a single hardcoded pair would be wrong for
// most pages. Dependency-free (no image-processing library), memoized per path,
// and self-maintaining: a new post's hero is measured automatically at build.
// Takes a root-relative path (e.g. "/assets/images/posts/slug.jpg"); the source
// asset lives at that path under the repo root (build cwd). Returns
// { width, height } or null if the file is missing/unreadable/not a parseable
// JPEG — callers omit the width/height tags when null (no wrong values emitted).
const _imageDimsCache = new Map();

function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null; // not SOI
  let off = 2;
  while (off + 1 < buf.length) {
    if (buf[off] !== 0xff) {
      off++;
      continue;
    }
    const marker = buf[off + 1];
    if (marker === 0xff) {
      off++; // fill byte, keep scanning for the marker
      continue;
    }
    off += 2;
    // Standalone markers with no length payload: SOI, EOI, RSTn, TEM.
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      continue;
    }
    if (off + 2 > buf.length) break;
    const segLen = buf.readUInt16BE(off);
    if (segLen < 2) break;
    // Start-of-Frame markers carry the dimensions: C0-CF except C4 (DHT),
    // C8 (JPG), CC (DAC). Layout after the length: precision(1), height(2), width(2).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (off + 7 > buf.length) break;
      return { height: buf.readUInt16BE(off + 3), width: buf.readUInt16BE(off + 5) };
    }
    off += segLen;
  }
  return null;
}

export function imageDims(rootRelativePath) {
  if (!rootRelativePath) return null;
  if (_imageDimsCache.has(rootRelativePath)) return _imageDimsCache.get(rootRelativePath);
  let dims = null;
  try {
    dims = jpegSize(readFileSync(rootRelativePath.replace(/^\/+/, "")));
  } catch {
    dims = null;
  }
  _imageDimsCache.set(rootRelativePath, dims);
  return dims;
}

// Groups an already date-DESC-sorted post collection into
// [{ year, posts: [...] }, ...] newest year first, for archive.njk and facets.njk.
export function byYear(posts) {
  const map = new Map();
  for (const post of posts) {
    const year = toDate(post.data.date).getUTCFullYear();
    if (!map.has(year)) map.set(year, []);
    map.get(year).push(post);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, yearPosts]) => ({ year, posts: yearPosts }));
}

// Filters a post collection down to one category, preserving order.
export function byCategory(posts, slug) {
  return posts.filter((post) => post.data.category === slug);
}

// Display name lookup for a category slug against site.categories.
export function categoryName(slug, categories) {
  const match = (categories || []).find((c) => c.slug === slug);
  return match ? match.name : slug;
}

// Chronological prev/next neighbours of a post within a date-DESC-sorted
// collection: "older" is the next array entry, "newer" is the previous one.
export function postNeighbors(posts, fileSlug) {
  const idx = posts.findIndex((p) => p.fileSlug === fileSlug);
  if (idx === -1) return { older: null, newer: null };
  return {
    older: idx + 1 < posts.length ? posts[idx + 1] : null,
    newer: idx > 0 ? posts[idx - 1] : null,
  };
}

// Build-time "related posts" selection: same category first, newest first,
// backfilled from other categories (also newest first) if the same-category
// pool doesn't reach `limit`. `posts` is the already date-DESC `collections.posts`
// collection, so a single pass over it (splitting into a same-category bucket
// and an "others" bucket, each preserving incoming order) is enough to get a
// stable, deterministic result with no re-sorting needed.
//
// Self-exclusion: the current post is skipped by fileSlug before it can land
// in either bucket, so it can never appear in its own related list.
// Dedup: every other post is visited exactly once (it lands in exactly one
// of the two mutually-exclusive buckets), so the same post can never be
// pushed into the result twice.
export function relatedPosts(posts, currentPage, category, limit = 3) {
  const selfSlug = currentPage && currentPage.fileSlug;
  const sameCategory = [];
  const others = [];
  for (const post of posts || []) {
    if (post.fileSlug === selfSlug) continue;
    if (post.data.category === category) sameCategory.push(post);
    else others.push(post);
  }
  const result = sameCategory.slice(0, limit);
  for (const post of others) {
    if (result.length >= limit) break;
    result.push(post);
  }
  return result;
}
