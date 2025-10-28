"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useMining } from "@/lib/mining-context"
import { ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function Market() {
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy")
  const { activeTrades } = useMining()
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("listings")
          .select(`
            *,
            profiles:user_id (
              username,
              rating,
              total_trades
            )
          `)
          .eq("status", "active")
          .eq("listing_type", activeTab === "buy" ? "sell" : "buy")
          .order("created_at", { ascending: false })

        if (error) throw error
        setListings(data || [])
      } catch (error) {
        console.error("[v0] Error fetching listings:", error)
        setListings([])
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [activeTab])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0f1720, #071124)" }}>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-7 py-9">
          {/* P2P Header */}
          <div className="flex justify-between items-center mt-7">
            <h2 className="text-2xl font-bold">P2P Marketplace</h2>
            <Link
              href="/market/create-listing"
              className="px-4 py-2 rounded-3xl border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition font-semibold text-sm"
            >
              + Make Advert
            </Link>
          </div>

          {/* Tab Buttons */}
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
          </div>

          {loading ? (
            <div className="mt-6 text-center py-12">
              <div className="text-gray-400">Loading listings...</div>
            </div>
          ) : listings.length === 0 ? (
            <div className="mt-6 text-center py-12">
              <div className="text-gray-400 mb-4">No {activeTab === "buy" ? "sell" : "buy"} listings available</div>
              <p className="text-sm text-gray-500">Be the first to create a listing!</p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/market/trade/${listing.id}?type=${activeTab}`}
                  className="flex justify-between items-center p-4 rounded-3xl transition hover:bg-white/10 cursor-pointer group"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  {/* Trader Info */}
                  <div className="flex flex-col flex-1">
                    <div className="font-semibold text-white group-hover:text-green-400 transition">
                      {listing.profiles?.username || "Anonymous"}
                    </div>
                    <div className="text-yellow-400 text-sm">
                      ⭐ {listing.profiles?.rating?.toFixed(1) || "0.0"} ({listing.profiles?.total_trades || 0} trades)
                    </div>
                  </div>

                  {/* Price & Payment */}
                  <div className="text-right flex-1">
                    <div className="font-bold text-green-400">KES {Number(listing.price_per_coin).toFixed(2)} / GX</div>
                    <div className="text-gray-400 text-xs">{listing.payment_methods?.join(" | ") || "M-Pesa"}</div>
                  </div>

                  {/* Available & Action */}
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
                </Link>
              ))}
            </div>
          )}

          {/* Active Trades Section */}
          {activeTrades.length > 0 && (
            <div className="mt-12">
              <h3 className="text-xl font-bold mb-4">Your Active Trades</h3>
              <div className="flex flex-col gap-3">
                {activeTrades.map((trade) => (
                  <Link
                    key={trade.id}
                    href={`/market/trade-status/${trade.id}`}
                    className="flex justify-between items-center p-4 rounded-3xl transition hover:bg-white/10"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <div>
                      <div className="font-semibold text-white">{trade.sellerName}</div>
                      <div className="text-sm text-gray-400">
                        {trade.type === "buy" ? "Buying" : "Selling"} {trade.amount} GX at KES {trade.pricePerCoin}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-400">KES {trade.totalPrice.toFixed(2)}</div>
                      <div className={`text-sm ${trade.status === "completed" ? "text-green-400" : "text-yellow-400"}`}>
                        {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
