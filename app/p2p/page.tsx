"use client"

import { ArrowLeftRight, Plus, History, FileText, Wallet, User, Clock, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface Ad {
  id: string
  user_id: string
  ad_type: string
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
    rating: number | null
  }
  remaining_amount?: number
  price_per_gx?: number
}

export default function P2PMarket() {
  const router = useRouter()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy")
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [availableBalance, setAvailableBalance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [initiatingTrade, setInitiatingTrade] = useState<string | null>(null)
  const [tradeAmounts, setTradeAmounts] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    fetchAvailableBalance()
    getCurrentUser()
    const interval = setInterval(fetchAvailableBalance, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchAds()
  }, [activeTab])

  async function getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
  }

  async function fetchAds() {
    setLoading(true)
    try {
      const adType = activeTab === "buy" ? "sell" : "buy"
      const { data, error } = await supabase
        .from("p2p_ads")
        .select(`
          *,
          profiles:user_id (
            username,
            email,
            rating
          )
        `)
        .eq("ad_type", adType)
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

  async function fetchAvailableBalance() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setIsLoading(false)
      return
    }

    const { data, error } = await supabase.rpc("get_available_balance", { user_id: user.id })

    if (error) {
      console.error("[v0] Error fetching available balance:", error)
      const { data: profileData } = await supabase.from("profiles").select("total_mined").eq("id", user.id).single()

      if (profileData) {
        setAvailableBalance(profileData.total_mined || 0)
      }
    } else if (data !== null) {
      setAvailableBalance(data)
    }

    setIsLoading(false)
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

      const customAmount = Number.parseFloat(tradeAmounts[ad.id] || "0")
      const tradeAmount = customAmount > 0 ? customAmount : ad.min_amount
      const availableAmount = ad.remaining_amount || ad.gx_amount

      if (tradeAmount < 2) {
        alert("Minimum trade amount is 2 GX")
        setInitiatingTrade(null)
        return
      }

      if (tradeAmount > availableAmount) {
        alert(`Maximum available amount is ${availableAmount} GX`)
        setInitiatingTrade(null)
        return
      }

      const { data: tradeId, error } = await supabase.rpc("initiate_p2p_trade_v2", {
        p_ad_id: ad.id,
        p_buyer_id: user.id,
        p_gx_amount: tradeAmount,
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
    <div className="min-h-screen flex flex-col bg-black">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <ArrowLeftRight size={32} className="text-green-400" />
              <h1 className="text-4xl font-bold">P2P Marketplace</h1>
            </div>
            <p className="text-gray-400">Buy and sell GX coins directly with other users</p>
          </div>

          <div className="glass-card border border-white/10 rounded-xl p-8 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="glass-card border border-green-500/30 rounded-lg px-4 py-3 bg-green-500/10">
                <div className="flex items-center gap-3">
                  <Wallet size={20} className="text-green-400" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Available Balance</p>
                    <p className="text-xl font-bold text-green-400">
                      {isLoading ? "..." : availableBalance !== null ? `${availableBalance.toFixed(2)} GX` : "0.00 GX"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 transition"
                  onClick={() => router.push("/p2p/my-ads")}
                >
                  <FileText size={16} />
                  My Ads
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 transition"
                  onClick={() => router.push("/p2p/my-trades")}
                >
                  <History size={16} />
                  My Trades
                </Button>
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <Button
                className={`flex-1 h-16 text-sm font-semibold transition ${
                  activeTab === "buy"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-black hover:shadow-lg hover:shadow-green-500/50"
                    : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                }`}
                onClick={() => setActiveTab("buy")}
              >
                <div className="flex flex-col items-center gap-1">
                  <ArrowLeftRight size={18} className="rotate-90" />
                  <span>BUY GX</span>
                </div>
              </Button>

              <Button
                className={`flex-1 h-16 text-sm font-semibold transition ${
                  activeTab === "sell"
                    ? "bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg hover:shadow-red-500/50"
                    : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                }`}
                onClick={() => setActiveTab("sell")}
              >
                <div className="flex flex-col items-center gap-1">
                  <ArrowLeftRight size={18} className="-rotate-90" />
                  <span>SELL GX</span>
                </div>
              </Button>

              <Button
                className="flex-1 h-16 text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg hover:shadow-blue-500/50 transition text-white"
                onClick={() => router.push("/p2p/post-ad")}
              >
                <div className="flex flex-col items-center gap-1">
                  <Plus size={18} />
                  <span>POST AD</span>
                </div>
              </Button>
            </div>

            <div className="pt-6 border-t border-white/10">
              <h3 className="text-lg font-semibold mb-4">How P2P Trading Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <p className="font-semibold text-white">Direct Trading</p>
                    <p className="text-gray-400">Buy and sell GX with other users</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <p className="font-semibold text-white">Secure Escrow</p>
                    <p className="text-gray-400">Protected transactions with escrow system</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <p className="font-semibold text-white">Real-time Chat</p>
                    <p className="text-gray-400">Communicate with traders during transactions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-xl border border-white/10">
            <h2 className="text-2xl font-bold mb-6">
              {activeTab === "buy" ? "Available Sell Offers" : "Available Buy Offers"}
            </h2>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Loading ads...</p>
              </div>
            ) : ads.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">
                  No {activeTab === "buy" ? "sell" : "buy"} ads available at the moment
                </p>
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
                          <div
                            className={`p-2 rounded-lg ${activeTab === "buy" ? "bg-green-500/10" : "bg-red-500/10"}`}
                          >
                            <User size={20} className={activeTab === "buy" ? "text-green-400" : "text-red-400"} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">
                                {ad.profiles?.username || ad.profiles?.email || "Anonymous"}
                              </span>
                              {currentUserId === ad.user_id && (
                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Your Ad</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Star size={14} className="text-yellow-400 fill-yellow-400" />
                              <span className="text-sm text-gray-400">
                                {ad.profiles?.rating ? Number(ad.profiles.rating).toFixed(1) : "No ratings"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-400">Amount</p>
                            <p
                              className={`font-bold text-lg ${activeTab === "buy" ? "text-green-400" : "text-red-400"}`}
                            >
                              {ad.remaining_amount || ad.gx_amount} GX
                            </p>
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

                      <div className="flex flex-col gap-3">
                        {currentUserId !== ad.user_id && (
                          <div className="space-y-2">
                            <Label htmlFor={`amount-${ad.id}`} className="text-sm text-gray-400">
                              Amount to {activeTab === "buy" ? "buy" : "sell"} (GX)
                            </Label>
                            <Input
                              id={`amount-${ad.id}`}
                              type="number"
                              min="2"
                              max={ad.remaining_amount || ad.gx_amount}
                              step="0.01"
                              placeholder={`Min: 2, Max: ${ad.remaining_amount || ad.gx_amount}`}
                              value={tradeAmounts[ad.id] || ""}
                              onChange={(e) => setTradeAmounts((prev) => ({ ...prev, [ad.id]: e.target.value }))}
                              className="bg-white/5 border-white/10 text-white"
                            />
                          </div>
                        )}
                        <Button
                          className={`px-6 py-3 rounded-lg font-semibold transition ${
                            activeTab === "buy"
                              ? "bg-gradient-to-r from-green-500 to-green-600 text-black hover:shadow-lg hover:shadow-green-500/50"
                              : "bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg hover:shadow-red-500/50"
                          }`}
                          onClick={() => initiateTrade(ad)}
                          disabled={initiatingTrade === ad.id || currentUserId === ad.user_id}
                        >
                          {currentUserId === ad.user_id
                            ? "Your Ad"
                            : initiatingTrade === ad.id
                              ? "Initiating..."
                              : activeTab === "buy"
                                ? "Buy Now"
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
