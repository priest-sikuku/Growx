"use client"

import { useState } from "react"
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
  const supabase = createClient()

  const availablePaymentMethods = ["M-Pesa", "Bank Transfer", "Airtel Money"]

  const togglePaymentMethod = (method: string) => {
    setPaymentMethods((prev) => (prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]))
  }

  const handleCreateListing = async () => {
    if (!amount || !price || paymentMethods.length === 0 || !paymentAccount) {
      alert("Please fill in all required fields")
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

      console.log("[v0] Creating listing with data:", {
        user_id: user.id,
        listing_type: listingType,
        coin_amount: Number.parseFloat(amount),
        price_per_coin: Number.parseFloat(price),
        payment_methods: paymentMethods,
        terms,
        payment_account: paymentAccount,
        status: "active",
      })

      const { data, error } = await supabase
        .from("listings")
        .insert({
          user_id: user.id,
          listing_type: listingType,
          coin_amount: Number.parseFloat(amount),
          price_per_coin: Number.parseFloat(price),
          payment_methods: paymentMethods,
          terms: terms || null,
          payment_account: paymentAccount,
          status: "active",
        })
        .select()

      if (error) {
        console.error("[v0] Error creating listing:", error)
        throw error
      }

      console.log("[v0] Listing created successfully:", data)
      alert("Listing created successfully!")
      router.push("/market")
    } catch (error) {
      console.error("[v0] Error creating listing:", error)
      alert("Failed to create listing. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0f1720, #071124)" }}>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-7 py-9">
          {/* Back Button */}
          <Link href="/market" className="flex items-center gap-2 text-green-400 hover:text-green-300 mb-6">
            <ArrowLeft size={20} />
            Back to Market
          </Link>

          {/* Create Listing Card */}
          <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.04)" }}>
            <h1 className="text-3xl font-bold mb-2">Create New Listing</h1>
            <p className="text-gray-400 mb-8">Post your GX for sale or create a buy offer</p>

            {/* Listing Type */}
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

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Amount */}
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

              {/* Price per GX */}
              <div>
                <label className="block text-sm font-semibold mb-2">Price per GX (KES)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter price"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>

              {/* Payment Methods */}
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
                  Enter your M-Pesa number or bank account number for payments
                </div>
              </div>

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

              {/* Total Summary */}
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

              {/* Create Button */}
              <button
                onClick={handleCreateListing}
                disabled={isProcessing || !amount || !price || paymentMethods.length === 0 || !paymentAccount}
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
