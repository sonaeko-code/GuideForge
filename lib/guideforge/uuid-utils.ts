/**
 * UUID utilities for display and truncation
 * Governance Phase 6: Improved UUID display in member lists
 */

/**
 * Shorten a UUID to first 8 and last 6 characters
 * Example: 4b18022e-xxxx-xxxx-xxxx-eeb4e796e200 → 4b18022e…eeb4e7
 */
export function shortUUID(uuid: string): string {
  if (!uuid || uuid.length < 14) {
    return uuid
  }
  const first = uuid.substring(0, 8)
  const last = uuid.substring(uuid.length - 6)
  return `${first}…${last}`
}
