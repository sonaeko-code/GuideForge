import type { Guide, ForgeRule } from "./types"

export interface ForgeRulesCheckResult {
  rule: ForgeRule
  passed: boolean
  reason?: string
}

/**
 * Deterministic Forge Rules validation based on actual guide content.
 * Each check is based only on the current guide state - no randomization.
 */
export function validateForgeRules(guide: Guide, availableRules: ForgeRule[]): ForgeRulesCheckResult[] {
  const titleTrimmed = guide.title?.trim() || ""
  const summaryTrimmed = guide.summary?.trim() || ""
  const versionTrimmed = guide.version?.trim() || ""
  const stepsCount = guide.steps?.length || 0
  const validSectionsCount = guide.steps?.filter(s => s.title?.trim() && s.body?.trim()).length || 0
  const requirementsCount = guide.requirements?.length || 0

  return availableRules.map((rule) => {
    let passed = false
    let reason: string | undefined

    switch (rule.name?.toLowerCase() || "") {
      case "descriptive title":
        // Fail if: too short, generic, untitled
        const isGenericTitle =
          titleTrimmed === "" ||
          titleTrimmed === "Untitled Guide" ||
          titleTrimmed.toLowerCase().includes("untitled") ||
          titleTrimmed.match(/^\[.*\]\s*.*guide$/i) || // [Game] ... guide
          titleTrimmed === "Master character build" ||
          titleTrimmed.length < 8
        passed = !isGenericTitle && titleTrimmed.length >= 8
        if (!passed) {
          if (titleTrimmed === "") reason = "Title is required."
          else if (titleTrimmed.length < 8) reason = "Title is too short (at least 8 characters)."
          else reason = "Title is too generic."
        }
        break

      case "has summary":
        // Pass if summary is 40+ characters
        passed = summaryTrimmed.length >= 40
        if (!passed) {
          reason = summaryTrimmed.length === 0 
            ? "Summary is required."
            : `Summary needs more detail (at least 40 characters, you have ${summaryTrimmed.length}).`
        }
        break

      case "minimum 3 sections":
        // Pass only if 3+ sections exist
        passed = validSectionsCount >= 3
        if (!passed) {
          reason = `At least 3 sections needed (you have ${validSectionsCount}).`
        }
        break

      case "game name present":
        // Pass if title or summary includes known game/hub names, or if guide has a hubName
        const knownGames = ["emberfall", "starfall outriders", "hollowspire", "mechbound tactics"]
        const contentLower = (titleTrimmed + " " + summaryTrimmed).toLowerCase()
        const hasGameName = knownGames.some(game => contentLower.includes(game)) ||
          (guide as any).hubName ||
          (guide as any).gameName
        passed = hasGameName
        if (!passed) {
          reason = "No game or hub name found in title, summary, or metadata."
        }
        break

      case "patch/version noted":
        // Pass only if version is provided
        passed = versionTrimmed.length > 0
        if (!passed) {
          reason = "Version/patch info is required."
        }
        break

      case "difficulty level":
        // Pass only if difficulty is set
        passed = guide.difficulty ? true : false
        if (!passed) {
          reason = "Difficulty level must be specified."
        }
        break

      case "requirements listed":
        // Pass only if at least 1 requirement
        passed = requirementsCount >= 1
        if (!passed) {
          reason = "At least one requirement must be listed."
        }
        break

      case "beginner summary":
        // Pass if summary + difficulty is set (explains who it's for)
        passed = summaryTrimmed.length >= 40 && guide.difficulty ? true : false
        if (!passed) {
          if (summaryTrimmed.length < 40) reason = "Summary should explain who this guide is for."
          else if (!guide.difficulty) reason = "Difficulty level helps explain guide scope."
          else reason = "Beginner summary requirements not met."
        }
        break

      case "spoiler tagging":
        // Pass if no spoiler sections OR if spoiler sections are marked
        const hasSpoilers = guide.steps?.some(s => s.isSpoiler) || false
        if (hasSpoilers) {
          // Check if spoiler sections are tagged
          const spoilerCount = guide.steps?.filter(s => s.isSpoiler).length || 0
          passed = spoilerCount > 0
          if (!passed) reason = "Spoiler sections must be explicitly marked."
        } else {
          // No spoilers = pass
          passed = true
        }
        break

      default:
        // For any other rules, pass if enabled
        passed = rule.enabled ?? true
        break
    }

    return {
      rule,
      passed,
      reason: passed ? undefined : reason,
    }
  })
}

/**
 * Check if validation is stale (content changed after last check).
 * Returns true if the guide has been modified since the check result was created.
 */
export function isValidationStale(
  guide: Guide,
  lastCheckResult: ForgeRulesCheckResult[] | undefined,
  lastCheckTimestamp: number | undefined
): boolean {
  if (!lastCheckResult || !lastCheckTimestamp) return true
  
  const guideUpdateTime = new Date(guide.updatedAt || 0).getTime()
  return guideUpdateTime > lastCheckTimestamp
}
