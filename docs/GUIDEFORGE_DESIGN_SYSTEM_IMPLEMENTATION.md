# GuideForge Design System — Implementation Log

---

## ⚠️ Background color rule — read before touching any surface

**Default page/card backgrounds must be parchment/cream, not pink/blush.**

- Page background: `#F6F1E8` → `oklch(0.972 0.014 85)` — warm cream
- Card background: `#FBF8F3` → `oklch(0.99 0.008 88)` — soft ivory
- Pink, rose, blush, and red-tinted surfaces are WRONG. They should never appear on any page background, hero surface, card, or section background.

**Why pink appeared (and the fix):**
`color-mix(in oklch, var(--brass-500) 7%, transparent)` causes pink because `transparent` in oklch is `oklch(0 0 0)` with hue H=0 (red). When mixing a warm brass color (H~42-55) with this transparent at low percentages, the hue interpolates toward H=0 (red/pink). At 7%, the result is a faint reddish glow instead of the intended warm brass glow.

**Fix applied (Pass 2):** All `color-mix(in oklch, …, transparent)` calls in `app/globals.css` have been changed to `color-mix(in srgb, …, transparent)`. In sRGB, alpha blends without hue-shifting toward red. The brass/golden glow now renders correctly as warm amber, not pink.

**Rule going forward:** Never use `color-mix(in oklch, …, transparent)` for visible background glow effects. Use `in srgb` when fading to transparent. Use `in oklch` only when mixing two fully-opaque, non-transparent colors.

---

## Pass 2 — Token alignment + sRGB pink fix

**Date:** 2026-05-16  
**Status:** Complete.

### Changes in Pass 2

#### `app/globals.css` — `:root` additions

| Addition | Value | Reason |
|---|---|---|
| `--radius-sm` | `0.375rem` (6px) | Explicit value matching design system |
| `--radius-md` | `0.5rem` (8px) | Explicit value matching design system |
| `--radius-lg` | `0.75rem` (12px) | **Was 10px via calc** — now matches design system 12px |
| `--radius-xl` | `1rem` (16px) | **Was 14px via calc** — now matches design system 16px |
| `--space-0` … `--space-20` | 4-pt scale | Design system spacing tokens; not used by Tailwind utilities |

#### `app/globals.css` — `@theme inline` changes

`--radius-sm/md/lg/xl` changed from `calc(var(--radius) ± Npx)` to explicit `0.375rem / 0.5rem / 0.75rem / 1rem`. Tailwind's `rounded-lg` and `rounded-xl` utilities now match design system values.

#### `app/globals.css` — `.shadow-forge` utility class

Changed from a custom, weaker shadow (no inset, 25% brass-500) to `box-shadow: var(--shadow-forge)`. The Tailwind class `shadow-forge` now matches the `--shadow-forge` CSS token exactly (inset brass top rail at 60%, forge drop shadow).

#### `app/globals.css` — `color-mix` pink fix

**All** `color-mix(in oklch, …)` calls changed to `color-mix(in srgb, …)` globally via replace. This eliminates the pink/blush hue shift caused by oklch hue interpolation toward H=0 (red) when fading to transparent. Affects:
- `.gf-page` and `.surface-parchment` radial glows
- `.surface-masthead`, `.surface-graphite`, `.surface-ivory`
- `.bg-parchment-grid`, `.bg-parchment-dots`, `.bg-constellation`
- `.divider-brass`, `.gf-brass-divider`, `.gf-brass-rail::before`
- All `gf-copper` opacity fallback utilities
- `--shadow-forge` token in `:root`
- All seal/card/border color mixes

#### `app/globals.css` — new naming aliases (additive)

CSS-identical aliases using design system canonical names:

| New class | Aliases |
|---|---|
| `.gf-divider-brass` | Same CSS as `.gf-brass-divider` |
| `.gf-surface-parchment` | Same CSS as `.surface-parchment` |
| `.gf-surface-ivory` | Same CSS as `.surface-ivory` |
| `.gf-surface-graphite` | Same CSS as `.surface-graphite` |
| `.gf-parchment-grid` | Same CSS as `.bg-parchment-grid` |
| `.gf-constellation` | Same CSS as `.bg-constellation` |

#### `app/globals.css` — new typography utility classes (additive)

`.gf-h1`, `.gf-h2`, `.gf-h3`, `.gf-h4`, `.gf-lede`, `.gf-body`, `.gf-small`, `.gf-mono`, `.gf-serif-display`, `.gf-serif-italic` — from `colors_and_type.css`. All opt-in; no components changed.

---

## Pass 1 — Foundation tokens + scoped component updates

**Date:** 2026-05-15  
**Status:** Complete.

---

### Tokens added (`app/globals.css`)

Added to `:root` alongside the existing `--brand-*` and `--brass-*` tokens:

| Token | Value | Role |
|---|---|---|
| `--gf-parchment` | `#F6F1E8` | Page background (NOT pink) |
| `--gf-soft-ivory` | `#FBF8F3` | Cards, panels, popovers |
| `--gf-graphite` | `#1F1A17` | Primary text |
| `--gf-charcoal-brown` | `#2B2521` | Dark nav, Forged surface |
| `--gf-muted-slate` | `#6B6255` | Secondary/muted text (warm brown) |
| `--gf-copper` | `#B86A3B` | Primary CTA accent |
| `--gf-copper-deep` | `#8C4F2A` | Copper hover / pressed |
| `--gf-ember` | `#D9782F` | Highlight glow, link hover |
| `--gf-brass` | `#C7A15A` | Warm-gold badges, dividers |
| `--gf-brass-deep` | `#8A6F3A` | Engraved brass on dark surfaces |
| `--gf-teal` | `#2F8A87` | Verified / success / Ready |
| `--gf-steel-blue` | `#35546B` | Info / In Review |
| `--gf-amber` | `#B47A2A` | Draft state |
| `--gf-rust` | `#B0432A` | Destructive / error / Needs Update |
| `--fg-1` | `var(--foreground)` | Primary text tier |
| `--fg-2` | `oklch(0.42 0.015 55)` | Body / secondary text |
| `--fg-3` | `var(--muted-foreground)` | Muted / placeholder |
| `--fg-on-dark` | `oklch(0.96 0.012 85)` | Text on graphite surfaces |
| `--radius-pill` | `9999px` | Pills / badges |
| `--shadow-xs/sm/card/lg/forge` | Various | Shadow scale |
| `--ease-out/soft` | Bezier curves | Motion easing |
| `--dur-fast/base/slow` | 120/180/280ms | Motion duration |
| `--tracking-tight/normal/wide/mono/luxe` | Letter-spacing scale | Typography |

Added to `@theme inline` (Tailwind utility access):
- `--color-gf-*` — `bg-gf-copper`, `text-gf-teal`, `border-gf-rust`, etc.
- `--font-serif` — `font-serif` class (Fraunces stack; no font files loaded yet — see pending)
- `--radius-pill` — `rounded-pill` class

**Note on `--brand-muted-slate`:** Left unchanged at `oklch(0.280 0.120 330)` (#6B255A). This is an intentional governance/admin purple used for admin badge text, not a page surface. The new `--gf-muted-slate` (#6B6255) is a separate token for warm-brown secondary text.

---

### Surface utility classes added (`app/globals.css`, `@layer utilities`)

These are additive opt-in classes. Existing `.surface-*`, `.card-foundry`, `.forge-seal`, `.divider-brass` classes are unchanged.

| Class | Use on |
|---|---|
| `.gf-page` | Page wrappers; parchment + brass radials |
| `.gf-card` | Standard foundry cards (ivory, brass border, forge shadow, hover lift) |
| `.gf-card-forge` | Dark graphite cards for premium / admin contexts |
| `.gf-section-card` | Builder panels and public-reader dispatch boxes |
| `.gf-brass-divider` | Horizontal brass fade hairline |
| `.gf-overline` | Mono uppercase tracking labels |
| `.gf-eyebrow` | Copper uppercase eyebrows |
| `.gf-muted` | Secondary body copy |
| `.gf-forged-surface` | Dark sidebar / nav / admin panel backgrounds |
| `.gf-forge-seal` | Coined-gradient brass icon well (32–44px square) |
| `.gf-brass-rail::before` | 1px brass gradient top accent (sticky headers) |

Usage:
```tsx
<main className="gf-page"> … </main>
<article className="gf-card p-5"> … </article>
<div className="gf-card-forge p-5"> … </div>
<section className="gf-section-card"> … </section>
<hr className="gf-brass-divider my-6" />
```

---

### Components updated in Pass 1

**1. `components/guideforge/site-header.tsx`**
- Added `<div className="gf-brass-divider" aria-hidden="true" />` as the first child of `<header>`, giving the header a 1px brass gradient top accent rail.
- No structural changes. Existing `.forge-seal`, `text-primary` wordmark, `backdrop-blur`, `bg-background/80` already aligned.

**2. `components/guideforge/shared/status-badge.tsx`**
- Updated `needs-update` color from generic `bg-destructive/10 text-destructive border-destructive/30` to warm-rust palette: `bg-[#F4DCD8] text-[#8A2A1C] border-[#D9A097]`.
- All other status styles (draft, in-review, ready, published, deprecated, archived) already used brand tokens and were left unchanged.
- All verification tier styles already aligned — left unchanged.

**3. `components/guideforge/builder/network-dashboard-tabs.tsx`**
- Updated "Guides", "Hubs", "Collections" tab count pills from generic `bg-slate-200 dark:bg-slate-700 text-slate-900` to brass-tinted: `color-mix(in srgb, var(--brass-100) 60%, var(--card))` background, `var(--fg-3)` text, `var(--font-mono)` at 10px. (Pass 2 updated this from `in oklch` to `in srgb` to prevent pink shift.)
- Draft / Pending Review / Published count pills already had correct brass/steel/teal treatment — left unchanged.

**4. `components/guideforge/public/guide-card.tsx`**
- No changes. Already uses `.card-foundry` (functionally equivalent to `.gf-card`), brass-700 overline tokens, and `text-primary` hover states. Already token-aligned.

---

### What was intentionally NOT implemented

| Area | Why |
|---|---|
| Guide editor page layout | Risk of breaking AI builder logic |
| Network / asset card full redesign | Scope too broad; separate pass |
| Builder form inputs | Needs form library audit first |
| Governance panel | Needs dedicated design pass |
| Review surfaces | Complex state; design first |
| Dark mode token mapping | Light-mode only for now; dark pass TBD |
| Font file loading | Fraunces / Inter vs. Geist not resolved; `--font-serif` var is defined but no files loaded |
| Photography / imagery | No production photos; constellation placeholders remain |
| Final logo SVG | Brand team has not delivered production SVG |
| Final Forged badge SVG | Same — CSS pill used for this pass |
| `gf-page` forced on all pages | Utility exists; adopt page-by-page to avoid regressions |
| Pink value sweep | No pink page surface values found in inspected files |

---

### Visual test checklist

- [ ] Page background is parchment/cream (#F6F1E8 region) — NOT pink or blush
- [ ] Site header has 1px brass gradient top rail visible above the nav row
- [ ] Site header has frosted-glass parchment backdrop (not solid white)
- [ ] "Forge" in wordmark is copper (#B86A3B) — not blue, not black
- [ ] Active nav tab underline is copper (via `after:bg-primary` → `var(--primary)`)
- [ ] Draft badge: warm amber-gold tones, NOT generic grey
- [ ] In Review badge: steel blue tones, NOT generic blue
- [ ] Ready badge: muted teal tones, NOT generic green
- [ ] Published badge: green tones ✓
- [ ] Needs Update badge: warm rust-red tones (#F4DCD8 bg / #8A2A1C text), NOT generic red
- [ ] Forged verification badge: dark charcoal background + warm brass text + ✦ prefix
- [ ] Guide card: ivory background with brass top inset shadow (forge shadow via `.card-foundry`)
- [ ] Guide card hover: lifts 1px, border saturates to deeper brass
- [ ] Dashboard "Guides" / "Hubs" / "Collections" count pills: brass-tinted mono, not slate grey
- [ ] Forge seal (logo icon well) renders as coined brass gradient — not flat color
- [ ] No generic SaaS blue (#3B82F6) used for primary actions
- [ ] No pink appearing as a surface or background

---

### Pending — later passes

1. **Final SVG logo** — `guideforge-icon-mark.png` is a raster reference. Replace `.forge-seal` well with final SVG when brand team delivers.
2. **Final Forged badge SVG** — `forged-badge-main.png` is raster reference. CSS pill is the current implementation.
3. **Font resolution** — `--font-serif` var is defined (Fraunces stack) but no font files are loaded. Resolve Fraunces vs. Geist before applying `font-serif` to heading components.
4. **Page background adoption** — `.gf-page` utility exists. Apply to marketing landing and builder dashboard in a dedicated pass.
5. **Dark mode token mapping** — `:root[data-theme="dark"]` pass needed.
6. **Builder workspace stat cards, guide table rows** — token alignment deferred (separate builder-UI pass).
