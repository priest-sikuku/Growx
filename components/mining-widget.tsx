"use client"

import { useMining } from "@/lib/mining-context"
import { CircularMiningCountdown } from "./circular-mining-countdown"

export function MiningWidget() {
  const { nextMineTime, isMining, pendingReward, mine } = useMining()

  const canMine = nextMineTime === 0 && !isMining

  return (
    <div className="glass-card p-8 rounded-2xl border border-white/5">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Mining Station</h2>
        <div className="px-4 py-2 bg-green-500/10 rounded-lg border border-green-500/20">
          <span className="text-sm font-semibold text-green-400">2.50 GX per cycle</span>
        </div>
      </div>

      {/* Circular Countdown */}
      <CircularMiningCountdown secondsRemaining={nextMineTime} onMine={mine} isMining={isMining} canMine={canMine} />

      {/* Reward Preview */}
      {pendingReward > 0 && (
        <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4 animate-pulse">
          <p className="text-sm text-gray-400 mb-1 text-center">Reward Claimed!</p>
          <p className="text-2xl font-bold text-green-400 text-center">+{pendingReward.toFixed(2)} GX</p>
        </div>
      )}
    </div>
  )
}
