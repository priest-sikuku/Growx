"use client"

import { useState } from "react"
import { Zap } from "lucide-react"
import { useMining } from "@/lib/mining-context"

export function MiningWidget() {
  const { nextMineTime, isMining, pendingReward, mine } = useMining()
  const [showReward, setShowReward] = useState(false)

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  const progressPercent = nextMineTime > 0 ? ((9000 - nextMineTime) / 9000) * 100 : 100

  const handleMine = () => {
    console.log("[v0] Mine button clicked")
    mine()
    setShowReward(true)
    setTimeout(() => setShowReward(false), 3000)
  }

  const canMine = nextMineTime === 0 && !isMining

  return (
    <div className="glass-card p-8 rounded-2xl border border-white/5">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Mining</h2>
        <div className="p-3 bg-green-500/10 rounded-lg">
          <Zap className="w-6 h-6 text-green-400" />
        </div>
      </div>

      {/* Mining Status */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-400">{nextMineTime === 0 ? "Ready to mine!" : "Next mine available in"}</span>
          <span className="text-2xl font-bold text-green-400">{formatTime(nextMineTime)}</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden mb-4">
          <div className="progress-bar h-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="flex justify-between text-xs text-gray-400">
          <span>Mining cycle: 2.5 hours</span>
          <span>{Math.round(progressPercent)}% complete</span>
        </div>
      </div>

      {/* Reward Preview */}
      {pendingReward > 0 && showReward && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6 animate-pulse">
          <p className="text-sm text-gray-400 mb-1">Pending Reward</p>
          <p className="text-2xl font-bold text-green-400">+{pendingReward.toFixed(2)} GX</p>
        </div>
      )}

      {/* Mine Button */}
      <button
        onClick={handleMine}
        disabled={!canMine}
        className="w-full px-6 py-4 rounded-lg btn-primary-gx font-bold text-lg hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isMining ? "Mining..." : canMine ? "Mine Now" : `Wait ${formatTime(nextMineTime)}`}
      </button>

      {/* Info */}
      <p className="text-xs text-gray-400 mt-4 text-center">
        You can mine every 2.5 hours. Each mine gives you exactly 2.50 GX coins.
      </p>
    </div>
  )
}
