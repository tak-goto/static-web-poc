/**
 * lint.js — Template & content linter
 *
 * Checks:
 * 1. No unresolved {{variables}} in built dist/ HTML
 * 2. All {{> partials}} exist (virtual partials like 'content' are whitelisted)
 * 3. frontmatter YAML parses without error
 * 4. CSS var() references are defined in tokens.css
 */

var fs   = require('fs');
var path = require('path');
var fm   = require('front-matter');

var ROOT         = path.join(__dirname, '..');
var TEMPLATE_DIR = path.join(ROOT, 'templates');
var CONTENT_DIR  = path.join(ROOT, 'content');
var DIST_DIR     = path.join(ROOT, 'dist');
var TOKENS_FILE  = path.join(ROOT, 'design-system', 'tokens.css');

// Partials resolved in build.js before partial lookup — not real files
var VIRTUAL_PARTIALS = ['content'];

var errors = 0, warnings = 0;
function err(msg)  { console.error('  \u2717 ERROR: ' + msg); errors++; }
function warn(msg) { console.warn ('  \u26a0 WARN:  ' + msg); warnings++; }
function ok(msg)   { console.log  ('  \u2713 ' + msg); }

// ── 1. Unresolved {{variables}} in dist/ ──────────────────
console.log('\n[1] Unresolved {{variables}} in dist/ HTML...');
if (fs.existsSync(DIST_DIR)) {
  fs.readdirSync(DIST_DIR).filter(function(f){ return f.endsWith('.html'); }).forEach(function(file) {
    var content = fs.readFileSync(path.join(DIST_DIR, file), 'utf8');
    var found = content.match(/\{\{[^}]+\}\}/g) || [];
    var unique = found.filter(function(v,i,a){ return a.indexOf(v)===i; });
    if (unique.length) err(file + ': unresolved placeholders: ' + unique.join(', '));
    else ok(file + ': no unresolved placeholders');
  });
} else {
  warn('dist/ not found — run npm run build first');
}

// ── 2. Partial references ──────────────────────────────────
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
    if (!fs.existsSync(p)) err(file + ': missing partial {{> ' + ref + '}} — no components/' + ref + '.html');
    else ok(file + ': {{> ' + ref + '}} found');
  });
});

// ── 3. frontmatter YAML ────────────────────────────────────
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

// ── 4. CSS token references ────────────────────────────────
console.log('\n[4] CSS var() references vs tokens.css...');
if (fs.existsSync(TOKENS_FILE)) {
  var tokenSrc = fs.readFileSync(TOKENS_FILE, 'utf8');
  var defined = {};
  (tokenSrc.match(/--[\w-]+(?=\s*:)/g) || []).forEach(function(t){ defined[t] = true; });
  var cssFiles = [
    path.join(ROOT, 'design-system', 'base.css'),
  ];
  cssFiles.forEach(function(f) {
    if (!fs.existsSync(f)) return;
    var src = fs.readFileSync(f, 'utf8');
    var used = (src.match(/var\((--[\w-]+)\)/g) || []).map(function(m){ return m.slice(4,-1); });
    var unknown = used.filter(function(t,i,a){ return a.indexOf(t)===i && !defined[t]; });
    var rel = path.relative(ROOT, f);
    if (unknown.length) warn(rel + ': uses undefined tokens: ' + unknown.join(', '));
    else ok(rel + ': all ' + used.length + ' token references valid');
  });
} else {
  warn('design-system/tokens.css not found');
}

// ── Summary ────────────────────────────────────────────────
console.log('\n' + '-'.repeat(50));
if (errors > 0) {
  console.error('\n\u274c Lint FAILED: ' + errors + ' error(s), ' + warnings + ' warning(s)\n');
  process.exit(1);
} else if (warnings > 0) {
  console.warn('\n\u26a0  Lint passed with ' + warnings + ' warning(s)\n');
} else {
  console.log('\n\u2705 All checks passed\n');
}
