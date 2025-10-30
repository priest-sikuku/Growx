import { createClient } from "@/lib/supabase/server"

export async function getReferralData(userId: string) {
  const supabase = await createClient()

  const { data: referrals, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_id", userId)
    .eq("status", "active")

  if (error) throw error
  return referrals
}

export async function getReferralStats(userId: string) {
  const supabase = await createClient()

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("total_referrals, total_commission, commission_earned, referral_code")
    .eq("id", userId)
    .single()

  if (profileError) throw profileError

  const { data: referrals, error: referralsError } = await supabase
    .from("referrals")
    .select("total_trading_commission, total_claim_commission")
    .eq("referrer_id", userId)
    .eq("status", "active")

  if (referralsError) throw referralsError

  const totalTradingCommission = referrals?.reduce((sum, r) => sum + Number(r.total_trading_commission || 0), 0) || 0
  const totalClaimCommission = referrals?.reduce((sum, r) => sum + Number(r.total_claim_commission || 0), 0) || 0

  return {
    totalReferrals: profile?.total_referrals || 0,
    totalCommission: profile?.total_commission || profile?.commission_earned || 0,
    totalTradingCommission,
    totalClaimCommission,
    referralCode: profile?.referral_code || "",
  }
}

export async function addTradingCommission(referrerId: string, referredId: string, amount: number, tradeId: string) {
  const supabase = await createClient()

  const commission = amount * 0.02

  const { error } = await supabase.from("referral_commissions").insert({
    referrer_id: referrerId,
    referred_id: referredId,
    commission_type: "trading",
    amount: commission,
    source_id: tradeId,
    status: "completed",
  })

  if (error) throw error

  const { data: referral } = await supabase
    .from("referrals")
    .select("total_trading_commission")
    .eq("referrer_id", referrerId)
    .eq("referred_id", referredId)
    .single()

  if (referral) {
    await supabase
      .from("referrals")
      .update({
        total_trading_commission: Number(referral.total_trading_commission || 0) + commission,
        updated_at: new Date().toISOString(),
      })
      .eq("referrer_id", referrerId)
      .eq("referred_id", referredId)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("total_commission, commission_earned, total_mined")
    .eq("id", referrerId)
    .single()

  if (profile) {
    await supabase
      .from("profiles")
      .update({
        total_commission: Number(profile.total_commission || 0) + commission,
        commission_earned: Number(profile.commission_earned || 0) + commission,
        total_mined: Number(profile.total_mined || 0) + commission,
        updated_at: new Date().toISOString(),
      })
      .eq("id", referrerId)
  }

  return commission
}

export async function addClaimCommission(referrerId: string, referredId: string, claimAmount: number, coinId: string) {
  const supabase = await createClient()

  const commission = claimAmount * 0.02

  const { error } = await supabase.from("referral_commissions").insert({
    referrer_id: referrerId,
    referred_id: referredId,
    commission_type: "claim",
    amount: commission,
    source_id: coinId,
    status: "completed",
  })

  if (error) throw error

  const { data: referral } = await supabase
    .from("referrals")
    .select("total_claim_commission")
    .eq("referrer_id", referrerId)
    .eq("referred_id", referredId)
    .single()

  if (referral) {
    await supabase
      .from("referrals")
      .update({
        total_claim_commission: Number(referral.total_claim_commission || 0) + commission,
        updated_at: new Date().toISOString(),
      })
      .eq("referrer_id", referrerId)
      .eq("referred_id", referredId)
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("total_commission, commission_earned, total_mined")
    .eq("id", referrerId)
    .single()

  if (profile) {
    await supabase
      .from("profiles")
      .update({
        total_commission: Number(profile.total_commission || 0) + commission,
        commission_earned: Number(profile.commission_earned || 0) + commission,
        total_mined: Number(profile.total_mined || 0) + commission,
        updated_at: new Date().toISOString(),
      })
      .eq("id", referrerId)
  }

  return commission
}

export async function checkMaxSupply() {
  const supabase = await createClient()

  const { data, error } = await supabase.from("supply_tracking").select("*").single()

  if (error) throw error

  const totalSupply = Number(data?.total_supply || 300000)
  const minedSupply = Number(data?.mined_supply || 0)
  const remainingSupply = Number(data?.remaining_supply || 300000)

  return {
    totalSupply,
    minedSupply,
    remainingSupply,
    percentageUsed: (minedSupply / totalSupply) * 100,
  }
}
