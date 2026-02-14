"use client";

import { ChartBarIcon, ChevronDownIcon, ChevronUpIcon, HomeIcon, LogOutIcon, MenuIcon, ReceiptIcon, UserIcon, XIcon } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Appbar() {
   const router = useRouter();
  const { data, status } = useSession();
  const isLoggedIn = status === "authenticated"
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleNavigate = (path: string) => {
    isLoggedIn ? router.push(path) : router.push("/");
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = () => {
    signOut();
  };

  return (
    <header className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 backdrop-blur-xl border-b border-slate-800/70 sticky top-0 z-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div
            onClick={() => handleNavigate(isLoggedIn ? "/dashboard" : "/")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-400 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative w-10 h-10 bg-gradient-to-r from-red-500 to-red-400 rounded-xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">
                Exchange
              </span>
              <div className="text-xs text-slate-500 -mt-1">Trade with confidence</div>
            </div>
          </div>

          {isLoggedIn && (
            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => handleNavigate("/dashboard")}
                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all group"
              >
                <span className="group-hover:text-emerald-400 transition-colors">
                  <HomeIcon />
                </span>
                <span className="font-medium">Markets</span>
              </button>


              <button
                onClick={() => handleNavigate("/portfolio")}
                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all group"
              >
                <span className="group-hover:text-emerald-400 transition-colors">
                  <ChartBarIcon />
                </span>
                <span className="font-medium">Portfolio</span>
              </button>


              <button
                onClick={() => handleNavigate("/wallet/transactions")}
                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all group"
              >
                <span className="group-hover:text-emerald-400 transition-colors">
                  <ReceiptIcon />
                </span>
                <span className="font-medium">Transactions</span>
              </button>
            </nav>
          )}

          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all group"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-lg flex items-center justify-center">
                    <UserIcon />
                  </div>
                  <span className="text-white font-medium">Account</span>
                  <span className="text-slate-400">
                    {isProfileOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                  </span>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800">
                      <p className="text-sm text-slate-400">Signed in as</p>
                      <p className="text-white font-semibold truncate">{data.user.email}</p>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => {
                          handleNavigate("/profile");
                          setIsProfileOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
                      >
                        <UserIcon />
                        <span>Profile Settings</span>
                      </button>

                     
                    </div>

                    <div className="p-2 border-t border-slate-800">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <LogOutIcon />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleNavigate("/signin")}
                  className="px-6 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNavigate("/signup")}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
          >
            {isMobileMenuOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800/50">
            {isLoggedIn ? (
              <div className="space-y-2">
                <button
                  onClick={() => handleNavigate("/dashboard")}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
                >
                  <HomeIcon />
                  <span className="font-medium">Markets</span>
                </button>


                <button
                  onClick={() => handleNavigate("/portfolio")}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
                >
                  <ChartBarIcon />
                  <span className="font-medium">Portfolio</span>
                </button>


                <button
                  onClick={() => handleNavigate("/wallet/transactions")}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
                >
                  <ReceiptIcon />
                  <span className="font-medium">Transactions</span>
                </button>

                <div className="pt-4 border-t border-slate-800/50 mt-4">
                  <div className="px-4 py-3 mb-2">
                    <p className="text-sm text-slate-400">Signed in as</p>
                    <p className="text-white font-semibold truncate">{data.user.email}</p>
                  </div>

                  <button
                    onClick={() => handleNavigate("/profile")}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
                  >
                    <UserIcon />
                    <span className="font-medium">Profile Settings</span>
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all mt-2"
                  >
                    <LogOutIcon />
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => handleNavigate("/signin")}
                  className="w-full px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg font-medium transition-all"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNavigate("/signup")}
                  className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg transition-all"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}