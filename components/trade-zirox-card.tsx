"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingCart, TrendingUp, Wallet } from "lucide-react"
import { buyZiroX, sellZiroX } from "@/app/actions/trade-zirox"
import { toast } from "sonner"

interface TradeZiroXCardProps {
  currentPrice: number
  ziroxBalance: number
  kesBalance: number
}

export function TradeZiroXCard({ currentPrice, ziroxBalance, kesBalance }: TradeZiroXCardProps) {
  const [buyAmount, setBuyAmount] = useState("")
  const [sellAmount, setSellAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleBuy = async () => {
    const amount = Number.parseFloat(buyAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    const totalCost = amount * currentPrice
    if (totalCost > kesBalance) {
      toast.error("Insufficient KES balance")
      return
    }

    setIsLoading(true)
    const result = await buyZiroX(amount)
    setIsLoading(false)

    if (result.success) {
      toast.success(`Successfully bought ${amount} ZiroX for KES ${result.kesSpent?.toFixed(2)}`)
      setBuyAmount("")
    } else {
      toast.error(result.error || "Failed to buy ZiroX")
    }
  }

  const handleSell = async () => {
    const amount = Number.parseFloat(sellAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    if (amount > ziroxBalance) {
      toast.error("Insufficient ZiroX balance")
      return
    }

    setIsLoading(true)
    const result = await sellZiroX(amount)
    setIsLoading(false)

    if (result.success) {
      toast.success(`Successfully sold ${amount} ZiroX for KES ${result.kesReceived?.toFixed(2)}`)
      setSellAmount("")
    } else {
      toast.error(result.error || "Failed to sell ZiroX")
    }
  }

  const buyTotal = Number.parseFloat(buyAmount) * currentPrice || 0
  const sellTotal = Number.parseFloat(sellAmount) * currentPrice || 0

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Trade ZiroX
        </CardTitle>
        <CardDescription>Buy or sell ZiroX at current market price</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Balances */}
        <div className="mb-6 grid gap-3 rounded-lg bg-muted/50 p-4 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">KES Balance</p>
              <p className="text-lg font-semibold">KES {kesBalance.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">ZiroX Balance</p>
              <p className="text-lg font-semibold">{ziroxBalance.toFixed(6)} ZiroX</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buy-amount">Amount (ZiroX)</Label>
              <Input
                id="buy-amount"
                type="number"
                placeholder="0.00"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                step="0.000001"
                min="0"
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per ZiroX</span>
                <span className="font-medium">KES {currentPrice.toFixed(6)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Cost</span>
                <span className="font-semibold">KES {buyTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button onClick={handleBuy} disabled={isLoading || !buyAmount} className="w-full" size="lg">
              {isLoading ? "Processing..." : "Buy ZiroX"}
            </Button>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sell-amount">Amount (ZiroX)</Label>
              <Input
                id="sell-amount"
                type="number"
                placeholder="0.00"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                step="0.000001"
                min="0"
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per ZiroX</span>
                <span className="font-medium">KES {currentPrice.toFixed(6)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You'll Receive</span>
                <span className="font-semibold">KES {sellTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={handleSell}
              disabled={isLoading || !sellAmount}
              className="w-full bg-transparent"
              size="lg"
              variant="outline"
            >
              {isLoading ? "Processing..." : "Sell ZiroX"}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
