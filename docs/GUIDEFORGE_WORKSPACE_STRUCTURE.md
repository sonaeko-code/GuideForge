# GuideForge Creator Workspace Structure

## Overview

The GuideForge Creator Workspace is the primary working area for content creators. It provides a clear mental model of personal content ownership and management.

## Core Concepts

### Creator Workspace
- **Location**: `/builder`
- **Purpose**: Home page that shows quick access to creator tools
- **Contains**:
  - My Networks: Access to networks the user owns or manages
  - My Assets: Private structured draft assets
  - Quick generate actions (Network, Asset)
  - Legacy/Unassigned drafts section

### My Networks
- **Location**: `/builder/networks?scope=mine` (default on `/builder/networks`)
- **Definition**: Knowledge networks that the user owns or manages
- **Ownership Model**:
  - Network record has `owner_id = current_user.id`
  - User is added to network_members with management role
  - Only networks matching current user are shown
  - Fallback: If `owner_id` is null or lookup fails, network appears only in All Networks
- **Capabilities**:
  - Create guides inside networks
  - Organize guides into hubs and collections
  - Review and publish guide drafts
  - Manage network hubs and collections
  - Invite reviewers/contributors

### My Assets
- **Location**: `/builder/assets`
- **Definition**: Private structured asset drafts owned by the current user
- **Scope**:
  - Only shows drafts where `owner_id = current_user.id`
  - Shows guides, checklists, and other structured assets
  - Drafts can be standalone or attached to a network
- **Capabilities**:
  - Create new assets
  - Edit drafts
  - Attach drafts to a network collection
  - Generate AI-powered assets
  - Delete drafts

### All Networks (Secondary View)
- **Location**: `/builder/networks?scope=all`
- **Purpose**: Broader discovery and management view (future enhancement)
- **Scope**:
  - Shows all networks in the workspace
  - Includes networks user doesn't own (with limited actions)
  - Not the primary workspace view
- **Status**: Available but not primary focus for MVP

## Guide Lifecycle

### 1. Creation
- **Option A**: Create standalone draft in My Assets → Attach to network later
- **Option B**: Generate network guide inside a network (creates in collection directly)

### 2. Attachment
- **Standalone → Network**: Drag/attach asset to a network collection
- **Network Guide**: Created directly in network collection, always attached

### 3. Review
- **Review Workflow**: Network owner or designated reviewers vote on guide
- **Voting**: Approve or Request Changes
- **Published Guides**: After approval, guides become published and visible

### 4. Publication
- **Requirements**:
  - Guide is in pending_review status
  - Network owner or qualified reviewer votes approve
  - Guide has required fields (title, content, etc.)
- **Result**: Guide moves to published status, visible on public network page

## Data Ownership

### Networks
- `owner_id`: Current user who created/owns the network
- `owner_id` can be null (legacy data or special cases)
  - Networks with null owner appear in All Networks
  - User must be in network_members to manage them

### Assets / Guides
- `owner_id`: User who created the asset draft
- `attached_network_id`: Network the asset belongs to (if attached)
- `attached_collection_id`: Collection within network (if attached)

## Console Logs & Debugging

Production console should not show:
- Repeated "Generate query params" logs
- Stale RLS errors after successful publish
- Multiple vote attempt warnings after success

Development logs (prefixed with `[v0]`) should only appear if a real issue occurs.

## Future Enhancements

- **Admin/Staff View**: Separate portal for workspace-wide moderation
- **Public Discovery**: Browse networks and guides without login
- **Forged Automation**: Scheduled guide generation and publishing
- **Asset Library**: Template management and reuse
- **Network Collaboration**: Multi-user ownership and role-based access
