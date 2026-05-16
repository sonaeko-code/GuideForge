# GuideForge — Public Network UI Kit (QuestLine)

The hosted, public-facing guide reader that GuideForge generates for each network.
Recreates the QuestLine homepage (`app/n/questline/page.tsx`) and reusable public
components from `components/guideforge/public/*` in
[sonaeko-code/GuideForge](https://github.com/sonaeko-code/GuideForge).

## Screens
- `index.html` — QuestLine network home: masthead, featured + dispatch sidebar,
  game hubs, recently forged, Forged shelf, news

## Components
- `NetworkPublicHeader` — sticky network header with forge seal + nav
- `Masthead` — editorial masthead with issue/date and big QuestLine display title
- `FeaturedGuide` + `DispatchSidebar`
- `HubCard`, `GuideCard` (with media placeholders)
- `ForgedShelf` — primary-tinted cards reserved for the highest-trust guides

## Voice
Editorial. Issue No. 04, "An editorial guide network," "Reviewed by veterans,
structured for the moment you need them." Always refined, never breezy.
