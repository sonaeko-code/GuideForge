"use client"

import React, { useEffect } from "react"
import Link from "next/link"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GenerateRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error("[v0] Generate route error:", error)
  }, [error])

  // Extract networkId from URL if possible
  const networkId = typeof window !== "undefined" 
    ? new URLSearchParams(window.location.search).get("networkId") || 
      window.location.pathname.split("/")[3]
    : "unknown"

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6 md:py-14">
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-8 space-y-6">
          <div className="flex gap-4">
            <AlertCircle className="size-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" aria-hidden="true" />
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  Generate Guide Route Crashed
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Network ID: <code className="bg-muted px-2 py-1 rounded text-xs">{networkId}</code>
                </p>
              </div>

              {/* Error Details */}
              <div className="bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800 p-4 space-y-2">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                  Error Message
                </p>
                <p className="text-sm font-mono text-red-800 dark:text-red-200 break-all whitespace-pre-wrap">
                  {error?.message || "An unknown error occurred"}
                </p>
                
                {error?.stack && (
                  <>
                    <p className="text-sm font-semibold text-red-900 dark:text-red-100 mt-3">
                      Stack Trace
                    </p>
                    <p className="text-xs font-mono text-red-700 dark:text-red-300 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                      {error.stack}
                    </p>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button onClick={reset} variant="default" size="sm">
                  Try Again
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/builder/network/${networkId}/dashboard`}>
                    <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
                    Back to Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
