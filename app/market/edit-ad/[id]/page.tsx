"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft } from "lucide-react"

export default function EditAdPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const [formData, setFormData] = useState({
    coin_amount: "",
    price_per_coin: "",
    min_order_amount: "",
    max_order_amount: "",
    payment_methods: [] as string[],
    terms: "",
  })

  const paymentOptions = ["M-Pesa", "Bank Transfer", "Airtel Money"]

  useEffect(() => {
    checkAuth()
    fetchListing()
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
  }

  async function fetchListing() {
    try {
      const { data, error } = await supabase.from("listings").select("*").eq("id", params.id).single()

      if (error) throw error

      if (data) {
        setFormData({
          coin_amount: data.coin_amount.toString(),
          price_per_coin: data.price_per_coin.toString(),
          min_order_amount: data.min_order_amount.toString(),
          max_order_amount: data.max_order_amount.toString(),
          payment_methods: data.payment_methods || [],
          terms: data.terms || "",
        })
      }
    } catch (error) {
      console.error("Error fetching listing:", error)
      alert("Failed to load ad")
      router.push("/market/my-orders")
    } finally {
      setLoading(false)
    }
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

    setProcessing(true)
    try {
      const { error } = await supabase
        .from("listings")
        .update({
          coin_amount: coinAmount,
          price_per_coin: pricePerCoin,
          min_order_amount: minOrder,
          max_order_amount: maxOrder,
          payment_methods: formData.payment_methods,
          terms: formData.terms || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (error) throw error

      alert("Ad updated successfully!")
      router.push("/market/my-orders")
    } catch (error) {
      console.error("Error updating ad:", error)
      alert("Failed to update ad. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0f1720] to-[#071124]">
        <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">Loading...</div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0f1720] to-[#071124]">
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        <Link href="/market/my-orders" className="flex items-center gap-2 text-green-400 hover:text-green-300 mb-6">
          <ArrowLeft size={20} />
          Back to My Orders
        </Link>

        <h1 className="text-3xl font-bold mb-6">Edit Ad</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 bg-white/5 rounded-2xl space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Total Amount (GX)</label>
                <input
                  type="number"
                  value={formData.coin_amount}
                  onChange={(e) => setFormData({ ...formData, coin_amount: e.target.value })}
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

            <div>
              <label className="block text-sm font-medium mb-2">Terms (Optional)</label>
              <textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/market/my-orders"
              className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={processing}
              className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Updating..." : "Update Ad"}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  )
}
