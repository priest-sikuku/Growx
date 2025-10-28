"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function EditListing() {
  const router = useRouter()
  const params = useParams()
  const listingId = params.id as string
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState("")
  const [price, setPrice] = useState("")
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const supabase = createClient()

  const availablePaymentMethods = ["M-Pesa", "Bank Transfer", "Airtel Money"]

  useEffect(() => {
    fetchListing()
  }, [])

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase.from("listings").select("*").eq("id", listingId).single()

      if (error) throw error
      if (data) {
        setAmount(data.coin_amount.toString())
        setPrice(data.price_per_coin.toString())
        setPaymentMethods(data.payment_methods || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching listing:", error)
      alert("Failed to load listing")
      router.push("/market/my-orders")
    } finally {
      setLoading(false)
    }
  }

  const togglePaymentMethod = (method: string) => {
    setPaymentMethods((prev) => (prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]))
  }

  const handleUpdateListing = async () => {
    if (!amount || !price || paymentMethods.length === 0) {
      alert("Please fill in all fields")
      return
    }

    setIsProcessing(true)

    try {
      const { error } = await supabase
        .from("listings")
        .update({
          coin_amount: Number.parseFloat(amount),
          price_per_coin: Number.parseFloat(price),
          payment_methods: paymentMethods,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listingId)

      if (error) throw error

      alert("Listing updated successfully")
      router.push("/market/my-orders")
    } catch (error) {
      console.error("[v0] Error updating listing:", error)
      alert("Failed to update listing")
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(180deg, #0f1720, #071124)" }}
      >
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0f1720, #071124)" }}>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-7 py-9">
          <Link href="/market/my-orders" className="flex items-center gap-2 text-green-400 hover:text-green-300 mb-6">
            <ArrowLeft size={20} />
            Back to My Orders
          </Link>

          <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.04)" }}>
            <h1 className="text-3xl font-bold mb-2">Edit Listing</h1>
            <p className="text-gray-400 mb-8">Update your listing details</p>

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
              </div>

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
                onClick={handleUpdateListing}
                disabled={isProcessing || !amount || !price || paymentMethods.length === 0}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Updating..." : "Update Listing"}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
