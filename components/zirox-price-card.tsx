"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getZiroxPrice } from "@/app/actions/zirox-price"
import { TrendingUp, TrendingDown } from "lucide-react"

interface PriceData {
  currentPrice: number
  previousPrice: number
  changePercent: number
  isGreen: boolean
}

export function ZiroxPriceCard() {
  const [priceData, setPriceData] = useState<PriceData>({
    currentPrice: 1.0,
    previousPrice: 1.0,
    changePercent: 0,
    isGreen: true,
  })
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Fetch price immediately
    const fetchPrice = async () => {
      const data = await getZiroxPrice()
      setPriceData(data)
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 300)
    }

    fetchPrice()

    // Update price every 3 seconds
    const interval = setInterval(fetchPrice, 3000)

    return () => clearInterval(interval)
  }, [])

  const bgColor = priceData.isGreen ? "bg-green-500/10" : "bg-red-500/10"
  const textColor = priceData.isGreen ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
  const borderColor = priceData.isGreen
    ? "border-green-200 dark:border-green-800"
    : "border-red-200 dark:border-red-800"

  return (
    <Card
      className={`border-border/50 shadow-lg overflow-hidden transition-all duration-300 ${bgColor} ${borderColor}`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">ZiroX Price</CardTitle>
        {priceData.isGreen ? (
          <TrendingUp className={`h-5 w-5 ${textColor}`} />
        ) : (
          <TrendingDown className={`h-5 w-5 ${textColor}`} />
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`transition-all duration-300 ${isAnimating ? "scale-110" : "scale-100"}`}>
          <div className="text-4xl font-bold tracking-tight">KES {priceData.currentPrice.toFixed(2)}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${textColor}`}>
            {priceData.isGreen ? "+" : ""}
            {priceData.changePercent.toFixed(2)}%
          </span>
          <span className="text-xs text-muted-foreground">from {priceData.previousPrice.toFixed(2)}</span>
        </div>
        <p className="text-xs text-muted-foreground">Updates every 3 seconds • Based on supply, demand & activity</p>
      </CardContent>
    </Card>
  )
}
