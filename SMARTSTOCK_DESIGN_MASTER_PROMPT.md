# SmartStock — Master Design Overhaul Prompt
### For use with: Antigravity · Gemini Pro · NanoBanana Motion Tokens · Google Spatial Canvas

---

## 🎯 MISSION

You are a senior product designer and frontend engineer. You are overhauling the visual design of **SmartStock** — a B2B wholesale-retail marketplace — across three surfaces:

1. `LandingPage.tsx` — public marketing page
2. `RetailerDashboard.tsx` — dashboard for retail buyers
3. `WholesalerDashboard.tsx` — dashboard for wholesale suppliers

**The core problem to fix:** The current UI was generated generically — it has:
- An incoherent accent color system (orange bleeding everywhere instead of a disciplined token hierarchy)
- No visual distinction between Retailer and Wholesaler roles
- Landing page and dashboard themes that don't feel like the same product
- Missing definition for `input-field` CSS class (currently referenced but undefined — fix this)
- Typography with no scale — ad-hoc `text-xs`, `text-sm`, `font-semibold` with no system behind them

**Your goal:** Make all three surfaces feel like one premium B2B product — cohesive, role-aware, and distinctly SmartStock, not a generic template.

---

## 🎨 DESIGN SYSTEM — TOKEN HIERARCHY

Apply this token hierarchy **strictly across all three files and index.css**:

### Brand Identity
```
Brand Primary:     Indigo  (#6366f1 / --primary-500)   → Nav, headers, brand moments
Brand Secondary:   Emerald (#10b981 / --secondary-500)  → Success, revenue, positive delta
Brand Warning:     Amber   (#f59e0b / --accent-500)      → Alerts, pending states
CTA Orange:        #f97316                               → Primary action buttons ONLY (Buy, Order, Checkout)
```

### Role Accent Colors (NEW — use to differentiate user types)
```
Retailer accent:   Indigo + Emerald   (buying, savings, inventory health)
Wholesaler accent: Indigo + Amber     (supply, demand, trade margins)
Landing page:      Indigo primary     (neutral, aspirational, brand-first)
```

### Surface Hierarchy (from index.css — DO NOT change these values, DO use them consistently)
```
--slate-50:   Page background (OLED black in dark, #f8fafc in light)
--slate-100:  Card / Panel surface
--slate-200:  Borders, dividers
--slate-300:  Muted borders
--slate-400:  Placeholder / dim text
--slate-500:  Body text
--slate-600:  Secondary heading
--slate-700:  Primary heading
--slate-800:  High-contrast label
--slate-900:  Maximum contrast / hero text
```

---

## ✍️ TYPOGRAPHY SCALE

Establish this scale **consistently** across all components. Use Inter (already imported):

```
Display:      text-4xl / font-800 / tracking-tight    → Hero headlines (landing page only)
H1:           text-2xl / font-700 / tracking-tight    → Dashboard page titles
H2:           text-xl  / font-600                     → Section headers
H3:           text-base / font-600                    → Card headers, tab labels
Body:         text-sm  / font-400                     → Standard content
Caption:      text-xs  / font-400 / text-slate-400    → Labels, metadata, timestamps
Data:         text-sm  / font-600 / tabular-nums      → KPI values, prices, quantities
Eyebrow:      text-xs  / font-600 / uppercase / tracking-widest → Section category labels
```

Apply these consistently — no ad-hoc font sizing outside this scale.

---

## 🧱 COMPONENT REDESIGN RULES

### Buttons (fix and extend existing btn-tactile system)
- `btn-tactile-orange` → **CTA only**: "Add to Cart", "Place Order", "Buy Now", "Add Product"
- `btn-tactile-indigo` → **Primary actions**: "Save", "Confirm", "Submit"
- `btn-tactile-emerald` → **Positive/completion**: "Mark Paid", "Approve", "Complete"
- `btn-tactile-rose` → **Destructive**: "Delete", "Cancel Order", "Remove"
- `btn-secondary` → **Neutral**: "Cancel", "Back", "Close"

### Cards / KPI Cards
- Consistent `rounded-2xl` radius (upgrade from `rounded-xl`)
- `border border-[var(--card-border)]` with `bg-[var(--card-bg)]`
- On hover: subtle `translate-y-[-1px]` lift + shadow intensification
- KPI cards: always include an **eyebrow label**, a **data value**, and a **delta badge** (↑/↓ with emerald/rose color)
- No raw `bg-orange-50` or `bg-orange-950` in cards — use `bg-[var(--card-bg)]` with `border-[var(--card-border)]`

### Input Fields (DEFINE `input-field` — currently missing, fix this)
Add to `index.css`:
```css
.input-field {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background-color: var(--color-slate-100);
  border: 1px solid var(--color-slate-200);
  border-radius: 0.5rem;
  color: var(--color-slate-800);
  font-size: 0.875rem;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  outline: none;
}
.input-field:focus {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}
.input-field::placeholder {
  color: var(--color-slate-400);
}
```

### Navigation / Sidebar
- Use `--slate-100` as sidebar background, `--slate-200` as dividers
- Active nav item: `bg-primary-50 text-primary-600` (light) / `bg-primary-100/10 text-primary-400` (dark)
- Nav icons: 18×18px, consistent stroke-width 1.5
- Role badge at top of sidebar: **"Retailer" in indigo** / **"Wholesaler" in amber** — pill badge, small, always visible

### Tables (`.premium-table`)
- Sticky header with `bg-[var(--card-bg)]` and bottom border
- Row hover: `bg-slate-100/50` (not raw Tailwind colors)
- Status badges: pill shape, color-coded by status (pending=amber, active=indigo, completed=emerald, cancelled=rose)
- Numbers/prices: always `font-medium tabular-nums text-right`

---

## ✨ ANTIGRAVITY + GEMINI PRO SPECIFIC FEATURES

> These are features available in your Antigravity framework via Gemini Pro. Use ALL of them.

### 1. NanoBanana Motion Tokens
Apply NanoBanana's motion token system for all transitions. Use:
```
--nb-ease-spring:   cubic-bezier(0.16, 1, 0.3, 1)    → Button press, card hover, modal open
--nb-ease-smooth:   cubic-bezier(0.4, 0, 0.2, 1)      → Tab switches, sidebar collapse
--nb-ease-enter:    cubic-bezier(0, 0, 0.2, 1)         → Elements entering viewport
--nb-ease-exit:     cubic-bezier(0.4, 0, 1, 1)         → Elements leaving viewport
--nb-duration-fast: 150ms                              → Micro-interactions (hover, focus)
--nb-duration-mid:  250ms                              → Component transitions
--nb-duration-slow: 400ms                              → Page-level reveals, modals
```
Every interactive element must use NanoBanana tokens, not raw `transition-all duration-300`.

### 2. Google Spatial Canvas Layout Grid
Apply Spatial Canvas's 12-column adaptive grid:
- **Landing Page:** 12-col max-width 1280px, 80px horizontal gutter, 64px section spacing
- **Dashboard:** 12-col with a fixed 240px left sidebar, 24px gap, 20px card gutter
- **Mobile (<768px):** Collapse sidebar to bottom tab bar; cards go to single-column
- Use Spatial Canvas's `sc-region` concept: define clear spatial zones — Sidebar, Header Bar, Main Content, Right Panel (notifications/AI) — and never let them bleed into each other

### 3. Gemini Pro Dynamic Color Adaptation
Use Gemini Pro's Material You tonal palette generation:
- Base the tonal surface on `#6366f1` (seed color)
- Generate a `surface-container-lowest` → `surface-container-highest` ramp from this seed for card depth
- In dark mode: `surface-tint` = `rgba(99, 102, 241, 0.08)` applied to elevated cards to give them a subtle chromatic lift over pure black
- Apply `surface-tint` only on cards 1 level above the background — don't stack it

### 4. Google Fonts — Upgrade Typography
Replace the generic `Inter`-only setup with a deliberate pairing:
```
Display + H1:  "Google Sans Display" (weight 500, 600) — import from Google Fonts
Body + UI:     "Google Sans Text" (weight 400, 500)    — import from Google Fonts  
Data / Mono:   "Google Sans Mono" (weight 400, 500)    — for prices, IDs, code
```
Import: `https://fonts.googleapis.com/css2?family=Google+Sans+Display:wght@400;500;600&family=Google+Sans+Text:wght@400;500&family=Google+Sans+Mono:wght@400;500&display=swap`

Update `--font-family-sans` in `@theme` to `"Google Sans Text", system-ui, sans-serif`.

### 5. Antigravity AI Insight Cards (Retailer Dashboard)
The RetailerDashboard has `AIInsight` and `RealtimeInsight` types. Render these in a dedicated **"AI Advisor"** panel with:
- Gemini spark icon (✦) in `primary-500` color
- `surface-tint` elevated card background
- Insight text with `text-slate-700` at `text-sm`
- Color-coded left border: `border-l-4` in `emerald-500` (opportunity), `amber-500` (warning), `rose-500` (alert)
- Slide-in animation using NanoBanana `--nb-ease-enter` on mount

---

## 🖥️ LANDING PAGE SPECIFIC RULES

### Hero Section
- Background: Pure `--slate-50` (OLED black) with a **subtle indigo radial glow** centered: `radial-gradient(ellipse 80% 40% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 100%)`
- Headline: Google Sans Display, 56px, weight 600, `--slate-900` — split across 2 lines max
- Sub-headline: Google Sans Text, 20px, weight 400, `--slate-500`
- **Two CTAs side by side:** Primary orange button ("Start as Retailer") + Ghost indigo button ("Join as Wholesaler")
- Below CTAs: 3 trust signals in a row (icon + number + label), `text-xs eyebrow` style

### Stats Section
- Count-up animation already implemented — keep it, but style the numbers as Google Sans Display, 48px, `--primary-500`
- Labels below in `text-xs uppercase tracking-widest --slate-400`

### Feature/Story Section
- Sticky scroll storytelling: left panel = sticky narrative, right panel = scrolling screenshots
- Screenshot frames: `rounded-2xl border border-[--slate-200] shadow-xl` with a `surface-tint` overlay in indigo
- Active story highlight: `border-l-4 border-primary-500 pl-4` on the left nav label

### Footer
- `--slate-100` background (one shade above page background)
- Logo + tagline left, 3-column link grid right
- `border-t border-[--slate-200]`

---

## 📊 DASHBOARD SHARED RULES (Retailer + Wholesaler)

### Header Bar
- Height: 56px fixed
- Contents: Logo/Brand left | Tab navigation center | Notifications + User avatar right
- Background: `--slate-100` with `border-b border-[--slate-200]`
- **Role badge next to logo:** "Retailer" (indigo pill) or "Wholesaler" (amber pill)

### Tab Navigation
- Underline style tabs (not pill/box)
- Active: `border-b-2 border-primary-500 text-primary-600 font-medium`
- Inactive: `text-slate-400 hover:text-slate-600`
- Transition: NanoBanana `--nb-ease-smooth --nb-duration-fast`

### KPI Row (top of dashboard tab)
- 4 cards in a row (2×2 on mobile)
- Each: eyebrow label + large data value + delta badge
- **Retailer KPIs:** Indigo/Emerald accent
- **Wholesaler KPIs:** Indigo/Amber accent (use amber for revenue/margin metrics)

### Charts (Recharts)
- `AreaChart` fill: gradient from `primary-500 opacity-20` → transparent
- `AreaChart` stroke: `primary-500`
- `BarChart` fill: `secondary-500` (emerald) for positive bars, `error-500` for negative
- Tooltip: `bg-[--slate-100] border border-[--card-border] rounded-xl shadow-lg text-slate-700`
- Grid lines: `stroke="var(--color-slate-200)"` — no harsh gridlines
- Axis text: `fill="var(--color-slate-400)" fontSize={11}`

### Notifications Panel
- Slide in from right, `w-80`
- `bg-[--slate-100] border-l border-[--slate-200]`
- Unread badge: `bg-primary-500 text-white text-xs rounded-full`
- Animation: NanoBanana spring ease from `translateX(100%)` → `translateX(0)`

---

## 🛒 ADD PRODUCT DIALOG (WholesalerDashboard)

Redesign `AddProductDialog.tsx`:
- Replace all `bg-orange-*` and `border-orange-*` classes with CSS variable equivalents
- Dialog backdrop: `bg-black/60 backdrop-blur-sm` (keep, it's good)
- Dialog container: `bg-[var(--card-bg)] rounded-3xl border border-[var(--card-border)]`
- Section headers inside form: use **eyebrow** style (`text-xs font-600 uppercase tracking-widest text-primary-500`)
- Section backgrounds: `bg-[var(--color-slate-50)] rounded-xl border border-[var(--card-border)]`
- All focus rings: `focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500` (indigo, not orange)
- Submit button: `btn-tactile-orange` (keep orange here — this is a primary CTA, orange is correct)
- Cancel button: `btn-secondary`
- Image upload zone: dashed border `border-2 border-dashed border-[var(--color-slate-200)]`, on hover `border-primary-500`

---

## ♿ QUALITY FLOOR (non-negotiable)

- All interactive elements must have visible focus states (`focus-visible:ring-2`)
- Color contrast: text on surfaces must pass WCAG AA (4.5:1 for body, 3:1 for large text)
- Responsive: dashboards must work at 768px (tablet) — sidebar collapses, KPI grid goes 2-col
- Respect `@media (prefers-reduced-motion: reduce)` — wrap NanoBanana animations in a check
- No `!important` except inside existing `.btn-tactile-*` definitions (already there, keep them)

---

## 📋 EXECUTION ORDER

Regenerate in this exact order to avoid token inconsistencies:

1. **`index.css`** — Add `input-field` class, add `Google Sans` font imports, update `--font-family-sans`, add NanoBanana motion tokens as CSS variables
2. **`LandingPage.tsx`** — Apply new typography scale, hero glow, Spatial Canvas grid, dual CTAs
3. **`RetailerDashboard.tsx`** — Apply role accent (indigo/emerald), AI Advisor panel, NanoBanana transitions, chart colors
4. **`WholesalerDashboard.tsx`** — Apply role accent (indigo/amber), consistent token usage, same chart/table system
5. **`AddProductDialog.tsx`** — Strip orange classes, replace with token system, fix focus rings
6. **`App.css`** — Remove duplicate `fadeIn` keyframe (it already exists in `index.css`), update scrollbar to use `--slate-200`/`--slate-300`

---

## ✅ SUCCESS CRITERIA

After your redesign, these must all be true:

- [ ] Landing page and dashboards share the same font stack, spacing rhythm, and color palette
- [ ] A user can tell they're in "Retailer mode" vs "Wholesaler mode" from the accent colors alone
- [ ] No raw Tailwind `orange-*` color classes exist in dashboards (only in `btn-tactile-orange` and CTAs)
- [ ] `input-field` is defined and works correctly in all forms
- [ ] All transitions use NanoBanana motion tokens
- [ ] Google Sans Display/Text/Mono are used for display, body, and data respectively
- [ ] KPI cards have consistent eyebrow + value + delta structure
- [ ] Charts use the defined color system (indigo area, emerald/rose bars)
- [ ] The AI Insight cards in RetailerDashboard have the Gemini spark aesthetic
- [ ] Mobile at 768px: sidebar collapses, grid adapts, no horizontal overflow
