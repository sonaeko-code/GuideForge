# GuideForge Design System

> **GuideForge** is a platform that helps teams build, organize, govern, and scale
> trusted knowledge guides. The aesthetic is refined and editorial: parchment,
> copper, brass, with constellation/wayfinding accents — a "structured knowledge
> foundry" feel.

**Tagline:** Build. Organize. Govern. Scale.
**Voice keywords:** Structured · Crafted · Trustworthy · Intelligent · Governed · Scalable

---

## Sources used to build this system

- **GitHub:** [`sonaeko-code/GuideForge`](https://github.com/sonaeko-code/GuideForge)
  — production Next.js + Tailwind v4 codebase. The colour tokens, surface utilities,
  shadcn/ui components (new-york style, neutral base, Lucide icons), and landing /
  builder / public-network screens were lifted directly. Re-read it any time
  you need pixel-exact reference for a screen this kit doesn't cover.
- **Brand sheet:** `uploads/GuideForged.png` — final wordmark, icon mark, app icon,
  favicon, palette, and badge directions. **Do not redraw.** Cropped versions live
  in `assets/`.
- **Forged badge:** `uploads/ForgedBadge.png` — the verified-status trust mark.
  Same rule: use the real artwork, don't reinterpret it.

---

## What products are represented

The codebase ships three surfaces. Each has its own UI kit:

1. **Marketing site** — public landing at `/` (hero, what it builds, how it works,
   example networks, trust, CTA). Recreated in `ui_kits/marketing/`.
2. **Builder workspace** — signed-in dashboard at `/builder/*` where authors create
   networks, hubs, collections, and guides. Recreated in `ui_kits/builder/`.
3. **Public guide reader** — hosted, branded network sites at `/n/<slug>` (the
   live example is QuestLine). Recreated in `ui_kits/public-network/`.

The core taxonomy across all three: **Network → Hub → Collection → Guide → Step**.

---

## CONTENT FUNDAMENTALS

**Voice.** Refined, expert, calm, confident. Never breezy, never playful, never
sloganeering. The product talks like an editorial team that takes craft seriously.

**Person.** Mostly second person ("You don't design a site. You compose a guide
world.") with occasional first-person plural for editorial dispatches ("Hubs we
are covering this month"). Avoid "we" for product features.

**Casing.**
- **Sentence case** for headings, button labels, nav, eyebrows.
- **Title Case** is reserved for proper nouns: GuideForge, QuestLine, Emberfall,
  Forge Rules, Forged.
- **UPPERCASE + wide tracking** (0.18–0.20em) for mono eyebrows ("ISSUE NO. 04",
  "FEATURED", "FORGED GUIDES") and badge labels ("FORGED", "PUBLIC NETWORK").

**Capitalisation of named concepts.** Always capitalise the GuideForge
primitives when used as nouns: **Network**, **Hub**, **Collection**, **Guide**,
**Step**, **Forge Rules**, **Forged**.

**Tone moves we use.**
- **Editorial framing:** "Issue No. 04 — May 15", "Reviewed by veterans," "From
  the editors' desk."
- **Verbed craft language:** *forge, forged, structured, governed, vetted,
  stamped, opinionated, crafted.* The word **forge** does heavy lifting; reach
  for synonyms when you've used it twice on the same screen.
- **Definite, not hedged:** "Drafts are clearly marked." not "Drafts may be
  clearly marked."

**Tone moves we avoid.**
- AI-buzzword soup: "unleash," "supercharge," "leverage," "revolutionise."
- Empty stakes: "Bring your ideas to life," "Anything is possible."
- Emoji. Never. The constellation glyphs and Lucide icons carry visual flavour.
- Em-dash overuse, exclamation marks, ALL CAPS HEADLINES.

**Concrete examples from the product.**
- Hero H1: *Forge structured guides from rough ideas.*
- Hero lede: *GuideForge helps you turn messy notes, workflows, tutorials, and
  plans into organized guides, checklists, and knowledge networks — ready to
  edit, reuse, and grow.*
- Section eyebrow: *WHAT GUIDEFORGE CREATES*
- Trust copy: *Forged is reserved for the highest-trust guides — fully vetted
  and stamped.*
- Masthead: *Editorial guides, patch coverage, and build theory for the games
  you actually play. Forged by writers, reviewed by veterans, structured for
  the moment you need them.*
- Taglines (rotate, never combine):
  - Build. Organize. Govern. Scale.
  - From rough ideas to trusted knowledge.
  - Forged for clarity. Built to scale.

---

## VISUAL FOUNDATIONS

### Surfaces
Three core surface tones, used deliberately:

| Surface     | Token        | Use                                                  |
| ----------- | ------------ | ---------------------------------------------------- |
| Parchment   | `#F6F1E8`    | Page background. Always carries a faint warm radial. |
| Soft Ivory  | `#FBF8F3`    | Cards, panels, popovers — one step lifted.           |
| Graphite    | `#1F1A17`    | Selectively dark: dark sidebar, Forged plate, hero accents. |
| Charcoal-brown | `#2B2521` | Dark nav, second-layer dark.                         |

Page backgrounds **always** have a subtle warm-brass radial in the upper-left
and lower-right corners (`surface-parchment` in `app/globals.css`). Never flat
beige — the radial is what makes it feel like real parchment.

### Colours
- **Primary accent:** Copper `#B86A3B` (OKLCH `0.555 0.115 42`). Single-CTA
  discipline — one copper button per viewport.
- **Highlight:** Ember `#D9782F` for the zap/spark accents and link hover.
- **Badge gold:** Brass `#C7A15A` for dividers, seals, verified pills, and
  forged accents on graphite.
- **Status:** Muted teal `#2F8A87` (verified/success), steel blue `#35546B`
  (in-review/info), amber-warm `#B47A2A` (draft), rust `#B0432A` (destructive).
- A **single warm copper-brass scale** runs from `brass-50` (cream-warm) through
  `brass-500` (the accent) to `brass-900` (forged graphite). Use that scale —
  never invent stand-alone warm browns.

### Typography
- **Display & headings:** **Fraunces** (Source Serif Pro is the closest fallback).
  Editorial, refined, with negative tracking (-2 to -3%) at display sizes. Italic
  is used sparingly for emotional emphasis ("from rough ideas").
- **Body & UI:** **Inter** (the codebase uses Geist; Inter is the design-system
  fallback). 14–16px, line-height 1.5–1.65.
- **Mono & labels:** **JetBrains Mono** (codebase uses Geist Mono). Wide
  tracking (0.15–0.20em), UPPERCASE for eyebrows, dates, versions, breadcrumb
  taxonomy.

> ⚠️ **Font substitutions in this system.** The codebase ships with Geist and
> Geist Mono via `next/font/google`. This system uses **Fraunces / Inter /
> JetBrains Mono** as the closest Google-Fonts-available editorial pairing
> (Fraunces matches the wordmark feel far better than Geist). If you have the
> original Geist/Geist Mono files or a different display serif preference,
> drop them in `fonts/` and update `colors_and_type.css`.

### Spacing & rhythm
- 4-pt base scale. Default gutter `24px`, section padding `80–96px`, hero
  padding `88–96px`. Cards use `20–24px` internal padding.

### Radii
- `6px` inputs · `8px` buttons · `10–12px` cards · `16px` hero / CTA wells ·
  `999px` pills.

### Borders & dividers
- 1px borders use `color-mix(in oklch, var(--brass-500) 18%, var(--border))` —
  not pure neutral grey. The hint of warmth is the whole point.
- **Brass divider rule:** horizontal hairline that fades to transparent at both
  ends. Sits on top of mastheads and at section seams.

### Shadows
- `sm` `0 1px 2px rgba(0,0,0,.05)`
- `card` `0 4px 12px rgba(0,0,0,.08)`
- `lg` `0 8px 24px rgba(0,0,0,.12)`
- **Signature `shadow-forge`:** `inset 0 2px 0 0 brass-500/60` plus a soft warm
  drop — the "premium card" treatment. Used on the foundry card and seal.

### Cards
The "foundry card" pattern: ivory background, subtle warm gradient top→bottom,
1px warm-brass border, signature forge shadow (insetting a brass top edge).
Hover lifts 1px and saturates the brass edge. See
`preview/components-guide-card.html`.

### The Forge Seal
Logos/marks rendered on a coined-gradient brass square — three radial gradients
plus inset highlight/shadow to simulate a stamped metal coin. Always paired
with the GuideMark glyph centred. Source the recipe from
`.forge-seal` in `colors_and_type.css`.

### Backgrounds & motifs
- **Parchment grid:** faint 32×32 grid lines at ~5% alpha, masked with a radial
  fade. Hero and dashboard headers only.
- **Constellation field:** dotted nodes connected by hairlines. Used in
  illustrations, hub art, the Forged badge background, and never as filler.
- **No photography** in the production codebase — placeholders are tinted
  gradient panels with a constellation overlay. Imagery, when added, should
  be warm and editorial.

### Iconography
**Lucide** is the icon system (set in `components.json`). 1.5px stroke,
16–22px size in UI. The brand glyph (`GuideMark`) is a compass-rose — see
`components/guideforge/brand/guide-mark.tsx`. **Constellation/star** motifs
recur — a dotted node graph with the occasional `✦` accent in copper. Icons
sit in a 36×36 ivory or copper-tinted well at 8px radius. **No emoji.** Unicode
`✦` is the only star glyph we use, and only in copper or brass.

### Motion
- Easing: `cubic-bezier(.2,.7,.2,1)` — out-quart-ish, soft. Durations
  120 / 180 / 280ms.
- Hover: cards lift 1px and saturate their border (brass goes from 18% to 38%
  mix). Links underline expands left→right.
- Press: cards return to 0px. No scale-on-click "bounce."
- No floating, looping, or particle animations. Motion is brief and
  functional.

### Hover & press
- Buttons: primary copper darkens to copper-deep on hover, no transform.
  Ghost buttons add a 50% brass-100 wash.
- Inputs: focus ring `3px` at 18% copper.
- Nav links: animated underline in copper.

### Transparency, blur
- Sticky headers use `backdrop-filter: blur(10px)` over an 80% parchment wash.
- No glassmorphism beyond that. No translucent cards.

### Layout rules
- Max content width `1180px`, gutters `24px`.
- Page sections separated by 1px brass-tinted borders, never large blank gaps.
- Sticky network/site header carries a 1px brass-gradient top accent rail.

---

## ICONOGRAPHY

- **Library:** **Lucide** (icons set in `components.json`, configured via
  `iconLibrary: "lucide"`). 1.5px stroke weight, default size 16–22px.
  Use the CDN at `https://unpkg.com/lucide-static@latest/icons/<name>.svg` when
  a static SVG is needed; otherwise re-implement inline (see
  `ui_kits/marketing/Icons.jsx` for an inline-SVG starter pack).
- **Brand glyph:** the GuideMark compass-rose (`assets/guideforge-icon-mark.png`,
  with an inline-SVG version in `Icons.jsx` as `<GuideMark />`). This is the
  *only* mark used inside the forge-seal container.
- **Anvil + constellation:** the production wordmark glyph
  (`assets/guideforge-icon-mark.png`) — a stylised anvil under a constellation.
  Treated as final artwork: **never redraw it**. Use the image directly.
- **Forged badge:** `assets/forged-badge-main.png` (hex shield) and
  `assets/forged-badge-icon.png` (round icon-only). Apply at small sizes near
  guide titles when verification = "forged"; do not recreate.
- **Star accents:** the Unicode `✦` glyph in copper or brass — used in
  mastheads, the Forged ribbon, and section eyebrows. Never used in body copy.
- **No emoji.** The brand is too refined.
- **No raster PNG icons** in UI besides the brand artwork. All in-app icons
  are SVG (Lucide).

---

## INDEX — files in this system

```
README.md                          ← you are here
SKILL.md                           ← cross-compatible Agent Skill definition
colors_and_type.css                ← all CSS vars, type classes, surface utils
assets/
  guideforge-logo-lockup.png       ← primary wordmark + glyph (final art)
  guideforge-icon-mark.png         ← anvil/constellation mark
  guideforge-app-icon.png          ← dark rounded-square app icon
  guideforge-favicon.png           ← small mark
  guideforge-wordmark.png          ← wordmark only
  forged-badge-main.png            ← Forged Verified hex badge (final art)
  forged-badge-icon.png            ← Forged icon-only round badge
  ForgedBadge.png                  ← original full brand sheet (badge variants)
  GuideForge-brand-sheet.png       ← original full brand sheet (logo system)
preview/                           ← cards that populate the Design System tab
  brand-*.html
  colors-*.html
  type-*.html
  spacing-*.html
  components-*.html
ui_kits/
  marketing/                       ← landing page recreation
  builder/                         ← signed-in workspace dashboard
  public-network/                  ← QuestLine-style hosted reader
fonts/                             ← (empty — see substitution note above)
```

---

## Caveats & open notes

- **Fonts** — Geist substituted with Inter/Fraunces (closest Google-Fonts
  pairing). Drop real font files in `fonts/` if you have them.
- **Icons** — the marketing/builder kits inline a small Lucide subset rather
  than load the full Lucide bundle. Replace with the real `lucide-react`
  imports when porting to production.
- **Imagery** — there is no production photography. Constellation gradients are
  the placeholder system. If real imagery arrives, log it as a foundation
  update.

Re-read the GitHub repo for any screen this kit doesn't cover — especially the
guide editor, governance panel, and review surfaces in `components/guideforge/builder/`.
