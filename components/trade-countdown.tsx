"use client"

import { useState, useEffect } from "react"
import { AlertCircle, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cancelTrade } from "@/app/actions/p2p-actions"
import { toast } from "sonner"

export function TradeCountdown({
  tradeId,
  createdAt,
  status,
  onTradeExpired,
}: {
  tradeId: string
  createdAt: string
  status: string
  onTradeExpired: () => void
}) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const updateCountdown = () => {
      const createdTime = new Date(createdAt).getTime()
      const now = Date.now()
      const twentyMinutesMs = 20 * 60 * 1000
      const remaining = twentyMinutesMs - (now - createdTime)

      if (remaining <= 0) {
        setIsExpired(true)
        setTimeRemaining(0)
        onTradeExpired()
      } else {
        setTimeRemaining(remaining)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [createdAt, onTradeExpired])

  if (status !== "pending" || timeRemaining === null) {
    return null
  }

  const minutes = Math.floor(timeRemaining / 60000)
  const seconds = Math.floor((timeRemaining % 60000) / 1000)

  const handleAutoCancel = async () => {
    const result = await cancelTrade(tradeId)
    if (result.success) {
      toast.success("Trade auto-cancelled due to timeout")
      onTradeExpired()
    }
  }

  if (isExpired) {
    return (
      <Alert variant="destructive" className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Trade expired after 20 minutes of inactivity</span>
          <Button onClick={handleAutoCancel} size="sm" variant="destructive" className="ml-2">
            Cancel Trade
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
      <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
        Trade will auto-cancel in {minutes}m {seconds}s if payment is not confirmed
      </AlertDescription>
    </Alert>
  )
}
