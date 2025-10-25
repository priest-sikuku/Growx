"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Create a new advertisement
export async function createAdvertisement(data: {
  adType: "buy" | "sell"
  ziroxAmount: number
  pricePerZirox: number
  minOrder: number
  maxOrder: number
  mpesaNumber: string
}) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Validate minimum sell amount
    if (data.adType === "sell" && data.ziroxAmount < 200) {
      return { success: false, error: "Minimum sell amount is 200 ZiroX" }
    }

    // For sell ads, check if user has enough ZiroX
    if (data.adType === "sell") {
      const { data: profile } = await supabase.from("profiles").select("coins").eq("id", user.id).single()

      if (!profile || profile.coins < data.ziroxAmount) {
        return { success: false, error: "Insufficient ZiroX balance" }
      }
    }

    // Validate M-Pesa number format (Kenyan format: 254XXXXXXXXX or 07XXXXXXXX)
    const mpesaRegex = /^(254|0)[17]\d{8}$/
    if (!mpesaRegex.test(data.mpesaNumber.replace(/\s/g, ""))) {
      return { success: false, error: "Invalid M-Pesa number format" }
    }

    const { error } = await supabase.from("advertisements").insert({
      user_id: user.id,
      ad_type: data.adType,
      zirox_amount: data.ziroxAmount,
      price_per_zirox: data.pricePerZirox,
      min_order: data.minOrder,
      max_order: data.maxOrder,
      mpesa_number: data.mpesaNumber,
    })

    if (error) {
      console.error("[v0] Create ad error:", error)
      return { success: false, error: "Failed to create advertisement" }
    }

    revalidatePath("/dashboard/marketplace")
    return { success: true }
  } catch (error) {
    console.error("[v0] Create ad error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Initiate a trade from an advertisement
export async function initiateTrade(adId: string, ziroxAmount: number) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Get advertisement details
    const { data: ad, error: adError } = await supabase
      .from("advertisements")
      .select("*, profiles!advertisements_user_id_fkey(full_name)")
      .eq("id", adId)
      .single()

    if (adError || !ad) {
      return { success: false, error: "Advertisement not found" }
    }

    if (ad.status !== "active") {
      return { success: false, error: "Advertisement is no longer active" }
    }

    // Validate order amount
    if (ziroxAmount < ad.min_order || ziroxAmount > ad.max_order) {
      return { success: false, error: `Order must be between ${ad.min_order} and ${ad.max_order} ZiroX` }
    }

    if (ziroxAmount > ad.zirox_amount) {
      return { success: false, error: "Insufficient ZiroX available in advertisement" }
    }

    // Determine buyer and seller
    const buyerId = ad.ad_type === "buy" ? ad.user_id : user.id
    const sellerId = ad.ad_type === "sell" ? ad.user_id : user.id

    // For sell ads, lock seller's coins (escrow)
    if (ad.ad_type === "sell") {
      const { data: sellerProfile } = await supabase.from("profiles").select("coins").eq("id", sellerId).single()

      if (!sellerProfile || sellerProfile.coins < ziroxAmount) {
        return { success: false, error: "Seller has insufficient ZiroX" }
      }

      // Deduct coins from seller (escrow)
      await supabase
        .from("profiles")
        .update({ coins: sellerProfile.coins - ziroxAmount })
        .eq("id", sellerId)
    }

    const totalKes = ziroxAmount * ad.price_per_zirox

    // Create trade
    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .insert({
        ad_id: adId,
        buyer_id: buyerId,
        seller_id: sellerId,
        zirox_amount: ziroxAmount,
        total_kes: totalKes,
        price_per_zirox: ad.price_per_zirox,
        mpesa_number: ad.mpesa_number,
      })
      .select()
      .single()

    if (tradeError) {
      console.error("[v0] Create trade error:", tradeError)
      return { success: false, error: "Failed to create trade" }
    }

    revalidatePath("/dashboard/marketplace")
    revalidatePath("/dashboard/trades")
    return { success: true, tradeId: trade.id }
  } catch (error) {
    console.error("[v0] Initiate trade error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Mark payment as sent (buyer action)
export async function markPaymentSent(tradeId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const { data: trade } = await supabase.from("trades").select("*").eq("id", tradeId).single()

    if (!trade || trade.buyer_id !== user.id) {
      return { success: false, error: "Trade not found or unauthorized" }
    }

    if (trade.status !== "pending") {
      return { success: false, error: "Trade is not in pending status" }
    }

    const { error } = await supabase.from("trades").update({ status: "paid" }).eq("id", tradeId)

    if (error) {
      return { success: false, error: "Failed to update trade status" }
    }

    revalidatePath("/dashboard/trades")
    return { success: true }
  } catch (error) {
    console.error("[v0] Mark payment sent error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Release coins (seller action)
export async function releaseCoins(tradeId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const { data: trade } = await supabase.from("trades").select("*").eq("id", tradeId).single()

    if (!trade || trade.seller_id !== user.id) {
      return { success: false, error: "Trade not found or unauthorized" }
    }

    if (trade.status !== "paid") {
      return { success: false, error: "Payment not confirmed by buyer" }
    }

    // Get both buyer and seller profiles
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("coins, referred_by, referral_earnings, completed_trades")
      .eq("id", trade.buyer_id)
      .single()
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("coins, referred_by, referral_earnings, completed_trades")
      .eq("id", trade.seller_id)
      .single()

    if (!buyerProfile) {
      return { success: false, error: "Buyer profile not found" }
    }

    if (!sellerProfile) {
      return { success: false, error: "Seller profile not found" }
    }

    // Credit coins to buyer - coins were already deducted from seller during initiateTrade
    const newBuyerCoins = (buyerProfile.coins || 0) + trade.zirox_amount
    const { error: buyerUpdateError } = await supabase
      .from("profiles")
      .update({ coins: newBuyerCoins })
      .eq("id", trade.buyer_id)

    if (buyerUpdateError) {
      console.error("[v0] Failed to credit buyer coins:", buyerUpdateError)
      return { success: false, error: "Failed to credit coins to buyer" }
    }

    const commissionRate = 0.1 // 10%
    const transactionValue = trade.total_kes

    // Process buyer's referrer commission
    if (buyerProfile.referred_by) {
      const buyerCommission = transactionValue * commissionRate
      const { data: buyerReferrer } = await supabase
        .from("profiles")
        .select("referral_earnings")
        .eq("id", buyerProfile.referred_by)
        .single()

      if (buyerReferrer) {
        // Update referrer's earnings
        await supabase
          .from("profiles")
          .update({ referral_earnings: (buyerReferrer.referral_earnings || 0) + buyerCommission })
          .eq("id", buyerProfile.referred_by)

        // Record the commission transaction
        await supabase.from("referral_earnings").insert({
          referrer_id: buyerProfile.referred_by,
          referred_user_id: trade.buyer_id,
          trade_id: tradeId,
          commission_amount: buyerCommission,
          transaction_type: "trade_commission",
        })
      }
    }

    // Process seller's referrer commission
    if (sellerProfile.referred_by) {
      const sellerCommission = transactionValue * commissionRate
      const { data: sellerReferrer } = await supabase
        .from("profiles")
        .select("referral_earnings")
        .eq("id", sellerProfile.referred_by)
        .single()

      if (sellerReferrer) {
        // Update referrer's earnings
        await supabase
          .from("profiles")
          .update({ referral_earnings: (sellerReferrer.referral_earnings || 0) + sellerCommission })
          .eq("id", sellerProfile.referred_by)

        // Record the commission transaction
        await supabase.from("referral_earnings").insert({
          referrer_id: sellerProfile.referred_by,
          referred_user_id: trade.seller_id,
          trade_id: tradeId,
          commission_amount: sellerCommission,
          transaction_type: "trade_commission",
        })
      }
    }

    await supabase
      .from("profiles")
      .update({ completed_trades: (buyerProfile.completed_trades || 0) + 1 })
      .eq("id", trade.buyer_id)

    await supabase
      .from("profiles")
      .update({ completed_trades: (sellerProfile.completed_trades || 0) + 1 })
      .eq("id", trade.seller_id)

    // Update trade status
    await supabase.from("trades").update({ status: "completed" }).eq("id", tradeId)

    // Update advertisement
    const { data: ad } = await supabase.from("advertisements").select("*").eq("id", trade.ad_id).single()

    if (ad) {
      const remainingAmount = ad.zirox_amount - trade.zirox_amount
      if (remainingAmount <= 0) {
        await supabase.from("advertisements").update({ status: "completed" }).eq("id", trade.ad_id)
      } else {
        await supabase.from("advertisements").update({ zirox_amount: remainingAmount }).eq("id", trade.ad_id)
      }
    }

    revalidatePath("/dashboard/trades")
    revalidatePath("/dashboard/marketplace")
    return { success: true }
  } catch (error) {
    console.error("[v0] Release coins error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Cancel trade
export async function cancelTrade(tradeId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const { data: trade } = await supabase.from("trades").select("*").eq("id", tradeId).single()

    if (!trade || (trade.buyer_id !== user.id && trade.seller_id !== user.id)) {
      return { success: false, error: "Trade not found or unauthorized" }
    }

    if (trade.status === "completed") {
      return { success: false, error: "Cannot cancel completed trade" }
    }

    // Return escrowed coins to seller if applicable
    const { data: ad } = await supabase.from("advertisements").select("ad_type").eq("id", trade.ad_id).single()

    if (ad?.ad_type === "sell") {
      const { data: sellerProfile } = await supabase.from("profiles").select("coins").eq("id", trade.seller_id).single()

      if (sellerProfile) {
        await supabase
          .from("profiles")
          .update({ coins: sellerProfile.coins + trade.zirox_amount })
          .eq("id", trade.seller_id)
      }
    }

    await supabase.from("trades").update({ status: "cancelled" }).eq("id", tradeId)

    revalidatePath("/dashboard/trades")
    return { success: true }
  } catch (error) {
    console.error("[v0] Cancel trade error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
