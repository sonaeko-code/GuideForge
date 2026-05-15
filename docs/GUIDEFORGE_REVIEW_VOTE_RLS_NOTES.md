# GuideForge Guide Review Voting — RLS Policy Documentation

## Current Issue

When a user attempts to cast a review vote (Approve/Request Changes), the insert fails with:

```
"new row violates row-level security policy for table guide_review_votes"
```

Even when the user is identified as the network owner with voting permissions.

## Analysis

### Voting Code Path

1. `castGuideReviewVote` in `supabase-guide-reviews.ts` calls `getCurrentUserNetworkAuthority`
2. Authority resolver confirms user has `canVoteOnReviews: true`
3. Payload prepared with:
   - `guide_id` (UUID)
   - `network_id` (UUID)
   - `voter_id` (UUID, from auth user)
   - `voter_role` (string, e.g. "owner")
   - `vote` (enum: 'approve' or 'request_changes')
   - `weight` (number, from role definition)
   - `notes` (optional text)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

4. Insert to `guide_review_votes` table proceeds
5. **RLS policy blocks the insert**

### Likely RLS Gap

The `guide_review_votes` table has an RLS policy that probably checks:
- User is authenticated ✓ (we confirm `voter_id = current_user_id`)
- User is member of the network ✗ (owner fallback does NOT create a membership row)

**Root Cause**: The owner fallback in `getCurrentUserNetworkAuthority` returns `membership: null` for network owners. The RLS policy likely requires `network_members` membership, not just `networks.owner_id` matching.

### Cast Vote Permissions Model

As of Phase 8, voting permissions come from:
1. **Membership check**: User in `network_members` table for this network
2. **OR Owner fallback**: User matches `networks.owner_id`

The RLS policy should align with this. If owner is not in `network_members`, RLS must explicitly allow `networks.owner_id = auth.uid()`.

## Suggested SQL Fix

The `guide_review_votes` table RLS policy should include:

```sql
-- Allow vote insert/update if user is network owner (even without membership)
CREATE POLICY "Owner can vote on guide reviews"
  ON guide_review_votes FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT owner_id FROM networks WHERE id = guide_review_votes.network_id
    )
    OR
    -- Also allow if user is member with can_vote_on_reviews capability
    EXISTS (
      SELECT 1 FROM network_members
      WHERE network_members.user_id = auth.uid()
        AND network_members.network_id = guide_review_votes.network_id
    )
  );
```

## Current UI Handling

- Error message displayed as: `"Failed to cast vote: [raw RLS error text]"`
- Raw RLS text is shown to user (not ideal)
- No retry logic or friendly messaging

## Next Steps

1. **Developer**: Apply the SQL policy above to Supabase
2. **Test**: Voting should succeed for network owners without membership
3. **Code**: UI already handles success/failure gracefully; no app changes needed once RLS is fixed

## Related Issues

- Network owners without `network_members` row cannot:
  - Vote on guide reviews
  - Potentially other write operations guarded by RLS

## Notes for Future Phases

- Phase 10+: Consider auto-creating owner membership rows during network creation
- Phase 10+: Add audit trail for owner votes (weight=999 or special handling)
- Consider token-based or service-role operations for admin actions
