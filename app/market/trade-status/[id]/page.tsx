"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Copy } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

export default function TradeStatusPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [trade, setTrade] = useState<any>(null)
  const [listing, setListing] = useState<any>(null)
  const [buyer, setBuyer] = useState<any>(null)
  const [seller, setSeller] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState("")
  const [copied, setCopied] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchTradeDetails()

    const channel = supabase
      .channel(`trade-${params.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `id=eq.${params.id}` },
        (payload) => {
          console.log("[v0] Trade updated:", payload)
          setTrade(payload.new)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id])

  async function fetchTradeDetails() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setIsLoggedIn(true)
        const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single()
        setCurrentUser(profile)
      }

      const { data: tradeData, error: tradeError } = await supabase
        .from("trades")
        .select("*")
        .eq("id", params.id)
        .single()

      if (tradeError) throw tradeError
      setTrade(tradeData)

      const { data: listingData } = await supabase.from("listings").select("*").eq("id", tradeData.listing_id).single()
      setListing(listingData)

      const { data: buyerData } = await supabase.from("profiles").select("*").eq("user_id", tradeData.buyer_id).single()
      setBuyer(buyerData)

      const { data: sellerData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", tradeData.seller_id)
        .single()
      setSeller(sellerData)
    } catch (error) {
      console.error("[v0] Error fetching trade:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleMarkAsPaid = async () => {
    if (!currentUser || currentUser.user_id !== trade.buyer_id) return

    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from("trades")
        .update({
          status: "payment_confirmed",
          payment_confirmed_at: new Date().toISOString(),
          buyer_confirmed: true,
        })
        .eq("id", trade.id)

      if (error) throw error

      alert("Payment marked as sent! Waiting for seller to release coins.")
      await fetchTradeDetails()
    } catch (error) {
      console.error("[v0] Error marking payment:", error)
      alert("Failed to update payment status")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReleaseCoins = async () => {
    if (!currentUser || currentUser.user_id !== trade.seller_id) return

    setIsProcessing(true)
    try {
      const { error: releaseError } = await supabase.rpc("release_coins_from_escrow", {
        p_trade_id: trade.id,
        p_buyer_id: trade.buyer_id,
        p_amount: trade.coin_amount,
      })

      if (releaseError) throw releaseError

      alert("Coins released successfully! Trade completed.")
      await fetchTradeDetails()
      setShowRatingForm(true)
    } catch (error) {
      console.error("[v0] Error releasing coins:", error)
      alert("Failed to release coins. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmitRating = async () => {
    if (!currentUser) return

    setIsProcessing(true)
    try {
      const { error } = await supabase.from("ratings").insert({
        trade_id: trade.id,
        rater_id: currentUser.user_id,
        rated_user_id: currentUser.user_id === trade.buyer_id ? trade.seller_id : trade.buyer_id,
        rating,
        review,
      })

      if (error) throw error

      const ratedUserId = currentUser.user_id === trade.buyer_id ? trade.seller_id : trade.buyer_id
      const { data: ratings } = await supabase.from("ratings").select("rating").eq("rated_user_id", ratedUserId)

      if (ratings && ratings.length > 0) {
        const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        await supabase
          .from("profiles")
          .update({ rating: avgRating.toFixed(2) })
          .eq("user_id", ratedUserId)
      }

      alert("Rating submitted successfully!")
      setShowRatingForm(false)
      router.push("/market")
    } catch (error) {
      console.error("[v0] Error submitting rating:", error)
      alert("Failed to submit rating")
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Loading...</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!trade) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Trade not found</p>
        </main>
        <Footer />
      </div>
    )
  }

  const isBuyer = currentUser?.user_id === trade.buyer_id
  const isSeller = currentUser?.user_id === trade.seller_id
  const otherParty = isBuyer ? seller : buyer

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0f1720, #071124)" }}>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-7 py-9">
          <Link href="/market" className="flex items-center gap-2 text-green-400 hover:text-green-300 mb-6">
            <ArrowLeft size={20} />
            Back to Market
          </Link>

          <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="flex items-center gap-3 mb-8">
              {trade.status === "completed" ? (
                <CheckCircle className="text-green-400" size={32} />
              ) : trade.status === "payment_confirmed" ? (
                <Clock className="text-blue-400" size={32} />
              ) : (
                <AlertCircle className="text-yellow-400" size={32} />
              )}
              <div>
                <h1 className="text-2xl font-bold">
                  {trade.status === "completed"
                    ? "Trade Completed"
                    : trade.status === "payment_confirmed"
                      ? "Payment Confirmed"
                      : trade.status === "escrow"
                        ? "Coins in Escrow"
                        : "Payment Pending"}
                </h1>
                <p className="text-gray-400 text-sm">Trade ID: {trade.id.slice(0, 8)}...</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8 pb-8 border-b border-white/10">
              <div>
                <div className="text-sm text-gray-400">{isBuyer ? "Seller" : "Buyer"}</div>
                <div className="text-lg font-semibold text-white">{otherParty?.username || "Anonymous"}</div>
                <div className="text-sm text-yellow-400">⭐ {otherParty?.rating || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Amount</div>
                <div className="text-lg font-semibold text-green-400">{trade.coin_amount} GX</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Total Price</div>
                <div className="text-lg font-semibold text-green-400">KES {trade.total_price}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Payment Method</div>
                <div className="text-lg font-semibold text-white">{trade.payment_method}</div>
              </div>
            </div>

            {isBuyer && listing?.payment_account && trade.status !== "completed" && (
              <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="text-sm text-gray-400 mb-2">Send payment to:</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-green-400 text-lg">{listing.payment_account}</span>
                  <button
                    onClick={() => copyToClipboard(listing.payment_account)}
                    className="p-2 hover:bg-white/10 rounded-lg transition"
                  >
                    {copied ? <CheckCircle size={18} className="text-green-400" /> : <Copy size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">via {trade.payment_method}</p>
              </div>
            )}

            <div className="mb-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                <span className="font-semibold text-white">Escrow Status</span>
              </div>
              <p className="text-sm text-gray-300">{trade.escrow_amount} GX locked in escrow</p>
            </div>

            <div className="space-y-4">
              {/* Buyer: Mark as Paid */}
              {isBuyer && trade.status === "escrow" && !trade.buyer_confirmed && (
                <button
                  onClick={handleMarkAsPaid}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "I Have Sent Payment"}
                </button>
              )}

              {/* Seller: Release Coins */}
              {isSeller && trade.status === "payment_confirmed" && !trade.seller_confirmed && (
                <button
                  onClick={handleReleaseCoins}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Release Coins to Buyer"}
                </button>
              )}

              {/* Waiting messages */}
              {isBuyer && trade.status === "payment_confirmed" && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                  <Clock className="mx-auto mb-2 text-yellow-400" size={24} />
                  <p className="text-sm text-gray-300">Waiting for seller to release coins...</p>
                </div>
              )}

              {isSeller && trade.status === "escrow" && !trade.buyer_confirmed && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                  <Clock className="mx-auto mb-2 text-yellow-400" size={24} />
                  <p className="text-sm text-gray-300">Waiting for buyer to send payment...</p>
                </div>
              )}
            </div>

            {trade.status === "completed" && !showRatingForm && (
              <button
                onClick={() => setShowRatingForm(true)}
                className="w-full mt-6 py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold hover:shadow-lg hover:shadow-yellow-500/50 transition"
              >
                Rate This Trade
              </button>
            )}

            {showRatingForm && (
              <div className="mt-6 space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
                <h3 className="font-semibold text-white">Rate {otherParty?.username}</h3>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`text-2xl transition ${rating >= star ? "text-yellow-400" : "text-gray-600"}`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Review (Optional)</label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Share your experience..."
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
                    rows={3}
                  />
                </div>

                <button
                  onClick={handleSubmitRating}
                  disabled={isProcessing}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50"
                >
                  {isProcessing ? "Submitting..." : "Submit Rating"}
                </button>
              </div>
            )}

            <div className="mt-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm text-gray-300">
                🔒 Escrow Protection: Seller's coins are locked until payment is confirmed and released by the seller.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
