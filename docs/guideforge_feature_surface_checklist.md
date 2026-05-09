# GuideForge Feature Surface Checklist

This document defines the required components for any new GuideForge feature. Use this as a build protocol and reference when implementing new capabilities.

## Checklist for Every New Feature

### 1. Entry Point
- Where can users discover and access this feature?
- Is it in a new route? Existing page button? Navigation menu?
- Is it obvious or hidden?

### 2. Access / Auth Requirement
- Is sign-in required?
- Can anonymous users view it?
- Are there role-based restrictions?

### 3. States

#### Empty State
- What does the user see when there's no data/content yet?
- Clear copy explaining why it's empty
- Call-to-action to create/use the feature

#### Loading State
- Show loading indicator for async operations
- Disable buttons/interactions
- Estimated time or progress if possible

#### Error State
- Clear error messages (not technical jargon)
- User-friendly recovery path (retry, create missing prerequisite, etc.)
- Do not silently fail

#### Success State
- Confirm successful action
- Show created content
- Next action should be obvious

### 4. Save / Output Location
- Where does created content live?
- Can it be moved/copied later?
- Is it immediately visible to the user?

### 5. Post-Save Next Action
- What happens immediately after save?
- Does it route? Show a modal? Return to list?
- Should never land on 404 or blank page

### 6. Public / Private Visibility
- Is saved content public or private by default?
- Can it be toggled?
- Does it need explicit publishing?
- Public pages should only show published content

### 7. Scale Behavior
- Does the UI work with 1 item? 100 items? 1,000 items?
- Flat dropdown = 30 items max before unusable
- Use cascading selectors for N+1 relationships (Network → Hub → Collection)
- Add search/filtering if N > 50 items
- Consider pagination for large lists

### 8. Navigation / Surface Placement
- Is the feature discoverable from multiple entry points?
- Builder dashboard? All Networks page? Top nav?
- Create vs Generate?  Create has prerequisites; Generate is self-contained

### 9. Draft / Publish Behavior
- Generated content is **always** draft-only
- No auto-publishing
- Explicit user action required to publish
- Published content is immutable; only drafts can be edited

### 10. Feature Interactions
- Does this feature depend on other features?
- What happens if user deletes a prerequisite?
- What happens if user has no networks/hubs/collections?

## Example: Generate Single Structured Asset

| Aspect | Implementation |
|--------|-----------------|
| **Entry Point** | /builder/generate-asset (discoverable from Networks page) |
| **Access** | Requires Supabase auth; no role restrictions |
| **Empty State** | Asset type selector with available/coming-soon badges |
| **Loading State** | "Generating..." with spinner; disabled save button |
| **Error State** | Clear error cards with recovery copy |
| **Success State** | Proposal view with asset details; ready to save |
| **Save Location** | Saved as draft to user's selected network/hub/collection |
| **Post-Save** | Routes to guide editor at /builder/network/{networkId}/guide/{guideId}/edit |
| **Public Visibility** | Drafts private; published only if user explicitly publishes |
| **Scale** | 3-step cascading selectors (Network → Hub → Collection); no flat dropdown |
| **Navigation** | Buttons on Networks page; linked from generate-network page |
| **Draft Behavior** | Always draft; no auto-publish |
| **Dependencies** | Requires at least one network/hub/collection to save |

## Implementation Notes

- Always validate requirements before building
- Do not silently fail; show errors
- Empty states are features, not edge cases
- Routes should never return 404
- Cascading UI scales better than flat; prefer hierarchical
- Post-save routing must use correct path from database IDs
- Generated/template content should always be draft-only
- Public pages should filter by publication status
