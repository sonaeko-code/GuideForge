# GuideForge Checklist Debug Endpoint - TDZ Fix Summary

## Problem Statement
The debug generation endpoint was throwing a **Temporal Dead Zone (TDZ)** error:
```
Error: Cannot access 'i' before initialization
Detail: N/A
Stage: api_key_check
```

This occurred in the minified production build where the variable `rawOpenAiApiKey` was minified to `i`. The variable was declared inside a `try` block but referenced in the `catch` block or error object, creating a TDZ violation.

## Root Cause
The `api_key_check` stage had this problematic pattern:
```javascript
try {
  const rawOpenAiApiKey = process.env.OPENAI_API_KEY ?? ""
  // ... use rawOpenAiApiKey
} catch (err) {
  return { detail: rawOpenAiApiKey }  // ❌ References const from try block
}
```

When minified, `rawOpenAiApiKey` becomes a single letter (e.g., `i`), and the catch block tries to reference it before it's accessible, causing TDZ.

## Solution Implemented

### 1. Added Debug Endpoint: `/api/guideforge/generate-checklist?debug=true`

Created a new `debugGenerateOnly()` function that traces through generation stages:
- **body_parse**: Validate required fields
- **input_clamp**: Constrain array sizes (max 8 sections, 12 items/section)
- **prompt_build**: Generate the AI prompt
- **message_build**: Format messages for OpenAI
- **api_key_check**: Verify OPENAI_API_KEY (✓ **FIXED**)
- **openai_call**: Call OpenAI API with timing
- **parse**: Parse JSON response
- **schema_validation**: Validate against GeneratedChecklist schema
- **quality_validation**: Validate checklist quality constraints
- **success**: All stages passed

### 2. Fixed `api_key_check` Stage - Variables Declared Upfront

**All debug tracking variables are now declared BEFORE the try/catch block:**

```javascript
// Initialize BEFORE try/catch - prevents TDZ in error handling
let debugApiKeyPresent = false
let debugApiKeyLength = 0
let debugApiKeyMasked = "not_configured"
let debugApiKeyErrorDetail: string | null = null

try {
  // Get the actual API key
  const rawOpenAiApiKey = process.env.OPENAI_API_KEY ?? ""
  
  // Update tracking variables (not contained in try block scope)
  debugApiKeyPresent = rawOpenAiApiKey.length > 0
  debugApiKeyLength = rawOpenAiApiKey.length
  debugApiKeyMasked = debugApiKeyPresent
    ? `${rawOpenAiApiKey.slice(0, 7)}...${rawOpenAiApiKey.slice(-4)}`
    : "not_configured"

  if (!debugApiKeyPresent) {
    debugApiKeyErrorDetail = "OPENAI_API_KEY is not configured"
    throw new Error(debugApiKeyErrorDetail)
  }
} catch (err) {
  // ✓ All variables safely accessible - declared outside try block
  return {
    apiKeyPresent: debugApiKeyPresent,
    apiKeyLength: debugApiKeyLength,
    apiKeyMasked: debugApiKeyMasked,
    apiKeyErrorDetail: debugApiKeyErrorDetail,
    error: errorMsg,
  }
}
```

### 3. Variables Modified in api_key_check Stage

**Moved from problematic scope to safe declaration:**

| Variable | Type | Purpose | Safe Default |
|----------|------|---------|--------------|
| `debugApiKeyPresent` | `boolean` | Whether API key is configured | `false` |
| `debugApiKeyLength` | `number` | Length of API key (0 if not configured) | `0` |
| `debugApiKeyMasked` | `string` | Masked key display (never exposes full key) | `"not_configured"` |
| `debugApiKeyErrorDetail` | `string \| null` | Error reason if check fails | `null` |

**Security Note:** The actual `rawOpenAiApiKey` is kept local to the try block and never exposed. Only the masked version (`sk_test...XXXX` format) is returned in debug output.

## Debug Response Format

```javascript
{
  // Stage tracking
  success: boolean,
  stage: string,  // Which stage failed (or "success")
  
  // Timing
  elapsedMs: number,
  openaiElapsedMs?: number,
  model: string,
  
  // Request info
  promptLength: number,
  contentLength?: number,
  
  // ✓ NEW: API Key Debug (safe to reference in all paths)
  apiKeyPresent: boolean,
  apiKeyLength: number,
  apiKeyMasked: string,
  apiKeyErrorDetail?: string,
  
  // Parse results
  parseSuccess: boolean,
  parseError?: string,
  
  // Validation results
  schemaValidValid: boolean,
  schemaValidErrors: string[],
  qualityValidValid: boolean,
  qualityValidErrors: string[],
  
  // Result
  asset?: GeneratedChecklist,
  error: string,
  detail: string,
}
```

## Testing

The fix ensures:
- ✓ No temporal dead zone errors in minified code
- ✓ All variables declared before try/catch blocks that reference them
- ✓ API key never logged in full
- ✓ Clear error messages at each stage
- ✓ Debug response always includes complete stage information
- ✓ Safe defaults for all tracking variables

## Integration

To call the debug endpoint from the UI, add a debug button that POSTs to:
```
POST /api/guideforge/generate-checklist?debug=true
```

With the same request body as normal generation:
```javascript
{
  title: string,
  audience: string,
  purpose: string,
  goal: string,
  tone?: string,
  numberOfSections?: number,
  itemsPerSection?: number,
  useCase?: string,
  optionalContext?: string,
}
```

## File Modified
- `/vercel/share/v0-project/app/api/guideforge/generate-checklist/route.ts`
  - Added `debugGenerateOnly()` function (~180 lines)
  - Updated `POST()` to route `?debug=true` requests to debug handler
  - Fixed api_key_check stage variables to be declared upfront

## Verification
- ✓ TypeScript compilation successful
- ✓ Next.js build successful
- ✓ No new warnings or errors
- ✓ All existing functionality preserved
- ✓ Debug endpoint ready for UI integration
