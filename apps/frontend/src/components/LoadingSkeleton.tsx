"use client"

import { useEffect, useState } from "react"

export function LoadingSkeleton() {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    setAnimate(true)
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-md px-6">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl transition-all duration-1000"
            style={{
              animation: animate ? "pulse 3s ease-in-out infinite" : "none",
            }}
          />
          <div
            className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl transition-all duration-1000 delay-1000"
            style={{
              animation: animate ? "pulse 3s ease-in-out infinite" : "none",
            }}
          />
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 p-8 shadow-lg">
          <div className="mb-8 flex justify-center">
            <div className="relative h-16 w-16">
              <div
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary"
                style={{
                  animation: "spin 1.5s linear infinite",
                }}
              />
              <div
                className="absolute inset-1 rounded-full border-2 border-transparent border-b-primary border-l-primary"
                style={{
                  animation: "spin 2s linear infinite reverse",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
            </div>
          </div>

          <div className="space-y-3 text-center">
            <h3 className="text-lg font-semibold text-foreground">Loading Market Data</h3>
            <p className="text-sm text-white">
              Fetching latest trading information and market updates
            </p>
          </div>

          <div className="mt-8 space-y-2">
            <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-gradient-to-r from-primary via-primary to-primary/40"
                style={{
                  animation: "shimmer 1.5s infinite",
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {["Connecting to server", "Fetching market data", "Processing trades"].map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className="relative h-5 w-5 rounded-full border border-primary/30 bg-primary/5"
                  style={{
                    animation: `fadeIn 1s ease-in-out ${index * 0.3}s both`,
                  }}
                >
                  <div
                    className="absolute inset-1 rounded-full bg-primary"
                    style={{
                      animation: `scaleIn 0.6s ease-out ${index * 0.3 + 0.3}s both`,
                    }}
                  />
                </div>
                <span
                  className="text-sm text-white"
                  style={{
                    animation: `fadeIn 1s ease-in-out ${index * 0.3}s both`,
                  }}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes scaleIn {
            from {
              transform: scale(0);
            }
            to {
              transform: scale(1);
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 0.3;
            }
            50% {
              opacity: 0.6;
            }
          }
        `}</style>
      </div>
    </div>
  )
}
