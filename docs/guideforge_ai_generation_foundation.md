# GuideForge AI Generation Foundation

## Overview

GuideForge AI is a structured data generation system. AI does not directly publish content. Instead, AI returns structured proposals that users review and save to their workspace.

## Core Principles

1. **No Direct Publishing**: AI-generated assets are saved as private workspace drafts
2. **Structured Output**: All AI responses must match GuideForge schemas (GeneratedChecklist, GeneratedSingleGuide, etc.)
3. **User Review**: Generated assets show as proposals before saving
4. **Validation**: Invalid AI output is rejected with clear error messages
5. **Provider Agnostic**: Support multiple AI providers (OpenAI, Claude, mock, etc.)
6. **Output Repair**: If AI output is malformed, attempt one repair pass before failing

## Enabling Real AI Generation

To enable real AI checklist generation in your local dev or Vercel deployment:

### Required Environment Variable

```
OPENAI_API_KEY=your_openai_api_key_here
```

### Local Development (.env.local)

1. Create a `.env.local` file in the project root (next to `package.json`)
2. Add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-...
   ```
3. Restart the Next.js dev server (`npm run dev` or `pnpm dev`)
4. Test on http://localhost:3000/builder/generate-asset/checklist
5. Select "AI Generate" tab and create a checklist

### Production (Vercel)

1. Go to your Vercel project Settings
2. Navigate to Environment Variables
3. Add new variable:
   - Key: `OPENAI_API_KEY`
   - Value: Your OpenAI API key
   - Environments: Select production (and preview/staging if desired)
4. Redeploy your project
5. After deployment completes, AI generation will be available

### Important Security Notes

- **NEVER use `NEXT_PUBLIC_OPENAI_API_KEY`** — This would expose your key to the browser
- OPENAI_API_KEY is server-side only and never sent to the browser
- All AI calls are made through `/api/guideforge/*` server endpoints
- The key is never logged or exposed in error messages to users

### If Missing

- **Mock Preview** (client-side) continues to work without any API key
- **AI Generate** shows: "AI generation is not configured."
- User can still generate checklists using Mock Preview
- No data is lost; both modes save to the same workspace

## Architecture

### File Structure

```
lib/guideforge/
├── ai-generation-types.ts           # Type definitions and interfaces
├── ai-generation-client.ts          # Unified client API
├── ai-generation-validation.ts      # Schema validation for all asset types
├── checklist-quality-validation.ts  # Quality validation specific to checklists (NEW)
├── ai-generation-config.ts          # Model configuration
├── ai-prompts.ts                    # Prompt contracts for AI
└── mock-asset-generator.ts          # Existing mock generation (preserved)

app/api/guideforge/
└── generate-checklist/
    └── route.ts                     # Server-side API for AI generation (with repair)
```

### Generation Flow

```
User fills form
     ↓
[Mock or AI Provider selected]
     ├→ Mock: Client-side generation
     │        + 1000ms delay
     │        + Deterministic output
     │        + No API key needed
     │        + Quality-compliant placeholder content
     │
     └→ AI: POST /api/guideforge/generate-checklist
             ↓
          [Validate OPENAI_API_KEY exists]
             ├→ Missing: Return "AI generation is not configured"
             ├→ Found: Continue
             ↓
          [Call OpenAI API with prompt]
             ↓
          [Parse JSON response]
             ├→ Invalid JSON: Show "AI returned invalid JSON" and return error
             ├→ Valid JSON: Continue
             ↓
          [Validate schema]
             ├→ Invalid: Attempt ONE repair pass (include schema errors in repair prompt)
             │           ├→ Repair passes schema: Continue to quality check
             │           └→ Repair fails schema: Return error
             ├→ Valid: Continue to quality check
             ↓
          [Validate content quality]
             ├→ Invalid: Attempt ONE repair pass (include quality errors in repair prompt)
             │           ├→ Repair passes schema & quality: Return repaired asset
             │           └→ Repair fails: Return "Quality rules failed" error
             ├→ Valid: Return asset
     ↓
[Validate in client]
     ├→ Valid: Show proposal review
     └→ Invalid: Show error, allow retry
     ↓
User edits title/summary (optional)
     ↓
User clicks "Save to Workspace"
     ↓
Save to public.asset_drafts (private, draft status)
     ↓
User can now view/edit/delete from /builder/assets
```

## Model Configuration

### Current Configuration

**File:** `lib/guideforge/ai-generation-config.ts`

```typescript
export const DEFAULT_CHECKLIST_MODEL = "gpt-4-turbo"
export const GENERATION_TEMPERATURE = 0.7
export const MAX_GENERATION_TOKENS = 2000
export const MAX_REPAIR_ATTEMPTS = 1
```

### Changing Models

To try a different OpenAI model:

1. Open `lib/guideforge/ai-generation-config.ts`
2. Change `DEFAULT_CHECKLIST_MODEL` to your desired model:
   - `"gpt-4"` - Most capable, higher cost
   - `"gpt-4-turbo"` - Current default, good balance
   - `"gpt-3.5-turbo"` - Faster, lower cost (less reliable JSON)
3. Restart dev server
4. Test with a checklist generation
5. Monitor validation failure rate

**Cost Note:** Using gpt-3.5-turbo may increase repair attempts needed due to less reliable JSON output.

## Validation Rules

### Checklist Validation

Required:
- `assetType` = "checklist"
- `title` non-empty string
- `summary` non-empty string
- `sections` array with 1-8 sections
- Each section has `title` (non-empty) and `items` array (1-12 items)
- Each item has:
  - `label` (non-empty string)
  - `description` (string or null)
  - `required` (boolean)
- `completionCriteria` array
- `tags` array
- `assumptions` array
- `missingInfo` array

Limits:
- Max 8 sections
- Max 12 items per section
- These are enforced in both AI prompt and validation

### Why Validation Matters

- Prevents malformed data from being shown to users
- Ensures consistent structure across all generated assets
- Allows future automation (e.g., converting to published guides)
- Catches AI hallucinations early

## Output Repair

### How Repair Works

If AI returns output that fails validation, GuideForge attempts ONE automatic repair pass:

1. **Detect Invalid Output**: Validation fails with specific errors
2. **Build Repair Prompt**: Send original request + validation errors + broken output + schema to AI
3. **Call AI Again**: Ask AI to fix the output (same model, same temperature)
4. **Validate Repair**: If repair passes validation, return it to user
5. **No More Attempts**: If repair also fails, return user-friendly error

### Why Only One Attempt?

- Prevents infinite loops
- Protects against API cost runaway
- If repair fails, the original request is usually the problem
- User can retry with better parameters

### User Experience

- User never sees raw validation errors or broken JSON
- User sees simple messages:
  - "AI returned an incomplete checklist. Please try again or use Mock Preview."
  - Can use Mock Preview as immediate fallback
  - Can try different parameters and regenerate

## API: POST /api/guideforge/generate-checklist

### Request

```json
{
  "title": "Pre-Launch Deployment Checklist",
  "audience": "DevOps engineers",
  "purpose": "Ensure nothing is missed before production launch",
  "goal": "Verify all systems are ready",
  "useCase": "Production deployments",
  "tone": "practical",
  "numberOfSections": 3,
  "itemsPerSection": 5,
  "optionalContext": "Blue-green deployment environment"
}
```

### Response (Success)

```json
{
  "success": true,
  "asset": {
    "assetType": "checklist",
    "title": "...",
    "summary": "...",
    "sections": [...],
    "completionCriteria": [...],
    "tags": [...],
    "assumptions": [...],
    "missingInfo": [...]
  },
  "repaired": false
}
```

### Response (Error - Missing Config)

```json
{
  "success": false,
  "error": "AI generation is not configured. Please set OPENAI_API_KEY environment variable."
}
```

### Response (Error - Invalid Output)

```json
{
  "success": false,
  "error": "AI returned an incomplete checklist. Please try again or use Mock Preview."
}
```

## User-Facing Error Messages

### 1. Missing API Key
```
"AI generation is not configured."
```
**Solution:** Set OPENAI_API_KEY environment variable and redeploy.

### 2. OpenAI API/Network Failure
```
"AI generation failed. Please try again."
```
**Solution:** Check OpenAI API status, try again later.

### 3. Invalid/Malformed Output (after repair)
```
"AI returned an incomplete checklist. Please try again or use Mock Preview."
```
**Solution:** Try again with different parameters, or use Mock Preview.

### 4. Size Limit Issue
```
"Checklist is too large for the current MVP. Use up to 8 sections and 12 items per section."
```
**Solution:** Reduce numberOfSections and itemsPerSection, regenerate.

## Testing AI Generation

### Example Test Prompts

Use these to test real AI generation if you have OPENAI_API_KEY configured:

#### 1. Pre-Launch Deployment Checklist
```
Title: Pre-Launch Deployment Checklist
Audience: DevOps engineers
Goal: Verify all systems ready for production launch
Purpose: Ensure nothing is missed before going live
Use Case: Production deployments
Tone: practical
Sections: 3-4
Items per section: 4-6
```
Expected: Database, infrastructure, code/config, monitoring sections

#### 2. Home Kitchen Deep Cleaning
```
Title: Spring Kitchen Deep Cleaning Checklist
Audience: Busy parents
Goal: Deep clean the kitchen thoroughly
Purpose: Annual deep clean, not regular maintenance
Use Case: Weekend project, family can help
Tone: friendly
Sections: 3-4
Items per section: 5-7
```
Expected: Appliances, cabinets, walls, organization sections

#### 3. New Employee Onboarding
```
Title: New Employee Onboarding Checklist
Audience: Small repair business manager
Goal: Get new hire productive on first day
Purpose: Standardize onboarding process
Use Case: Retail repair shop
Tone: practical
Sections: 4-5
Items per section: 4-6
```
Expected: Setup, training, tools, access sections

#### 4. Discord Moderation Checklist
```
Title: Discord Community Moderation Checklist
Audience: Game server admin
Goal: Keep community safe and welcoming
Purpose: Daily moderation routine
Use Case: Gaming discord server
Tone: practical
Sections: 3-4
Items per section: 5-7
```
Expected: Channel review, member behavior, rules, escalation sections

## Content Quality Validation

GuideForge validates more than just schema correctness. AI-generated checklists must also meet quality standards:

### Quality Requirements
1. **Section titles** must be meaningful (minimum 3 characters), not "Section 1", "P", "r", "e", "p", or single letters
2. **Item labels** must be specific (minimum 5 characters), not "Item 1", "Item 2", or "Complete this task"
3. **Item descriptions** must be useful, not generic placeholders like "This is item X" or "Follow this carefully"
4. **Summaries** must be grammatically correct and avoid awkward patterns

### What Gets Rejected
Checklists that contain:
- Single-character section titles (e.g., "P", "r", "e", "p")
- Generic patterns like "Section 1", "Item 1 in section 1"
- Placeholder text: "TODO", "Example item", "[fill in]"
- Generic descriptions: "Complete this task for section", "This is item X"
- Duplicate items in the same section
- Double periods or formatting errors in summary

If a checklist fails quality validation, the system attempts ONE repair pass with the AI, providing error details so the AI can generate better content. If repair also fails, user sees: "AI generated a checklist, but it did not meet GuideForge quality rules. Please try again or use Mock Preview."

### Known-Good Quality Test
Use this real test case to verify quality validation is working:

```
Input:
Title: Pre-launch checklist for an indie survival game update
Audience: Indie game developer
Purpose: Make sure a Steam early access patch is ready before release
Goal: Catch issues before launch and prepare rollback if needed
Use case: Steam early access patch launch
Additional context: QA, backups, patch notes, community announcement, monitoring, rollback planning

Expected output characteristics:
- Sections like: "QA & Regression Testing", "Build Backup & Rollback Preparation", "Patch Notes & Store Page", "Community Communication", "Launch Monitoring"
- NOT sections like: "P", "r", "e", "p", "Section 1", "Section 2"
- Items like: "Verify all critical bugs are resolved", "Back up the current live build", "Schedule community announcement posts"
- NOT items like: "Item 1 in section 1", "Complete this task for section 1", "Item 2 in section 2"
- Summary like: "This checklist helps indie developers prepare a Steam Early Access patch launch by covering QA, backups, patch notes, community messaging, and rollback planning."
- NOT summary like: "A comprehensive checklist for Catch issues before launch and prepare rollback if needed.. Use this for Steam early access patch launch."

Quality validation will REJECT:
✗ Any section title that is 1 character (P, r, e, p)
✗ Section titles matching /^Section \d+/i
✗ Item labels matching /^Item \d+/
✗ Item descriptions with generic phrases like "Complete this task for section"
✗ Summaries with ".." (double periods)

Quality validation will ACCEPT:
✓ Domain-specific section titles of 3+ characters
✓ Actionable item labels of 5+ characters, starting with verbs
✓ Specific, useful descriptions
✓ Grammatically correct summaries
```

## Security & Safety

1. **API Key Protection**
   - OPENAI_API_KEY only used server-side
   - Never exposed to browser or client
   - Requests must go through /api/guideforge/* endpoints

2. **Input Validation**
   - All intake fields validated on client and server
   - Title, audience, goal, purpose required
   - Numbers bounded (sections 1-8, items 1-12)

3. **Output Validation**
   - All AI responses validated before returning to client
   - Comprehensive schema checks
   - Invalid output rejected with error message
   - One automatic repair attempt if available

4. **Rate Limiting**
   - TODO: Implement per-user rate limiting
   - TODO: Add cost tracking before billing

5. **No Auto-Publishing**
   - Generated assets always saved as "draft"
   - Never automatically attached to networks
   - Never automatically published
   - User must explicitly save then manage

## Troubleshooting

### "AI generation is not configured"
- Check if OPENAI_API_KEY environment variable is set
- If local: add to `.env.local`, restart dev server
- If production: add to Vercel Environment Variables, redeploy
- Check exact env var name (must be `OPENAI_API_KEY`, not `OPENAI_KEY` or `OPENAI_API`)

### "AI generation failed. Please try again."
- Check OpenAI API status page
- Verify API key is valid (not expired or revoked)
- Check network connectivity
- Try again in a few moments
- Check server logs for more details

### "AI returned an incomplete checklist"
- AI output failed validation even after repair attempt
- Try with different parameters (fewer sections, different tone)
- Try Mock Preview to see if mock generation works
- Report as issue if consistently failing

### "AI returned invalid JSON"
- Should be rare with gpt-4-turbo + json_object format
- More likely if using gpt-3.5-turbo
- Consider switching to gpt-4 or gpt-4-turbo in config
- Try again, repair may have succeeded on retry

### Generation takes >30 seconds
- Server timeout (30s max)
- Check OpenAI API status
- Try with fewer sections/items
- Check for network issues
- Consider upgrading model for faster response

### Can't find generated checklist
- Navigate to /builder/assets
- Check if you're logged in (RLS prevents access without auth)
- Refresh page
- Check browser console for errors
- Verify save was successful (see proposal page confirmation)

## Future Enhancements

### Short Term
- [ ] Support other asset types with repair (Single Guide, Recipe, SOP)
- [ ] Better error messages with suggestions
- [ ] Rate limiting per user

### Medium Term
- [ ] Multiple model support (Claude, other providers)
- [ ] A/B testing different models
- [ ] Usage analytics
- [ ] Repair attempt metrics

### Long Term
- [ ] Credit/billing system
- [ ] Fine-tuned models for GuideForge domains
- [ ] AI-powered refinement (regenerate with feedback)
- [ ] Multi-model consensus for reliability


### File Structure

```
lib/guideforge/
├── ai-generation-types.ts       # Type definitions and interfaces
├── ai-generation-client.ts      # Unified client API
├── ai-generation-validation.ts  # Validation rules for each asset type
├── ai-prompts.ts                # Prompt contracts for AI
└── mock-asset-generator.ts      # Existing mock generation (preserved)

app/api/guideforge/
└── generate-checklist/
    └── route.ts                 # Server-side API for AI generation
```

### Generation Flow

```
User fills form
     ↓
[Mock or AI Provider selected]
     ├→ Mock: Client-side generation
     │        + 1000ms delay
     │        + Deterministic output
     │        + No API key needed
     │
     └→ AI: POST /api/guideforge/generate-checklist
             ↓
          [Validate OPENAI_API_KEY exists]
             ↓
          [Call OpenAI API with prompt]
             ↓
          [Parse JSON response]
             ↓
          [Validate schema]
             ├→ Valid: Return asset
             └→ Invalid: Return error
     ↓
[Validate in client]
     ├→ Valid: Show proposal review
     └→ Invalid: Show error, allow retry
     ↓
User edits title/summary (optional)
     ↓
User clicks "Save to Workspace"
     ↓
Save to public.asset_drafts (private, draft status)
     ↓
User can now view/edit/delete from /builder/assets
```

## Validation Rules

### Checklist Validation

Required:
- `assetType` = "checklist"
- `title` non-empty string
- `summary` non-empty string
- `sections` array with 1-8 sections
- Each section has `title` (non-empty) and `items` array (1-12 items)
- Each item has:
  - `label` (non-empty string)
  - `description` (string or null)
  - `required` (boolean)
- `completionCriteria` array
- `tags` array
- `assumptions` array
- `missingInfo` array

Limits (Phase 6 - Safety):
- Max 8 sections
- Max 12 items per section
- These are enforced in both AI prompt and validation

### Why Validation Matters

- Prevents malformed data from being shown to users
- Ensures consistent structure across all generated assets
- Allows future automation (e.g., converting to published guides)
- Catches AI hallucinations early

## API: POST /api/guideforge/generate-checklist

### Request

```json
{
  "title": "Pre-Launch Deployment Checklist",
  "audience": "DevOps engineers",
  "purpose": "Ensure nothing is missed before production launch",
  "goal": "Verify all systems are ready",
  "useCase": "Production deployments",
  "tone": "practical",
  "numberOfSections": 3,
  "itemsPerSection": 5,
  "optionalContext": "Blue-green deployment environment"
}
```

### Response (Success)

```json
{
  "success": true,
  "asset": {
    "assetType": "checklist",
    "title": "...",
    "summary": "...",
    "sections": [...],
    "completionCriteria": [...],
    "tags": [...],
    "assumptions": [...],
    "missingInfo": [...]
  }
}
```

### Response (Error - Missing Config)

```json
{
  "success": false,
  "error": "AI generation is not configured. Please set OPENAI_API_KEY environment variable."
}
```

### Response (Error - Invalid Output)

```json
{
  "success": false,
  "error": "Generated checklist validation failed: section[0].items[0].label must be a non-empty string"
}
```

## Configuration

### Environment Variables

**Server-side only:**
- `OPENAI_API_KEY` - OpenAI API key (used in /api/guideforge/*)

If not set:
- Mock generation still works (client-side)
- AI provider returns "not configured" error
- User can fallback to mock

### Cost Considerations (Future)

- TODO: Track API usage per user
- TODO: Enforce daily/monthly generation limits
- TODO: Build credit system
- For now: No cost tracking, unlimited generation if API key available

## UI Behavior

### On Checklist Generation Page

**Provider Selection:**
- "Mock Preview" tab: Fast, deterministic, no API key needed
- "AI Generate" tab: Real AI, requires OPENAI_API_KEY

**Loading State:**
- "Generating..." shows spinner
- 1000ms minimum delay for mock (for UX perception)
- Typical AI generation: 5-10 seconds

**Result:**
- Opens proposal review screen
- Shows all sections, items, completion criteria, assumptions
- User can edit title/summary before save
- User can go back to form and regenerate

**Error Handling:**
- Missing config: "AI generation is not configured yet."
- Invalid output: "Generated checklist did not match GuideForge structure. Try again."
- Network error: Clear error message with retry option
- User stays on form, can retry with same inputs

## Future Enhancements

### Short Term
- [ ] Support other asset types (Single Guide, Recipe, SOP, Troubleshooting Flow)
- [ ] AI refinement/regeneration (re-generate with different parameters)
- [ ] Better error messages with suggestions
- [ ] Rate limiting

### Medium Term
- [ ] Credit/billing system
- [ ] Usage analytics
- [ ] User feedback loop (was this checklist helpful?)
- [ ] A/B testing different AI providers
- [ ] Fine-tuned models for GuideForge domains

### Long Term
- [ ] AI patch planner (suggest updates to existing checklists)
- [ ] Real network skeleton AI (generate interconnected guides)
- [ ] Multi-step workflows with AI
- [ ] AI-powered search and discovery

## Testing

### Manual Testing Flow

1. **Mock Generation**
   - Navigate to /builder/generate-asset/checklist
   - Select "Mock Preview" tab
   - Fill form with any values
   - Click "Generate Checklist Proposal"
   - Should get deterministic checklist quickly
   - Can edit and save to workspace

2. **AI Generation (with API key)**
   - Set OPENAI_API_KEY=your_key
   - Navigate to /builder/generate-asset/checklist
   - Select "AI Generate" tab
   - Fill form
   - Click "Generate Checklist Proposal"
   - Should call /api/guideforge/generate-checklist
   - Should return valid checklist within 10 seconds
   - Should show proposal review

3. **AI Not Configured**
   - Unset OPENAI_API_KEY
   - Navigate to /builder/generate-asset/checklist
   - Select "AI Generate" tab
   - Fill form
   - Should show error: "AI generation is not configured"
   - Can fallback to "Mock Preview" tab

4. **Validation Failures**
   - If AI returns malformed JSON or invalid structure
   - Should show: "Generated checklist did not match GuideForge structure"
   - Check server logs for validation errors

### Integration with Asset Drafts

- Generated checklist saves to public.asset_drafts
- Appears in /builder/assets list
- Can be viewed, edited, deleted
- Private: only owner can access (RLS enforced)
- Status = "draft"
- Never published without explicit user action

## Code Examples

### Using AI Generation Client

```typescript
import { generateChecklist } from "@/lib/guideforge/ai-generation-client"

const response = await generateChecklist(
  {
    title: "Deploy Checklist",
    audience: "DevOps",
    purpose: "Before production release",
    goal: "Verify systems",
    useCase: "Deployments",
    tone: "practical",
    numberOfSections: 3,
    itemsPerSection: 5,
    optionalContext: "Blue-green deployment",
  },
  "ai" // or "mock"
)

if (response.success) {
  console.log("Generated:", response.asset.title)
} else {
  console.error("Error:", response.error)
}
```

### Validation Example

```typescript
import { validateGeneratedChecklist } from "@/lib/guideforge/ai-generation-validation"

const validation = validateGeneratedChecklist(aiResponse)
if (!validation.valid) {
  console.error("Validation failed:", validation.errors)
  // Show to user: "Invalid structure, try again"
}
```

## Security & Safety

1. **API Key Protection**
   - OPENAI_API_KEY only used server-side
   - Never exposed to browser
   - Requests must go through /api/guideforge/* endpoints

2. **Input Validation**
   - All intake fields validated on client and server
   - Title, audience, goal, purpose required
   - Numbers bounded (sections 1-8, items 1-12)

3. **Output Validation**
   - All AI responses validated before returning to client
   - Comprehensive schema checks
   - Invalid output rejected with error message

4. **Rate Limiting**
   - TODO: Implement per-user rate limiting
   - TODO: Add cost tracking before billing

5. **No Auto-Publishing**
   - Generated assets always saved as "draft"
   - Never automatically attached to networks
   - Never automatically published
   - User must explicitly save then manage

## Troubleshooting

### "AI generation is not configured"
- Check if OPENAI_API_KEY environment variable is set
- Restart Next.js dev server or redeploy
- Check Vercel environment variables if deployed

### "Generated checklist did not match structure"
- AI returned invalid JSON or missing fields
- Check server logs for detailed validation errors
- Retry with different parameters
- Report as issue if consistently failing

### Generation takes >30 seconds
- Server timeout (30s max)
- Check OpenAI API status
- Try with fewer sections/items
- Check for network issues

### Can't find generated checklist
- Navigate to /builder/assets
- Check if you're logged in (RLS prevents access without auth)
- Refresh page
- Check browser console for errors
