"use client"

import React, { ReactNode } from "react"
import Link from "next/link"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DashboardErrorBoundaryProps {
  children: ReactNode
  networkId: string
}

interface ErrorState {
  error: Error | null
  errorInfo: { componentStack: string } | null
}

export class DashboardErrorBoundary extends React.Component<DashboardErrorBoundaryProps, ErrorState> {
  constructor(props: DashboardErrorBoundaryProps) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("[v0] Dashboard error boundary caught:", error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="space-y-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="size-8 text-red-600 dark:text-red-400" aria-hidden="true" />
            <div className="space-y-3 max-w-2xl">
              <h2 className="text-lg font-semibold text-foreground">Dashboard Tabs Crashed</h2>
              <p className="text-muted-foreground">
                The guides dashboard encountered an error while rendering.
              </p>
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 text-left">
                <p className="text-sm font-mono text-red-900 dark:text-red-100 break-all">
                  <strong>Error:</strong> {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <p className="text-xs font-mono text-red-800 dark:text-red-200 mt-2 overflow-auto max-h-40 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/builder/network/${this.props.networkId}/dashboard`}>
                  Reload
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/builder/networks">
                  <ArrowLeft className="size-4 mr-2" aria-hidden="true" />
                  All Networks
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
