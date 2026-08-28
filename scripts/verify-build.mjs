import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const distRoot = path.join(projectRoot, 'dist');
const siteOrigin = 'https://meadbeelabs.com';
const issues = [];
const htmlCache = new Map();

function requireCondition(condition, message) {
  if (!condition) issues.push(message);
}

function decodeHtml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function attributes(tag) {
  const result = new Map();
  const expression = /([:@a-zA-Z][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of tag.matchAll(expression)) {
    result.set(match[1].toLowerCase(), decodeHtml(match[2] ?? match[3] ?? ''));
  }
  return result;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((match) => match[0]);
}

function findMeta(html, key, attribute = 'name') {
  for (const tag of tags(html, 'meta')) {
    const attrs = attributes(tag);
    if (attrs.get(attribute) === key) return attrs.get('content') ?? '';
  }
  return '';
}

function findLink(html, relation) {
  for (const tag of tags(html, 'link')) {
    const attrs = attributes(tag);
    const relations = (attrs.get('rel') ?? '').toLowerCase().split(/\s+/);
    if (relations.includes(relation)) return attrs.get('href') ?? '';
  }
  return '';
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(entryPath));
    else files.push(entryPath);
  }
  return files;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadHtml(filePath) {
  if (!htmlCache.has(filePath)) {
    htmlCache.set(filePath, await readFile(filePath, 'utf8'));
  }
  return htmlCache.get(filePath);
}

function safeDecodePath(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

async function resolvePage(pathname) {
  const decoded = safeDecodePath(pathname);
  const relative = decoded.replace(/^\/+/, '');
  const candidates = [];

  if (!relative) {
    candidates.push(path.join(distRoot, 'index.html'));
  } else if (decoded.endsWith('/')) {
    candidates.push(path.join(distRoot, relative, 'index.html'));
  } else if (path.extname(relative)) {
    candidates.push(path.join(distRoot, relative));
  } else {
    candidates.push(path.join(distRoot, relative, 'index.html'));
    candidates.push(path.join(distRoot, `${relative}.html`));
  }

  for (const candidate of candidates) {
    const normalized = path.resolve(candidate);
    if (!normalized.startsWith(path.resolve(distRoot) + path.sep) && normalized !== path.resolve(distRoot)) {
      return null;
    }
    if (await fileExists(normalized)) return normalized;
  }
  return null;
}

function idsIn(html) {
  const ids = new Set();
  const duplicates = new Set();
  for (const match of html.matchAll(/\sid=(?:"([^"]+)"|'([^']+)')/gi)) {
    const id = decodeHtml(match[1] ?? match[2]);
    if (ids.has(id)) duplicates.add(id);
    ids.add(id);
  }
  return { ids, duplicates };
}

await access(distRoot);
const allFiles = await walk(distRoot);
const htmlFiles = allFiles.filter((file) => file.endsWith('.html')).sort();
requireCondition(htmlFiles.length > 0, 'dist does not contain any HTML pages');

const canonicalPages = new Set();
const noindexCanonicals = new Set();
let internalLinkCount = 0;
let imageCount = 0;
let executableScriptCount = 0;

for (const file of htmlFiles) {
  const html = await loadHtml(file);
  const relativeFile = path.relative(distRoot, file).replaceAll(path.sep, '/');
  const label = relativeFile || 'index.html';
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtml(titleMatch[1].trim()) : '';
  const description = findMeta(html, 'description');
  const canonical = findLink(html, 'canonical');
  const viewport = findMeta(html, 'viewport');
  const robots = findMeta(html, 'robots');
  const themeColor = findMeta(html, 'theme-color');
  const { ids, duplicates } = idsIn(html);

  requireCondition(/<html\s[^>]*lang="en"/i.test(html), `${label}: missing lang="en"`);
  requireCondition(Boolean(title), `${label}: missing document title`);
  requireCondition(Boolean(description), `${label}: missing meta description`);
  requireCondition(viewport.includes('width=device-width'), `${label}: missing responsive viewport metadata`);
  requireCondition(themeColor === '#0b0915', `${label}: missing or unexpected theme color`);
  requireCondition(canonical.startsWith(`${siteOrigin}/`) || canonical === `${siteOrigin}/`, `${label}: invalid canonical URL`);
  requireCondition((html.match(/<h1\b/gi) ?? []).length === 1, `${label}: expected exactly one h1`);
  requireCondition(ids.has('main-content'), `${label}: missing main-content landmark target`);
  requireCondition(/<a\b[^>]*class="skip-link"[^>]*href="#main-content"/i.test(html), `${label}: missing skip link`);
  requireCondition(duplicates.size === 0, `${label}: duplicate IDs: ${[...duplicates].join(', ')}`);

  if (canonical) {
    requireCondition(!canonicalPages.has(canonical), `${label}: duplicate canonical URL ${canonical}`);
    canonicalPages.add(canonical);
  }

  const is404 = relativeFile === '404.html';
  if (is404) {
    requireCondition(robots.includes('noindex'), `${label}: 404 page must be noindex`);
    if (canonical) noindexCanonicals.add(canonical);
  }
  else requireCondition(!robots.includes('noindex'), `${label}: indexable page unexpectedly has noindex`);

  const metadataPairs = [
    ['Open Graph title', findMeta(html, 'og:title', 'property'), title],
    ['Open Graph description', findMeta(html, 'og:description', 'property'), description],
    ['Open Graph URL', findMeta(html, 'og:url', 'property'), canonical],
    ['Twitter title', findMeta(html, 'twitter:title'), title],
    ['Twitter description', findMeta(html, 'twitter:description'), description],
  ];
  for (const [name, actual, expected] of metadataPairs) {
    requireCondition(Boolean(actual) && actual === expected, `${label}: ${name} is missing or inconsistent`);
  }
  requireCondition(findMeta(html, 'twitter:card') === 'summary_large_image', `${label}: invalid Twitter card metadata`);
  requireCondition(findMeta(html, 'og:image', 'property') === `${siteOrigin}/images/social-preview.png`, `${label}: invalid Open Graph image`);
  requireCondition(Boolean(findMeta(html, 'og:image:alt', 'property')), `${label}: missing Open Graph image alternative`);
  requireCondition(Boolean(findMeta(html, 'twitter:image:alt')), `${label}: missing Twitter image alternative`);

  for (const tag of tags(html, 'img')) {
    imageCount++;
    requireCondition(attributes(tag).has('alt'), `${label}: image missing alt attribute`);
  }

  for (const tag of tags(html, 'script')) {
    const type = attributes(tag).get('type') ?? '';
    if (type !== 'application/ld+json') executableScriptCount++;
  }

  for (const match of html.matchAll(/\saria-labelledby=(?:"([^"]+)"|'([^']+)')/gi)) {
    const references = (match[1] ?? match[2]).split(/\s+/).filter(Boolean);
    for (const reference of references) {
      requireCondition(ids.has(reference), `${label}: unresolved aria-labelledby target #${reference}`);
    }
  }

  for (const anchor of tags(html, 'a')) {
    const attrs = attributes(anchor);
    const href = attrs.get('href');
    if (!href) continue;

    let url;
    try {
      url = new URL(href, canonical || `${siteOrigin}/`);
    } catch {
      issues.push(`${label}: invalid link ${href}`);
      continue;
    }

    if (!['http:', 'https:'].includes(url.protocol)) continue;
    if (url.origin !== siteOrigin) {
      if (attrs.get('target') === '_blank') {
        requireCondition((attrs.get('rel') ?? '').includes('noreferrer'), `${label}: external target=_blank link lacks noreferrer`);
      }
      continue;
    }

    internalLinkCount++;
    const targetFile = href.startsWith('#') ? file : await resolvePage(url.pathname);
    if (!targetFile) {
      issues.push(`${label}: internal link does not resolve: ${href}`);
      continue;
    }
    if (url.hash && targetFile.endsWith('.html')) {
      const targetHtml = await loadHtml(targetFile);
      const fragment = safeDecodePath(url.hash.slice(1));
      requireCondition(idsIn(targetHtml).ids.has(fragment), `${label}: fragment does not resolve: ${href}`);
    }
  }
}

const sitemapIndexPath = path.join(distRoot, 'sitemap-index.xml');
requireCondition(await fileExists(sitemapIndexPath), 'missing sitemap-index.xml');
const sitemapUrls = new Set();
if (await fileExists(sitemapIndexPath)) {
  const sitemapIndex = await readFile(sitemapIndexPath, 'utf8');
  const sitemapLocations = [...sitemapIndex.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeHtml(match[1]));
  requireCondition(sitemapLocations.length > 0, 'sitemap index does not reference a child sitemap');
  for (const location of sitemapLocations) {
    const sitemapUrl = new URL(location);
    requireCondition(sitemapUrl.origin === siteOrigin, `sitemap index uses an unexpected origin: ${location}`);
    const childPath = path.join(distRoot, path.basename(sitemapUrl.pathname));
    requireCondition(await fileExists(childPath), `missing child sitemap: ${path.basename(childPath)}`);
    if (!(await fileExists(childPath))) continue;
    const child = await readFile(childPath, 'utf8');
    for (const match of child.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const url = decodeHtml(match[1]);
      requireCondition(!sitemapUrls.has(url), `duplicate sitemap URL: ${url}`);
      sitemapUrls.add(url);
    }
  }
}

const indexableCanonicals = new Set([...canonicalPages].filter((url) => !noindexCanonicals.has(url)));
for (const canonical of indexableCanonicals) {
  requireCondition(sitemapUrls.has(canonical), `canonical URL missing from sitemap: ${canonical}`);
}
for (const sitemapUrl of sitemapUrls) {
  requireCondition(indexableCanonicals.has(sitemapUrl), `sitemap URL has no indexable canonical page: ${sitemapUrl}`);
}

const robotsPath = path.join(distRoot, 'robots.txt');
requireCondition(await fileExists(robotsPath), 'missing robots.txt');
if (await fileExists(robotsPath)) {
  const robots = await readFile(robotsPath, 'utf8');
  requireCondition(/User-agent:\s*\*/i.test(robots), 'robots.txt has no default user-agent policy');
  requireCondition(robots.includes(`Sitemap: ${siteOrigin}/sitemap-index.xml`), 'robots.txt does not advertise the canonical sitemap');
}

const socialPreviewPath = path.join(distRoot, 'images', 'social-preview.png');
requireCondition(await fileExists(socialPreviewPath), 'missing social preview image');
if (await fileExists(socialPreviewPath)) {
  const png = await readFile(socialPreviewPath);
  const isPng = png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  requireCondition(isPng, 'social preview is not a valid PNG');
  if (isPng && png.length >= 24) {
    requireCondition(png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630, 'social preview must be 1200x630');
  }
}

requireCondition(executableScriptCount === 0, `expected a static-first build but found ${executableScriptCount} executable script tag(s)`);

if (issues.length > 0) {
  console.error(`Deployment verification failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

const hasRss = allFiles.some((file) => /(?:rss|feed)\.xml$/i.test(file));
console.log('Deployment verification passed.');
console.log(`- HTML pages: ${htmlFiles.length}`);
console.log(`- Internal links and fragments: ${internalLinkCount}`);
console.log(`- Sitemap URLs: ${sitemapUrls.size}`);
console.log(`- Image elements missing alt: 0 (${imageCount} checked)`);
console.log('- Duplicate IDs and unresolved ARIA references: 0');
console.log(`- Executable client scripts: ${executableScriptCount}`);
console.log(`- RSS: ${hasRss ? 'present' : 'not implemented (optional at the current publication stage)'}`);
