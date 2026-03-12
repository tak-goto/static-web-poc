/**
 * lint.js — Template, content & SEO/performance linter
 *
 * Checks:
 * 1.  No unresolved {{variables}} in built dist/ HTML
 * 2.  All {{> partials}} exist
 * 3.  frontmatter YAML parses without error
 * 4.  CSS var() references are defined in tokens.css
 * 5.  <title> length (10–60 chars) and not empty
 * 6.  <meta description> length (50–160 chars) and not empty
 * 7.  Each page has exactly one <h1>
 * 8.  <img> tags have alt attribute
 * 9.  <img> tags have width + height attributes (CLS prevention)
 * 10. <img> tags have loading="lazy"
 * 11. Duplicate <title> values across pages
 */

var fs   = require('fs');
var path = require('path');
var fm   = require('front-matter');

var ROOT         = path.join(__dirname, '..');
var TEMPLATE_DIR = path.join(ROOT, 'templates');
var CONTENT_DIR  = path.join(ROOT, 'content');
var DIST_DIR     = path.join(ROOT, 'dist');
var TOKENS_FILE  = path.join(ROOT, 'design-system', 'tokens.css');

var VIRTUAL_PARTIALS = ['content'];

var errors = 0, warnings = 0;
function err(msg)  { console.error('  ✗ ERROR: ' + msg); errors++; }
function warn(msg) { console.warn ('  ⚠ WARN:  ' + msg); warnings++; }
function ok(msg)   { console.log  ('  ✓ ' + msg); }

function attr(tag, name) {
  var m = tag.match(new RegExp(name + '\\s*=\\s*["\']([^"\']*)["\']'));
  return m ? m[1] : null;
}

// ── 1. Unresolved {{variables}} ───────────────────────────
console.log('\n[1] Unresolved {{variables}} in dist/ HTML...');
var distFiles = [];
if (fs.existsSync(DIST_DIR)) {
  distFiles = fs.readdirSync(DIST_DIR).filter(function(f){ return f.endsWith('.html'); });
  distFiles.forEach(function(file) {
    var content = fs.readFileSync(path.join(DIST_DIR, file), 'utf8');
    var found = (content.match(/\{\{[^}]+\}\}/g) || []).filter(function(v,i,a){ return a.indexOf(v)===i; });
    if (found.length) err(file + ': unresolved: ' + found.join(', '));
    else ok(file + ': no unresolved placeholders');
  });
} else {
  warn('dist/ not found — run npm run build first');
}

// ── 2. Partial references ─────────────────────────────────
console.log('\n[2] {{> partial}} references in templates/...');
var componentDir = path.join(TEMPLATE_DIR, 'components');
fs.readdirSync(TEMPLATE_DIR).filter(function(f){ return f.endsWith('.html'); }).forEach(function(file) {
  var content = fs.readFileSync(path.join(TEMPLATE_DIR, file), 'utf8');
  var refs = (content.match(/\{\{>\s*\w+\s*\}\}/g) || []).map(function(m){
    return m.replace(/\{\{>\s*|\s*\}\}/g, '');
  });
  refs.forEach(function(ref) {
    if (VIRTUAL_PARTIALS.indexOf(ref) !== -1) {
      ok(file + ': {{> ' + ref + '}} (virtual — resolved in build.js)');
      return;
    }
    var p = path.join(componentDir, ref + '.html');
    if (!fs.existsSync(p)) err(file + ': missing partial {{> ' + ref + '}}');
    else ok(file + ': {{> ' + ref + '}} found');
  });
});

// ── 3. frontmatter YAML ───────────────────────────────────
console.log('\n[3] frontmatter YAML in content/...');
function checkMd(dir) {
  fs.readdirSync(dir).forEach(function(file) {
    var full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) { checkMd(full); return; }
    if (!file.endsWith('.md')) return;
    try {
      fm(fs.readFileSync(full, 'utf8'));
      ok(path.relative(ROOT, full) + ': frontmatter OK');
    } catch(e) {
      err(path.relative(ROOT, full) + ': YAML parse error — ' + e.message);
    }
  });
}
checkMd(CONTENT_DIR);

// ── 4. CSS token references ───────────────────────────────
console.log('\n[4] CSS var() references vs tokens.css...');
if (fs.existsSync(TOKENS_FILE)) {
  var tokenSrc = fs.readFileSync(TOKENS_FILE, 'utf8');
  var defined = {};
  (tokenSrc.match(/--[\w-]+(?=\s*:)/g) || []).forEach(function(t){ defined[t] = true; });
  [path.join(ROOT, 'design-system', 'base.css')].forEach(function(f) {
    if (!fs.existsSync(f)) return;
    var src = fs.readFileSync(f, 'utf8');
    var used = (src.match(/var\((--[\w-]+)\)/g) || []).map(function(m){ return m.slice(4,-1); });
    var unknown = used.filter(function(t,i,a){ return a.indexOf(t)===i && !defined[t]; });
    var rel = path.relative(ROOT, f);
    if (unknown.length) warn(rel + ': undefined tokens: ' + unknown.join(', '));
    else ok(rel + ': all ' + used.length + ' token references valid');
  });
} else {
  warn('design-system/tokens.css not found');
}

// ── 5-11. SEO & Performance checks on dist/ HTML ─────────
if (distFiles.length > 0) {
  console.log('\n[5–11] SEO & Performance checks...');
  var seenTitles = {};

  distFiles.forEach(function(file) {
    var html = fs.readFileSync(path.join(DIST_DIR, file), 'utf8');
    var label = file + ': ';

    // [5] <title>
    var titleMatch = html.match(/<title>([^<]*)<\/title>/);
    var titleText  = titleMatch ? titleMatch[1].trim() : '';
    var titleLen   = titleText.length;
    if (!titleText)              err(label + '<title> is empty');
    else if (titleLen < 10)     warn(label + '<title> too short (' + titleLen + ' chars, min 10)');
    else if (titleLen > 60)     warn(label + '<title> too long (' + titleLen + ' chars, max 60)');
    else                         ok(label + '<title> length OK (' + titleLen + ' chars)');

    // [11] duplicate titles (collected here, reported after loop)
    if (titleText) {
      if (seenTitles[titleText]) seenTitles[titleText].push(file);
      else seenTitles[titleText] = [file];
    }

    // [6] <meta description>
    var descMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/) ||
                    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/);
    var descText  = descMatch ? descMatch[1].trim() : '';
    var descLen   = descText.length;
    if (!descText)               err(label + '<meta description> is empty');
    else if (descLen < 50)      warn(label + '<meta description> too short (' + descLen + ' chars, min 50)');
    else if (descLen > 160)     warn(label + '<meta description> too long (' + descLen + ' chars, max 160)');
    else                         ok(label + '<meta description> length OK (' + descLen + ' chars)');

    // [7] <h1> count
    var h1s = (html.match(/<h1[\s>]/gi) || []).length;
    if (h1s === 0)               err(label + 'no <h1> found (required for SEO)');
    else if (h1s > 1)           warn(label + h1s + ' <h1> tags found (should be exactly 1)');
    else                         ok(label + 'exactly 1 <h1>');

    // [8–10] <img> attributes
    var imgs = html.match(/<img[^>]+>/gi) || [];
    imgs.forEach(function(tag) {
      var src = attr(tag, 'src') || '<unknown>';
      var id  = label + 'img[' + src + ']';

      // [8] alt
      if (!/\balt\s*=/.test(tag))           err(id + ': missing alt attribute');
      else if (attr(tag, 'alt') === '')     warn(id + ': empty alt (OK only for decorative images)');
      else                                   ok(id + ': has alt');

      // [9] width + height (CLS)
      var hasW = /\bwidth\s*=/.test(tag);
      var hasH = /\bheight\s*=/.test(tag);
      if (!hasW || !hasH)                   warn(id + ': missing width/height (causes CLS)');
      else                                   ok(id + ': has width + height');

      // [10] loading=lazy
      if (!/\bloading\s*=\s*["']lazy["']/.test(tag)) warn(id + ': missing loading="lazy"');
      else                                             ok(id + ': loading=lazy');
    });
    if (imgs.length === 0) ok(label + 'no <img> tags (skipping img checks)');
  });

  // [11] duplicate titles report
  Object.keys(seenTitles).forEach(function(t) {
    if (seenTitles[t].length > 1)
      warn('Duplicate <title> "' + t + '" in: ' + seenTitles[t].join(', '));
  });
}

// ── Summary ───────────────────────────────────────────────
console.log('\n' + '-'.repeat(50));
if (errors > 0) {
  console.error('\n❌ Lint FAILED: ' + errors + ' error(s), ' + warnings + ' warning(s)\n');
  process.exit(1);
} else if (warnings > 0) {
  console.warn('\n⚠  Lint passed with ' + warnings + ' warning(s)\n');
} else {
  console.log('\n✅ All checks passed\n');
}
