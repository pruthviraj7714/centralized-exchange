"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import OTPDialog from "@/components/OTPComponent";
import { signIn } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { requestOTP } from "@/lib/api/user.api";

const TICKERS = [
  { sym: "BTC/USDT", price: "$67,240", change: "+2.34%", up: true },
  { sym: "ETH/USDT", price: "$3,520", change: "+1.87%", up: true },
  { sym: "SOL/USDT", price: "$182.55", change: "−0.62%", up: false },
  { sym: "BNB/USDT", price: "$608.30", change: "+0.94%", up: true },
  { sym: "AVAX/USDT", price: "$38.72", change: "+3.12%", up: true },
  { sym: "ARB/USDT", price: "$1.240", change: "+2.10%", up: true },
  { sym: "LINK/USDT", price: "$14.60", change: "+5.43%", up: true },
  { sym: "MATIC/USDT", price: "$0.824", change: "−1.08%", up: false },
];

const BARS = [
  55, 70, 45, 80, 60, 90, 50, 75, 85, 65, 95, 55, 70, 88, 62, 78, 50, 92, 68,
  80,
];

const ASKS = [
  { price: "67,480", qty: "0.42", total: "28,341" },
  { price: "67,390", qty: "1.14", total: "76,824" },
  { price: "67,310", qty: "0.73", total: "49,136" },
];
const BIDS = [
  { price: "67,240", qty: "2.01", total: "135,152" },
  { price: "67,180", qty: "0.88", total: "59,118" },
  { price: "67,090", qty: "1.55", total: "103,989" },
];

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [isOTPSent, setIsOTPSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [askWidths, setAskWidths] = useState<number[]>([]);
  const [bidWidths, setBidWidths] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { mutateAsync: requestOTPMutate } = useMutation({
    mutationFn: () => requestOTP(email),
    mutationKey: ["requestOTP"],
  });
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setAskWidths(ASKS.map(() => Math.random() * 40 + 30));
    setBidWidths(BIDS.map(() => Math.random() * 40 + 30));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const DOTS = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.5 + 0.15,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      DOTS.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width) d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        if (d.y > canvas.height) d.y = 0;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(52,211,153,${d.a})`;
        ctx.fill();
      });

      DOTS.forEach((a, i) => {
        DOTS.slice(i + 1).forEach((b) => {
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(52,211,153,${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [mounted]);

  const handleLogin = async () => {
    if (!email) {
      toast.warning("Please provide an email");
      return;
    }
    await requestOTPMutate();
    toast.success("OTP sent!", { description: "Check your inbox" });
    setIsOTPSent(true);
  };

  const verifyOTP = async (otpString: string) => {
    if (!otpString || otpString.length < 6) {
      toast.warning("Enter full OTP");
      return;
    }
    setIsVerifying(true);
    try {
      const res = await signIn("credentials", { redirect: false, email, otp: otpString });
      console.log(res);
      if (!res || res.error || res.status === 401) {
        throw new Error(res?.error || "Invalid OTP");
      }
      router.push("/dashboard");
    } finally {
      setIsVerifying(false);
    }
  };

  /* ════════════════════════════════════════
     AUTH SCREEN
  ════════════════════════════════════════ */
  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-900/50 to-slate-950" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="noise-overlay" />

        <div className="relative z-10 w-full max-w-md anim-fadeUp-0">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl mb-6 shadow-lg shadow-red-500/30">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="font-syne text-3xl font-bold text-white mb-2 tracking-tight">
              Welcome to CEX
            </h1>
            <p className="text-slate-400 text-sm">
              Enter your email to access your account
            </p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800/60 rounded-2xl p-8 shadow-2xl">
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 font-mono-g tracking-wide">
                  EMAIL ADDRESS
                </label>
                <Input
                  type="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 bg-slate-800/60 border-slate-700/50 text-white placeholder:text-slate-600 focus:border-emerald-500/60 focus:ring-emerald-500/20 rounded-xl font-mono-g text-sm"
                  value={email}
                />
              </div>
              <Button
                onClick={handleLogin}
                disabled={!email || isOTPSent}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white font-semibold rounded-xl glow-emerald transition-all duration-300 hover:scale-[1.02] font-syne tracking-wide"
              >
                {isOTPSent ? "✓ OTP Sent" : "Send OTP →"}
              </Button>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-800/60">
              <p className="text-xs text-slate-600 text-center">
                By continuing, you agree to our Terms of Service and Privacy
                Policy
              </p>
            </div>
          </div>

          <div className="text-center mt-5">
            <Button
              onClick={() => setShowAuth(false)}
              className="text-slate-500 cursor-pointer hover:text-white text-sm"
            >
              ← Back to Home
            </Button>
          </div>
        </div>

        <OTPDialog
          requestOTPMutate={requestOTPMutate}
          isOTPSent={isOTPSent}
          isVerifying={isVerifying}
          setIsOTPSent={setIsOTPSent}
          verifyOTP={verifyOTP}
        />
      </div>
    );
  }

  /* ════════════════════════════════════════
     MAIN LANDING PAGE
  ════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-x-hidden">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
      />
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.12),transparent)]" />
      <div className="fixed top-1/3 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="noise-overlay fixed z-[1]" />

      <nav className="z-50 flex items-center justify-between px-8 py-5 border-b border-slate-800/40 backdrop-blur-2xl bg-slate-950/70 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30 flex-shrink-0">
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-syne text-lg font-bold text-white tracking-tight">
            Exchange
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowAuth(true)}
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white px-6 py-2 rounded-xl text-sm font-semibold glow-emerald transition-all duration-300 hover:scale-[1.03] font-syne tracking-wide"
          >
            Sign In
          </Button>
        </div>
      </nav>

      <div className="relative z-10 border-b border-slate-800/30 bg-slate-900/40 backdrop-blur-sm py-3 overflow-hidden">
        <div className="flex gap-12 ticker-track w-max">
          {[...TICKERS, ...TICKERS].map((t, i) => (
            <div key={i} className="flex items-center gap-3 flex-shrink-0">
              <span className="font-mono-g text-xs font-medium text-slate-300">
                {t.sym}
              </span>
              <span className="font-mono-g text-xs text-white">{t.price}</span>
              <span
                className={`font-mono-g text-xs ${t.up ? "text-emerald-400" : "text-red-400"}`}
              >
                {t.change}
              </span>
              <span className="text-slate-700 text-xs">·</span>
            </div>
          ))}
        </div>
      </div>

      <section className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-112px)] px-6 text-center pt-16 pb-24">
        <div className="anim-fadeUp-0 inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-slate-700/60 bg-slate-900/50 backdrop-blur-sm mb-10">
          <svg
            className="w-3.5 h-3.5 text-emerald-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="font-mono-g text-xs text-slate-300 tracking-widest">
            NEXT-GEN CRYPTO EXCHANGE PLATFORM
          </span>
        </div>

        <h1 className="anim-fadeUp-1 font-syne font-extrabold text-[clamp(3rem,8vw,7.5rem)] leading-[.92] tracking-[-0.04em] text-white mb-6 max-w-5xl">
          Trade Crypto
          <br />
          with <span className="gradient-text">Confidence</span>
        </h1>

        <p className="anim-fadeUp-2 text-slate-400 text-[clamp(.95rem,2vw,1.2rem)] font-light max-w-xl leading-relaxed mb-12">
          Lightning-fast execution, institutional-grade security, and advanced
          trading tools. Join 500K+ traders who trust our platform.
        </p>

        <div className="anim-fadeUp-3 flex flex-col sm:flex-row items-center gap-4 mb-20">
          <Button
            onClick={() => setShowAuth(true)}
            className="h-14 px-10 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white font-syne font-semibold text-base rounded-xl glow-emerald transition-all duration-300 hover:scale-[1.04] tracking-wide"
          >
            Start Trading Now →
          </Button>
          <Button
            variant="outline"
            className="h-14 px-10 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-xl backdrop-blur-xl bg-transparent text-base font-medium transition-all duration-200"
            onClick={() => router.push("/dashboard")}
          >
            View Markets
          </Button>
        </div>

        <div className="anim-fadeIn-4 grid grid-cols-3 gap-px bg-slate-800/30 border border-slate-800/40 rounded-2xl overflow-hidden max-w-2xl w-full">
          {[
            { num: "$2.4B+", label: "24h Trading Volume" },
            { num: "150+", label: "Trading Pairs" },
            { num: "500K+", label: "Active Traders" },
          ].map(({ num, label }) => (
            <div
              key={label}
              className="bg-slate-900/70 px-8 py-6 text-center hover:bg-slate-800/50 transition-colors duration-200 group"
            >
              <div className="font-syne font-extrabold text-2xl md:text-3xl text-white mb-1 group-hover:text-emerald-300 transition-colors duration-200 tracking-tight">
                {num}
              </div>
              <div className="font-mono-g text-xs text-slate-500 tracking-widest uppercase">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-6 pb-28">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-5">
            <div className="h-px w-8 bg-emerald-500" />
            <span className="font-mono-g text-xs text-emerald-400 tracking-[.18em] uppercase">
              Platform Features
            </span>
          </div>
          <h2 className="font-syne font-extrabold text-[clamp(2rem,5vw,3.8rem)] leading-tight tracking-tight text-white mb-16 max-w-2xl">
            Why 500K traders choose us
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 md:row-span-2 bg-slate-900/70 border border-slate-800/60 rounded-2xl p-8 card-hover relative overflow-hidden group scanline">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors duration-300">
                <svg
                  className="w-6 h-6 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-syne font-bold text-xl text-white mb-3 tracking-tight">
                Lightning Fast Engine
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed font-light mb-6">
                Our proprietary matching engine processes over 1 million orders
                per second with sub-millisecond latency — built for professional
                traders.
              </p>
              <div className="mt-auto">
                <div className="flex items-end gap-1 h-16">
                  {BARS.map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm bar-anim ${i % 3 === 0 ? "bg-red-400/50" : "bg-emerald-400/60"}`}
                      style={{ height: `${h}%`, animationDelay: `${i * 30}ms` }}
                    />
                  ))}
                </div>
                <p className="font-mono-g text-[10px] text-slate-600 mt-2 tracking-widest">
                  LIVE ORDER FLOW
                </p>
              </div>
              <span className="inline-block mt-5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 font-mono-g text-[10px] text-emerald-400 tracking-widest">
                &lt;0.8ms LATENCY
              </span>
            </div>

            <div className="bg-slate-900/70 border border-slate-800/60 rounded-2xl p-7 card-hover relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
                <svg
                  className="w-6 h-6 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="font-syne font-bold text-lg text-white mb-2 tracking-tight">
                Bank-Grade Security
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed font-light">
                Multi-sig wallets, 95% cold storage, and SOC 2 Type II certified
                infrastructure protect every trade.
              </p>
              <div className="flex items-center gap-2 mt-5">
                {["2FA", "KYC", "AML", "ISO27001"].map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700/50 font-mono-g text-[10px] text-slate-400 tracking-wider"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800/60 rounded-2xl p-7 card-hover relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/6 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
                <svg
                  className="w-6 h-6 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="font-syne font-bold text-lg text-white mb-2 tracking-tight">
                Advanced Tools
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed font-light">
                Professional TradingView charts, algo bots, portfolio analytics,
                and API access for power users.
              </p>
              <div className="mt-5 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-red-500 to-red-400 rounded-full" />
              </div>
              <p className="font-mono-g text-[10px] text-slate-500 mt-2 tracking-widest">
                74 ACTIVE INDICATORS
              </p>
            </div>

            <div className="bg-slate-900/70 border border-slate-800/60 rounded-2xl p-7 card-hover group relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5">
                <svg
                  className="w-6 h-6 text-violet-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="font-syne font-bold text-lg text-white mb-2 tracking-tight">
                OTC Desk
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed font-light">
                Execute large block trades off-market with zero slippage through
                our dedicated institutional desk.
              </p>
              <span className="inline-block mt-4 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 font-mono-g text-[10px] text-violet-400 tracking-widest">
                MIN $100K
              </span>
            </div>

            <div className="bg-slate-900/70 border border-slate-800/60 rounded-2xl p-7 card-hover group relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                <svg
                  className="w-6 h-6 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-syne font-bold text-lg text-white mb-2 tracking-tight">
                Deep Liquidity
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed font-light">
                Connected to 15+ global liquidity providers ensuring the
                tightest spreads across all 150+ trading pairs.
              </p>
              <div className="flex items-center gap-3 mt-5">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full w-[92%] bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" />
                </div>
                <span className="font-mono-g text-[10px] text-amber-400 tracking-wider flex-shrink-0">
                  92% FILL RATE
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-28">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-4 mb-5">
              <div className="h-px w-8 bg-emerald-500" />
              <span className="font-mono-g text-xs text-emerald-400 tracking-[.18em] uppercase">
                Live Trading
              </span>
            </div>
            <h2 className="font-syne font-extrabold text-[clamp(2rem,4.5vw,3.4rem)] leading-tight tracking-tight text-white mb-6">
              Professional tools.
              <br />
              <span className="gradient-text">Intuitive interface.</span>
            </h2>
            <p className="text-slate-400 text-base leading-relaxed font-light mb-8 max-w-md">
              Real-time order books, advanced charting, and one-click execution
              — everything you need to trade like a professional.
            </p>

            <div className="space-y-4">
              {[
                {
                  icon: "⚡",
                  label: "Instant Order Execution",
                  sub: "Sub-millisecond matching",
                },
                {
                  icon: "🔒",
                  label: "Non-custodial Options",
                  sub: "You keep your keys",
                },
                {
                  icon: "📊",
                  label: "Advanced Order Types",
                  sub: "Limit, Stop, OCO, TWAP",
                },
              ].map(({ icon, label, sub }) => (
                <div
                  key={label}
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/60 transition-colors duration-200"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg flex-shrink-0">
                    {icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {label}
                    </div>
                    <div className="font-mono-g text-xs text-slate-500 tracking-wider mt-0.5">
                      {sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="float-card">
            <div className="bg-slate-900/90 border border-slate-700/50 rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,.6)] scanline">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/60 bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  </div>
                  <span className="font-mono-g text-xs font-medium text-slate-300 ml-1">
                    BTC / USDT
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono-g text-[10px] tracking-wider">
                    SPOT
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono-g text-[10px] text-emerald-400 tracking-widest">
                    LIVE
                  </span>
                </div>
              </div>

              <div className="px-5 pt-5 pb-2">
                <div className="font-syne font-extrabold text-4xl text-white tracking-tight">
                  $67,240<span className="text-slate-600">.80</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="font-mono-g text-xs text-emerald-400">
                    ▲ +$1,532 (+2.34%)
                  </span>
                  <span className="font-mono-g text-xs text-slate-500">
                    24h Vol: $2.4B
                  </span>
                </div>
              </div>

              <div className="px-5 pb-2 pt-1">
                <div className="flex items-end gap-[3px] h-20">
                  {BARS.map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm bar-anim ${i % 4 === 0 ? "bg-red-400/45" : "bg-emerald-400/55"}`}
                      style={{ height: `${h}%`, animationDelay: `${i * 25}ms` }}
                    />
                  ))}
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-800/40">
                <div className="font-mono-g text-[10px] text-slate-500 tracking-[.18em] uppercase mb-3">
                  Order Book
                </div>
                <div className="space-y-0.5 mb-3">
                  {ASKS.map((r) => (
                    <div
                      key={r.price}
                      className="flex justify-between items-center py-[5px] relative group"
                    >
                      <div
                        className="absolute inset-y-0 right-0 bg-red-500/8 rounded-sm"
                        style={{ width: `${askWidths[0] ?? 50}%` }}
                      />
                      <span className="font-mono-g text-xs text-red-400 z-10">
                        {r.price}
                      </span>
                      <span className="font-mono-g text-xs text-slate-400 z-10">
                        {r.qty}
                      </span>
                      <span className="font-mono-g text-xs text-slate-600 z-10">
                        {r.total}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-center py-2 border-y border-slate-800/40 my-2">
                  <span className="font-syne font-bold text-lg text-emerald-400 tracking-tight">
                    $67,240
                  </span>
                  <span className="font-mono-g text-[10px] text-emerald-600 ml-2">
                    LAST PRICE
                  </span>
                </div>
                <div className="space-y-0.5 mt-3">
                  {BIDS.map((r) => (
                    <div
                      key={r.price}
                      className="flex justify-between items-center py-[5px] relative"
                    >
                      <div
                        className="absolute inset-y-0 right-0 bg-emerald-500/8 rounded-sm"
                        style={{ width: `${bidWidths[0] ?? 50}%` }}
                      />
                      <span className="font-mono-g text-xs text-emerald-400 z-10">
                        {r.price}
                      </span>
                      <span className="font-mono-g text-xs text-slate-400 z-10">
                        {r.qty}
                      </span>
                      <span className="font-mono-g text-xs text-slate-600 z-10">
                        {r.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-28">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800/60 cta-border rounded-3xl p-16 text-center overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.1),transparent_60%)] pointer-events-none" />

            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px w-12 bg-emerald-500/40" />
              <span className="font-mono-g text-xs text-emerald-400 tracking-[.18em] uppercase">
                Get Started
              </span>
              <div className="h-px w-12 bg-emerald-500/40" />
            </div>

            <h2 className="font-syne font-extrabold text-[clamp(2.2rem,5vw,4rem)] tracking-tight text-white mb-4 leading-tight">
              Ready to start trading?
            </h2>
            <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-md mx-auto font-light">
              Join 500,000+ traders. Get access in under 2 minutes — no KYC
              required to start.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto mb-8">
              <Input
                type="email"
                placeholder="Enter your email"
                className="h-12 flex-1 bg-slate-800/60 border-slate-700/50 text-white placeholder:text-slate-600 focus:border-emerald-500/50 rounded-xl font-mono-g text-sm"
              />
              <Button
                onClick={() => setShowAuth(true)}
                className="h-12 px-7 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-white font-syne font-semibold rounded-xl glow-emerald transition-all duration-300 hover:scale-[1.04] whitespace-nowrap tracking-wide"
              >
                Get Started
              </Button>
            </div>

            <p className="font-mono-g text-[10px] text-slate-600 tracking-widest">
              NO CREDIT CARD REQUIRED · FREE TO START · CANCEL ANYTIME
            </p>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-800/40 px-8 py-10">
        <div className="max-w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-syne font-bold text-white tracking-tight">
              Exchange
            </span>
          </div>

          <div className="flex items-center gap-8 flex-wrap justify-center">
            {["Terms", "Privacy", "Security", "Docs", "API", "Support"].map(
              (link) => (
                <a
                  key={link}
                  href="#"
                  className="font-mono-g text-xs text-slate-500 hover:text-slate-300 tracking-wider uppercase transition-colors duration-200"
                >
                  {link}
                </a>
              ),
            )}
          </div>

          <div className="font-mono-g text-xs text-slate-700 tracking-widest">
            © {new Date().getFullYear()} CEX. ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>
    </div>
  );
}
