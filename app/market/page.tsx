"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { createClient } from "@/lib/supabase/client"
import { ChevronRight, TrendingUp, TrendingDown } from "lucide-react"

interface Listing {
  id: string
  user_id: string
  ad_type: string
  coin_amount: number
  price_per_coin: number
  min_order_amount: number
  max_order_amount: number
  payment_methods: string[]
  payment_details: any
  terms: string
  created_at: string
  profile?: {
    username: string
    rating: number
    trade_count: number
  }
}

export default function MarketPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy")
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [tradeAmount, setTradeAmount] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchListings()

    const channel = supabase
      .channel("listings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => {
        fetchListings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeTab])

  async function checkAuth() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setIsLoggedIn(!!user)
    setCurrentUserId(user?.id || null)
  }

  async function fetchListings() {
    setLoading(true)
    try {
      const adType = activeTab === "buy" ? "sell" : "buy"

      const { data: listingsData, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .eq("ad_type", adType)
        .gt("expires_at", new Date().toISOString())
        .order("price_per_coin", { ascending: activeTab === "buy" })
        .limit(50)

      if (error) throw error

      if (listingsData && listingsData.length > 0) {
        const userIds = [...new Set(listingsData.map((l) => l.user_id))]
        const { data: profilesData } = await supabase.from("profiles").select("id, username").in("id", userIds)

        const listingsWithProfiles = await Promise.all(
          listingsData.map(async (listing) => {
            const profile = profilesData?.find((p) => p.id === listing.user_id)
            const { data: ratingData } = await supabase.rpc("get_user_rating", { p_user_id: listing.user_id })
            const { data: tradeCountData } = await supabase.rpc("get_user_trade_count", { p_user_id: listing.user_id })

            return {
              ...listing,
              profile: {
                username: profile?.username || "Anonymous",
                rating: ratingData || 0,
                trade_count: tradeCountData || 0,
              },
            }
          }),
        )

        setListings(listingsWithProfiles)
      } else {
        setListings([])
      }
    } catch (error) {
      console.error("[v0] Error fetching listings:", error)
      setListings([])
    } finally {
      setLoading(false)
    }
  }

  async function handleInitiateTrade() {
    if (!selectedListing || !tradeAmount || !currentUserId || creating) return

    const amount = Number.parseFloat(tradeAmount)
    if (
      isNaN(amount) ||
      amount < selectedListing.min_order_amount ||
      amount > selectedListing.max_order_amount ||
      amount > selectedListing.coin_amount
    ) {
      alert(
        `Invalid amount. Must be between ${selectedListing.min_order_amount} and ${Math.min(selectedListing.max_order_amount, selectedListing.coin_amount)} GX`,
      )
      return
    }

    setCreating(true)

    try {
      const isBuyingFromSeller = selectedListing.ad_type === "sell"
      const tradeData = {
        listing_id: selectedListing.id,
        buyer_id: isBuyingFromSeller ? currentUserId : selectedListing.user_id,
        seller_id: isBuyingFromSeller ? selectedListing.user_id : currentUserId,
        coin_amount: amount,
        price_per_coin: selectedListing.price_per_coin,
        total_price: amount * selectedListing.price_per_coin,
        payment_method: selectedListing.payment_methods[0],
        status: "pending",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }

      console.log("[v0] Creating trade with data:", tradeData)

      const { data: trade, error } = await supabase.from("trades").insert([tradeData]).select().single()

      if (error) {
        console.error("[v0] Error creating trade:", error)
        alert(`Failed to create trade: ${error.message}`)
        setCreating(false)
        return
      }

      if (!trade || !trade.id) {
        console.error("[v0] Trade created but no ID returned:", trade)
        alert("Failed to create trade. Please try again.")
        setCreating(false)
        return
      }

      console.log("[v0] Trade created successfully with ID:", trade.id)

      await new Promise((resolve) => setTimeout(resolve, 1000))

      router.push(`/market/trade/${trade.id}`)
    } catch (error: any) {
      console.error("[v0] Failed to initiate trade:", error)
      alert(`Failed to initiate trade: ${error.message || "Unknown error"}`)
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0f1720] to-[#071124]">
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">P2P Marketplace</h1>
          {isLoggedIn && (
            <div className="flex gap-3">
              <Link
                href="/market/my-orders"
                className="px-4 py-2 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition"
              >
                My Orders
              </Link>
              <Link
                href="/market/create-ad"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition"
              >
                + Post Ad
              </Link>
            </div>
          )}
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab("buy")}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              activeTab === "buy"
                ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            <TrendingUp className="inline mr-2" size={18} />
            Buy GX
          </button>
          <button
            onClick={() => setActiveTab("sell")}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              activeTab === "sell"
                ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            <TrendingDown className="inline mr-2" size={18} />
            Sell GX
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            <p className="mt-4 text-gray-400">Loading ads...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-2xl">
            <p className="text-gray-400 mb-4">No ads available</p>
            {isLoggedIn && (
              <Link
                href="/market/create-ad"
                className="inline-block px-6 py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition"
              >
                Be the first to post an ad
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => (
              <div
                key={listing.id}
                onClick={() => setSelectedListing(listing)}
                className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 cursor-pointer transition group"
              >
                <div className="flex-1">
                  <div className="font-semibold text-lg group-hover:text-green-400 transition">
                    {listing.profile?.username}
                  </div>
                  <div className="text-sm text-gray-400">
                    ⭐ {listing.profile?.rating.toFixed(1)} | {listing.profile?.trade_count} trades
                  </div>
                </div>

                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-green-400">KES {listing.price_per_coin.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">per GX</div>
                </div>

                <div className="flex-1 text-center">
                  <div className="text-sm text-gray-400">Available</div>
                  <div className="font-semibold text-white">{listing.coin_amount} GX</div>
                  <div className="text-xs text-gray-500">
                    Limit: {listing.min_order_amount} - {listing.max_order_amount} GX
                  </div>
                </div>

                <div className="flex-1 text-right">
                  <div className="text-sm text-gray-400 mb-1">Payment</div>
                  <div className="text-xs text-white">{listing.payment_methods.join(", ")}</div>
                </div>

                <button className="ml-4 px-6 py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition flex items-center gap-2">
                  {activeTab === "buy" ? "Buy" : "Sell"}
                  <ChevronRight size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedListing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D1B2A] rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold mb-4">{activeTab === "buy" ? "Buy" : "Sell"} GX</h3>

            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Trader</span>
                  <span className="font-semibold">{selectedListing.profile?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price</span>
                  <span className="font-semibold text-green-400">KES {selectedListing.price_per_coin.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Available</span>
                  <span className="font-semibold">{selectedListing.coin_amount} GX</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Limit</span>
                  <span className="font-semibold">
                    {selectedListing.min_order_amount} - {selectedListing.max_order_amount} GX
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment</span>
                  <span className="font-semibold text-sm">{selectedListing.payment_methods.join(", ")}</span>
                </div>
              </div>

              {selectedListing.terms && (
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="text-gray-400 text-sm mb-1">Terms</div>
                  <div className="text-sm">{selectedListing.terms}</div>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount (GX)</label>
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  min={selectedListing.min_order_amount}
                  max={Math.min(selectedListing.max_order_amount, selectedListing.coin_amount)}
                  placeholder={`${selectedListing.min_order_amount} - ${Math.min(selectedListing.max_order_amount, selectedListing.coin_amount)}`}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-500 focus:outline-none"
                />
              </div>

              {tradeAmount && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total</span>
                    <span className="font-bold text-green-400 text-xl">
                      KES {(Number.parseFloat(tradeAmount) * selectedListing.price_per_coin).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedListing(null)
                    setTradeAmount("")
                  }}
                  disabled={creating}
                  className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInitiateTrade}
                  disabled={!tradeAmount || !isLoggedIn || creating}
                  className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating
                    ? "Creating Trade..."
                    : !isLoggedIn
                      ? "Login Required"
                      : activeTab === "buy"
                        ? "Buy Now"
                        : "Sell Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
