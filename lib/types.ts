export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  referral_code: string
  referred_by: string | null
  coins: number
  last_claim_time: string | null
  total_claimed: number
  created_at: string
  updated_at: string
  referral_earnings?: number
}

export interface User {
  id: string
  email: string
  role: "user" | "admin"
  created_at: string
}
