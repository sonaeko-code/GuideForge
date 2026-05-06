"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { createHub, updateHub, createCollection, updateCollection, getHubsByNetworkId, getCollectionsByHubId, getCurrentUserNetworkAuthority } from "@/lib/guideforge/supabase-networks"
import type { Hub, Collection, Network } from "@/lib/guideforge/types"

interface NetworkStructureManagerProps {
  network: Network
  networkId: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export function NetworkStructureManager({ network, networkId }: NetworkStructureManagerProps) {
  const router = useRouter()

  // Phase 6: Permission gating
  const [canManageNetwork, setCanManageNetwork] = useState(false)
  const [checkingPermissions, setCheckingPermissions] = useState(true)

  // Hub management
  const [hubs, setHubs] = useState<Hub[]>([])
  const [hubsLoaded, setHubsLoaded] = useState(false)
  const [expandedHubIds, setExpandedHubIds] = useState<Set<string>>(new Set())

  // Collection management
  const [collectionsMap, setCollectionsMap] = useState<Record<string, Collection[]>>({})

  // Add hub form
  const [showAddHub, setShowAddHub] = useState(false)
  const [newHubName, setNewHubName] = useState("")
  const [newHubDescription, setNewHubDescription] = useState("")
  const [newHubSlug, setNewHubSlug] = useState("")
  const [newHubSlugManuallyEdited, setNewHubSlugManuallyEdited] = useState(false)
  const [addingHub, setAddingHub] = useState(false)
  const [hubError, setHubError] = useState<string | null>(null)

  // Edit hub form
  const [editingHubId, setEditingHubId] = useState<string | null>(null)
  const [editHubName, setEditHubName] = useState("")
  const [editHubDescription, setEditHubDescription] = useState("")
  const [editHubSlug, setEditHubSlug] = useState("")
  const [editHubSlugManuallyEdited, setEditHubSlugManuallyEdited] = useState(false)
  const [editingHub, setEditingHub] = useState(false)

  // Add collection form
  const [showAddCollectionHubId, setShowAddCollectionHubId] = useState<string | null>(null)
  const [newCollectionName, setNewCollectionName] = useState("")
  const [newCollectionDescription, setNewCollectionDescription] = useState("")
  const [newCollectionSlug, setNewCollectionSlug] = useState("")
  const [newCollectionSlugManuallyEdited, setNewCollectionSlugManuallyEdited] = useState(false)
  const [addingCollection, setAddingCollection] = useState(false)
  const [collectionError, setCollectionError] = useState<string | null>(null)

  // Edit collection form
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const [editCollectionName, setEditCollectionName] = useState("")
  const [editCollectionDescription, setEditCollectionDescription] = useState("")
  const [editCollectionSlug, setEditCollectionSlug] = useState("")
  const [editCollectionSlugManuallyEdited, setEditCollectionSlugManuallyEdited] = useState(false)
  const [editingCollection, setEditingCollection] = useState(false)

  // Success message
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Phase 6: Check permissions on mount
  useEffect(() => {
    const checkAuth = async () => {
      setCheckingPermissions(true)
      const authority = await getCurrentUserNetworkAuthority(networkId)
      setCanManageNetwork(authority.canManageNetwork)
      setCheckingPermissions(false)
    }
    checkAuth()
  }, [networkId])

  // Load hubs on mount
  if (!hubsLoaded && !checkingPermissions) {
    loadHubs()
  }

  async function loadHubs() {
    setHubsLoaded(true)
    const loaded = await getHubsByNetworkId(networkId)
    setHubs(loaded)
  }

  async function loadCollectionsForHub(hubId: string) {
    const collections = await getCollectionsByHubId(hubId)
    setCollectionsMap((prev) => ({ ...prev, [hubId]: collections }))
  }

  async function handleAddHub(e: React.FormEvent) {
    e.preventDefault()
    if (!newHubName.trim()) {
      setHubError("Hub name is required")
      return
    }

    setAddingHub(true)
    setHubError(null)

    try {
      const slug = newHubSlugManuallyEdited ? newHubSlug : slugify(newHubName)

      const { hub, error } = await createHub(networkId, {
        name: newHubName,
        slug,
        description: newHubDescription,
        hubKind: "topic",
        collectionIds: [],
        networkId: networkId,
        id: "", // Will be set by Supabase
      })

      if (error || !hub.id) {
        setHubError(error || "Failed to create hub")
        return
      }

      setSuccessMessage("Hub created successfully")
      setTimeout(() => setSuccessMessage(null), 3000)

      setNewHubName("")
      setNewHubDescription("")
      setNewHubSlug("")
      setNewHubSlugManuallyEdited(false)
      setShowAddHub(false)

      // Reload hubs
      await loadHubs()
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setHubError(message)
    } finally {
      setAddingHub(false)
    }
  }

  async function handleUpdateHub(e: React.FormEvent) {
    e.preventDefault()
    if (!editingHubId) return
    if (!editHubName.trim()) {
      setHubError("Hub name is required")
      return
    }

    setEditingHub(true)
    setHubError(null)

    try {
      const slug = editHubSlugManuallyEdited ? editHubSlug : slugify(editHubName)

      const { hub, error } = await updateHub(editingHubId, {
        name: editHubName,
        slug,
        description: editHubDescription,
      })

      if (error || !hub) {
        setHubError(error || "Failed to update hub")
        return
      }

      setSuccessMessage("Hub updated successfully")
      setTimeout(() => setSuccessMessage(null), 3000)

      setEditingHubId(null)
      setEditHubName("")
      setEditHubDescription("")
      setEditHubSlug("")
      setEditHubSlugManuallyEdited(false)

      // Reload hubs
      await loadHubs()
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setHubError(message)
    } finally {
      setEditingHub(false)
    }
  }

  async function handleAddCollection(e: React.FormEvent, hubId: string) {
    e.preventDefault()
    if (!newCollectionName.trim()) {
      setCollectionError("Collection name is required")
      return
    }

    setAddingCollection(true)
    setCollectionError(null)

    try {
      const slug = newCollectionSlugManuallyEdited ? newCollectionSlug : slugify(newCollectionName)

      const { collection, error } = await createCollection(networkId, hubId, {
        name: newCollectionName,
        slug,
        description: newCollectionDescription,
        defaultGuideType: "how-to",
      })

      if (error || !collection.id) {
        setCollectionError(error || "Failed to create collection")
        return
      }

      setSuccessMessage("Collection created successfully")
      setTimeout(() => setSuccessMessage(null), 3000)

      setNewCollectionName("")
      setNewCollectionDescription("")
      setNewCollectionSlug("")
      setNewCollectionSlugManuallyEdited(false)
      setShowAddCollectionHubId(null)

      // Reload collections for this hub
      await loadCollectionsForHub(hubId)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setCollectionError(message)
    } finally {
      setAddingCollection(false)
    }
  }

  async function handleUpdateCollection(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCollectionId) return
    if (!editCollectionName.trim()) {
      setCollectionError("Collection name is required")
      return
    }

    setEditingCollection(true)
    setCollectionError(null)

    try {
      const slug = editCollectionSlugManuallyEdited ? editCollectionSlug : slugify(editCollectionName)

      const { collection, error } = await updateCollection(editingCollectionId, {
        name: editCollectionName,
        slug,
        description: editCollectionDescription,
      })

      if (error || !collection) {
        setCollectionError(error || "Failed to update collection")
        return
      }

      setSuccessMessage("Collection updated successfully")
      setTimeout(() => setSuccessMessage(null), 3000)

      setEditingCollectionId(null)
      setEditCollectionName("")
      setEditCollectionDescription("")
      setEditCollectionSlug("")
      setEditCollectionSlugManuallyEdited(false)

      // Reload all hubs and collections
      await loadHubs()
      for (const hub of hubs) {
        await loadCollectionsForHub(hub.id)
      }
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setCollectionError(message)
    } finally {
      setEditingCollection(false)
    }
  }

  function startEditHub(hub: Hub) {
    setEditingHubId(hub.id)
    setEditHubName(hub.name)
    setEditHubDescription(hub.description)
    setEditHubSlug(hub.slug)
    setEditHubSlugManuallyEdited(false)
  }

  function startEditCollection(collection: Collection) {
    setEditingCollectionId(collection.id)
    setEditCollectionName(collection.name)
    setEditCollectionDescription(collection.description)
    setEditCollectionSlug(collection.slug)
    setEditCollectionSlugManuallyEdited(false)
  }

  function toggleHubExpanded(hubId: string) {
    const newExpanded = new Set(expandedHubIds)
    if (newExpanded.has(hubId)) {
      newExpanded.delete(hubId)
    } else {
      newExpanded.add(hubId)
      loadCollectionsForHub(hubId)
    }
    setExpandedHubIds(newExpanded)
  }

  return (
    <div className="space-y-6">
      {/* Phase 6: Permission check */}
      {checkingPermissions ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : !canManageNetwork ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <Lock className="size-5 text-amber-700 dark:text-amber-300 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            You can view this network, but only owners/admins can edit hubs and collections.
          </p>
        </div>
      ) : (
        <>
      {successMessage && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex gap-3">
          <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</p>
        </div>
      )}

      {/* Hubs section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Hubs</h3>
            <p className="text-sm text-muted-foreground">Organize your network into hubs</p>
          </div>
          {!showAddHub && (
            <Button onClick={() => setShowAddHub(true)} size="sm" className="gap-2">
              <Plus className="size-4" aria-hidden="true" />
              Add Hub
            </Button>
          )}
        </div>

        {/* Add hub form */}
        {showAddHub && (
          <form onSubmit={handleAddHub} className="mb-6 p-4 border border-border rounded-lg bg-secondary/20">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="new-hub-name">Hub name</FieldLabel>
                <Input
                  id="new-hub-name"
                  value={newHubName}
                  onChange={(e) => {
                    setNewHubName(e.target.value)
                    if (!newHubSlugManuallyEdited) {
                      setNewHubSlug(slugify(e.target.value))
                    }
                  }}
                  placeholder="e.g., Beginner Guides"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="new-hub-slug">Slug</FieldLabel>
                <Input
                  id="new-hub-slug"
                  value={newHubSlug}
                  onChange={(e) => {
                    setNewHubSlug(e.target.value)
                    setNewHubSlugManuallyEdited(true)
                  }}
                  placeholder="e.g., beginner-guides"
                />
                <FieldDescription>Auto-synced from name unless edited</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="new-hub-description">Description</FieldLabel>
                <Textarea
                  id="new-hub-description"
                  value={newHubDescription}
                  onChange={(e) => setNewHubDescription(e.target.value)}
                  rows={2}
                  placeholder="What is this hub about?"
                />
              </Field>
            </FieldGroup>

            {hubError && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex gap-2">
                <AlertCircle className="size-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <p className="text-sm text-red-700 dark:text-red-300">{hubError}</p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button type="submit" disabled={addingHub} className="gap-2">
                {addingHub && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Create Hub
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddHub(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Hubs list */}
        <div className="space-y-3">
          {hubs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No hubs yet. Create one to get started.</p>
          ) : (
            hubs.map((hub) => (
              <div key={hub.id} className="border border-border rounded-lg overflow-hidden">
                <div className="p-4 bg-secondary/20 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {editingHubId === hub.id ? (
                      <form onSubmit={handleUpdateHub} className="space-y-3">
                        <FieldGroup>
                          <Field>
                            <FieldLabel htmlFor="edit-hub-name">Hub name</FieldLabel>
                            <Input
                              id="edit-hub-name"
                              value={editHubName}
                              onChange={(e) => {
                                setEditHubName(e.target.value)
                                if (!editHubSlugManuallyEdited) {
                                  setEditHubSlug(slugify(e.target.value))
                                }
                              }}
                            />
                          </Field>

                          <Field>
                            <FieldLabel htmlFor="edit-hub-slug">Slug</FieldLabel>
                            <Input
                              id="edit-hub-slug"
                              value={editHubSlug}
                              onChange={(e) => {
                                setEditHubSlug(e.target.value)
                                setEditHubSlugManuallyEdited(true)
                              }}
                            />
                          </Field>

                          <Field>
                            <FieldLabel htmlFor="edit-hub-description">Description</FieldLabel>
                            <Textarea
                              id="edit-hub-description"
                              value={editHubDescription}
                              onChange={(e) => setEditHubDescription(e.target.value)}
                              rows={2}
                            />
                          </Field>
                        </FieldGroup>

                        {hubError && (
                          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex gap-2">
                            <AlertCircle className="size-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                            <p className="text-sm text-red-700 dark:text-red-300">{hubError}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={editingHub} className="gap-2">
                            {editingHub && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingHubId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h4 className="font-semibold text-foreground">{hub.name}</h4>
                        <p className="text-sm text-muted-foreground">{hub.description}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{hub.slug}</p>
                      </>
                    )}
                  </div>

                  {editingHubId !== hub.id && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditHub(hub)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleHubExpanded(hub.id)}
                      >
                        {expandedHubIds.has(hub.id) ? (
                          <ChevronUp className="size-4" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="size-4" aria-hidden="true" />
                        )}
                        <span className="sr-only">{expandedHubIds.has(hub.id) ? "Collapse" : "Expand"} collections</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Collections */}
                {expandedHubIds.has(hub.id) && (
                  <div className="border-t border-border p-4 space-y-3 bg-background">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-semibold text-foreground">Collections</h5>
                      {showAddCollectionHubId !== hub.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            setShowAddCollectionHubId(hub.id)
                            setNewCollectionName("")
                            setNewCollectionDescription("")
                            setNewCollectionSlug("")
                            setNewCollectionSlugManuallyEdited(false)
                          }}
                        >
                          <Plus className="size-3" aria-hidden="true" />
                          Add Collection
                        </Button>
                      )}
                    </div>

                    {/* Add collection form */}
                    {showAddCollectionHubId === hub.id && (
                      <form onSubmit={(e) => handleAddCollection(e, hub.id)} className="p-3 border border-border rounded bg-secondary/20">
                        <FieldGroup>
                          <Field>
                            <FieldLabel htmlFor="new-collection-name">Collection name</FieldLabel>
                            <Input
                              id="new-collection-name"
                              value={newCollectionName}
                              onChange={(e) => {
                                setNewCollectionName(e.target.value)
                                if (!newCollectionSlugManuallyEdited) {
                                  setNewCollectionSlug(slugify(e.target.value))
                                }
                              }}
                              placeholder="e.g., Getting Started"
                            />
                          </Field>

                          <Field>
                            <FieldLabel htmlFor="new-collection-slug">Slug</FieldLabel>
                            <Input
                              id="new-collection-slug"
                              value={newCollectionSlug}
                              onChange={(e) => {
                                setNewCollectionSlug(e.target.value)
                                setNewCollectionSlugManuallyEdited(true)
                              }}
                              placeholder="e.g., getting-started"
                            />
                            <FieldDescription>Auto-synced from name unless edited</FieldDescription>
                          </Field>

                          <Field>
                            <FieldLabel htmlFor="new-collection-description">Description</FieldLabel>
                            <Textarea
                              id="new-collection-description"
                              value={newCollectionDescription}
                              onChange={(e) => setNewCollectionDescription(e.target.value)}
                              rows={2}
                              placeholder="What guides does this collection contain?"
                            />
                          </Field>
                        </FieldGroup>

                        {collectionError && (
                          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2 flex gap-2">
                            <AlertCircle className="size-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                            <p className="text-sm text-red-700 dark:text-red-300">{collectionError}</p>
                          </div>
                        )}

                        <div className="mt-3 flex gap-2">
                          <Button type="submit" size="sm" disabled={addingCollection} className="gap-2">
                            {addingCollection && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
                            Create
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setShowAddCollectionHubId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}

                    {/* Collections list */}
                    <div className="space-y-2">
                      {(collectionsMap[hub.id] || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No collections yet.</p>
                      ) : (
                        (collectionsMap[hub.id] || []).map((collection) => (
                          <div key={collection.id} className="p-3 border border-border rounded bg-secondary/20">
                            {editingCollectionId === collection.id ? (
                              <form onSubmit={handleUpdateCollection} className="space-y-2">
                                <FieldGroup>
                                  <Field>
                                    <FieldLabel htmlFor="edit-collection-name">Collection name</FieldLabel>
                                    <Input
                                      id="edit-collection-name"
                                      value={editCollectionName}
                                      onChange={(e) => {
                                        setEditCollectionName(e.target.value)
                                        if (!editCollectionSlugManuallyEdited) {
                                          setEditCollectionSlug(slugify(e.target.value))
                                        }
                                      }}
                                    />
                                  </Field>

                                  <Field>
                                    <FieldLabel htmlFor="edit-collection-slug">Slug</FieldLabel>
                                    <Input
                                      id="edit-collection-slug"
                                      value={editCollectionSlug}
                                      onChange={(e) => {
                                        setEditCollectionSlug(e.target.value)
                                        setEditCollectionSlugManuallyEdited(true)
                                      }}
                                    />
                                  </Field>

                                  <Field>
                                    <FieldLabel htmlFor="edit-collection-description">Description</FieldLabel>
                                    <Textarea
                                      id="edit-collection-description"
                                      value={editCollectionDescription}
                                      onChange={(e) => setEditCollectionDescription(e.target.value)}
                                      rows={2}
                                    />
                                  </Field>
                                </FieldGroup>

                                {collectionError && (
                                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 flex gap-2">
                                    <AlertCircle className="size-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                                    <p className="text-sm text-red-700 dark:text-red-300">{collectionError}</p>
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  <Button type="submit" size="sm" disabled={editingCollection} className="gap-2">
                                    {editingCollection && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
                                    Save
                                  </Button>
                                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingCollectionId(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            ) : (
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h6 className="font-medium text-foreground">{collection.name}</h6>
                                  <p className="text-xs text-muted-foreground">{collection.description}</p>
                                  <p className="text-xs text-muted-foreground mt-1 font-mono">{collection.slug}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditCollection(collection)}
                                  className="flex-shrink-0"
                                >
                                  Edit
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </>
      )}
    </div>
  )
}
