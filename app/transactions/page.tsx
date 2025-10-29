"use client"

import { useState } from "react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useMining } from "@/lib/mining-context"
import { ArrowUpRight, ArrowDownLeft, TrendingUp, Gift } from "lucide-react"

export default function TransactionsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const { transactions } = useMining()
  const [filterType, setFilterType] = useState<"all" | "mine" | "trade" | "buy" | "sell" | "claim">("all")

  const filteredTransactions = filterType === "all" ? transactions : transactions.filter((tx) => tx.type === filterType)

  const getIcon = (type: string) => {
    switch (type) {
      case "mine":
        return <TrendingUp className="w-5 h-5 text-green-400" />
      case "claim":
        return <Gift className="w-5 h-5 text-yellow-400" />
      case "buy":
        return <ArrowDownLeft className="w-5 h-5 text-blue-400" />
      case "sell":
        return <ArrowUpRight className="w-5 h-5 text-purple-400" />
      default:
        return <ArrowUpRight className="w-5 h-5 text-red-400" />
    }
  }

  const getLabel = (type: string) => {
    switch (type) {
      case "mine":
        return "Mining Reward"
      case "claim":
        return "Coins Claimed"
      case "buy":
        return "Bought GX"
      case "sell":
        return "Sold GX"
      default:
        return "Transaction"
    }
  }

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case "mine":
        return "bg-green-500/10"
      case "claim":
        return "bg-yellow-500/10"
      case "buy":
        return "bg-blue-500/10"
      case "sell":
        return "bg-purple-500/10"
      default:
        return "bg-gray-500/10"
    }
  }

  const totalIncome = transactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0)

  const totalExpense = transactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  return (
    <div className="min-h-screen flex flex-col">
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Transaction History</h1>
            <p className="text-gray-400">Track all your mining, trading, and claiming activities</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-card p-6 rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-2">Total Transactions</p>
              <p className="text-3xl font-bold text-white">{transactions.length}</p>
            </div>
            <div className="glass-card p-6 rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-2">Total Income</p>
              <p className="text-3xl font-bold text-green-400">+{totalIncome.toFixed(2)} GX</p>
            </div>
            <div className="glass-card p-6 rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm mb-2">Total Expense</p>
              <p className="text-3xl font-bold text-red-400">-{totalExpense.toFixed(2)} GX</p>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType("all")}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                filterType === "all"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-black shadow-lg shadow-green-500/50"
                  : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("mine")}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                filterType === "mine"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-black shadow-lg shadow-green-500/50"
                  : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
              }`}
            >
              Mining
            </button>
            <button
              onClick={() => setFilterType("claim")}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                filterType === "claim"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-black shadow-lg shadow-green-500/50"
                  : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
              }`}
            >
              Claims
            </button>
            <button
              onClick={() => setFilterType("buy")}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                filterType === "buy"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-black shadow-lg shadow-green-500/50"
                  : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
              }`}
            >
              Buys
            </button>
            <button
              onClick={() => setFilterType("sell")}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                filterType === "sell"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-black shadow-lg shadow-green-500/50"
                  : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
              }`}
            >
              Sells
            </button>
          </div>

          {/* Transactions List */}
          <div className="glass-card p-8 rounded-xl border border-white/10">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No transactions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${getBackgroundColor(tx.type)}`}>{getIcon(tx.type)}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{getLabel(tx.type)}</p>
                        <p className="text-sm text-gray-400">{tx.time}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`font-bold text-lg ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                        {tx.amount > 0 ? "+" : ""}
                        {tx.amount.toFixed(2)} GX
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{tx.status}</p>
                    </div>

                    {tx.tradeId && (
                      <Link
                        href={`/market/trade-status/${tx.tradeId}`}
                        className="ml-4 px-3 py-1 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition text-sm"
                      >
                        View
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export Section */}
          <div className="mt-8 glass-card p-8 rounded-xl border border-blue-500/30 bg-blue-500/10">
            <h3 className="font-bold text-white mb-4">Export Your Data</h3>
            <p className="text-sm text-gray-300 mb-4">Download your complete transaction history for record keeping</p>
            <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition">
              Download CSV
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
