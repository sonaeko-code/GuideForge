"use client"

import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"

export function WelcomeIntakePanel() {
  const router = useRouter()
  const [idea, setIdea] = useState("")

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedIdea = idea.trim()
    if (!trimmedIdea) return

    // Store the idea in sessionStorage for the wizard to pick up
    sessionStorage.setItem("guideforge:quick-idea", trimmedIdea)
    // Route to network creation with the idea
    router.push("/builder/network/new")
  }

  return (
    <div className="mb-12 rounded-xl border border-primary/20 bg-primary/5 p-6">
      <h2 className="text-lg font-semibold text-foreground mb-2">Start with an idea</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Describe what you want to build, and GuideForge will suggest the best path forward.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 flex-col sm:flex-row">
        <input
          type="text"
          placeholder="e.g. Build a survival RPG guide network for my gaming community..."
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          Let&apos;s Build
        </button>
      </form>
    </div>
  )
}
