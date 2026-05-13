/**
 * Network Types Configuration — Legacy compatibility shim.
 *
 * All real logic lives in lib/guideforge/network-types.ts.
 * This file re-exports the shapes that existing callers (welcome page, etc.)
 * depend on so no call-sites break. New code should import from network-types.ts.
 */

export type { NetworkTypeEntry as NetworkTypeConfig } from "./network-types"
export {
  NETWORK_TYPE_REGISTRY as NETWORK_TYPES,
  getEnabledRegistryTypes as getAllNetworkTypes,
  getEnabledRegistryTypes as getEnabledNetworkTypes,
  getComingNextRegistryTypes as getComingNextNetworkTypes,
  getRegistryTypeById as getNetworkType,
} from "./network-types"
