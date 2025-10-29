"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft } from "lucide-react"

export default function CreateAdPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    ad_type: "sell",
    coin_amount: "",
    price_per_coin: "",
    min_order_amount: "",
    max_order_amount: "",
    payment_methods: [] as string[],
    payment_details: {
      mpesa: "",
      bank_account: "",
      airtel_money: "",
    },
    terms: "",
  })

  const paymentOptions = ["M-Pesa", "Bank Transfer", "Airtel Money"]

  useEffect(() => {
    checkAuth()
  }, [])

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

  function handlePaymentMethodToggle(method: string) {
    setFormData((prev) => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(method)
        ? prev.payment_methods.filter((m) => m !== method)
        : [...prev.payment_methods, method],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId) return

    const coinAmount = Number.parseFloat(formData.coin_amount)
    const pricePerCoin = Number.parseFloat(formData.price_per_coin)
    const minOrder = Number.parseFloat(formData.min_order_amount)
    const maxOrder = Number.parseFloat(formData.max_order_amount)

    if (isNaN(coinAmount) || coinAmount <= 0) {
      alert("Invalid coin amount")
      return
    }

    if (isNaN(pricePerCoin) || pricePerCoin <= 0) {
      alert("Invalid price")
      return
    }

    if (isNaN(minOrder) || minOrder <= 0) {
      alert("Invalid minimum order amount")
      return
    }

    if (isNaN(maxOrder) || maxOrder < minOrder || maxOrder > coinAmount) {
      alert("Invalid maximum order amount")
      return
    }

    if (formData.payment_methods.length === 0) {
      alert("Please select at least one payment method")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from("listings").insert([
        {
          user_id: currentUserId,
          ad_type: formData.ad_type,
          coin_amount: coinAmount,
          price_per_coin: pricePerCoin,
          min_order_amount: minOrder,
          max_order_amount: maxOrder,
          payment_methods: formData.payment_methods,
          payment_details: formData.payment_details,
          terms: formData.terms || null,
          status: "active",
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ])

      if (error) throw error

      alert("Ad posted successfully!")
      router.push("/market")
    } catch (error) {
      console.error("Error creating ad:", error)
      alert("Failed to post ad. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0f1720] to-[#071124]">
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        <Link href="/market" className="flex items-center gap-2 text-green-400 hover:text-green-300 mb-6">
          <ArrowLeft size={20} />
          Back to Market
        </Link>

        <h1 className="text-3xl font-bold mb-6">Post New Ad</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 bg-white/5 rounded-2xl space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Ad Type</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ad_type: "sell" })}
                  className={`flex-1 py-3 rounded-lg font-semibold transition ${
                    formData.ad_type === "sell"
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  I want to Sell GX
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ad_type: "buy" })}
                  className={`flex-1 py-3 rounded-lg font-semibold transition ${
                    formData.ad_type === "buy"
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  I want to Buy GX
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Total Amount (GX)</label>
                <input
                  type="number"
                  value={formData.coin_amount}
                  onChange={(e) => setFormData({ ...formData, coin_amount: e.target.value })}
                  placeholder="100"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Price per GX (KES)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price_per_coin}
                  onChange={(e) => setFormData({ ...formData, price_per_coin: e.target.value })}
                  placeholder="10.50"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Minimum Order (GX)</label>
                <input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                  placeholder="10"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Maximum Order (GX)</label>
                <input
                  type="number"
                  value={formData.max_order_amount}
                  onChange={(e) => setFormData({ ...formData, max_order_amount: e.target.value })}
                  placeholder="100"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Payment Methods</label>
              <div className="flex flex-wrap gap-3">
                {paymentOptions.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => handlePaymentMethodToggle(method)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      formData.payment_methods.includes(method)
                        ? "bg-green-500 text-black"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {formData.payment_methods.includes("M-Pesa") && (
              <div>
                <label className="block text-sm font-medium mb-2">M-Pesa Number</label>
                <input
                  type="text"
                  value={formData.payment_details.mpesa}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      payment_details: { ...formData.payment_details, mpesa: e.target.value },
                    })
                  }
                  placeholder="0712345678"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-500 focus:outline-none"
                />
              </div>
            )}

            {formData.payment_methods.includes("Bank Transfer") && (
              <div>
                <label className="block text-sm font-medium mb-2">Bank Account Details</label>
                <input
                  type="text"
                  value={formData.payment_details.bank_account}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      payment_details: { ...formData.payment_details, bank_account: e.target.value },
                    })
                  }
                  placeholder="Bank Name - Account Number"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-500 focus:outline-none"
                />
              </div>
            )}

            {formData.payment_methods.includes("Airtel Money") && (
              <div>
                <label className="block text-sm font-medium mb-2">Airtel Money Number</label>
                <input
                  type="text"
                  value={formData.payment_details.airtel_money}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      payment_details: { ...formData.payment_details, airtel_money: e.target.value },
                    })
                  }
                  placeholder="0712345678"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Terms (Optional)</label>
              <textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                placeholder="Any special terms or conditions..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/market" className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition text-center">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Posting..." : "Post Ad"}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  )
}
