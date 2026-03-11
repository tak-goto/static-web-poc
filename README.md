# static-web-poc

A lightweight static site CMS built on design tokens, templates, and Markdown content.

## Structure

```
static-web-poc/
├── design-system/     # Tokens, base styles, design rules
├── templates/         # HTML templates & components
├── content/           # Markdown pages + site config JSON
├── build.js           # Build script
└── dist/              # Output (GitHub Pages source)
```

## Usage

```bash
npm install
npm run build
```

Output goes to `dist/`. GitHub Pages is configured to serve from `dist/` on `main` branch.
