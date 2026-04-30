import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SectionCardProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
  contentClassName?: string
  /** Render as a clickable container without nesting buttons. */
  asLink?: boolean
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  contentClassName,
  asLink,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        asLink &&
          "transition-colors hover:border-primary/40 hover:bg-accent/40",
        className,
      )}
    >
      {(title || description || action || Icon) && (
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            {Icon ? (
              <div className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4.5" aria-hidden="true" />
              </div>
            ) : null}
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              {description ? (
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      )}
      {children ? (
        <div className={cn("px-5 py-5", contentClassName)}>{children}</div>
      ) : null}
    </section>
  )
}
