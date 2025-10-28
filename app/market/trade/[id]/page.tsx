"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { ArrowLeft, Copy, CheckCircle } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

export default function TradePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [listing, setListing] = useState<any>(null)
  const [seller, setSeller] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchListingAndUser()
  }, [params.id])

  async function fetchListingAndUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setIsLoggedIn(true)
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        setCurrentUser(profile)
      }

      const { data: listingData, error: listingError } = await supabase
        .from("listings")
        .select("*")
        .eq("id", params.id)
        .single()

      if (listingError) {
        console.error("[v0] Listing error:", listingError)
        throw listingError
      }

      if (!listingData) {
        console.error("[v0] No listing found")
        setLoading(false)
        return
      }

      setListing(listingData)

      const { data: sellerData, error: sellerError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", listingData.user_id)
        .single()

      if (sellerError) {
        console.error("[v0] Seller error:", sellerError)
        throw sellerError
      }

      if (!sellerData) {
        console.error("[v0] No seller found for user_id:", listingData.user_id)
      }

      setSeller(sellerData)
    } catch (error) {
      console.error("[v0] Error fetching listing:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-4">Listing not found</p>
            <Link href="/market" className="text-green-400 hover:text-green-300">
              Back to Market
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-4">Seller not found</p>
            <Link href="/market" className="text-green-400 hover:text-green-300">
              Back to Market
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const totalPrice = amount ? Number.parseFloat(amount) * listing.price : 0
  const isSellListing = listing.listing_type === "sell"

  const handleInitiateTrade = async () => {
    if (!amount || !paymentMethod) {
      alert("Please fill in all fields")
      return
    }

    if (!currentUser) {
      alert("Please sign in to trade")
      router.push("/auth/sign-in")
      return
    }

    const coinAmount = Number.parseFloat(amount)
    if (coinAmount > listing.amount) {
      alert("Amount exceeds available coins")
      return
    }

    setIsProcessing(true)

    try {
      const { data: trade, error: tradeError } = await supabase
        .from("trades")
        .insert({
          listing_id: listing.id,
          buyer_id: currentUser.buyer_id,
          seller_id: seller.seller_id,
          coin_amount: coinAmount,
          total_price: totalPrice,
          payment_method: paymentMethod,
          status: "payment_pending",
          escrow_amount: coinAmount,
        })
        .select()
        .single()

      if (tradeError) throw tradeError

      const { error: escrowError } = await supabase.rpc("move_coins_to_escrow", {
        p_trade_id: trade.id,
        p_seller_id: seller.seller_id,
        p_amount: coinAmount,
      })

      if (escrowError) {
        console.error("[v0] Escrow error:", escrowError)
      }

      await supabase
        .from("listings")
        .update({ amount: listing.amount - coinAmount })
        .eq("id", listing.id)

      alert("Trade initiated! Coins moved to escrow. Please proceed to payment.")
      router.push(`/market/trade-status/${trade.id}`)
    } catch (error) {
      console.error("[v0] Error creating trade:", error)
      alert("Failed to create trade. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

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
            <h1 className="text-3xl font-bold mb-2">{isSellListing ? "Buy GX from" : "Sell GX to"}</h1>
            <p className="text-gray-400 mb-8">{seller.username || "Anonymous"}</p>

            <div className="grid grid-cols-3 gap-4 mb-8 pb-8 border-b border-white/10">
              <div>
                <div className="text-sm text-gray-400">Rating</div>
                <div className="text-xl font-bold text-yellow-400">⭐ {seller.rating || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Trades</div>
                <div className="text-xl font-bold text-green-400">{seller.total_trades || 0}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Price per GX</div>
                <div className="text-xl font-bold text-green-400">KES {listing.price}</div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Amount (GX)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  max={listing.amount}
                />
                <div className="text-xs text-gray-400 mt-1">Available: {listing.amount} GX</div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Select payment method</option>
                  {listing.payment_methods?.map((method: string) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              {isSellListing && listing.payment_account && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="text-sm text-gray-400 mb-2">Payment Account</div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-green-400">{listing.payment_account}</span>
                    <button
                      onClick={() => copyToClipboard(listing.payment_account)}
                      className="p-2 hover:bg-white/10 rounded-lg transition"
                    >
                      {copied ? <CheckCircle size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {listing.terms && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="text-sm text-gray-400 mb-2">Terms of Trade</div>
                  <p className="text-sm text-gray-300">{listing.terms}</p>
                </div>
              )}

              {amount && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Price:</span>
                    <span className="text-2xl font-bold text-green-400">KES {totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleInitiateTrade}
                disabled={isProcessing || !amount || !paymentMethod}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing..." : `${isSellListing ? "Buy" : "Sell"} GX`}
              </button>
            </div>

            <div className="mt-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm text-gray-300">
                🔒 This trade is protected by escrow. Seller's coins are locked until payment is confirmed and released.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
