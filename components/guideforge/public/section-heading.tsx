import { ReactNode } from "react"

interface SectionHeadingProps {
  eyebrow: string
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  icon,
  action,
}: SectionHeadingProps) {
  return (
    <div className="border-b border-foreground/15 pb-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-primary">
          {icon}
          {eyebrow}
        </div>
        {action && <div>{action}</div>}
      </div>
      <h2 className="mt-2 text-balance text-2xl font-bold tracking-tight md:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
