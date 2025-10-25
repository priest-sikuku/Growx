"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, CheckCircle, XCircle, AlertCircle, Star } from "lucide-react"
import { markPaymentSent, releaseCoins, cancelTrade } from "@/app/actions/p2p-actions"
import { toast } from "sonner"
import { TradeChat } from "@/components/trade-chat"
import { TradeCountdown } from "@/components/trade-countdown"
import { TraderRating } from "@/components/trader-rating"

interface Trade {
  id: string
  buyer_id: string
  seller_id: string
  zirox_amount: number
  total_kes: number
  price_per_zirox: number
  mpesa_number: string
  status: string
  created_at: string
  buyer: { id: string; full_name: string; average_rating: number; completed_trades: number }
  seller: { id: string; full_name: string; average_rating: number; completed_trades: number }
  advertisement: { ad_type: string }
}

export function TradesList({ trades, currentUserId }: { trades: Trade[]; currentUserId: string }) {
  const [loadingTradeId, setLoadingTradeId] = useState<string | null>(null)
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleMarkPaid = async (tradeId: string) => {
    setLoadingTradeId(tradeId)
    const result = await markPaymentSent(tradeId)
    setLoadingTradeId(null)

    if (result.success) {
      toast.success("Payment marked as sent. Waiting for seller to release coins.")
    } else {
      toast.error(result.error || "Failed to mark payment")
    }
  }

  const handleRelease = async (tradeId: string) => {
    setLoadingTradeId(tradeId)
    const result = await releaseCoins(tradeId)
    setLoadingTradeId(null)

    if (result.success) {
      toast.success("Coins released successfully!")
      setRefreshKey((k) => k + 1)
    } else {
      toast.error(result.error || "Failed to release coins")
    }
  }

  const handleCancel = async (tradeId: string) => {
    setLoadingTradeId(tradeId)
    const result = await cancelTrade(tradeId)
    setLoadingTradeId(null)

    if (result.success) {
      toast.success("Trade cancelled")
      setRefreshKey((k) => k + 1)
    } else {
      toast.error(result.error || "Failed to cancel trade")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending Payment
          </Badge>
        )
      case "paid":
        return (
          <Badge variant="default" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Payment Sent
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Cancelled
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const TraderInfo = ({
    trader,
  }: { trader: { id: string; full_name: string; average_rating: number; completed_trades: number } }) => (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{trader.full_name}</span>
      {trader.average_rating > 0 && (
        <div className="flex items-center gap-1 text-xs">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span>{trader.average_rating.toFixed(1)}</span>
          <span className="text-muted-foreground">({trader.completed_trades})</span>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {trades.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No trades yet</p>
      ) : (
        trades.map((trade) => {
          const isBuyer = trade.buyer_id === currentUserId
          const isSeller = trade.seller_id === currentUserId
          const counterparty = isBuyer ? trade.seller : trade.buyer

          return (
            <Card key={`${trade.id}-${refreshKey}`} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                {trade.status === "pending" && (
                  <TradeCountdown
                    tradeId={trade.id}
                    createdAt={trade.created_at}
                    status={trade.status}
                    onTradeExpired={() => setRefreshKey((k) => k + 1)}
                  />
                )}

                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    {getStatusBadge(trade.status)}
                    <p className="text-sm text-muted-foreground">{isBuyer ? "Buying from" : "Selling to"}</p>
                    <TraderInfo trader={counterparty} />
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{trade.zirox_amount.toFixed(6)} ZiroX</p>
                    <p className="text-sm text-muted-foreground">KES {trade.total_kes.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid gap-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price per ZiroX:</span>
                    <span>KES {trade.price_per_zirox.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">M-Pesa Number:</span>
                    <span className="font-mono">{trade.mpesa_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{new Date(trade.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {(trade.status === "pending" || trade.status === "paid") && (
                  <div className="pt-2 border-t border-border/50">
                    <TradeChat tradeId={trade.id} currentUserId={currentUserId} />
                  </div>
                )}

                {trade.status === "pending" && isBuyer && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleMarkPaid(trade.id)}
                      disabled={loadingTradeId === trade.id}
                      className="flex-1"
                      size="sm"
                    >
                      I've Paid
                    </Button>
                    <Button
                      onClick={() => handleCancel(trade.id)}
                      disabled={loadingTradeId === trade.id}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {trade.status === "paid" && isSeller && (
                  <Button
                    onClick={() => handleRelease(trade.id)}
                    disabled={loadingTradeId === trade.id}
                    className="w-full"
                    size="sm"
                  >
                    Release Coins
                  </Button>
                )}

                {trade.status === "pending" && isSeller && (
                  <Button
                    onClick={() => handleCancel(trade.id)}
                    disabled={loadingTradeId === trade.id}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Cancel Trade
                  </Button>
                )}

                {trade.status === "completed" && (
                  <div className="pt-2 border-t border-border/50">
                    <TraderRating
                      tradeId={trade.id}
                      ratedUserId={isBuyer ? trade.seller.id : trade.buyer.id}
                      ratedUserName={counterparty.full_name}
                      onRatingSubmitted={() => setRefreshKey((k) => k + 1)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
