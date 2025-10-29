"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, User, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
}

export default function BuyGXPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [initiatingTrade, setInitiatingTrade] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchSellAds()
  }, [])

  async function fetchSellAds() {
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
        .eq("ad_type", "sell")
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

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        alert("Please sign in to trade")
        return
      }

      // Call RPC function to initiate trade and move coins to escrow
      const { data: tradeId, error } = await supabase.rpc("initiate_p2p_trade", {
        p_ad_id: ad.id,
        p_buyer_id: user.id,
        p_seller_id: ad.user_id,
        p_gx_amount: ad.gx_amount,
      })

      if (error) {
        console.error("[v0] Error initiating trade:", error)
        alert(error.message || "Failed to initiate trade")
        return
      }

      // Redirect to trade page
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
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" className="mb-4" onClick={() => router.push("/p2p")}>
              <ArrowLeft size={20} className="mr-2" />
              Back to P2P
            </Button>
            <h1 className="text-4xl font-bold mb-2">Buy GX</h1>
            <p className="text-gray-400">Browse available sell offers and buy GX from other users</p>
          </div>

          {/* Ads List */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Loading ads...</p>
            </div>
          ) : ads.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No sell ads available at the moment</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {ads.map((ad) => (
                <Card key={ad.id} className="p-6 bg-white/5 border-white/10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left Side - Ad Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <User size={20} className="text-green-400" />
                        <span className="font-semibold">
                          {ad.profiles?.username || ad.profiles?.email || "Anonymous"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-400">Amount</p>
                          <p className="font-semibold text-green-400">{ad.gx_amount} GX</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Limit</p>
                          <p className="font-semibold">
                            {ad.min_amount} - {ad.max_amount} GX
                          </p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-400">Payment Methods</p>
                        <p className="text-sm">{getPaymentMethods(ad)}</p>
                      </div>

                      {ad.terms_of_trade && (
                        <div>
                          <p className="text-sm text-gray-400">Terms</p>
                          <p className="text-sm">{ad.terms_of_trade}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                        <Clock size={14} />
                        <span>Posted {new Date(ad.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Right Side - Action Button */}
                    <div>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => initiateTrade(ad)}
                        disabled={initiatingTrade === ad.id}
                      >
                        {initiatingTrade === ad.id ? "Initiating..." : "Buy Now"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
