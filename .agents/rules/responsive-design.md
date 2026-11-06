# Rule: Responsive Design — Universal Device Support

> **Scope**: `frontend/` directory (Central Tracking Dashboard)
> **Priority**: MANDATORY — every new or modified component MUST be responsive.
> **Philosophy**: Mobile-first, progressively enhanced up to ultra-wide/TV displays.

---

## 1. Breakpoint System (Tailwind v4)

Use these **standardized breakpoints** consistently across the entire project. Never invent ad-hoc pixel values.

| Tier | Tailwind Prefix | Min Width | Target Devices |
| :--- | :-------------- | :-------- | :------------- |
| **XS** | _(default)_ | `0px` | Small phones (iPhone SE, Galaxy A series) |
| **SM** | `sm:` | `640px` | Large phones (iPhone 15 Pro Max, landscape phones) |
| **MD** | `md:` | `768px` | Tablets portrait (iPad Mini, iPad Air) |
| **LG** | `lg:` | `1024px` | Tablets landscape, small laptops (iPad Pro landscape, Surface Go) |
| **XL** | `xl:` | `1280px` | Laptops & standard monitors (13"–15" MacBook, 1080p monitors) |
| **2XL** | `2xl:` | `1536px` | Large monitors (1440p, 27" iMac, QHD) |
| **3XL** | `3xl:` _(custom)_ | `1920px` | Full HD monitors, office TVs |
| **4XL** | `4xl:` _(custom)_ | `2560px` | 4K monitors, ultra-wide displays, large TVs |

### Custom Breakpoints to Register

If these aren't registered yet, add them to `frontend/app/globals.css` or `frontend/app/styles/theme.css`:

```css
@theme inline {
  --breakpoint-3xl: 1920px;
  --breakpoint-4xl: 2560px;
}
```

---

## 2. Layout Architecture by Breakpoint

### 2.1 App Shell (`app-shell`, `sidebar`, `workspace`, `topbar`)

```
┌─────────────────────────────────────────────────────────────────┐
│ XS–MD (< 768px): MOBILE LAYOUT                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Topbar (hamburger + actions, height: 56px)                  │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ page-content (full width, padding: 16px)                    │ │
│ │ Sidebar = HIDDEN (replaced by MobileNav overlay)            │ │
│ │ ShiftCoveragePanel = HIDDEN (accessible via overlay/modal)  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ MD–LG (768px–1024px): TABLET LAYOUT                             │
│ ┌──────┬──────────────────────────────────────────────────────┐ │
│ │ Side │ Topbar (actions)                                     │ │
│ │ bar  ├──────────────────────────────────────────────────────┤ │
│ │ 68px │ page-content (padding: 20px)                         │ │
│ │(icon │ Sidebar = COLLAPSED (icon-only, 68px)                │ │
│ │only) │ ShiftCoveragePanel = HIDDEN unless toggled            │ │
│ └──────┴──────────────────────────────────────────────────────┘ │
│                                                                 │
│ LG–XL (1024px–1280px): COMPACT DESKTOP                          │
│ ┌──────────┬──────────────────────────────────────────────────┐ │
│ │ Sidebar  │ Topbar                                           │ │
│ │ 216px    ├──────────────────────────────────────────────────┤ │
│ │ (narrow) │ page-content (padding: 22px)                     │ │
│ └──────────┴──────────────────────────────────────────────────┘ │
│                                                                 │
│ XL+ (≥ 1280px): FULL DESKTOP                                   │
│ ┌──────────┬──────────────────────────────────────┬───────────┐ │
│ │ Sidebar  │ Topbar                               │ Shift     │ │
│ │ 250px    ├──────────────────────────────────────┤ Coverage  │ │
│ │ (full)   │ page-content (padding: 28px 32px)   │ Panel     │ │
│ │          │ max-width: 1600px                    │ 320px     │ │
│ └──────────┴──────────────────────────────────────┴───────────┘ │
│                                                                 │
│ 3XL–4XL (≥ 1920px): LARGE SCREEN / TV                          │
│ Same as XL+ but:                                                │
│ - page-content max-width: 2000px (or removed for TV)            │
│ - Larger padding: 36px 48px                                     │
│ - Grid columns may expand (e.g. metrics-grid: 5–6 columns)     │
│ - Font sizes scale up proportionally                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Per-View Responsive Rules

### 3.1 Dashboard / Overview (`OverviewView`, `TicketReportView`)

| Element | XS (< 640px) | SM–MD | LG–XL | 2XL+ |
| :--- | :--- | :--- | :--- | :--- |
| `metrics-grid` | 1 col, stack | 2 cols | 4 cols | 4–5 cols |
| `dashboard-grid` | 1 col | 1 col | `1fr 300px` | `1fr 320px` |
| `side-column` | 1 col stack | 2 cols | 2 cols | 2 cols |
| Stat cards | Full width | 2 per row | 4 per row | 4–5 per row |
| Charts (Sparkline, Traffic) | Full width, min-height: 180px | Full width | Side panel | Side panel |
| `health-strip` | Vertical stack, scrollable | Horizontal wrap | Single row | Single row |
| `page-heading` | Column layout, gap-12px | Row layout | Row layout | Row layout |

### 3.2 Tickets (`TicketsView`)

| Element | XS (< 640px) | SM–MD | LG | XL+ |
| :--- | :--- | :--- | :--- | :--- |
| Ticket table layout | Card list (stacked) | Simplified grid (3 cols) | Full grid (5 cols) | Full grid (6+ cols) |
| Filter toolbar | Vertical stack, full-width selects | Horizontal scroll | Inline row | Inline row |
| Column visibility | Show: subject, status, priority | + owner | + created time | All columns |
| `ticket-row` click area | Full card tap | Full row | Full row | Full row |
| Ticket drawer/detail | Full-screen overlay | Side drawer 400px | Side drawer 480px | Side drawer 520px |

### 3.3 Monitoring (`MonitoringView`)

| Element | XS (< 640px) | SM–MD | LG | XL+ |
| :--- | :--- | :--- | :--- | :--- |
| Checkpoint grid | 1 col | 2 cols | 3 cols | 3–4 cols |
| Action buttons | Icon-only | Icon + short label | Full label | Full label |
| Assessment controls | Stack vertically | Inline row | Inline row | Inline row |
| History section | Accordion/collapse | Visible, compact | Full width | Full width |
| Schedule table | Horizontal scroll with min-width | Responsive grid | Full table | Full table |

### 3.4 Shift Log (`ShiftLogView`)

| Element | XS (< 640px) | SM–MD | LG | XL+ |
| :--- | :--- | :--- | :--- | :--- |
| Task list | Card layout | Card layout | Table layout | Table layout |
| Handover form | Full-width stack | Full-width stack | 2-column form | 2-column form |
| History controls | Dropdown/accordion | Inline tabs | Inline tabs | Inline tabs |
| Memo notepad | Full-width, auto-height | Full-width | Side-by-side with tasks | Side-by-side |

### 3.5 Reports (`ReportsView`)

| Element | XS (< 640px) | SM–MD | LG | XL+ |
| :--- | :--- | :--- | :--- | :--- |
| Chart containers | Full width, shorter | Full width | 2-col grid | 2-col grid |
| Summary stat cards | 2-col grid | 3-col grid | 4-col grid | 4–6 col grid |
| Date filter bar | Stacked selects | Inline row | Inline row | Inline row |

### 3.6 Team Roster (`TeamRosterView`)

| Element | XS (< 640px) | SM–MD | LG | XL+ |
| :--- | :--- | :--- | :--- | :--- |
| `roster-main-layout` | 1 col stack | 1 col stack | 2 cols (`1fr 300px`) | 2 cols |
| Roster table | Card list | Simplified table | Full table | Full table |
| Toolbar (search + filters) | Stacked | 2-row layout | Single row | Single row |
| Column visibility | Name + status only | + role, shift | All columns | All columns |
| Member detail drawer | Full-screen overlay | Side drawer 380px | Side drawer 420px | Side drawer 480px |
| Calendar view | Horizontal scroll | Responsive grid | Full grid | Full grid |

### 3.7 Profile (`ProfileView`)

| Element | XS (< 640px) | SM–MD | LG | XL+ |
| :--- | :--- | :--- | :--- | :--- |
| Profile header | Vertical, centered | Horizontal | Horizontal | Horizontal |
| Settings panels | Full-width stack | Full-width stack | 2-col grid | 2-col grid |
| Avatar section | Compact | Standard | Standard | Standard |
| Activity history | Simplified list | Full list | Full list | Full list |

### 3.8 Notifications (`NotificationsView`)

| Element | XS (< 640px) | SM–MD | LG | XL+ |
| :--- | :--- | :--- | :--- | :--- |
| Notification list | Full-width cards | Full-width cards | Centered max-width | Centered max-width |
| Filter tabs | Horizontal scroll | Inline row | Inline row | Inline row |
| Action buttons | Icon-only | Icon + label | Full label | Full label |

---

## 4. Component-Level Responsive Rules

### 4.1 Topbar

```
XS–SM:  height: 56px, padding: 0 14px
        Show: hamburger + clock + refresh button
        Hide: shift badge label (show icon only), client switcher text (icon only)
        
MD:     height: 56px, padding: 0 16px
        Show: all items, shift badge compact

LG+:    height: 56px (or 60px), padding: 0 20px
        Show: everything including full shift badge label & period
```

### 4.2 Sidebar

```
XS–MD (< 768px):    display: none (use MobileNav overlay instead)
MD–LG (768–1024px): collapsed state (68px, icon-only) by default
LG–XL (1024–1280px): narrow (216px)
XL+ (≥ 1280px):     full width (250px)
```

### 4.3 Modals & Drawers

```
XS (< 640px):   Full-screen takeover (inset: 0, border-radius: 0)
SM–MD:          Nearly full screen with small margin (inset: 8px, rounded-xl)
LG:             Centered modal (max-width: 600px) or side drawer (width: 420px)
XL+:            Same as LG but slightly wider if needed
```

### 4.4 Floating Action Button (`FloatingNewTicketButton`)

```
XS–SM:  bottom: 20px, right: 20px, size: 48px (icon only)
MD:     bottom: 24px, right: 24px, size: 48px (icon only)
LG+:    bottom: 28px, right: 28px, size: 52px (can show label on hover)
```

### 4.5 Tables (General Pattern)

All data tables in the project MUST follow this pattern:

```
XS (< 640px):   
  - Convert to CARD LAYOUT (each row becomes a card)
  - Stack fields vertically within each card
  - Show only essential fields (title, status, priority)

SM–MD (640–1024px):
  - Simplified grid with fewer columns
  - Hide low-priority columns (created time, owner details)
  - Enable horizontal scroll if needed with overscroll-behavior-x: contain

LG+ (≥ 1024px):
  - Full table with all columns
  - Sticky header row
  - No horizontal scroll needed
```

---

## 5. Typography Scaling

Use `clamp()` for fluid typography that scales smoothly across all viewports.

| Element | Min (mobile) | Preferred | Max (desktop/TV) |
| :--- | :--- | :--- | :--- |
| Page title (`h1`) | `18px` | `2vw` | `28px` |
| Section heading (`h2`) | `15px` | `1.5vw` | `22px` |
| Body text | `13px` | `1vw` | `15px` |
| Small/muted text | `11px` | `0.8vw` | `13px` |
| Eyebrow/label | `9px` | `0.7vw` | `11px` |
| Monospace/code | `11px` | `0.8vw` | `13px` |
| Stat card number | `20px` | `2.2vw` | `32px` |

### Implementation Example

```tsx
<h1 className="text-[clamp(18px,2vw,28px)] font-bold text-ink-primary">
  Dashboard Overview
</h1>
```

---

## 6. Touch Target Rules

For mobile and tablet (touch devices), **all interactive elements** MUST meet these minimums:

| Element Type | Minimum Size | Minimum Spacing |
| :--- | :--- | :--- |
| Buttons | `44px × 44px` | `8px` gap from neighbors |
| Nav items | `44px` height | `4px` vertical gap |
| Table rows (tappable) | `48px` min-height | — |
| Icon buttons | `40px × 40px` | `8px` gap |
| Checkbox / Toggle | `44px × 44px` hit area | `12px` |
| Input fields | `44px` min-height | `8px` vertical gap |

### Implementation

```tsx
{/* CORRECT — touch target ≥ 44px */}
<button className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2">
  <X size={16} />
</button>

{/* WRONG — too small for touch */}
<button className="p-1">
  <X size={12} />
</button>
```

---

## 7. Spacing Scale by Viewport

| Token | XS (mobile) | MD (tablet) | LG+ (desktop) | 3XL+ (TV) |
| :--- | :--- | :--- | :--- | :--- |
| Page padding | `16px` | `20px` | `28px 32px` | `36px 48px` |
| Panel padding | `12px` | `16px` | `20px` | `24px` |
| Card gap | `12px` | `14px` | `16px` | `20px` |
| Section gap | `20px` | `24px` | `28px` | `36px` |
| Element inline gap | `6px` | `8px` | `10px` | `12px` |

---

## 8. Grid Scaling Patterns

### Metric/Stat Cards

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 4xl:grid-cols-6 gap-3 md:gap-4 xl:gap-5">
```

### Dashboard Main Grid

```tsx
<div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] 2xl:grid-cols-[1fr_320px] gap-5">
```

### Toolbar / Filter Row

```tsx
<div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
```

---

## 9. Overflow & Scroll Handling

### Horizontal Scrollable Containers

When content doesn't fit (tables, tab bars, schedules), use this pattern:

```tsx
<div className="overflow-x-auto overscroll-x-contain scrollbar-thin">
  <div className="min-w-[720px]">
    {/* Table content */}
  </div>
</div>
```

### Rules

- **NEVER** let content overflow and be hidden without a scroll indicator.
- **ALWAYS** add `overscroll-behavior-x: contain` to prevent page-level swipe interference on mobile.
- **ALWAYS** add `scrollbar-width: thin` (or hidden on mobile for cleaner UX).
- For tab bars, use `overflow-x-auto` + `flex-nowrap` + `snap-x snap-mandatory`.

---

## 10. Image & Media Responsiveness

```tsx
{/* All images must be responsive by default */}
<img className="w-full h-auto max-w-full object-cover" />

{/* Avatar images — fixed size per breakpoint */}
<div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full overflow-hidden" />
```

---

## 11. Viewport Meta Tag

Ensure `layout.tsx` renders a proper viewport meta tag. Next.js does this automatically, but verify:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

The `viewport-fit=cover` is critical for devices with notches (iPhone 14+) to ensure safe area support.

For safe area insets (notched devices):

```tsx
<div className="pb-[env(safe-area-inset-bottom)]">
```

---

## 12. Large Screen / TV Optimizations (≥ 1920px)

When the dashboard is displayed on monitors ≥ 1920px or TVs:

- **Remove or increase `max-width`** on `.page-content` (from 1600px to 2000px or `100%`).
- **Increase grid density**: More columns for stat cards, wider panels.
- **Scale up font sizes**: Use the `3xl:` and `4xl:` prefixes.
- **Increase whitespace**: Larger padding and gaps for visual breathing room.
- **Consider reading distance**: On a TV viewed from 3+ meters, minimum font size should be `16px`.

```tsx
<div className="page-content 3xl:max-w-[2000px] 4xl:max-w-full 3xl:px-12 4xl:px-16">
```

---

## 13. Print Styles

The project already has some `@media print` rules. When modifying views with print support:

- Hide navigation (sidebar, topbar, FAB, shift panel).
- Remove background colors and shadows to save ink.
- Ensure tables don't break across pages (`break-inside: avoid`).
- Use `print:` Tailwind prefix.

---

## 14. Testing Checklist — Per Page

Before any responsive work is considered complete, verify every page against these viewports:

### Device Simulation Matrix

| # | Device | Resolution | Category |
| :- | :--- | :--- | :--- |
| 1 | iPhone SE | `375 × 667` | XS – Small phone |
| 2 | iPhone 15 Pro | `393 × 852` | XS – Modern phone |
| 3 | iPhone 15 Pro Max | `430 × 932` | SM – Large phone |
| 4 | Samsung Galaxy S24 | `412 × 915` | SM – Android phone |
| 5 | iPad Mini | `768 × 1024` | MD – Tablet portrait |
| 6 | iPad Air | `820 × 1180` | MD – Tablet portrait |
| 7 | iPad Pro 11" | `834 × 1194` | MD – Tablet portrait |
| 8 | iPad Pro 12.9" landscape | `1366 × 1024` | LG – Tablet landscape |
| 9 | MacBook Air 13" | `1280 × 800` | XL – Small laptop |
| 10 | MacBook Pro 14" | `1512 × 982` | 2XL – Standard laptop |
| 11 | 1080p Monitor | `1920 × 1080` | 3XL – Full HD |
| 12 | 1440p Monitor | `2560 × 1440` | 4XL – QHD |
| 13 | 4K Monitor | `3840 × 2160` | 4XL – Ultra HD |
| 14 | TV Display | `1920 × 1080` (scaled) | 3XL – Office TV |

### Per-Page Verification

For each page, check:

- [ ] **No horizontal overflow** at any viewport width (no unintended horizontal scrollbar on `<body>`).
- [ ] **All text is readable** without zooming (minimum 12px on mobile, 14px on desktop).
- [ ] **Touch targets ≥ 44px** on XS–MD breakpoints.
- [ ] **No content cut-off** — everything is either visible or scrollable.
- [ ] **Modals and drawers** are usable (not overflowing, close button accessible).
- [ ] **Grid layouts** reflow correctly (don't remain in too-many-columns on small screens).
- [ ] **Tables** switch to card layout or have horizontal scroll on small screens.
- [ ] **Images/avatars** don't break or overflow their containers.
- [ ] **Navigation** is accessible (hamburger menu works, MobileNav renders correctly).
- [ ] **Floating elements** (FAB, dropdowns, tooltips) don't go off-screen.

---

## 15. Implementation Priority Order

Execute responsive fixes in this exact order to minimize dependency issues:

### Phase 1: Foundation (Do First)
1. Register custom breakpoints (`3xl`, `4xl`) in theme.
2. Verify viewport meta tag in `layout.tsx`.
3. Fix `app-shell` / `workspace` / `sidebar` layout flow at every breakpoint.
4. Fix `topbar` content overflow and element hiding on small screens.

### Phase 2: Core Views
5. `OverviewView` / `TicketReportView` — metrics grid, dashboard grid, stat cards.
6. `TicketsView` — table-to-card layout switch, filter toolbar, ticket drawer.
7. `MonitoringView` — checkpoint grid, schedule table, action controls.

### Phase 3: Secondary Views
8. `ShiftLogView` — task list, handover form, history controls.
9. `TeamRosterView` — roster table, toolbar, member drawer, calendar view.
10. `ReportsView` — chart containers, stat cards, date filters.
11. `ProfileView` — header, settings panels, activity history.
12. `NotificationsView` — list, filter tabs, action buttons.

### Phase 4: Overlays & Panels
13. All modals (`TicketCreateModal`, `TicketEditModal`, `HandoverModal`, `ShiftSwapModal`, `MemberCreateModal`, etc.) — full-screen on mobile.
14. All drawers (`TicketDetailDrawer`, `MemberDetailDrawer`) — full-screen on mobile, side drawer on desktop.
15. `ShiftCoveragePanel` — overlay/modal on mobile, fixed side panel on desktop.
16. `CommandPalette` — full-screen on mobile, centered modal on desktop.
17. `NotificationDropdown` — full-width on mobile, positioned dropdown on desktop.
18. `MobileNav` — verify smooth open/close, proper overlay, all nav items accessible.

### Phase 5: Polish
19. `FloatingNewTicketButton` — proper positioning at every breakpoint.
20. `Toast` notifications — full-width on mobile, fixed-width on desktop.
21. Typography fluid scaling via `clamp()`.
22. Spacing consistency audit across all breakpoints.
23. Print stylesheet verification.
24. Large screen (3XL/4XL) optimization — wider grids, more breathing room.
25. Final cross-device testing against the Device Simulation Matrix (Section 14).

---

## 16. Common Patterns — Quick Copy-Paste

### Responsive Container

```tsx
<div className="w-full px-4 md:px-5 lg:px-8 xl:px-8 3xl:px-12 4xl:px-16 mx-auto max-w-[1600px] 3xl:max-w-[2000px] 4xl:max-w-full">
```

### Responsive Grid (Auto-fit)

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4 xl:gap-5">
```

### Responsive Stack to Row

```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
```

### Hide / Show by Breakpoint

```tsx
{/* Mobile only */}
<span className="sm:hidden">Short</span>

{/* Desktop only */}
<span className="hidden sm:inline">Full Description Text</span>

{/* Tablet and up */}
<div className="hidden md:flex">...</div>
```

### Full-screen Modal on Mobile to Centered on Desktop

```tsx
<div className="fixed inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-[600px] sm:w-[90vw] sm:max-h-[85vh] sm:rounded-2xl bg-modal-bg overflow-y-auto">
```

---

## 17. Anti-Patterns — NEVER Do These

| ❌ Anti-Pattern | ✅ Correct Alternative |
| :--- | :--- |
| Fixed `width` in px on containers | Use `max-width` + `w-full` |
| `overflow: hidden` on scrollable content without scroll | `overflow-x-auto` with proper min-width |
| Font sizes below `11px` on mobile | Minimum `12px` body, `11px` for labels only |
| Hiding critical content on mobile without alternative access | Show via accordion, modal, or different layout |
| Using `vw` units without `clamp()` for text | Always `clamp(min, preferred, max)` |
| Side drawers wider than viewport on mobile | Full-screen takeover on XS–SM |
| Hardcoded sidebar margin on workspace when sidebar is hidden | Dynamic margin via class toggle |
| Ignoring safe area insets on notched devices | Use `env(safe-area-inset-*)` |
| Tables with 6+ fixed columns on mobile | Card layout or column-hide strategy |
| Popup/dropdown positioned with fixed coordinates on mobile | Full-width bottom sheet or centered modal |
