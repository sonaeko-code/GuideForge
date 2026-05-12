/**
 * GuideForge Network Theme Metadata
 *
 * Defines visual theme options for networks.
 * Each theme includes color classes, background patterns, card styles,
 * and visual guidance for what type of network works best with each theme.
 *
 * Themes are presentational layer only — no database schema changes.
 * Selected theme is stored in network.branding.theme (ThemeDirection).
 */

import type { ThemeDirection } from "./types"

export interface NetworkTheme {
  id: ThemeDirection
  label: string
  description: string
  /** Short hint for theme selector */
  hint: string
  /** What types of networks this theme suits best */
  bestFor: string[]
  /** Tailwind classes for primary accent color */
  accentClasses: string
  /** Tailwind classes for background/muted areas */
  bgClasses: string
  /** Tailwind classes for card/container styling */
  cardClasses: string
  /** Tailwind classes for badge/button styling */
  badgeClasses: string
  /** Tailwind classes for borders */
  borderClasses: string
  /** Hex color for primaryColor in Network branding */
  primaryColor: string
  /** Optional gradient or pattern class for preview */
  previewClasses: string
}

export const NETWORK_THEMES: Record<ThemeDirection, NetworkTheme> = {
  parchment: {
    id: "parchment",
    label: "Parchment",
    description: "Warm cream and graphite with a handcrafted, inviting feel",
    hint: "Warm cream + graphite, calm and crafted",
    bestFor: ["Training", "Creator Hub", "Community", "Educational"],
    accentClasses: "text-amber-700 dark:text-amber-300",
    bgClasses: "bg-amber-50 dark:bg-amber-950/30",
    cardClasses: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/20",
    badgeClasses: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
    borderClasses: "border-amber-500/30 dark:border-amber-600/30",
    primaryColor: "#b45309",
    previewClasses: "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50",
  },
  copper: {
    id: "copper",
    label: "Copper",
    description: "Muted copper accent on warm neutrals, refined and timeless",
    hint: "Muted copper accent on warm neutrals",
    bestFor: ["Community", "General Knowledge", "Mixed Purpose"],
    accentClasses: "text-orange-600 dark:text-orange-400",
    bgClasses: "bg-orange-50 dark:bg-orange-950/30",
    cardClasses: "bg-orange-50/40 dark:bg-orange-950/20 border-orange-500/20",
    badgeClasses: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
    borderClasses: "border-orange-500/30 dark:border-orange-600/30",
    primaryColor: "#ea580c",
    previewClasses: "bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/50 dark:to-yellow-900/50",
  },
  neutral: {
    id: "neutral",
    label: "Neutral",
    description: "Clean, brand-agnostic baseline with balanced grays",
    hint: "Brand-agnostic baseline",
    bestFor: ["Business", "Corporate", "Multi-purpose", "SOP"],
    accentClasses: "text-slate-700 dark:text-slate-300",
    bgClasses: "bg-slate-50 dark:bg-slate-950/30",
    cardClasses: "bg-slate-50/50 dark:bg-slate-900/20 border-slate-500/20",
    badgeClasses: "bg-slate-100 text-slate-900 dark:bg-slate-800/40 dark:text-slate-200",
    borderClasses: "border-slate-500/30 dark:border-slate-600/30",
    primaryColor: "#475569",
    previewClasses: "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950/50 dark:to-slate-900/50",
  },
  industrial: {
    id: "industrial",
    label: "Industrial",
    description: "Bold dark steel and stone grays, technical and robust",
    hint: "Repair / SOP feel",
    bestFor: ["Repair", "Maintenance", "Technical SOP", "Engineering"],
    accentClasses: "text-zinc-700 dark:text-zinc-300",
    bgClasses: "bg-zinc-50 dark:bg-zinc-950/40",
    cardClasses: "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-600/30",
    badgeClasses: "bg-zinc-200 text-zinc-900 dark:bg-zinc-800/60 dark:text-zinc-100",
    borderClasses: "border-zinc-600/40 dark:border-zinc-700/40",
    primaryColor: "#27272a",
    previewClasses: "bg-gradient-to-br from-zinc-100 to-gray-100 dark:from-zinc-950/60 dark:to-gray-950/60",
  },
  soft: {
    id: "soft",
    label: "Soft",
    description: "Gentle rose and cream tones, approachable and warm",
    hint: "Creator and training networks",
    bestFor: ["Creator Hub", "Wellness", "Learning", "Personal Training"],
    accentClasses: "text-rose-600 dark:text-rose-400",
    bgClasses: "bg-rose-50 dark:bg-rose-950/30",
    cardClasses: "bg-rose-50/40 dark:bg-rose-950/20 border-rose-300/30",
    badgeClasses: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
    borderClasses: "border-rose-400/30 dark:border-rose-600/30",
    primaryColor: "#e11d48",
    previewClasses: "bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/50 dark:to-pink-900/50",
  },
  arcane: {
    id: "arcane",
    label: "Arcane",
    description: "Cool slate with violet edges, mysterious and sophisticated",
    hint: "Cool slate with violet edges",
    bestFor: ["Fantasy", "Magic Systems", "Esoteric", "Advanced Topics"],
    accentClasses: "text-violet-600 dark:text-violet-400",
    bgClasses: "bg-violet-50 dark:bg-violet-950/30",
    cardClasses: "bg-violet-50/40 dark:bg-violet-950/20 border-violet-400/30",
    badgeClasses: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200",
    borderClasses: "border-violet-500/30 dark:border-violet-600/30",
    primaryColor: "#7c3aed",
    previewClasses: "bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/50 dark:to-indigo-900/50",
  },
  ember: {
    id: "ember",
    label: "Ember",
    description: "Warm amber and orange, energetic and engaging",
    hint: "Warm amber, gaming-leaning",
    bestFor: ["Gaming", "Community", "High Energy", "Action"],
    accentClasses: "text-amber-600 dark:text-amber-400",
    bgClasses: "bg-amber-50 dark:bg-amber-950/30",
    cardClasses: "bg-amber-50/50 dark:bg-amber-900/20 border-amber-500/25",
    badgeClasses: "bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100",
    borderClasses: "border-amber-500/35 dark:border-amber-600/35",
    primaryColor: "#f97316",
    previewClasses: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-900/50",
  },
}

/**
 * Get a theme by ID, with fallback to neutral
 */
export function getNetworkTheme(themeId?: ThemeDirection): NetworkTheme {
  if (!themeId || !NETWORK_THEMES[themeId]) {
    return NETWORK_THEMES.neutral
  }
  return NETWORK_THEMES[themeId]
}

/**
 * Get all available themes as an array
 */
export function getAllNetworkThemes(): NetworkTheme[] {
  return Object.values(NETWORK_THEMES)
}

/**
 * Find themes that match a network type
 */
export function getThemesForNetworkType(networkType: string): NetworkTheme[] {
  const typeMap: Record<string, ThemeDirection[]> = {
    gaming: ["ember", "arcane"],
    repair: ["industrial", "neutral"],
    sop: ["industrial", "neutral"],
    creator: ["soft", "parchment"],
    training: ["parchment", "soft"],
    community: ["copper", "parchment"],
  }
  
  const themeIds = typeMap[networkType] || []
  return themeIds.map((id) => NETWORK_THEMES[id])
}

/**
 * Normalize and validate a theme ID, with fallback to default
 */
export function normalizeThemeId(themeId: string | undefined): ThemeDirection {
  if (!themeId || !(themeId in NETWORK_THEMES)) {
    return "parchment"
  }
  return themeId as ThemeDirection
}
