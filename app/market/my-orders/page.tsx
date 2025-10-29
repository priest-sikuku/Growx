"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { ArrowLeft, Edit2, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function MyOrdersPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"ads" | "trades">("ads")
  const [listings, setListings] = useState<any[]>([])
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      fetchData()
    }
  }, [activeTab, currentUserId])

  async function checkAuth() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/auth/sign-in")
      return
    }
    setIsLoggedIn(true)
    setCurrentUserId(user.id)
  }

  async function fetchData() {
    if (!currentUserId) return

    setLoading(true)
    try {
      if (activeTab === "ads") {
        const { data, error } = await supabase
          .from("listings")
          .select("*")
          .eq("user_id", currentUserId)
          .order("created_at", { ascending: false })

        if (error) throw error
        setListings(data || [])
      } else {
        const { data, error } = await supabase
          .from("trades")
          .select("*")
          .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
          .order("created_at", { ascending: false })

        if (error) throw error

        // Fetch usernames for trades
        if (data && data.length > 0) {
          const userIds = [...new Set([...data.map((t) => t.buyer_id), ...data.map((t) => t.seller_id)])]
          const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds)

          const tradesWithUsers = data.map((trade) => ({
            ...trade,
            buyer_username: profiles?.find((p) => p.id === trade.buyer_id)?.username || "Anonymous",
            seller_username: profiles?.find((p) => p.id === trade.seller_id)?.username || "Anonymous",
          }))

          setTrades(tradesWithUsers)
        } else {
          setTrades([])
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteListing(listingId: string) {
    if (!confirm("Are you sure you want to delete this ad?")) return

    try {
      const { error } = await supabase.from("listings").delete().eq("id", listingId)

      if (error) throw error
      alert("Ad deleted successfully")
      fetchData()
    } catch (error) {
      console.error("Error deleting listing:", error)
      alert("Failed to delete ad")
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "active":
        return "text-green-400"
      case "released":
      case "completed":
        return "text-blue-400"
      case "cancelled":
      case "expired":
        return "text-red-400"
      case "pending":
      case "paid":
        return "text-yellow-400"
      default:
        return "text-gray-400"
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0f1720] to-[#071124]">
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <Link href="/market" className="flex items-center gap-2 text-green-400 hover:text-green-300 mb-6">
          <ArrowLeft size={20} />
          Back to Market
        </Link>

        <h1 className="text-3xl font-bold mb-6">My Orders</h1>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab("ads")}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              activeTab === "ads"
                ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            My Ads
          </button>
          <button
            onClick={() => setActiveTab("trades")}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              activeTab === "trades"
                ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            My Trades
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            <p className="mt-4 text-gray-400">Loading...</p>
          </div>
        ) : activeTab === "ads" ? (
          listings.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-2xl">
              <p className="text-gray-400 mb-4">No ads yet</p>
              <Link
                href="/market/create-ad"
                className="inline-block px-6 py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition"
              >
                Create Ad
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                  <div className="flex-1">
                    <div className="font-semibold text-lg">
                      {listing.ad_type === "sell" ? "Selling" : "Buying"} {listing.coin_amount} GX
                    </div>
                    <div className="text-sm text-gray-400">KES {listing.price_per_coin.toFixed(2)} per GX</div>
                    <div className="text-xs text-gray-500 mt-1">{listing.payment_methods.join(", ")}</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`font-semibold ${getStatusColor(listing.status)}`}>
                      {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                    </div>
                    {listing.status === "active" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/market/edit-ad/${listing.id}`)}
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
          <div className="text-center py-12 bg-white/5 rounded-2xl">
            <p className="text-gray-400">No trades yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trades.map((trade) => {
              const isBuyer = trade.buyer_id === currentUserId
              const otherParty = isBuyer ? trade.seller_username : trade.buyer_username

              return (
                <Link
                  key={trade.id}
                  href={`/market/trade/${trade.id}`}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-lg">
                      {isBuyer ? "Buying" : "Selling"} {trade.coin_amount} GX
                    </div>
                    <div className="text-sm text-gray-400">
                      With {otherParty} • KES {trade.total_price.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{trade.payment_method}</div>
                  </div>

                  <div className={`font-semibold ${getStatusColor(trade.status)}`}>
                    {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
