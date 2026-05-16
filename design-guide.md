# UI Design Principles

A comprehensive guide to building interfaces for a modern wealth intelligence platform. Every decision serves clarity.

**Version:** 1.1
**Updated:** May 2026
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
11. The Screens
12. Investment Themes
13. Interaction & Motion
14. Anti-Patterns

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

The main content area has a maximum width of **840px** for the text-heavy Settings page and **1100px** for all data-heavy surfaces (My Wealth, the four asset routes, the three Cash Flow routes, Data Room). The sidebar is fixed at **220px**. Page margins are 48px on desktop, 24px on mobile.

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

Quiet, restrained, never competing with the main canvas. Labels use Outfit Light alongside Heroicons-style icons at 1.25px stroke in Muted color — the icons whisper at the same volume as the text. No colored indicators, no notification badges, no filled glyphs, no emoji. Sub-navigation appears as indented child links under parents that have them. The active state is just a weight shift from 400 to 600 and a Snow background — and only the leaf route highlights; parents stay quiet when a child is active.

```
┌──────────────┐
│ ◇ My Wealth  │ ← parent + link
│   Liquid     │ ← active (bold, Snow bg)
│   Illiquid   │
│   Real Est.  │
│   Crypto     │
│ ◯ Cash Flow  │ ← parent + link
│   Income     │
│   Expenses   │
│ ▢ Data Room  │
│ ⚙ Settings   │ ← sidebar footer
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

> Four top-level surfaces. Every label is a real page — no fake group headers.

The primary navigation has four top-level surfaces, two of which expand into sub-routes:

- **My Wealth** — landing surface and parent of Liquid / Illiquid / Real Estate / Crypto
- **Cash Flow** — overview and parent of Income / Expenses
- **Data Room** — single page
- **Settings** — sidebar footer

Each top-level item is both a clickable link to a real page **and** a parent of its children where applicable. There are no fake group headers — every label in the sidebar corresponds to a real route. Sub-items appear indented under their parent.

Icons sit alongside labels in Heroicons style (1.25px stroke, Muted color). They serve as visual anchors but never carry meaning beyond what the label already says. No colored badges, no notification dots, no filled icons, no emoji. The active state is a weight shift from 400 to 600 and a Snow background. Only the leaf route highlights; the parent stays quiet when one of its children is active — this prevents the "double-blue parent+child" visual noise.

There is no secondary navigation bar, no breadcrumbs, no tab system at the top of pages. Sub-navigation within a screen (e.g. PE / Pension / Unvested / Startup sections on Illiquid) uses the tag/filter pill component or section headers — not another nav bar.

### The Header Bar

A minimal top bar (64px height) contains: the app wordmark (Cormorant Garamond, 22px, weight 500) on the left, and a user initial circle (32px, Charcoal background, White text) on the right. Nothing else. No search bar, no notification bell, no settings gear. Those live in the sidebar.

### Breadcrumbs & Back Navigation

When the detail panel is open, a simple text back-link ("← Real Estate") appears at the top of the panel. No breadcrumb trails. The navigation structure is flat enough that breadcrumbs are never needed — you're always one click from any of the top-level surfaces.

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

## 11 — The Screens

> Each surface has a single purpose, a hero metric (where applicable), and a vertical reading flow.

### My Wealth

The home surface. Hero metric: total net worth in 64px Cormorant Garamond Light, with last-updated timestamp and an Assets/Liabilities transparency line directly below. The page then flows vertically through:

- **2×2 category grid** — Liquid / Illiquid / Real Estate / Crypto, each showing absolute value and % of net worth. Each cell links to its dedicated route.
- **Monthly Cash Flow strip** — current month's net surplus with inline Income/Expenses breakdown and a Savings Rate badge. Links to /cashflow.
- **Composition donut + Top Holdings** — paired 2-column row. The donut shows asset class allocation with total value at its center in 18px serif (sized to fit the inner ring cleanly). Top Holdings lists the top 5 liquid positions with value and % of net worth.
- **Currency Exposure** — horizontal bars showing % of gross assets by trading currency. Often the most surprising number for a HENRY user with multi-currency exposure.
- **Investment Themes (v1.1)** — horizontal bars showing % of net worth by user-defined forward-looking theme. See section 12.

A wealth-over-time trend chart is explicitly deferred: one month of snapshot data renders as apologetic. Snapshots accumulate silently; the chart ships once 6+ months of history exist. Until then, the today-view is the entire story — and the dimensional cards (currency, themes) make that today-view richer than a chart would.

### Assets — by category

There is no single "Assets" page. Four sibling routes sit under My Wealth, each focused on one asset class:

- **Liquid** (`/assets/liquid`) — securities only (stocks, ETFs, bonds, cash). Hero: total liquid value. Below: existing portfolio / sector / geography / currency charts and a holdings table. v1.1 adds inline theme picker to each row.
- **Illiquid** (`/assets/illiquid`) — four sections, one per subtype (Private Equity, Pension, Unvested Equity, Startup), each as a card list with `+ Add` per section. Per-row delete on hover. v1.1 adds edit + theme picker.
- **Real Estate** (`/assets/real-estate`) — property cards with mortgages, recurring costs, rental income. Net equity = value − mortgages, clamped at zero for the My Wealth rollup.
- **Crypto** (`/assets/crypto`) — read-only view grouped by wallet (`source_id`). Default-on spam filter hides tokens under $1 with "Show N hidden" disclosure. Wallet management lives in Data Room.

### Cash Flow

Three sibling routes sharing a `cashflow-shared.tsx` component module:

- **/cashflow** (Overview) — hero: monthly net surplus. Below: savings rate, income/expense cards, category breakdown, top merchants.
- **/cashflow/income** — income streams grid with `+ Add` CTA, recent income transactions.
- **/cashflow/expenses** — month picker, monthly expense hero, category breakdown, expense transactions table.

Rental income streams link to Real Estate properties via `property_id` so rent shows in both surfaces consistently.

### Data Room

No hero metric. A single flat page with two stacked sections:

- **Documents** — uploaded PDFs/CSVs, filterable by upload kind (wealth / transactions / salary / PE statement). Re-download and delete.
- **Wallets** — crypto wallet addresses with refresh / add / remove.

This is a **sources** surface, not a review queue. Extraction runs on upload and results land directly in `holdings` and `transactions`. No "review queue" or "extraction confidence" UI — the data is authoritative on arrival.

### Settings

Sidebar footer link. Sections in order:

- **Account** — name and email (read-only, from the OIDC profile).
- **Preferences** — base currency selector (drives the entire app's display layer via `CurrencyContext`).
- **Investment Themes (v1.1)** — list, add, and inline-edit themes. See section 12.
- **Privacy & Data** — export user data (JSON), clear all holdings, delete account.

### Future surfaces

- **Concierge** — an AI advisor layer that reads the user's wealth and themes to suggest forward-looking moves: *"Am I overexposed to AI Infrastructure?"* / *"What's the cleanest way to add to Energy Transition without doubling my USD exposure?"* Deferred to v1.2+. The Investment Themes substrate (section 12) is what makes a real concierge feasible — without structured forward-looking buckets, an AI can only describe; with them, it can advise.

When Concierge ships, it will follow the same restraint: structured insight cards (micro-label category + Cormorant heading + Outfit Light supporting text + action link), with a single-line text input for questions. Responses appear as flat text blocks on Snow background — never in speech bubbles. No chatbot iconography.

---

## 12 — Investment Themes

> The "what futures am I betting on?" layer. Themes are user-defined forward-looking buckets that span every asset class.

A single theme can contain liquid stocks, crypto, and an illiquid SAFE simultaneously — the rollup answers a question the asset-class view cannot: where are your conviction bets actually concentrated? This is the editorial layer that separates a wealth-intelligence platform from a balance sheet.

### Design intent

Themes use the same visual restraint as the rest of the system — no fanfare, no hero imagery on theme cards, no celebratory copy when one is added. A theme is a quiet first-class object: name, thesis prose, color swatch. Themes are renamable and editable; **not deletable in v1.1** (avoids the cascade question on tagged holdings — deferred to v1.2). One theme per holding (or none); multi-tag deferred.

### Color swatches

Themes have their own color palette, separate from the data viz palette (which is reserved for asset class). The two palettes overlap in muted tone intentionally — themes should feel native to the chart world without competing with it.

| Swatch | Hex | Suggested use |
|--------|-----|---------------|
| Slate | `#6B7B8D` | Core / market exposure |
| Mauve | `#8E87A5` | Thematic Growth (AI, climate, biotech) |
| Sage | `#7D8E7B` | Defensive, retirement, stable |
| Taupe | `#A89B8C` | Real assets, property |
| Tan | `#A8957D` | Speculative, asymmetric bets |
| Neutral | `#9BA29D` | Overflow |
| Cool gray-blue | `#7D8B9E` | Overflow |
| Warm brown | `#9B8B7D` | Overflow |

User picks one swatch at theme creation/edit time. The color appears as a small (8px) dot in management lists, a 2px dot in inline tags, and as the bar fill in the My Wealth Themes card. **Color is for at-a-glance grouping — it never carries semantic meaning.** Two themes with the same color is allowed (and expected, once a user has more than 8 themes).

### Surfaces

**Settings → Investment Themes (management)** — list of themes with color swatch + name + thesis prose. Hover any row to reveal a pencil icon for inline edit (name input + thesis textarea + color palette picker). Add form opens above the list with the same fields. Empty state is unreachable in normal use thanks to seeding (below).

**My Wealth → Investment Themes card** — horizontal bars ranked by % of net worth, spanning all asset classes. Each row: color dot + theme name on the left, absolute value + percent right-aligned. An **"Untagged"** segment sits at the bottom in muted gray — honest about what hasn't been categorized yet, and the natural call to action.

**/themes/$id (theme detail)** — hero with theme name + editable thesis prose + total allocation. Below: a list of holdings tagged into this theme, grouped by asset class (Liquid / Illiquid / Real Estate / Crypto). This is the surface a future Concierge will converse over.

**Inline theme picker** — appears on every asset edit surface (liquid table row, crypto token row, illiquid card, real estate property card). A combobox with autocomplete from existing themes plus a "Create new theme" inline action. Selecting a theme tags the holding immediately via the source-of-truth table; the sync layer carries the tag into the holdings projection so the Themes card on /my-wealth updates without a refresh.

### Auto-tag heuristic (first run)

On a user's first visit to themes, 5 starter themes are seeded with placeholder thesis prose:

- **Core Equities** — long-term market exposure
- **Thematic Growth** — specific bets on a future you believe in
- **Defensive & Retirement** — capital preservation
- **Real Assets** — property and physical
- **Speculative** — asymmetric bets

The unambiguous holdings are auto-tagged immediately: crypto → Speculative, real estate → Real Assets, pension → Defensive & Retirement, PE/startup → Speculative, unvested equity → Core Equities. **Liquid stocks and cash are intentionally left untagged** — that's the slice the user does the thinking on. The friction of categorizing those positions IS the product's primary value. The "Untagged X%" segment on the Themes card is what nudges the user into that thinking.

### Editorial tone

Placeholder thesis text reads as a prompt, not a label: *"What future are you betting on?"* — not *"Description."* Theme management copy avoids product-speak — say *"The futures you're betting on"* not *"Categorize your investments."* When a theme has zero holdings, show calm italic serif text (*"No holdings tagged here yet — use the theme picker on any asset page."*) — never an illustration or an empty-state graphic.

---

## 13 — Interaction & Motion

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

## 14 — Anti-Patterns

> The things that will instantly make this feel like every other fintech app. Avoid at all costs.

- **Shadows.** No box-shadows on cards, modals, or dropdowns. Use 1px borders instead. The one exception is the detail panel's left edge.

- **Rounded cards.** No border-radius on containers. Cards use 2px radius maximum, or sharp corners. Only buttons and pills use full radius.

- **Gradients.** Nowhere. Not in backgrounds, not in buttons, not in charts, not in overlays. Flat fills only.

- **Colored badges.** No red notification dots, no green status pills with fills. Use text labels with signal colors, or simple status dots.

- **Dashboard widget grids.** No equal-sized boxes arranged in a grid competing for attention. Information flows vertically, sequentially, with clear hierarchy.

- **Colorful empty states.** No illustrations of people holding charts. No cartoon graphics. No decorative SVGs. Empty states use italic serif text and a ghost button.

- **Thick borders.** Nothing thicker than 2px exists in the system. If you need more visual weight, increase spacing instead.

- **Multiple fonts.** Only Cormorant Garamond and Outfit. No third typeface for "special occasions." No monospace for numbers (the serif handles this beautifully).

- **Dark mode as default.** The lightness and airiness is the entire identity. A dark mode may exist as an option, but the canonical experience is light.

> When in doubt, remove something. The design is complete not when there is nothing left to add, but when there is nothing left to take away.

---

*Design System v1.1 — May 2026*
