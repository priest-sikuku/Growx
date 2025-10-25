"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useMining } from "@/lib/mining-context"
import { ArrowLeft } from "lucide-react"

export default function TradePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { createTrade, balance } = useMining()
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const tradeType = searchParams.get("type") as "buy" | "sell"

  const sellers: Record<string, any> = {
    "seller-1": {
      name: "CryptoKing",
      rating: 4.9,
      trades: 128,
      price: 125.0,
      paymentMethods: ["M-Pesa", "Bank Transfer"],
      available: 500,
    },
    "seller-2": {
      name: "TraderJane",
      rating: 4.7,
      trades: 93,
      price: 123.5,
      paymentMethods: ["M-Pesa"],
      available: 250,
    },
    "seller-3": {
      name: "SmartP2P",
      rating: 5.0,
      trades: 220,
      price: 126.0,
      paymentMethods: ["Airtel Money", "M-Pesa"],
      available: 1000,
    },
    "buyer-1": {
      name: "BuyerPro",
      rating: 4.9,
      trades: 145,
      price: 124.0,
      paymentMethods: ["M-Pesa", "Bank Transfer"],
      available: 800,
    },
    "buyer-2": {
      name: "GXCollector",
      rating: 4.7,
      trades: 78,
      price: 122.5,
      paymentMethods: ["M-Pesa"],
      available: 400,
    },
    "buyer-3": {
      name: "TrustTrade",
      rating: 5.0,
      trades: 203,
      price: 125.5,
      paymentMethods: ["Bank Transfer", "Airtel Money"],
      available: 1200,
    },
  }

  const seller = sellers[params.id]
  if (!seller) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Seller not found</p>
        </main>
        <Footer />
      </div>
    )
  }

  const totalPrice = amount ? Number.parseFloat(amount) * seller.price : 0

  const handleInitiateTrade = async () => {
    if (!amount || !paymentMethod) {
      alert("Please fill in all fields")
      return
    }

    if (tradeType === "buy" && totalPrice > balance) {
      alert("Insufficient balance")
      return
    }

    setIsProcessing(true)

    createTrade({
      type: tradeType,
      sellerId: params.id,
      sellerName: seller.name,
      sellerRating: seller.rating,
      sellerTrades: seller.trades,
      amount: Number.parseFloat(amount),
      pricePerCoin: seller.price,
      totalPrice,
      paymentMethod,
      status: "pending",
    })

    setTimeout(() => {
      setIsProcessing(false)
      router.push("/market")
    }, 1500)
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

          {/* Trade Card */}
          <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.04)" }}>
            <h1 className="text-3xl font-bold mb-2">{tradeType === "buy" ? "Buy GX from" : "Sell GX to"}</h1>
            <p className="text-gray-400 mb-8">{seller.name}</p>

            {/* Seller Info */}
            <div className="grid grid-cols-3 gap-4 mb-8 pb-8 border-b border-white/10">
              <div>
                <div className="text-sm text-gray-400">Rating</div>
                <div className="text-xl font-bold text-yellow-400">⭐ {seller.rating}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Trades</div>
                <div className="text-xl font-bold text-green-400">{seller.trades}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Price per GX</div>
                <div className="text-xl font-bold text-green-400">KES {seller.price}</div>
              </div>
            </div>

            {/* Trade Form */}
            <div className="space-y-6">
              {/* Amount Input */}
              <div>
                <label className="block text-sm font-semibold mb-2">Amount (GX)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  max={seller.available}
                />
                <div className="text-xs text-gray-400 mt-1">Available: {seller.available} GX</div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-semibold mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Select payment method</option>
                  {seller.paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              {/* Total Price */}
              {amount && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Price:</span>
                    <span className="text-2xl font-bold text-green-400">KES {totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleInitiateTrade}
                disabled={isProcessing || !amount || !paymentMethod}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing..." : `${tradeType === "buy" ? "Buy" : "Sell"} GX`}
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm text-gray-300">
                This trade will be protected by escrow. Both parties must confirm before funds are released.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
