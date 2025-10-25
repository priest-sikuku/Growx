"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TrendingUp, TrendingDown, User } from "lucide-react"
import { initiateTrade } from "@/app/actions/p2p-actions"
import { toast } from "sonner"

interface Advertisement {
  id: string
  user_id: string
  ad_type: "buy" | "sell"
  zirox_amount: number
  price_per_zirox: number
  min_order: number
  max_order: number
  mpesa_number: string
  profiles: { full_name: string; referral_code: string }
}

export function MarketplaceList({
  advertisements,
  currentUserId,
  userCoins,
}: {
  advertisements: Advertisement[]
  currentUserId: string
  userCoins: number
}) {
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null)
  const [tradeAmount, setTradeAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleTrade = async () => {
    if (!selectedAd) return

    const amount = Number.parseFloat(tradeAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    setIsLoading(true)
    const result = await initiateTrade(selectedAd.id, amount)
    setIsLoading(false)

    if (result.success) {
      toast.success("Trade initiated successfully! Check your trades page.")
      setSelectedAd(null)
      setTradeAmount("")
    } else {
      toast.error(result.error || "Failed to initiate trade")
    }
  }

  const totalCost = selectedAd ? Number.parseFloat(tradeAmount || "0") * selectedAd.price_per_zirox : 0

  return (
    <>
      <div className="space-y-4">
        {advertisements.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No active advertisements at the moment</p>
        ) : (
          advertisements.map((ad) => (
            <Card key={ad.id} className="border-border/50 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={ad.ad_type === "buy" ? "default" : "secondary"} className="gap-1 flex-shrink-0">
                        {ad.ad_type === "buy" ? (
                          <>
                            <TrendingUp className="h-3 w-3" />
                            Buying
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-3 w-3" />
                            Selling
                          </>
                        )}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1 flex-shrink-0">
                        <User className="h-3 w-3" />
                        {ad.profiles.full_name || "Anonymous"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                      <div className="min-w-0">
                        <span className="text-muted-foreground block text-xs">Amount:</span>
                        <span className="font-medium truncate">{ad.zirox_amount.toFixed(2)} ZiroX</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground block text-xs">Price:</span>
                        <span className="font-medium truncate">KES {ad.price_per_zirox.toFixed(2)}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground block text-xs">Limits:</span>
                        <span className="font-medium truncate text-xs">
                          {ad.min_order} - {ad.max_order}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => setSelectedAd(ad)}
                    disabled={ad.user_id === currentUserId}
                    variant={ad.ad_type === "buy" ? "default" : "outline"}
                    className="w-full sm:w-auto flex-shrink-0"
                    size="sm"
                  >
                    {ad.ad_type === "buy" ? "Sell" : "Buy"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selectedAd} onOpenChange={() => setSelectedAd(null)}>
        <DialogContent className="w-full max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>{selectedAd?.ad_type === "buy" ? "Sell ZiroX" : "Buy ZiroX"}</DialogTitle>
            <DialogDescription>
              {selectedAd?.ad_type === "buy"
                ? "Enter the amount of ZiroX you want to sell"
                : "Enter the amount of ZiroX you want to buy"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (ZiroX)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                step="0.000001"
                min={selectedAd?.min_order}
                max={selectedAd?.max_order}
              />
              <p className="text-xs text-muted-foreground">
                Min: {selectedAd?.min_order} - Max: {selectedAd?.max_order} ZiroX
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per ZiroX</span>
                <span className="font-medium">KES {selectedAd?.price_per_zirox.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">KES {totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium">M-Pesa: {selectedAd?.mpesa_number}</span>
              </div>
            </div>

            <Button onClick={handleTrade} disabled={isLoading || !tradeAmount} className="w-full">
              {isLoading ? "Processing..." : "Initiate Trade"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
