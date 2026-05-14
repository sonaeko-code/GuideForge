"use client"

import { useState, useEffect } from "react"
import { Loader2, ChevronRight, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAllNetworks } from "@/lib/guideforge/supabase-networks"
import { getHubsByNetworkId, getCollectionsByHubId } from "@/lib/guideforge/supabase-networks"
import { updateAssetDraft } from "@/lib/guideforge/asset-draft-helpers"
import type { Network, Hub, Collection } from "@/lib/guideforge/types"

interface AttachToNetworkPanelProps {
  assetId: string
  currentNetworkId?: string | null
  currentHubId?: string | null
  currentCollectionId?: string | null
  onClose: () => void
  onSuccess?: () => void
}

type Step = "networks" | "hubs" | "collections"

export function AttachToNetworkPanel({
  assetId,
  currentNetworkId,
  currentHubId,
  currentCollectionId,
  onClose,
  onSuccess,
}: AttachToNetworkPanelProps) {
  const [step, setStep] = useState<Step>("networks")
  const [networks, setNetworks] = useState<Network[]>([])
  const [hubs, setHubs] = useState<Hub[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(currentNetworkId || null)
  const [selectedHubId, setSelectedHubId] = useState<string | null>(currentHubId || null)
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(currentCollectionId || null)
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isAttaching, setIsAttaching] = useState(false)

  // Load networks on mount
  useEffect(() => {
    const loadNetworks = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getAllNetworks()
        setNetworks(data)
        if (data.length === 0) {
          setError("You don't have any networks yet. Create a network first.")
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load networks"
        setError(msg)
        console.error("[v0] Failed to load networks:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadNetworks()
  }, [])

  // Load hubs when network selected
  useEffect(() => {
    if (!selectedNetworkId) {
      setHubs([])
      setSelectedHubId(null)
      return
    }

    const loadHubs = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getHubsByNetworkId(selectedNetworkId)
        setHubs(data)
        if (data.length === 0) {
          setError("This network has no hubs yet. Create a hub first.")
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load hubs"
        setError(msg)
        console.error("[v0] Failed to load hubs:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadHubs()
  }, [selectedNetworkId])

  // Load collections when hub selected
  useEffect(() => {
    if (!selectedHubId) {
      setCollections([])
      setSelectedCollectionId(null)
      return
    }

    const loadCollections = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getCollectionsByHubId(selectedHubId)
        setCollections(data)
        if (data.length === 0) {
          setError("This hub has no collections yet. Create a collection first.")
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load collections"
        setError(msg)
        console.error("[v0] Failed to load collections:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadCollections()
  }, [selectedHubId])

  const handleSelectNetwork = (networkId: string) => {
    setSelectedNetworkId(networkId)
    setSelectedHubId(null)
    setSelectedCollectionId(null)
    setStep("hubs")
  }

  const handleSelectHub = (hubId: string) => {
    setSelectedHubId(hubId)
    setSelectedCollectionId(null)
    setStep("collections")
  }

  const handleSelectCollection = (collectionId: string) => {
    setSelectedCollectionId(collectionId)
  }

  const handleAttach = async () => {
    if (!selectedNetworkId || !selectedHubId || !selectedCollectionId) {
      setError("Please select a network, hub, and collection")
      return
    }

    // Check for duplicate attachment (same collection)
    if (
      currentNetworkId === selectedNetworkId &&
      currentHubId === selectedHubId &&
      currentCollectionId === selectedCollectionId
    ) {
      setError("This asset is already attached to that collection. Select a different collection to move it.")
      return
    }

    setIsAttaching(true)
    setError(null)
    try {
      const result = await updateAssetDraft(assetId, {
        attachedNetworkId: selectedNetworkId,
        attachedHubId: selectedHubId,
        attachedCollectionId: selectedCollectionId,
      })

      if (!result.success) {
        setError(result.error || "Failed to attach asset")
        setIsAttaching(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(msg)
      console.error("[v0] Attach error:", err)
      setIsAttaching(false)
    }
  }

  const selectedNetwork = networks.find(n => n.id === selectedNetworkId)
  const selectedHub = hubs.find(h => h.id === selectedHubId)
  const selectedCollection = collections.find(c => c.id === selectedCollectionId)

  return (
    <>
      {success ? (
        <div className="space-y-4 py-6 text-center">
          <div className="flex justify-center">
            <CheckCircle className="size-12 text-green-600" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Asset attached successfully!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your asset is now part of the {selectedCollection?.name} collection.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
      {/* Breadcrumb/Progress */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={selectedNetworkId ? "font-semibold text-foreground" : ""}>
          {selectedNetwork?.name || "Network"}
        </span>
        {selectedNetworkId && selectedHubId && (
          <>
            <ChevronRight className="size-4" aria-hidden="true" />
            <span className={selectedHubId ? "font-semibold text-foreground" : ""}>
              {selectedHub?.name || "Hub"}
            </span>
          </>
        )}
        {selectedNetworkId && selectedHubId && selectedCollectionId && (
          <>
            <ChevronRight className="size-4" aria-hidden="true" />
            <span className="font-semibold text-foreground">
              {selectedCollection?.name || "Collection"}
            </span>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950 p-3 flex gap-2">
          <AlertCircle className="size-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span className="text-sm">Loading...</span>
        </div>
      )}

      {/* Networks Selection */}
      {!isLoading && step === "networks" && networks.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {networks.map((network) => (
            <button
              key={network.id}
              onClick={() => handleSelectNetwork(network.id)}
              className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{network.name}</p>
                  {network.description && (
                    <p className="text-xs text-muted-foreground mt-1">{network.description}</p>
                  )}
                </div>
                <ChevronRight className="size-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Hubs Selection */}
      {!isLoading && step === "hubs" && selectedNetworkId && hubs.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {hubs.map((hub) => (
            <button
              key={hub.id}
              onClick={() => handleSelectHub(hub.id)}
              className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{hub.name}</p>
                  {hub.description && (
                    <p className="text-xs text-muted-foreground mt-1">{hub.description}</p>
                  )}
                </div>
                <ChevronRight className="size-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Collections Selection */}
      {!isLoading && step === "collections" && selectedHubId && collections.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {collections.map((collection) => (
            <button
              key={collection.id}
              onClick={() => handleSelectCollection(collection.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedCollectionId === collection.id
                  ? "bg-primary/10 border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{collection.name}</p>
                  {collection.description && (
                    <p className="text-xs text-muted-foreground mt-1">{collection.description}</p>
                  )}
                </div>
                {selectedCollectionId === collection.id && (
                  <Badge className="flex-shrink-0">Selected</Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose} disabled={isAttaching}>
          Cancel
        </Button>
        <Button
          onClick={handleAttach}
          disabled={!selectedNetworkId || !selectedHubId || !selectedCollectionId || isAttaching}
        >
          {isAttaching && <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />}
          {isAttaching ? "Attaching..." : "Attach to Collection"}
        </Button>
      </div>
        </div>
      )}
    </>
  )
}
