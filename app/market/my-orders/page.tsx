"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { ArrowLeft, Edit2, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function MyOrders() {
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [activeTab, setActiveTab] = useState<"listings" | "trades">("listings")
  const [listings, setListings] = useState<any[]>([])
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchMyOrders()
  }, [activeTab])

  const fetchMyOrders = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        console.log("[v0] No user found")
        return
      }

      if (activeTab === "listings") {
        const { data, error } = await supabase
          .from("listings")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("[v0] Error fetching listings:", error)
          throw error
        }
        console.log("[v0] Fetched listings:", data)
        setListings(data || [])
      } else {
        const { data: tradesData, error: tradesError } = await supabase
          .from("trades")
          .select("*")
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order("created_at", { ascending: false })

        if (tradesError) {
          console.error("[v0] Error fetching trades:", tradesError)
          throw tradesError
        }

        console.log("[v0] Fetched trades:", tradesData)

        if (tradesData && tradesData.length > 0) {
          const userIds = [...new Set([...tradesData.map((t) => t.buyer_id), ...tradesData.map((t) => t.seller_id)])]

          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, username, rating, total_trades")
            .in("id", userIds)

          if (profilesError) {
            console.error("[v0] Error fetching profiles:", profilesError)
          }

          const tradesWithProfiles = tradesData.map((trade) => {
            const buyerProfile = profilesData?.find((p) => p.id === trade.buyer_id)
            const sellerProfile = profilesData?.find((p) => p.id === trade.seller_id)
            const otherProfile = trade.buyer_id === user.id ? sellerProfile : buyerProfile

            return {
              ...trade,
              buyer_profile: buyerProfile,
              seller_profile: sellerProfile,
              other_user: otherProfile?.username || "Unknown",
            }
          })

          console.log("[v0] Trades with profiles:", tradesWithProfiles)
          setTrades(tradesWithProfiles)
        } else {
          setTrades([])
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return

    try {
      const { error } = await supabase.from("listings").delete().eq("id", listingId)

      if (error) throw error
      alert("Listing deleted successfully")
      fetchMyOrders()
    } catch (error) {
      console.error("[v0] Error deleting listing:", error)
      alert("Failed to delete listing")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-400"
      case "completed":
        return "text-blue-400"
      case "cancelled":
        return "text-red-400"
      case "pending":
        return "text-yellow-400"
      default:
        return "text-gray-400"
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0f1720, #071124)" }}>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-7 py-9">
          <Link href="/market" className="flex items-center gap-2 text-green-400 hover:text-green-300 mb-6">
            <ArrowLeft size={20} />
            Back to Market
          </Link>

          <h1 className="text-3xl font-bold mb-6">My Orders</h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("listings")}
              className={`px-4 py-2 rounded-3xl font-semibold text-sm transition ${
                activeTab === "listings"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                  : "bg-transparent text-green-400 border border-green-500/30 hover:bg-green-500/10"
              }`}
            >
              My Listings
            </button>
            <button
              onClick={() => setActiveTab("trades")}
              className={`px-4 py-2 rounded-3xl font-semibold text-sm transition ${
                activeTab === "trades"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                  : "bg-transparent text-green-400 border border-green-500/30 hover:bg-green-500/10"
              }`}
            >
              My Trades
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-400">Loading...</div>
            </div>
          ) : activeTab === "listings" ? (
            listings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">No listings yet</div>
                <Link
                  href="/market/create-listing"
                  className="inline-block px-4 py-2 rounded-3xl bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold"
                >
                  Create Listing
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex justify-between items-center p-4 rounded-3xl"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-white">
                        {listing.listing_type === "sell" ? "Selling" : "Buying"} {listing.coin_amount} GX
                      </div>
                      <div className="text-sm text-gray-400">
                        KES {Number(listing.price_per_coin).toFixed(2)} per GX
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {listing.payment_methods?.join(" | ") || "M-Pesa"}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`font-semibold ${getStatusColor(listing.status)}`}>
                        {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                      </div>
                      {listing.status === "active" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/market/edit-listing/${listing.id}`)}
                            className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteListing(listing.id)}
                            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : trades.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400">No trades yet</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {trades.map((trade) => (
                <Link
                  key={trade.id}
                  href={`/market/trade-status/${trade.id}`}
                  className="flex justify-between items-center p-4 rounded-3xl hover:bg-white/10 transition"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-white">
                      {trade.coin_amount} GX - KES {Number(trade.total_price).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-400">With {trade.other_user}</div>
                    <div className="text-xs text-gray-500 mt-1">{trade.payment_method}</div>
                  </div>
                  <div className={`font-semibold ${getStatusColor(trade.status)}`}>
                    {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
