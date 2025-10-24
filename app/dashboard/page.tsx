"use client"

import { useState } from "react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { DashboardStats } from "@/components/dashboard-stats"
import { MiningWidget } from "@/components/mining-widget"
import { TransactionHistory } from "@/components/transaction-history"
import { WalletOverview } from "@/components/wallet-overview"
import { useMining } from "@/lib/mining-context"
import { Gift } from "lucide-react"

export default function Dashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const { claimCoins, balance, claimedCoins } = useMining()
  const [claimAmount, setClaimAmount] = useState("")
  const [isClaimProcessing, setIsClaimProcessing] = useState(false)

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400">Please sign in to access your dashboard</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const handleClaimCoins = () => {
    if (!claimAmount || Number.parseFloat(claimAmount) <= 0) {
      alert("Please enter a valid amount")
      return
    }

    if (Number.parseFloat(claimAmount) > balance) {
      alert("Insufficient balance")
      return
    }

    setIsClaimProcessing(true)
    claimCoins(Number.parseFloat(claimAmount))
    setTimeout(() => {
      setIsClaimProcessing(false)
      setClaimAmount("")
    }, 1000)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Welcome back!</h1>
            <p className="text-gray-400">Your mining dashboard is ready. Keep earning GX every 2 hours.</p>
          </div>

          {/* Stats Grid */}
          <DashboardStats />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Left Column - Mining & Wallet */}
            <div className="lg:col-span-2 space-y-8">
              <MiningWidget />
              <WalletOverview />

              <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-3 mb-6">
                  <Gift className="text-yellow-400" size={28} />
                  <h3 className="text-2xl font-bold">Claim Your Coins</h3>
                </div>

                <p className="text-gray-400 mb-6">
                  Lock in your GX coins for 7 days to earn bonus rewards. Claimed coins cannot be traded during the lock
                  period.
                </p>

                <div className="space-y-4">
                  {/* Claim Amount Input */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Amount to Claim (GX)</label>
                    <input
                      type="number"
                      value={claimAmount}
                      onChange={(e) => setClaimAmount(e.target.value)}
                      placeholder="Enter amount"
                      max={balance}
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                    />
                    <div className="text-xs text-gray-400 mt-1">Available: {balance.toFixed(2)} GX</div>
                  </div>

                  {/* Claim Button */}
                  <button
                    onClick={handleClaimCoins}
                    disabled={isClaimProcessing || !claimAmount}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold hover:shadow-lg hover:shadow-yellow-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isClaimProcessing ? "Claiming..." : "Claim Coins"}
                  </button>
                </div>

                {/* Claimed Coins List */}
                {claimedCoins.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h4 className="font-semibold text-white mb-4">Your Claimed Coins</h4>
                    <div className="space-y-3">
                      {claimedCoins.map((claim) => (
                        <div
                          key={claim.id}
                          className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div>
                            <div className="font-semibold text-white">{claim.amount} GX</div>
                            <div className="text-xs text-gray-400">Claimed: {claim.claimedAt}</div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-sm font-semibold ${claim.status === "active" ? "text-green-400" : "text-gray-400"}`}
                            >
                              {claim.status === "active" ? "Active" : "Expired"}
                            </div>
                            <div className="text-xs text-gray-400">Expires: {claim.expiresAt}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - History */}
            <div>
              <TransactionHistory />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
