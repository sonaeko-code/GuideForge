# GuideForge Brand Reference

> **Tagline:** Build. Organize. Govern. Scale.

---

## Brand Keywords

| Keyword | What it means in the UI |
|---|---|
| **Structured** | Clear hierarchy, deliberate layouts, never chaotic |
| **Crafted** | Premium surfaces, refined details, earned weight |
| **Trustworthy** | Consistent, reliable, no surprise behaviors |
| **Intelligent** | AI features feel purposeful, not flashy |
| **Governed** | Process-aware; review/approval flows feel formal |
| **Scalable** | Works at 1 guide and at 10,000 |

---

## Color Palette

### Named Brand Palette

| Token | Hex | oklch | Role |
|---|---|---|---|
| `parchment` | `#F6F1E8` | `oklch(0.952 0.013 85)` | Page backgrounds, hero surfaces |
| `soft-ivory` | `#FBF8F3` | `oklch(0.977 0.008 88)` | Card backgrounds, elevated surfaces |
| `graphite` | `#1F1A17` | `oklch(0.125 0.012 55)` | Primary text, dark headings |
| `charcoal` | `#2B2521` | `oklch(0.165 0.012 55)` | Dark-mode background, graphite panels |
| `copper` | `#B86A3B` | `oklch(0.555 0.115 42)` | Primary actions, CTAs, brand accent |
| `ember` | `#D9782F` | `oklch(0.650 0.165 50)` | Hover states, warm highlights, alerts |
| `brass` | `#C7A15A` | `oklch(0.695 0.085 72)` | Decorative accents, dividers, premium UI |
| `teal` | `#2F8A87` | `oklch(0.550 0.090 185)` | Success states, verified badges, insights |
| `steel-blue` | `#35546B` | `oklch(0.370 0.050 225)` | Information states, secondary actions |
| `muted-slate` | `#6B255A` | `oklch(0.280 0.120 330)` | Governance, admin-tier labels, authority |

### Functional Semantic Mapping

| Semantic Role | Color | Use |
|---|---|---|
| **Primary / Action** | Copper `#B86A3B` | Buttons, links, active nav items |
| **Primary Hover** | Ember `#D9782F` | Button hover, interactive highlights |
| **Accent / Premium** | Brass `#C7A15A` | Card top edges, dividers, forge seals |
| **Background** | Parchment `#F6F1E8` | Page, sidebar, dashboard canvas |
| **Card Surface** | Soft Ivory `#FBF8F3` | Cards, panels, dropdowns |
| **Foreground** | Graphite `#1F1A17` | Body text, labels |
| **Dark Panel** | Charcoal `#2B2521` | Graphite panels, dark mode surface |
| **Status: Verified / Published** | Teal `#2F8A87` | Published badges, verified count cards |
| **Status: In Review** | Steel Blue `#35546B` | Pending review badges, review queue |
| **Status: Draft** | Brass `#C7A15A` + Parchment | Draft pills, warm neutral |
| **Status: Governance / Admin** | Muted Slate `#6B255A` | Governance badges, admin controls |
| **Destructive** | Warm red `oklch(0.55 0.2 25)` | Delete, error states |

### Dark Mode Shift

Dark mode inverts background/surface but keeps the copper/brass accent family. Graphite `#1F1A17` becomes the page background; Soft Ivory text reads on top. Status colors lighten (~20% L increase) to maintain contrast ratios.

---

## Typography

### Heading / Logo — Serif

Use a **traditional serif** (e.g., Playfair Display, Lora, or a foundry-style slab) for:
- The GuideForge wordmark
- H1 dashboard titles and network names
- Masthead / hero headlines
- Guide titles in published/public views

The serif conveys **craft, authority, and permanence** — consistent with the "foundry" metaphor.

### UI — Sans-serif (Geist)

Currently using **Geist** (sans) and **Geist Mono** (mono). Use for:
- All navigation labels, tabs, badge text
- Body copy inside guides
- Form labels, inputs, metadata
- Button text and helper text

Geist's geometric neutrality pairs well with the warmth of the copper/parchment palette without competing with it.

### Size Scale (Recommended)

| Role | Size | Weight |
|---|---|---|
| Page title / H1 | 24–32px | Semibold (serif if available) |
| Section heading / H2 | 18–20px | Semibold |
| Card title | 15–16px | Semibold |
| Body | 14px | Regular |
| Label / Meta | 12–13px | Regular or Medium |
| Badge / Pill | 11–12px | Medium or Semibold |

---

## Voice & Tone

GuideForge communicates as a **senior editor** — confident, direct, never chatty. Think: a well-produced style guide, not a startup landing page.

| Principle | Good | Avoid |
|---|---|---|
| **Precise over casual** | "Submit for review" | "Send it off!" |
| **Purposeful AI** | "Generate a draft guide" | "Let AI do the magic ✨" |
| **Process-respecting** | "This guide is pending review" | "Hang tight while we check things out" |
| **Calm authority** | "No guides in this collection yet." | "Looks like it's empty here!" |
| **Action-first labels** | "Create Hub", "New Guide" | "Get started by creating a hub" |

Empty states should be **informative and enabling**, not apologetic. Error messages should be **specific**, not vague ("Unable to delete hub" not "Something went wrong").

---

## Logo, Icon & Badge Usage

### GuideForge Mark

- The mark is a **coined/embossed seal** — use the `.forge-seal` utility class for logo containers
- Always render on Parchment, Soft Ivory, or Charcoal backgrounds — never on saturated color
- Minimum clear space: equal to the mark's height on all sides
- Do not tint, rotate, or apply drop shadows to the wordmark itself

### Asset Type Badges

Each asset type maps to a specific icon and badge color:

| Type | Icon (Lucide) | Badge Color |
|---|---|---|
| Guide (how-to) | `BookOpen` | Copper/Brass |
| Checklist | `CheckSquare` | Teal |
| Recipe | `ChefHat` | Ember |
| SOP | `ClipboardList` | Steel Blue |
| Network | `Network` | Graphite/Charcoal |

### Status Badges

| Status | Color | Border |
|---|---|---|
| Draft | Brass/Amber warm | Brass border |
| Pending Review | Steel Blue | Steel Blue border |
| Published / Verified | Teal | Teal border |
| Archived | Muted Slate | Slate border |
| Governance | Muted Slate | Slate border |

### The "Forged" Badge

The **Forged** badge (`forged-badge.tsx`) marks AI-generated content that has passed review. It should use the brass accent gradient — this is a premium mark and should not be used on unreviewed content.

---

## Surface System (Existing Utilities)

These utility classes exist in `app/globals.css` and should be used consistently:

| Class | Description | Use on |
|---|---|---|
| `.surface-parchment` | Warm cream with radial brass glow | Page backgrounds, hero sections |
| `.surface-masthead` | Brass-gradient card with border | Dashboard headers, network mastheads |
| `.surface-ivory` | Elevated ivory card with brass tint | Premium content cards |
| `.surface-graphite` | Dark panel with copper radial | Stat callouts, dark mode panels |
| `.card-foundry` | Ivory + copper top edge + forge shadow | Primary data cards |
| `.forge-seal` | Coined metallic gradient | Logo/mark containers |
| `.divider-brass` | Gradient hairline divider | Section breaks |
| `.bg-parchment-grid` | Subtle 32px gridlines | Hero/dashboard canvas |
| `.bg-parchment-dots` | 18px dot array | Empty state backgrounds |
| `.bg-constellation` | Brass dots + cross-grid | Feature/promo sections |
| `.accent-copper-top` | 2px copper inset shadow at top | Card headers |
| `.pill-warm` | Brass-tinted pill | Ownership labels, warm metadata |
| `.shadow-forge` | Layered brass-warm shadow | Cards, panels |
| `.shadow-forge-lg` | Deeper forge shadow | Modals, elevated cards |

---

## Dashboard Layout Reference (Section 6 of Brand Guide)

The brand guide shows this dashboard structure:

```
┌─────────────────────────────────────────────────────────┐
│  [GF Logo]  GuideForge                          [User]  │
├──────────┬──────────────────────────────────────────────┤
│ Overview │  ┌──────┐ ┌────────┐ ┌──────────┐ ┌───────┐ │
│ Guides   │  │Total │ │Verified│ │ In Review│ │Network│ │
│ Networks │  │Guides│ │        │ │          │ │       │ │
│ Checklis.│  └──────┘ └────────┘ └──────────┘ └───────┘ │
│ Reviews  │                                              │
│ Insights │  Guides ─────────────────────────────────── │
│ Governan.│  [table rows...]                            │
│ Settings │                                              │
└──────────┴──────────────────────────────────────────────┘
```

**Current state:** The builder uses a tab-based dashboard (`network-dashboard-tabs.tsx`) with Drafts / Pending Review / Published / Guides / Hubs / Collections tabs — functional but architecturally different from the brand guide's persistent sidebar + stat cards pattern.

See the implementation plan for how to close this gap progressively.
