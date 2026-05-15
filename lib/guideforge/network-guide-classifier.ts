/**
 * Network Guide Classifier
 *
 * Local heuristic classifier for the Network Guide Generator's "Suggest structure" feature.
 * Analyzes a free-text prompt and suggests guide type, difficulty, hub, and collection.
 * No API calls — pure keyword scoring against the actual GuideType values used in the form.
 */

import { extractTitle, detectDifficulty } from "./intake-field-parser"
import type { NormalizedHub, NormalizedCollection } from "./supabase-networks"
import type { GuideType, DifficultyLevel } from "./types"

export interface NetworkGuideClassification {
  title: string | null
  guideType: GuideType | null
  difficulty: DifficultyLevel | null
  hubId: string | null
  collectionId: string | null
  confidence: "high" | "medium" | "low"
  confidenceNote: string | null
}

// ─── Guide type keyword signals ───────────────────────────────────────────────
//
// Each entry maps to a real GuideType value used in the generator form.
// Keywords are lower-case; they are compared against a lower-cased prompt.
// Longer / more-specific keywords contribute more when scoring.

const GUIDE_TYPE_SIGNALS: Array<{ type: GuideType; keywords: string[] }> = [
  {
    type: "character-build",
    keywords: [
      "character build",
      "build guide",
      "spec",
      "talent tree",
      "skill tree",
      "loadout",
      "stat priority",
      "min-max",
      "optimal build",
      "best build",
      "gear set",
      "build for",
    ],
  },
  {
    type: "boss-guide",
    keywords: [
      "boss guide",
      "boss fight",
      "boss strategy",
      "raid guide",
      "encounter guide",
      "mechanics",
      "phase 1",
      "phase 2",
      "defeat",
      "kill strategy",
    ],
  },
  {
    type: "beginner-guide",
    keywords: [
      "beginner guide",
      "beginner",
      "new player",
      "getting started",
      "introduction to",
      "intro guide",
      "basics",
      "first time",
      "newbie",
      "starter guide",
    ],
  },
  {
    type: "walkthrough",
    keywords: [
      "walkthrough",
      "playthrough",
      "full guide",
      "complete guide",
      "all quests",
      "story mode",
      "main story",
      "every area",
      "full playthrough",
    ],
  },
  {
    type: "patch-notes",
    keywords: [
      "patch notes",
      "update notes",
      "changelog",
      "what changed",
      "balance changes",
      "what's new in patch",
      "patch summary",
    ],
  },
  {
    type: "tutorial",
    keywords: [
      "tutorial",
      "how to",
      "step-by-step",
      "step by step",
      "how do i",
      "teach me",
      "learn how",
      "guide for beginners",
    ],
  },
  {
    type: "reference",
    keywords: [
      "reference guide",
      "cheat sheet",
      "quick reference",
      "lookup table",
      "list of all",
      "all items",
      "all spells",
      "database",
      "index of",
    ],
  },
  {
    type: "repair-procedure",
    keywords: [
      "repair guide",
      "repair procedure",
      "how to fix",
      "broken",
      "replace battery",
      "screen replacement",
      "disassemble",
      "hardware issue",
    ],
  },
  {
    type: "sop",
    keywords: [
      "sop",
      "standard operating procedure",
      "process document",
      "operational guide",
      "policy document",
      "procedure",
      "protocol",
    ],
  },
  {
    type: "news",
    keywords: [
      "news post",
      "announcement",
      "upcoming content",
      "new season",
      "release announcement",
    ],
  },
]

// Maps guide types to keywords commonly found in collection names.
// Used to boost collection score when the collection's name aligns with the detected type.
const TYPE_COLLECTION_KEYWORDS: Partial<Record<GuideType, string[]>> = {
  "character-build": ["build", "builds", "character", "class", "spec"],
  "boss-guide": ["boss", "bosses", "raid", "raids", "encounter"],
  "beginner-guide": ["beginner", "starter", "intro", "getting started"],
  "walkthrough": ["walkthrough", "story", "main quest", "campaign"],
  "patch-notes": ["patch", "patches", "update", "updates", "news", "changelog"],
  "tutorial": ["tutorial", "tutorials", "guide", "guides", "how-to", "tips"],
  "reference": ["reference", "resources", "index", "data", "lookup"],
  "repair-procedure": ["repair", "procedure", "maintenance", "fix"],
  "sop": ["sop", "procedure", "process", "operations"],
  "news": ["news", "updates", "announcements", "releases"],
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function detectNetworkGuideType(
  lowerText: string
): { type: GuideType; score: number } | null {
  let bestType: GuideType | null = null
  let bestScore = 0

  for (const { type, keywords } of GUIDE_TYPE_SIGNALS) {
    let typeScore = 0
    for (const kw of keywords) {
      if (lowerText.includes(kw)) {
        // Longer/more-specific keywords contribute more signal
        typeScore += Math.max(1, Math.floor(kw.length / 4))
      }
    }
    if (typeScore > bestScore) {
      bestScore = typeScore
      bestType = type
    }
  }

  return bestType ? { type: bestType, score: bestScore } : null
}

function scoreHubAgainstPrompt(hub: NormalizedHub, lowerPrompt: string): number {
  let score = 0
  // Split hub name into meaningful words (skip short filler words)
  const hubWords = hub.name
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .filter((w) => w.length >= 3)

  for (const word of hubWords) {
    if (lowerPrompt.includes(word)) {
      // Longer words are stronger matches (e.g., "Emberfall" > "The")
      score += word.length >= 6 ? 4 : 2
    }
  }
  return score
}

function scoreCollectionAgainstPrompt(
  col: NormalizedCollection,
  lowerPrompt: string,
  guideType: GuideType | null
): number {
  let score = 0

  const colWords = col.name
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .filter((w) => w.length >= 3)

  // Direct name word overlap with prompt
  for (const word of colWords) {
    if (lowerPrompt.includes(word)) {
      score += 2
    }
  }

  // Guide type alignment: boost collection if its name aligns with detected type
  if (guideType) {
    const alignWords = TYPE_COLLECTION_KEYWORDS[guideType] ?? []
    const colLower = col.name.toLowerCase()
    for (const aw of alignWords) {
      if (colLower.includes(aw)) {
        score += 3
        break // only count alignment once per collection
      }
    }
  }

  return score
}

// ─── Confidence ───────────────────────────────────────────────────────────────

function computeConfidence(
  hubScore: number,
  collectionScore: number,
  guideTypeScore: number,
  hubCount: number,
  totalCollections: number
): "high" | "medium" | "low" {
  // Strong signal across all three dimensions
  if (hubScore >= 4 && collectionScore >= 3 && guideTypeScore >= 2) return "high"
  // Good guide type + at least one of hub/collection matched
  if (guideTypeScore >= 3 && (hubScore >= 2 || collectionScore >= 3)) return "medium"
  // Only one real option to choose — no wrong guess possible for hub/collection
  if (hubCount === 1 && totalCollections <= 2) return "medium"
  // Some signal present
  if (guideTypeScore >= 2 || hubScore >= 2) return "medium"
  return "low"
}

// ─── Main classifier ─────────────────────────────────────────────────────────

export function classifyNetworkGuidePrompt(
  prompt: string,
  hubs: NormalizedHub[],
  collectionsByHub: Record<string, NormalizedCollection[]>
): NetworkGuideClassification {
  const lowerPrompt = prompt.toLowerCase()

  // --- Guide type
  const guideTypeResult = detectNetworkGuideType(lowerPrompt)
  const guideType = guideTypeResult?.type ?? null
  const guideTypeScore = guideTypeResult?.score ?? 0

  // --- Difficulty (reuse shared parser; add expert override)
  const rawDifficulty = detectDifficulty(lowerPrompt)
  const difficulty: DifficultyLevel | null =
    rawDifficulty === "advanced" && lowerPrompt.includes("expert")
      ? "expert"
      : rawDifficulty

  // --- Title extraction (returned for completeness; not currently shown in form)
  const title = extractTitle(prompt)

  // --- Hub matching
  let bestHubId: string | null = null
  let bestHubScore = 0

  for (const hub of hubs) {
    const s = scoreHubAgainstPrompt(hub, lowerPrompt)
    if (s > bestHubScore) {
      bestHubScore = s
      bestHubId = hub.id
    }
  }

  // Single hub → use it automatically (no ambiguity)
  if (hubs.length === 1) {
    bestHubId = hubs[0].id
  }

  // --- Collection matching — search within best hub first, then all
  let bestCollectionId: string | null = null
  let bestCollectionScore = 0

  const collectionsToSearch: NormalizedCollection[] = bestHubId
    ? (collectionsByHub[bestHubId] ?? [])
    : Object.values(collectionsByHub).flat()

  for (const col of collectionsToSearch) {
    const s = scoreCollectionAgainstPrompt(col, lowerPrompt, guideType)
    if (s > bestCollectionScore) {
      bestCollectionScore = s
      bestCollectionId = col.id
    }
  }

  // Single collection in the hub → use it automatically
  if (collectionsToSearch.length === 1) {
    bestCollectionId = collectionsToSearch[0].id
  }

  // --- Confidence
  const totalCollections = Object.values(collectionsByHub).flat().length
  const confidence = computeConfidence(
    bestHubScore,
    bestCollectionScore,
    guideTypeScore,
    hubs.length,
    totalCollections
  )

  const confidenceNote =
    confidence === "high"
      ? null
      : confidence === "medium"
        ? "Suggestions applied — review before generating."
        : "We suggested the closest match — review before generating."

  return {
    title,
    guideType,
    difficulty,
    hubId: bestHubId,
    collectionId: bestCollectionId,
    confidence,
    confidenceNote,
  }
}
