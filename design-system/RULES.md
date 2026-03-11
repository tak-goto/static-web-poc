# Design System Rules

## Principles

1. **Token First** — Never hardcode colors, spacing, or type scales. Always use a CSS variable from `tokens.css`.
2. **Single Source of Truth** — `tokens.css` is the only place visual values are defined.
3. **Composable Components** — Templates are built from small, reusable component partials.
4. **Content / Presentation Separation** — `.md` files hold copy only. Layout and styling live in templates.
5. **No inline styles** — Styling belongs in CSS files, never in HTML attributes.

## Token Naming Convention

```
--[category]-[variant]-[scale]

Examples:
  --color-brand-500
  --space-4
  --text-lg
  --shadow-md
```

## Spacing Rule

All spacing uses the 4px base grid. Use `--space-*` tokens only.
Do not use arbitrary values like `margin: 13px`.

## Color Rule

- Use **semantic tokens** (`--color-bg`, `--color-text`, `--color-accent`) in components.
- Use **primitive tokens** (`--color-brand-500`) only inside `tokens.css` to define semantic tokens.

## Typography Rule

- Body text: `--text-base` with `--leading-loose`
- Headings: `--leading-tight`, appropriate `--text-*` scale
- Never mix font families outside of `--font-sans` and `--font-mono`

## Component Template Rules

- Each component is a standalone HTML partial in `templates/components/`
- Placeholders use `{{variable}}` syntax
- Components reference only classes defined in `base.css` or their own scoped style block
