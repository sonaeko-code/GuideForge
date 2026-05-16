# GuideForge — Builder Workspace UI Kit

The signed-in builder dashboard where authors create networks, hubs, collections,
and guides. Recreates the network dashboard pattern from
`components/guideforge/builder/network-dashboard-tabs.tsx` and the workspace shell
from [sonaeko-code/GuideForge](https://github.com/sonaeko-code/GuideForge).

## Components
- `WorkspaceShell` — graphite sidebar + parchment main pane
- `WorkspaceTopbar` — workspace switcher + breadcrumb + actions
- `NetworkHeader` — network name, type, stat strip ("Forged · In Review · Networks")
- `GuidesTable` — guide list with status + verification + quality bar
- `Sidebar` — Overview / Guides / Networks / Checklists / Reviews / Insights / Governance / Settings

## Notes
This is a *visual* recreation — interactions are mostly cosmetic. The Forge Rules
panel, generator flow, and Supabase persistence layer all live in the real codebase.
