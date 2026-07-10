// Reproduces the JSON-LD @graph shape written by docs/superpowers/tools/seo-inject.py:
// a shared WebSite + Person + Blog, plus one per-page node (BlogPosting for
// posts, CollectionPage for home/archive/categories, AboutPage for about).
import { htmlDecode, isoDate } from "./filters.mjs";

export function sharedNodes(site) {
  return [
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      name: site.name,
      alternateName: site.tagline,
      url: `${site.url}/`,
      description: site.description,
      inLanguage: "en-CA",
      publisher: { "@id": `${site.url}/#person` },
    },
    {
      "@type": "Person",
      "@id": `${site.url}/#person`,
      name: site.author,
      url: `${site.url}/`,
      image: `${site.url}/assets/images/vijay.jpg`,
      email: site.email,
      description: site.personDescription,
      jobTitle: "Writer",
    },
    {
      "@type": "Blog",
      "@id": `${site.url}/#blog`,
      name: site.name,
      url: `${site.url}/`,
      inLanguage: "en-CA",
      author: { "@id": `${site.url}/#person` },
      publisher: { "@id": `${site.url}/#person` },
      isPartOf: { "@id": `${site.url}/#website` },
    },
  ];
}

// `ctx` fields: kind ("home"|"about"|"archive"|"category"|"post"), url (absolute,
// extension-less), title, description (raw, entity-laden as copied from meta),
// and for posts: headline, image, date, articleSection.
export function pageNode(site, ctx) {
  const desc = htmlDecode(ctx.description);
  if (ctx.kind === "post") {
    return {
      "@type": "BlogPosting",
      "@id": `${ctx.url}#article`,
      url: ctx.url,
      headline: ctx.headline,
      name: ctx.headline,
      description: desc,
      image: ctx.image,
      datePublished: isoDate(ctx.date),
      dateModified: isoDate(ctx.date),
      author: { "@id": `${site.url}/#person` },
      publisher: { "@id": `${site.url}/#person` },
      articleSection: ctx.articleSection,
      inLanguage: "en-CA",
      isPartOf: { "@id": `${site.url}/#blog` },
      mainEntityOfPage: { "@id": `${ctx.url}#article` },
    };
  }

  const types = { home: "CollectionPage", about: "AboutPage", archive: "CollectionPage", category: "CollectionPage" };
  const node = {
    "@type": types[ctx.kind],
    "@id": `${ctx.url}#webpage`,
    url: ctx.url,
    name: ctx.title,
    description: desc,
    inLanguage: "en-CA",
  };
  if (ctx.kind === "about") {
    node.about = { "@id": `${site.url}/#person` };
    node.isPartOf = { "@id": `${site.url}/#website` };
  } else if (ctx.kind === "home") {
    node.about = { "@id": `${site.url}/#person` };
    node.isPartOf = { "@id": `${site.url}/#website` };
  } else if (ctx.kind === "category") {
    node.about = { "@id": `${site.url}/#blog` };
    node.isPartOf = { "@id": `${site.url}/#blog` };
  } else {
    // archive
    node.isPartOf = { "@id": `${site.url}/#website` };
  }
  return node;
}

export function buildGraph(site, ctx) {
  const graph = [...sharedNodes(site), pageNode(site, ctx)];
  const doc = { "@context": "https://schema.org", "@graph": graph };
  const payload = JSON.stringify(doc, null, 2)
    .split("\n")
    .map((line) => "    " + line)
    .join("\n");
  return `    <script type="application/ld+json">\n${payload}\n    </script>`;
}
