import type { WizardStep } from "@/components/guideforge/shared"

/**
 * The shared step list for the GuideForge builder wizard.
 * Used by every screen in the guided setup flow so the
 * progress indicator stays consistent.
 *
 * TODO: Some of these screens are placeholders for the next pass.
 */
export const BUILDER_WIZARD_STEPS: WizardStep[] = [
  { id: "welcome", label: "Choose direction" },
  { id: "network", label: "Create network" },
  { id: "starter-pages", label: "Starter pages" },
  { id: "forge-rules", label: "Forge rules" },
  { id: "dashboard", label: "Dashboard" },
]

export function getWizardIndex(stepId: string): number {
  const index = BUILDER_WIZARD_STEPS.findIndex((s) => s.id === stepId)
  return index === -1 ? 0 : index
}
