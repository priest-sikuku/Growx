"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useMining } from "@/lib/mining-context"

export function BalancePanel() {
  const { balance, nextMineTime, mine, userRating, userTrades } = useMining()
  const [displayTime, setDisplayTime] = useState(nextMineTime)

  useEffect(() => {
    setDisplayTime(nextMineTime)
  }, [nextMineTime])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  const progressPercent = ((7200 - displayTime) / 7200) * 100

  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <div className="glass-card p-6 rounded-2xl border border-white/5">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="text-xs text-gray-400 mb-1">Your Balance</div>
            <div className="text-2xl font-bold text-white">{balance.toFixed(2)} GX</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-1">Daily Growth</div>
            <div className="text-2xl font-bold text-green-400">+3%</div>
          </div>
        </div>
        <div className="border-t border-white/5 pt-4">
          <div className="text-xs text-gray-400 mb-3">Next mine</div>
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-3">
            <div
              className="progress-bar h-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs text-gray-400">{formatTime(displayTime)}</span>
            <span className="text-xs text-gray-400">Cycles: 2hrs</span>
          </div>
          <button
            onClick={mine}
            className="w-full px-4 py-3 rounded-lg btn-primary-gx font-semibold hover:shadow-lg hover:shadow-green-500/50 transition"
          >
            Mine Now
          </button>
        </div>
      </div>

      {/* User Stats Card */}
      <div className="glass-card p-6 rounded-2xl border border-white/5">
        <h4 className="font-bold text-white mb-4">Your Stats</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Rating</span>
            <span className="font-semibold text-yellow-400">⭐ {userRating}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Trades</span>
            <span className="font-semibold text-green-400">{userTrades}</span>
          </div>
        </div>
      </div>

      {/* P2P Market Card */}
      <div className="glass-card p-6 rounded-2xl border border-white/5">
        <h4 className="font-bold text-white mb-2">P2P Market</h4>
        <p className="text-sm text-gray-400 mb-4">
          Buy or sell GX with M-Pesa or bank transfer. Escrow-secured trades.
        </p>
        <div className="flex gap-3">
          <Link
            href="/market?tab=buy"
            className="flex-1 px-4 py-2 rounded-lg btn-ghost-gx font-semibold border hover:bg-green-500/10 transition text-sm text-center"
          >
            Buy GX
          </Link>
          <Link
            href="/market?tab=sell"
            className="flex-1 px-4 py-2 rounded-lg btn-ghost-gx font-semibold border hover:bg-green-500/10 transition text-sm text-center"
          >
            Sell GX
          </Link>
        </div>
      </div>
    </div>
  )
}
