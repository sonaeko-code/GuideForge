import Link from "next/link"
import type { Network } from "@/lib/guideforge/types"
import { getNetworkTheme } from "@/lib/guideforge/network-themes"

interface NetworkPublicFooterProps {
  network: Network
}

export function NetworkPublicFooter({ network }: NetworkPublicFooterProps) {
  const theme = getNetworkTheme(network.branding?.theme)
  
  return (
    <footer className={`border-t ${theme.borderClasses} ${theme.bgClasses}`}>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <Link
              href={`/n/${network.slug}`}
              className={`inline-flex items-center gap-2 font-semibold tracking-tight ${theme.accentClasses}`}
            >
              <span className="text-base font-bold">
                {network.name}
              </span>
            </Link>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              {network.description || `A guide network for ${network.type} knowledge and collaboration.`}
            </p>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
              Explore
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href={`/n/${network.slug}`} className="hover:text-foreground">
                  Overview
                </Link>
              </li>
              <li>
                <Link href={`/n/${network.slug}#hubs`} className="hover:text-foreground">
                  Hubs
                </Link>
              </li>
              <li>
                <Link href={`/n/${network.slug}#collections`} className="hover:text-foreground">
                  Collections
                </Link>
              </li>
              <li>
                <Link href={`/n/${network.slug}#guides`} className="hover:text-foreground">
                  Published Guides
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className={`mt-8 border-t ${theme.borderClasses} pt-8 text-center text-xs text-muted-foreground`}>
          <p>Built with GuideForge — A guide network platform for communities, creators, and organizations.</p>
        </div>
      </div>
    </footer>
  )
}
