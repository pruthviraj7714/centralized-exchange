"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BACKEND_URL } from "@/lib/config"
import axios from "axios"
import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import OTPDialog from "@/components/OTPComponent"

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [isOTPSent, setIsOTPSent] = useState<boolean>(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    if (!email || email.length === 0) {
      toast.warning("please provide email to send otp")
      return
    }
    try {
      const res = await axios.post(`${BACKEND_URL}/auth/request-otp`, {
        email,
      })
      if (res.status === 200) {
        toast.success("OTP successfully sent to email", {
          description: "Please Enter OTP for verification",
        })
        setIsOTPSent(true)
      }
    } catch (error: any) {
      toast.error(error.response.data.message ?? error.message)
      setIsOTPSent(false)
    }
  }

  const verifyOTP = async (otpString: string) => {
    if (!otpString || otpString.length < 6) {
      toast.warning("Please Provide OTP Properly")
      return
    }
    setIsVerifying(true)
    try {
      const response = await axios.post(`${BACKEND_URL}/auth/verify-otp`, {
        email,
        otp: otpString,
      })
      toast.success(response.data.message)
      localStorage.setItem("user-auth", `Bearer ${response.data.jwt}`)
      router.push("/dashboard")
    } catch (error: any) {
      toast.error(error.response.data.message ?? error.message)
    } finally {
      setIsVerifying(false)
    }
  }

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-900/50 to-slate-950"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-red-400 rounded-2xl mb-6 shadow-lg shadow-red-500/25">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-slate-400">Enter your email to access your account</p>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email Address</label>
                <Input
                  type="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="h-12 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-xl"
                  value={email}
                />
              </div>

              <Button
                onClick={handleLogin}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:shadow-emerald-500/40 hover:scale-[1.02]"
                disabled={!email || isOTPSent}
              >
                {isOTPSent ? "OTP Sent" : "Send OTP"}
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800/50">
              <p className="text-xs text-slate-500 text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>

          <div className="text-center mt-6">
            <Button variant="ghost" onClick={() => setShowAuth(false)} className="text-slate-400 hover:text-white">
              ← Back to Home
            </Button>
          </div>
        </div>

        <OTPDialog isOTPSent={isOTPSent} isVerifying={isVerifying} setIsOTPSent={setIsOTPSent} verifyOTP={verifyOTP} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-900/50 to-slate-950"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>

      <header className="relative z-10 flex items-center justify-between p-6 border-b border-slate-800/50 backdrop-blur-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-400 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white">Exchange</span>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800/50">
            About
          </Button>
          <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800/50">
            Features
          </Button>
          <Button
            onClick={() => setShowAuth(true)}
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white px-6 py-2 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:shadow-emerald-500/40"
          >
            Sign In
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-full text-sm text-slate-300 mb-8 backdrop-blur-xl">
            <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
            Next-generation crypto exchange platform
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Trade Crypto with
            <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
              {" "}
              Confidence
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Experience lightning-fast trades, institutional-grade security, and advanced trading tools. Join thousands
            of traders who trust our platform for their crypto journey.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              onClick={() => setShowAuth(true)}
              className="w-full sm:w-auto h-14 px-8 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:shadow-emerald-500/40 hover:scale-[1.02]"
            >
              Start Trading Now
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto h-14 px-8 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-xl backdrop-blur-xl bg-transparent"
              onClick={() => router.push("/dashboard")}
            >
              View Markets
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
              <div className="text-3xl font-bold text-white mb-2">$2.4B+</div>
              <div className="text-slate-400">24h Trading Volume</div>
            </div>
            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
              <div className="text-3xl font-bold text-white mb-2">150+</div>
              <div className="text-slate-400">Trading Pairs</div>
            </div>
            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
              <div className="text-3xl font-bold text-white mb-2">500K+</div>
              <div className="text-slate-400">Active Traders</div>
            </div>
          </div>
        </div>
      </main>

      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose Our Platform</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Built for traders, by traders. Experience the future of crypto trading.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 hover:border-emerald-500/30 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Lightning Fast</h3>
              <p className="text-slate-400">
                Execute trades in milliseconds with our high-performance matching engine.
              </p>
            </div>

            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 hover:border-blue-500/30 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-400 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Bank-Grade Security</h3>
              <p className="text-slate-400">Your funds are protected with multi-signature wallets and cold storage.</p>
            </div>

            <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 hover:border-red-500/30 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-400 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">Advanced Tools</h3>
              <p className="text-slate-400">
                Professional charting, algorithmic trading, and portfolio management tools.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
