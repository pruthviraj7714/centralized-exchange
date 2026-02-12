"use client";

import { useState } from "react";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Filter, 
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchWalletTransactions } from "@/lib/api/wallet.api";
import { useSession } from "next-auth/react";

interface ITransaction {
  amount: string;
  balanceAfter: string;
  createdAt: Date;
  id: string;
  referenceId: string | null;
  type: "REFUND" | "DEPOSIT" | "WITHDRAW" | "TRADE_DEBIT" | "TRADE_CREDIT" | "FEE";
  wallet: { userId: string };
  walletId: string;
}

export default function WalletTransactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const {data, status}  = useSession();
  const isReady = status === "authenticated";

  const { data : transactions, isLoading, error } = useQuery<ITransaction[]>({
    queryKey : ["walletTransactions"],
    queryFn : () => fetchWalletTransactions(data?.accessToken!),
    enabled : isReady,
  })

  const getTransactionConfig = (type: ITransaction["type"]) => {
    const configs = {
      DEPOSIT: {
        label: "Deposit",
        icon: ArrowDownLeft,
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
        iconBg: "bg-emerald-500/20"
      },
      WITHDRAW: {
        label: "Withdrawal",
        icon: ArrowUpRight,
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        iconBg: "bg-red-500/20"
      },
      TRADE_CREDIT: {
        label: "Trade Credit",
        icon: TrendingUp,
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        iconBg: "bg-blue-500/20"
      },
      TRADE_DEBIT: {
        label: "Trade Debit",
        icon: TrendingDown,
        color: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        iconBg: "bg-orange-500/20"
      },
      FEE: {
        label: "Fee",
        icon: Receipt,
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
        iconBg: "bg-purple-500/20"
      },
      REFUND: {
        label: "Refund",
        icon: CheckCircle2,
        color: "text-cyan-400",
        bgColor: "bg-cyan-500/10",
        borderColor: "border-cyan-500/30",
        iconBg: "bg-cyan-500/20"
      },
    };
    return configs[type];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date)); 
  };

  const filteredTransactions = (transactions || []).filter(tx => {
    const matchesSearch = tx.referenceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.amount.includes(searchTerm);
    const matchesFilter = filterType === "ALL" || tx.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalDeposits: (transactions || []).filter(t => t.type === "DEPOSIT").reduce((sum, t) => sum + parseFloat(t.amount), 0),
    totalWithdrawals: (transactions || []).filter(t => t.type === "WITHDRAW").reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0),
    totalFees: (transactions || []).filter(t => t.type === "FEE").reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0),
    totalTransactions: (transactions || []).length
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

  if(error) {
    return (
        <div>
            <p>Something went wrong</p>
        </div>
    )
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
                <p className="text-xs text-slate-400">Track all your wallet activities</p>
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
            <p className="text-2xl font-bold text-white">{stats.totalDeposits.toFixed(4)}</p>
            <p className="text-xs text-emerald-400 mt-1">$</p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">Total Withdrawals</p>
              <ArrowUpRight className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalWithdrawals.toFixed(4)}</p>
            <p className="text-xs text-red-400 mt-1">$</p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">Total Fees</p>
              <Receipt className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalFees.toFixed(4)}</p>
            <p className="text-xs text-purple-400 mt-1">$</p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">Transactions</p>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalTransactions}</p>
            <p className="text-xs text-blue-400 mt-1">All time</p>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by reference ID or amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all cursor-pointer appearance-none pr-10"
              >
                <option value="ALL">All Types</option>
                <option value="DEPOSIT">Deposits</option>
                <option value="WITHDRAW">Withdrawals</option>
                <option value="TRADE_CREDIT">Trade Credits</option>
                <option value="TRADE_DEBIT">Trade Debits</option>
                <option value="FEE">Fees</option>
                <option value="REFUND">Refunds</option>
              </select>

              <button className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-all flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Date Range</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-900/50">
            <h2 className="text-lg font-semibold text-white">
              Recent Transactions
              <span className="ml-2 text-sm text-slate-400 font-normal">
                ({filteredTransactions.length} results)
              </span>
            </h2>
          </div>

          <div className="divide-y divide-slate-800/30">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction : ITransaction) => {
                const config = getTransactionConfig(transaction.type);
                const Icon = config.icon;
                const isPositive = parseFloat(transaction.amount) >= 0;

                return (
                  <div
                    key={transaction.id}
                    className="p-6 hover:bg-slate-800/20 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`p-3 ${config.iconBg} rounded-xl border ${config.borderColor}`}>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                              {config.label}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.bgColor} ${config.color}`}>
                              {transaction.type}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(transaction.createdAt)}
                            </span>
                            {transaction.referenceId && (
                              <span className="font-mono text-xs bg-slate-800/50 px-2 py-0.5 rounded">
                                {transaction.referenceId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-xl font-bold mb-1 ${
                          isPositive ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {isPositive ? '+' : ''}{transaction.amount}$
                        </div>
                        <div className="text-sm text-slate-500">
                          Balance: <span className="text-slate-400 font-medium">{transaction.balanceAfter}$</span>
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
                <p className="text-slate-400 text-lg mb-2">No transactions found</p>
                <p className="text-sm text-slate-500">
                  {searchTerm || filterType !== "ALL" 
                    ? "Try adjusting your search or filters" 
                    : "Your transaction history will appear here"}
                </p>
              </div>
            )}
          </div>

          {filteredTransactions.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-800/50 bg-slate-900/50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Showing {filteredTransactions.length} of {(transactions || []).length} transactions
                </p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-sm bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    Previous
                  </button>
                  <button className="px-3 py-1.5 text-sm bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}