# GuideForge Cross-Repo Context

## Purpose

This document provides context for v0 sessions that need to understand relationships between GuideForge, Techsperts, and other repos—without requiring direct access to those repos.

## Repository Map

| Repo | Owner | Purpose | Language | Key Pattern |
|------|-------|---------|----------|-------------|
| GuideForge | sonaeko-code | Guide/checklist builder | TypeScript/Next.js | MVP AI checklist generation |
| Techsperts | ? | Repair guide platform | TypeScript/Next.js | Verified-first AI + KB + caching |
| (Other repos) | ? | ? | ? | ? |

## GuideForge Current State

### Checklist Generation Pipeline

```
User Input → Build Prompt → Call OpenAI → Validate → Save Draft → Return to User
```

**Current Implementation:**
- Model: gpt-4o-mini
- Timeout: 10s OpenAI call, 15s route
- Error handling: Structured JSON (no Vercel 504)
- Repair loops: None (MVP)
- Output: Saved as draft (not auto-published)

### Database

**Tables in Use:**
- `asset_drafts` — Stores checklist drafts
- `guides` — Published guides (not created by AI in MVP)
- Other tables: users, orgs, networks, etc.

**Key Fields for AI:**
- asset_drafts.source: "mock" | "openai" | "manual"
- asset_drafts.content: JSON shape of checklist
- guides.published: boolean (user controls promotion)

### API Endpoints

**POST /api/guideforge/generate-checklist**
- Normal flow: Returns checklist or error
- Debug flow: `?debug=true` query param shows stage-by-stage diagnostics
- Both flows: Return structured JSON (never HTML errors)

### UI Workflows

**Generate Asset Page** (`/builder/generate-asset/checklist`)
- Form: Title, Audience, Purpose, Goal, Tone, Sections, Items
- Buttons: Generate AI Checklist, Mock Preview
- Output: Draft card with AI Generated badge
- User can: Edit, Save, Publish, Discard

## Techsperts AI Pattern (Reference Only)

**Why Reference Techsperts?**
- Proven verified-first architecture
- Caching strategy reduces API cost
- Trust model is explicit (KB vs. Provisional)
- Could be adapted for GuideForge Phase 2+

**Key Concepts to Borrow:**
1. Cache before regenerating (Phase 2)
2. Mark AI output explicitly (source field)
3. Simple AI shape + rich frontend mapping
4. No auto-publishing, user review first

**What NOT to Copy:**
- Repair/business logic specific to repairs
- KB verification workflow (build custom for guides)
- Diagnostic context (different domain)

## Architecture Evolution Path

### Current (MVP - This Fix)
```
User Form → OpenAI gpt-4o-mini → Validation → Draft → User Reviews
```

### Phase 2 (Reuse + Caching)
```
User Form → Check Draft Cache → If hit, reuse → If miss, call AI → Draft
```

### Phase 3 (Metrics + Monitoring)
```
Track validation rates, model performance, user acceptance
Inform future KB curation and model selection
```

### Phase 4 (KB Integration)
```
Promote high-quality verified drafts → KB guides
Implement verified-first lookup (like Techsperts)
Maintain separate AI/provisional layer
```

## API Integration Points

### OpenAI API
- Endpoint: `https://api.openai.com/v1/chat/completions`
- Auth: `OPENAI_API_KEY` (env var, server-side only)
- Model: `gpt-4o-mini`
- Response: JSON with assistant message content

### Supabase (GuideForge DB)
- Connection: Native client in API routes
- Tables: asset_drafts, guides, users, etc.
- RLS: Row-level security policies (check existing)
- Auth: Supabase Auth (server session management)

### Other Potential Integrations (Future)
- Stripe (payments, monetization)
- Vercel AI Gateway (if moving off direct OpenAI)
- Analytics (user acceptance metrics)

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ GuideForge Frontend (Next.js Client)                         │
│ - Generate Asset Page                                        │
│ - Form input: title, audience, purpose, goal, tone, etc.    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ POST /api/guideforge/generate-checklist
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ GuideForge Backend (Next.js API Route)                       │
│ - Validate input                                             │
│ - Build prompt                                               │
│ - Call OpenAI with timeout protection                        │
│ - Validate output (schema + quality)                         │
│ - Save to asset_drafts                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─→ [OpenAI API]
                     │   - gpt-4o-mini model
                     │   - JSON response
                     │
                     └─→ [Supabase]
                         - Insert/Update asset_drafts
                         - Check existing drafts (Phase 2)
                         │
                         ↓
                   [Return JSON to Frontend]
                   - success: true/false
                   - asset: checklist or error message
                   - stage: diagnostic info
```

## Key Files and Their Roles

### Backend

| File | Role | Key Functions |
|------|------|---------------|
| `app/api/guideforge/generate-checklist/route.ts` | Main API endpoint | POST handler, timeout logic, validation |
| `lib/guideforge/ai-generation-client.ts` | OpenAI wrapper | callOpenAI(), AbortSignal support |
| `lib/guideforge/ai-generation-config.ts` | Constants | Model, temperature, max tokens |
| `lib/guideforge/ai-prompts.ts` | Prompt building | buildChecklistPrompt() |
| `lib/guideforge/asset-validation.ts` | Output validation | validateGeneratedChecklist(), validateChecklistQuality() |

### Frontend

| File | Role | Key Functions |
|------|------|---------------|
| `components/guideforge/builder/generate-checklist-client.tsx` | Form and flow | UI, handleGenerate(), handleDebugFullGeneration() |
| `components/guideforge/builder/structured-asset-proposal.tsx` | Results display | Show draft, user actions |
| `lib/guideforge/ai-generation-client.ts` (frontend) | API caller | generateChecklist() fetch wrapper |

## Debugging Workflow

**For AI Generation Issues:**

1. Check `OPENAI_API_KEY` env var is set
2. Check browser console for fetch errors
3. Use Debug Full Generation button: `?debug=true`
4. Debug route shows stage-by-stage results:
   - `api_key_check`: Was key available?
   - `openai_call`: Did request succeed?
   - `parse`: Was response valid JSON?
   - `schema_validation`: Did it match schema?
   - `quality_validation`: Did it pass quality checks?

5. Check server logs (Vercel dashboard or local dev):
   - `[v0] API: ...` messages
   - Error stack traces
   - Timing information

## Integration Testing

**To test end-to-end:**

1. Ensure `OPENAI_API_KEY` is set in `.env.local`
2. Start dev server: `pnpm run dev`
3. Navigate to `/builder/generate-asset/checklist`
4. Fill in form and click "Generate AI Checklist"
5. Expected: Draft appears or error JSON shown
6. Check server console for `[v0]` debug logs

**To test debug endpoint:**

1. Add `?debug=true` to form submission in browser DevTools
2. Or call via curl:
   ```bash
   curl -X POST http://localhost:3000/api/guideforge/generate-checklist?debug=true \
     -H "Content-Type: application/json" \
     -d '{"title":"Test","audience":"Users","purpose":"Test","goal":"Test"}'
   ```
3. Response shows detailed stage trace

## Environment Variables

**Required:**
- `OPENAI_API_KEY` — Your OpenAI API key (server-side)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service key (server-side)

**Check in:**
- Local: `.env.local`
- Production: Vercel project settings → Environment Variables

## Related Documentation

- `techsperts-ai-pattern.md` — Reference architecture pattern
- `guideforge-ai-checklist-target.md` — Target implementation
- `guideforge-v0-operating-rules.md` — v0 workflow constraints

## For Future Sessions

**If you're a new session inheriting this work:**

1. Read this file first (you are here!)
2. Check `guideforge-ai-checklist-target.md` for target state
3. Review `techsperts-ai-pattern.md` if implementing caching or KB
4. Follow `guideforge-v0-operating-rules.md` for workflow

**Key Context:**
- GuideForge is checklist builder (not repair guide)
- AI generates drafts (not published content)
- Model: gpt-4o-mini (fast, cheap)
- Timeouts: 10s OpenAI, 15s route
- Errors: Always JSON (never HTML)
- Inspired by Techsperts verified-first pattern, but adapted for checklists
