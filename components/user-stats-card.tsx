"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Users, DollarSign, TrendingUp, Award, Settings, Package } from "lucide-react"
import Link from "next/link"

interface UserStats {
  total_referrals: number
  commission_earned: number
  rating: number
  total_roi: number
}

interface SupplyData {
  remaining_supply: number
  total_supply: number
}

export function UserStatsCard() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [supply, setSupply] = useState<SupplyData | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchUserStats()
    fetchSupply()
  }, [])

  const fetchUserStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.from("user_stats").select("*").eq("user_id", user.id).single()

      if (error) {
        console.error("[v0] Error fetching user stats:", error)
        return
      }

      setStats(data)
    } catch (error) {
      console.error("[v0] Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSupply = async () => {
    try {
      const { data, error } = await supabase.from("gx_supply").select("*").single()

      if (error) {
        console.error("[v0] Error fetching supply:", error)
        return
      }

      setSupply(data)
    } catch (error) {
      console.error("[v0] Error:", error)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-8 rounded-2xl border border-white/5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/5 rounded w-1/3"></div>
          <div className="h-20 bg-white/5 rounded"></div>
          <div className="h-20 bg-white/5 rounded"></div>
        </div>
      </div>
    )
  }

  const roiColor = (stats?.total_roi ?? 0) >= 0 ? "text-green-400" : "text-red-400"
  const roiSign = (stats?.total_roi ?? 0) >= 0 ? "+" : ""

  return (
    <div className="glass-card p-8 rounded-2xl border border-white/5">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Your Stats</h2>
        <Link
          href="/dashboard/settings"
          className="p-2 hover:bg-white/5 rounded-lg transition"
          title="Account Settings"
        >
          <Settings className="w-5 h-5 text-gray-400" />
        </Link>
      </div>

      <div className="space-y-4">
        {/* Referrals */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Referrals</p>
              <p className="text-xl font-bold">{stats?.total_referrals ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Commission Earned */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Commission Earned</p>
              <p className="text-xl font-bold">{(stats?.commission_earned ?? 0).toFixed(2)} KES</p>
            </div>
          </div>
        </div>

        {/* ROI */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">P2P Trading ROI</p>
              <p className={`text-xl font-bold ${roiColor}`}>
                {roiSign}
                {(stats?.total_roi ?? 0).toFixed(2)} KES
              </p>
            </div>
          </div>
        </div>

        {/* Reputation */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Award className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Reputation</p>
              <p className="text-xl font-bold">{(stats?.rating ?? 0).toFixed(2)} / 5.00</p>
            </div>
          </div>
        </div>

        {/* Remaining Supply */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Package className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Remaining GX Supply</p>
              <p className="text-xl font-bold">
                {(supply?.remaining_supply ?? 0).toLocaleString()} / {(supply?.total_supply ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
