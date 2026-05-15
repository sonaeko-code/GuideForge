"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Lightbulb } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { routeIdea, type IdeaRouterResult, type RecommendedPath } from "@/lib/guideforge/idea-router"
import { writeIntakeSession } from "@/lib/guideforge/intake-session"

const EXAMPLE_CHIPS = [
  "Build a full guide network",
  "Make a repeatable checklist",
  "Turn this into a guide",
  "Organize my knowledge",
  "Create SOPs",
  "Build a community knowledge base",
]

export function WelcomeIntakePanel() {
  const router = useRouter()
  const [idea, setIdea] = useState("")
  const [result, setResult] = useState<IdeaRouterResult | null>(null)
  const [showRecommendation, setShowRecommendation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAnalyze = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedIdea = idea.trim()
    if (!trimmedIdea) return

    // Analyze the idea
    const routeResult = routeIdea(trimmedIdea)
    setResult(routeResult)
    setShowRecommendation(true)
  }

  const handleSelectPath = (path: RecommendedPath) => {
    const trimmedIdea = idea.trim()
    if (!trimmedIdea || !result) return

    setIsSubmitting(true)

    // Use unified intake session helper to write all data
    writeIntakeSession({
      idea: trimmedIdea,
      routerResult: result,
      targetPath: path,
    })

    // Route to the appropriate builder
    switch (path) {
      case "network":
        router.push("/builder/network/new")
        break
      case "single_guide":
        router.push("/builder/generate-asset/single_guide")
        break
      case "checklist":
        router.push("/builder/generate-asset/checklist")
        break
    }
  }

  const handleQuickClick = (exampleText: string) => {
    setIdea(exampleText)
    // Auto-analyze after a tick to ensure state is updated
    setTimeout(() => {
      const routeResult = routeIdea(exampleText)
      setResult(routeResult)
      setShowRecommendation(true)
    }, 0)
  }

  if (showRecommendation && result) {
    return (
      <div className="mb-12 space-y-6">
        <Card className="border-primary/20 bg-primary/5 p-6">
          <div className="space-y-4">
            {/* Recommendation header */}
            <div className="flex items-start gap-3">
              <Lightbulb className="size-5 flex-shrink-0 text-primary mt-1" aria-hidden="true" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">Here&apos;s what we recommend</h2>
                <p className="text-sm text-muted-foreground mt-1">{result.detectedIntent}</p>
              </div>
              <Badge variant="outline" className="capitalize">
                {result.confidence} confidence
              </Badge>
            </div>

            {/* Recommendation details */}
            <div className="space-y-2 text-sm text-muted-foreground">
              {result.reasoning.map((reason, i) => (
                <p key={i}>• {reason}</p>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                size="lg"
                onClick={() => handleSelectPath(result.recommendedPath)}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? "Loading..." : "Build Recommended Path"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>

            {/* Alternative paths */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.routeOptions
                .filter((opt) => opt.path !== result.recommendedPath)
                .map((opt) => (
                  <Button
                    key={opt.path}
                    variant="outline"
                    onClick={() => handleSelectPath(opt.path)}
                    disabled={isSubmitting}
                    className="h-auto min-h-[80px] text-left whitespace-normal p-3"
                  >
                    <div className="flex flex-col gap-1.5 items-start w-full">
                      <span className="font-medium text-sm leading-snug">{opt.label}</span>
                      <span className="text-xs text-muted-foreground leading-snug">{opt.description}</span>
                    </div>
                  </Button>
                ))}
            </div>
            </div>

            {/* Back to edit */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setShowRecommendation(false)
                  setResult(null)
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Edit your idea
              </button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <Card className="border-primary/20 bg-primary/5 p-6 mb-12">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">What are you trying to build?</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Describe what you want to organize, teach, document, troubleshoot, publish, or turn into a reusable system.
            GuideForge will recommend the best path forward.
          </p>
        </div>

        {/* Idea input */}
        <form onSubmit={handleAnalyze} className="space-y-4">
          <textarea
            placeholder="e.g. I need a system to track my kids' routines, medications, allergies, and emergency contacts. Include seasonal maintenance tasks and a baby supply checklist..."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          <Button type="submit" size="lg" disabled={!idea.trim()} className="gap-2 w-full sm:w-auto">
            Analyze & Recommend
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </form>

        {/* Example chips */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Or try an example:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleQuickClick(chip)}
                className="rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
