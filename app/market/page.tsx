"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useMining } from "@/lib/mining-context"
import { ChevronRight, X, Copy, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function Market() {
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy")
  const { activeTrades, balance } = useMining()
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState<any>(null)
  const [tradeAmount, setTradeAmount] = useState("")
  const [isCreatingTrade, setIsCreatingTrade] = useState(false)
  const [copied, setCopied] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    getUser()
  }, [supabase])

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true)
      try {
        const listingTypeToFetch = activeTab === "buy" ? "sell" : "buy"

        const { data: listingsData, error: listingsError } = await supabase
          .from("listings")
          .select("*")
          .eq("status", "active")
          .eq("listing_type", listingTypeToFetch)
          .order("price_per_coin", { ascending: activeTab === "buy" })

        if (listingsError) throw listingsError

        if (listingsData && listingsData.length > 0) {
          const userIds = listingsData.map((l) => l.user_id)
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, username, rating, total_trades")
            .in("id", userIds)

          const listingsWithProfiles = listingsData.map((listing) => {
            const profile = profilesData?.find((p) => p.id === listing.user_id)
            return {
              ...listing,
              profile: profile || { username: "Anonymous", rating: 0, total_trades: 0 },
            }
          })

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

    fetchListings()

    const channel = supabase
      .channel("listings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => fetchListings())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeTab, supabase])

  const handleCreateTrade = async () => {
    if (!selectedListing || !tradeAmount || !currentUserId) return

    const amount = Number.parseFloat(tradeAmount)
    if (isNaN(amount) || amount <= 0 || amount > selectedListing.coin_amount) {
      alert("Invalid amount")
      return
    }

    if (activeTab === "sell" && amount > balance) {
      alert(`Insufficient balance. You have ${balance} GX but trying to sell ${amount} GX`)
      return
    }

    setIsCreatingTrade(true)
    try {
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + 30)

      const tradeData = {
        listing_id: selectedListing.id,
        buyer_id: activeTab === "buy" ? currentUserId : selectedListing.user_id,
        seller_id: activeTab === "buy" ? selectedListing.user_id : currentUserId,
        coin_amount: amount,
        price_per_coin: selectedListing.price_per_coin,
        total_price: amount * selectedListing.price_per_coin,
        status: "pending",
        escrow_amount: amount,
        expires_at: expiresAt.toISOString(),
      }

      const { data: trade, error: tradeError } = await supabase.from("trades").insert([tradeData]).select().single()

      if (tradeError) throw tradeError

      if (activeTab === "sell") {
        const { error: escrowError } = await supabase.from("coins").insert([
          {
            user_id: currentUserId,
            amount: -amount,
            type: "escrow",
            status: "locked",
            trade_id: trade.id,
          },
        ])

        if (escrowError) throw escrowError
      }

      window.location.href = `/market/trade/${trade.id}`
    } catch (error) {
      console.error("[v0] Error creating trade:", error)
      alert("Failed to create trade. Please try again.")
    } finally {
      setIsCreatingTrade(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0f1720, #071124)" }}>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-7 py-9">
          <div className="flex justify-between items-center mt-7">
            <h2 className="text-2xl font-bold">P2P Marketplace</h2>
            <Link
              href="/market/create-listing"
              className="px-4 py-2 rounded-3xl border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition font-semibold text-sm"
            >
              + Make Advert
            </Link>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab("buy")}
              className={`px-4 py-2 rounded-3xl font-semibold text-sm transition ${
                activeTab === "buy"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                  : "bg-transparent text-green-400 border border-green-500/30 hover:bg-green-500/10"
              }`}
            >
              Buy GX
            </button>
            <button
              onClick={() => setActiveTab("sell")}
              className={`px-4 py-2 rounded-3xl font-semibold text-sm transition ${
                activeTab === "sell"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                  : "bg-transparent text-green-400 border border-green-500/30 hover:bg-green-500/10"
              }`}
            >
              Sell GX
            </button>
            <Link
              href="/market/my-orders"
              className="px-4 py-2 rounded-3xl font-semibold text-sm transition bg-transparent text-green-400 border border-green-500/30 hover:bg-green-500/10"
            >
              My Orders
            </Link>
          </div>

          {loading ? (
            <div className="mt-6 text-center py-12">
              <div className="text-gray-400">Loading listings...</div>
            </div>
          ) : listings.length === 0 ? (
            <div className="mt-6 text-center py-12 rounded-3xl" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="text-gray-400 mb-4">
                No {activeTab === "buy" ? "sellers" : "buyers"} available right now
              </div>
              <p className="text-sm text-gray-500">Be the first to create a listing!</p>
              <Link
                href="/market/create-listing"
                className="inline-block mt-4 px-6 py-2 rounded-3xl bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold text-sm hover:shadow-lg hover:shadow-green-500/50 transition"
              >
                Create Listing
              </Link>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  onClick={() => setSelectedListing(listing)}
                  className="flex justify-between items-center p-4 rounded-3xl transition hover:bg-white/10 cursor-pointer group"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <div className="flex flex-col flex-1">
                    <div className="font-semibold text-white group-hover:text-green-400 transition">
                      {listing.profile?.username || "Anonymous"}
                    </div>
                    <div className="text-yellow-400 text-sm">
                      ⭐ {listing.profile?.rating?.toFixed(1) || "0.0"} ({listing.profile?.total_trades || 0} trades)
                    </div>
                  </div>

                  <div className="text-right flex-1">
                    <div className="font-bold text-green-400">KES {Number(listing.price_per_coin).toFixed(2)} / GX</div>
                    <div className="text-gray-400 text-xs">{listing.payment_methods?.join(" | ") || "M-Pesa"}</div>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Available</div>
                      <div className="font-semibold text-green-400">{listing.coin_amount} GX</div>
                    </div>
                    <button className="px-4 py-2 rounded-3xl bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold text-sm hover:shadow-lg hover:shadow-green-500/50 transition flex items-center gap-2">
                      {activeTab === "buy" ? "Buy" : "Sell"}
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedListing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D1B2A] rounded-3xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setSelectedListing(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>

            <h3 className="text-2xl font-bold mb-4">{activeTab === "buy" ? "Buy" : "Sell"} GX</h3>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Trader</span>
                  <span className="font-semibold">{selectedListing.profile?.username}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Price</span>
                  <span className="font-semibold text-green-400">
                    KES {Number(selectedListing.price_per_coin).toFixed(2)} / GX
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Available</span>
                  <span className="font-semibold">{selectedListing.coin_amount} GX</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment</span>
                  <span className="font-semibold text-sm">{selectedListing.payment_methods?.join(", ")}</span>
                </div>
              </div>

              {selectedListing.payment_account && (
                <div className="p-4 rounded-2xl bg-white/5">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-400 text-sm">Payment Account</div>
                      <div className="font-mono font-semibold">{selectedListing.payment_account}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedListing.payment_account)}
                      className="p-2 hover:bg-white/10 rounded-lg transition"
                    >
                      {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>
              )}

              {selectedListing.terms && (
                <div className="p-4 rounded-2xl bg-white/5">
                  <div className="text-gray-400 text-sm mb-1">Terms of Trade</div>
                  <div className="text-sm">{selectedListing.terms}</div>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount (GX)</label>
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  max={selectedListing.coin_amount}
                  placeholder={`Max: ${selectedListing.coin_amount} GX`}
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-green-500 focus:outline-none"
                />
              </div>

              {tradeAmount && (
                <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Price</span>
                    <span className="font-bold text-green-400 text-xl">
                      KES {(Number.parseFloat(tradeAmount) * selectedListing.price_per_coin).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleCreateTrade}
                disabled={!tradeAmount || isCreatingTrade}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingTrade ? "Creating Trade..." : `Confirm ${activeTab === "buy" ? "Buy" : "Sell"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
