/**
 * build.js — Lightweight static site builder
 *
 * Reads: content/*.md + content/site.json + templates/
 * Writes: dist/
 *
 * Usage: node build.js
 */

const fs   = require('fs');
const path = require('path');
const { marked }      = require('marked');
const fm              = require('front-matter');

const CONTENT_DIR  = path.join(__dirname, 'content');
const TEMPLATE_DIR = path.join(__dirname, 'templates');
const DS_DIR       = path.join(__dirname, 'design-system');
const DIST_DIR     = path.join(__dirname, 'dist');

// ── Helpers ──────────────────────────────────────────────

function readFile(p) { return fs.readFileSync(p, 'utf8'); }

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

/** Merge {{key}} placeholders with a data object */
function interpolate(template, data) {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : ''), data);
  });
}

/** Very simple {{#each arr}}...{{/each}} block renderer */
function renderEach(template, data) {
  return template.replace(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g, (_, key, block) => {
    const items = data[key];
    if (!Array.isArray(items)) return '';
    return items.map(item => interpolate(block, item)).join('');
  });
}

/** Load and inline component partials {{> name}} */
function resolvePartials(template, componentData) {
  return template.replace(/{{>\s*(\w+)}}/g, (_, name) => {
    const partialPath = path.join(TEMPLATE_DIR, 'components', `${name}.html`);
    if (!fs.existsSync(partialPath)) return '';
    let partial = readFile(partialPath);
    partial = renderEach(partial, componentData);
    partial = interpolate(partial, componentData);
    return partial;
  });
}

/** Build combined CSS from design-system files */
function buildCSS() {
  const tokens = readFile(path.join(DS_DIR, 'tokens.css')).replace(/@import.*?;/g, '');
  const base   = readFile(path.join(DS_DIR, 'base.css')).replace(/@import.*?;/g, '');
  return tokens + '\n' + base;
}

/** Render a single page */
function renderPage(contentPath, siteData) {
  const raw  = readFile(contentPath);
  const { attributes: frontmatter, body } = fm(raw);
  const pageData = { ...siteData, ...frontmatter };

  pageData.page_title    = pageData.title || pageData.site_name;
  pageData.body_html     = marked.parse(body);

  // Load base template
  const baseTemplate = readFile(path.join(TEMPLATE_DIR, 'base.html'));

  // Replace {{> content}} with body HTML
  let html = baseTemplate.replace('{{> content}}', pageData.body_html);

  // Resolve component partials
  html = resolvePartials(html, pageData);

  // Final interpolation
  html = renderEach(html, pageData);
  html = interpolate(html, pageData);

  return html;
}

// ── Build ─────────────────────────────────────────────────

function build() {
  console.log('Building...');
  ensureDir(DIST_DIR);
  ensureDir(path.join(DIST_DIR, 'assets'));

  // Site-wide data
  const siteData = JSON.parse(readFile(path.join(CONTENT_DIR, 'site.json')));

  // CSS
  fs.writeFileSync(path.join(DIST_DIR, 'assets', 'style.css'), buildCSS());
  console.log('  ✓ dist/assets/style.css');

  // Pages: content/index.md → dist/index.html
  const indexHtml = renderPage(path.join(CONTENT_DIR, 'index.md'), siteData);
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml);
  console.log('  ✓ dist/index.html');

  // Pages: content/pages/*.md → dist/*.html
  const pagesDir = path.join(CONTENT_DIR, 'pages');
  for (const file of fs.readdirSync(pagesDir)) {
    if (!file.endsWith('.md')) continue;
    const html    = renderPage(path.join(pagesDir, file), siteData);
    const outName = file.replace('.md', '.html');
    fs.writeFileSync(path.join(DIST_DIR, outName), html);
    console.log(`  ✓ dist/${outName}`);
  }

  console.log('Build complete.');
}

build();
