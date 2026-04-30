"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { generateMockHubDraft } from "@/lib/guideforge/mock-generator"
import type { Hub } from "@/lib/guideforge/types"

interface CreateHubFormProps {
  networkId: string
}

export function CreateHubForm({ networkId }: CreateHubFormProps) {
  const router = useRouter()
  const [name, setName] = useState("Emberfall")
  const [hubKind, setHubKind] = useState<Hub["hubKind"]>("game")
  const [description, setDescription] = useState(
    "A high-fantasy MMO of burning kingdoms and cinder magic."
  )
  const [collectionNames, setCollectionNames] = useState([
    "Character Builds",
    "Beginner Guides",
    "Boss Guides",
    "Patch Notes",
  ])
  const [generationAttempted, setGenerationAttempted] = useState(false)

  const handleGenerateDraft = () => {
    const draft = generateMockHubDraft(hubKind)
    setName(draft.name)
    setDescription(draft.description)
    setCollectionNames(draft.suggestedCollections)
    setGenerationAttempted(true)
  }

  const handleSave = () => {
    // TODO: Save hub to Supabase
    router.push(`/builder/network/${networkId}/dashboard`)
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Generate Hub Draft:</span> Auto-suggest hub name, description, and collection structure based on the hub type. <span className="text-xs text-muted-foreground">Mock generation — no credits used.</span>
            </p>
          </div>
          {generationAttempted && (
            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          )}
        </div>
        {generationAttempted && (
          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">Hub draft generated. You can edit anything before saving.</p>
        )}
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="hub-name">Hub name</FieldLabel>
          <FieldDescription>For a gaming network, this is the game title. For repair networks, a product line. For SOP networks, a department.</FieldDescription>
          <Input
            id="hub-name"
            placeholder="e.g. Emberfall, ElectriGuide Pro, Logistics SOP"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="hub-kind">Hub type</FieldLabel>
          <FieldDescription>Determines how the hub is presented in navigation and cards.</FieldDescription>
          <Select value={hubKind} onValueChange={(v) => setHubKind(v as Hub["hubKind"])}>
            <SelectTrigger id="hub-kind" className="mt-2">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="game">Game</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="department">Department</SelectItem>
              <SelectItem value="topic">Topic</SelectItem>
              <SelectItem value="channel">Channel</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="hub-desc">Description</FieldLabel>
          <FieldDescription>Plain-language overview shown on the hub card and top of hub pages.</FieldDescription>
          <Textarea
            id="hub-desc"
            placeholder="Describe what this hub covers..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2"
          />
        </Field>

        <Field>
          <FieldLabel>Collections to include</FieldLabel>
          <FieldDescription>Create collections that hold guides. You can add more later.</FieldDescription>
          <div className="mt-2 space-y-2">
            {collectionNames.map((collName, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2"
              >
                <span className="flex-1 text-sm font-medium">{collName}</span>
                <button
                  type="button"
                  onClick={() =>
                    setCollectionNames(collectionNames.filter((_, i) => i !== idx))
                  }
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </Field>
      </FieldGroup>

      <div className="flex gap-3 pt-4">
        <Button asChild variant="outline">
          <Link href={`/builder/network/${networkId}/dashboard`}>
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Cancel
          </Link>
        </Button>
        <Button onClick={handleGenerateDraft} variant="secondary">
          <Sparkles className="mr-2 size-4" aria-hidden="true" />
          Generate Draft
        </Button>
        <Button onClick={handleSave}>Save Hub</Button>
      </div>
    </div>
  )
}
