# Supabase Browser Persistence for GuideForge

## Status: IMPLEMENTED & READY

**TypeScript**: 0 errors
**Supabase Client**: Installed and configured
**Implementation**: Complete with localStorage fallback

## Overview

GuideForge builder now supports persistent draft storage via Supabase with automatic fallback to localStorage. The implementation uses browser Supabase client (anon key only) and respects the Phase 1 SQL schema.

## Architecture

```
guide-editor (sync helpers)
    ↓
guide-drafts-storage (sync/async helpers)
    ↓
persistence.ts (factory auto-detection)
    ↓
[Supabase adapter] or [localStorage adapter]
    ↓
[Supabase (guides/guide_steps tables)] or [localStorage]
```

## Files Created/Modified

### 1. `lib/guideforge/supabase-client.ts` (NEW - 53 lines)
Browser Supabase client initialization:
```typescript
- Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from environment
- Initializes browser-safe Supabase client
- Exports isSupabaseConfigured() for runtime checks
- Exports getSupabaseSession() for auth status
- NO service role keys, NO secrets exposed
```

### 2. `lib/guideforge/supabase-persistence.ts` (IMPLEMENTED - 385 lines)
Full SupabasePersistenceAdapter implementation:
- **saveDraft()**: Inserts/updates guide + steps to Supabase, falls back to localStorage
- **loadDraft()**: Fetches guide + steps from Supabase, reconstructs Guide object
- **getDraftsByNetwork()**: Queries guides by networkId with full step data
- **getAllDrafts()**: Fetches all guides with related steps
- **deleteDraft()**: Removes from both Supabase and localStorage
- **clearAllDrafts()**: Clears all guides (destructive operation)
- **updateDraftStatus()**: Updates guide status field
- All methods include try/catch error handling with localStorage fallback

### 3. `lib/guideforge/persistence.ts` (UPDATED)
Factory function now auto-detects Supabase:
```typescript
getPersistenceAdapter() {
  if (NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_ANON_KEY configured) {
    return new SupabasePersistenceAdapter() // With fallback to localStorage
  }
  return new LocalStoragePersistenceAdapter()
}
```

### 4. `lib/guideforge/guide-drafts-storage.ts` (UNCHANGED)
- Sync helpers remain unchanged for Phase 1 compatibility
- Async helpers available for future use
- Factory internally handles adapter selection

## Database Schema Integration

Saves to existing Phase 1 tables:

```sql
INSERT INTO guides (
  id, collection_id, title, slug, summary, type, difficulty, 
  version, author_id, status, verification_status, created_at, updated_at
) VALUES (...)

INSERT INTO guide_steps (
  id, guide_id, title, body, kind, order_index, created_at, updated_at
) VALUES (...)
```

All fields map correctly to Phase 1 schema with snake_case conversion.

## Environment Variables

**Required (browser-safe, no secrets):**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (anon/public key only)
```

**NOT used:**
- No SUPABASE_SERVICE_ROLE_KEY
- No private API keys
- No authentication required for Phase 1 (RLS policies handle access)

## Runtime Behavior

### When Supabase is configured:
1. Draft saves go to both Supabase (primary) and localStorage (backup)
2. Draft loads attempt Supabase first, fall back to localStorage on error
3. Network queries fetch from Supabase with RLS filtering
4. Failed Supabase operations log warnings but continue with localStorage

### When Supabase is NOT configured:
1. All operations use localStorage only
2. No Supabase network calls attempted
3. Completely transparent to end users

### Error Handling:
- Network errors: Fallback to localStorage with console warnings
- Missing Supabase config: Silently use localStorage
- Parse errors: Fall back to localStorage with detailed logs
- Session not available: Use localStorage (Phase 1 mode)

## Component Usage - NO CHANGES REQUIRED

Existing components continue to work unchanged:
```typescript
// guide-editor.tsx
import { saveGuideDraftSync, deleteDraftSync } from "@/lib/guideforge/guide-drafts-storage"

saveGuideDraftSync(guide) // Sync call - adapter selection handled internally
deleteDraftSync(guideId)  // Sync call - works with Supabase if available
```

The persistence layer is completely abstracted. Components don't need to know whether data goes to Supabase or localStorage.

## Testing Checklist

- [x] TypeScript compilation passes (0 errors)
- [x] Supabase client initializes with env vars
- [x] Factory detects Supabase configuration
- [x] localStorage adapter remains functional
- [x] Error handling includes proper fallbacks
- [x] Guide structure maps correctly to Supabase schema
- [x] No service role keys exposed
- [x] No breaking changes to components

## Phase 1 vs Phase 2

**Phase 1 (Current):**
- Supabase available but optional
- localStorage is always used as backup
- No authentication required
- Draft data persists to guides table if Supabase configured
- Public QuestLine pages unchanged

**Phase 2 (Future):**
- Require Supabase authentication (migrate to auth_user_id)
- Implement proper RLS policies
- Remove localStorage fallback
- Add server-side API routes for secure writes
- Replace service role placeholder

## Troubleshooting

**Drafts not persisting to Supabase:**
1. Check NEXT_PUBLIC_SUPABASE_URL is set correctly
2. Check NEXT_PUBLIC_SUPABASE_ANON_KEY is valid
3. Open browser console for warnings/errors
4. Drafts should still persist to localStorage
5. Check Supabase guides table has correct RLS policies

**Slow draft loading:**
1. If Supabase queries are slow, localStorage fallback handles it
2. Check browser Network tab for Supabase request time
3. Consider connection quality

**Cannot see drafts from another browser:**
1. Phase 1 doesn't share across browsers (no auth)
2. Each browser has its own localStorage
3. Supabase data is there but RLS may restrict access without auth
4. Phase 2 will fix this with proper authentication

## Next Steps (Phase 2)

1. Add Supabase Auth integration
2. Migrate profiles table to auth.users linkage
3. Update RLS policies for authenticated users
4. Implement server-side API routes for secure writes
5. Remove localStorage fallback in production
6. Add collaborative features (shared drafts)

## Files Summary

- **supabase-client.ts**: 53 lines - Browser client init
- **supabase-persistence.ts**: 385 lines - Full Supabase adapter implementation
- **persistence.ts**: Updated factory function
- **guide-drafts-storage.ts**: Unchanged sync/async helpers
- **No changes to components**: Completely transparent
