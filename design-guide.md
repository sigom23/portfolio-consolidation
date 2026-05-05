# UI Design Principles

A comprehensive guide to building interfaces for a modern wealth intelligence platform. Every decision serves clarity.

**Version:** 1.0
**Updated:** April 2026
**Classification:** Internal

---

## Contents

1. Design Philosophy
2. Typography
3. Color System
4. Data Visualization Palette
5. Spacing & Grid
6. Layout Principles
7. Components
8. Data Presentation
9. Navigation
10. Charts & Graphs
11. The Five Screens
12. Interaction & Motion
13. Anti-Patterns

---

## 01 — Design Philosophy

> Build it like a luxury print publication that happens to be interactive — where the typography and whitespace do all the talking.

This is not a dashboard. It is a financial editorial experience. Every design decision should answer one question: does this increase clarity, or does it add noise?

The visual identity sits at the intersection of three references: the typographic restraint of a high-end financial publication, the structural clarity of a Bloomberg terminal stripped to its essence, and the material quietness of Dieter Rams's product design. We take the information density of finance, the editorial sensibility of print, and the interactivity of software — and remove everything that doesn't serve understanding.

### Core Principles

1. **Typography is the design.** Financial figures displayed in large, thin serif type are the primary visual element of every screen. If the numbers look beautiful, the screen looks beautiful.

2. **Color is earned.** The interface is greyscale by default. Color only appears inside data visualizations where it serves a functional purpose — distinguishing categories. It never appears in navigation, backgrounds, buttons, or chrome.

3. **Whitespace is structural.** Generous spacing is not empty space. It establishes hierarchy, separates concepts, and gives the eye room to process financial information without fatigue.

4. **Restraint over decoration.** No gradients, no shadows, no rounded cards, no icons in navigation, no colored badges. Use hairline borders (1px) and subtle background shifts to create structure. If you think "should I add something here?" — the answer is almost always no.

5. **Vertical flow, not dashboard grid.** Screens scroll vertically like an editorial page. Information is presented sequentially — one thought at a time — rather than packed into a grid of equal-sized widgets competing for attention.

6. **The data is the interface.** There should be no empty states that feel hollow, and no chrome-heavy states that feel cluttered. The financial information itself — the numbers, the trends, the documents — is always the thing you see first and remember.

> **The test:** if you squint at any screen and it looks like a page from a beautifully typeset financial report, you've done it right.

---

## 02 — Typography

> Two typefaces. One serif for statements, one sans-serif for structure. The contrast between them creates the entire visual hierarchy.

### Primary — Cormorant Garamond

Used for all financial figures, section headings, page titles, and editorial statements. Always at light weight (300) or regular (400). Never bold. The thinness and elegance of the letterforms is what gives the platform its distinctive character. This font makes numbers beautiful.

**Specimens:**

| Example | Spec | Usage |
|---------|------|-------|
| `$2,418,600` | Cormorant Garamond Light / 64px / -0.04em | Financial hero figure |
| `One intelligent view of your financial life` | Cormorant Garamond Light / 38px / -0.03em | Section heading |
| `$890,400` | Cormorant Garamond Light / 27px / -0.03em | Stat card value |
| `Not a budgeting app. A wealth layer.` | Cormorant Garamond Regular Italic / 18px | Editorial accent, tagline |

### Secondary — Outfit

Used for all utility text: labels, navigation, metadata, body copy, buttons, form fields. Always at light (300), regular (400), or medium (500) weight. Semi-bold (600) is reserved for micro-labels and eyebrows only. The geometric simplicity of Outfit provides functional clarity without drawing attention to itself.

**Specimens:**

| Example | Spec | Usage |
|---------|------|-------|
| `TOTAL NET WORTH` | Outfit Medium / 10.4px / uppercase / 0.22em | Micro-label |
| Body paragraph text | Outfit Light / 15.7px / 1.85 line-height | Body text |
| `Get Started` (button) | Outfit Medium / 14px | Button label |

### Type Scale

All sizes follow a modular scale. These are the only sizes used in the app:

| Size | Usage |
|------|-------|
| 64px | Financial hero figure (net worth on My Wealth) |
| 38px | Page/section heading |
| 27px | Stat card value |
| 18px | Subsection heading, editorial accent |
| 15.7px | Body text, descriptions |
| 14px | Button labels, table cells |
| 12.5px | Secondary text, sidebar items |
| 10.4px | Micro-labels, eyebrows, chart labels |

### Typographic Rules

**Do:**
- Use serif for numbers and emotional text
- Keep serif at 300 weight — thinness is the brand
- Use negative letter-spacing on large serif text (-0.03 to -0.04em)
- Use wide letter-spacing on uppercase sans labels (0.12–0.22em)
- Let font size create hierarchy, not color or weight

**Don't:**
- Never use serif bold — it destroys the editorial character
- Never use sans-serif for financial figures
- Never use more than two font weights on the same screen
- Never center-align body text
- Never use color to differentiate text hierarchy

---

## 03 — Color System

> The interface is monochromatic. Color exists only to serve data comprehension — never for decoration.

### Interface Palette

These are the only colors used in the application chrome — navigation, backgrounds, text, borders, buttons, and all structural elements.

| Name | Hex | Usage |
|------|-----|-------|
| Black | `#111111` | — |
| Charcoal | `#1D1D1F` | Headings, financial figures, primary buttons, active nav states |
| Dark | `#2C2C2E` | — |
| Mid | `#6E6E73` | Body text, descriptions, secondary information |
| Muted | `#999999` | Tertiary text, inactive elements, timestamps |
| Light | `#B8B8BD` | Micro-labels, eyebrows, chart axis labels |
| Faint | `#D2D2D7` | Decorative numbers (section numbers), disabled states |
| Whisper | `#E8E8ED` | Borders, dividers, grid lines |
| Cloud | `#F2F2F5` | Alternating row backgrounds, subtle fills |
| Snow | `#F7F7F8` | Section backgrounds, hover states |
| White | `#FFFFFF` | Primary backgrounds, card surfaces |

### Signal Colors

These are the only non-grey colors used in the application outside of data visualization charts. They appear exclusively on small text labels, delta indicators, and status dots.

| Name | Hex | Usage |
|------|-----|-------|
| Positive | `#6B9E7B` | Gains, increases, verified status, positive deltas |
| Negative | `#C47D6D` | Losses, decreases, alerts, negative deltas |
| Pending | `#C4A96D` | Processing, syncing, awaiting review |

Even these signal colors are deliberately desaturated. They whisper rather than shout.

---

## 04 — Data Visualization Palette

> Muted, desaturated tones that distinguish data categories without breaking the editorial calm of the interface.

This is where color earns its place. The data visualization palette only appears inside charts — bar charts, donut charts, area charts, and their corresponding legends. It never bleeds into the surrounding UI.

### Category Colors

Five muted tones, each assigned to a fixed wealth category. They are close in saturation and brightness — distinct enough to differentiate, quiet enough to coexist.

| Category | Hex | Assignment |
|----------|-----|------------|
| Liquid | `#6B7B8D` | Liquid assets (brokerage, stocks, bonds) |
| Illiquid | `#A89B8C` | Illiquid assets (private equity, alternatives) |
| Property | `#7D8E7B` | Real estate and property equity |
| Crypto | `#8E87A5` | Cryptocurrency holdings |
| Cash Flow | `#6E9E96` | Cash flow and surplus visualization |

**Category assignment is permanent.** Liquid assets are always `#6B7B8D`. Property is always `#7D8E7B`. A user should be able to glance at any chart on any screen and know which color represents which category without reading the legend. Consistency across every screen is non-negotiable.

### Opacity Variations

For grouped bar charts or stacked areas that need sub-categories within a parent, use the parent color at different opacities rather than introducing new hues:

| Opacity | Usage |
|---------|-------|
| 100% | Primary value (e.g., current holdings) |
| 60% | Secondary value (e.g., previous period) |
| 25% | Background/context area (e.g., projected range) |

### Single-Metric Charts

For charts that show a single data series (e.g., total net worth over time, monthly surplus trend), use Charcoal (`#1D1D1F`) at varying opacities rather than any category color. This keeps single-metric charts in the greyscale world of the UI while category charts use the palette above.

**Do:**
- Use the palette exclusively inside charts and their legends
- Use opacity modulation for sub-categories
- Keep donut strokes thin (20–24px on ~180px diameter)
- Place the total value in serif type at the donut center
- Use Charcoal for single-metric charts

**Don't:**
- Never use chart colors in buttons, nav, badges, or cards
- Never use gradients inside chart elements
- Never use thick pie wedges — always thin ring donuts
- Never add gridlines heavier than `#F2F2F5`
- Never use chart color to indicate good/bad — use signal colors

---

## 05 — Spacing & Grid

> Everything aligns to an 8px grid. Generous spacing is what separates this from every other fintech dashboard.

### Base Unit

The base spacing unit is **8px**. All spacing values are multiples of this unit. This creates visual rhythm and ensures consistent alignment across all screens.

### Spacing Assignments

| Value | Usage |
|-------|-------|
| 8px | Minimum gap. Between an icon and its label, between a micro-label and its value. |
| 16px | Within a component. Padding inside stat cells, gap between list items. |
| 24px | Between related components. Gap between stat cards and a chart below them. |
| 32px | Standard section internal padding. Padding inside visual containers. |
| 48px | Between content blocks. Margin between a heading and the first content group. |
| 64px | Between major sections on a scrollable page. |
| 96px | Top/bottom padding for full screen sections. Maximum breathing room. |

### Content Width

The main content area has a maximum width of **840px** for text-heavy pages (Data Room, Concierge) and **1100px** for data-heavy pages (My Wealth, Assets, Cash Flow). The sidebar is fixed at **220px**. Page margins are 48px on desktop, 24px on mobile.

### Borders & Dividers

All structural lines are **1px solid Whisper (`#E8E8ED`)**. No other border widths exist in the system except the 2px accent line at the top of visual containers (in Charcoal). Borders create structure. They are never decorative — if a border doesn't establish a meaningful boundary, remove it.

---

## 06 — Layout Principles

> Vertical scroll, not dashboard grids. Each screen reads like a page, not a cockpit.

### The Three-Layer Structure

The app uses a consistent three-layer architecture across all screens:

1. **Sidebar** — A narrow (220px), quiet left column. Text-only navigation labels, no icons, no colored indicators. The active state is just a bold weight shift, nothing more. Fixed on desktop, drawer on mobile.

2. **Main Canvas** — The primary content area. Scrolls vertically like a long editorial page. Each section flows into the next with generous spacing and hairline dividers. This is where all financial information lives.

3. **Detail Panel** — Slides in from the right when drilling into an asset, document, or transaction. Uses the same editorial language. Width is 400–480px. Closes cleanly, never overlays the full screen.

### Vertical Flow

Every screen follows the same reading order from top to bottom: the hero metric (the single most important number on this page) → supporting metrics in a flat grid → contextual chart → detailed list or table → related actions. This sequential flow means the user never has to decide where to look — the hierarchy is built into the page structure itself.

### Responsive Behavior

On tablet, the sidebar collapses to a thin icon strip. On mobile, it becomes a bottom sheet. The main canvas always fills the available width. The detail panel becomes a full-screen overlay on mobile. Two-column stat grids collapse to single-column stacks. Charts maintain their aspect ratio and scale down proportionally.

---

## 07 — Components

> A small, intentional component library. If a component doesn't exist here, question whether you need it.

### Buttons

Only two button styles exist: solid charcoal (primary) and hairline ghost (secondary). Both use full border-radius (pill shape). The primary button is the only element in the app that uses a filled background color. Small variant reduces padding for inline use.

- **Primary:** Charcoal fill, white text, Outfit Medium 14px, padding 14px 32px, border-radius 100px
- **Secondary (Ghost):** Transparent fill, Mid text, 1px Faint border, Outfit Medium 14px, padding 14px 32px, border-radius 100px
- **Small:** Charcoal fill, white text, Outfit Medium 12.5px, padding 9px 20px, border-radius 100px

### Tags & Filters

Pill-shaped tags with hairline borders. Active state inverts to charcoal border and charcoal text — no fill color, no background change. These are used for asset category filters, time period selectors, and document type filters.

- **Inactive:** 1px Whisper border, Muted text, Outfit Medium 11.5px, padding 6px 14px, border-radius 100px
- **Active:** 1px Charcoal border, Charcoal text (same padding and shape)

### Stat Cards

Stats are never presented in shadowed cards with rounded corners. They live in flat grid cells separated by 1px borders. Each cell contains a micro-label (Outfit, 10.4px, uppercase, Light color) and a value (Cormorant Garamond, 27px, Charcoal). The grid structure communicates that these values are related and comparable.

```
┌─────────────────┬─────────────────┐
│ TOTAL NET WORTH │ LIQUID ASSETS   │
│ $2.4M           │ $890K           │
├─────────────────┼─────────────────┤
│ PROPERTY EQUITY │ MONTHLY SURPLUS │
│ $1.1M           │ $8.2K           │
└─────────────────┴─────────────────┘
1px border cells — micro-label + serif value
```

### List Rows

All lists (documents, transactions, assets) use flat rows separated by 1px Cloud borders. Each row contains: a status dot (8px, Charcoal for verified, Faint for pending), a primary label (Outfit, 13.6px, Charcoal), metadata text below (Outfit, 12px, Light), and an optional trailing tag (pill-shaped, hairline border). Rows hover to Snow background. No icons, no thumbnails, no colored badges.

### Form Inputs

Text inputs use a bottom-border only — no box, no fill. The border is Whisper by default, Charcoal on focus. Labels sit above in the micro-label style. Dropdowns use the same bottom-border treatment with a small downward chevron in Faint color.

### Navigation Sidebar

Pure text labels. No icons. No colored indicators. No notification badges. The active state is just a weight shift from 400 to 600 and a Snow background. The sidebar is a quiet index — it should never compete with the main canvas for attention.

```
┌──────────────┐
│ MY WEALTH    │ ← active (bold, Snow bg)
│ Assets       │
│ Cash Flow    │
│ Data Room    │
│ Concierge    │
└──────────────┘
```

---

## 08 — Data Presentation

> The typography IS the visualization. Numbers displayed large and thin in serif type are the primary visual design element.

### The Hero Metric

Every screen has exactly one hero metric — the single most important number. On My Wealth, it's total net worth. On Cash Flow, it's monthly investable surplus. On Assets, it's total portfolio value. This number is displayed at 64px in Cormorant Garamond Light, dead center or top-left of the main canvas. It's the first thing the eye hits. Everything else on the page is commentary on this number.

### Tables

Tables use the same 1px-border grid pattern as stat cards. Header cells use the micro-label style (Outfit, 10.4px, uppercase, Light). Data cells use Outfit Light at 14px for text and Cormorant Garamond at 14–18px for numerical values. Alternating rows use White and Cloud backgrounds. No zebra striping with color — just white and off-white.

### Empty States

When a section has no data, show a centered paragraph in Cormorant Garamond Italic at 18px, Muted color: *"No liquid assets connected yet."* followed by a ghost button: "Add an asset." No illustrations, no icons, no decorative graphics. The text is enough.

### Loading States

Use subtle opacity pulsing (0.4 to 0.8) on skeleton blocks that match the exact layout of the content being loaded. Skeleton blocks use Cloud (`#F2F2F5`) fill with 2px border-radius. No spinner icons, no loading bars, no animated dots. The skeleton should be so subtle that if the content loads quickly, the transition is nearly imperceptible.

---

## 09 — Navigation

> Five items. Text only. The simplest navigation possible.

The primary navigation consists of exactly five items: **My Wealth, Assets, Cash Flow, Data Room, and Concierge.** These are displayed as text labels in the left sidebar. There is no secondary navigation bar, no breadcrumbs, and no tab system at the top of pages.

Sub-navigation within a screen (e.g., asset categories within Assets) uses the tag/filter pill component, not a secondary nav bar. This keeps the architectural navigation clean and separate from content filtering.

### The Header Bar

A minimal top bar (64px height) contains: the app wordmark (Cormorant Garamond, 22px, weight 500) on the left, and a user initial circle (32px, Charcoal background, White text) on the right. Nothing else. No search bar, no notification bell, no settings gear. These exist in the sidebar or are accessed through Concierge.

### Breadcrumbs & Back Navigation

When the detail panel is open, a simple text back-link ("← Assets") appears at the top of the panel. No breadcrumb trails. The navigation structure is flat enough that breadcrumbs are never needed — you're always one click from any of the five main screens.

---

## 10 — Charts & Graphs

> Minimal. Single-purpose. The chart shows one thing, and the typography around it provides context.

### Donut Charts

Use thin-ring donut charts (20–24px stroke width on ~180px diameter). The center of the donut displays the total value in Cormorant Garamond Light (27px). The ring segments use the data visualization palette with no gaps between segments. The legend sits below as simple rows: color dot (8px) + category name (Outfit, 13px, Mid) + value (Cormorant Garamond, 15px, Charcoal), right-aligned. No 3D effects, no exploded segments, no percentage labels on the segments themselves.

### Bar Charts

Bars use the category color at 70–80% opacity with 2px top border-radius. Bar width should be generous — not thin sparkline bars. Grid lines, if present, use Cloud (`#F2F2F5`) at 1px. Axis labels use the micro-label style. For time-series bars (e.g., monthly surplus over 12 months), use Charcoal at progressively increasing opacity — the most recent month is darkest. This creates a natural visual pull toward the present.

### Line Charts

Use 1.5px stroke width. One series = Charcoal. Multiple series = data visualization palette. No filled areas beneath lines unless showing a range (in which case, use 5% opacity fill). Data points are invisible by default and appear only on hover (6px circle, matching line color). The y-axis label sits flush-left above the chart in micro-label style, not rotated vertically.

### Chart Containers

Charts live inside flat containers with a 1px Whisper border and 28px internal padding. The container has a micro-label title top-left and optionally a time-period tag top-right. No chart should ever float freely without a container — the border provides the frame that a traditional data visualization would get from axes and gridlines.

### Tooltips

On hover, show a minimal tooltip: a small (max 180px wide) box with 1px Whisper border, White background, no shadow, containing the category name in micro-label style and the value in Cormorant Garamond at 18px. The tooltip appears immediately (no delay) and follows the cursor along the x-axis. No arrow, no caret, no animation.

---

## 11 — The Five Screens

> Each screen has a single purpose, a hero metric, and a vertical reading flow.

### My Wealth

The home screen. The hero metric is total net worth displayed at the largest type size in the app (64px Cormorant Garamond Light). Below it: a 2×2 stat grid (liquid, illiquid, property, crypto), a 12-month wealth trend bar chart (Charcoal, progressive opacity), and a donut chart showing asset allocation. The bottom section shows "What's changed" — a simple list of recent movements (e.g., "Brokerage value +$4,200 this week") with delta indicators using signal colors. The entire page scrolls vertically.

### Assets

Hero metric: total portfolio value. Below: filter pills for Liquid / Illiquid / Property / Crypto. Each category expands into a flat table of individual holdings. Tables show: asset name, current value (serif), allocation percentage, and period change (with signal color). A donut chart at the top shows the category breakdown. The detail panel slides in when clicking any individual asset.

### Cash Flow

Hero metric: monthly investable surplus (the number that answers "what can I invest this month?"). Below: a 2-cell stat grid (income vs. obligations), a 12-month surplus trend bar chart, and a categorized breakdown of spending. Cash flow uses a distinct visual pattern: income bars in one direction, spending bars in the opposite, creating a waterfall effect that makes the surplus immediately visual.

### Data Room

No hero metric. This screen is a flat, structured list of all source documents, connections, and records. Each item is a row with status dot, name, metadata, and status tag. Items are grouped by type (Documents, Connections, Records) with micro-label section headers. An "Upload" ghost button sits at the top-right. This screen should feel like a clean filing cabinet — orderly, trustworthy, and complete.

### Concierge

This screen does NOT look like a chatbot. The left portion shows structured insight cards — each card is a flat container with a micro-label category (e.g., "PORTFOLIO INSIGHT"), a heading in Cormorant Garamond (e.g., "Your liquid ratio has dropped below 35%"), supporting text in Outfit Light, and an action link. The right portion (or bottom on mobile) has a single-line text input for asking questions, with Concierge responses appearing as flat text blocks on Snow background — never in speech bubbles.

---

## 12 — Interaction & Motion

> Motion should be felt, not seen. Every transition exists to maintain spatial awareness, not to impress.

### Easing

All transitions use `cubic-bezier(0.25, 1, 0.5, 1)` — a smooth ease-out that feels natural and unhurried. This is the only easing curve in the system.

| Duration | Usage |
|----------|-------|
| 200ms | Micro-interactions (hover states, button feedback) |
| 350ms | Component transitions (panel slides, filter changes) |
| 500ms | Page transitions (navigation changes) |

### Hover States

List rows transition to Snow background. Buttons shift opacity. Stat cells transition to Snow background. Navigation items shift from Muted to Charcoal text. Everything is subtle — the user should register that something is interactive without the interface calling attention to the effect.

### The Detail Panel

Slides in from the right over 350ms. The main canvas does not shift or compress — the panel overlays the right portion. A subtle shadow (the only shadow in the entire app: `-4px 0 24px rgba(0,0,0,0.04)`) appears on the panel's left edge to create depth separation. The panel slides out on close.

### Chart Animations

Charts animate once on first appearance: bars grow from zero height, donut segments draw clockwise from 12 o'clock, line charts draw left to right. Duration is 800ms. After first render, charts update values with a 350ms crossfade — never re-animate from zero.

### What to Avoid

No bouncing, no spring physics, no parallax effects, no animated backgrounds, no loading spinners, no confetti, no success animations. Motion exists purely to maintain spatial continuity and provide feedback. If you remove all motion from the app, it should still feel complete.

---

## 13 — Anti-Patterns

> The things that will instantly make this feel like every other fintech app. Avoid at all costs.

- **Shadows.** No box-shadows on cards, modals, or dropdowns. Use 1px borders instead. The one exception is the detail panel's left edge.

- **Rounded cards.** No border-radius on containers. Cards use 2px radius maximum, or sharp corners. Only buttons and pills use full radius.

- **Gradients.** Nowhere. Not in backgrounds, not in buttons, not in charts, not in overlays. Flat fills only.

- **Icons in navigation.** The sidebar is text-only. Adding icons makes it feel like a mobile app. This is an editorial experience.

- **Colored badges.** No red notification dots, no green status pills with fills. Use text labels with signal colors, or simple status dots.

- **Dashboard widget grids.** No equal-sized boxes arranged in a grid competing for attention. Information flows vertically, sequentially, with clear hierarchy.

- **Colorful empty states.** No illustrations of people holding charts. No cartoon graphics. No decorative SVGs. Empty states use italic serif text and a ghost button.

- **Thick borders.** Nothing thicker than 2px exists in the system. If you need more visual weight, increase spacing instead.

- **Multiple fonts.** Only Cormorant Garamond and Outfit. No third typeface for "special occasions." No monospace for numbers (the serif handles this beautifully).

- **Dark mode as default.** The lightness and airiness is the entire identity. A dark mode may exist as an option, but the canonical experience is light.

> When in doubt, remove something. The design is complete not when there is nothing left to add, but when there is nothing left to take away.

---

*Design System v1.0 — April 2026*
