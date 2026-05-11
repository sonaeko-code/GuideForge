# API Key Check Stage - Variables Fixed

## Summary of Changes to `api_key_check` Stage

The `api_key_check` stage in the `debugGenerateOnly()` function now properly declares all variables upfront to prevent Temporal Dead Zone (TDZ) errors in minified code.

## Variable Declarations (Lines 186-192)

All debug tracking variables are declared at the function start, BEFORE any try/catch blocks:

```typescript
// API key debug variables - declared BEFORE any try/catch
let debugApiKeyPresent = false
let debugApiKeyLength = 0
let debugApiKeyMasked = "not_configured"
let debugApiKeyErrorDetail: string | null = null
```

## API Key Check Stage Implementation (Lines 259-273)

```typescript
// STAGE: api_key_check - ALL VARIABLES DECLARED BEFORE THIS BLOCK
debugStage = "api_key_check"
const rawOpenAiApiKey = process.env.OPENAI_API_KEY ?? ""
debugApiKeyPresent = rawOpenAiApiKey.length > 0
debugApiKeyLength = rawOpenAiApiKey.length
debugApiKeyMasked = debugApiKeyPresent
  ? `${rawOpenAiApiKey.slice(0, 7)}...${rawOpenAiApiKey.slice(-4)}`
  : "not_configured"

if (!debugApiKeyPresent) {
  debugApiKeyErrorDetail = "OPENAI_API_KEY is not configured"
  throw new Error(debugApiKeyErrorDetail)
}
```

## Error Handler (Lines 312-341)

The catch block safely references all variables since they're declared outside the try/catch:

```typescript
catch (err) {
  debugElapsedMs = Date.now() - startTime

  const errorMsg = err instanceof Error ? err.message : String(err)
  console.error(`[v0] Debug stage '${debugStage}' failed:`, err)

  return NextResponse.json(
    {
      success: false,
      stage: debugStage,  // ✓ Safe: declared upfront
      elapsedMs: debugElapsedMs,  // ✓ Safe: declared upfront
      apiKeyPresent: debugApiKeyPresent,  // ✓ Safe: declared upfront
      apiKeyLength: debugApiKeyLength,  // ✓ Safe: declared upfront
      apiKeyMasked: debugApiKeyMasked,  // ✓ Safe: declared upfront
      apiKeyErrorDetail: debugApiKeyErrorDetail,  // ✓ Safe: declared upfront
      // ... rest of response
    },
    { status: 200 }
  )
}
```

## Variables Used in api_key_check Stage

| Variable | Lines | Usage | Type |
|----------|-------|-------|------|
| `debugApiKeyPresent` | 189, 264, 320 | Set in try, returned in catch/success | `boolean` |
| `debugApiKeyLength` | 190, 265, 321 | Set in try, returned in catch/success | `number` |
| `debugApiKeyMasked` | 191-194, 266-269, 322 | Set in try, returned in catch/success | `string` |
| `debugApiKeyErrorDetail` | 192, 271, 323 | Set in error case, returned in catch | `string \| null` |

## Why This Works

1. **Upfront Declaration**: All variables are declared with safe defaults at function start
2. **Assignment in Try Block**: Only assignments (not declarations) happen inside try block
3. **Safe in Catch Block**: Since variables exist in outer scope, catch block can reference them without TDZ
4. **Minifier Safe**: Even when minified to single letters, variable references are still valid
5. **No Side Effects**: The `rawOpenAiApiKey` const is local to try block and never causes TDZ

## Result

✓ No "Cannot access variable before initialization" errors  
✓ All debug info available in error responses  
✓ API key never exposed in logs (only masked version)  
✓ Clear error messages at each generation stage  
✓ Type-safe and works in minified production code
