# GuideForge Asset Workspace Rules

## Overview

Lane 1D polishes the Asset Workspace and editor experience. Saved assets are now first-class GuideForge objects with clear, consistent UX for viewing, editing, attaching, and deleting.

## My Assets Page

### Asset Cards

Each asset card displays:
- **Asset Type Badge** — Visual indicator (Checklist, Single Guide, etc.)
- **Created Date** — When the asset was saved
- **Title** — Asset name (line-clamped to 2 lines)
- **Summary** — Brief description (line-clamped to 2 lines) if available
- **Attachment Status** — Blue "Attached to network" text if already attached

### Asset Card Actions

Actions are grouped logically and always available on the card:

**Primary Row (Full Width or Flex):**
- **View** — Opens asset in view/preview mode
- **Edit** — Opens asset in edit mode with editable fields

**Secondary Row:**
- **Attach / Change** — Opens inline attachment panel if space allows; text shows "Attach" if not yet attached, "Change" if already attached
- **Delete** (icon-only button with trash icon) — Triggers delete confirmation

**Delete Confirmation:**
- Shows asset title in confirmation message
- If asset is attached to a network, warning mentions: "This draft is attached to a network collection. Deleting it will remove it from that network's private dashboard."
- Cancel and Delete buttons; both are equal width for easy interaction

### Empty State

When no assets exist:
- Large icon placeholder
- Heading: "Start building your knowledge base"
- Description: "Create your first structured guide or checklist..."
- "Generate Asset" button

## Asset Detail Page

### Header Section (No Edit Mode)

When viewing an asset (not editing):
- Asset Type Badge
- "AI Generated" or "Mock Preview" badge if applicable
- "Draft" status badge
- Created date (right-aligned)
- **Large Title** — Full asset title, large font
- **Subtitle** — Full asset summary/description in muted color

### Asset Metadata Cards

Below the title section:
- **Updated Date Card** — "Last Updated" with full timestamp
- **Overview Card** (for checklists) — Shows Sections, Total Items, Required Items, Source
- **Preview Card** (if not in edit mode) — Renders read-only preview of asset content

### Edit Mode

When user clicks "Edit Asset":
- Header changes to "Edit Asset" heading + explanation text
- Title/Summary edit fields appear in a contained card (muted background)
- For **Single Guide**: SingleGuideEditor component with title/summary fields and Edit/Preview tabs
- For **Checklist**: ChecklistEditor component with full editable structure
- **Sticky Bottom Action Bar:**
  - Cancel button (left)
  - Save status message (center, shows inline success/error)
  - Save Changes button (right)
  - Sticky positioning so it remains visible while scrolling through long editor content

### Preview (View Mode)

When asset is not in edit mode:
- "Preview" section with Eye icon
- Read-only display of full asset content
- For checklists: ChecklistEditor in preview mode
- For single guides: SingleGuideEditor in preview mode
- No tabs or edit controls visible

### Attachment Status

**If Not Attached:**
- Blue card with "Attach to Network" heading
- Description: "Add this asset to one of your networks to make it part of a collection."
- "Attach" button opens inline panel

**If Attached:**
- Green card with "Attached as Private Draft" heading
- Description: "This asset is attached to a collection in your network's private workspace. It will not appear publicly until explicitly published."
- Collection ID display (first 8 chars) in monospace
- "Change" button to modify attachment

### Delete Confirmation

**If Not Attached:**
- Heading: "Delete this asset draft?"
- Message: "This cannot be undone. The draft and all its content will be permanently deleted."

**If Attached:**
- Heading: "Delete this asset draft?"
- Message: "This draft is attached to a network collection. Deleting it will remove it from that network's private dashboard. This action cannot be undone."

Both show Cancel and Delete buttons equally weighted.

### Bottom Actions

- **Back to Assets** — Returns to My Assets page
- **Edit Asset** — Shows only in view mode; switches to edit mode
- **Delete Draft** — Shows only in view mode (not during delete confirmation); opens confirmation

## Editors (Checklist & Single Guide)

### Consistency

Both editors follow the same patterns:
- Controlled component props (value, onChange, mode, onModeChange)
- Support Edit and Preview modes
- Optional mode tabs toggle (showModeTabs)
- Internal mode management if parent does not control it

### Edit Mode

- Editable fields for title, summary, and structured content
- Full-width fields with proper labels
- Add/Remove buttons for sections, items, steps
- Real-time onChange callbacks

### Preview Mode

- Read-only render of full content
- No edit controls visible
- Matches published appearance

### Save Behavior

- Explicit **Save Changes** button (no autosave)
- **Cancel** discards unsaved edits and returns to view mode
- Edit/Preview tabs remain available during editing
- Success/error feedback shown inline near save button

## Attachment Workflow

### From Asset Card

1. User clicks "Attach" button on card
2. Inline AttachToNetworkPanel opens in expanded card
3. User selects network → hub → collection
4. Panel shows "Attach to Collection" button
5. On success, asset list refreshes and attachment indicator updates

### From Asset Detail

1. User clicks "Attach" button in unattached card
2. AttachToNetworkPanel opens inline
3. Same workflow as above
4. On success, card updates to green "Attached as Private Draft"

### Changing Attachment

1. User clicks "Change" button on green attachment card
2. AttachToNetworkPanel opens in inline panel
3. User selects new network/hub/collection
4. On success, card updates with new attachment status
5. Duplicate prevention: if user tries same collection, error message shown

## Data Model

### Asset Draft Fields

- `id` — Unique identifier
- `title` — Asset name, displayed in cards and headers
- `summary` — Brief description, shown on cards and in headers
- `assetType` — "single_guide", "checklist", or other types
- `payload` — Structured content (JSON)
- `attachedNetworkId` — Optional; network this asset is attached to
- `attachedHubId` — Optional; hub within network
- `attachedCollectionId` — Optional; collection within hub
- `createdAt` — Timestamp when asset was created
- `updatedAt` — Timestamp when asset was last modified

### Asset Privacy

- Attached assets remain **draft** status until published
- Attached assets appear only in **private dashboard** of owning network
- Attached assets **never** appear on public network pages
- Public site queries only published guides, never asset_drafts table
- Attachment does not imply publication

## Empty States & Messaging

### My Assets - No Assets

- Large icon
- "Start building your knowledge base"
- Encourages creation with "Generate Asset" button

### Asset Not Found

- Back button
- Error message with icon
- "Back to Assets" link

### Edit Mode Clarity

- Header explicitly says "Edit Asset"
- Explanation: "Update the title, summary, and content below..."
- Sticky save button makes it clear when changes are saved

## Mobile / Responsive

### Card Actions

- On small screens (sm), action text is hidden; only icons show
- Flex layout wraps as needed
- Delete icon-only button always visible and accessible with title attribute

### Editors

- Full-width fields
- Proper spacing for touch interaction
- Sticky save bar on mobile for long-form editors

## Future Enhancements

- Bulk attachment of multiple assets to same collection
- Asset attachment history/timeline
- Drag-and-reorder within preview
- Duplicate asset functionality
- Asset search/filter in My Assets
- Export asset as standalone guide
- Branching/versioning for major edits
