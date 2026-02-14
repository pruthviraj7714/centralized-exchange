"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Download,
  Clock,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  Receipt,
  Lock,
  Unlock,
  Info,
  X,
} from "lucide-react";
import { TOKEN_LOGOS } from "@repo/common";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { fetchWalletTransactions } from "@/lib/api/wallet.api";

interface ITransaction {
  amount: string;
  id: string;
  wallet: { userId: string };
  walletId: string;
  asset: string;
  entryType:
    | "DEPOSIT"
    | "WITHDRAWAL"
    | "FEE"
    | "TRADE_LOCK"
    | "TRADE_UNLOCK"
    | "TRADE_EXECUTE"
    | "TRANSFER_IN"
    | "TRANSFER_OUT";
  direction: "CREDIT" | "DEBIT";
  balanceType: "AVAILABLE" | "LOCKED";
  balanceBefore: string;
  balanceAfter: string;
  referenceType:
    | "DEPOSIT"
    | "WITHDRAWAL"
    | "ORDER"
    | "TRADE"
    | "FEE"
    | "TRANSFER";
  referenceId: string | null;
  idempotencyKey: string | null;
  sequence: number;
  metadata: any;
  createdAt: Date;
}

export default function WalletTransactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterAsset, setFilterAsset] = useState<string>("ALL");
  const [selectedTransaction, setSelectedTransaction] =
    useState<ITransaction | null>(null);
  const { data, status } = useSession();
  const isReady = status === "authenticated";
 const { data: transactions, isLoading } = useQuery<ITransaction[]>({
  queryKey: ["transactions"],
  queryFn: () => fetchWalletTransactions(data?.accessToken as string),
  enabled: isReady,
});

  const getTransactionConfig = (type: ITransaction["entryType"]) => {
    const configs = {
      DEPOSIT: {
        label: "Deposit",
        icon: ArrowDownLeft,
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
        iconBg: "bg-emerald-500/20",
      },
      WITHDRAWAL: {
        label: "Withdrawal",
        icon: ArrowUpRight,
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        iconBg: "bg-red-500/20",
      },
      TRADE_EXECUTE: {
        label: "Trade Execute",
        icon: TrendingUp,
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        iconBg: "bg-blue-500/20",
      },
      TRADE_DEBIT: {
        label: "Trade Debit",
        icon: TrendingDown,
        color: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        iconBg: "bg-orange-500/20",
      },
      FEE: {
        label: "Fee",
        icon: Receipt,
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
        iconBg: "bg-purple-500/20",
      },
      TRADE_LOCK : {
        label : "Trade Lock",
        icon: Receipt,
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
        iconBg: "bg-purple-500/20",
      },
      TRADE_UNLOCK : {
        label : "Trade Unlock",
        icon: Receipt,
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
        iconBg: "bg-purple-500/20",
      },
      TRANSFER_IN : {
        label : "Transfer In",
        icon: Receipt,
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
        iconBg: "bg-purple-500/20",
      },
      TRANSFER_OUT : {
        label : "Transfer Out",
        icon: Receipt,
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
        iconBg: "bg-purple-500/20",
      }
    };
    return configs[type];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const filteredTransactions = transactions?.filter((tx) => {
    const matchesSearch =
      tx.referenceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.amount.includes(searchTerm) ||
      tx.asset.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "ALL" || tx.entryType === filterType;
    const matchesAsset = filterAsset === "ALL" || tx.asset === filterAsset;
    return matchesSearch && matchesFilter && matchesAsset;
  });

  const uniqueAssets = Array.from(
    new Set(transactions?.map((t) => t.asset) ?? []),
  );

  const stats = {
    totalDeposits: transactions
      ?.filter((t) => t.entryType === "DEPOSIT")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0),
    totalWithdrawals: transactions
      ?.filter((t) => t.entryType === "WITHDRAWAL")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0),
    totalFees: transactions
      ?.filter((t) => t.entryType === "FEE")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0),
    totalTransactions: transactions?.length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl border border-emerald-500/30">
                <Receipt className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Transaction History
                </h1>
                <p className="text-xs text-slate-400">
                  Track all your wallet activities
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
                <Download className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
              </button>
              <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
                <RefreshCw className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">Total Deposits</p>
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {stats?.totalDeposits?.toFixed(4)}
            </p>
            <p className="text-xs text-emerald-400 mt-1">Multi-asset</p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">Total Withdrawals</p>
              <ArrowUpRight className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {stats?.totalWithdrawals?.toFixed(4)}
            </p>
            <p className="text-xs text-red-400 mt-1">Multi-asset</p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">Total Fees</p>
              <Receipt className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {stats?.totalFees?.toFixed(4)}
            </p>
            <p className="text-xs text-purple-400 mt-1">Multi-asset</p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">Transactions</p>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {stats?.totalTransactions}
            </p>
            <p className="text-xs text-blue-400 mt-1">All time</p>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by reference ID, amount, or asset..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
              />
            </div>

            <div className="flex gap-2 px-2 flex-wrap">
              <select
                value={filterAsset}
                onChange={(e) => setFilterAsset(e.target.value)}
                className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all cursor-pointer"
              >
                <option value="ALL">All Assets</option>
                {uniqueAssets.map((asset) => (
                  <option key={asset} value={asset}>
                    {asset}
                  </option>
                ))}
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="DEPOSIT">Deposits</option>
                <option value="WITHDRAW">Withdrawals</option>
                <option value="TRADE_CREDIT">Trade Credits</option>
                <option value="TRADE_DEBIT">Trade Debits</option>
                <option value="FEE">Fees</option>
              </select>

              <button className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-all flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Date</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-900/50">
            <h2 className="text-lg font-semibold text-white">
              Recent Transactions
              <span className="ml-2 text-sm text-slate-400 font-normal">
                ({filteredTransactions?.length} results)
              </span>
            </h2>
          </div>

          <div className="divide-y divide-slate-800/30">
            {filteredTransactions && filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => {
                const config = getTransactionConfig(transaction.entryType);
                const Icon = config.icon;
                const isCredit = transaction.direction === "CREDIT";

                return (
                  <div
                    key={transaction.id}
                    className="p-6 hover:bg-slate-800/20 transition-colors group cursor-pointer"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div
                          className={`p-3 ${config.iconBg} rounded-xl border ${config.borderColor} shrink-0`}
                        >
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                              {config.label}
                            </h3>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded ${config.bgColor} ${config.color}`}
                            >
                              {transaction.entryType}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 ${
                                transaction.balanceType === "LOCKED"
                                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                                  : "bg-slate-700/30 text-slate-400 border border-slate-600/30"
                              }`}
                            >
                              {transaction.balanceType === "LOCKED" ? (
                                <>
                                  <Lock className="w-3 h-3" />
                                  Locked
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  Available
                                </>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-slate-400 mb-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(transaction.createdAt)}
                            </span>
                            {transaction.referenceId && (
                              <span className="font-mono text-xs bg-slate-800/50 px-2 py-1 rounded border border-slate-700/30">
                                {transaction.referenceId}
                              </span>
                            )}
                            <span className="text-xs text-slate-500">
                              Ref: {transaction.referenceType}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {TOKEN_LOGOS[transaction.asset] && (
                              <img
                                src={TOKEN_LOGOS[transaction.asset]}
                                alt={transaction.asset}
                                className="w-5 h-5 rounded-full border border-slate-700/50 bg-white p-0.5"
                              />
                            )}
                            <span className="text-sm font-medium text-slate-300">
                              {transaction.asset}
                            </span>

                            {transaction.metadata && (
                              <button
                                className="ml-2 p-1 hover:bg-slate-700/30 rounded transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTransaction(transaction);
                                }}
                              >
                                <Info className="w-4 h-4 text-blue-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-xl font-bold mb-1 ${isCredit ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {isCredit ? "+" : "-"}
                          {transaction.amount}
                        </div>
                        <div className="text-xs text-slate-500 space-y-1">
                          <div>
                            Before:{" "}
                            <span className="text-slate-400 font-medium">
                              {transaction.balanceBefore}
                            </span>
                          </div>
                          <div>
                            After:{" "}
                            <span className="text-slate-400 font-medium">
                              {transaction.balanceAfter}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-10 h-10 text-slate-500" />
                </div>
                <p className="text-slate-400 text-lg mb-2">
                  No transactions found
                </p>
                <p className="text-sm text-slate-500">
                  {searchTerm || filterType !== "ALL" || filterAsset !== "ALL"
                    ? "Try adjusting your search or filters"
                    : "Your transaction history will appear here"}
                </p>
              </div>
            )}
          </div>

          {filteredTransactions && filteredTransactions.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-800/50 bg-slate-900/50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Showing {filteredTransactions.length} of{" "}
                  {transactions?.length} transactions
                </p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-sm bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-all">
                    Previous
                  </button>
                  <button className="px-3 py-1.5 text-sm bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-all">
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedTransaction && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                Transaction Details
              </h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Transaction ID</p>
                  <p className="text-white font-mono text-sm break-all">
                    {selectedTransaction.id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Sequence</p>
                  <p className="text-white font-semibold">
                    #{selectedTransaction.sequence}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Amount</p>
                  <p
                    className={`text-lg font-bold ${selectedTransaction.direction === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {selectedTransaction.direction === "CREDIT" ? "+" : "-"}
                    {selectedTransaction.amount} {selectedTransaction.asset}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Direction</p>
                  <p className="text-white font-semibold">
                    {selectedTransaction.direction}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Entry Type</p>
                  <p className="text-white font-semibold">
                    {selectedTransaction.entryType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Balance Type</p>
                  <p className="text-white font-semibold">
                    {selectedTransaction.balanceType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Balance Before</p>
                  <p className="text-white font-mono">
                    {selectedTransaction.balanceBefore}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Balance After</p>
                  <p className="text-white font-mono">
                    {selectedTransaction.balanceAfter}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Reference Type</p>
                  <p className="text-white font-semibold">
                    {selectedTransaction.referenceType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Reference ID</p>
                  <p className="text-white font-mono text-sm">
                    {selectedTransaction.referenceId || "N/A"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-500 mb-1">Created At</p>
                  <p className="text-white">
                    {formatDate(selectedTransaction.createdAt)}
                  </p>
                </div>
              </div>

              {selectedTransaction.metadata && (
                <div className="pt-4 border-t border-slate-800">
                  <p className="text-sm text-slate-500 mb-2">Metadata</p>
                  <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-300 overflow-x-auto">
                    {JSON.stringify(selectedTransaction.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
