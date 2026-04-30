import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface WizardStep {
  id: string
  label: string
}

interface WizardProgressProps {
  steps: WizardStep[]
  /** Zero-based index of the active step. */
  currentStepIndex: number
  className?: string
}

export function WizardProgress({
  steps,
  currentStepIndex,
  className,
}: WizardProgressProps) {
  return (
    <nav
      aria-label="Setup progress"
      className={cn("w-full", className)}
    >
      <ol className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isComplete = index < currentStepIndex
          const isCurrent = index === currentStepIndex

          return (
            <li
              key={step.id}
              className="flex flex-1 items-center gap-2"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    isComplete &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent &&
                      "border-primary bg-primary/10 text-primary",
                    !isComplete &&
                      !isCurrent &&
                      "border-border bg-card text-muted-foreground",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isComplete ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    "hidden text-sm font-medium md:inline",
                    isCurrent ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <span
                  className={cn(
                    "h-px flex-1 rounded-full",
                    isComplete ? "bg-primary" : "bg-border",
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
