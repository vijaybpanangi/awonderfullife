#!/usr/bin/env python3
"""Idempotent SEO metadata injector for awonderfullife.ca (single-language blog).

Adds, before </head> on each page: an absolute self-canonical, Open Graph +
Twitter Card tags, and a schema.org JSON-LD @graph. Posts become BlogPosting
nodes (author/date/image/section parsed from the page itself); other pages
become WebPage/AboutPage/CollectionPage. Reuses each page's own <title>,
<meta name="description">, and (posts) <h1> and byline verbatim. No new prose.

Kept as a maintained tool (docs/ is excluded from the public asset bundle):
re-run after adding a post to give it the same SEO block. Skips any page that
already contains application/ld+json, so re-runs are no-ops.

Run from repo root: python3 docs/superpowers/tools/seo-inject.py
"""
import glob
import html
import json
import re

APEX = "https://awonderfullife.ca/"
AUTHOR = "Vijay Panangipally"
SITE_NAME = "A Wonderful Life"
IMG = APEX + "assets/images/"
OG_DEFAULT = IMG + "og-default.jpg"
PORTRAIT = IMG + "vijay.jpg"

MONTHS = {m.upper(): i for i, m in enumerate(
    ["", "January", "February", "March", "April", "May", "June", "July",
     "August", "September", "October", "November", "December"])}


def grab(text, pattern, required=True):
    m = re.search(pattern, text, re.S)
    if not m:
        if required:
            raise SystemExit(f"FATAL: pattern not found: {pattern!r}")
        return None
    return html.unescape(re.sub(r"\s+", " ", m.group(1)).strip())


def page_url(path):
    if path == "index.html":
        return APEX
    return APEX + path  # about.html, archive.html, categories/x.html, posts/x.html


def iso_date(byline):
    m = re.search(r"([A-Z]+)\s+(\d{1,2}),\s+(\d{4})", byline)
    if not m:
        raise SystemExit(f"FATAL: no date in byline: {byline!r}")
    mon, day, year = m.group(1), int(m.group(2)), m.group(3)
    return f"{year}-{MONTHS[mon]:02d}-{day:02d}"


def shared_nodes():
    site_desc = "A blog by Vijay Panangipally exploring technology, data, and the human experience."
    person_desc = "About Vijay Panangipally - data storyteller, world observer, and writer."
    return [
        {"@type": "WebSite", "@id": APEX + "#website", "name": SITE_NAME,
         "alternateName": "Data, life, and the space between", "url": APEX,
         "description": site_desc, "inLanguage": "en-CA",
         "publisher": {"@id": APEX + "#person"}},
        {"@type": "Person", "@id": APEX + "#person", "name": AUTHOR, "url": APEX,
         "image": PORTRAIT, "description": person_desc, "jobTitle": "Writer"},
        {"@type": "Blog", "@id": APEX + "#blog", "name": SITE_NAME, "url": APEX,
         "inLanguage": "en-CA", "author": {"@id": APEX + "#person"},
         "publisher": {"@id": APEX + "#person"}, "isPartOf": {"@id": APEX + "#website"}},
    ]


def classify(path):
    if path == "index.html":
        return "home"
    if path == "about.html":
        return "about"
    if path == "archive.html":
        return "archive"
    if path.startswith("categories/"):
        return "category"
    return "post"


def page_node(kind, url, title, desc, text):
    if kind == "post":
        headline = grab(text, r"<h1>(.*?)</h1>")          # bare post h1 (masthead h1 has class=)
        section = grab(text, r'<a class="kicker"[^>]*>(.*?)</a>')
        byline = grab(text, r'<p class="post-byline">(.*?)</p>')
        date = iso_date(byline)
        slug = re.sub(r"^posts/|\.html$", "", path_for_image)
        return {
            "@type": "BlogPosting", "@id": url + "#article", "url": url,
            "headline": headline, "name": headline, "description": desc,
            "image": IMG + "posts/" + slug + ".jpg",
            "datePublished": date, "dateModified": date,
            "author": {"@id": APEX + "#person"},
            "publisher": {"@id": APEX + "#person"},
            "articleSection": section, "inLanguage": "en-CA",
            "isPartOf": {"@id": APEX + "#blog"},
            "mainEntityOfPage": {"@id": url + "#article"},
        }
    types = {"home": "CollectionPage", "about": "AboutPage",
             "archive": "CollectionPage", "category": "CollectionPage"}
    node = {"@type": types[kind], "@id": url + "#webpage", "url": url,
            "name": title, "description": desc, "inLanguage": "en-CA"}
    if kind == "about":
        node["about"] = {"@id": APEX + "#person"}
        node["isPartOf"] = {"@id": APEX + "#website"}
    elif kind == "home":
        node["about"] = {"@id": APEX + "#person"}
        node["isPartOf"] = {"@id": APEX + "#website"}
    elif kind == "category":
        node["about"] = {"@id": APEX + "#blog"}
        node["isPartOf"] = {"@id": APEX + "#blog"}
    else:  # archive
        node["isPartOf"] = {"@id": APEX + "#website"}
    return node


def og_image(kind):
    if kind == "post":
        slug = re.sub(r"^posts/|\.html$", "", path_for_image)
        return IMG + "posts/" + slug + ".jpg"
    if kind == "about":
        return PORTRAIT
    return OG_DEFAULT


def build_block(kind, url, title, desc, text):
    og_type = "article" if kind == "post" else "website"
    img = og_image(kind)
    L = []
    L.append(f'    <link rel="canonical" href="{url}">')
    L.append(f'    <meta property="og:site_name" content="{html.escape(SITE_NAME)}">')
    L.append('    <meta property="og:locale" content="en_CA">')
    L.append(f'    <meta property="og:type" content="{og_type}">')
    L.append(f'    <meta property="og:title" content="{html.escape(title)}">')
    L.append(f'    <meta property="og:description" content="{html.escape(desc)}">')
    L.append(f'    <meta property="og:url" content="{url}">')
    L.append(f'    <meta property="og:image" content="{img}">')
    if kind == "post":
        section = grab(text, r'<a class="kicker"[^>]*>(.*?)</a>')
        date = iso_date(grab(text, r'<p class="post-byline">(.*?)</p>'))
        L.append(f'    <meta property="article:published_time" content="{date}">')
        L.append(f'    <meta property="article:author" content="{html.escape(AUTHOR)}">')
        L.append(f'    <meta property="article:section" content="{html.escape(section)}">')
    L.append('    <meta name="twitter:card" content="summary_large_image">')
    L.append(f'    <meta name="twitter:title" content="{html.escape(title)}">')
    L.append(f'    <meta name="twitter:description" content="{html.escape(desc)}">')
    L.append(f'    <meta name="twitter:image" content="{img}">')
    graph = shared_nodes()
    graph.append(page_node(kind, url, title, desc, text))
    doc = {"@context": "https://schema.org", "@graph": graph}
    payload = json.dumps(doc, ensure_ascii=False, indent=2)
    payload = "\n".join("    " + ln for ln in payload.splitlines())
    L.append('    <script type="application/ld+json">')
    L.append(payload)
    L.append('    </script>')
    return "\n".join(L) + "\n"


path_for_image = ""  # set per-file (slug source for post images)


def main():
    paths = (["index.html", "about.html", "archive.html"]
             + sorted(glob.glob("categories/*.html"))
             + sorted(glob.glob("posts/*.html")))
    global path_for_image
    done = skipped = 0
    for path in paths:
        path_for_image = path
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
        if "application/ld+json" in text:
            print(f"skipped (has JSON-LD)   {path}")
            skipped += 1
            continue
        kind = classify(path)
        url = page_url(path)
        title = grab(text, r"<title>(.*?)</title>")
        desc = grab(text, r'<meta name="description" content="(.*?)">')
        block = build_block(kind, url, title, desc, text)
        text = text.replace("</head>", block + "</head>", 1)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(text)
        print(f"done                    {path}  [{kind}]")
        done += 1
    print(f"\n{done} written, {skipped} skipped, {len(paths)} total")


if __name__ == "__main__":
    main()
