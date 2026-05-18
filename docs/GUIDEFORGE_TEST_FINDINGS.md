# GuideForge Test Findings

> Triage log for the first full manual test phase.
> Pair with `GUIDEFORGE_FULL_TEST_PLAN.md` (the test plan) and `GUIDEFORGE_PRODUCT_ROADMAP.md` (current step).

---

## Test Session

| Field | Value |
|---|---|
| Date | First real session: 2026-05-18 (Flow 1 only) |
| Branch | `main` (post TypeScript-clean milestone) |
| Commit | _TBD — paste short SHA from `git log -1 --oneline` after committing this bundle_ |
| Environment | Local dev (per user report) |
| Tester | User (sonaeko) |
| Overall result | **Partial** — Flow 1 ran end-to-end; AI Draft Scaffold (Flow 2) timed out; 4 defects logged (`GF-BUG-002..005`), 3 fixed in this bundle pending re-test |

---

## Priority Legend

| Priority | Meaning |
|---|---|
| **P0** | blocks build/deploy/core flow |
| **P1** | blocks important user flow |
| **P2** | confusing/poor UX but workaround exists |
| **P3** | polish/nice-to-have |

---

## Current Testing Status

TypeScript is clean (0 errors), but **runtime/manual testing is pending**.
This file is the triage log for the first full test phase.

No flow below has been manually exercised yet — every area below is marked
**Status: Not tested**. Do not interpret "Not tested" as "broken"; it means
nobody has confirmed runtime behavior end-to-end since the cleanup bundles landed.

When a tester runs a flow, replace the placeholder block with real observations,
priority, and a fix-bundle suggestion if needed. Append any new defects to the
Open Bug Queue below.

---

## Flow Results

### 1. Network Creation — Quick Fill

**Status:** Partial

Prompt used: *"Build a tech repair guide network for home users and junior technicians. Include hubs for phone repair, computer troubleshooting, Wi-Fi issues, printer problems, safety warnings, tool requirements, and step-by-step repair checklists."*

**What worked:**
- Network creation page loaded.
- Quick Fill worked.
- Prompt stayed in textarea.
- Network name was broad and appropriate: *Home Tech Repair Guide Network*.
- Hubs / collections appeared.
- Starter guide ideas appeared.
- Starter Pages loaded.
- Forge Rules loaded.
- Network creation completed.
- Dashboard loaded.

**What failed / needs follow-up:**
- AI Draft Scaffold (Flow 2) timed out on the same reasonable tech repair prompt.
- Network Launch Plan was visible on dashboard, but not clearly visible/understandable during setup preview.
- Console showed repeated `400` resource errors during hub creation / scaffold save flow.
- Console included noisy `[v0]` debug logs (hub payload/result, network normalization).

**Screenshots / logs:**
- User screenshot showed *"AI Draft failed: AI scaffold generation timed out. Try a shorter prompt."*
- User console screenshot showed repeated *"Failed to load resource: the server responded with a status of 400"* while hubs were being created, alongside repeated `[v0]` hub save logs (`Create hub route networkId`, `Original networkId`, `networkId is already UUID`, `Resolved hub network UUID`, `Hub save payload`, `Hub save result`, `createNetworkScaffold: Hub created`).

**Priority:**
- **P1** for the repeated 400 resource errors (silent failed writes against a non-existent `networks.hub_ids` column).
- **P2** for AI Draft Scaffold timeout (Quick Fill workaround exists).
- **P2** for Network Launch Plan setup-preview clarity.
- **P3** for noisy `[v0]` debug logs (not user-facing).

**Suggested fix bundle:**
- "Polish network creation reliability after first test" (prior bundle).
  - Removed legacy `networks.hub_ids` post-insert update in `lib/guideforge/supabase-networks.ts` (root cause of 400s).
  - Gated noisy `[v0]` payload/result logs behind a `DEBUG_NETWORK_SAVE` / `DEBUG_SCAFFOLD` flag.
  - Tightened AI scaffold prompt (4–5 hubs, 2–3 collections/hub, 6–8 ideas total).
  - Raised OpenAI/route timeouts and `maxDuration` modestly (35s→50s / 40s→55s / 45→60).
  - Improved timeout copy: *"AI scaffold took too long. Your prompt is still saved — use Quick Fill or try AI Draft again."*
  - Made Launch Plan preview heading more prominent and added a hint about the dashboard view.
- "Harden AI scaffold and network setup flow" (this bundle).
  - Added `extractJsonObject()` helper in the scaffold route — tolerates markdown fences and leading prose; raw provider text no longer leaks to the UI.
  - Tightened normalizer caps (5 hubs / 3 collections / 1 idea-per-col / 8 total ideas) and added hub-name + collection-name de-dup with " (2)" suffix.
  - Forced scaffold `visibility: "private"` regardless of model output.
  - Post-normalization no-hubs guard returns `invalid_response` instead of an empty scaffold.
  - Improved AI error UI: bolded headline, preserved-state line, conditional Quick Fill / continue-with-current-scaffold hint, collapsed raw error details.
  - Distinct success copy: Quick Fill shows *"Filled locally (no AI): …"*, AI shows *"AI drafted: … — review before saving"*.
  - Starter Pages editor now shows a friendly empty-hubs card if all hubs are removed.
  - Collection-creation failures now report `hub › collection` context in the error message.

---

### 2. Network Creation — AI Draft Scaffold

**Status:** Not tested

**What worked:**
- Not tested yet.

**What failed:**
- Not tested yet.

**Screenshots / logs:**
- None yet.

**Priority:**
- TBD

**Suggested fix bundle:**
- TBD after testing.

---

### 3. Starter Pages Editor

**Status:** Not tested

**What worked:**
- Not tested yet.

**What failed:**
- Not tested yet.

**Screenshots / logs:**
- None yet.

**Priority:**
- TBD

**Suggested fix bundle:**
- TBD after testing.

---

### 4. Forge Rules Setup

**Status:** Not tested

**What worked:**
- Not tested yet.

**What failed:**
- Not tested yet.

**Screenshots / logs:**
- None yet.

**Priority:**
- TBD

**Suggested fix bundle:**
- TBD after testing.

---

### 5. Network Dashboard

**Status:** Not tested

**What worked:**
- Not tested yet.

**What failed:**
- Not tested yet.

**Screenshots / logs:**
- None yet.

**Priority:**
- TBD

**Suggested fix bundle:**
- TBD after testing.

---

### 6. Launch Plan → Create This Guide

**Status:** Not tested

**What worked:**
- Not tested yet.

**What failed:**
- Not tested yet.

**Screenshots / logs:**
- None yet.

**Priority:**
- TBD

**Suggested fix bundle:**
- TBD after testing.

---

### 7. Network Guide Generator Manual Flow

**Status:** Not tested

**What worked:**
- Not tested yet.

**What failed:**
- Not tested yet.

**Screenshots / logs:**
- None yet.

**Priority:**
- TBD

**Suggested fix bundle:**
- TBD after testing.

---

### 8. Guide Editor / Review / Publish

**Status:** Not tested

**What worked:**
- Not tested yet.

**What failed:**
- Not tested yet.

**Screenshots / logs:**
- None yet.

**Priority:**
- TBD

**Suggested fix bundle:**
- TBD after testing.

---

### 9. My Assets

**Status:** Not tested

**What worked:**
- Not tested yet.

**What failed:**
- Not tested yet.

**Screenshots / logs:**
- None yet.

**Priority:**
- TBD

**Suggested fix bundle:**
- TBD after testing.

---

### 10. Standalone Single Guide Builder

**Status:** Not tested

**What worked:**
- Not tested yet.

**What failed:**
- Not tested yet.

**Screenshots / logs:**
- None yet.

**Priority:**
- TBD

**Suggested fix bundle:**
- TBD after testing.

---

### 11. Standalone Checklist Builder

**Status:** Not tested

**What worked:**
- Not tested yet.

**What failed:**
- Not tested yet.

**Screenshots / logs:**
- None yet.

**Priority:**
- TBD

**Suggested fix bundle:**
- TBD after testing.

---

### 12. Public Network Pages

**Status:** Not tested

**What worked:**
- Not tested yet.

**What failed:**
- Not tested yet.

**Screenshots / logs:**
- None yet.

**Priority:**
- TBD

**Suggested fix bundle:**
- TBD after testing.

---

### 13. Responsive Checks

**Status:** Not tested

**What worked:**
- Not tested yet.

**What failed:**
- Not tested yet.

**Screenshots / logs:**
- None yet.

**Priority:**
- TBD

**Suggested fix bundle:**
- TBD after testing.

---

### 14. Console / Runtime Checks

**Status:** Not tested

**What worked:**
- Not tested yet.

**What failed:**
- Not tested yet.

**Screenshots / logs:**
- None yet.

**Priority:**
- TBD

**Suggested fix bundle:**
- TBD after testing.

---

## Open Bug Queue

| ID | Priority | Area | Issue | Expected | Actual | Suggested Fix | Status |
|---|---|---|---|---|---|---|---|
| GF-BUG-002 | P1 | Network creation / scaffold save | Repeated 400 resource errors appear in console while network hubs are being created. | Network creation should complete without repeated failed resource requests. | Network appears to create successfully but console shows repeated 400 errors. | Network creation console/API cleanup bundle. Caused by post-insert update to non-existent `networks.hub_ids` column; removed in `lib/guideforge/supabase-networks.ts`. | Fixed (this bundle) — pending re-test |
| GF-BUG-003 | P2 | AI Draft Scaffold | AI Draft Scaffold times out on reasonable tech repair prompt. | AI Draft Scaffold should either complete or fail gracefully with fallback guidance and not be overly fragile. | Error shown: *"AI scaffold generation timed out. Try a shorter prompt."* | AI scaffold timeout/retry/fallback polish bundle. Tightened prompt + raised timeouts (prior bundle). Hardening bundle: defensive `extractJsonObject()` (markdown fences / leading prose tolerated), tightened normalization (5 hubs / 3 collections / 1 idea-per-col / 8 total ideas), hub-name + collection-name de-dup, force `visibility: "private"`, post-normalization no-hubs guard, improved error UI in `create-network-form.tsx` (preserved state, Quick Fill fallback hint, scaffold-still-usable hint, details collapsed). | Mitigated again / hardened (this bundle) — pending re-test |
| GF-BUG-004 | P2 | Network setup preview | Network Launch Plan is visible on dashboard but not clearly surfaced during setup preview. | Setup preview should clearly explain/show the launch plan before saving, or clearly state it will appear on dashboard after save. | User expected to see it in setup but noticed it mainly on dashboard. | Network launch plan setup preview clarity bundle. Heading made more prominent + explicit dashboard hint added. | Fixed (this bundle) — pending re-test |
| GF-BUG-005 | P3 | Console / debug logging | Repeated `[v0]` debug logs clutter the console during network creation. | Debug logs should be removed or gated behind development/debug flag. | Console shows repeated `[v0]` hub creation payload/result logs. | Gate network creation debug logs. Added `DEBUG_NETWORK_SAVE` / `DEBUG_SCAFFOLD` flags; payload/result logs gated, error logs preserved. | Fixed (this bundle) — pending re-test |

> Add a new row per defect. Use ascending IDs (`GF-BUG-006`, `GF-BUG-007`, …).
> Close a row by changing `Status` to `Fixed` (link to the commit/PR) or `Won't Fix` (reason).
> When a Flow re-test confirms the fix held, change the `(pending re-test)` note to the test date.

---

## Test Result Log Template

Copy this block per finding into the matching Flow Results section:

```
Date:
Branch/commit:
Environment:
Flow tested:
Result:
Screenshots:
Console errors:
Vercel/build errors:
Priority:
Notes:
Next fix needed:
```

---

## Next Fix Bundle Recommendation

**Recommended next bundle:**
Retest Flow 1 + Flow 2, then continue Flows 3–14.

**Reason:**
Flow 1 (Quick Fill) mostly works; first-bundle fixes addressed the 400 spam and the launch plan visibility, and the second hardening bundle further toughened the AI Draft Scaffold path (defensive JSON extraction, tighter caps, dedup, better error UI, distinct success copy) and added small resilience improvements to Starter Pages + scaffold-save error context. Re-running Flow 1 + Flow 2 will confirm the fixes held. Once confirmed, continue with Flows 3–14 before any new feature work.

**Blocking issues:**
- None confirmed P0 yet. `GF-BUG-002` was P1 and is now patched, pending re-test.

**Deferred issues:**
- New feature work.
- Bulk generation.
- Durable planning persistence (`starterGuideIdeas` / `NetworkBuildPlan` stay session-only).
- QuestLine template build-out.
- Techsperts adapter implementation.

---

## Related docs

- `GUIDEFORGE_FULL_TEST_PLAN.md` — the test plan this log answers
- `GUIDEFORGE_PRODUCT_ROADMAP.md` — current step, lanes, non-goals
- `GUIDEFORGE_AI_BUILDER_CORE.md` — what each builder actually does
- `current-build-state.md` — audited Supabase persistence flows
