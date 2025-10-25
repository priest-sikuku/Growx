"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const FIXED_ZIROX_PRICE = 1.0 // Fixed price in KES

export async function buyZiroX(ziroxAmount: number) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const pricePerZiroX = FIXED_ZIROX_PRICE
    const kesRequired = ziroxAmount * pricePerZiroX

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("coins, kes_balance")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: "Failed to fetch profile" }
    }

    // Check if user has enough KES
    if (profile.kes_balance < kesRequired) {
      return { success: false, error: "Insufficient KES balance" }
    }

    // Update profile: deduct KES, add ZiroX
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        kes_balance: profile.kes_balance - kesRequired,
        coins: profile.coins + ziroxAmount,
      })
      .eq("id", user.id)

    if (updateError) {
      return { success: false, error: "Failed to complete purchase" }
    }

    // Record transaction
    await supabase.from("transactions").insert({
      user_id: user.id,
      transaction_type: "buy",
      zirox_amount: ziroxAmount,
      kes_amount: kesRequired,
      price_per_zirox: pricePerZiroX,
    })

    revalidatePath("/dashboard")
    return { success: true, kesSpent: kesRequired, pricePerZiroX }
  } catch (error) {
    console.error("[v0] Buy ZiroX error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function sellZiroX(ziroxAmount: number) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const pricePerZiroX = FIXED_ZIROX_PRICE
    const kesReceived = ziroxAmount * pricePerZiroX

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("coins, kes_balance")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return { success: false, error: "Failed to fetch profile" }
    }

    // Check if user has enough ZiroX
    if (profile.coins < ziroxAmount) {
      return { success: false, error: "Insufficient ZiroX balance" }
    }

    // Update profile: add KES, deduct ZiroX
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        kes_balance: profile.kes_balance + kesReceived,
        coins: profile.coins - ziroxAmount,
      })
      .eq("id", user.id)

    if (updateError) {
      return { success: false, error: "Failed to complete sale" }
    }

    // Record transaction
    await supabase.from("transactions").insert({
      user_id: user.id,
      transaction_type: "sell",
      zirox_amount: ziroxAmount,
      kes_amount: kesReceived,
      price_per_zirox: pricePerZiroX,
    })

    revalidatePath("/dashboard")
    return { success: true, kesReceived, pricePerZiroX }
  } catch (error) {
    console.error("[v0] Sell ZiroX error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
