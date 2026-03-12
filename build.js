var fs     = require('fs');
var path   = require('path');
var crypto = require('crypto');
var marked = require('marked').marked;
var fm     = require('front-matter');

var CONTENT_DIR  = path.join(__dirname, 'content');
var TEMPLATE_DIR = path.join(__dirname, 'templates');
var DS_DIR       = path.join(__dirname, 'design-system');
var PUBLIC_DIR   = path.join(__dirname, 'public');
var DIST_DIR     = path.join(__dirname, 'dist');

function readFile(p) { return fs.readFileSync(p, 'utf8'); }
function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function copyPublic(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  fs.readdirSync(src).forEach(function(name) {
    if (name === '.gitkeep') return;
    var s = path.join(src, name), d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyPublic(s, d);
    else fs.copyFileSync(s, d);
  });
}

function cssFingerprint(css) {
  return crypto.createHash('sha256').update(css).digest('hex').slice(0, 8);
}

function flatten(obj, prefix, result) {
  prefix = prefix || ''; result = result || {};
  for (var k in obj) {
    var key = prefix ? prefix + '_' + k : k;
    if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) flatten(obj[k], key, result);
    else result[key] = obj[k];
  }
  return result;
}

function interpolate(tpl, data) {
  return tpl.replace(/\{\{\s*([\w_]+)\s*\}\}/g, function(_, key) {
    return (data[key] !== undefined && data[key] !== null) ? data[key] : '';
  });
}
function renderEach(tpl, data) {
  return tpl.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, function(_, key, block) {
    var items = data[key];
    if (!Array.isArray(items)) return '';
    return items.map(function(item) { return interpolate(block, item); }).join('');
  });
}
function renderIfHero(tpl, data) {
  return tpl.replace(/\{\{#if_hero\}\}([\s\S]*?)\{\{\/if_hero\}\}/g, function(_, block) {
    return data.hero ? block : '';
  });
}
function resolvePartials(tpl, data) {
  return tpl.replace(/\{\{>\s*(\w+)\}\}/g, function(_, name) {
    var p = path.join(TEMPLATE_DIR, 'components', name + '.html');
    if (!fs.existsSync(p)) return '';
    var partial = readFile(p);
    partial = renderIfHero(partial, data);
    partial = renderEach(partial, data);
    partial = interpolate(partial, data);
    return partial;
  });
}

function buildCSS() {
  var tokens = readFile(path.join(DS_DIR, 'tokens.css')).replace(/@import[^;]+;/g, '');
  var base   = readFile(path.join(DS_DIR, 'base.css')).replace(/@import[^;]+;/g, '');
  return tokens + '\n' + base;
}

// ── OGP helpers ──────────────────────────────────────────
function resolveOgp(pageData, siteData) {
  var baseUrl = (siteData.base_url || '').replace(/\/$/, '');
  var slug    = pageData._slug || 'index';
  var pageUrl = baseUrl ? baseUrl + '/' + (slug === 'index' ? '' : slug + '.html') : '';

  pageData.og_title       = pageData.og_title       || pageData.page_title  || siteData.site_name;
  pageData.og_description = pageData.og_description || pageData.meta_description || '';
  pageData.og_image       = pageData.og_image       || siteData.og_default_image || '';
  pageData.og_url         = pageData.og_url         || pageUrl;
  pageData.og_type        = pageData.og_type        || 'website';
  pageData.canonical_url  = pageData.canonical_url  || pageUrl;
  return pageData;
}

function renderPage(contentPath, siteData, cssVersion) {
  var raw    = readFile(contentPath);
  var parsed = fm(raw);
  var flat   = flatten(parsed.attributes);
  var pageData = Object.assign({}, siteData, parsed.attributes, flat);
  pageData.page_title = pageData.title || siteData.site_name;
  pageData.body_html  = marked(parsed.body);
  pageData.css_url    = 'assets/style.css?v=' + cssVersion;

  // slug from filename for canonical / OGP
  pageData._slug = path.basename(contentPath, '.md');
  pageData = resolveOgp(pageData, siteData);

  var html = readFile(path.join(TEMPLATE_DIR, 'base.html'));
  html = html.replace('{{> content}}', '<div class="page-body">' + pageData.body_html + '</div>');
  html = resolvePartials(html, pageData);
  html = renderEach(html, pageData);
  html = interpolate(html, pageData);
  return html;
}

// ── sitemap.xml ──────────────────────────────────────────
function buildSitemap(pages, siteData) {
  var baseUrl = (siteData.base_url || '').replace(/\/$/, '');
  if (!baseUrl) return null;  // base_url がなければスキップ
  var now = new Date().toISOString().slice(0, 10);
  var urls = pages.map(function(slug) {
    var loc = baseUrl + '/' + (slug === 'index' ? '' : slug + '.html');
    return '  <url>\n    <loc>' + loc + '</loc>\n    <lastmod>' + now + '</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>';
  });
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') + '\n</urlset>\n';
}

// ── robots.txt ───────────────────────────────────────────
function buildRobots(siteData) {
  var baseUrl = (siteData.base_url || '').replace(/\/$/, '');
  var sitemap = baseUrl ? '\nSitemap: ' + baseUrl + '/sitemap.xml' : '';
  return 'User-agent: *\nAllow: /' + sitemap + '\n';
}

function build() {
  console.log('Building...');
  ensureDir(DIST_DIR);
  ensureDir(path.join(DIST_DIR, 'assets'));

  var siteData = JSON.parse(readFile(path.join(CONTENT_DIR, 'site.json')));

  // CSS
  var css = buildCSS();
  var cssVersion = cssFingerprint(css);
  fs.writeFileSync(path.join(DIST_DIR, 'assets', 'style.css'), css);
  console.log('  ✓ dist/assets/style.css  (v=' + cssVersion + ')');

  // static assets
  copyPublic(PUBLIC_DIR, DIST_DIR);
  console.log('  ✓ dist/  ← public/ copied');

  // pages
  var slugs = ['index'];
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), renderPage(path.join(CONTENT_DIR, 'index.md'), siteData, cssVersion));
  console.log('  ✓ dist/index.html');

  fs.readdirSync(path.join(CONTENT_DIR, 'pages')).forEach(function(file) {
    if (!file.endsWith('.md')) return;
    var slug = file.replace('.md', '');
    slugs.push(slug);
    var html = renderPage(path.join(CONTENT_DIR, 'pages', file), siteData, cssVersion);
    fs.writeFileSync(path.join(DIST_DIR, slug + '.html'), html);
    console.log('  ✓ dist/' + slug + '.html');
  });

  // sitemap.xml
  var sitemap = buildSitemap(slugs, siteData);
  if (sitemap) {
    fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap);
    console.log('  ✓ dist/sitemap.xml  (' + slugs.length + ' URLs)');
  } else {
    console.log('  - dist/sitemap.xml skipped (set base_url in site.json to enable)');
  }

  // robots.txt
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), buildRobots(siteData));
  console.log('  ✓ dist/robots.txt');

  console.log('Build complete.');
}

build();
