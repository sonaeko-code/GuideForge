# Supabase Implementation Guide - Quick Start

## What Was Done

1. **Installed @supabase/supabase-js** - Browser-safe Supabase client library
2. **Created supabase-client.ts** - Initializes browser client with anon key
3. **Created SupabasePersistenceAdapter** - Full persistence implementation with fallback
4. **Updated factory function** - Auto-detects Supabase and selects appropriate adapter
5. **Zero component changes** - Existing code works transparently

## How It Works

When a user creates/edits a guide draft:

1. **Component calls**: `saveGuideDraftSync(guide)`
2. **Storage layer calls**: Adapter's `saveDraft()` method
3. **Factory selects**:
   - If Supabase env vars configured → `SupabasePersistenceAdapter`
   - Else → `LocalStoragePersistenceAdapter`
4. **SupabasePersistenceAdapter**:
   - Saves to guides table (INSERT OR UPDATE)
   - Saves to guide_steps table
   - Falls back to localStorage on any error
   - Returns draftId for routing

## Setup Steps (For Vercel Deployment)

1. **Ensure Supabase project exists** (created via Phase 1 SQL execution)
2. **Run Phase 1 SQL** (guideforge_phase1_schema.sql + guideforge_phase1_seed.sql)
3. **Add environment variables to Vercel project**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```
4. **Redeploy** - Next.js will pick up env vars automatically

## Verification

**Check if Supabase is active:**
1. Create a draft in /builder
2. Open browser console (F12)
3. Look for: `[v0] Successfully saved guide to Supabase: <guide-id>`
4. If not present → Check env vars are set
5. If error → Check browser console for details

**Fallback to localStorage:**
- If env vars not set: All saves go to localStorage (no error)
- If Supabase throws error: Falls back to localStorage with warning
- localStorage always persists as backup

## Key Implementation Details

### Browser-Safe Only
- Uses NEXT_PUBLIC_SUPABASE_URL (public)
- Uses NEXT_PUBLIC_SUPABASE_ANON_KEY (public)
- No private/service role keys
- No backend secrets exposed

### Error Resilience
```typescript
try {
  await supabase.from("guides").upsert(guideData)
  return draftId // Success
} catch (error) {
  return this.localStorageAdapter.saveDraftSync(guide) // Fallback
}
```

### Data Mapping
LocalStorage → Supabase (snake_case conversion):
```
guide.collectionId → collection_id
guide.status → status
guide.verification → verification_status
guide.createdAt → created_at
guide.updatedAt → updated_at
guide.publishedAt → published_at
guide.steps → guide_steps (separate table, order_index)
```

### Session Handling
- Phase 1: No auth required (RLS allows public inserts)
- Phase 2: Will use `await getSupabaseSession()` for user_id

## File Structure

```
lib/guideforge/
├── supabase-client.ts              [NEW] Browser Supabase client
├── supabase-persistence.ts         [UPDATED] Full implementation
├── persistence.ts                  [UPDATED] Factory with auto-detect
├── guide-drafts-storage.ts         [UNCHANGED] Sync/async helpers
├── types.ts                        [UNCHANGED] Guide interface
└── mock-data.ts                    [UNCHANGED] Test data
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Drafts not in Supabase | Check env vars set in Vercel dashboard |
| Slow saves | Supabase will fallback to localStorage automatically |
| Auth required error | Phase 1 uses RLS policies that allow public writes |
| Console warnings | Check browser console for [v0] messages |

## Testing

**Manual test:**
1. Set env vars in .env.local or Vercel project
2. Run `npm run dev`
3. Create draft in /builder
4. Open Supabase dashboard → guides table
5. Should see new guide row with updated_at = now

**Automated (Phase 2):**
- Unit tests for SupabasePersistenceAdapter
- Integration tests with test Supabase project
- E2E tests for full workflow

## Transition to Phase 2

**No code changes needed** - Just add:
1. Supabase Auth integration
2. Update auth_user_id in profiles table
3. Create proper RLS policies
4. Remove localStorage fallback from production
5. Add server-side API routes for secure operations
