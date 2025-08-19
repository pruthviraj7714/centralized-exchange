"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OTPDialogProps {
  isOTPSent: boolean;
  isVerifying: boolean;
  setIsOTPSent: (value: boolean) => void;
  verifyOTP: (otp: string) => void;
}

export default function OTPDialog({
  isOTPSent,
  isVerifying,
  setIsOTPSent,
  verifyOTP,
}: OTPDialogProps) {
  const [otp, setOtp] = useState("");

  const handleVerify = () => {
    verifyOTP(otp);
  };

  return (
    <Dialog open={isOTPSent} onOpenChange={setIsOTPSent}>
      <DialogContent className="bg-slate-900/95 backdrop-blur-xl border border-slate-800/50 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center mb-2">
            Verify Your Email
          </DialogTitle>
          <p className="text-slate-400 text-center text-sm">
            We've sent a 6-digit code to your email address
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Enter OTP
            </label>
            <Input
              type="text"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="h-12 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 rounded-xl text-center text-lg tracking-widest"
              maxLength={6}
            />
          </div>

          <Button
            onClick={handleVerify}
            disabled={isVerifying || otp.length < 6}
            className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? "Verifying..." : "Verify OTP"}
          </Button>

          <Button
            variant="ghost"
            onClick={() => setIsOTPSent(false)}
            className="w-full text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            Back to Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
