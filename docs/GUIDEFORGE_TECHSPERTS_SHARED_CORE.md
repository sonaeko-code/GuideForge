# GuideForge ↔ Techsperts Shared Core

> Defines the engine concepts shared between GuideForge and Techsperts.
> **This is a planning and architecture document.** No code changes or schema changes
> belong here.
>
> Pair with `PLATFORM_MONOREPO_PLAN.md` (platform structure),
> `SHARED_ENGINE_VOCABULARY_MAP.md` (terminology), and
> `GUIDEFORGE_TECHSPERTS_ADAPTER_SPEC.md` (adapter lane details).

---

## 1. Core Idea

GuideForge and Techsperts are different products with different surfaces, different user
journeys, and different product language. But they should operate from the same shared
engine concepts.

**GuideForge** is the structured knowledge builder. It turns prompts into governed guide
networks. Its users are creators, teams, and anyone building a structured knowledge base.

**Techsperts** is the tech repair / support experience. It routes users from symptom to
diagnosis to verified fix. Its users are people with broken devices, and the technicians
who service them.

Both products need:

- **intake** — accept a rough starting point (prompt, symptom, request) and route it
- **routing** — determine which asset type, domain, and workflow applies
- **structured outputs** — produce guides, checklists, SOPs, or troubleshooting flows
- **AI assistance** — generate provisional drafts that are clearly marked as unverified
- **review / governance** — trusted content has been reviewed and verified against the
  domain standard
- **trust status** — every asset has a clear status: draft, provisional, in review,
  published/verified/forged, deprecated, discarded
- **public / private visibility** — only trusted content reaches public surfaces
- **reusable knowledge** — once created and verified, assets can be reused and referenced

---

## 2. Shared Engine Concepts

These are the neutral core concepts that both products implement under their own labels:

| Concept | Description |
|---------|-------------|
| **Intake Router** | Accepts a rough starting point and routes it to the correct asset type, builder kind, and domain |
| **Domain Profile** | The shape/template associated with a knowledge domain (gaming, tech repair, SOP, home, etc.) |
| **Structured Asset** | Any output that has been given a schema: guide, checklist, SOP, troubleshooting flow |
| **Guide** | A step-by-step walkthrough asset; the primary structured asset type |
| **Checklist** | A multi-step confirmation or procedure asset |
| **SOP** | Standard Operating Procedure; a formal process asset with owner, trigger, and quality check |
| **Troubleshooting Flow** | A symptom-first, diagnosis-then-fix asset; primary in Techsperts |
| **Network / Knowledge Domain** | Top-level organizer; a named collection of hubs on a shared topic |
| **Hub / Problem Area** | Mid-level organizer; a named cluster of collections within a domain |
| **Collection / Issue Cluster** | Low-level organizer; holds related assets within a hub |
| **Review Lifecycle** | The governed path from draft to reviewed to approved/published |
| **Verification Lifecycle** | The path from provisional to trusted; requires a defined reviewer role |
| **AI Draft** | A provisional output from an AI generation call; always unverified until reviewed |
| **Provisional Output** | Any output (AI or otherwise) that has not yet passed the required review standard |
| **Published / Public Output** | A trusted asset that has passed review and is visible on the public surface |
| **Private Draft** | An asset not yet visible on the public surface; pending review or not yet submitted |
| **Trust Badge** | A visual status indicator showing the asset's trust level (draft, verified, forged, etc.) |
| **Cost-Control / Provider Routing** | The layer that decides which AI provider/model to use and when to prefer a cached verified answer |

---

## 3. Product Mapping Table

| Core Concept | GuideForge Term | Techsperts Term | Notes |
|---|---|---|---|
| Network | Network | Knowledge domain / service category | Top-level organizer for related hubs |
| Hub | Hub | Device family / problem area | Mid-level organizer within a domain |
| Collection | Collection | Issue cluster / workflow group | Holds related assets within a hub |
| Guide | Guide | Solution / Guided Fix | Primary step-by-step asset |
| Checklist | Checklist | Technician checklist / user prep checklist | Multi-step confirmation asset |
| SOP | SOP | Internal support workflow | Formal process with owner, trigger, quality check |
| Troubleshooting Flow | Guided Flow / Troubleshooting Flow | Guided Fix / diagnosis path | Symptom-first, diagnosis-before-fix asset |
| Governance Rule | Forge Rules | Verification standards / safety rules | Domain-level standard for review, safety, AI policy |
| Trust (verified) | Forged | Verified | The product label for trusted content |
| Provisional / unverified | Draft | Provisional / unverified draft | Not yet reviewed or published |
| Review | Review | Staff / council verification | Human review step before publishing |
| Publish | Publish | Make solution active / public | Move from reviewed to visible on public surface |
| Starter Build Queue | Starter Build Queue / Launch Plan | Recommended resolution paths | Ordered suggestions for first assets to build |
| Domain Profile | Network type / template | Device / problem taxonomy | The shape template for a knowledge domain |
| AI-generated draft | AI draft — review before saving | Provisional AI solution | AI output that is always unverified until reviewed |
| Trust badge | Forged badge / status chip | Verified badge / solution status | Visual indicator of asset trust level |
| Network / domain organizer | Network | Service category | Overall knowledge domain grouping |
| Intake | Network builder prompt / intake | Symptom intake / diagnosis form | Entry point; never mutated after submission |
| Public surface | `/n/[networkSlug]` public pages | Verified KB / customer-facing fix pages | Only trusted assets appear here |
| Private surface | Creator workspace / dashboard | Technician workspace / draft solutions | Drafts and provisional content stay here |

---

## 4. What Should Be Shared

These artifacts belong in shared packages and should not be duplicated across codebases:

- **TypeScript types** — core asset shapes, domain profile shapes, governance/status types,
  generation contract types
- **Prompt contracts** — the neutral generation request shape used by all builder kinds
- **Generation schemas** — structured output shapes with validation logic
- **Domain templates** — the scaffold shapes for tech repair, gaming, SOP, home, creator
- **Status mapping helpers** — map between neutral status constants and product labels
- **Review lifecycle concepts** — neutral model for draft → provisional → reviewed → trusted
- **Verification lifecycle concepts** — neutral model for provisional → trusted; label-agnostic
- **Badge / status mappings** — translate neutral status to trust badge label per product
- **AI routing / cost-control patterns** — prefer verified lookup before AI call; provider
  resolution logic; cost-control extension points
- **Neutral governance contracts** — the underlying model for Forge Rules / safety rules
- **Shared docs and assistant rules** — vocabulary maps, monorepo protocol, architecture docs

---

## 5. What Should Stay App-Specific

### GuideForge-specific

These belong in `apps/guideforge` and should not leak into shared packages:

- Forge / Foundry / Forged branding and copy
- Public network UI (`/n/[networkSlug]` layout and components)
- Builder workspace UI (wizard, Starter Pages editor, generator UI)
- Creator onboarding flow
- Networks / hubs / collections product language
- Forge Rules wizard step
- Session-only Starter Build Queue and sessionStorage patterns
- QuestLine template editorial content

### Techsperts-specific

These belong in `apps/techsperts` and should not leak into shared packages:

- Repair / support UX and product language
- Symptom / diagnosis intake form
- Guided Fix customer-facing flow
- Live chat and on-site visit escalation paths
- Technician dispatch / service area workflows
- Device / problem taxonomy (strict matching)
- Pricing / service area flows
- Repair safety language (battery, electrical, water, data-loss)
- Council / senior technician role language
- Resolution outcome tracking
- Verified branding and copy

---

## 6. Shared Governance Principle

**Forged and Verified are product labels over the same trust concept.**

The core trust concept is:

> Trusted content has passed the required review or verification standard for its domain.

GuideForge may call it **Forged**.
Techsperts may call it **Verified**.
QuestLine may call it something domain-appropriate (e.g. **Veteran-reviewed**, **Community-verified**).

All three labels sit on top of the same underlying lifecycle model. The shared
`packages/governance` layer should encode the lifecycle, not the label. Each app maps the
lifecycle states to its own labels via a product-specific mapping helper.

Every asset in both products should support these status states:

| Status | Meaning |
|--------|---------|
| `draft` | Created but not submitted for review |
| `provisional` | AI-generated or auto-created; flagged as unverified |
| `in_review` | Submitted and under human review |
| `approved` | Passed review; product label applied (Forged / Verified / etc.) |
| `deprecated` | Was trusted but is no longer current; still visible but flagged |
| `discarded` | Removed from active use; not public |

---

## 7. Shared AI Principle

**AI-generated output is always provisional until reviewed.**

This applies to both products without exception:

- Techsperts must remain **diagnosis-first** — AI cannot bypass the symptom / cause / fix
  structure. Safety warnings are non-skippable.
- GuideForge must remain **review-first** — no AI draft auto-publishes or auto-saves without
  user review and explicit action.
- Both products should route AI through shared contracts and cost-control logic over time.
- Verified / cached answers should always be preferred over new AI calls when available.
- The AI generation cost-control extension point already exists in GuideForge's
  `resolveGuideForgeProviderRoute()`. This is the intended extraction target for
  `packages/ai`.

---

## 8. Future Extraction Order

When extracting shared logic from GuideForge into `packages/`, follow this order:

1. **Shared docs** — architecture and vocabulary docs that are already product-neutral
2. **Shared vocabulary / types** — `packages/shared-types`; neutral type definitions first
3. **Shared domain templates** — `packages/domain-templates`; scaffold shapes per domain
4. **Shared generation contracts** — `packages/ai`; prompt contracts and output schemas
5. **Shared status / governance helpers** — `packages/governance`; status constants and lifecycle
6. **Shared AI provider routing** — `packages/ai`; provider resolution with cost-control hooks
7. **Shared review / verification logic** — `packages/governance`; review lifecycle, weight model
8. **Selected shared UI primitives** — `packages/design-system`; tokens and status badges only

Do not extract multiple levels at once. Verify each extraction before moving to the next.

---

## Related docs

- `PLATFORM_MONOREPO_PLAN.md` — target workspace structure and migration principles
- `SHARED_ENGINE_VOCABULARY_MAP.md` — neutral-to-product terminology map
- `MONOREPO_MIGRATION_CHECKLIST.md` — step-by-step migration checklist
- `AI_ASSISTANT_MONOREPO_PROTOCOL.md` — assistant operating rules inside the monorepo
- `GUIDEFORGE_TECHSPERTS_ADAPTER_SPEC.md` — detailed adapter spec and future lane
- `GUIDEFORGE_AI_BUILDER_CORE.md` — GuideForge AI builder architecture and contracts
