# AI Assistant Monorepo Protocol

> Operating rules for Claude, v0, ChatGPT, and any other AI assistant working inside
> the `sonaeko-platform` monorepo.
> **Read this before making any change that touches shared packages or could affect
> more than one app.**
>
> Pair with `PLATFORM_MONOREPO_PLAN.md` (workspace structure),
> `SHARED_ENGINE_VOCABULARY_MAP.md` (terminology), and
> `GUIDEFORGE_TECHSPERTS_SHARED_CORE.md` (shared concepts).

---

## Read-Only Inspection Permissions

AI assistants are allowed to run read-only Bash inspection commands on both repos without
asking each time. This applies during audit, planning, and migration preparation tasks.

**Allowed read-only commands for both repos:**
- `ls` / `dir` — list folder contents
- `find` — locate files by name or pattern
- `grep` / `rg` — search file contents
- `cat` / `type` — read file contents
- `git status --short` / `git branch --show-current` / `git diff --name-only` — git state
- reading `package.json`, `tsconfig.json`, `vite.config.ts`, `next.config.*`, `vercel.json`
- searching `process.env` and `import.meta.env` references
- searching import paths and usages

**Never allowed regardless of task:**
- Print secret values (API keys, tokens, passwords, connection strings) to the conversation
  or to docs. Reference env var names only.
- Run `install`, `build`, `test`, `deploy`, or any mutation command without explicit
  user approval.
- Edit Techsperts source code unless the prompt explicitly says to edit Techsperts.
- Modify Supabase schema, RLS policies, or auth flows without a dedicated approved bundle.

---

## Ground Rule

This workspace contains multiple products that share a core engine.

**Do not assume a change for one app should automatically alter the other app unless
the task explicitly says `shared package` or `shared behavior`.**

Each app is an independent product. It has its own UI, its own branding, its own product
language, and its own user journey. A change to GuideForge should not silently ripple into
Techsperts, and vice versa.

---

## App-Specific Work

### If working in `apps/guideforge/`

- Preserve GuideForge product language: networks, hubs, collections, guides, Forge Rules,
  Forged, builder, creator workspace, Starter Build Queue.
- Preserve review-first governance: no auto-publish, no auto-generate, no auto-save.
- Do not import Techsperts UI components or product language.
- Do not change `apps/techsperts/` as a side effect.
- Do not remove public/private visibility rules.
- Keep TypeScript at 0 errors: run `npx tsc --noEmit` after any code change.

### If working in `apps/techsperts/`

- Preserve Techsperts product language: diagnosis, Guided Fix, verified solution, technician,
  council, device taxonomy, on-site visit, support workflow.
- Preserve diagnosis-first UX: symptom → likely cause → fix → verify → escalate.
- Preserve safety-first language: battery, electrical, water, data-loss warnings are
  non-skippable.
- Do not import GuideForge UI components or product language.
- Do not change `apps/guideforge/` as a side effect.
- Keep TypeScript at 0 errors.

---

## Shared Package Work

### If working in `packages/*`

Before making any change to a shared package:

1. **Identify which apps consume the package.** Check imports in both `apps/guideforge/`
   and `apps/techsperts/`.
2. **Report expected impact.** Which files in which apps will be affected by this change?
3. **Update both apps only if required.** If the change is additive and backward-compatible,
   only update the apps that actually need the new behavior.
4. **Preserve product-specific labels through mapping helpers.** Do not push GuideForge or
   Techsperts labels into shared package code. Use neutral terms in shared packages;
   each app maps to its own labels.
5. **Add or update docs for changed shared contracts.** A changed shared type or prompt
   contract requires an update to the relevant doc.
6. **Run or ask for typecheck and build checks for all affected apps** before reporting
   work as done.

---

## No Guessing Rule

Before modifying any shared package code:

- **Inspect both app usages.** Read the actual import sites in both apps before changing
  a shared type or helper.
- **Identify all affected imports.** A grep for the symbol is required, not optional.
- **Report expected impact.** State which apps and files will be affected before making
  the change.
- **Avoid broad refactors.** A task that asks to "clean up" or "improve" shared code
  without specifying scope is not a safe task. Ask for clarification.
- **Never guess that a shared type is unused.** Grep for it first.

---

## Safe Change Order

When introducing changes that affect shared packages, always follow this order. Stopping
partway is fine; reversing order is not:

1. **Docs** — update architecture and vocabulary docs first
2. **Types** — add or change TypeScript type definitions
3. **Pure helper functions** — stateless, no side effects, no API calls
4. **Mock generators** — update mock output for new shapes
5. **AI prompt contracts** — update generation request/response shapes
6. **App imports** — update the consuming app imports after all of the above are stable
7. **Runtime behavior** — change live API routes and UI flows last

Never jump to step 6 or 7 without completing the earlier steps first.

---

## Required Report for Shared Package Changes

Every change to a shared package (`packages/*`) must include this report before the work
is considered done:

| Field | Required answer |
|-------|----------------|
| **Apps affected** | Which apps (`apps/guideforge`, `apps/techsperts`, both, neither) |
| **Files changed** | List of changed files with paths |
| **Behavior changed or unchanged** | Is this additive/backward-compatible, or does it change behavior? |
| **Checks run** | `tsc --noEmit` result for each affected app; build result if applicable |
| **Migration risk** | Is there any risk of breaking a live flow? If yes, describe it. |
| **Follow-up required** | Any deferred work, schema changes, or doc updates still needed |

If any of the above cannot be answered, do not make the change. Report the blocker and ask
for guidance.

---

## Product Language Reference

Use this as a quick check before writing any copy inside the monorepo.

| Concept | GuideForge | Techsperts | Shared package (neutral) |
|---------|-----------|-----------|--------------------------|
| Trusted content | Forged | Verified | `approved` / trust badge |
| Draft | Draft | Provisional | `draft` / `provisional` |
| Review step | Review | Verification / council | `review` |
| Top-level organizer | Network | Knowledge domain / category | `network` / `domain` |
| Mid-level organizer | Hub | Device family / problem area | `hub` |
| Low-level organizer | Collection | Issue cluster | `collection` |
| Step-by-step asset | Guide | Solution / Guided Fix | `guide` |
| Multi-step check | Checklist | Technician checklist | `checklist` |
| Formal process | SOP | Internal support workflow | `sop` |
| Symptom-first flow | Guided Flow / Troubleshooting Flow | Guided Fix / diagnosis path | `troubleshooting_flow` |
| Governance rule | Forge Rules | Verification standards / safety rules | `governance_rule` |
| AI draft | AI draft — review before saving | Provisional AI solution | `provisional_ai_output` |
| Public surface | `/n/[networkSlug]` | Verified KB / customer-facing fix | `public_output` |

---

## Monorepo Anti-Patterns

Do not do any of the following:

- **Do not merge apps into one UI.** The shared design-system package provides primitives;
  it does not dictate layout or navigation.
- **Do not import `apps/techsperts` code from `apps/guideforge`,** or vice versa. Apps may
  only import from `packages/*`, never from each other.
- **Do not push product-specific labels into shared packages.** Use neutral terms in
  `packages/*`; map to labels at the app layer.
- **Do not auto-publish in either app.** Both products are review-first and verification-first.
- **Do not auto-elevate AI output to trusted status.** AI output is always provisional
  until a human reviewer acts on it.
- **Do not combine Supabase projects.** Each app has its own database until a deliberate
  migration decision is made.
- **Do not rename tables, columns, or RLS policies** without a dedicated migration plan
  and human approval.
- **Do not make broad speculative refactors** inside shared packages without an explicit
  task and scope.
- **Do not skip typecheck + build after changes to shared packages.**

---

## Related docs

- `PLATFORM_MONOREPO_PLAN.md` — workspace structure, package responsibilities, migration principles
- `SHARED_ENGINE_VOCABULARY_MAP.md` — neutral-to-product terminology map
- `GUIDEFORGE_TECHSPERTS_SHARED_CORE.md` — shared engine concept mapping between products
- `MONOREPO_MIGRATION_CHECKLIST.md` — step-by-step migration checklist
- `GUIDEFORGE_AI_BUILDER_CORE.md` — GuideForge AI builder architecture (source of shared contracts)
