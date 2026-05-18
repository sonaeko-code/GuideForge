# GuideForge Full Test Plan

> Practical manual test plan for the next testing phase.
> Use this immediately after the TypeScript-clean milestone to surface runtime regressions
> before adding more large features.

---

## Purpose

Now that TypeScript is clean (0 errors), test the full product flow manually before adding more large features.
The compiler proved nothing claims a wrong type; this plan proves the **behavior** still works.

---

## Testing Rule

For every flow, test in this order:

1. confirm **page loads** (no client crash, no hydration error)
2. confirm **primary action works** (button click, form submit)
3. confirm **save / redirect works** (correct destination, no broken router state)
4. confirm **data appears in the right place** (dashboard, asset list, editor)
5. confirm **private content stays private** (drafts/pending not visible publicly)
6. confirm **public content appears only when published** (no leaks)

If any step fails, log it in the Test Result Log Template at the bottom and stop drilling into that flow until fixed.

---

## Test Area 1 — Network Creation: Quick Fill

Checklist:
- [ ] Open network creation (`/builder/network/new`).
- [ ] Enter a tech repair prompt (e.g. *"a knowledge base for fixing common phone, laptop, and tablet issues"*).
- [ ] Click **Quick Fill**.
- [ ] Confirm prompt **remains** in the textarea (not cleared).
- [ ] Confirm name is broad (not only phone repair).
- [ ] Confirm hubs / collections appear.
- [ ] Confirm starter guide ideas appear.
- [ ] Confirm Network Launch Plan appears.
- [ ] Continue to Starter Pages.
- [ ] Continue to Forge Rules.
- [ ] Create Network.
- [ ] Confirm dashboard loads.

---

## Test Area 2 — Network Creation: AI Draft Scaffold

Checklist:
- [ ] Open network creation.
- [ ] Enter a tech repair prompt.
- [ ] Click **AI Draft Scaffold**.
- [ ] Confirm loading state appears.
- [ ] Confirm prompt **remains**.
- [ ] Confirm AI fills name / description / type / theme / hubs / collections.
- [ ] Confirm starter guide ideas appear.
- [ ] Confirm Network Launch Plan appears.
- [ ] Confirm **no network saved automatically**.
- [ ] Confirm **no guides created automatically**.
- [ ] Continue and save.
- [ ] Confirm dashboard loads.

### Failure case
- [ ] If API key missing or OpenAI fails, confirm a **friendly error** appears.
- [ ] Confirm Quick Fill still works afterward.
- [ ] Confirm form is **not wiped**.

---

## Test Area 3 — Starter Pages Editor

Checklist:
- [ ] Confirm hub cards render.
- [ ] Expand / collapse hubs.
- [ ] Rename a hub.
- [ ] Rename a collection.
- [ ] Add a collection (if supported in this build).
- [ ] Remove a collection (if supported).
- [ ] Confirm no layout overflow on narrow width.
- [ ] Continue to Forge Rules.

---

## Test Area 4 — Forge Rules Setup

Checklist:
- [ ] Confirm summary at top.
- [ ] Confirm Trust / Standards language reads sensibly.
- [ ] Confirm bottom summary appears.
- [ ] Confirm **Create Network** works.
- [ ] Confirm governance fields do not block creation unexpectedly.

---

## Test Area 5 — Network Dashboard

Checklist:
- [ ] Confirm dashboard loads.
- [ ] Confirm Network Launch Plan appears if a session plan exists.
- [ ] Confirm Trust & Standards defaults open.
- [ ] Confirm Trust & Standards can hide / show.
- [ ] Confirm Hubs tab loads.
- [ ] Confirm Collections tab loads.
- [ ] Confirm Guides tab loads.
- [ ] Confirm Drafts / Pending / Published tabs load.
- [ ] Confirm Suggested Starter Guides does **not** duplicate the launch plan when launch plan exists.
- [ ] Confirm stats are not contradictory (e.g. "0 drafts" while drafts list is non-empty).

---

## Test Area 6 — Launch Plan → Create This Guide

Checklist:
- [ ] Click **Create this guide** from Network Launch Plan.
- [ ] Confirm Network Guide Generator opens.
- [ ] Confirm prompt / type / difficulty / hub / collection are **prefilled**.
- [ ] Confirm **no generation happens automatically**.
- [ ] Generate Mock Preview.
- [ ] Confirm human-readable preview.
- [ ] Send to Editor.
- [ ] Confirm draft / private editor opens.

---

## Test Area 7 — Network Guide Generator Manual Flow

Checklist:
- [ ] Open `/builder/network/[networkId]/generate` directly.
- [ ] Enter prompt.
- [ ] Click **Suggest Structure**.
- [ ] Confirm prompt remains.
- [ ] Confirm type / difficulty / hub / collection fill.
- [ ] Generate Mock Preview.
- [ ] Confirm raw JSON is collapsed (not shown by default).
- [ ] Send to Editor.
- [ ] Confirm editor opens.

### AI path
- [ ] Select **AI Generate**.
- [ ] Confirm success if API key configured.
- [ ] Confirm friendly error if it fails.
- [ ] Confirm no raw stack trace shown to the user.

---

## Test Area 8 — Guide Editor / Review / Publish

Checklist:
- [ ] Open draft guide editor.
- [ ] Confirm sections render.
- [ ] Edit title / summary / a section (if supported by the surface under test).
- [ ] Save.
- [ ] Submit for Review.
- [ ] Confirm status changes.
- [ ] Open Pending Review.
- [ ] Vote / approve if the current user has permission.
- [ ] Publish if allowed.
- [ ] Confirm public page only shows **after** published.

### Important visibility checks
- [ ] Private drafts must **not** appear publicly.
- [ ] Pending-review guides must **not** appear publicly.
- [ ] Published guides should appear on public network pages.

---

## Test Area 9 — My Assets

Checklist:
- [ ] Open My Assets.
- [ ] Confirm guide / checklist cards render.
- [ ] Confirm asset-type badges render.
- [ ] Open a saved Single Guide asset.
- [ ] Open a saved Checklist asset.
- [ ] Confirm edit / view works.
- [ ] Attach asset to a network (if supported).
- [ ] Confirm attached status appears.
- [ ] Confirm public visibility still depends on publish state.

---

## Test Area 10 — Standalone Single Guide Builder

Checklist:
- [ ] Open `/builder/generate-asset/single_guide`.
- [ ] Enter prompt.
- [ ] Quick Fill.
- [ ] Confirm prompt remains.
- [ ] Generate (Mock / AI if available).
- [ ] Confirm proposal opens.
- [ ] Save to Workspace.
- [ ] Confirm asset detail loads.

---

## Test Area 11 — Standalone Checklist Builder

Checklist:
- [ ] Open `/builder/generate-asset/checklist`.
- [ ] Enter prompt.
- [ ] Quick Fill.
- [ ] Confirm prompt remains.
- [ ] Generate.
- [ ] Confirm proposal opens.
- [ ] Save to Workspace.
- [ ] Confirm asset detail loads.

---

## Test Area 12 — Public Network Pages

Checklist:
- [ ] Open `/n/[networkSlug]`.
- [ ] Confirm public header / nav works.
- [ ] Confirm published guides appear.
- [ ] Confirm **unpublished content does not appear**.
- [ ] Open hub page.
- [ ] Open guide page.
- [ ] Confirm invalid slugs show the existing not-found / fallback behavior.
- [ ] Confirm launch plan / starter guide ideas do **not** show publicly.

---

## Test Area 13 — Responsive Checks

Widths to cover:
- full desktop
- half-screen beside console / IDE
- tablet-ish (~768px)
- mobile / narrow (~390px)

Checklist (each width):
- [ ] no horizontal overflow
- [ ] buttons wrap
- [ ] tabs do not break page
- [ ] cards stack
- [ ] long titles wrap
- [ ] editor forms are usable

---

## Test Area 14 — Console / Runtime Checks

Checklist:
- [ ] Open console.
- [ ] Test major flows.
- [ ] Record errors.
- [ ] Ignore harmless warnings only if understood (note them so they don't masquerade as fine forever).
- [ ] Fix repeated scary logs.
- [ ] Check for hydration errors (`Hydration failed because the initial UI does not match…`).
- [ ] Check for failed fetches (network tab — 4xx/5xx on Supabase or `/api/guideforge/*`).

---

## Test Result Log Template

Copy this block for each finding:

```
Date:
Branch / commit:
Environment:           (local dev / preview / prod)
Flow tested:
Result:                (pass / partial / fail)
Screenshots:
Console errors:
Vercel / build errors:
Priority:              (P0 blocker / P1 major / P2 minor / P3 cosmetic)
Notes:
Next fix needed:
```

---

## Related docs

- `GUIDEFORGE_PRODUCT_ROADMAP.md` — current step / lanes / non-goals
- `GUIDEFORGE_AI_BUILDER_CORE.md` — what each builder actually does under the hood
- `current-build-state.md` — the audited Supabase persistence flows
- `GUIDEFORGE_REVIEW_PUBLISH_WORKFLOW.md` — review/publish behavior reference
