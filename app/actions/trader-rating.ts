"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function submitTraderRating(data: {
  tradeId: string
  ratedUserId: string
  rating: number
  comment?: string
}) {
  try {
    console.log("[v0] Rating submission started with data:", {
      tradeId: data.tradeId,
      ratedUserId: data.ratedUserId,
      rating: data.rating,
    })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] User not authenticated")
      return { success: false, error: "Not authenticated" }
    }

    console.log("[v0] Current user ID:", user.id)
    console.log("[v0] Rated user ID:", data.ratedUserId)
    console.log("[v0] Rated user ID type:", typeof data.ratedUserId)
    console.log("[v0] Rated user ID is null/undefined:", data.ratedUserId === null || data.ratedUserId === undefined)

    if (data.rating < 1 || data.rating > 5) {
      return { success: false, error: "Rating must be between 1 and 5" }
    }

    // Verify trade exists and user is part of it
    const { data: trade, error: tradeError } = await supabase.from("trades").select("*").eq("id", data.tradeId).single()

    if (tradeError || !trade) {
      console.error("[v0] Trade fetch error:", tradeError)
      return { success: false, error: "Trade not found" }
    }

    console.log("[v0] Trade found - buyer_id:", trade.buyer_id, "seller_id:", trade.seller_id)

    if (trade.buyer_id !== user.id && trade.seller_id !== user.id) {
      return { success: false, error: "Unauthorized" }
    }

    if (trade.status !== "completed") {
      return { success: false, error: "Can only rate completed trades" }
    }

    const { data: existingRating, error: existingError } = await supabase
      .from("trader_ratings")
      .select("id")
      .eq("rater_id", user.id)
      .eq("trade_id", data.tradeId)
      .maybeSingle()

    if (existingRating) {
      return { success: false, error: "You have already rated this trade" }
    }

    if (!data.ratedUserId || data.ratedUserId.trim() === "") {
      console.error("[v0] Invalid ratedUserId:", data.ratedUserId)
      return { success: false, error: "Invalid rated user ID" }
    }

    console.log("[v0] Attempting to insert rating with:", {
      rater_id: user.id,
      rated_user_id: data.ratedUserId,
      trade_id: data.tradeId,
      rating: data.rating,
    })

    const { error: insertError } = await supabase.from("trader_ratings").insert({
      rater_id: user.id,
      rated_user_id: data.ratedUserId,
      trade_id: data.tradeId,
      rating: data.rating,
      comment: data.comment || null,
    })

    if (insertError) {
      console.error("[v0] Rating insert error:", insertError)
      return { success: false, error: "Failed to submit rating: " + insertError.message }
    }

    console.log("[v0] Rating inserted successfully")

    const { data: ratings, error: ratingsError } = await supabase
      .from("trader_ratings")
      .select("rating")
      .eq("rated_user_id", data.ratedUserId)

    if (ratingsError) {
      console.error("[v0] Ratings fetch error:", ratingsError)
      return { success: false, error: "Failed to calculate average rating" }
    }

    if (ratings && ratings.length > 0) {
      const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          average_rating: Number.parseFloat(averageRating.toFixed(2)),
          total_ratings: ratings.length,
        })
        .eq("id", data.ratedUserId)

      if (updateError) {
        console.error("[v0] Profile update error:", updateError)
        return { success: false, error: "Failed to update trader rating" }
      }
    }

    revalidatePath("/dashboard/trades")
    revalidatePath("/dashboard/profile")
    console.log("[v0] Rating submission completed successfully")
    return { success: true }
  } catch (error) {
    console.error("[v0] Submit rating error:", error)
    return { success: false, error: "An unexpected error occurred: " + String(error) }
  }
}

export async function getTraderRating(userId: string) {
  try {
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("average_rating, total_ratings, completed_trades")
      .eq("id", userId)
      .single()

    if (error) {
      console.error("[v0] Get rating error:", error)
      return { average_rating: 0, total_ratings: 0, completed_trades: 0 }
    }

    return profile || { average_rating: 0, total_ratings: 0, completed_trades: 0 }
  } catch (error) {
    console.error("[v0] Get rating error:", error)
    return { average_rating: 0, total_ratings: 0, completed_trades: 0 }
  }
}
