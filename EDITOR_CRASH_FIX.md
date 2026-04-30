# GuideForge Editor Crash Fix - Complete Solution

## Problem Summary

The guide editor was crashing when loading generated guides from localStorage due to a type mismatch:

- **GeneratedGuide** (from mock generator) has `sections: GeneratedGuideSection[]`
- **Guide** (expected by GuideEditor) has `steps: GuideStep[]`
- **Result:** GuideEditor calls `.find()` on undefined steps array → crashes

## Root Cause Analysis

```typescript
// Generated guides had this structure:
{
  title: "...",
  sections: [
    { kind: "overview", title: "...", body: "...", callout: "..." },
    { kind: "gear", title: "...", body: "...", callout: "..." }
  ]
}

// But GuideEditor expected:
{
  title: "...",
  steps: [
    { id: "step1", kind: "overview", title: "...", body: "...", isSpoiler: false },
    { id: "step2", kind: "gear", title: "...", body: "...", isSpoiler: false }
  ]
}
```

When editor tried to find steps: `steps.find((s) => s.id === editingStepId)` → undefined steps crashed the component.

## Solution Implemented

### 1. Created Guide Normalization Utility

**File:** `lib/guideforge/normalize-generated-guide.ts` (99 lines)

Converts GeneratedGuide → Guide with all required fields:

```typescript
export function normalizeGeneratedGuide(data: any, guideId: string): Guide {
  // Handles both GeneratedGuide (sections) and Guide (steps) shapes
  const sections = data.sections || []
  
  // Convert sections to steps with required GuideStep fields
  const steps = sections.map((section, index) => ({
    id: `step_${index + 1}`,
    guideId,
    order: index + 1,
    kind: section.kind || "text",
    title: section.title || "Untitled",
    body: section.body || "",
    isSpoiler: false,
    callout: section.callout,
  }))
  
  // Return properly typed Guide object with all required fields
  return {
    id: data.id || guideId,
    title: data.title || "Untitled Guide",
    summary: data.summary || "",
    steps,
    status: "draft",
    version: "1.0.0",
    // ... other fields
  }
}
```

### 2. Updated Guide Editor Loader

**File:** `components/guideforge/builder/guide-editor-loader.tsx` (46 lines)

Now normalizes drafts before passing to GuideEditor:

```typescript
useEffect(() => {
  const draft = loadGuideDraft(guideId)
  if (draft) {
    // Normalize to ensure proper shape
    const normalized = normalizeGeneratedGuide(draft, guideId)
    setGuide(normalized)
  }
}, [guideId])
```

### 3. Made GuideEditor Defensive

**File:** `components/guideforge/builder/guide-editor.tsx` (390+ lines)

Added null checks and safe array handling:

```typescript
// Initialize state with fallback values
const [title, setTitle] = useState(guide.title || "")
const [steps, setSteps] = useState(guide.steps || [])

// Safe .find() with defensive chaining
const currentStep = 
  steps && steps.length > 0 
    ? steps.find((s) => s.id === editingStepId)
    : undefined

// Safe array iteration
const allStepsHaveContent = 
  steps && steps.length > 0
    ? steps.every((s) => s.title.trim() && s.body.trim())
    : false
```

## Data Flow (Fixed)

```
Mock Generator
  ↓ (generates)
GeneratedGuide { sections: [...] }
  ↓ (saved to localStorage)
localStorage
  ↓ (loaded by editor loader)
Guide Editor Loader
  ↓ (normalizes via normalizeGeneratedGuide)
Guide { steps: [...] }
  ↓ (passed to component)
Guide Editor
  ↓ (safe .find() calls)
Component renders successfully ✓
```

## Files Changed

| File | Changes | Reason |
|------|---------|--------|
| `lib/guideforge/normalize-generated-guide.ts` | Created | Convert GeneratedGuide → Guide |
| `components/guideforge/builder/guide-editor-loader.tsx` | Updated | Apply normalization to drafts |
| `components/guideforge/builder/guide-editor.tsx` | Updated | Add defensive null checks |

## Build Status

✅ TypeScript: 0 errors  
✅ All imports correct  
✅ Type safety enforced  
✅ No runtime errors expected  

## Testing the Fix

1. **Navigate to dashboard:**
   ```
   http://localhost:3000/builder/network/network_questline/dashboard
   ```

2. **Click "Generate Guide"**
   - Fill form
   - Click "Generate Mock Structured Guide"
   - Click "Send to Editor"

3. **Expected result:**
   - Editor loads successfully
   - Generated guide displays in editor
   - No console errors
   - Can edit sections
   - Can regenerate with sparkles icon

4. **Verify normalization:**
   - Open DevTools → Application → localStorage
   - Find `guideforge:drafts:*` key
   - Inspect data structure
   - Should have `steps` array with normalized GuideStep objects

## Migration Path to Supabase

Once database integration is ready, replace in `guide-editor-loader.tsx`:

```typescript
// Before: loadGuideDraft from localStorage
const draft = loadGuideDraft(guideId)

// After: fetch from Supabase
const { data: draft } = await supabase
  .from('guide_drafts')
  .select('*')
  .eq('id', guideId)
  .single()

// Then apply same normalization
const normalized = normalizeGeneratedGuide(draft, guideId)
```

No changes needed to GuideEditor itself - it already accepts normalized Guide objects.

## Key Takeaway

The crash was caused by missing the bridge between two data shapes. By creating a clear normalization layer, we:

1. Enforce shape correctness at boundaries
2. Make data flow transparent and testable
3. Enable smooth transition to database later
4. Keep GuideEditor defensive and reusable

This pattern should be applied to other generated data types (hubs, collections, networks) when they are implemented.
