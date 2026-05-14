# GuideForge Save Behavior Rules

This document defines the save UX patterns across GuideForge to ensure consistency and clarity.

## Wizard Setup Pages (Network Creation)

**Behavior:** Draft-session based, auto-saved to browser session state until final creation.

- Changes in the wizard are held in local session state.
- Back/Continue/Create Network buttons navigate or finalize.
- Users see copy like: "Your changes are saved in the setup draft."
- No explicit Save button needed—progression through the wizard constitutes commitment.
- On final Create Network button, wizard commits all data to Supabase permanently.

## Dashboard Management Pages (After Network Creation)

**Behavior:** Explicit Save Changes & Cancel buttons.

### Hub Management (Edit/Create)
- Form shows clearly: "Hub name" and "Description"
- **Save Changes** button at bottom-right commits to Supabase
- **Cancel** button discards edits and returns to form
- Success feedback: brief "Hub updated" toast or page refresh
- Error feedback: clear error message in red box on the form

### Collection Management (Edit/Create)
- Same pattern as Hub Management
- **Save Changes** button persists edits
- **Cancel** button reverts changes
- Success/error feedback consistent with hubs

### Rules for All Dashboard Edits
- No silent autosave
- Edits are not applied until user clicks Save Changes
- Canceling without saving discards all changes
- After save, data is revalidated server-side and UI refreshes
- If a guide has pending drafts, saving collection changes doesn't affect them

## Asset Editors (Checklist, Single Guide)

**Behavior:** Explicit Save Changes or visible SaveStatus indicator.

- Long-form editors (guides, checklists) show: **Save Changes** button at bottom-right
- Alternatively: Visible SaveStatus component shows "Saved", "Saving...", or error state
- Do not use silent autosave in asset editors
- Users must see clear feedback on save state

## Delete/Archive Actions

**Behavior:** Always confirm before destructive action.

### Data Safety
- Delete action shows confirmation dialog with "Are you sure?" message
- If deleting a hub with collections: block deletion with message "Remove collections first before deleting this hub."
- If deleting a collection with guides: block deletion with message "Remove guides first before deleting this collection."
- Destructive button is colored red (destructive variant)
- Non-destructive button is colored neutral (outline or default)

### User Affordance
- Confirmation dialog is modal and cannot be dismissed by clicking outside
- "Delete" / "Archive" buttons are clearly separated from "Cancel"
- After successful deletion, page refreshes to remove the deleted item

## Summary of Save UX Patterns

| Page Type | Save Pattern | Feedback |
|-----------|--------------|----------|
| Wizard Setup | Session draft → Create | "Changes saved in draft" or auto-next-step |
| Hub Edit (Dashboard) | Save Changes + Cancel | Toast + refresh, or inline error |
| Collection Edit (Dashboard) | Save Changes + Cancel | Toast + refresh, or inline error |
| Asset Editor (Guide/Checklist) | Save Changes or SaveStatus | Visible state indicator |
| Delete/Archive | Confirmation Modal | Block with friendly message if data exists |

## Implementation Guidance

- Always provide clear, visible affordances for save state
- Never surprise users with unexpected data mutations
- Provide confirmat before destructive actions
- Group save/cancel buttons in bottom-right corner when possible
- Use error messages that explain why an action was blocked (e.g., "Must remove X first")
