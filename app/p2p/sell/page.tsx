"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, User, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Ad {
  id: string
  user_id: string
  gx_amount: number
  min_amount: number
  max_amount: number
  account_number: string | null
  mpesa_number: string | null
  paybill_number: string | null
  airtel_money: string | null
  terms_of_trade: string | null
  created_at: string
  profiles: {
    username: string | null
    email: string | null
  }
  remaining_amount?: number
  price_per_gx?: number
}

export default function SellGXPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [initiatingTrade, setInitiatingTrade] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchBuyAds()
    getCurrentUser()
  }, [])

  async function getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
  }

  async function fetchBuyAds() {
    try {
      const { data, error } = await supabase
        .from("p2p_ads")
        .select(`
          *,
          profiles:user_id (
            username,
            email
          )
        `)
        .eq("ad_type", "buy")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching ads:", error)
        return
      }

      setAds(data || [])
    } catch (error) {
      console.error("[v0] Error:", error)
    } finally {
      setLoading(false)
    }
  }

  async function initiateTrade(ad: Ad) {
    try {
      setInitiatingTrade(ad.id)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        alert("Please sign in to trade")
        return
      }

      if (user.id === ad.user_id) {
        alert("You cannot trade with yourself")
        setInitiatingTrade(null)
        return
      }

      const { data: tradeId, error } = await supabase.rpc("initiate_p2p_trade", {
        p_ad_id: ad.id,
        p_buyer_id: ad.user_id,
        p_seller_id: user.id,
        p_gx_amount: ad.gx_amount,
      })

      if (error) {
        console.error("[v0] Error initiating trade:", error)
        alert(error.message || "Failed to initiate trade")
        return
      }

      router.push(`/p2p/trade/${tradeId}`)
    } catch (error) {
      console.error("[v0] Error:", error)
      alert("Failed to initiate trade")
    } finally {
      setInitiatingTrade(null)
    }
  }

  function getPaymentMethods(ad: Ad) {
    const methods = []
    if (ad.mpesa_number) methods.push("M-Pesa")
    if (ad.paybill_number) methods.push("Paybill")
    if (ad.airtel_money) methods.push("Airtel Money")
    if (ad.account_number) methods.push("Bank Account")
    return methods.join(", ") || "Not specified"
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-8">
            <Button variant="ghost" className="mb-4 hover:bg-white/5" onClick={() => router.push("/p2p")}>
              <ArrowLeft size={20} className="mr-2" />
              Back to P2P
            </Button>
            <h1 className="text-4xl font-bold mb-2">Sell GX</h1>
            <p className="text-gray-400">Browse available buy offers and sell GX to other users</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-card p-8 rounded-xl border border-white/10">
              <div className="text-center">
                <div className="text-5xl font-bold text-red-400 mb-2">{ads.length}</div>
                <p className="text-gray-400">Available Ads</p>
              </div>
            </div>
            <div className="glass-card p-8 rounded-xl border border-white/10">
              <div className="text-center">
                <div className="text-5xl font-bold text-purple-400 mb-2">
                  {ads.reduce((sum, ad) => sum + (ad.remaining_amount || ad.gx_amount), 0).toFixed(2)}
                </div>
                <p className="text-gray-400">Total GX Wanted</p>
              </div>
            </div>
            <div className="glass-card p-8 rounded-xl border border-white/10">
              <div className="text-center">
                <div className="text-5xl font-bold text-yellow-400 mb-2">
                  {ads.length > 0
                    ? (ads.reduce((sum, ad) => sum + (ad.remaining_amount || ad.gx_amount), 0) / ads.length).toFixed(2)
                    : "0"}
                </div>
                <p className="text-gray-400">Avg. Amount</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-xl border border-white/10">
            <h2 className="text-2xl font-bold mb-6">Available Buy Offers</h2>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Loading ads...</p>
              </div>
            ) : ads.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">No buy ads available at the moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ads.map((ad) => (
                  <div
                    key={ad.id}
                    className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-lg bg-red-500/10">
                            <User size={20} className="text-red-400" />
                          </div>
                          <div>
                            <span className="font-semibold text-white">
                              {ad.profiles?.username || ad.profiles?.email || "Anonymous"}
                            </span>
                            {currentUserId === ad.user_id && (
                              <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                                Your Ad
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-400">Amount</p>
                            <p className="font-bold text-lg text-red-400">{ad.remaining_amount || ad.gx_amount} GX</p>
                            <p className="text-xs text-gray-500">Available</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Price per GX</p>
                            <p className="font-semibold text-white">{ad.price_per_gx || "N/A"} KES</p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm text-gray-400">Payment Methods</p>
                          <p className="text-sm text-white">{getPaymentMethods(ad)}</p>
                        </div>

                        {ad.terms_of_trade && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-400">Terms</p>
                            <p className="text-sm text-gray-300 italic">"{ad.terms_of_trade}"</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock size={14} />
                          <span>Posted {new Date(ad.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div>
                        <Button
                          className="px-6 py-3 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold hover:shadow-lg hover:shadow-red-500/50 transition"
                          onClick={() => initiateTrade(ad)}
                          disabled={initiatingTrade === ad.id || currentUserId === ad.user_id}
                        >
                          {currentUserId === ad.user_id
                            ? "Your Ad"
                            : initiatingTrade === ad.id
                              ? "Initiating..."
                              : "Sell Now"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
