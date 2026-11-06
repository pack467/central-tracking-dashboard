# Rule: Tailwind CSS — Mandatory for All Frontend Work

> **Scope**: `frontend/` directory (Next.js / Vinext dashboard app)
> **Tailwind Version**: v4.2 (`@tailwindcss/postcss`)
> **Enforced**: Always — no exceptions unless explicitly overridden by the user.

---

## 1. Core Mandate

All new and modified frontend code **MUST** use Tailwind CSS utility classes.

- **DO NOT** write raw/vanilla CSS declarations (e.g. `color: red; padding: 12px;`).
- **DO NOT** create new `.css` files with traditional CSS rules.
- **DO NOT** add new semantic class names that require custom CSS rules (e.g. `.my-widget-header { ... }`).
- **DO** use Tailwind utility classes directly in JSX `className` attributes.
- **DO** use Tailwind's `@apply` directive **only** when creating reusable component classes in existing stylesheets — never for one-off styling.

---

## 2. Technology Stack Reference

| Layer          | Technology                                  |
| :------------- | :------------------------------------------ |
| Framework      | React 19 (Vinext / Next.js)                 |
| Styling        | **Tailwind CSS v4.2** via `@tailwindcss/postcss` |
| PostCSS Config | `frontend/postcss.config.mjs`               |
| Entry CSS      | `frontend/app/globals.css` (`@import "tailwindcss"`) |
| Design Tokens  | `frontend/app/styles/theme.css` (`@theme inline`) |
| Icons          | `lucide-react`                              |
| Language       | TypeScript (TSX)                            |

---

## 3. Design Token System

This project uses a **token bridge** defined in `frontend/app/styles/theme.css` under `@theme inline`. All design tokens are available as Tailwind classes.

### Color Tokens (use these instead of raw hex/rgba)

| Token Class Prefix          | CSS Variable Source     | Example Usage                     |
| :-------------------------- | :---------------------- | :-------------------------------- |
| `bg-dashboard-bg`           | `--bg`                  | Main page background              |
| `bg-panel-bg`               | `--panel-bg`            | Card/panel backgrounds            |
| `bg-sidebar-bg`             | `--sidebar-bg`          | Sidebar background                |
| `bg-modal-bg`               | `--modal-bg`            | Modal backgrounds                 |
| `text-ink-primary`          | `--ink-primary`         | Primary text                      |
| `text-ink-secondary`        | `--ink-secondary`       | Secondary text                    |
| `text-ink-muted`            | `--ink-muted`           | Muted/helper text                 |
| `border-line`               | `--line`                | Standard borders                  |
| `border-panel-border`       | `--panel-border`        | Panel borders                     |
| `text-accent-blue`          | `--accent-blue`         | Primary accent color              |
| `bg-accent-blue-soft`       | `--accent-blue-soft`    | Subtle accent backgrounds         |
| `text-status-green`         | `--green`               | Success / online indicators       |
| `text-status-orange`        | `--orange`              | Warning indicators                |
| `text-status-red`           | `--red`                 | Error / critical indicators       |
| `text-status-purple`        | `--purple`              | Info / special indicators         |
| `text-priority-critical`    | `--priority-critical`   | Critical priority                 |
| `text-priority-high`        | `--priority-high`       | High priority                     |
| `text-priority-medium`      | `--priority-medium`     | Medium priority                   |
| `text-priority-low`         | `--priority-low`        | Low priority                      |

### Shadow Tokens

| Token Class                  | Usage              |
| :--------------------------- | :----------------- |
| `shadow-dashboard-sm`        | Subtle elevation   |
| `shadow-dashboard-panel`     | Panel elevation    |
| `shadow-dashboard-elevated`  | Modal/overlay      |

### Font Tokens

| Token Class                 | Usage          |
| :-------------------------- | :------------- |
| `font-dashboard-sans`       | Body text      |
| `font-dashboard-mono`       | Code / monospace |

---

## 4. Styling Patterns

### ✅ CORRECT — Utility-first in JSX
```tsx
<div className="flex items-center gap-3 rounded-xl bg-panel-bg border border-panel-border p-4 shadow-dashboard-sm">
  <span className="text-sm font-semibold text-ink-primary">Title</span>
  <span className="text-xs text-ink-muted">Subtitle</span>
</div>
```

### ✅ CORRECT — Conditional classes
```tsx
<button
  className={`
    flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium
    transition-colors duration-150
    ${isActive
      ? "bg-accent-blue-soft text-accent-blue border border-accent-blue-border"
      : "text-ink-muted hover:bg-panel-bg-hover hover:text-ink-primary"
    }
  `}
>
```

### ✅ CORRECT — Arbitrary values when Tailwind doesn't have a built-in class
```tsx
<div className="grid grid-cols-[250px_1fr] min-h-screen">
```

### ❌ WRONG — Raw CSS in a new file
```css
/* DO NOT create files like this */
.my-widget {
  display: flex;
  padding: 16px;
  background: var(--panel-bg);
}
```

### ❌ WRONG — Inline `style` attribute for layout/theming
```tsx
{/* DO NOT do this */}
<div style={{ display: "flex", padding: "16px", background: "var(--panel-bg)" }}>
```

### ❌ WRONG — Arbitrary `@apply` wrapping raw CSS
```css
/* DO NOT add new rules like this */
.some-new-class {
  @apply [display:flex];
  @apply [padding:16px];
  @apply [background:var(--panel-bg)];
}
```

---

## 5. Working with Legacy CSS

The project contains legacy CSS files under `frontend/app/styles/tailwind/` that use a mechanical `@apply [prop:value]` pattern from a previous migration step. These files are **not** the standard to follow.

When modifying existing components:
- **New elements** within an existing component → use Tailwind utility classes in JSX.
- **Modifying existing elements** → prefer converting the element to Tailwind utility classes in JSX if the change is non-trivial. For minor tweaks (1-2 properties), it is acceptable to edit the existing legacy CSS file.
- **Never** add new semantic class names to legacy CSS files.

---

## 6. Responsive Design

Use Tailwind's responsive prefixes:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

Key breakpoints used in this dashboard:
- `md` (768px) — Tablet layout
- `lg` (1024px) — Desktop layout
- `xl` (1280px) — Wide desktop

---

## 7. Animations & Transitions

Use Tailwind's built-in transition/animation utilities:

```tsx
<div className="transition-all duration-200 ease-out hover:scale-[1.02]">
```

For complex/custom animations, use Tailwind's `animate-` classes or define keyframes in the existing `@theme` system — **not** in a new CSS file.

---

## 8. Dark Mode

This dashboard is **dark-only** (`color-scheme: dark` in `:root`). Do NOT add light mode variants. All colors come from the design token system which is already dark-themed.

---

## 9. Quick Reference — Common Patterns

| Pattern                  | Tailwind Classes                                                                  |
| :----------------------- | :-------------------------------------------------------------------------------- |
| Panel/Card               | `rounded-xl bg-panel-bg border border-panel-border p-5 shadow-dashboard-panel`    |
| Page Section Title       | `text-lg font-bold text-ink-primary`                                              |
| Muted Helper Text        | `text-xs text-ink-muted`                                                          |
| Primary Button           | `rounded-lg bg-accent-blue px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition` |
| Secondary Button         | `rounded-lg border border-line bg-transparent px-4 py-2 text-sm text-ink-secondary hover:bg-panel-bg-hover transition` |
| Status Badge (Success)   | `rounded-full bg-status-green-soft px-2.5 py-0.5 text-xs font-medium text-status-green` |
| Status Badge (Warning)   | `rounded-full bg-status-orange-soft px-2.5 py-0.5 text-xs font-medium text-status-orange` |
| Status Badge (Error)     | `rounded-full bg-status-red-soft px-2.5 py-0.5 text-xs font-medium text-status-red` |
| Input Field              | `rounded-lg border border-line bg-input-bg px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent-blue focus:outline-none transition` |
| Flex Row Centered        | `flex items-center gap-3`                                                         |
| Grid Layout              | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`                            |

---

## 10. Checklist Before Committing

- [ ] No new `.css` files created
- [ ] No new semantic class names added to existing CSS files
- [ ] All styling uses Tailwind utility classes in JSX
- [ ] Design tokens from `@theme inline` are used for colors, shadows, and fonts
- [ ] Responsive prefixes are applied where needed
- [ ] No inline `style` attributes for layout or theming
