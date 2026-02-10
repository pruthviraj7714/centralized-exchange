"use client";

import { useState } from "react";
import {
  Wallet,
  Plus,
  Minus,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { SUPPORTED_TOKENS, TOKEN_METADATA } from "@repo/common";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Decimal from "decimal.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPortfolio } from "@/lib/api/user.api";
import { depositAsset } from "@/lib/api/wallet.api";
import { IBalance } from "@/types/wallet";


export default function PortfolioPage() {
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [amount, setAmount] = useState<Decimal>(new Decimal(0));
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [hideBalances, setHideBalances] = useState(false);
  const { data, status } = useSession();
  const {
    data: portfolioData,
    isLoading: portfolioLoading,
    isError: portfolioError,
  } = useQuery<{ portfolio: IBalance[] }>({
    queryFn: () => fetchPortfolio(data?.accessToken!),
    queryKey: ["portfolio"],
    enabled: !!data?.accessToken,
  });
  const { mutateAsync } = useMutation({
    mutationFn : () => depositAsset(selectedAsset, amount, data?.accessToken!),
    mutationKey : ["deposit"],
    onError : () => {
      toast.error("Error while depositing", {position : "top-center"});
    },
    onSuccess : () => {
      queryClient.invalidateQueries({
        queryKey : ["portfolio"],
      })
    }
  });
  const queryClient = useQueryClient();

  const normalizeBalances = (raw: any[]): IBalance[] =>
    raw.map((b) => ({
      ...b,
      available: new Decimal(b.available),
      locked: new Decimal(b.locked),
      usdValue: new Decimal(b.usdValue),
      change24h: new Decimal(b.change24h),
    }));

  const handleDeposit = async () => {
    if (!data?.accessToken) {
      toast.warning("Please login to deposit");
      return;
    }
    const result = await mutateAsync();
    console.log(result);
    toast.success(`Successfully Deposited ${amount} ${selectedAsset}`, {
      position: "top-center",
    });
  };

  const handleWithdraw = () => {
    toast.success(`Withdrawing ${amount} ${selectedAsset}`, {
      position: "top-center",
    });
  };

  if (portfolioLoading) {
    return <div>Loading...</div>;
  }

  if(portfolioError) {
    return <div>Error while fetching portfolio</div>;
  }

  const balances = normalizeBalances(portfolioData?.portfolio || []);

  const totalUSDValue = balances.reduce(
    (sum, b) => sum.plus(b.usdValue),
    new Decimal(0),
  );
  const totalChange24h = balances.reduce(
    (sum, b) => sum.plus(b.usdValue.mul(b.change24h)).div(100),
    new Decimal(0),
  );

  const totalChangePercent = totalUSDValue.isZero() ? new Decimal(0) : totalChange24h.div(totalUSDValue).mul(100);

  const totalAvailableBalanceInUSD = balances.reduce(
    (sum, asset) =>
      sum.plus(
        asset.available
          .div(asset.available.plus(asset.locked))
          .mul(asset.usdValue),
      ),
    new Decimal(0),
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl border border-emerald-500/30">
                <Wallet className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Assets & Wallet
                </h1>
                <p className="text-xs text-slate-400">
                  Manage your crypto portfolio
                </p>
              </div>
            </div>

            <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
              <RefreshCw className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-2 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">
                  Total Portfolio Value
                </p>
                <div className="flex items-center gap-3">
                  <h2 className="text-4xl font-bold text-white">
                    {hideBalances ? "••••••" : `$${totalUSDValue}`}
                  </h2>
                  <button
                    onClick={() => setHideBalances(!hideBalances)}
                    className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
                  >
                    {hideBalances ? (
                      <EyeOff className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400 mb-1">24h Change</p>
                <div
                  className={`flex items-center gap-1 text-xl font-bold ${totalChangePercent.greaterThan(0) ? "text-emerald-400" : "text-red-400"}`}
                >
                  {totalChangePercent.greaterThan(0) ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5" />
                  )}
                  <span>
                    {totalChangePercent.greaterThan(0) ? "+" : ""}
                    {totalChangePercent.toFixed(2)}%
                  </span>
                </div>
                <p
                  className={`text-sm ${totalChangePercent.greaterThan(0) ? "text-emerald-400" : "text-red-400"}`}
                >
                  {totalChangePercent.greaterThan(0) ? "+" : ""}$
                  {totalChange24h.toString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-700/30">
              <div>
                <p className="text-xs text-slate-500 mb-1">Available Balance</p>
                <p className="text-lg font-semibold text-white">
                  ${Decimal(totalAvailableBalanceInUSD).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">In Orders</p>
                <p className="text-lg font-semibold text-white">
                  $
                  {balances
                    .reduce(
                      (sum, b) =>
                        sum.plus(
                          b.locked
                            .div(b.available.plus(b.locked))
                            .mul(b.usdValue),
                        ),
                      new Decimal(0),
                    )
                    .toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Total Assets</p>
                <p className="text-lg font-semibold text-white">
                  {balances.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => setActiveTab("deposit")}
                className="w-full flex items-center justify-between p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/30 transition-colors">
                    <Plus className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="font-medium text-white">Deposit</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </button>

              <button
                onClick={() => setActiveTab("withdraw")}
                className="w-full flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg group-hover:bg-red-500/30 transition-colors">
                    <Minus className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="font-medium text-white">Withdraw</span>
                </div>
                <ArrowDownRight className="w-4 h-4 text-red-400" />
              </button>

              <button className="w-full flex items-center justify-between p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                    <DollarSign className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="font-medium text-white">Trade</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl overflow-hidden sticky top-24">
              <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900/50 border-b border-slate-800/50">
                <button
                  onClick={() => setActiveTab("deposit")}
                  className={`py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    activeTab === "deposit"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setActiveTab("withdraw")}
                  className={`py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    activeTab === "withdraw"
                      ? "bg-red-600 text-white shadow-lg shadow-red-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  Withdraw
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-3 block">
                    Select Asset
                  </label>
                  <div className="relative">
                    <select
                      value={selectedAsset}
                      onChange={(e) => setSelectedAsset(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
                    >
                      {SUPPORTED_TOKENS.map((token) => (
                        <option
                          key={token.symbol}
                          value={token.symbol}
                          className="bg-slate-800 text-white"
                        >
                          {token.symbol} - {TOKEN_METADATA[token.symbol].name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg
                        className="w-5 h-5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-300">
                      Amount
                    </label>
                    {activeTab === "deposit" && (
                      <span className="text-xs text-slate-500">
                        Min: 0.001 {selectedAsset}
                      </span>
                    )}
                    {activeTab === "withdraw" && (
                      <span className="text-xs text-emerald-400 cursor-pointer hover:text-emerald-300">
                        Available:{" "}
                        {(
                          balances.find((b) => b.asset === selectedAsset)
                            ?.available || new Decimal(0)
                        ).toString()}{" "}
                        {selectedAsset}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      onChange={(e) =>
                        setAmount(new Decimal(e.target.value))
                      }
                      type="number"
                      step="0.0001"
                      placeholder="0.00"
                      className="w-full bg-slate-800/50 border border-slate-700/50 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none h-14 text-lg px-4 rounded-xl transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                      {selectedAsset}
                    </div>
                  </div>
                  {activeTab === "withdraw" && (
                    <button className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors">
                      Use max amount
                    </button>
                  )}
                </div>

                {activeTab === "withdraw" && (
                  <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                    <p className="text-xs text-orange-400 flex items-center gap-2">
                      <span className="text-base">⚠</span>
                      Network fee: 0.0005 {selectedAsset}
                    </p>
                  </div>
                )}

                <button
                  onClick={
                    activeTab === "deposit" ? handleDeposit : handleWithdraw
                  }
                  className={`w-full font-semibold py-4 rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 ${
                    activeTab === "deposit"
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/25"
                      : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-500/25"
                  }`}
                >
                  {activeTab === "deposit" ? (
                    <>
                      <Plus className="w-5 h-5" />
                      Deposit {selectedAsset}
                    </>
                  ) : (
                    <>
                      <Minus className="w-5 h-5" />
                      Withdraw {selectedAsset}
                    </>
                  )}
                </button>

                {activeTab === "deposit" && (
                  <div className="text-xs text-slate-500 text-center">
                    Send only {selectedAsset} to this address. Other assets will
                    be lost.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    Wallet Balances
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">
                      {balances.length} Assets
                    </span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-800/30">
                {balances && balances.length > 0 ? (
                  balances.map((balance) => {
                    const metadata =
                      TOKEN_METADATA[
                        balance.asset as keyof typeof TOKEN_METADATA
                      ];
                    const totalAmount = balance.available.plus(balance.locked);
                    const availablePercent = balance.available
                      .div(totalAmount)
                      .mul(100);

                    return (
                      <div
                        key={balance.asset}
                        className="p-6 hover:bg-slate-800/20 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <img
                              src={metadata.logo}
                              alt={balance.asset}
                              className="w-12 h-12 rounded-full border border-slate-700/50 object-contain bg-white p-1.5 group-hover:border-emerald-500/50 transition-colors"
                            />
                            <div>
                              <h3 className="font-semibold text-white text-lg group-hover:text-emerald-400 transition-colors">
                                {balance.asset}
                              </h3>
                              <p className="text-sm text-slate-400">
                                {metadata.name}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-2xl font-bold text-white">
                              {hideBalances ? "••••" : totalAmount.toString()}
                            </p>
                            <p className="text-sm text-slate-400">
                              {hideBalances ? "••••" : `≈ $${balance.usdValue}`}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-3 bg-slate-800/30 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">
                              Available
                            </p>
                            <p className="text-sm font-semibold text-emerald-400">
                              {hideBalances
                                ? "••••"
                                : balance.available.toString()}
                            </p>
                          </div>

                          <div className="p-3 bg-slate-800/30 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">
                              In Orders
                            </p>
                            <p className="text-sm font-semibold text-orange-400">
                              {hideBalances
                                ? "••••"
                                : balance.locked.toString()}
                            </p>
                          </div>

                          <div className="p-3 bg-slate-800/30 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">
                              24h Change
                            </p>
                            <p
                              className={`text-sm font-semibold ${balance.change24h.greaterThanOrEqualTo(0) ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {balance.change24h.greaterThanOrEqualTo(0)
                                ? "+"
                                : ""}
                              {balance.change24h.toFixed(2)}%
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                              style={{ width: `${availablePercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Wallet className="w-10 h-10 text-slate-500" />
                    </div>
                    <p className="text-slate-400 text-lg mb-2">
                      No balances found
                    </p>
                    <p className="text-sm text-slate-500">
                      Make your first deposit to get started
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
