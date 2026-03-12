const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { marked } = require('marked');
const fm         = require('front-matter');

const CONTENT_DIR  = path.join(__dirname, 'content');
const TEMPLATE_DIR = path.join(__dirname, 'templates');
const DS_DIR       = path.join(__dirname, 'design-system');
const PUBLIC_DIR   = path.join(__dirname, 'public');
const DIST_DIR     = path.join(__dirname, 'dist');

function readFile(p) { return fs.readFileSync(p, 'utf8'); }
function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

// public/ を dist/ へ再帰コピー（画像・フォントなどの静的アセット）
function copyPublic(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  fs.readdirSync(src).forEach(function(name) {
    if (name === '.gitkeep') return;
    var srcPath  = path.join(src, name);
    var destPath = path.join(dest, name);
    if (fs.statSync(srcPath).isDirectory()) {
      copyPublic(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// CSS の内容から 8 文字のハッシュを生成 — キャッシュバスティング用
function cssFingerprint(css) {
  return crypto.createHash('sha256').update(css).digest('hex').slice(0, 8);
}

function flatten(obj, prefix, result) {
  prefix = prefix || '';
  result = result || {};
  for (var k in obj) {
    var key = prefix ? prefix + '_' + k : k;
    if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      flatten(obj[k], key, result);
    } else {
      result[key] = obj[k];
    }
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

function renderPage(contentPath, siteData, cssVersion) {
  var raw    = readFile(contentPath);
  var parsed = fm(raw);
  var flat   = flatten(parsed.attributes);
  var pageData = Object.assign({}, siteData, parsed.attributes, flat);
  pageData.page_title = pageData.title || pageData.site_name;
  pageData.body_html  = marked.parse(parsed.body);
  pageData.css_url    = 'assets/style.css?v=' + cssVersion;

  var html = readFile(path.join(TEMPLATE_DIR, 'base.html'));
  html = html.replace('{{> content}}', '<div class="page-body">' + pageData.body_html + '</div>');
  html = resolvePartials(html, pageData);
  html = renderEach(html, pageData);
  html = interpolate(html, pageData);
  return html;
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

  // 静的アセット (public/ → dist/)
  copyPublic(PUBLIC_DIR, DIST_DIR);
  console.log('  ✓ dist/  ← public/ copied');

  // ページ生成
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), renderPage(path.join(CONTENT_DIR, 'index.md'), siteData, cssVersion));
  console.log('  ✓ dist/index.html');

  fs.readdirSync(path.join(CONTENT_DIR, 'pages')).forEach(function(file) {
    if (!file.endsWith('.md')) return;
    var html = renderPage(path.join(CONTENT_DIR, 'pages', file), siteData, cssVersion);
    var out  = file.replace('.md', '.html');
    fs.writeFileSync(path.join(DIST_DIR, out), html);
    console.log('  ✓ dist/' + out);
  });

  console.log('Build complete.');
}

build();
