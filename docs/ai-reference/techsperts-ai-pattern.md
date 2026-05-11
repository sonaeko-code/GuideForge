# Techsperts AI Pattern

## Overview

Techsperts implements a **verified-first AI architecture** that prioritizes user trust through a tiered approach: verified knowledge base guides first, then AI-generated provisional guides only when needed.

## Architecture Flow

### 1. Verified-First Lookup (Primary Path)

```
FlowManager receives diagnostic input
  ↓
Call getBestGuidedFixPayloadFromDiagnosis()
  ↓
Search verified KB guides by diagnosis context
  ↓
If found: Return KB guide (source: "kb") with verification metadata
If not found: Proceed to provisional generation
```

**Key Point:** The system exhausts verified content before turning to AI. This establishes trust hierarchy.

### 2. Provisional Guide Generation (Secondary Path)

```
No verified KB guide exists
  ↓
Call generateProvisionalGuide()
  ↓
Check local/provisional cache using findReusableProvisional()
  ↓
If cache hit: Return cached guide (source: "provisional")
If cache miss: Call Edge Function /functions/v1/generate-solution-steps
  ↓
AI returns raw shape (suggestedTitle, steps with body/tags)
  ↓
Frontend maps to GuidedFixPayload
  ↓
Mark source: "provisional" (not auto-verified)
```

**Key Point:** Caching prevents redundant AI calls. AI output is explicitly marked as provisional.

## Data Shapes

### AI Input
```typescript
diagnosis: {
  symptom: string
  errorCode?: string
  context?: Record<string, any>
  // ... diagnostic fields
}
```

### AI Output (Simple Shape)
```typescript
{
  suggestedTitle?: string
  steps?: Array<{
    title: string
    body: string
    tags?: {
      warning?: boolean
      requiresTool?: boolean
      escalateIfFailed?: boolean
    }
  }>
}
```

### Frontend Mapped Payload (GuidedFixPayload)
```typescript
{
  source: "kb" | "provisional"
  title: string
  summary: string
  steps: Array<{
    title: string
    body: string
    warning?: boolean
    requiresTool?: boolean
    escalateIfFailed?: boolean
  }>
  estimatedTime?: number
  difficulty?: "easy" | "medium" | "hard"
  warnings: string[]
  requiredTools: string[]
  confidence: number // 0-1
  // KB guides include verification:
  verifiedAt?: timestamp
  verifiedBy?: string
  // Provisional guides include provenance:
  generatedAt?: timestamp
  cacheKey?: string
}
```

## Trust Model

| Source | Trust Level | Workflow | User Action |
|--------|-------------|----------|-------------|
| KB Guide | High (Verified) | Automatic lookup | Follow guide as-is |
| Provisional (Cached) | Medium | From local cache | Follow, provide feedback |
| Provisional (AI-Generated) | Medium | Just generated | Review before use |

## Key Design Patterns

1. **Cache Before Regenerating**
   - Always check local/provisional cache first
   - Prevents unnecessary API calls
   - Reduces latency and cost

2. **Mark AI Output Explicitly**
   - `source: "provisional"` signals unverified content
   - Frontend can style/warn users accordingly
   - Tracks provenance for review/promotion later

3. **Simple AI Shape**
   - AI returns minimal JSON (title, steps)
   - Rich mapping happens on frontend
   - Reduces prompt complexity and token usage

4. **No Auto-Publishing**
   - AI output is draft/proposal only
   - Users review before use
   - Can be promoted to KB or discarded

## Why This Pattern Works

- **Trust First:** Verified content is the default, reducing risk
- **Cost Efficient:** Caching + simple AI shape keep API costs low
- **User Control:** AI output is clearly marked and reviewable
- **Reusable:** Provisional guides cache enables pattern recognition
- **Transparent:** Source attribution (KB vs. Provisional) is explicit

## Edge Case Handling

- **No KB, No Cache:** Generate new provisional guide
- **Multiple KB Matches:** Return highest confidence match
- **AI Fails:** Return error, surface cache options or manual guidance
- **User Feedback:** Feedback on provisional guides informs future KB curation
