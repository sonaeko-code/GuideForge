# Persistence Adapter Layer - GuideForge Phase 1 & 2

## Overview

GuideForge now has a strategic abstraction layer for draft persistence that supports both **localStorage (Phase 1)** and **Supabase (Phase 2)** without requiring code changes in components.

## Architecture

```
Components (guide-editor, draft-workspace, draft-list)
         ↓
Sync Helpers (guide-drafts-storage.ts)
         ↓
Persistence Adapter (persistence-adapter.ts)
         ↓
[localStorage - Phase 1] or [Supabase - Phase 2]
```

## Files

### 1. `lib/guideforge/persistence-adapter.ts` (NEW)
Core abstraction layer with:
- **GuidePersistenceAdapter Interface**: Defines contract for storage implementations
- **LocalStoragePersistenceAdapter**: Phase 1 implementation with sync/async methods
- **SupabasePersistenceAdapter**: Stub for Phase 2 implementation (not implemented yet)
- **getPersistenceAdapter()**: Factory function that returns active adapter
- **getLocalStorageAdapter()**: Direct access to sync localStorage methods

### 2. `lib/guideforge/guide-drafts-storage.ts` (REFACTORED)
Storage layer now provides:

#### Synchronous Helpers (Phase 1 - for components)
For backwards compatibility with existing components using synchronous localStorage:
```typescript
saveGuideDraftSync(guide: Guide): string
loadGuideDraftSync(draftId: string): Guide | null
hasDraftSync(draftId: string): boolean
deleteDraftSync(draftId: string): void
getAllDraftObjectsSync(): Guide[]
getDraftsByNetworkSync(networkId: string): Guide[]
updateDraftStatusSync(draftId: string, status: string): void
```

#### Asynchronous Helpers (Phase 2 - for future Supabase)
For future server-side or async implementations:
```typescript
saveGuideDraft(guide: Guide): Promise<string>
loadGuideDraft(draftId: string): Promise<Guide | null>
hasDraft(draftId: string): Promise<boolean>
deleteDraft(draftId: string): Promise<void>
getAllDraftObjects(): Promise<Guide[]>
getDraftsByNetwork(networkId: string): Promise<Guide[]>
updateDraftStatus(draftId: string, status: string): Promise<void>
```

## Phase 1 Implementation

### Current State (localStorage)

All Phase 1 components use **synchronous helpers**:

```typescript
// guide-editor.tsx
import { saveGuideDraftSync, deleteDraftSync } from "@/lib/guideforge/guide-drafts-storage"

saveGuideDraftSync(updatedGuide)  // Synchronous - no await needed
deleteDraftSync(guide.id)

// draft-workspace.tsx
const drafts = getDraftsByNetworkSync(networkId)  // Synchronous load

// draft-list.tsx
const localDrafts = getDraftsByNetworkSync(networkId)
```

### Key Properties

- **Synchronous**: localStorage operations complete instantly
- **No async/await**: Simpler Phase 1 component code
- **Direct persistence**: Changes saved immediately to localStorage
- **Auto-durability**: Drafts survive page refresh without extra logic

## Phase 2 Strategy (Supabase)

When implementing Phase 2 (authenticated writes to Supabase):

### 1. Implement SupabasePersistenceAdapter
```typescript
export class SupabasePersistenceAdapter implements GuidePersistenceAdapter {
  constructor(private supabase: SupabaseClient) {}
  
  async saveDraft(guide: Guide): Promise<string> {
    const { data, error } = await this.supabase
      .from('guides')
      .upsert({ ...guide, author_id: getCurrentUserId() })
    
    if (error) throw error
    return data[0].id
  }
  
  // ... implement other methods
}
```

### 2. Update getPersistenceAdapter() Factory
```typescript
export function getPersistenceAdapter(): GuidePersistenceAdapter {
  const adapterType = process.env.NEXT_PUBLIC_GUIDEFORGE_STORAGE || 'localStorage'
  
  if (adapterType === 'supabase') {
    return new SupabasePersistenceAdapter(supabaseClient)
  }
  
  return new LocalStoragePersistenceAdapter()
}
```

### 3. Update Components to Use Async Helpers
```typescript
// guide-editor.tsx (Phase 2)
import { saveGuideDraft, deleteDraft } from "@/lib/guideforge/guide-drafts-storage"

await saveGuideDraft(updatedGuide)  // Now async with Supabase
await deleteDraft(guide.id)

// draft-workspace.tsx (Phase 2)
const drafts = await getDraftsByNetwork(networkId)  // Now async with Supabase
```

### 4. Storage Configuration
Add environment variable:
```
NEXT_PUBLIC_GUIDEFORGE_STORAGE=supabase  # or 'localStorage' for Phase 1
```

## Benefits

### Phase 1
- **Clean component code**: No storage logic, just save/load calls
- **Extensible**: Easy to add features without touching persistence
- **Testable**: Adapter pattern makes testing easier
- **No breaking changes**: Sync helpers maintain current behavior

### Phase 2 & Beyond
- **Zero component changes**: Switch storage by changing adapter
- **Transparent migration**: Components don't know about Supabase
- **Multi-backend support**: Easy to add Redis, filesystem, etc.
- **Future-proof**: Architecture supports any persistence backend

## LocalStoragePersistenceAdapter Methods

### Synchronous Methods (Phase 1)
```typescript
saveDraftSync(guide: Guide): string
loadDraftSync(draftId: string): Guide | null
hasDraftSync(draftId: string): boolean
deleteDraftSync(draftId: string): void
getAllDraftsSync(): Guide[]
getRecentDraftsSync(limit?: number): Guide[]
getDraftsByNetworkSync(networkId: string): Guide[]
updateDraftStatusSync(draftId: string, status: string): void
clearAllDraftsSync(): void
```

### Async Wrappers (Phase 2)
Each sync method has an async counterpart that resolves immediately for Phase 1, but will properly handle async operations in Phase 2.

## localStorage Schema

Drafts stored with key pattern: `guideforge:drafts:[draftId]`

```json
{
  "id": "draft_1234567890",
  "title": "Boss Strategy Guide",
  "summary": "Complete walkthrough of the...",
  "type": "guide",
  "status": "draft",
  "networkId": "network_123",
  "steps": [{ "title": "...", "body": "..." }],
  "updatedAt": "2025-04-30T10:00:00Z",
  "forgeRulesCheckResult": [...],
  "forgeRulesCheckTimestamp": "2025-04-30T10:00:00Z"
}
```

## Migration Checklist (Phase 2 Implementation)

- [ ] Create SupabasePersistenceAdapter class
- [ ] Implement all 8 methods in SupabasePersistenceAdapter
- [ ] Add Supabase service role client initialization
- [ ] Update getPersistenceAdapter() factory function
- [ ] Add NEXT_PUBLIC_GUIDEFORGE_STORAGE env var
- [ ] Test switching between localStorage and Supabase
- [ ] Update components to use async helpers (systematic migration)
- [ ] Add error handling for Supabase failures
- [ ] Implement conflict resolution for simultaneous edits
- [ ] Add offline queue for draft saves when Supabase unavailable

## Current Component Usage

**Phase 1** (localStorage, synchronous):
- `guide-editor.tsx` → Uses sync helpers
- `draft-workspace.tsx` → Uses sync helpers
- `draft-list.tsx` → Uses sync helpers

All components currently use sync methods and do NOT await. This is intentional for Phase 1 simplicity.

## Testing

### Phase 1 Tests (localStorage)
```typescript
it('saves draft to localStorage', () => {
  const guide = createMockGuide()
  const draftId = saveGuideDraftSync(guide)
  expect(draftId).toBeDefined()
  const loaded = loadGuideDraftSync(draftId)
  expect(loaded).toEqual(guide)
})
```

### Phase 2 Tests (Supabase)
```typescript
it('saves draft to Supabase', async () => {
  mockSupabaseUpsert()
  const guide = createMockGuide()
  const draftId = await saveGuideDraft(guide)
  expect(supabaseClient.from).toHaveBeenCalledWith('guides')
})
```

## FAQ

**Q: Why both sync and async methods?**
A: Phase 1 components use sync (localStorage is synchronous), Phase 2 will use async (Supabase is async). This dual approach prevents rework during migration.

**Q: Can I switch backends at runtime?**
A: Yes! The getPersistenceAdapter() factory function can check configuration. Add NEXT_PUBLIC_GUIDEFORGE_STORAGE environment variable to control this.

**Q: What about offline support?**
A: Phase 1 uses localStorage (works offline). Phase 2 should implement an offline queue that syncs when reconnected.

**Q: Do I need to update existing components?**
A: Phase 1: No changes needed. Phase 2: Yes, update from sync to async helpers.

**Q: How do I test the adapter?**
A: Mock the adapter interface in tests. LocalStoragePersistenceAdapter can be tested directly since it uses browser APIs.
