"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GuideEditorError({ error, reset }: ErrorProps) {
  // Extract network ID from URL if possible
  const networkId = typeof window !== "undefined" 
    ? window.location.pathname.match(/\/network\/([^/]+)/)?.[1]
    : "unknown"

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link href={`/builder/network/${networkId}/dashboard`}>
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
        </Button>

        <Card className="border-red-500/30 bg-red-500/5 p-8 space-y-4">
          <h1 className="text-2xl font-semibold text-red-600">
            Guide Editor Route Crashed
          </h1>
          
          <div className="space-y-2">
            <p className="text-sm text-red-700">
              <strong>Error:</strong> {error?.message || "Unknown error"}
            </p>
            {error?.digest && (
              <p className="text-xs text-red-600/70">
                Digest: {error.digest}
              </p>
            )}
          </div>

          <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded text-xs font-mono text-red-900 dark:text-red-200 max-h-48 overflow-auto">
            <pre>{error?.stack}</pre>
          </div>

          <div className="flex gap-3">
            <Button onClick={reset} variant="outline">
              Try Again
            </Button>
            <Button asChild>
              <Link href={`/builder/network/${networkId}/dashboard`}>
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </main>
  )
}
