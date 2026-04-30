/**
 * QuestLine editorial news / dispatch items.
 *
 * Lightweight local mock data used only for UI atmosphere on the
 * QuestLine public site. Not part of the GuideForge guide model —
 * these are short news posts, not Guides.
 */

export interface QuestLineNewsItem {
  id: string
  slug: string
  title: string
  blurb: string
  hubName: string
  hubSlug: string
  category: "Patch" | "News" | "Editorial" | "Esports"
  publishedAt: string
  readMinutes: number
}

export const QUESTLINE_NEWS: QuestLineNewsItem[] = [
  {
    id: "news_emberfall_4_2",
    slug: "emberfall-patch-4-2-recap",
    title: "Emberfall Patch 4.2 lands — what every Warden needs to know",
    blurb:
      "Cinder magic gets its biggest rebalance since launch. We break down which builds survive and which need a complete rework.",
    hubName: "Emberfall",
    hubSlug: "emberfall",
    category: "Patch",
    publishedAt: "2025-11-04T09:02:00.000Z",
    readMinutes: 5,
  },
  {
    id: "news_starfall_season_2",
    slug: "starfall-season-2-arrives",
    title: "Starfall Outriders Season 2: Outpost defense gets a major overhaul",
    blurb:
      "New procedural mission types, a reworked loadout system, and a brand new artifact tier. The hold-the-line meta will not look the same.",
    hubName: "Starfall Outriders",
    hubSlug: "starfall-outriders",
    category: "News",
    publishedAt: "2025-10-29T13:30:00.000Z",
    readMinutes: 4,
  },
  {
    id: "news_hollow_dungeon",
    slug: "hollowspire-new-dungeon",
    title: "Hollowspire reveals the Cathedral of Hollow Tides",
    blurb:
      "A new endgame dungeon, four bosses, and a quietly devastating loot table. Souls fans will not run out of reasons to die anytime soon.",
    hubName: "Hollowspire",
    hubSlug: "hollowspire",
    category: "News",
    publishedAt: "2025-10-25T10:15:00.000Z",
    readMinutes: 3,
  },
  {
    id: "news_mech_arena",
    slug: "mechbound-arena-meta-shift",
    title: "Why heat builds are quietly winning ranked Mechbound this month",
    blurb:
      "Pilots are abandoning damage stacking for sustain — and the win rates back it up. Here is what changed.",
    hubName: "Mechbound Tactics",
    hubSlug: "mechbound-tactics",
    category: "Editorial",
    publishedAt: "2025-10-22T16:45:00.000Z",
    readMinutes: 6,
  },
  {
    id: "news_questline_editorial",
    slug: "the-state-of-builds",
    title: "The state of builds: why guide-makers feel burned out",
    blurb:
      "Patch cycles have never been faster, and the people writing your favorite guides are paying the price. An editorial.",
    hubName: "QuestLine",
    hubSlug: "emberfall",
    category: "Editorial",
    publishedAt: "2025-10-18T08:00:00.000Z",
    readMinutes: 8,
  },
]
