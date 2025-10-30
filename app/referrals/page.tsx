"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Copy, Share2, TrendingUp, Users, DollarSign, Award } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Referral {
  id: string
  referred_id: string
  referral_code: string
  total_trading_commission: number
  total_claim_commission: number
  created_at: string
  status: string
}

interface ReferredUser {
  id: string
  username: string
  email: string
  total_mined: number
}

interface ReferralCommission {
  id: string
  amount: number
  commission_type: string
  created_at: string
}

export default function ReferralsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([])
  const [recentCommissions, setRecentCommissions] = useState<ReferralCommission[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()
        if (!authUser) {
          router.push("/auth/sign-in")
          return
        }

        setUser(authUser)

        // Fetch user profile
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", authUser.id).single()

        setProfile(profileData)

        // Fetch referrals
        const { data: referralsData } = await supabase
          .from("referrals")
          .select("*")
          .eq("referrer_id", authUser.id)
          .order("created_at", { ascending: false })

        setReferrals(referralsData || [])

        // Fetch referred users details
        if (referralsData && referralsData.length > 0) {
          const referredIds = referralsData.map((r) => r.referred_id)
          const { data: usersData } = await supabase
            .from("profiles")
            .select("id, username, email, total_mined")
            .in("id", referredIds)

          setReferredUsers(usersData || [])
        }

        // Fetch recent commissions
        const { data: commissionsData } = await supabase
          .from("referral_commissions")
          .select("*")
          .eq("referrer_id", authUser.id)
          .order("created_at", { ascending: false })
          .limit(10)

        setRecentCommissions(commissionsData || [])
      } catch (error) {
        console.error("[v0] Error fetching referral data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, router])

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/sign-up?ref=${profile?.referral_code || ""}`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareOnWhatsApp = () => {
    const message = `Join GrowX and earn passive income! Use my referral code: ${profile?.referral_code} or click: ${referralLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank")
  }

  const shareOnTwitter = () => {
    const text = `Join GrowX - The Coin That Never Sleeps! Use my referral code: ${profile?.referral_code} and I'll earn 2% commission on all your transactions! ${referralLink}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <Header isLoggedIn={true} setIsLoggedIn={() => {}} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Loading referral data...</p>
        </main>
        <Footer />
      </div>
    )
  }

  const totalTradingCommission = referrals.reduce((sum, r) => sum + (r.total_trading_commission || 0), 0)
  const totalClaimCommission = referrals.reduce((sum, r) => sum + (r.total_claim_commission || 0), 0)
  const totalCommission = totalTradingCommission + totalClaimCommission
  const activeReferrals = referrals.filter((r) => r.status === "active").length

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header isLoggedIn={true} setIsLoggedIn={() => {}} />
      <main className="flex-1 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Referral Program</h1>
            <p className="text-gray-400">Earn 2% lifetime commission from your referrals</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="glass-card p-6 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <Users className="text-green-400" size={24} />
                <p className="text-gray-400 text-sm">Total Referrals</p>
              </div>
              <p className="text-3xl font-bold text-white">{referrals.length}</p>
              <p className="text-xs text-green-400 mt-1">{activeReferrals} active</p>
            </div>

            <div className="glass-card p-6 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="text-blue-400" size={24} />
                <p className="text-gray-400 text-sm">Trading Commission</p>
              </div>
              <p className="text-3xl font-bold text-blue-400">{totalTradingCommission.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">GX earned</p>
            </div>

            <div className="glass-card p-6 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <Award className="text-purple-400" size={24} />
                <p className="text-gray-400 text-sm">Mining Commission</p>
              </div>
              <p className="text-3xl font-bold text-purple-400">{totalClaimCommission.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">GX earned</p>
            </div>

            <div className="glass-card p-6 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="text-yellow-400" size={24} />
                <p className="text-gray-400 text-sm">Total Earnings</p>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{totalCommission.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">GX lifetime</p>
            </div>
          </div>

          {/* Referral Link Section */}
          <div className="glass-card p-8 rounded-xl border border-white/10 mb-8">
            <h2 className="text-2xl font-bold mb-4">Your Referral Link</h2>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4 flex items-center justify-between">
              <code className="text-green-400 text-sm break-all flex-1">{referralLink}</code>
              <button
                onClick={copyToClipboard}
                className="ml-4 p-2 hover:bg-white/10 rounded-lg transition flex-shrink-0"
                title="Copy to clipboard"
              >
                <Copy size={20} className={copied ? "text-green-400" : "text-gray-400"} />
              </button>
            </div>

            <div className="flex gap-3 flex-wrap mb-6">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 hover:bg-green-500/30 transition"
              >
                <Copy size={18} />
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button
                onClick={shareOnWhatsApp}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 hover:bg-green-500/30 transition"
              >
                <Share2 size={18} />
                WhatsApp
              </button>
              <button
                onClick={shareOnTwitter}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 hover:bg-blue-500/30 transition"
              >
                <Share2 size={18} />
                Twitter
              </button>
            </div>

            <div className="p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg">
              <p className="text-white font-semibold mb-2">
                Your Referral Code: <span className="text-green-400 text-xl">{profile?.referral_code}</span>
              </p>
              <p className="text-gray-300 text-sm">
                Earn <strong className="text-green-400">2%</strong> commission on <strong>ALL</strong> transactions
                (mining + trading) from your referrals - <strong>FOR LIFE!</strong>
              </p>
            </div>
          </div>

          {/* Referrals List */}
          <div className="glass-card p-8 rounded-xl border border-white/10 mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Users size={24} className="text-green-400" />
              Your Referrals ({referrals.length})
            </h2>

            {referrals.length === 0 ? (
              <div className="text-center py-12">
                <Users size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No referrals yet. Share your link to get started!</p>
                <button
                  onClick={copyToClipboard}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition font-semibold"
                >
                  Copy Referral Link
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">User</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-semibold">Trading</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-semibold">Mining</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-semibold">Total Earned</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((referral) => {
                      const referredUser = referredUsers.find((u) => u.id === referral.referred_id)
                      const total = (referral.total_trading_commission || 0) + (referral.total_claim_commission || 0)
                      return (
                        <tr key={referral.id} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-white font-semibold">{referredUser?.username || "Unknown"}</p>
                              <p className="text-gray-400 text-xs">{referredUser?.email || "-"}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-blue-400 font-semibold">
                            {(referral.total_trading_commission || 0).toFixed(2)} GX
                          </td>
                          <td className="py-3 px-4 text-right text-purple-400 font-semibold">
                            {(referral.total_claim_commission || 0).toFixed(2)} GX
                          </td>
                          <td className="py-3 px-4 text-right text-yellow-400 font-bold text-lg">
                            {total.toFixed(2)} GX
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                referral.status === "active"
                                  ? "bg-green-500/20 text-green-400 border border-green-500/50"
                                  : "bg-gray-500/20 text-gray-400 border border-gray-500/50"
                              }`}
                            >
                              {referral.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-sm">
                            {new Date(referral.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Commissions */}
          {recentCommissions.length > 0 && (
            <div className="glass-card p-8 rounded-xl border border-white/10">
              <h2 className="text-2xl font-bold mb-6">Recent Commissions</h2>
              <div className="space-y-3">
                {recentCommissions.map((commission) => (
                  <div
                    key={commission.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          commission.commission_type === "trading" ? "bg-blue-400" : "bg-purple-400"
                        }`}
                      />
                      <div>
                        <p className="text-white font-semibold capitalize">{commission.commission_type} Commission</p>
                        <p className="text-gray-400 text-xs">{new Date(commission.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="text-green-400 font-bold">+{commission.amount.toFixed(2)} GX</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back to Dashboard */}
          <div className="mt-8">
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
