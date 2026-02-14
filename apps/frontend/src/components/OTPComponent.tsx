"use client";
import {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  ClipboardEvent,
} from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const DIGIT_COUNT = 6;
const RESEND_SECONDS = 30;

interface OTPDialogProps {
  isOTPSent: boolean;
  isVerifying: boolean;
  setIsOTPSent: (value: boolean) => void;
  verifyOTP: (otp: string) => Promise<void>;
  requestOTPMutate: () => Promise<void>;
}

export default function OTPDialog({
  isOTPSent,
  isVerifying,
  setIsOTPSent,
  verifyOTP, 
  requestOTPMutate
}: OTPDialogProps) {
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(""));
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resend, setResend] = useState(RESEND_SECONDS);
  const [mounted, setMounted] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOTPSent) {
      setMounted(false);
      setTimeout(() => setMounted(true), 20);
    }
  }, [isOTPSent]);

  useEffect(() => {
    if (!isOTPSent) return;
    setResend(RESEND_SECONDS);
    const id = setInterval(
      () => setResend((s) => (s <= 1 ? (clearInterval(id), 0) : s - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [isOTPSent]);

  useEffect(() => {
    if (isOTPSent) {
      setDigits(Array(DIGIT_COUNT).fill(""));
      setSuccess(false);
    }
  }, [isOTPSent]);

  const otp = digits.join("");

  const focusNext = (i: number) =>
    refs.current[Math.min(i + 1, DIGIT_COUNT - 1)]?.focus();
  const focusPrev = (i: number) => refs.current[Math.max(i - 1, 0)]?.focus();

  const handleChange = (i: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = char;
    setDigits(next);
    if (char) focusNext(i);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[i]) {
        const next = [...digits];
        next[i] = "";
        setDigits(next);
      } else {
        focusPrev(i);
      }
    }
    if (e.key === "ArrowLeft") focusPrev(i);
    if (e.key === "ArrowRight") focusNext(i);
    if (e.key === "Enter" && otp.length === DIGIT_COUNT) handleVerify();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, DIGIT_COUNT);
    if (!pasted) return;
    const next = Array(DIGIT_COUNT).fill("");
    pasted.split("").forEach((c, i) => {
      next[i] = c;
    });
    setDigits(next);
    refs.current[Math.min(pasted.length, DIGIT_COUNT - 1)]?.focus();
  };

  const handleVerify = async () => {
    if (otp.length < DIGIT_COUNT || isVerifying) return;
    try {
      await verifyOTP(otp);
      setSuccess(true);
    } catch {
      triggerShake();
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleResend = async () => {
    if (resend > 0) return;
    setDigits(Array(DIGIT_COUNT).fill(""));
    setResend(RESEND_SECONDS);
    refs.current[0]?.focus();
    await requestOTPMutate();
  };

  const circumference = 2 * Math.PI * 10; 
  const dashOffset = circumference * (1 - resend / RESEND_SECONDS);

  return (
    <Dialog open={isOTPSent} onOpenChange={setIsOTPSent}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-xl w-full otp-font-body overflow-visible">
        <div
          className={`
          relative bg-slate-900/95 backdrop-blur-2xl
          border border-slate-800/60 rounded-2xl overflow-hidden
          shadow-[0_32px_80px_rgba(0,0,0,.7),0_0_0_1px_rgba(255,255,255,.04)]
          ${mounted ? "otp-enter" : "opacity-0"}
        `}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-emerald-500/8 rounded-full blur-3xl" />
          </div>

          <div className="relative px-8 pt-8 pb-6 text-center">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 relative
              ${
                success
                  ? "bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 border border-emerald-500/40"
                  : "bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700/60"
              }
            `}
            >
              {success ? (
                <svg
                  className="w-8 h-8 text-emerald-400 otp-success-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-8 h-8 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              )}
              {!success && !isVerifying && otp.length === 0 && (
                <span className="absolute inset-0 rounded-2xl animate-ping border border-emerald-500/20" />
              )}
            </div>

            <DialogTitle className="otp-font-syne text-xl font-bold text-white tracking-tight mb-1.5">
              {success ? "Verified!" : "Check your inbox"}
            </DialogTitle>
            <p className="text-slate-400 text-sm otp-font-body font-light leading-relaxed">
              {success
                ? "Email verified. Redirecting to your dashboard…"
                : "We sent a 6-digit code to your email"}
            </p>
          </div>

          {!success && (
            <div className="px-8 pb-2">
              <div
                className={`flex gap-2.5 justify-center ${shake ? "otp-shake" : ""}`}
              >
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    placeholder="·"
                    className={`
                      otp-digit otp-font-mono
                      w-12 h-14 rounded-xl text-center text-xl font-semibold
                      text-white placeholder:text-slate-700
                      bg-slate-800/60 border
                      border-slate-700/50
                      transition-all duration-150
                      ${d ? "otp-digit-filled" : ""}
                      ${i === 3 ? "ml-3" : ""}
                    `}
                    style={{ caretColor: "transparent" }}
                    disabled={isVerifying}
                  />
                ))}
              </div>

              <p className="otp-font-mono text-center text-[10px] text-slate-600 tracking-[.2em] uppercase mt-3">
                Enter 6-digit code
              </p>
            </div>
          )}

          {!success && (
            <div className="px-8 pt-5 pb-8 space-y-3">
              <button
                onClick={handleVerify}
                disabled={isVerifying || otp.length < DIGIT_COUNT}
                className="otp-btn-primary w-full h-12 rounded-xl text-white otp-font-syne font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20"
              >
                {isVerifying ? (
                  <>
                    <svg
                      className="w-4 h-4 otp-verify-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-20"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="opacity-90"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Verifying…
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    Verify Code
                  </>
                )}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-800/60" />
                <span className="otp-font-mono text-[10px] text-slate-600 tracking-widest">
                  OR
                </span>
                <div className="flex-1 h-px bg-slate-800/60" />
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={handleResend}
                  disabled={resend > 0}
                  className="otp-resend-btn otp-font-mono text-xs text-slate-400 tracking-wide flex items-center gap-2"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {resend > 0 ? `Resend in ${resend}s` : "Resend code"}
                </button>

                {resend > 0 && (
                  <div className="relative w-8 h-8">
                    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 28 28">
                      <circle
                        cx="14"
                        cy="14"
                        r="10"
                        fill="none"
                        stroke="rgba(51,65,85,.6)"
                        strokeWidth="2.5"
                      />
                      <circle
                        cx="14"
                        cy="14"
                        r="10"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        style={{ transition: "stroke-dashoffset 1s linear" }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center otp-font-mono text-[9px] text-emerald-400 font-medium">
                      {resend}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsOTPSent(false)}
                className="otp-resend-btn w-full text-center otp-font-mono text-xs text-slate-600 hover:text-slate-400 tracking-widest pt-1"
              >
                ← BACK TO EMAIL
              </button>
            </div>
          )}

          {success && (
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent mt-6 mb-0" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
