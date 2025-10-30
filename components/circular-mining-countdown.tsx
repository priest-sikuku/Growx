"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Zap, Sparkles } from "lucide-react"

interface CircularMiningCountdownProps {
  secondsRemaining: number
  onMine: () => void
  isMining: boolean
  canMine: boolean
}

export function CircularMiningCountdown({ secondsRemaining, onMine, isMining, canMine }: CircularMiningCountdownProps) {
  const [displaySeconds, setDisplaySeconds] = useState(secondsRemaining)

  useEffect(() => {
    setDisplaySeconds(secondsRemaining)
  }, [secondsRemaining])

  // Calculate progress (0 to 1)
  const totalSeconds = 10800 // 3 hours
  const progress = displaySeconds > 0 ? 1 - displaySeconds / totalSeconds : 1

  // Format time as hh:mm:ss
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  // Circle dimensions
  const size = 240
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Circular Progress */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={canMine ? "#10b981" : "#22c55e"}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            initial={{ strokeDashoffset: circumference }}
            animate={{
              strokeDashoffset,
              stroke: canMine ? ["#10b981", "#22c55e", "#10b981"] : "#22c55e",
            }}
            transition={{
              strokeDashoffset: { duration: 1, ease: "easeInOut" },
              stroke: canMine ? { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" } : {},
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {canMine ? (
            <motion.button
              onClick={onMine}
              disabled={isMining}
              className="flex flex-col items-center justify-center gap-2 disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={
                canMine && !isMining
                  ? {
                      scale: [1, 1.1, 1],
                    }
                  : {}
              }
              transition={{
                scale: { duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
              }}
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
              >
                <Sparkles className="w-12 h-12 text-green-400" />
              </motion.div>
              <span className="text-2xl font-bold text-green-400">{isMining ? "Mining..." : "Mine Now"}</span>
              <span className="text-sm text-gray-400">Click to claim</span>
            </motion.button>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <Zap className="w-10 h-10 text-gray-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Next mine in</span>
              <span className="text-3xl font-bold text-white font-mono">{formatTime(displaySeconds)}</span>
              <span className="text-xs text-gray-400">{Math.round(progress * 100)}% complete</span>
            </div>
          )}
        </div>
      </div>

      {/* Info text */}
      <p className="text-sm text-gray-400 mt-6 text-center max-w-xs">
        {canMine
          ? "Your mining cycle is complete! Click to claim your 2.50 GX reward."
          : "Mining cycles run every 3 hours. Your reward will be ready soon."}
      </p>
    </div>
  )
}
