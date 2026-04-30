"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Home,
  Compass,
  Gamepad2,
  Zap,
  Newspaper,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { StarterPageId } from "@/lib/guideforge/types"
import { cn } from "@/lib/utils"

interface StarterPageOption {
  id: StarterPageId
  title: string
  description: string
  icon: React.ReactNode
}

const STARTER_PAGES: StarterPageOption[] = [
  {
    id: "home",
    title: "Home",
    description:
      "Landing page for the network with hero, featured content, and navigation.",
    icon: <Home className="size-5" aria-hidden="true" />,
  },
  {
    id: "directory",
    title: "Game Directory",
    description: "Browse all games in the network with search and filtering.",
    icon: <Compass className="size-5" aria-hidden="true" />,
  },
  {
    id: "hub",
    title: "Game Hub",
    description:
      "Landing page for a single game with collections and featured guides.",
    icon: <Gamepad2 className="size-5" aria-hidden="true" />,
  },
  {
    id: "primary-guide",
    title: "Character Build",
    description:
      "Template for structured build guides with requirements, gear, rotation.",
    icon: <Zap className="size-5" aria-hidden="true" />,
  },
  {
    id: "news",
    title: "News & Patch",
    description: "Updates, patch notes, and announcements for the network.",
    icon: <Newspaper className="size-5" aria-hidden="true" />,
  },
  {
    id: "beginner-guide",
    title: "Beginner Guide",
    description:
      "Accessibility-first guide for new players learning the basics.",
    icon: <BookOpen className="size-5" aria-hidden="true" />,
  },
]

export function StarterPagePicker({ networkName }: { networkName?: string }) {
  const [selected, setSelected] = useState<Set<StarterPageId>>(
    new Set(["home", "hub", "primary-guide", "beginner-guide"])
  )

  const togglePage = (id: StarterPageId) => {
    const updated = new Set(selected)
    if (updated.has(id)) {
      updated.delete(id)
    } else {
      updated.add(id)
    }
    setSelected(updated)
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        {STARTER_PAGES.map((page) => (
          <button
            key={page.id}
            onClick={() => togglePage(page.id)}
            className={cn(
              "group relative overflow-hidden rounded-lg border-2 px-4 py-4 text-left transition-all",
              selected.has(page.id)
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/60 hover:bg-muted/30"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-1 flex items-center justify-center rounded transition-colors",
                  selected.has(page.id)
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                {page.icon}
              </div>
              <div className="flex-1 gap-1">
                <h3 className="font-semibold text-foreground">{page.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {page.description}
                </p>
              </div>
              <div
                className={cn(
                  "mt-1 size-5 rounded border-2 transition-all",
                  selected.has(page.id)
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}
              >
                {selected.has(page.id) && (
                  <svg
                    className="size-full p-0.5 text-background"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <Button asChild variant="outline">
          <Link href={`/builder/network/new${networkName ? `?name=${networkName}` : ""}`}>
            Back
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/builder/network/forge-rules${networkName ? `?name=${networkName}` : ""}`}>
            Continue to Forge Rules
          </Link>
        </Button>
      </div>
    </div>
  )
}
