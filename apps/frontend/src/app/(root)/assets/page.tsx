"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BACKEND_URL } from "@/lib/config"
import { SUPPORTED_TOEKNS } from "@/lib/constants"
import axios from "axios"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Wallet, DollarSign, Plus } from "lucide-react"
import { useSession } from "next-auth/react"
import Decimal from "decimal.js"

export default function AssetsPage() {
  const [selectedAsset, setSelectedAsset] = useState("SOL")
  const [amount, setAmount] = useState(0)
  const [balances, setBalances] = useState<
    {
      asset: string
      available: Decimal,
      locked : Decimal
    }[]
  >([])
    const { data, status } = useSession();

  const handleValueChange = (e: any) => {
    setSelectedAsset(e.target.value)
  }

  const fetchBalances = async () => {
    if(!data?.accessToken) return;
    try {
      const response = await axios.get(`${BACKEND_URL}/wallets/`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      })
      setBalances(response.data.wallets)
    } catch (error: any) {
      toast.error(error.response.data.message ?? error.message)
    }
  }

  useEffect(() => {
    if(status === "authenticated") {
      fetchBalances();
    }
  }, [status])

  const handleDeposit = async () => {
    if(!data || !data.accessToken) return;
    try {
      const response = await axios.post(
        `${BACKEND_URL}/wallets/deposit`,
        {
          asset: selectedAsset,
          amount,
        },
        {
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
          },
        },
      )
      toast.success(response.data.message)
      fetchBalances()
    } catch (error: any) {
      toast.error(error.response.data.message ?? error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-lg border border-red-500/30">
              <Wallet className="w-5 h-5 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Assets & Wallet
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 rounded-lg border border-emerald-500/30">
                <Plus className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Deposit Funds</h2>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-slate-300 text-sm font-medium mb-3 block">Select Asset</Label>
                <div className="relative">
                  <select
                    value={selectedAsset}
                    onChange={handleValueChange}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
                  >
                    {SUPPORTED_TOEKNS.map((t) => (
                      <option key={t} value={t} className="bg-slate-800 text-white">
                        {t}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-slate-300 text-sm font-medium mb-3 block">Amount</Label>
                <Input
                  onChange={(e) => setAmount(e.target.valueAsNumber)}
                  type="number"
                  placeholder="0.00"
                  className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:ring-emerald-500/50 focus:border-emerald-500/50 h-12 text-lg"
                />
              </div>

              <Button
                onClick={handleDeposit}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 h-12 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25"
              >
                <Plus className="w-5 h-5 mr-2" />
                Deposit {selectedAsset}
              </Button>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-lg border border-blue-500/30">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Wallet Balances</h2>
            </div>

            <div className="space-y-3">
              {balances && balances.length > 0 ? (
                balances.map((b) => (
                  <div
                    key={b.asset}
                    className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700/30 rounded-xl hover:bg-slate-800/50 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-slate-700 to-slate-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-white">{b.asset.slice(0, 2)}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-white">{b.asset}</div>
                        <div className="text-sm text-slate-400">Available</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-white">{b.available.toLocaleString()}</div>
                      <div className="text-sm text-slate-400">{b.asset}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-white">{b.locked.toLocaleString()}</div>
                      <div className="text-sm text-slate-400">{b.asset}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-slate-400">No balances found</p>
                  <p className="text-sm text-slate-500 mt-1">Make your first deposit to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
