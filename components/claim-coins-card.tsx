"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Coins, TrendingUp, AlertCircle, Clock } from "lucide-react"
import { claimCoins } from "@/app/actions/claim-coins"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface ClaimCoinsCardProps {
  initialCoins: number
  lastClaimTime: string | null
  referralCount: number
  globalClaimed: number
  globalMax: number
}

export function ClaimCoinsCard({
  initialCoins,
  lastClaimTime,
  referralCount,
  globalClaimed: initialGlobalClaimed,
  globalMax,
}: ClaimCoinsCardProps) {
  const router = useRouter()
  const [coins, setCoins] = useState(initialCoins)
  const [isClaiming, setIsClaiming] = useState(false)
  const [canClaim, setCanClaim] = useState(false)
  const [remainingTime, setRemainingTime] = useState("")
  const [progressPercentage, setProgressPercentage] = useState(0)
  const [globalClaimed, setGlobalClaimed] = useState(initialGlobalClaimed)
  const [globalLimitReached, setGlobalLimitReached] = useState(false)
  const [countdownDisplay, setCountdownDisplay] = useState("")

  const CLAIM_AMOUNT = 3

  useEffect(() => {
    if (globalClaimed >= globalMax) {
      setGlobalLimitReached(true)
      setCanClaim(false)
      return
    }

    const updateTimer = () => {
      if (!lastClaimTime) {
        setCanClaim(true)
        setRemainingTime("")
        setProgressPercentage(100)
        setCountdownDisplay("")
        return
      }

      const lastClaim = new Date(lastClaimTime).getTime()
      const now = Date.now()
      const cooldownMs = 3 * 60 * 60 * 1000 // 3 hours
      const elapsed = now - lastClaim

      if (elapsed >= cooldownMs) {
        setCanClaim(true)
        setRemainingTime("")
        setProgressPercentage(100)
        setCountdownDisplay("")
      } else {
        setCanClaim(false)
        const remaining = cooldownMs - elapsed
        const hours = Math.floor(remaining / (60 * 60 * 1000))
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000))
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000)
        setRemainingTime(`${hours}h ${minutes}m ${seconds}s`)
        setCountdownDisplay(`${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`)
        setProgressPercentage((elapsed / cooldownMs) * 100)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [lastClaimTime, globalClaimed, globalMax])

  const radius = 120
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference

  const handleClaim = async () => {
    setIsClaiming(true)
    try {
      const result = await claimCoins()

      if (result.success) {
        setCoins(result.newBalance!)
        setGlobalClaimed(result.globalClaimed!)
        toast.success(`Claimed ${result.claimedAmount} ZiroX!`, {
          description: `Your new balance is ${result.newBalance} ZiroX`,
        })
        router.refresh()
      } else {
        if (result.globalLimitReached) {
          setGlobalLimitReached(true)
          toast.error("Global supply exhausted", {
            description: "All 200,000 ZiroX have been claimed!",
          })
        } else {
          toast.error("Failed to claim ZiroX", {
            description: result.error,
          })
        }
      }
    } catch (error) {
      toast.error("An error occurred", {
        description: "Please try again later",
      })
    } finally {
      setIsClaiming(false)
    }
  }

  const globalPercentage = (globalClaimed / globalMax) * 100

  return (
    <Card className="border-border/50 shadow-lg">
      <CardContent className="p-8">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-full rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Global ZiroX Supply</span>
              <span className="text-sm font-bold">
                {globalClaimed.toLocaleString()} / {globalMax.toLocaleString()}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                style={{ width: `${globalPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(globalMax - globalClaimed).toLocaleString()} ZiroX remaining
            </p>
          </div>

          {globalLimitReached && (
            <div className="w-full rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="font-semibold">Global Supply Exhausted</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">All 200,000 ZiroX have been claimed by users.</p>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
            <div className="relative">
              <svg className="h-64 w-64 -rotate-90 transform">
                <circle
                  cx="128"
                  cy="128"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-muted/20"
                />
                <circle
                  cx="128"
                  cy="128"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ${
                    globalLimitReached ? "text-destructive" : canClaim ? "text-green-500" : "text-primary"
                  }`}
                  style={{
                    filter: globalLimitReached
                      ? "drop-shadow(0 0 8px rgb(239 68 68 / 0.6))"
                      : canClaim
                        ? "drop-shadow(0 0 8px rgb(34 197 94 / 0.6))"
                        : "drop-shadow(0 0 8px rgb(var(--primary) / 0.4))",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Coins
                  className={`h-12 w-12 mb-2 ${
                    globalLimitReached ? "text-destructive" : canClaim ? "text-green-500" : "text-primary"
                  }`}
                />
                {globalLimitReached ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-destructive">Supply Exhausted</p>
                    <p className="text-2xl font-bold text-destructive">0</p>
                    <p className="text-sm text-muted-foreground">ZiroX</p>
                  </div>
                ) : canClaim ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">Ready to claim</p>
                    <p className="text-3xl font-bold text-green-500">{CLAIM_AMOUNT}</p>
                    <p className="text-sm text-muted-foreground">ZiroX</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">Next claim in</p>
                    <p className="text-2xl font-bold">{remainingTime}</p>
                    <p className="text-xs text-muted-foreground mt-1">{Math.round(progressPercentage)}% ready</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Your Balance</p>
            <div className="flex items-baseline gap-2 justify-center">
              <span className="text-4xl font-bold tracking-tight">{coins.toLocaleString()}</span>
              <span className="text-muted-foreground">ZiroX</span>
            </div>
          </div>
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Claim Amount</span>
              </div>
              <span className="text-sm font-bold">{CLAIM_AMOUNT} ZiroX</span>
            </div>
            {referralCount > 0 && (
              <div className="rounded-lg bg-primary/10 p-3 text-sm">
                <p className="font-medium text-primary">
                  You have {referralCount} referral{referralCount !== 1 ? "s" : ""}!
                </p>
              </div>
            )}
          </div>
          <Button
            onClick={handleClaim}
            disabled={!canClaim || isClaiming || globalLimitReached}
            className="w-full"
            size="lg"
          >
            {isClaiming ? (
              <>
                <span className="animate-spin">⏳</span>
                Claiming...
              </>
            ) : globalLimitReached ? (
              <>
                <AlertCircle className="h-4 w-4" />
                Supply Exhausted
              </>
            ) : canClaim ? (
              <>
                <Coins className="h-4 w-4" />
                Claim {CLAIM_AMOUNT} ZiroX
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" />
                <span className="font-mono font-bold">{countdownDisplay}</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
