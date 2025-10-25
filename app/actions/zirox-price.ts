"use server"

import { createClient } from "@/lib/supabase/server"

interface PriceData {
  currentPrice: number
  previousPrice: number
  changePercent: number
  isGreen: boolean
}

export async function getZiroxPrice(): Promise<PriceData> {
  const supabase = await createClient()

  try {
    // Get system metrics
    const [globalStatsResult, profilesResult, tradesResult, priceHistoryResult] = await Promise.all([
      supabase.from("global_stats").select("total_claimed, max_supply").single(),
      supabase.from("profiles").select("id", { count: "exact" }),
      supabase.from("trades").select("id", { count: "exact" }).eq("status", "completed"),
      supabase.from("zirox_price_history").select("price").order("created_at", { ascending: false }).limit(1).single(),
    ])

    const globalStats = globalStatsResult.data || { total_claimed: 0, max_supply: 200000 }
    const totalUsers = profilesResult.count || 1
    const completedTrades = tradesResult.count || 0
    const previousPrice = priceHistoryResult.data?.price || 1.0

    // Base formula: Price = Base * (Supply Factor) * (Demand Factor) * (Activity Factor)

    // 1. Supply Factor: How much of max supply has been claimed (0.5 to 2.0)
    const supplyUtilization = globalStats.total_claimed / globalStats.max_supply
    const supplyFactor = 1 + supplyUtilization * 1.5 // 1.0 to 2.5 as supply increases

    // 2. Demand Factor: Based on active users and trades (1.0 to 1.5)
    const activeUsersFactor = Math.min(totalUsers / 100, 1.5) // Scales with users, caps at 1.5
    const tradeActivityFactor = Math.min(completedTrades / 50, 0.5) // Trade activity adds up to 0.5

    // 3. Daily volatility with seeded randomness for consistency
    const now = new Date()
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
    const seed = dayOfYear * 12345
    const random = Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000)

    // 75% chance of increase (to achieve 5% average), 25% chance of decrease
    let dailyVolatility = 1.0
    if (random < 0.75) {
      // Increase: 1% to 10% (weighted towards higher increases)
      dailyVolatility = 1 + 0.01 + random * 0.09
    } else {
      // Decrease: -10% to 0% (to balance the 5% average)
      dailyVolatility = 1 - (random - 0.75) * 0.4
    }

    // 4. Hourly micro-fluctuation (±0.1% for more active movement)
    const hour = now.getHours()
    const minute = now.getMinutes()
    const second = now.getSeconds()
    const microSeed = hour * 3600 + minute * 60 + second
    const microRandom = Math.sin(microSeed) * 10000 - Math.floor(Math.sin(microSeed) * 10000)
    const microFluctuation = 1 + (microRandom - 0.5) * 0.002

    // Calculate new price
    const basePrice = 1.0
    const demandFactor = 1 + activeUsersFactor + tradeActivityFactor
    const newPrice = basePrice * supplyFactor * demandFactor * dailyVolatility * microFluctuation

    // Calculate percentage change
    const changePercent = ((newPrice - previousPrice) / previousPrice) * 100

    // Store the new price (rounded to 2 decimal places)
    const roundedPrice = Math.round(newPrice * 100) / 100
    await supabase.from("zirox_price_history").insert({
      price: roundedPrice,
      change_percent: Number.parseFloat(changePercent.toFixed(2)),
    })

    // Update daily closing price if it's a new day
    const today = new Date().toISOString().split("T")[0]
    const { data: todayPrice } = await supabase.from("zirox_daily_prices").select("*").eq("date", today).single()

    if (todayPrice) {
      // Update closing price
      const dailyChange = ((roundedPrice - todayPrice.opening_price) / todayPrice.opening_price) * 100
      await supabase
        .from("zirox_daily_prices")
        .update({
          closing_price: roundedPrice,
          daily_change_percent: Number.parseFloat(dailyChange.toFixed(2)),
        })
        .eq("date", today)
    } else {
      // Create new daily record
      await supabase.from("zirox_daily_prices").insert({
        date: today,
        opening_price: roundedPrice,
        closing_price: roundedPrice,
        daily_change_percent: 0,
      })
    }

    return {
      currentPrice: roundedPrice,
      previousPrice: Number.parseFloat(previousPrice.toFixed(2)),
      changePercent: Number.parseFloat(changePercent.toFixed(2)),
      isGreen: changePercent >= 0,
    }
  } catch (error) {
    console.error("Error getting ZiroX price:", error)
    return {
      currentPrice: 1.0,
      previousPrice: 1.0,
      changePercent: 0,
      isGreen: true,
    }
  }
}
