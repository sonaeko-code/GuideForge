"use client"

import { useState } from "react"
import { Sparkles, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { suggestMockForgeRules } from "@/lib/guideforge/mock-generator"
import type { NetworkType } from "@/lib/guideforge/types"

interface SuggestRulesButtonProps {
  networkType: NetworkType
}

export function SuggestRulesButton({ networkType }: SuggestRulesButtonProps) {
  const [suggested, setSuggested] = useState(false)

  const handleSuggestRules = () => {
    // Mock suggestion - in real app would call OpenAI
    const suggestion = suggestMockForgeRules(networkType)
    console.log("[v0] Suggested rules:", suggestion)
    setSuggested(true)
  }

  return (
    <div className="flex items-center gap-2">
      {suggested && (
        <>
          <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span className="text-sm text-emerald-700 dark:text-emerald-300">Rules suggested</span>
        </>
      )}
      {!suggested && (
        <Button onClick={handleSuggestRules} size="sm" variant="secondary">
          <Sparkles className="mr-2 size-4" aria-hidden="true" />
          Suggest Rules
        </Button>
      )}
    </div>
  )
}
