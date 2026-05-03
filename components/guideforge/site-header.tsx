"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GuideMark } from "@/components/guideforge/brand/guide-mark"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"

interface SiteHeaderProps {
  className?: string
  /** Hide the primary CTA on pages where it's redundant (like the builder flow). */
  hideCta?: boolean
}

export function SiteHeader({ className, hideCta }: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { href: "/#what", label: "What it builds" },
    { href: "/#how", label: "How it works" },
    { href: "/builder/networks", label: "Networks" },
    { href: "/#trust", label: "Trust" },
  ]

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur",
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight shrink-0"
        >
          <GuideMark className="size-7 [&_svg]:size-4" />
          <span className="text-base">GuideForge</span>
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-6 text-sm text-muted-foreground md:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          {hideCta ? (
            <div className="text-sm text-muted-foreground">Builder</div>
          ) : (
            <Button asChild size="sm">
              <Link href="/builder">Start building</Link>
            </Button>
          )}
        </div>

        {/* Mobile: CTA + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          {hideCta && (
            <span className="text-sm text-muted-foreground">Builder</span>
          )}
          {!hideCta && (
            <Button asChild size="sm">
              <Link href="/builder">Start building</Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          <nav aria-label="Mobile primary" className="flex flex-col gap-1 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
