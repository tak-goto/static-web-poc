/**
 * build.js — Lightweight static site builder
 */

const fs   = require('fs');
const path = require('path');
const { marked }  = require('marked');
const fm          = require('front-matter');

const CONTENT_DIR  = path.join(__dirname, 'content');
const TEMPLATE_DIR = path.join(__dirname, 'templates');
const DS_DIR       = path.join(__dirname, 'design-system');
const DIST_DIR     = path.join(__dirname, 'dist');

function readFile(p) { return fs.readFileSync(p, 'utf8'); }
function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

/** Flatten nested object with separator: { hero: { eyebrow: 'x' } } → { hero_eyebrow: 'x' } */
function flatten(obj, prefix = '', result = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}_${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, key, result);
    } else {
      result[key] = v;
    }
  }
  return result;
}

/** Replace {{key}} placeholders */
function interpolate(template, data) {
  return template.replace(/{\{\s*([\w.]+)\s*}}/g, (_, key) => {
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : ''), data) ?? '';
  });
}

/** {{#each arr}}...{{/each}} */
function renderEach(template, data) {
  return template.replace(/{{#each (\w+)}}([\s\S]*?){{\/#each}}/g, (_, key, block) => {
    const items = data[key];
    if (!Array.isArray(items)) return '';
    return items.map(item => interpolate(block, item)).join('');
  });
}

/** {{#if_hero}}...{{/if_hero}} — renders block only if hero data present */
function renderIfHero(template, data) {
  return template.replace(/{{#if_hero}}([\s\S]*?){{\/#if_hero}}/g, (_, block) => {
    return data.hero ? block : '';
  });
}

/** Resolve {{> partial}} */
function resolvePartials(template, data) {
  return template.replace(/{{>\s*(\w+)}}/g, (_, name) => {
    const p = path.join(TEMPLATE_DIR, 'components', `${name}.html`);
    if (!fs.existsSync(p)) return '';
    let partial = readFile(p);
    partial = renderIfHero(partial, data);
    partial = renderEach(partial, data);
    partial = interpolate(partial, data);
    return partial;
  });
}

function buildCSS() {
  const tokens = readFile(path.join(DS_DIR, 'tokens.css')).replace(/@import.*?;/g, '');
  const base   = readFile(path.join(DS_DIR, 'base.css')).replace(/@import.*?;/g, '');
  return tokens + '\n' + base;
}

function renderPage(contentPath, siteData) {
  const raw = readFile(contentPath);
  const { attributes: frontmatter, body } = fm(raw);

  // Flatten nested frontmatter (e.g. hero.eyebrow → hero_eyebrow)
  const flatFrontmatter = flatten(frontmatter);

  const pageData = { ...siteData, ...frontmatter, ...flatFrontmatter };
  pageData.page_title = pageData.title || pageData.site_name;
  pageData.body_html  = marked.parse(body);

  let html = readFile(path.join(TEMPLATE_DIR, 'base.html'));
  html = html.replace('{{> content}}', `<div class="page-body">${pageData.body_html}</div>`);
  html = resolvePartials(html, pageData);
  html = renderEach(html, pageData);
  html = interpolate(html, pageData);

  return html;
}

function build() {
  console.log('Building...');
  ensureDir(DIST_DIR);
  ensureDir(path.join(DIST_DIR, 'assets'));

  const siteData = JSON.parse(readFile(path.join(CONTENT_DIR, 'site.json')));

  fs.writeFileSync(path.join(DIST_DIR, 'assets', 'style.css'), buildCSS());
  console.log('  ✓ dist/assets/style.css');

  const indexHtml = renderPage(path.join(CONTENT_DIR, 'index.md'), siteData);
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml);
  console.log('  ✓ dist/index.html');

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
