"use client"

import Link from "next/link"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto px-4 py-12">
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <AlertCircle className="size-12 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Dashboard Route Crashed</h1>
            <p className="text-muted-foreground">
              The dashboard encountered an error while loading.
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 text-left space-y-2">
            <p className="text-sm font-semibold text-red-900 dark:text-red-100">Error Message:</p>
            <p className="text-sm font-mono text-red-900 dark:text-red-100 break-all whitespace-pre-wrap">
              {error.message}
            </p>
            {error.digest && (
              <>
                <p className="text-sm font-semibold text-red-900 dark:text-red-100 pt-2">Digest:</p>
                <p className="text-xs font-mono text-red-800 dark:text-red-200">
                  {error.digest}
                </p>
              </>
            )}
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button onClick={reset} variant="default">
              Try Again
            </Button>
            <Button asChild variant="outline">
              <Link href="/builder/networks">
                <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
                Back to Networks
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
