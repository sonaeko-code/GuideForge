/**
 * GuideForge Mock Generator
 *
 * Simulates AI generation of structured guide data.
 * Used by the generator preview route and test scenarios.
 *
 * Future: Replace with actual OpenAI API call + Supabase persistence.
 * TODO: When OpenAI is integrated, this function will:
 *   1. Call OpenAI API with the prompt and forge rules
 *   2. Parse the response into GeneratedGuide shape
 *   3. Insert into Supabase guides table
 *   4. Return the persisted Guide (not GeneratedGuide)
 */

import { makeTempId } from "./utils"
import type {
  GeneratedGuide,
  GeneratedGuideSection,
  GenerationRequest,
  GenerationResponse,
} from "./generation-schemas"
import type { GuideSectionKind } from "./types"
import type { NetworkType, ThemeDirection } from "./types"

// Mock guide templates for different types
const MOCK_TEMPLATES = {
  "character-build": {
    sections: [
      "overview",
      "strengths",
      "weaknesses",
      "gear",
      "skill-priority",
      "rotation",
      "final-tips",
    ] as GuideSectionKind[],
    defaultDifficulty: "intermediate" as const,
  },
  "boss-guide": {
    sections: [
      "overview",
      "gear",
      "rotation",
      "mistakes",
      "patch-notes",
      "final-tips",
    ] as GuideSectionKind[],
    defaultDifficulty: "advanced" as const,
  },
  "beginner-guide": {
    sections: [
      "overview",
      "requirements",
      "leveling",
      "gear",
      "mistakes",
      "final-tips",
    ] as GuideSectionKind[],
    defaultDifficulty: "beginner" as const,
  },
  "patch-notes": {
    sections: ["patch-notes", "final-tips"] as GuideSectionKind[],
    defaultDifficulty: "beginner" as const,
  },
}

const MOCK_SECTION_CONTENT: Record<GuideSectionKind, string> = {
  overview:
    "This guide covers the essential strategies and techniques you need to master this content. Whether you are new or experienced, you will find actionable insights here.",
  strengths:
    "Strong survivability with high defensive stats. Excellent crowd control tools for managing multiple enemies. Good damage output for sustained fights.",
  weaknesses:
    "Lower burst damage compared to other builds. Requires careful resource management. Vulnerable to specific enemy types.",
  gear: "Recommended equipment prioritizes defensive stats with balanced damage output. Secondary stats should focus on critical chance and haste.",
  "skill-priority":
    "Prioritize defensive abilities first, then utility, then damage. Rotation efficiency improves dramatically when abilities are prioritized correctly.",
  rotation:
    "Opener: Use cooldown ability, then spam basic attack until second cooldown is ready. Mid-fight: Maintain debuff with crowd control, weave in damage abilities.",
  leveling:
    "Focus on core abilities first. At level 20, unlock the secondary tree. By level 40, you should have access to most powerful abilities.",
  mistakes:
    "Common mistake: Using defensive ability too early. Better: Hold defensive ability for incoming spike damage. Avoid overcommitting during fights.",
  "patch-notes":
    "This patch includes balance adjustments to several core abilities. Defensive stat scaling has been increased by 10%. New items added to the loot table.",
  "final-tips":
    "Practice the rotation in safe content first. Watch for enemy patterns. Join community for more advanced strategies and group compositions.",
  requirements:
    "Requires reaching level 30 and completing the main questline. Access to advanced gear unlocks at this progression point.",
  warning: "WARNING: This strategy is high-risk. Only use in group content with experienced players.",
  custom: "This is a custom section with additional context for your build.",
}

/**
 * Generate a mock guide from a request.
 * This is what would come back from OpenAI in a real flow.
 */
export function generateMockGuide(
  request: GenerationRequest
): GeneratedGuide {
  const now = new Date().toISOString()
  const template = MOCK_TEMPLATES[request.guideType as keyof typeof MOCK_TEMPLATES]
  const sections = template.sections

  const generatedSections: GeneratedGuideSection[] = sections.map(
    (kind, index) => ({
      title: formatSectionTitle(kind),
      kind,
      body: MOCK_SECTION_CONTENT[kind],
      callout:
        index === 0
          ? `This is a ${request.preferredDifficulty || template.defaultDifficulty} guide for ${request.guideType}`
          : undefined,
    })
  )

  const title = generateTitle(request)
  const summary = generateSummary(request)
  const slug = generateSlug(title)
  
  const guide: GeneratedGuide = {
    title,
    slug,
    summary,
    type: request.guideType,
    difficulty: request.preferredDifficulty || template.defaultDifficulty,
    estimatedMinutes: 15 + Math.floor(Math.random() * 20),
    sections: generatedSections,
    requirements:
      request.guideType === "beginner-guide"
        ? ["Level 1 or higher", "Access to starter area"]
        : ["Level 30+", "Completion of main questline"],
    warnings: ["This guide assumes you have basic game knowledge"],
    version: "1.0",
    author: {
      displayName: "AI Generated",
      handle: "ai.generated",
    },
    generatedAt: now,
    generatedBy: "mock",
    generationPrompt: request.prompt,
    tags: [request.guideType, request.preferredDifficulty || "intermediate"],
    targetHubId: request.targetHubId,
    targetCollectionId: request.targetCollectionId,
  }

  console.log("[v0] Generated mock guide:", {
    title: guide.title,
    slug: guide.slug,
    summary: guide.summary,
    type: guide.type,
    difficulty: guide.difficulty,
    sectionsCount: guide.sections.length,
    requirements: guide.requirements,
    targetHubId: guide.targetHubId,
    targetCollectionId: guide.targetCollectionId,
  })

  return guide
}

// ---------- Network & Hub Generation ----------

export interface GeneratedNetworkDraft {
  name: string
  description: string
  networkType: NetworkType
  themeDirection: ThemeDirection
  isPublic: boolean
  subdomainSuggestion: string
}

export interface GeneratedHubDraft {
  name: string
  hubKind: "game" | "product" | "department" | "topic" | "channel" | "other"
  description: string
  suggestedCollections: string[]
}

export interface ForgeRulesSuggestion {
  rules: Array<{
    ruleId: string
    name: string
    description: string
    enabled: boolean
  }>
}

/**
 * Generate a mock network draft for autofill.
 */
export function generateMockNetworkDraft(
  networkType: NetworkType
): GeneratedNetworkDraft {
  const names: Record<NetworkType, string[]> = {
    gaming: ["EverQuest Guide Network", "Raid Masters", "Gaming Nexus", "Battle Academy"],
    repair: ["FixIt Pro", "RepairHub", "TechCare Network", "Maintenance Central"],
    sop: ["Operations Hub", "Procedure Network", "SOP Central", "Workflow Guide"],
    creator: ["Creator Academy", "Content Masters", "Artist Collective", "Builder's Guild"],
    training: ["Training Central", "Skills Academy", "Development Hub", "Learning Network"],
    community: ["Community Wiki", "Knowledge Base", "Community Hub", "Shared Library"],
  }

  const selectedNames = names[networkType] || names.gaming
  const name = selectedNames[Math.floor(Math.random() * selectedNames.length)]
  const subdomain = name.toLowerCase().replace(/\s+/g, "-")

  const descriptions: Record<NetworkType, string> = {
    gaming: "A comprehensive gaming guide network for raids, builds, and strategies.",
    repair: "Repair guides and technical support documentation.",
    sop: "Standard operating procedures and business process documentation.",
    creator: "Educational content and creative resources for content creators.",
    training: "Training materials and professional development resources.",
    community: "Community-driven knowledge sharing and collaborative documentation.",
  }

  return {
    name,
    description: descriptions[networkType],
    networkType,
    themeDirection: (networkType === "gaming" ? "dark" : "light") as ThemeDirection,
    isPublic: true,
    subdomainSuggestion: subdomain,
  }
}

/**
 * Generate a mock hub draft for autofill.
 */
export function generateMockHubDraft(hubKind: string): GeneratedHubDraft {
  const names: Record<string, string[]> = {
    game: ["Emberfall", "Starfall Outriders", "HollowSpire", "Mechbound Tactics"],
    product: ["ElectriGuide Pro", "TechCare Plus", "Master Fix", "RepairPro"],
    department: ["Sales Team", "Engineering", "Operations", "Customer Support"],
    topic: ["Photography", "Cooking", "Writing", "Design"],
    channel: ["News", "Updates", "Community", "Releases"],
    other: ["General", "Resources", "Reference", "Info"],
  }

  const selectedNames = names[hubKind] || names.other
  const name = selectedNames[Math.floor(Math.random() * selectedNames.length)]

  const collections: Record<string, string[]> = {
    game: ["Character Builds", "Beginner Guides", "Boss Guides", "Patch Notes"],
    product: ["Getting Started", "Troubleshooting", "Features", "Updates"],
    department: ["Policies", "Procedures", "Templates", "Resources"],
    topic: ["Basics", "Intermediate", "Advanced", "Tips & Tricks"],
    channel: ["Announcements", "Archive", "Featured", "Community"],
    other: ["Guides", "Resources", "FAQ", "Miscellaneous"],
  }

  const suggestedCollections = collections[hubKind] || collections.other

  return {
    name,
    hubKind: hubKind as any,
    description: `Hub for ${name} content including guides, tutorials, and resources.`,
    suggestedCollections,
  }
}

/**
 * Generate mock Forge Rules suggestions for a network type.
 */
export function suggestMockForgeRules(
  networkType: NetworkType
): ForgeRulesSuggestion {
  // Universal rules for all networks
  const universalRules = [
    { ruleId: "title", name: "Descriptive Title", description: "Titles must be clear and descriptive", enabled: true },
    { ruleId: "summary", name: "Has Summary", description: "Every guide needs a summary section", enabled: true },
    { ruleId: "sections", name: "Minimum 3 Sections", description: "Guides should have at least 3 content sections", enabled: true },
  ]

  // Game-specific rules
  const gamingRules = [
    { ruleId: "game-name", name: "Game Name Present", description: "Guide must mention the game", enabled: true },
    { ruleId: "patch-version", name: "Patch/Version Noted", description: "Current patch or version should be noted", enabled: true },
    { ruleId: "difficulty", name: "Difficulty Level", description: "Guide must specify difficulty (Beginner/Intermediate/Advanced)", enabled: true },
    { ruleId: "requirements", name: "Requirements Listed", description: "Prerequisites should be clearly stated", enabled: true },
    { ruleId: "beginner-summary", name: "Beginner Summary", description: "Character builds should include beginner-friendly context", enabled: false },
    { ruleId: "spoiler-tagging", name: "Spoiler Tagging", description: "Boss guides should tag major story spoilers", enabled: true },
  ]

  const rulesByType: Record<NetworkType, any[]> = {
    gaming: [...universalRules, ...gamingRules],
    repair: [
      ...universalRules,
      { ruleId: "model", name: "Model/Product", description: "Must specify product model", enabled: true },
      { ruleId: "safety", name: "Safety Warning", description: "Include safety precautions if applicable", enabled: true },
    ],
    sop: [
      ...universalRules,
      { ruleId: "owner", name: "Process Owner", description: "Must identify responsible department", enabled: true },
      { ruleId: "frequency", name: "Frequency/Schedule", description: "Must specify how often process runs", enabled: true },
    ],
    creator: [...universalRules],
    training: [
      ...universalRules,
      { ruleId: "duration", name: "Estimated Duration", description: "Training time should be specified", enabled: true },
    ],
    community: [...universalRules],
  }

  return {
    rules: rulesByType[networkType] || universalRules,
  }
}

/**
 * Mock section regeneration - alternate content for a section.
 */
export function generateAlternateSectionContent(kind: GuideSectionKind): string {
  const alternates: Record<GuideSectionKind, string[]> = {
    overview: [
      "This comprehensive guide covers everything you need to succeed. Follow the strategies outlined to achieve mastery in this area.",
      "Learn the essential fundamentals and advanced techniques in this detailed walkthrough.",
    ],
    strengths: [
      "Exceptional tankiness and crowd control capabilities. Provides reliable damage with good survivability.",
      "Strong defensive options with high damage potential. Excellent for solo and group content.",
    ],
    weaknesses: [
      "Requires significant gear investment. Limited burst damage in some scenarios.",
      "Can be resource-intensive. May struggle against specific enemy types without proper preparation.",
    ],
    gear: [
      "Prioritize survivability first, then damage output. Balance is key for optimal performance.",
      "Focus on defensive attributes with secondary emphasis on critical strike chance.",
    ],
    "skill-priority": [
      "Defensive abilities first, damage second. This priority maximizes survival and overall output.",
      "Layer your abilities strategically. Crowd control should be prioritized after survivability.",
    ],
    rotation: [
      "Open with your main ability, then maintain with secondary abilities. Weave cooldowns as they become available.",
      "Start your rotation by establishing crowd control, then focus on sustained damage.",
    ],
    leveling: [
      "Focus on core gameplay mechanics early. Advanced features unlock gradually with progression.",
      "Invest in foundational abilities first. Specialization comes later in character development.",
    ],
    mistakes: [
      "Avoid rushing content. Take time to master fundamentals before attempting difficult encounters.",
      "Common error: Neglecting defensive preparation. Always prepare appropriately for encounters.",
    ],
    "patch-notes": [
      "Recent changes have adjusted balance across multiple systems. Review changes carefully.",
      "Latest patch includes significant updates to core mechanics. Adapt your strategy accordingly.",
    ],
    "final-tips": [
      "Practice regularly and study others' strategies. Community knowledge is invaluable.",
      "Stay updated on changes and continuously refine your approach. Mastery requires dedication.",
    ],
    requirements: [
      "Access specific content requirements. Complete prerequisites before proceeding.",
      "Must meet level and quest requirements. Ensure you have necessary items.",
    ],
    warning: [
      "This approach carries specific risks. Only use with proper preparation and support.",
    ],
    custom: [
      "Additional context and specialized information relevant to your situation.",
    ],
  }

  const variants = alternates[kind] || ["Additional information goes here."]
  return variants[Math.floor(Math.random() * variants.length)]
}

/**
 * Simulate the full generation flow.
 * Returns a GenerationResponse that the UI can display.
 */
export function generateMockResponse(
  request: GenerationRequest
): GenerationResponse {
  try {
    const guide = generateMockGuide(request)
    return {
      guide,
      success: true,
    }
  } catch (error) {
    return {
      guide: {} as GeneratedGuide,
      success: false,
      error: `Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ---------- Helper functions ----------

function generateTitle(request: GenerationRequest): string {
  const prompt = request.prompt
  const lower = prompt.toLowerCase()

  const diffLabel: Record<string, string> = {
    beginner: "Beginner's",
    intermediate: "Complete",
    advanced: "Advanced",
    expert: "Expert",
  }
  const difficulty = diffLabel[request.preferredDifficulty ?? "intermediate"] ?? "Complete"

  const typeLabel: Record<string, string> = {
    "character-build": "Build Guide",
    "boss-guide": "Boss Guide",
    "beginner-guide": "Getting Started Guide",
    walkthrough: "Walkthrough",
    "patch-notes": "Patch Notes",
    tutorial: "Tutorial",
    reference: "Reference Guide",
    news: "News Update",
    "repair-procedure": "Repair Guide",
    sop: "Standard Operating Procedure",
  }
  const typeStr = typeLabel[request.guideType] ?? "Guide"

  // Known games / products — checked before generic class detection
  const knownGames: [RegExp, string][] = [
    [/ember\s*fall/i, "Emberfall"],
    [/star\s*fall/i, "StarFall Outriders"],
    [/hollow\s*spire/i, "HollowSpire"],
    [/mech\s*bound/i, "MechBound Tactics"],
    [/minecraft/i, "Minecraft"],
    [/world of warcraft|wow\b/i, "World of Warcraft"],
    [/final fantasy/i, "Final Fantasy"],
    [/elden ring/i, "Elden Ring"],
    [/diablo/i, "Diablo"],
    [/fortnite/i, "Fortnite"],
    [/valorant/i, "Valorant"],
    [/league of legends|lol\b/i, "League of Legends"],
    [/path of exile|poe\b/i, "Path of Exile"],
  ]

  let gameContext = ""
  for (const [pattern, display] of knownGames) {
    if (pattern.test(prompt)) {
      gameContext = display
      break
    }
  }

  // Class / subject detection — broader vocabulary
  const subjectKeywords: [RegExp, string][] = [
    [/frost\s*shaman|ice\s*mage/i, "Frost Shaman"],
    [/\bfrost\b|\bice\b/i, "Frost Build"],
    [/fire\s*warden|blaze/i, "Fire Warden"],
    [/\bfire\b|\bflame\b/i, "Fire Build"],
    [/shadow\s*assassin/i, "Shadow Assassin"],
    [/\bshadow\b|\brogue\b/i, "Shadow Build"],
    [/holy\s*priest/i, "Holy Priest"],
    [/\bholy\b|\bpriest\b/i, "Healer Build"],
    [/\branger\b|\bbow\b|\barcher\b/i, "Ranger"],
    [/\btank\b/i, "Tank Build"],
    [/\bhealer\b|\bsupport\b/i, "Support Build"],
    [/\bwarrior\b/i, "Warrior"],
    [/\bmage\b|\bwizard\b/i, "Mage"],
    [/\bpaladin\b/i, "Paladin"],
    [/\bdruid\b/i, "Druid"],
    [/\bshaman\b/i, "Shaman"],
    [/\bhunter\b/i, "Hunter"],
  ]

  let subjectContext = ""
  for (const [pattern, display] of subjectKeywords) {
    if (pattern.test(prompt)) {
      subjectContext = display
      break
    }
  }

  if (subjectContext && gameContext) return `${difficulty} ${subjectContext} ${typeStr} — ${gameContext}`
  if (subjectContext) return `${difficulty} ${subjectContext} ${typeStr}`
  if (gameContext) return `${difficulty} ${typeStr} for ${gameContext}`

  // Extract the first meaningful phrase from the prompt to use as the subject
  const subject = extractPromptSubject(prompt)
  if (subject) return `${difficulty} ${subject} ${typeStr}`

  return `${difficulty} ${typeStr}`
}

function extractPromptSubject(prompt: string): string {
  // Strip leading verbs/articles to get the core noun phrase
  const cleaned = prompt
    .replace(/^(create|write|generate|make|build|give me|show me|help me|I need|I want|can you|please)\s+/i, "")
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/\s+(guide|tutorial|walkthrough|reference|for|about|on|in|covering)\s+.*/i, "")
    .trim()

  const words = cleaned.split(/\s+/).slice(0, 4)
  while (words.length > 0 && /^(for|to|a|an|the|about|on|in|of|that|which)$/i.test(words[words.length - 1])) {
    words.pop()
  }

  const subject = words.join(" ")
  if (!subject || subject.length < 3) return ""
  return subject.charAt(0).toUpperCase() + subject.slice(1)
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50)
}

function generateSummary(request: GenerationRequest): string {
  // Use the first 1–2 sentences of the prompt as the basis, then augment
  const prompt = request.prompt.trim()
  if (!prompt) return "A structured guide covering core mechanics, strategies, and actionable tips to help you succeed."

  // If the prompt is short, use it directly as a summary seed
  const firstSentence = prompt.split(/[.!?]/)[0].trim()
  if (firstSentence.length > 20 && firstSentence.length < 200) {
    return `${firstSentence}. This guide covers the key strategies, common mistakes to avoid, and step-by-step techniques you need to succeed.`
  }

  // Fallback: construct from guide type and difficulty
  const typeLabel = (request.guideType ?? "guide").replace(/-/g, " ")
  const diff = request.preferredDifficulty ?? "intermediate"
  return `A ${diff} ${typeLabel} designed to help you understand core mechanics, apply the right strategies, and avoid common mistakes. Follow each section in order for the best results.`
}

function formatSectionTitle(kind: GuideSectionKind): string {
  const titles: Record<GuideSectionKind, string> = {
    overview: "Overview",
    strengths: "Strengths",
    weaknesses: "Weaknesses",
    gear: "Gear & Items",
    "skill-priority": "Ability Priority",
    rotation: "Combat Rotation",
    leveling: "Leveling Path",
    mistakes: "Common Mistakes",
    "patch-notes": "Latest Changes",
    "final-tips": "Final Tips",
    requirements: "Requirements",
    warning: "Important",
    custom: "Additional Info",
  }
  return titles[kind] || kind
}

/**
 * FUTURE: Replace mock generation with real OpenAI call.
 *
 * Example pseudocode for future integration:
 *
 * async function generateGuideWithOpenAI(
 *   request: GenerationRequest
 * ): Promise<GeneratedGuide> {
 *   const client = new OpenAI({
 *     apiKey: process.env.OPENAI_API_KEY,
 *   })
 *
 *   const systemPrompt = `
 *     You are a guide generator for gaming wikis. Generate a structured guide in JSON format.
 *     Follow these forge rules: ${request.forgeRuleContext}
 *   `
 *
 *   const response = await client.chat.completions.create({
 *     model: request.model || "gpt-4",
 *     messages: [
 *       { role: "system", content: systemPrompt },
 *       { role: "user", content: request.prompt },
 *     ],
 *     temperature: 0.7,
 *     max_tokens: request.maxTokens || 4000,
 *   })
 *
 *   const jsonStr = response.choices[0].message.content || ""
 *   const guide: GeneratedGuide = JSON.parse(jsonStr)
 *
 *   // TODO: Save to Supabase
 *   // const { data } = await supabase
 *   //   .from("guides")
 *   //   .insert([convertGeneratedToGuide(guide)])
 *
 *   return guide
 * }
 */
