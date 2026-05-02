/**
 * Network Types Configuration
 * 
 * Defines available network types that users can create.
 * Each type has an enabled flag - disabled types appear as "Coming next" 
 * on the welcome page but are not selectable in the create form.
 */

export interface NetworkTypeConfig {
  id: string
  label: string
  description: string
  enabled: boolean
  icon?: string
}

export const NETWORK_TYPES: NetworkTypeConfig[] = [
  {
    id: "gaming",
    label: "Gaming Guide Network",
    description: "Multi-game guide platform with hubs, collections, and guides",
    enabled: true,
  },
  {
    id: "repair-support",
    label: "Repair / Support Platform",
    description: "Device repair and support documentation",
    enabled: false,
  },
  {
    id: "business-sop",
    label: "Business SOP Portal",
    description: "Standard operating procedures and process documentation",
    enabled: false,
  },
  {
    id: "creator-hub",
    label: "Creator Guide Hub",
    description: "Content creation guides and tutorials",
    enabled: false,
  },
  {
    id: "training-library",
    label: "Training Library",
    description: "Employee training and onboarding materials",
    enabled: false,
  },
  {
    id: "knowledge-base",
    label: "Community Knowledge Base",
    description: "Community-driven knowledge base and FAQ",
    enabled: false,
  },
]

/**
 * Get all network types
 */
export function getAllNetworkTypes(): NetworkTypeConfig[] {
  return NETWORK_TYPES
}

/**
 * Get enabled network types (for create form dropdown)
 */
export function getEnabledNetworkTypes(): NetworkTypeConfig[] {
  return NETWORK_TYPES.filter(t => t.enabled)
}

/**
 * Get coming-next network types (for welcome page display)
 */
export function getComingNextNetworkTypes(): NetworkTypeConfig[] {
  return NETWORK_TYPES.filter(t => !t.enabled)
}

/**
 * Get network type by ID
 */
export function getNetworkType(typeId: string): NetworkTypeConfig | undefined {
  return NETWORK_TYPES.find(t => t.id === typeId)
}
