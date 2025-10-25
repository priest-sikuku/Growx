"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const CLAIM_AMOUNT = 3
const COOLDOWN_HOURS = 3

export async function claimCoins() {
  console.log("[v0] claimCoins action called")
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  console.log("[v0] User:", user?.id, "Error:", userError)

  if (userError || !user) {
    return { success: false, error: "Not authenticated" }
  }

  const { data: globalStats, error: globalStatsError } = await supabase
    .from("global_stats")
    .select("*")
    .eq("id", 1)
    .single()

  console.log("[v0] Global stats:", globalStats, "Error:", globalStatsError)

  if (!globalStats) {
    return { success: false, error: "System error - global stats not found" }
  }

  if (globalStats.total_claimed >= globalStats.max_supply) {
    return {
      success: false,
      error: "Global supply limit reached",
      globalLimitReached: true,
    }
  }

  if (globalStats.total_claimed + CLAIM_AMOUNT > globalStats.max_supply) {
    return {
      success: false,
      error: "Not enough ZiroX remaining in global supply",
      globalLimitReached: true,
    }
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  console.log("[v0] Profile:", profile, "Error:", profileError)

  if (profileError || !profile) {
    return { success: false, error: "Profile not found" }
  }

  if (profile.last_claim_time) {
    const lastClaimTime = new Date(profile.last_claim_time).getTime()
    const now = Date.now()
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000
    const timeSinceLastClaim = now - lastClaimTime

    console.log(
      "[v0] Last claim:",
      lastClaimTime,
      "Now:",
      now,
      "Time since:",
      timeSinceLastClaim,
      "Cooldown:",
      cooldownMs,
    )

    if (timeSinceLastClaim < cooldownMs) {
      const remainingMs = cooldownMs - timeSinceLastClaim
      return {
        success: false,
        error: "Cooldown active",
        remainingMs,
      }
    }
  }

  console.log("[v0] Calling claim_coins_with_limit RPC")
  const { data: result, error: claimError } = await supabase.rpc("claim_coins_with_limit", {
    user_id: user.id,
    claim_amount: CLAIM_AMOUNT,
  })

  console.log("[v0] RPC result:", result, "Error:", claimError)

  if (claimError || !result) {
    console.log("[v0] RPC failed:", claimError)
    return { success: false, error: claimError?.message || "Failed to claim ZiroX" }
  }

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      globalLimitReached: result.error.includes("limit"),
    }
  }

  if (profile.referred_by) {
    // Get current BTC price to calculate KES value
    const { data: priceData } = await supabase
      .from("btc_price_history")
      .select("price_kes")
      .order("timestamp", { ascending: false })
      .limit(1)
      .single()

    if (priceData) {
      // Calculate 5% commission on the claimed amount
      const claimCommissionRate = 0.05 // 5%
      const ziroxValueInKes = CLAIM_AMOUNT * priceData.price_kes
      const claimCommission = ziroxValueInKes * claimCommissionRate

      const { data: referrer } = await supabase
        .from("profiles")
        .select("coins, referral_earnings")
        .eq("id", profile.referred_by)
        .single()

      if (referrer) {
        // Add 0.3 ZiroX to referrer's wallet
        const referrerBonus = 0.3 // 0.3 ZiroX per claim
        await supabase
          .from("profiles")
          .update({
            coins: (referrer.coins || 0) + referrerBonus,
            referral_earnings: (referrer.referral_earnings || 0) + referrerBonus,
          })
          .eq("id", profile.referred_by)

        // Record the commission transaction
        await supabase.from("referral_earnings").insert({
          referrer_id: profile.referred_by,
          referred_user_id: user.id,
          commission_amount: referrerBonus,
          transaction_type: "claim_commission",
        })
      }
    }
  }

  revalidatePath("/dashboard")

  console.log("[v0] Claim successful!")
  return {
    success: true,
    claimedAmount: result.claimed_amount,
    newBalance: result.new_balance,
    globalClaimed: result.global_claimed,
    globalRemaining: result.global_remaining,
  }
}

export async function getClaimStatus() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { canClaim: false, remainingMs: 0, claimAmount: CLAIM_AMOUNT, globalLimitReached: false }
  }

  const { data: globalStats } = await supabase.from("global_stats").select("*").eq("id", 1).single()

  if (!globalStats || globalStats.total_claimed >= globalStats.max_supply) {
    return {
      canClaim: false,
      remainingMs: 0,
      claimAmount: CLAIM_AMOUNT,
      globalLimitReached: true,
      globalClaimed: globalStats?.total_claimed || 0,
      globalMax: globalStats?.max_supply || 200000,
    }
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    return { canClaim: false, remainingMs: 0, claimAmount: CLAIM_AMOUNT, globalLimitReached: false }
  }

  if (!profile.last_claim_time) {
    return {
      canClaim: true,
      remainingMs: 0,
      claimAmount: CLAIM_AMOUNT,
      globalLimitReached: false,
      globalClaimed: globalStats.total_claimed,
      globalMax: globalStats.max_supply,
    }
  }

  const lastClaimTime = new Date(profile.last_claim_time).getTime()
  const now = Date.now()
  const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000
  const timeSinceLastClaim = now - lastClaimTime

  if (timeSinceLastClaim >= cooldownMs) {
    return {
      canClaim: true,
      remainingMs: 0,
      claimAmount: CLAIM_AMOUNT,
      globalLimitReached: false,
      globalClaimed: globalStats.total_claimed,
      globalMax: globalStats.max_supply,
    }
  }

  return {
    canClaim: false,
    remainingMs: cooldownMs - timeSinceLastClaim,
    claimAmount: CLAIM_AMOUNT,
    globalLimitReached: false,
    globalClaimed: globalStats.total_claimed,
    globalMax: globalStats.max_supply,
  }
}
