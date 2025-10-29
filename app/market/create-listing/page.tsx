"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useMining } from "@/lib/mining-context"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function CreateListing() {
  const router = useRouter()
  const { balance } = useMining()
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [listingType, setListingType] = useState<"buy" | "sell">("sell")
  const [amount, setAmount] = useState("")
  const [price, setPrice] = useState("")
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [terms, setTerms] = useState("")
  const [paymentAccount, setPaymentAccount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [liveGxPrice, setLiveGxPrice] = useState<number | null>(null)
  const [priceError, setPriceError] = useState("")
  const supabase = createClient()

  const availablePaymentMethods = ["M-Pesa", "Bank Transfer", "Airtel Money"]

  useEffect(() => {
    fetchLivePrice()
    const interval = setInterval(fetchLivePrice, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    validatePrice()
  }, [price, liveGxPrice])

  const fetchLivePrice = async () => {
    try {
      const response = await fetch("/api/gx-price")
      const data = await response.json()
      setLiveGxPrice(data.price)
    } catch (error) {
      console.error("[v0] Error fetching live price:", error)
    }
  }

  const validatePrice = () => {
    if (!price || !liveGxPrice) {
      setPriceError("")
      return
    }

    const priceNum = Number.parseFloat(price)
    const minPrice = liveGxPrice * 0.97
    const maxPrice = liveGxPrice * 1.03

    if (priceNum < minPrice || priceNum > maxPrice) {
      setPriceError(
        `Price must be within ±3% of live GX price (KES ${minPrice.toFixed(2)} - KES ${maxPrice.toFixed(2)})`,
      )
    } else {
      setPriceError("")
    }
  }

  const togglePaymentMethod = (method: string) => {
    setPaymentMethods((prev) => (prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]))
  }

  const handleCreateListing = async () => {
    if (!amount || !price || paymentMethods.length === 0) {
      alert("Please fill in all required fields")
      return
    }

    if (priceError) {
      alert(priceError)
      return
    }

    if (listingType === "sell" && !paymentAccount) {
      alert("Payment account is required for sell listings")
      return
    }

    if (listingType === "sell" && Number.parseFloat(amount) > balance) {
      alert("Insufficient balance to create sell listing")
      return
    }

    setIsProcessing(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        alert("Please sign in to create a listing")
        router.push("/auth/sign-in")
        return
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 3)

      const listingData: any = {
        user_id: user.id,
        listing_type: listingType,
        coin_amount: Number.parseFloat(amount),
        price_per_coin: Number.parseFloat(price),
        payment_methods: paymentMethods,
        terms: terms || null,
        status: "active",
        expires_at: expiresAt.toISOString(),
      }

      if (listingType === "sell") {
        listingData.payment_account = paymentAccount
      }

      console.log("[v0] Creating listing with data:", listingData)

      const { data, error } = await supabase.from("listings").insert(listingData).select()

      if (error) {
        console.error("[v0] Error creating listing:", error)
        alert(`Failed to create listing: ${error.message}`)
        throw error
      }

      console.log("[v0] Listing created successfully:", data)
      alert("Listing created successfully! It will expire in 3 days.")
      router.push("/market")
    } catch (error: any) {
      console.error("[v0] Error creating listing:", error)
      alert(`Failed to create listing: ${error?.message || "Please try again."}`)
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
            <h1 className="text-3xl font-bold mb-2">Create New Listing</h1>
            <p className="text-gray-400 mb-8">Post your GX for sale or create a buy offer</p>

            <div className="mb-8">
              <label className="block text-sm font-semibold mb-3">Listing Type</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setListingType("sell")}
                  className={`flex-1 py-3 rounded-lg font-semibold transition ${
                    listingType === "sell"
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                      : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  Sell GX
                </button>
                <button
                  onClick={() => setListingType("buy")}
                  className={`flex-1 py-3 rounded-lg font-semibold transition ${
                    listingType === "buy"
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                      : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  Buy GX
                </button>
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
                />
                {listingType === "sell" && (
                  <div className="text-xs text-gray-400 mt-1">Your balance: {balance.toFixed(2)} GX</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Price per GX (KES)</label>
                {liveGxPrice && (
                  <div className="mb-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <div className="text-sm text-blue-300">
                      Live GX Price: <span className="font-bold">KES {liveGxPrice.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Allowed range: KES {(liveGxPrice * 0.97).toFixed(2)} - KES {(liveGxPrice * 1.03).toFixed(2)} (±3%)
                    </div>
                  </div>
                )}
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter price"
                  className={`w-full px-4 py-3 rounded-lg bg-white/5 border ${
                    priceError ? "border-red-500" : "border-white/10"
                  } text-white placeholder-gray-500 focus:outline-none focus:border-green-500`}
                />
                {priceError && <div className="text-xs text-red-400 mt-1">{priceError}</div>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3">Accepted Payment Methods</label>
                <div className="space-y-2">
                  {availablePaymentMethods.map((method) => (
                    <label key={method} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paymentMethods.includes(method)}
                        onChange={() => togglePaymentMethod(method)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-white">{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              {listingType === "sell" && (
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Payment Account Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentAccount}
                    onChange={(e) => setPaymentAccount(e.target.value)}
                    placeholder="e.g., M-Pesa: 0712345678 or Bank: 1234567890"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Enter your M-Pesa number or bank account where you'll receive payment
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2">Terms of Trade (Optional)</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="e.g., Payment within 30 minutes, No refunds after confirmation, etc."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              {amount && price && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Value:</span>
                    <span className="text-2xl font-bold text-green-400">
                      KES {(Number.parseFloat(amount) * Number.parseFloat(price)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleCreateListing}
                disabled={
                  isProcessing ||
                  !amount ||
                  !price ||
                  paymentMethods.length === 0 ||
                  (listingType === "sell" && !paymentAccount) ||
                  !!priceError
                }
                className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Creating..." : "Create Listing"}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
