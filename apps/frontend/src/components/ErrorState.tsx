"use client"

import { AlertCircle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  onHome?: () => void
  showDetails?: boolean
  errorCode?: number
}

export function ErrorState({
  title = "Something went wrong",
  description = "We encountered an error while fetching the market data. Please try again.",
  onRetry,
  onHome,
  showDetails = false,
  errorCode = 500,
}: ErrorStateProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry?.()
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-md px-6">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-destructive/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-destructive/5 blur-3xl" />
        </div>

        <div className="rounded-2xl border border-destructive/20 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 p-8 shadow-lg">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-destructive/10 blur-lg" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-destructive/30 bg-destructive/5">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
            </div>
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-sm text-white">{description}</p>
          </div>

          {showDetails && (
            <div className="mt-6 rounded-lg border border-border bg-secondary/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-white">Error Code</span>
                <code className="rounded bg-background px-2 py-1 font-mono text-sm text-foreground">{errorCode}</code>
              </div>
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 gap-3">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="gap-2"
              size="sm"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Retrying...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Again</span>
                </>
              )}
            </Button>
            <Button
              onClick={onHome}
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
            >
              <Home className="h-4 w-4" />
              <span>Go Home</span>
            </Button>
          </div>

          <div className="mt-6 space-y-2 border-t border-border pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-white">Troubleshooting Tips</p>
            <ul className="space-y-2 text-xs text-white">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Check your internet connection</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Clear your browser cache</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Try again in a few moments</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-white">
              Need help?{" "}
              <a href="#" className="font-semibold text-primary hover:underline">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
