import { TrendingUp, Users } from "lucide-react"
import { useMining } from "@/lib/mining-context"
import { GXPriceDisplay } from "./gx-price-display"

export function DashboardStats() {
  const { balance, totalMined, miningStreak, remainingSupply, totalSupply } = useMining()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <GXPriceDisplay />

      {/* Balance Card */}
      <div className="glass-card p-6 rounded-2xl border border-white/5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">Total Balance</p>
            <p className="text-3xl font-bold text-white">{balance.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">GX Coins</p>
          </div>
          <div className="p-3 bg-green-500/10 rounded-lg">
            <TrendingUp className="w-6 h-6 text-green-400" />
          </div>
        </div>
        <div className="text-xs text-green-400">+3% daily growth</div>
      </div>

      {/* Total Referrals Card */}
      <div className="glass-card p-6 rounded-2xl border border-white/5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">Total Referrals</p>
            <p className="text-3xl font-bold text-white" id="total-referrals-count">
              0
            </p>
            <p className="text-xs text-gray-500 mt-1">Active Downlines</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
        </div>
        <div className="text-xs text-blue-400">Earn from referrals</div>
      </div>
    </div>
  )
}
