# GuideForge Design System — Claude Code Handoff Bundle

> **Generated from:** GuideForge Design System project (source of truth)  
> **Target:** `sonaeko-code/GuideForge` Next.js + Tailwind v4 repo  
> **Date:** May 2026 — Pass 1 (foundation tokens + scoped component updates only)

---

## ⚠️ Critical constraints — read before touching anything

1. **Do NOT use a pink or blush page background.** The correct default page surface is parchment/cream (`#F6F1E8`, OKLCH `0.972 0.014 85`). Any pink value in the current codebase is a mistake, not a direction. Purge it.
2. **Do NOT redesign page layouts, editor flows, AI builder logic, Supabase schema, or auth/RLS.** This pass is scoped to tokens + four components only.
3. **Logo and badge images are raster reference crops only.** `guideforge-logo-lockup.png`, `guideforge-icon-mark.png`, `forged-badge-main.png`, `forged-badge-icon.png` are placeholder references for now. Do not install them as production `<img>` tags in final UI. Final production SVG assets are still pending. For this pass, the forge-seal is rendered in pure CSS (see component guidance below).
4. **Do not replace every component.** Only the four components listed in Task 4 receive changes in this pass.

---

## Part 1 — Design Token Manifest

These are the canonical token values from the GuideForge Design System. Paste the `:root` block into `app/globals.css`, replacing or merging with whatever is there. Use the OKLCH values — they are lifted directly from the production intent.

```css
/* ============================================================
   GuideForge Design Tokens — Pass 1
   Source: GuideForge Design System / colors_and_type.css
   ============================================================ */

:root {
  /* --- BRAND HEX ALIASES (semantic quick-reference) --- */
  --gf-parchment:       #F6F1E8; /* page background — NOT pink */
  --gf-soft-ivory:      #FBF8F3; /* cards, panels, popovers */
  --gf-graphite:        #1F1A17; /* primary text */
  --gf-charcoal-brown:  #2B2521; /* dark nav, Forged surface */
  --gf-muted-slate:     #6B6255; /* secondary / muted text */

  --gf-copper:          #B86A3B; /* primary CTA accent */
  --gf-copper-deep:     #8C4F2A; /* copper hover / pressed state */
  --gf-ember:           #D9782F; /* highlight glow, link hover */
  --gf-brass:           #C7A15A; /* warm-gold badges, dividers */
  --gf-brass-deep:      #8A6F3A; /* engraved brass on dark surfaces */

  --gf-teal:            #2F8A87; /* verified / success / Ready */
  --gf-steel-blue:      #35546B; /* info / In Review */
  --gf-amber:           #B47A2A; /* Draft state (warm amber-gold) */
  --gf-rust:            #B0432A; /* destructive / error / Needs Update */

  /* --- OKLCH FOUNDATIONS (semantic shadcn/ui slots) --- */
  --background:         oklch(0.972 0.014 85);   /* parchment */
  --foreground:         oklch(0.235 0.012 55);   /* graphite text */
  --card:               oklch(0.99  0.008 88);   /* soft ivory */
  --card-foreground:    oklch(0.235 0.012 55);
  --popover:            oklch(0.99  0.008 88);
  --popover-foreground: oklch(0.235 0.012 55);
  --primary:            oklch(0.555 0.115 42);   /* copper */
  --primary-foreground: oklch(0.985 0.008 88);   /* near-white on copper */
  --secondary:          oklch(0.945 0.012 80);   /* warm wash */
  --secondary-foreground: oklch(0.235 0.012 55);
  --muted:              oklch(0.945 0.012 80);
  --muted-foreground:   oklch(0.5   0.018 55);   /* muted slate */
  --accent:             oklch(0.92  0.04  75);   /* muted amber wash */
  --accent-foreground:  oklch(0.235 0.012 55);
  --destructive:        oklch(0.55  0.20  25);   /* rust red */
  --destructive-foreground: oklch(0.985 0.008 88);
  --border:             oklch(0.88  0.012 78);   /* warm neutral border */
  --input:              oklch(0.9   0.012 78);
  --ring:               oklch(0.555 0.115 42);   /* copper focus ring */

  /* --- BRASS SCALE (copper-brass family) --- */
  --brass-50:  oklch(0.97  0.008 90);  /* cream-warm wash */
  --brass-100: oklch(0.945 0.015 85); /* light ivory tint */
  --brass-300: oklch(0.78  0.08  55); /* mid-brass */
  --brass-500: oklch(0.615 0.125 48); /* brass accent */
  --brass-700: oklch(0.45  0.08  45); /* deep brass / engraved */
  --brass-900: oklch(0.25  0.05  40); /* forged graphite-brass */

  /* --- TYPOGRAPHY FAMILIES --- */
  --font-serif: "Fraunces", "Source Serif Pro", "Iowan Old Style", Georgia, serif;
  --font-sans:  "Inter", "Geist", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono:  "JetBrains Mono", "Geist Mono", "SFMono-Regular", ui-monospace, monospace;

  /* --- FOREGROUND TIERS --- */
  --fg-1: var(--foreground);                    /* primary text */
  --fg-2: oklch(0.42 0.015 55);                /* body / secondary text */
  --fg-3: var(--muted-foreground);             /* muted / placeholder */
  --fg-on-dark: oklch(0.96 0.012 85);          /* text on graphite surfaces */

  /* --- RADIUS --- */
  --radius:      0.625rem;   /* 10px — default card */
  --radius-sm:   0.375rem;   /* 6px — inputs */
  --radius-md:   0.5rem;     /* 8px — buttons */
  --radius-lg:   0.75rem;    /* 12px — cards */
  --radius-xl:   1rem;       /* 16px — hero wells */
  --radius-pill: 9999px;     /* pills / badges */

  /* --- ELEVATION / SHADOW --- */
  --shadow-xs:    0 1px 2px rgba(0,0,0,.04);
  --shadow-sm:    0 1px 2px rgba(0,0,0,.05);
  --shadow-card:  0 4px 12px rgba(0,0,0,.08);
  --shadow-lg:    0 8px 24px rgba(0,0,0,.12);
  /* Signature forge shadow — brass top inset + warm drop */
  --shadow-forge: inset 0 2px 0 0 color-mix(in oklch, var(--brass-500) 60%, transparent),
                  0 1px 2px rgba(0,0,0,.04),
                  0 8px 20px -10px color-mix(in oklch, var(--brass-700) 22%, transparent);

  /* --- MOTION --- */
  --ease-out:  cubic-bezier(.2,.7,.2,1);
  --ease-soft: cubic-bezier(.4,0,.2,1);
  --dur-fast:  120ms;
  --dur-base:  180ms;
  --dur-slow:  280ms;

  /* --- SPACING (4-pt scale) --- */
  --space-0:  0;
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;

  /* --- TRACKING --- */
  --tracking-tight:  -0.02em;
  --tracking-normal: 0;
  --tracking-wide:   0.04em;
  --tracking-mono:   0.15em;  /* uppercase mono labels */
  --tracking-luxe:   0.20em;  /* masthead eyebrows */
}
```

### Page background gradient rule

**Every parchment page surface must carry a faint warm brass radial.** Never flat `#F6F1E8`. Apply via the `gf-page` utility class (defined in Part 3), or inline:

```css
background-color: var(--background);
background-image:
  radial-gradient(ellipse at top left,
    color-mix(in oklch, var(--brass-500) 7%, transparent), transparent 55%),
  radial-gradient(ellipse at bottom right,
    color-mix(in oklch, var(--brass-700) 5%, transparent), transparent 60%),
  linear-gradient(180deg,
    color-mix(in oklch, var(--brass-100) 35%, var(--background)) 0%,
    var(--background) 60%);
```

---

## Part 2 — Tailwind Token Mapping

If the repo uses Tailwind v4 (CSS-first config in `app/globals.css` with `@theme`), add this block **after** the `:root` block. If it uses v3 (`tailwind.config.ts`), use the v3 mapping below instead.

### Tailwind v4 (`@theme` block — CSS-first)

```css
@theme {
  --color-background:        var(--background);
  --color-foreground:        var(--foreground);
  --color-card:              var(--card);
  --color-card-foreground:   var(--card-foreground);
  --color-primary:           var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary:         var(--secondary);
  --color-muted:             var(--muted);
  --color-muted-foreground:  var(--muted-foreground);
  --color-border:            var(--border);
  --color-input:             var(--input);
  --color-ring:              var(--ring);
  --color-destructive:       var(--destructive);

  /* GuideForge semantic */
  --color-gf-parchment:      var(--gf-parchment);
  --color-gf-soft-ivory:     var(--gf-soft-ivory);
  --color-gf-graphite:       var(--gf-graphite);
  --color-gf-charcoal:       var(--gf-charcoal-brown);
  --color-gf-copper:         var(--gf-copper);
  --color-gf-copper-deep:    var(--gf-copper-deep);
  --color-gf-ember:          var(--gf-ember);
  --color-gf-brass:          var(--gf-brass);
  --color-gf-brass-deep:     var(--gf-brass-deep);
  --color-gf-teal:           var(--gf-teal);
  --color-gf-steel-blue:     var(--gf-steel-blue);
  --color-gf-amber:          var(--gf-amber);
  --color-gf-rust:           var(--gf-rust);

  /* Brass scale */
  --color-brass-50:   var(--brass-50);
  --color-brass-100:  var(--brass-100);
  --color-brass-300:  var(--brass-300);
  --color-brass-500:  var(--brass-500);
  --color-brass-700:  var(--brass-700);
  --color-brass-900:  var(--brass-900);

  /* Radius */
  --radius-sm:   var(--radius-sm);
  --radius-md:   var(--radius-md);
  --radius-DEFAULT: var(--radius);
  --radius-lg:   var(--radius-lg);
  --radius-xl:   var(--radius-xl);
  --radius-pill: var(--radius-pill);

  /* Shadows */
  --shadow-xs:    var(--shadow-xs);
  --shadow-sm:    var(--shadow-sm);
  --shadow-card:  var(--shadow-card);
  --shadow-lg:    var(--shadow-lg);
  --shadow-forge: var(--shadow-forge);

  /* Font families */
  --font-serif: var(--font-serif);
  --font-sans:  var(--font-sans);
  --font-mono:  var(--font-mono);
}
```

### Tailwind v3 (`tailwind.config.ts` — JS config)

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        // GuideForge semantic
        gf: {
          parchment:     "var(--gf-parchment)",
          "soft-ivory":  "var(--gf-soft-ivory)",
          graphite:      "var(--gf-graphite)",
          charcoal:      "var(--gf-charcoal-brown)",
          copper:        "var(--gf-copper)",
          "copper-deep": "var(--gf-copper-deep)",
          ember:         "var(--gf-ember)",
          brass:         "var(--gf-brass)",
          "brass-deep":  "var(--gf-brass-deep)",
          teal:          "var(--gf-teal)",
          "steel-blue":  "var(--gf-steel-blue)",
          amber:         "var(--gf-amber)",
          rust:          "var(--gf-rust)",
        },
        brass: {
          50:  "var(--brass-50)",
          100: "var(--brass-100)",
          300: "var(--brass-300)",
          500: "var(--brass-500)",
          700: "var(--brass-700)",
          900: "var(--brass-900)",
        },
      },
      borderRadius: {
        sm:   "var(--radius-sm)",
        md:   "var(--radius-md)",
        DEFAULT: "var(--radius)",
        lg:   "var(--radius-lg)",
        xl:   "var(--radius-xl)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        xs:    "var(--shadow-xs)",
        card:  "var(--shadow-card)",
        lg:    "var(--shadow-lg)",
        forge: "var(--shadow-forge)",
      },
      fontFamily: {
        serif: ["Fraunces", "Source Serif Pro", "Georgia", "serif"],
        sans:  ["Inter", "Geist", "system-ui", "sans-serif"],
        mono:  ["JetBrains Mono", "Geist Mono", "ui-monospace", "monospace"],
      },
      transitionTimingFunction: {
        "out-gf":  "cubic-bezier(.2,.7,.2,1)",
        "soft-gf": "cubic-bezier(.4,0,.2,1)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "180ms",
        slow: "280ms",
      },
    },
  },
};
export default config;
```

---

## Part 3 — Surface & Utility Classes

Add these to `app/globals.css` (after the `:root` block). They are opt-in — no existing component is forced to use them in this pass.

```css
/* ============================================================
   GuideForge surface utilities — Pass 1
   Use these for controlled adoption. Do not force all pages.
   ============================================================ */

/* Default page surface — parchment with brass radial glows */
.gf-page {
  background-color: var(--background);
  background-image:
    radial-gradient(ellipse at top left,
      color-mix(in oklch, var(--brass-500) 7%, transparent), transparent 55%),
    radial-gradient(ellipse at bottom right,
      color-mix(in oklch, var(--brass-700) 5%, transparent), transparent 60%),
    linear-gradient(180deg,
      color-mix(in oklch, var(--brass-100) 35%, var(--background)) 0%,
      var(--background) 60%);
  color: var(--foreground);
  font-family: var(--font-sans);
  min-height: 100vh;
}

/* Ivory card — standard foundry card surface */
.gf-card {
  background-color: var(--card);
  background-image: linear-gradient(180deg,
    color-mix(in oklch, var(--brass-50) 60%, var(--card)) 0%,
    var(--card) 100%);
  border: 1px solid color-mix(in oklch, var(--brass-500) 18%, var(--border));
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-forge);
  transition:
    transform var(--dur-base) var(--ease-out),
    border-color var(--dur-base) var(--ease-out),
    box-shadow var(--dur-base) var(--ease-out);
}
.gf-card:hover {
  transform: translateY(-1px);
  border-color: color-mix(in oklch, var(--brass-500) 38%, var(--border));
}

/* Forged card — dark graphite, brass highlight. For premium / admin contexts. */
.gf-card-forge {
  background-color: oklch(0.22 0.014 55);
  background-image:
    radial-gradient(circle at 12% 18%,
      color-mix(in oklch, var(--brass-500) 22%, transparent), transparent 35%),
    radial-gradient(circle at 88% 82%,
      color-mix(in oklch, var(--brass-700) 15%, transparent), transparent 40%),
    linear-gradient(180deg, oklch(0.24 0.016 55) 0%, oklch(0.18 0.012 55) 100%);
  color: var(--fg-on-dark);
  border: 1px solid oklch(0.32 0.04 50);
  border-radius: var(--radius-lg);
}

/* Section card — used in builder panels and public-reader dispatch boxes */
.gf-section-card {
  background: var(--gf-soft-ivory);
  background-image: linear-gradient(180deg,
    color-mix(in oklch, var(--brass-50) 60%, var(--card)) 0%,
    var(--card) 100%);
  border: 1px solid color-mix(in oklch, var(--brass-500) 18%, var(--border));
  border-radius: var(--radius-lg);
  transition: border-color var(--dur-base), box-shadow var(--dur-base), transform var(--dur-base);
}
.gf-section-card:hover {
  border-color: color-mix(in oklch, var(--brass-500) 38%, var(--border));
  box-shadow: var(--shadow-card);
  transform: translateY(-1px);
}

/* Brass divider — horizontal hairline that fades at both ends */
.gf-brass-divider {
  height: 1px;
  background-image: linear-gradient(90deg,
    transparent 0%,
    color-mix(in oklch, var(--brass-500) 65%, transparent) 20%,
    color-mix(in oklch, var(--brass-500) 65%, transparent) 80%,
    transparent 100%);
  border: none;
}

/* Mono overline — taxonomy breadcrumbs, section labels */
.gf-overline {
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 10px;
  letter-spacing: var(--tracking-mono);
  text-transform: uppercase;
  color: var(--fg-3);
}

/* Copper eyebrow — section leads, feature callouts */
.gf-eyebrow {
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: var(--tracking-luxe);
  text-transform: uppercase;
  color: var(--gf-copper);
}

/* Muted text — secondary body copy */
.gf-muted {
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.5;
}

/* Forged surface — dark graphite background, for nav/sidebar/admin panels */
.gf-forged-surface {
  background-color: oklch(0.22 0.014 55);
  background-image:
    radial-gradient(circle at 12% 18%,
      color-mix(in oklch, var(--brass-500) 22%, transparent), transparent 35%),
    radial-gradient(circle at 88% 82%,
      color-mix(in oklch, var(--brass-700) 15%, transparent), transparent 40%),
    linear-gradient(180deg, oklch(0.24 0.016 55) 0%, oklch(0.18 0.012 55) 100%);
  color: var(--fg-on-dark);
  border-right: 1px solid oklch(0.32 0.04 50);
}

/* Forge seal — the coined-gradient brass square behind the GuideMark glyph */
/* Use on a 32–44px square element. Center the GuideMark SVG inside it. */
.gf-forge-seal {
  background-image:
    radial-gradient(circle at 30% 25%,
      color-mix(in oklch, var(--brass-300) 70%, transparent), transparent 55%),
    linear-gradient(135deg,
      var(--brass-700) 0%, var(--brass-500) 50%, var(--brass-700) 100%);
  border: 1px solid color-mix(in oklch, var(--brass-900) 60%, transparent);
  box-shadow:
    inset 0 1px 0 0 color-mix(in oklch, var(--brass-300) 80%, transparent),
    inset 0 -1px 0 0 color-mix(in oklch, var(--brass-900) 50%, transparent),
    0 1px 2px rgba(0,0,0,.15);
  color: oklch(0.18 0.02 50);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Brass accent rail — 1px top line. Add as ::before on sticky headers. */
.gf-brass-rail::before {
  content: "";
  display: block;
  height: 1px;
  background: linear-gradient(90deg,
    transparent,
    color-mix(in oklch, var(--brass-500) 70%, transparent),
    transparent);
}
```

---

## Part 4 — Component Implementation Guidance

### 4.1 — Site Header (`components/guideforge/site-header.tsx`)

**What to change:** Token swap only — no structural changes.

```
Sticky wrapper:
  background: color-mix(in oklch, var(--gf-parchment) 82%, transparent)
  backdrop-filter: blur(10px)
  border-bottom: 1px solid color-mix(in oklch, var(--brass-500) 18%, var(--border))

Top accent rail (::before or a 1px <div> above the inner row):
  background: linear-gradient(90deg, transparent, color-mix(in oklch, var(--brass-500) 70%, transparent), transparent)
  height: 1px

Forge seal (the logo icon well — 32–34px square, radius 8px):
  Apply .gf-forge-seal
  IMPORTANT: do NOT use a raster PNG here in this pass.
  Use the existing GuideMark SVG component (components/guideforge/brand/guide-mark.tsx)
  centered inside a .gf-forge-seal div.

Wordmark:
  font-family: var(--font-sans)
  font-size: 16–17px; font-weight: 700
  color: var(--gf-graphite)
  "Forge" portion: color: var(--gf-copper)

Nav links:
  color: var(--fg-3) default
  color: var(--fg-1) on active
  Animated underline on hover/active:
    ::after { height: 1px; background: var(--gf-copper); transform: scaleX(0→1); }

Primary CTA button:
  background: var(--gf-copper)
  color: #fff
  border-radius: var(--radius-md)  /* 8px */
  hover: background: var(--gf-copper-deep)
  ONE copper button per header — discipline here matters.
```

**TypeScript snippet (token application only):**

```tsx
// Site header inner wrapper class
// Replace hardcoded color values with these CSS variables:

const headerStyles = {
  wrapper: "sticky top-0 z-40 gf-brass-rail border-b",
  inner:   "h-[60px] flex items-center justify-between gap-6 px-6",
  // background applied inline or via a className:
  bg:      "bg-[color-mix(in_oklch,var(--gf-parchment)_82%,transparent)] backdrop-blur-[10px] border-[color-mix(in_oklch,var(--brass-500)_18%,var(--border))]",
};
// Nav link active underline — use data-active or router pathname check
// className for active: "text-foreground after:scale-x-100"
// className for default: "text-muted-foreground after:scale-x-0 hover:text-foreground hover:after:scale-x-100"
```

---

### 4.2 — Status Badge (`components/guideforge/shared/status-badge.tsx`)

This component needs the most direct change. Replace hardcoded colors with the two-scale system below. There are **two parallel scales**: Lifecycle Status and Verification Tier.

#### Lifecycle Status badges

| Status | Background | Text | Border |
|---|---|---|---|
| Draft | `color-mix(in oklch, var(--brass-100) 85%, var(--background))` | `#6B4A1B` | `color-mix(in oklch, var(--brass-500) 32%, transparent)` |
| In Review | `#E6ECF2` | `#274059` | `#B6C5D4` |
| Ready | `#DDF0EE` | `#1F5854` | `#9CCFCB` |
| Published | `#DBEEDD` | `#1F6A37` | `#A4D2AC` |
| Needs Update | `#F4DCD8` | `#8A2A1C` | `#D9A097` |
| Deprecated | `var(--gf-soft-ivory)` | `var(--fg-3)` | `var(--border)` + `text-decoration: line-through` |

#### Verification Tier badges

| Tier | Background | Text | Border | Notes |
|---|---|---|---|---|
| Unverified | `var(--gf-soft-ivory)` | `var(--fg-3)` | `var(--border)` | |
| Reviewed | `color-mix(in oklch, var(--brass-100) 50%, var(--card))` | `var(--fg-2)` | `var(--border)` | |
| Expert-reviewed | `color-mix(in oklch, var(--brass-100) 85%, var(--card))` | `var(--brass-700)` | `color-mix(in oklch, var(--brass-500) 38%, transparent)` | font-weight: 600 |
| Forge-verified | `color-mix(in oklch, var(--brass-100) 70%, var(--card))` | `var(--brass-700)` | `var(--brass-500)` | font-weight: 600 |
| **Forged** | `var(--gf-charcoal-brown)` | `#E8C781` | `var(--gf-brass-deep)` | See full spec below |

#### Forged badge — full spec

```css
/* The Forged verification badge — dark charcoal, brass text, inset brass rail */
.badge-forged {
  background: var(--gf-charcoal-brown);         /* #2B2521 */
  color: #E8C781;                                /* warm brass text */
  border: 1px solid var(--gf-brass-deep);        /* #8A6F3A */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 10.5px;
  padding: 4px 10px;
  border-radius: 9999px;
  box-shadow: inset 0 1px 0 color-mix(in oklch, var(--brass-300) 65%, transparent);
  /* Prefix with ✦ glyph in copper — this is the only star glyph we use */
}
/* ✦ prefix: <span style="color: var(--gf-brass)">✦</span> Forged */
```

#### TypeScript implementation pattern

```tsx
type LifecycleStatus = "draft" | "in_review" | "ready" | "published" | "needs_update" | "deprecated";
type VerificationTier = "unverified" | "reviewed" | "expert_reviewed" | "forge_verified" | "forged";

const lifecycleConfig: Record<LifecycleStatus, { bg: string; text: string; border: string; strikethrough?: boolean }> = {
  draft:       { bg: "color-mix(in oklch, var(--brass-100) 85%, var(--background))", text: "#6B4A1B", border: "color-mix(in oklch, var(--brass-500) 32%, transparent)" },
  in_review:   { bg: "#E6ECF2", text: "#274059", border: "#B6C5D4" },
  ready:       { bg: "#DDF0EE", text: "#1F5854", border: "#9CCFCB" },
  published:   { bg: "#DBEEDD", text: "#1F6A37", border: "#A4D2AC" },
  needs_update:{ bg: "#F4DCD8", text: "#8A2A1C", border: "#D9A097" },
  deprecated:  { bg: "var(--gf-soft-ivory)", text: "var(--fg-3)", border: "var(--border)", strikethrough: true },
};

const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  ready: "Ready",
  published: "Published",
  needs_update: "Needs update",
  deprecated: "Deprecated",
};

// Base badge layout:
// display: inline-flex; align-items: center; gap: 6px;
// padding: 3px 10px; border-radius: 9999px;
// font-size: 11.5px; font-weight: 500; border: 1px solid;
// Leading dot: 6×6px circle, border-radius: 50%, background: currentColor, opacity: 0.7
```

---

### 4.3 — Network Dashboard Tabs (`components/guideforge/builder/network-dashboard-tabs.tsx`)

**What to change:** Tab underline color → copper. Count pill → brass-tinted. No layout changes.

```css
/* Tab strip container */
border-bottom: 1px solid color-mix(in oklch, var(--brass-500) 18%, var(--border));

/* Individual tab — default */
color: var(--fg-3);
font-size: 13.5px;
font-weight: 500;

/* Individual tab — hover */
color: var(--fg-1);

/* Individual tab — active */
color: var(--fg-1);
font-weight: 600;
/* Active underline (::after): */
  height: 2px;
  background: var(--gf-copper);
  border-radius: 2px;
  /* position: absolute; left: 12px; right: 12px; bottom: -1px */

/* Count pill (the number bubble on tab) */
background: color-mix(in oklch, var(--brass-100) 60%, var(--card));
color: var(--fg-3);
border: 1px solid color-mix(in oklch, var(--brass-500) 20%, var(--border));
font-family: var(--font-mono);
font-size: 10px;
padding: 1px 6px;
border-radius: 9999px;
margin-left: 6px;
```

**TypeScript pattern:**

```tsx
// Active tab indicator — apply conditionally
const tabClass = (active: boolean) =>
  active
    ? "relative text-foreground font-semibold after:absolute after:left-3 after:right-3 after:-bottom-px after:h-0.5 after:bg-[var(--gf-copper)] after:rounded-full"
    : "text-muted-foreground font-medium hover:text-foreground";

// Count badge
const CountBadge = ({ n }: { n: number }) => (
  <span className="ml-1.5 rounded-full border px-1.5 py-px font-mono text-[10px] text-muted-foreground"
    style={{ background: "color-mix(in oklch, var(--brass-100) 60%, var(--card))", borderColor: "color-mix(in oklch, var(--brass-500) 20%, var(--border))" }}>
    {n}
  </span>
);
```

---

### 4.4 — Guide Card (`components/guideforge/public/guide-card.tsx`)

**The foundry card pattern.** Apply to the card container. Thumbnail and pill treatments follow.

```css
/* Card container — the "foundry card" */
.guide-card {
  border-radius: 12px;
  padding: 14px;
  background: var(--gf-soft-ivory);
  background-image: linear-gradient(180deg,
    color-mix(in oklch, var(--brass-50) 60%, var(--card)) 0%,
    var(--card) 100%);
  border: 1px solid color-mix(in oklch, var(--brass-500) 18%, var(--border));
  box-shadow:
    inset 0 2px 0 0 color-mix(in oklch, var(--brass-500) 60%, transparent),
    0 1px 2px rgba(0,0,0,.04),
    0 8px 20px -10px color-mix(in oklch, var(--brass-700) 22%, transparent);
  transition: transform 180ms var(--ease-out), border-color 180ms var(--ease-out);
}
.guide-card:hover {
  transform: translateY(-1px);
  border-color: color-mix(in oklch, var(--brass-500) 38%, var(--border));
}

/* Thumbnail (aspect-ratio 16/10 image well) */
.guide-card-thumb {
  aspect-ratio: 16 / 10;
  border-radius: 8px;
  background:
    radial-gradient(circle at 20% 30%, color-mix(in oklch, var(--brass-300) 25%, transparent), transparent 50%),
    radial-gradient(circle at 80% 80%, color-mix(in oklch, var(--brass-500) 25%, transparent), transparent 50%),
    linear-gradient(135deg, var(--gf-charcoal-brown), oklch(0.27 0.02 50));
  /* Overlay a constellation SVG at opacity: 0.35 for placeholder art */
}

/* Category / meta overline above title */
.guide-card-meta {
  display: flex; gap: 8px; align-items: center;
  margin-top: 10px;
  font-family: var(--font-mono);
  font-size: 9.5px; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--brass-700); /* category label */
  /* separator · in var(--fg-3) */
}

/* Title */
.guide-card-title {
  font-family: var(--font-serif);
  font-weight: 700; font-size: 18px; line-height: 1.25;
  color: var(--fg-1);
  margin: 8px 0 6px;
}

/* Description */
.guide-card-desc {
  font-size: 13px; line-height: 1.5;
  color: var(--fg-3);
  margin: 0 0 10px;
}

/* Difficulty pill */
.pill-difficulty {
  background: color-mix(in oklch, var(--brass-100) 60%, var(--card));
  color: var(--fg-2);
  border: 1px solid var(--border);
  /* difficulty pips: 3px×8px copper bars (filled) and border-colored bars (empty) */
}

/* Forged pill on card */
.pill-forged {
  background: var(--gf-charcoal-brown);
  color: #E8C781;
  border: 1px solid var(--gf-brass-deep);
  font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; font-size: 9.5px;
  padding: 3px 9px; border-radius: 9999px;
}
/* Prefix: ✦ glyph */
```

---

### 4.5 — Section Card (shared)

Apply to any `SectionCard` component used in builder panels or info sections.

```css
.section-card {
  background: var(--gf-soft-ivory);
  background-image: linear-gradient(180deg,
    color-mix(in oklch, var(--brass-50) 60%, var(--card)) 0%,
    var(--card) 100%);
  border: 1px solid color-mix(in oklch, var(--brass-500) 18%, var(--border));
  border-radius: 12px;
}

/* Card header row */
.section-card header {
  padding: 14px 16px;
  border-bottom: 1px solid color-mix(in oklch, var(--brass-500) 14%, var(--border));
  display: flex; gap: 12px; align-items: flex-start;
}

/* Icon well — 36×36px, radius 8px */
.section-card .icon-well {
  width: 36px; height: 36px; border-radius: 8px;
  background: color-mix(in oklch, var(--gf-copper) 12%, var(--card));
  color: var(--gf-copper);
  display: flex; align-items: center; justify-content: center;
}

/* Card body */
.section-card .body { padding: 14px 16px; }
```

---

### 4.6 — Builder Workspace Cards

These are the stat cards, guide table rows, and panels in the dashboard. **Do not redesign the layout.** Token swap only.

```css
/* Stat card (the 4-column strip under the network header) */
.stat-card {
  background: var(--gf-parchment);
  border: 1px solid color-mix(in oklch, var(--brass-500) 15%, var(--border));
  border-radius: 10px;
  padding: 14px 16px;
}
.stat-card .label {
  font-family: var(--font-mono);
  font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--fg-3);
}
.stat-card .value {
  font-family: var(--font-serif);
  font-size: 28px; font-weight: 600; letter-spacing: -0.02em;
  color: var(--fg-1);
}
.stat-card .delta-up  { color: #2F7B49; font-family: var(--font-mono); font-size: 11px; }
.stat-card .delta-dn  { color: var(--gf-rust); font-family: var(--font-mono); font-size: 11px; }

/* Guide table */
.gtable-wrapper {
  background: var(--gf-soft-ivory);
  border: 1px solid color-mix(in oklch, var(--brass-500) 18%, var(--border));
  border-radius: 12px;
  overflow: hidden;
}
.gtable-header {
  background: color-mix(in oklch, var(--brass-50) 80%, var(--card));
  border-bottom: 1px solid color-mix(in oklch, var(--brass-500) 18%, var(--border));
  font-family: var(--font-mono);
  font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--fg-3);
}
.gtable-row {
  border-bottom: 1px solid color-mix(in oklch, var(--brass-500) 10%, var(--border));
}
.gtable-row:hover {
  background: color-mix(in oklch, var(--brass-50) 60%, transparent);
}

/* Quality score bar */
.qbar-fill-high { background: var(--gf-teal); }
.qbar-fill-med  { background: var(--gf-brass); }
.qbar-fill-low  { background: var(--gf-ember); }
```

---

### 4.7 — Public Network Cards

```css
/* Hub card */
.hub-card-art {
  border-radius: 10px;
  background:
    radial-gradient(circle at 30% 30%, color-mix(in oklch, var(--gf-copper) 30%, transparent), transparent 55%),
    linear-gradient(135deg, oklch(0.34 0.05 50), oklch(0.22 0.02 55));
  border: 1px solid color-mix(in oklch, var(--brass-500) 25%, var(--border));
}

/* Forged shelf item */
.forged-shelf-item {
  background: color-mix(in oklch, var(--gf-copper) 6%, var(--gf-soft-ivory));
  border: 1px solid color-mix(in oklch, var(--gf-copper) 30%, var(--border));
  border-radius: 12px;
}
.forged-shelf-item:hover {
  background: color-mix(in oklch, var(--gf-copper) 10%, var(--gf-soft-ivory));
}
.forged-shelf-item .badge-line {
  font-family: var(--font-mono);
  font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--gf-copper);
}
.forged-shelf-item .footer {
  border-top: 1px solid color-mix(in oklch, var(--gf-copper) 20%, var(--border));
  font-family: var(--font-mono); font-size: 11px; color: var(--fg-3);
}

/* Public network header */
.pub-header {
  position: sticky; top: 0; z-index: 30;
  background: color-mix(in oklch, var(--gf-parchment) 80%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid color-mix(in oklch, var(--brass-500) 18%, var(--border));
}
/* ::before: brass rail (see .gf-brass-rail) */

/* Nav underline on hover — use brass (not copper) on public reader */
/* a::after: background: var(--gf-brass) */
```

---

### 4.8 — Forged Badge Treatment

**Never redraw the badge artwork.** `forged-badge-main.png` and `forged-badge-icon.png` are final art — raster references for now (see ⚠️ above). For this pass:

- In the UI, use the dark pill badge from 4.2 (the `.badge-forged` class)
- At guide title level, place a `forged-badge-icon.png` at 20–24px if the image is available — but log it as a pending task to replace with the final SVG
- **Do not** recreate the hex-shield shape in CSS/SVG — that is the brand team's territory

```tsx
// Forged badge component — safe for this pass
export function ForgedBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border font-mono font-bold uppercase tracking-[0.12em]"
      style={{
        background: "var(--gf-charcoal-brown)",
        color: "#E8C781",
        borderColor: "var(--gf-brass-deep)",
        boxShadow: "inset 0 1px 0 color-mix(in oklch, var(--brass-300) 65%, transparent)",
        fontSize: size === "sm" ? "10.5px" : "12px",
        padding: size === "sm" ? "4px 10px" : "5px 14px",
      }}
    >
      <span style={{ color: "var(--gf-brass)" }}>✦</span>
      Forged
    </span>
  );
}
// Note: ✦ is the ONLY star glyph used — no emoji, no ★, no ⭐
```

---

## Part 5 — What to Defer (do NOT install in this pass)

| Area | Why deferred |
|---|---|
| Guide editor page layout | Risk of breaking AI builder logic |
| Network/asset card full redesign | Scope too broad; separate pass |
| Builder form inputs | Needs form library audit first |
| Governance panel | Not enough design context from current system |
| Review surfaces | Complex state interactions; design first |
| Dark mode | Token system is light-only for now; dark mapping TBD |
| Font file installation | Geist/Geist Mono vs. Fraunces/Inter not yet resolved; use Next.js existing font setup |
| Photography / imagery | No production photos exist; constellation placeholders are correct for now |
| Final logo SVG | Brand team has not delivered final production SVG |
| Final Forged badge SVG | Same as above — use raster references only, clearly tagged `TODO` |
| `gf-page` forced on all pages | Utility class exists; adopt page-by-page to avoid regressions |

---

## Part 6 — File-by-File Implementation Plan

### `app/globals.css`

**Action:** Merge the `:root` token block from Part 1 into the existing globals.  
**Rule:** If the file already has `--background`, compare the existing value to the one in Part 1. The Part 1 value wins — it is the canonical source. Remove any pink or blush values (oklch chroma high on hue ~340–20 = pink; that is wrong).

```
1. Paste the full :root block from Part 1 above the existing rules
2. Add the surface utilities from Part 3 in a clearly marked section
3. Add a font import for Fraunces + Inter + JetBrains Mono IF the project does
   not already load them via next/font. If it does, add a comment pointing to
   the layout file where fonts are loaded.
4. Add: body { font-family: var(--font-sans); color: var(--foreground); }
5. Search and destroy any pink values. Run:
   grep -r "oklch.*0\.[3-9].*[345][0-9]\b" app/globals.css
   and investigate any result with hue in the 340–20 range and chroma > 0.05.
```

---

### `tailwind.config.ts` (or Tailwind v4 `@theme`)

**Action:** Add the token mappings from Part 2.  
**Detect version first:**
```bash
# v4: look for @import "tailwindcss" in globals.css or postcss.config
# v3: look for tailwind.config.ts / tailwind.config.js
grep -r "@import \"tailwindcss\"" app/
```

- **v4:** Add the `@theme` block from Part 2 into `app/globals.css` after the `:root` block  
- **v3:** Merge the JS config object from Part 2 into `tailwind.config.ts` — merge into `theme.extend`, do not replace the whole config

---

### `components/guideforge/site-header.tsx`

**Action:** Token swap only. Do not change DOM structure or routing logic.

```
1. Replace any hardcoded color hex/rgb values with the CSS vars from Part 4.1
2. Ensure the brass accent rail (1px gradient) is present as ::before
   or as a literal <div className="gf-brass-divider" />
3. Verify the forge seal uses .gf-forge-seal on a 32–34px div
   with the GuideMark SVG centered inside
4. Set the "Forge" part of the wordmark to color: var(--gf-copper)
5. Verify backdrop-filter: blur(10px) is on the sticky container
6. Single copper CTA button only — audit for any secondary copper buttons
```

---

### `components/guideforge/shared/status-badge.tsx`

**Action:** Full color table replacement. The status → color mapping is the whole point.

```
1. Delete any existing color hardcodes for status states
2. Implement the lifecycleConfig table from Part 4.2
3. Implement the verificationConfig table from Part 4.2
4. Use inline styles for bg/text/border (the values use color-mix which
   Tailwind arbitrary values don't handle cleanly without CSS vars)
5. Add the ForgedBadge variant using the spec in Part 4.8
6. Confirm the ✦ prefix is present on Forged badges (not an emoji, not ★)
7. Confirm Deprecated status has text-decoration: line-through
```

---

### `components/guideforge/public/guide-card.tsx`

**Action:** Apply foundry card pattern. No structural change to card data or routing.

```
1. Apply the foundry card CSS from Part 4.4 to the card container
2. Apply the thumbnail treatment (dark gradient + optional constellation SVG)
3. Apply the overline mono treatment to the category/meta line
4. Apply .guide-card-title (font-serif, 18px, weight 700) to the title
5. Apply .guide-card-desc (13px, line-height 1.5, color var(--fg-3)) to the excerpt
6. Apply difficulty pill and Forged pill from Part 4.4
7. Test hover lift (translateY(-1px)) is working
```

---

### `components/guideforge/builder/network-dashboard-tabs.tsx`

**Action:** Tab underline → copper. Count badge → brass-tinted.

```
1. Locate the active tab indicator — change its color to var(--gf-copper)
2. Locate the count badge component/element
   - Change background to: color-mix(in oklch, var(--brass-100) 60%, var(--card))
   - Change border to: color-mix(in oklch, var(--brass-500) 20%, var(--border))
   - Change font to: var(--font-mono), 10px
3. Tab strip bottom border: color-mix(in oklch, var(--brass-500) 18%, var(--border))
4. No layout changes. No changes to tab content, routing, or data.
```

---

### `docs/GUIDEFORGE_DESIGN_SYSTEM_IMPLEMENTATION.md`

**Action:** Create this file with the following contents after completing the above tasks:

```markdown
# GuideForge Design System — Implementation Log

## Pass 1 — Foundation tokens + scoped components

### Status
[DATE] — Pass 1 complete.

### Tokens added
All tokens from the GuideForge Design System source project.
See `app/globals.css` for the full :root block.

Key semantic tokens:
- --gf-parchment (#F6F1E8) — page background
- --gf-soft-ivory (#FBF8F3) — card surfaces
- --gf-graphite (#1F1A17) — primary foreground
- --gf-charcoal-brown (#2B2521) — dark surfaces, Forged
- --gf-muted-slate (#6B6255) — secondary text
- --gf-copper (#B86A3B) — primary CTA
- --gf-copper-deep (#8C4F2A) — copper hover
- --gf-ember (#D9782F) — highlight / hover glow
- --gf-brass (#C7A15A) — dividers, badges
- --gf-brass-deep (#8A6F3A) — engraved brass on dark
- --gf-teal (#2F8A87) — Ready / verified
- --gf-steel-blue (#35546B) — In Review
- --gf-amber (#B47A2A) — Draft
- --gf-rust (#B0432A) — destructive / error
- --brass-[50/100/300/500/700/900] — full scale
- --shadow-forge — signature brass-top card shadow

### Surface utilities added (opt-in)
- .gf-page — parchment background with brass radials
- .gf-card — foundry card (ivory, brass border, forge shadow)
- .gf-card-forge — dark graphite card for premium contexts
- .gf-section-card — builder/public panel card
- .gf-brass-divider — horizontal brass fade rule
- .gf-overline — mono uppercase tracking label
- .gf-eyebrow — copper uppercase eyebrow
- .gf-muted — muted body text
- .gf-forged-surface — dark sidebar/nav surface
- .gf-forge-seal — coined-gradient brass icon well
- .gf-brass-rail::before — 1px brass top accent on headers

### Components updated in Pass 1
1. components/guideforge/site-header.tsx — token swap, brass rail, forge seal
2. components/guideforge/shared/status-badge.tsx — full color table
3. components/guideforge/public/guide-card.tsx — foundry card pattern
4. components/guideforge/builder/network-dashboard-tabs.tsx — copper underline, brass count pill

### How to use surfaces

Opt in to a surface by adding its class. Do not force every page.

\`\`\`tsx
// Page wrapper
<main className="gf-page"> … </main>

// Standard card
<article className="gf-card p-5"> … </article>

// Forged / admin card
<div className="gf-card-forge p-5"> … </div>

// Section / panel card
<section className="gf-section-card"> … </section>

// Brass divider
<hr className="gf-brass-divider my-6" />
\`\`\`

### ⚠️ Pending — must address in later passes

1. **Final SVG logo** — `guideforge-logo-lockup.png`, `guideforge-icon-mark.png`
   are raster placeholder crops only. Production SVG assets are needed from
   the brand team before the forge seal or any logo placement is considered final.

2. **Final Forged badge SVG** — `forged-badge-main.png` and `forged-badge-icon.png`
   are raster references. The ForgedBadge component in Pass 1 uses a CSS pill.
   Final hex-shield SVG must come from brand team.

3. **Page background adoption** — .gf-page utility is available but not forced.
   Apply page-by-page starting with the marketing landing and builder dashboard.

4. **Dark mode mapping** — tokens are light-mode only. Dark mode requires a
   separate :root[data-theme="dark"] mapping pass.

5. **Font resolution** — design system uses Fraunces / Inter / JetBrains Mono.
   Current codebase uses Geist / Geist Mono. Resolve before applying
   font-family tokens broadly. Do not break existing font loading.

6. **Guide editor, governance panel, review surfaces** — deferred. Needs
   dedicated design pass before token application.

7. **Builder forms / inputs** — deferred pending form library audit.

8. **Network card, asset card, draft list** — deferred. Too broad for Pass 1.

### Visual test checklist (after Pass 1)

- [ ] Page background is parchment/cream (#F6F1E8 region) — NOT pink or blush
- [ ] Site header has 1px brass gradient top rail visible
- [ ] Site header has frosted-glass parchment backdrop (not solid white)
- [ ] "Forge" in wordmark is copper (#B86A3B) — not blue, not black
- [ ] Active nav tab has copper underline bar (not blue)
- [ ] Draft badge: warm amber-gold tones, NOT generic grey
- [ ] In Review badge: steel blue tones, NOT generic blue
- [ ] Ready badge: muted teal tones, NOT generic green
- [ ] Published badge: green tones ✓
- [ ] Needs Update badge: rust-red tones, NOT generic orange
- [ ] Forged badge: dark charcoal background + warm brass text + ✦ prefix
- [ ] Guide card: ivory background with brass top inset shadow (forge shadow)
- [ ] Guide card hover: lifts 1px, border saturates to deeper brass
- [ ] Dashboard tab count pills: brass-tinted, not neutral grey
- [ ] No generic SaaS blue (#3B82F6 or similar) used for primary actions
- [ ] No pink (#FDA4AF or similar) appearing anywhere as a surface or background
- [ ] Forge seal (logo icon well) renders as coined brass gradient — not flat color
```

---

## Part 7 — Implementation verification

After applying all changes, run through this checklist manually before merging:

```bash
# Search for accidental pink values
grep -rn "pink\|rose\|blush\|#FD[A-F]\|oklch.*34[0-9]\b" app/ components/ --include="*.css" --include="*.tsx"

# Search for generic SaaS blue on primary actions
grep -rn "#3B82F6\|#2563EB\|blue-500\|blue-600" components/guideforge/ --include="*.tsx"

# Search for hardcoded colors that should be tokens
grep -rn "#[0-9A-Fa-f]\{6\}" components/guideforge/shared/status-badge.tsx

# Verify token names are correct (no typos)
grep -rn "var(--gf-" components/guideforge/ --include="*.tsx" | grep -v "parchment\|soft-ivory\|graphite\|charcoal-brown\|muted-slate\|copper\|copper-deep\|ember\|brass\|brass-deep\|teal\|steel-blue\|amber\|rust"
```

---

*End of handoff bundle. Source of truth: GuideForge Design System project. Re-read `colors_and_type.css` and `ui_kits/builder/builder.css` for any pattern not covered here.*
