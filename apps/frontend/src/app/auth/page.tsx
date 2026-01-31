"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import OTPDialog from "@/components/OTPComponent";
import { signIn } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import { requestOTP } from "@/lib/api/user.api";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [isOTPSent, setIsOTPSent] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();
  const { mutate: requestOTPMutate, isPending: isOTPMutating } = useMutation({
    mutationFn: () => requestOTP(email),
    mutationKey: ["requestOTP"],
  });

  const handleLogin = async () => {
    if (!email || email.length === 0) {
      toast.warning("please provide email to send otp");
      return;
    }
    requestOTPMutate();
    toast.success("OTP successfully sent to email", {
      description: "Please Enter OTP for verification",
    });
    setIsOTPSent(true);
  };

  const verifyOTP = async (otpString: string) => {
    if (!otpString || otpString.length < 6) {
      toast.warning("Please Provide OTP Properly");
      return;
    }
    setIsVerifying(true);
    try {
      await signIn("credentials", {
        redirect: false,
        email,
        otp: otpString,
      });

      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.response.data.message ?? error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-900/50 to-slate-950"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-2xl mb-6 shadow-lg shadow-emerald-500/25">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-slate-400">
            Enter your email to access your account
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Email Address
              </label>
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
              By continuing, you agree to our Terms of Service and Privacy
              Policy
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            Secure authentication powered by OTP verification
          </p>
        </div>
      </div>

      <OTPDialog
        isOTPSent={isOTPSent}
        isVerifying={isVerifying}
        setIsOTPSent={setIsOTPSent}
        verifyOTP={verifyOTP}
      />
    </div>
  );
}
