# GuideForge → Techsperts Adapter Spec

> Defines how GuideForge patterns can be useful for Techsperts later.
> **This spec does not build the adapter.** It establishes the mapping and boundaries.
> See also `techsperts-to-guideforge-governance-reuse-map.md` (existing detailed governance audit).

---

## Purpose

GuideForge patterns can power **structured repair / support knowledge** without replacing Techsperts.

Techsperts has its own product surface (diagnosis, technicians, escalation, support tickets, verified-solution KB).
GuideForge provides the **structured-knowledge engine** under the hood: schemas, governance, review/publish, and AI routing.

---

## Shared Concepts

| GuideForge concept | Techsperts equivalent |
|--------------------|-----------------------|
| Network | Knowledge domain / category (e.g. *Mobile Devices*, *Laptops*) |
| Hub | Device family / problem area (e.g. *iPhone*, *Battery Issues*) |
| Collection | Issue cluster / repair workflow group (e.g. *Charging Problems*) |
| Guide | Verified repair solution / guided fix |
| Checklist | Technician checklist / user prep checklist |
| SOP | Internal support workflow |
| Troubleshooting flow | Diagnosis-first guided fix |
| Forge Rules | Verification and safety standards |
| Review / publish | Council verification / staff approval |
| Published status | Verified / public solution |
| Private draft | Provisional / unverified draft |
| Verification badge | Solution-verified badge |

---

## Techsperts-Specific Requirements

The adapter must respect these realities that GuideForge does not currently encode:

- **diagnosis-first** — symptom → likely cause → fix, not generic prose
- **verified solutions are gold standard** — escalation in trust beats freshness
- **AI-generated solutions are provisional** — must be marked and reviewed before they count as KB
- **human escalation** — when AI / KB does not match, route to a technician
- **technician / support roles** — role registry richer than GuideForge's; weight is by repair authority
- **council / governance** — senior technician sign-off required for some solution classes
- **safety warnings** — battery, electrical, water, data-loss — non-skippable
- **device / problem taxonomy** — strict; matching is a first-class problem
- **resolution channel** — was the fix delivered via KB, AI assist, or technician?
- **outcome tracking** — did the fix actually work? feedback loop on verified status
- **KB hit-rate metrics** — proxy for whether structured KB is paying off vs always-AI
- **cost control** — AI fallback is more expensive than verified solution reuse; prefer cache hits

---

## Reusable GuideForge Pieces

These can be lifted as-is or with minor mapping:

- **AI Builder Core** (`lib/guideforge/ai-builder-core.ts`) — shared request shape, kind routing
- **Provider routing** (`lib/guideforge/ai-provider-routing.ts`) — cost-control extension point already exists
- **Structured output schemas** — guide / checklist / SOP / troubleshooting-flow shapes
- **Review / publish lifecycle** — draft → ready → published → archived
- **Status badges** — verification status, published / pending / draft
- **Public / private visibility** — published-only on public surfaces
- **Checklist / SOP asset types** — fit technician checklists and internal procedures
- **Scaffold planning** — proposal-only outputs the user confirms before save
- **Forge Rules concept** — generalizes to verification level / safety policy

---

## Not Reusable Without Adaptation

These GuideForge pieces are too GuideForge-specific to drop into Techsperts:

- **Generic public network pages** — Techsperts has its own customer/technician surfaces
- **Gaming / community naming** — wording in QuestLine-flavored copy
- **Simple guide templates** — Techsperts solutions need diagnosis structure first
- **Generic review wording** — Techsperts council language is repair-specific
- **Non-diagnostic prompt flow** — GuideForge prompt is open-ended; Techsperts prompt is symptom-first

---

## Future Adapter Lane

When the Techsperts adapter is actually built, do it in this order:

1. **Define Techsperts guide schema.** Extend `GeneratedSingleGuide` / introduce a `RepairSolution` shape with diagnosis + cause + fix + safety.
2. **Define troubleshooting-flow asset type.** GuideForge already has `GeneratedTroubleshootingFlow`; align its fields with Techsperts symptom/cause/fix.
3. **Map Techsperts roles to review permissions.** Use the existing role-weight model from GuideForge governance; remap to technician / senior technician / council.
4. **Map verification status to Techsperts solution verification.** Treat `verification: "forge-verified"` as the equivalent of a council-signed solution.
5. **Add safety / diagnosis requirements to Forge Rules.** New rule categories: *safety warning required*, *diagnosis-first*, *AI provisional must be reviewed*.
6. **Create Techsperts network template.** A scaffold that emits device hubs, problem-area collections, and starter troubleshooting flows instead of guides.
7. **Route AI generation through cost controls.** Hook the existing provider routing's extension point; prefer verified-solution lookup before any AI call.
8. **Keep AI provisional until verified.** Never auto-elevate an AI solution to verified KB; require council action.

---

## Boundaries

- GuideForge must **not** assume Techsperts' device taxonomy.
- Techsperts must **not** assume GuideForge's network template.
- The adapter is a translation layer, not a rewrite of either product.
- Schema changes on either side require approval and a dedicated migration plan.

---

## Related docs

- `GUIDEFORGE_PRODUCT_ROADMAP.md` — platform relationship and lanes
- `GUIDEFORGE_AI_BUILDER_CORE.md` — shared builder architecture
- `techsperts-to-guideforge-governance-reuse-map.md` — detailed governance audit (existing)
- `techsperts-governance-code-extraction-plan.md` — extraction plan reference
- `ai-reference/techsperts-ai-pattern.md` — Techsperts AI patterns (existing)
