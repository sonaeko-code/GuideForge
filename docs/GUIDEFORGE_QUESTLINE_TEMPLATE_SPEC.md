# QuestLine Template Spec

> Defines the demo / productized gaming network template powered by GuideForge.
> Used as the reference shape when a user says *"Build me a QuestLine-style site."*

---

## Purpose

QuestLine is a **GuideForge-powered gaming network / site template**.

It is:
- a demonstration of what GuideForge can produce end-to-end
- a reusable template a user can pick at network-creation time
- a public reading surface (`/n/[networkSlug]`) styled for gaming editorial content

It is **not**:
- a hardcoded one-off page
- the only public surface GuideForge will ever support
- a substitute for individual game-specific theming (Emberfall, etc. stay separate — see `PHASE1_QUESTLINE_ANALYSIS.md`)

---

## Network Structure

### Suggested hubs

| Hub | Purpose |
|-----|---------|
| Builds & Loadouts | Class / character builds, gear loadouts |
| Bosses & Encounters | Boss strategy, mechanics breakdowns, encounter prep |
| Patch Notes | Version updates, balance changes, dev commentary |
| Beginner Guides | First-hour tutorials, onboarding paths |
| Items & Farming | Resource priorities, farming routes, drop tables |
| PvP / Competitive | Ladder strategies, matchup guides, meta reads |
| Community Highlights | Featured creators, fan content, community moments |

### Collections (examples)

| Collection | Belongs to |
|------------|------------|
| Class Builds | Builds & Loadouts |
| Beginner Builds | Builds & Loadouts |
| Raid Bosses | Bosses & Encounters |
| Dungeon Bosses | Bosses & Encounters |
| Patch Summaries | Patch Notes |
| Balance Changes | Patch Notes |
| Leveling Basics | Beginner Guides |
| Gear & Items | Items & Farming |
| Farming Routes | Items & Farming |
| PvP Basics | PvP / Competitive |

The scaffold can include a subset depending on the prompt
(e.g. an MMO emits all seven hubs; a single-player RPG drops PvP).

---

## Starter Guide Examples

Suggested starter guides to seed each collection (proposal-only — user reviews and confirms):

- **Beginner-Friendly Build Starter Guide** (Beginner Builds)
- **Endgame Raid Build Checklist** (Class Builds)
- **Boss Mechanics Quick Reference** (Raid Bosses)
- **Patch Summary & Player Impact Guide** (Patch Summaries)
- **First-Hour Beginner Roadmap** (Leveling Basics)
- **Gear Priority Guide for Fresh Max-Level Characters** (Gear & Items)

These follow GuideForge's standard guide types (`tutorial`, `walkthrough`, `boss-guide`, `character-build`, `patch-notes`, `beginner-guide`).

---

## Public Site Needs

The public QuestLine surface should support:

- **Game landing page** — network masthead with editorial framing
- **Hub pages** — game-specific or topic-specific, with the QuestLine layout
- **Guide cards** — published guides with forged badges, verification states
- **Featured guides** — pinned content for the network
- **Latest updates** — recent published items / patch notes
- **Beginner path** — onboarding entry point linking the *Beginner Guides* hub
- **Public / private visibility rules** — drafts and pending content never leak
- **Verified / forged badges** — wired to existing `VerificationStatus`

The QuestLine layout is shipped under `/n/questline` as the canonical reference.
Game-specific bespoke pages (e.g. `/n/questline/emberfall`) are documented in
`PHASE1_QUESTLINE_ANALYSIS.md` and intentionally kept separate from the generic template.

---

## Future Additions

When QuestLine grows past the demo template, expected lanes are:

- **News / editorial posts** — short-form pieces alongside structured guides
- **Community submissions** — opt-in user-contributed guides
- **Creator profiles** — featured guide author bios
- **Ratings / reactions** — community signal on published guides
- **Moderation** — beyond Forge Rules, comment / submission moderation
- **Game-specific templates** — per-game theming on top of the QuestLine shell

Each of these is a separate roadmap lane (Step 9 in `GUIDEFORGE_PRODUCT_ROADMAP.md`),
not an implicit feature of the template.

---

## Boundaries

- The QuestLine template is the **template**, not the live demo data.
  Existing QuestLine pages (Issue No. 04, Emberfall, etc.) are hardcoded editorial content
  per `PHASE1_QUESTLINE_ANALYSIS.md` and are not part of the reusable template.
- Networks created from this template should not silently inherit QuestLine's editorial voice.
- No template applies starter guides automatically — every starter guide is a proposal until the user confirms.

---

## Related docs

- `GUIDEFORGE_PRODUCT_ROADMAP.md` — productized templates lane (Step 9)
- `GUIDEFORGE_AI_BUILDER_CORE.md` — scaffold builder kind and request shape
- `PHASE1_QUESTLINE_ANALYSIS.md` — which parts of QuestLine are hardcoded vs reusable (existing)
- `GUIDEFORGE_NETWORK_SURFACE_RULES.md` — public surface visibility rules
