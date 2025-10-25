"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateSystemSetting(key: string, value: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== "admin") {
    return { success: false, error: "Unauthorized" }
  }

  const { error } = await supabase
    .from("system_settings")
    .update({ setting_value: value, updated_at: new Date().toISOString() })
    .eq("setting_key", key)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function updateUserCoins(userId: string, coins: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== "admin") {
    return { success: false, error: "Unauthorized" }
  }

  const { error } = await supabase.from("profiles").update({ coins }).eq("id", userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}

export async function resetUserCooldown(userId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.role !== "admin") {
    return { success: false, error: "Unauthorized" }
  }

  const { error } = await supabase.from("profiles").update({ last_claim_time: null }).eq("id", userId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin")
  return { success: true }
}
