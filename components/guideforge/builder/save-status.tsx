import { AlertCircle, CheckCircle2 } from "lucide-react"

export interface SaveStatusProps {
  state: "idle" | "saving" | "saved" | "error"
  error?: string
  message?: string
}

export function SaveStatus({ state, error, message }: SaveStatusProps) {
  if (state === "idle") return null

  if (state === "error") {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
        <AlertCircle className="size-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm text-red-700 dark:text-red-300">{error || "An error occurred"}</p>
        </div>
      </div>
    )
  }

  if (state === "saved") {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3">
        <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm text-emerald-700 dark:text-emerald-300">{message || "Saved successfully"}</p>
        </div>
      </div>
    )
  }

  return null
}
