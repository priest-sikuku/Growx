"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function sendTradeMessage(tradeId: string, message: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Verify user is part of the trade
    const { data: trade } = await supabase.from("trades").select("*").eq("id", tradeId).single()

    if (!trade || (trade.buyer_id !== user.id && trade.seller_id !== user.id)) {
      return { success: false, error: "Unauthorized" }
    }

    // Insert message
    const { error } = await supabase.from("trade_messages").insert({
      trade_id: tradeId,
      sender_id: user.id,
      message: message.trim(),
    })

    if (error) {
      return { success: false, error: "Failed to send message" }
    }

    revalidatePath(`/dashboard/trades`)
    return { success: true }
  } catch (error) {
    console.error("[v0] Send message error:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function getTradeMessages(tradeId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, messages: [], error: "Not authenticated" }
    }

    // Verify user is part of the trade
    const { data: trade } = await supabase.from("trades").select("*").eq("id", tradeId).single()

    if (!trade || (trade.buyer_id !== user.id && trade.seller_id !== user.id)) {
      return { success: false, messages: [], error: "Unauthorized" }
    }

    // Get messages
    const { data: messages, error } = await supabase
      .from("trade_messages")
      .select("*, sender:profiles(full_name)")
      .eq("trade_id", tradeId)
      .order("created_at", { ascending: true })

    if (error) {
      return { success: false, messages: [], error: "Failed to fetch messages" }
    }

    return { success: true, messages: messages || [] }
  } catch (error) {
    console.error("[v0] Get messages error:", error)
    return { success: false, messages: [], error: "An unexpected error occurred" }
  }
}
