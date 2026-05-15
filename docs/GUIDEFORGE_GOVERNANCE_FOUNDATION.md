# GuideForge Governance Foundation (Lane 2A)

## Overview

Lane 2A establishes the persistence layer and UI foundation for GuideForge network governance. This enables networks to define and enforce standards around guide quality, review processes, and contributor access.

**Key Achievement:** Forge Rules selected during network creation now persist and can be viewed/edited from the network settings page.

## What's Included

### 1. **Persistent Governance Settings**

Network governance settings are now stored in the database and survive page refreshes:

- **Verification Level**: How strictly guides must be reviewed before verified status (open | moderated | verified-only)
- **Content Standard**: Quality expectations for guides (lenient | standard | strict)
- **AI Policy**: How AI-generated content is handled (allowed | disclosed | disallowed)
- **Trust Badges**: Which badges display on published guides (verified, last updated, author)
- **Contributor Mode**: Who can submit guides (owner-only | invite | open)

**Data Model:**
```typescript
interface NetworkGovernanceSettings {
  verificationLevel: 'open' | 'moderated' | 'verified-only'
  contentStandard: 'lenient' | 'standard' | 'strict'
  aiPolicy: 'allowed' | 'disclosed' | 'disallowed'
  trustBadges: {
    showVerified: boolean
    showLastUpdated: boolean
    showAuthor: boolean
  }
  contributorMode: 'owner-only' | 'invite' | 'open'
  ruleEnableMap?: Record<string, boolean>
}
```

### 2. **Network Creation Flow**

During network wizard Step 4 (Forge Rules), users select governance settings which are now persisted:

1. User fills Forge Rules step with verification level, content standard, AI policy, badges, contributor mode
2. Settings saved to `WizardDraft.forgeRules`
3. When creating network, settings passed to `createNetworkScaffold` via `networkGovernanceSettings` override
4. Settings stored in Supabase `networks.governance_settings` JSON column
5. On network load, settings hydrate from database

### 3. **Governance Settings Editor**

Network owners can view and edit governance settings from Network Settings page:

**Location:** `/builder/network/{networkId}/settings`

**Features:**
- View current governance settings
- Edit all five governance dimensions
- Cancel/Save controls
- Success/error feedback
- Persists to Supabase via `updateNetworkGovernance()`

**Component:** `GovernanceSettingsEditor` in `components/guideforge/builder/governance-settings-editor.tsx`

### 4. **Dashboard Governance Summary**

Networks dashboard now displays a compact governance overview card:

**Location:** Top of `/builder/network/{networkId}/dashboard`

**Displays:**
- Verification level badge
- Content standard badge
- AI policy badge
- Contributor mode badge
- Enabled trust badges

**Component:** `GovernanceSummary` in `components/guideforge/builder/governance-summary.tsx`

### 5. **Standardized Guide Status Language**

Guide statuses are now consistently named across the app:

- **Draft**: Private workspace item, not public
- **Pending Review** (maps to `in-review` and `ready`): Submitted for review, not public unless rules allow provisional display
- **Published**: Visible on public network
- **Forged**: Higher-trust verified status (placeholder, not automatic)

**Usage:**
```typescript
import { getGuideStatusLabel, isGuidePublic } from '@/lib/guideforge/guide-status-labels'

const label = getGuideStatusLabel('draft')
// { label: 'draft', displayName: 'Draft', description: '...', isPublic: false }

const isPublic = isGuidePublic('published')
// true
```

### 6. **Forged Badge Placeholder**

A `ForgedBadge` component exists as a UI placeholder for guides with forged/verified status. Currently display-only; future phases will connect to the review/voting workflow.

**Component:** `ForgedBadge` in `components/guideforge/builder/forged-badge.tsx`

**Usage:**
```tsx
<ForgedBadge isForged={guide.verification === 'forged'} showLabel />
```

## Public Site Privacy

The public site respects governance rules and only shows published content:

- **Draft** guides are NOT public
- **Pending Review** guides are NOT public
- **Published** guides ARE public (unless network visibility is private)
- **Attachment drafts** are NOT public
- **Governance settings** themselves are NOT exposed on public site

**Check:** `isGuidePublic(guide.status, guide.verification)` returns `true` only for published guides.

## Database Schema Requirements

Governance settings persist via the `governance_settings` JSON column on the `networks` table. This column:

- Accepts JSON objects matching `NetworkGovernanceSettings` interface
- Is optional (existing networks have `null`)
- Defaults to `getDefaultNetworkGovernanceSettings()` when loading networks without settings
- Can be queried/filtered (depending on Supabase capabilities)

**Supabase Column:**
```sql
ALTER TABLE networks ADD COLUMN governance_settings JSONB DEFAULT NULL;
```

(This column may already exist in your schema; if not, it will be created on first use.)

## API Functions

### Creating Networks with Governance

```typescript
import { createNetworkScaffold } from '@/lib/guideforge/create-network-scaffold'

const result = await createNetworkScaffold(template, {
  networkName: 'My Network',
  networkSlug: 'my-network',
  networkType: 'gaming',
  networkTheme: 'parchment',
  networkVisibility: 'public',
  networkPrimaryColor: '#6366f1',
  // Lane 2A: Pass governance settings
  networkGovernanceSettings: {
    verificationLevel: 'moderated',
    contentStandard: 'standard',
    aiPolicy: 'disclosed',
    trustBadges: { showVerified: true, showLastUpdated: true, showAuthor: true },
    contributorMode: 'invite',
  }
})
```

### Updating Governance

```typescript
import { updateNetworkGovernance } from '@/lib/guideforge/supabase-networks'

const { network, error } = await updateNetworkGovernance(networkId, {
  verificationLevel: 'verified-only',
  contentStandard: 'strict',
  aiPolicy: 'disallowed',
  trustBadges: { showVerified: true, showLastUpdated: false, showAuthor: true },
  contributorMode: 'owner-only',
})
```

### Querying Governance

```typescript
// Governance settings hydrate automatically from Network.governanceSettings
const network = await loadNetworkBuilderContext(networkId)
const governance = network.governanceSettings || getDefaultNetworkGovernanceSettings()
```

## What's NOT Implemented Yet (Lane 2B)

The following governance features are deferred to Lane 2B (full review/voting workflow):

- Voting on guide reviews
- Reviewer queues/workflows
- Publish approvals
- Council weights
- RLS changes for governance
- Automatic "Forged" status awarding
- Provisional display of review-in-progress content
- Full enforcement of contributor restrictions

Lane 2A only provides the **persistence, UI, and conceptual foundation** for these features.

## Files Changed/Created

### Core Types & Helpers
- `lib/guideforge/types.ts` — Added `NetworkGovernanceSettings`, updated `Network` and `NetworkDraft`
- `lib/guideforge/guide-status-labels.ts` — NEW: Standardized status language utilities

### Supabase Integration
- `lib/guideforge/supabase-networks.ts` — Added `updateNetworkGovernance()`, updated `createNetwork()` and `normalizeNetwork()`
- `lib/guideforge/create-network-scaffold.ts` — Updated to accept and pass governance settings

### UI Components
- `components/guideforge/builder/governance-settings-editor.tsx` — NEW: Editor for governance settings
- `components/guideforge/builder/governance-summary.tsx` — NEW: Dashboard governance summary card
- `components/guideforge/builder/forged-badge.tsx` — NEW: Placeholder Forged badge
- `components/guideforge/builder/forge-rules-editor.tsx` — Updated persistence message, passes governance to creation

### Pages
- `app/builder/network/[networkId]/settings/page.tsx` — Added GovernanceSettingsEditor import and rendering
- `app/builder/network/[networkId]/dashboard/page.tsx` — Added GovernanceSummary card

## Testing Checklist

Manual test plan (user should verify after deploy):

### Test 1 — Create Network with Governance
- [ ] Create new network, fill all steps
- [ ] On Forge Rules step, select specific values (e.g., "verified-only", "strict", "disclosed")
- [ ] Create network
- [ ] Open network settings
- [ ] Verify governance settings match what was selected

### Test 2 — Edit Governance Settings
- [ ] Open network settings
- [ ] Change one governance field (e.g., verification level)
- [ ] Click "Save Changes"
- [ ] Verify change persists on refresh

### Test 3 — Dashboard Governance Summary
- [ ] Open network dashboard
- [ ] Verify governance summary card appears with correct badges/values
- [ ] Trust badges section shows enabled badges
- [ ] Card does not overwhelm layout

### Test 4 — Cancel Governance Edits
- [ ] Open network settings
- [ ] Change a governance field
- [ ] Click "Cancel"
- [ ] Verify field reverts to previous value
- [ ] Save button is disabled

### Test 5 — Public Privacy
- [ ] Create network, attach a draft asset
- [ ] Open public site (`/n/{slug}`)
- [ ] Verify draft content does NOT appear
- [ ] Publish/create guide, refresh public site
- [ ] Verify published content appears

### Test 6 — Error Handling
- [ ] Attempt to save governance with network ID missing
- [ ] Verify error message displays
- [ ] Verify "Save Changes" disabled until error cleared

## Future Enhancements (Lane 2B+)

- **Full review workflow:** Implement voting, queues, approvals
- **Automatic Forged status:** Award to guides passing all network rules
- **Contributor enforcement:** Restrict submissions based on contributor mode
- **Provisional display:** Show review-in-progress content based on rules
- **Per-rule toggles:** Allow networks to disable specific Forge Rules
- **Custom role weights:** Councils with weighted votes
- **RLS enforcement:** Database-level governance policies

## Summary

Lane 2A provides the **governance persistence and UI foundation** without implementing the full review/voting workflow. Networks can now:

1. ✅ Define governance settings during creation
2. ✅ Persist and view governance settings
3. ✅ Edit governance settings from network settings page
4. ✅ See governance summary on network dashboard
5. ✅ Use standardized guide status language
6. ✅ Display Forged badge as a placeholder
7. ⏳ Full voting/review workflow deferred to Lane 2B

This foundation ensures governance settings are never lost and provides the UI structure for future phases.
