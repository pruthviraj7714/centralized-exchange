"use client";

import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { signOut, useSession } from "next-auth/react";

export default function Appbar() {
  const router = useRouter();
  const { status } = useSession();
  const isLoggedIn = status === "authenticated"

  const handleNavigate = () => {
    isLoggedIn ? router.push("/dashboard") : router.push("/");
  };


  return (
    <header className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative z-10 flex items-center justify-between p-6 border-b border-slate-800/50 backdrop-blur-xl">
      <div
        onClick={handleNavigate}
        className="flex cursor-pointer items-center space-x-3"
      >
        <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-400 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
          <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="text-xl font-bold text-white">Exchange</span>
      </div>
      <div className="flex items-center space-x-4">
        {isLoggedIn && (
          <div className="flex gap-4 items-center">
            <Button
              onClick={() => router.push("/portfolio")}
              variant={"ghost"}
              className="bg-gradient-to-r from-amber-500 to-amber-400  hover:from-amber-600 hover:to-amber-500 text-white hover:text-white cursor-pointer px-6 py-2 rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-200 hover:shadow-amber-500/40"
            >
              Portfolio
            </Button>
            <Button
              onClick={async () => {
                await signOut({ callbackUrl: "/" });
              }}
              variant={"destructive"}
            >
              Log Out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
