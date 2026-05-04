"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { AlertCircle, Loader2, Check } from "lucide-react"
import {
  getAllScaffoldTemplates,
  getScaffoldTemplate,
  type ScaffoldTemplate,
} from "@/lib/guideforge/starter-scaffolds"
import { createNetworkScaffold } from "@/lib/guideforge/create-network-scaffold"

export function ScaffoldBuilder() {
  const router = useRouter()
  const [step, setStep] = useState<"select" | "configure" | "preview" | "creating">("select")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ScaffoldTemplate | null>(null)
  const [networkName, setNetworkName] = useState("")
  const [networkSlug, setNetworkSlug] = useState("")
  const [networkDescription, setNetworkDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [createdNetworkId, setCreatedNetworkId] = useState<string | null>(null)

  const templates = getAllScaffoldTemplates()

  // Step 1: Select template
  const handleSelectTemplate = (templateId: string) => {
    const template = getScaffoldTemplate(templateId)
    if (template) {
      setSelectedTemplateId(templateId)
      setSelectedTemplate(template)
      setNetworkName(template.networkTemplate.name)
      setNetworkSlug(template.networkTemplate.slug)
      setNetworkSlugManuallyEdited(false)
      setNetworkDescription(template.networkTemplate.description)
      setError(null)
      setStep("configure")
    }
  }

  // Step 2: Configure network details
  const handleContinueToPreview = () => {
    if (!networkName.trim()) {
      setError("Network name is required")
      return
    }
    if (!computedSlug.trim()) {
      setError("Network slug is required")
      return
    }
    setError(null)
    setStep("preview")
  }

  // Step 3: Preview scaffold
  const handleCreateScaffold = async () => {
    if (!selectedTemplate) {
      setError("No template selected")
      return
    }

    setStep("creating")
    setError(null)

    try {
      console.log("[v0] ScaffoldBuilder: Creating scaffold with:", {
        template: selectedTemplate.id,
        networkName,
        networkSlug: computedSlug,
        networkDescription,
      })

      const result = await createNetworkScaffold(selectedTemplate, {
        networkName,
        networkSlug: computedSlug,
        networkDescription,
      })

      if (!result.success) {
        console.error("[v0] ScaffoldBuilder: Scaffold creation failed:", result.error)
        setError(result.error || "Failed to create scaffold")
        setStep("preview")
        return
      }

      if (!result.network?.id) {
        console.error("[v0] ScaffoldBuilder: No network ID returned")
        setError("Scaffold created but network ID not returned")
        setStep("preview")
        return
      }

      console.log("[v0] ScaffoldBuilder: Scaffold created successfully:", result.network.id)
      console.log("[v0] ScaffoldBuilder: Hubs created:", result.hubs?.length || 0)
      console.log("[v0] ScaffoldBuilder: Collections created:", result.collections?.length || 0)

      setCreatedNetworkId(result.network.id)

      // Route to new network dashboard after 1.5 seconds
      setTimeout(() => {
        router.push(`/builder/network/${result.network!.id}/dashboard`)
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] ScaffoldBuilder: Exception:", message)
      setError(message)
      setStep("preview")
    }
  }

  // Step 1: Template selection
  if (step === "select") {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Choose a template</h2>
          <p className="text-muted-foreground">
            Select a scaffold template to pre-populate your network structure with hubs and collections.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="p-6 cursor-pointer hover:border-primary/50 transition-colors flex flex-col"
              onClick={() => handleSelectTemplate(template.id)}
            >
              <div className="text-4xl mb-4">{template.icon}</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{template.name}</h3>
              <p className="text-sm text-muted-foreground flex-1 mb-4">{template.description}</p>
              <div className="text-xs text-muted-foreground">
                {template.hubs.length} hubs, {template.hubs.reduce((sum, h) => sum + h.collections.length, 0)} collections
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Step 2: Configure network details
  if (step === "configure") {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep("select")}
            className="mb-6"
          >
            ← Back to templates
          </Button>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Configure your network</h2>
          <p className="text-muted-foreground">
            Customize the network name, slug, and description. You can edit these anytime.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Network Name</label>
            <Input
              value={networkName}
              onChange={(e) => setNetworkName(e.target.value)}
              placeholder="e.g., Gaming Guides"
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Network Slug</label>
            <Input
              value={computedSlug}
              onChange={(e) => {
                setNetworkSlug(e.target.value)
                setNetworkSlugManuallyEdited(true)
              }}
              placeholder="e.g., gaming-guides"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">Used in URLs and as an identifier</p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Description</label>
            <Input
              value={networkDescription}
              onChange={(e) => setNetworkDescription(e.target.value)}
              placeholder="Describe your network..."
              className="w-full"
            />
          </div>

          {error && (
            <div className="flex gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="size-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setStep("select")}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleContinueToPreview}
              className="flex-1"
            >
              Preview Scaffold
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Preview scaffold
  if (step === "preview" && selectedTemplate) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep("configure")}
            className="mb-6"
          >
            ← Back to configuration
          </Button>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Preview your scaffold</h2>
          <p className="text-muted-foreground">
            Review the hubs and collections that will be created. Changes made above will be reflected here.
          </p>
        </div>

        <div className="space-y-6">
          {/* Network info */}
          <Card className="p-6 bg-secondary/40">
            <h3 className="font-semibold text-foreground mb-2">Network</h3>
            <div className="text-sm space-y-1 text-muted-foreground">
              <div><span className="font-medium text-foreground">{networkName}</span></div>
              <div>/{networkSlug}</div>
              <div>{networkDescription}</div>
            </div>
          </Card>

          {/* Hubs and collections */}
          <div className="space-y-4">
            {selectedTemplate.hubs.map((hubGroup, hubIndex) => (
              <Card key={hubIndex} className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-2xl">📁</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{hubGroup.hub.name}</h4>
                    <p className="text-xs text-muted-foreground">{hubGroup.hub.description}</p>
                  </div>
                </div>

                <div className="space-y-2 ml-9">
                  {hubGroup.collections.map((collection, colIndex) => (
                    <div key={colIndex} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium text-foreground">{collection.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground ml-5">{collection.description}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <div className="text-sm text-muted-foreground py-4 border-t">
            <strong className="text-foreground">Will create:</strong>
            <div className="mt-2 space-y-1">
              <div>1 Network</div>
              <div>{selectedTemplate.hubs.length} Hubs</div>
              <div>{selectedTemplate.hubs.reduce((sum, h) => sum + h.collections.length, 0)} Collections</div>
            </div>
          </div>

          {error && (
            <div className="flex gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="size-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setStep("configure")}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleCreateScaffold}
              className="flex-1"
            >
              Create Scaffold
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Step 4: Creating scaffold
  if (step === "creating") {
    return (
      <div className="w-full max-w-2xl mx-auto text-center py-12">
        {createdNetworkId ? (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Check className="size-8 text-primary" aria-hidden="true" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Scaffold created!</h2>
              <p className="text-muted-foreground">
                Your network scaffold has been created successfully. Redirecting to dashboard...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              <Loader2 className="size-8 text-primary animate-spin" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Creating scaffold...</h2>
              <p className="text-muted-foreground">
                Creating your network, hubs, and collections from the template.
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
