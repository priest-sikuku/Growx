"use client"

import { useState } from "react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useMining } from "@/lib/mining-context"
import { ArrowLeft, CheckCircle, Clock } from "lucide-react"

export default function TradeStatusPage({ params }: { params: { id: string } }) {
  const { activeTrades, completeTrade } = useMining()
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const trade = activeTrades.find((t) => t.id === params.id)

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

  const handleCompleteAndRate = async () => {
    setIsSubmitting(true)
    completeTrade(trade.id, rating, review)
    setTimeout(() => {
      setIsSubmitting(false)
      setShowRatingForm(false)
    }, 1000)
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

          {/* Trade Status Card */}
          <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.04)" }}>
            {/* Status Header */}
            <div className="flex items-center gap-3 mb-8">
              {trade.status === "completed" ? (
                <CheckCircle className="text-green-400" size={32} />
              ) : (
                <Clock className="text-yellow-400" size={32} />
              )}
              <div>
                <h1 className="text-2xl font-bold">
                  Trade {trade.status === "completed" ? "Completed" : "In Progress"}
                </h1>
                <p className="text-gray-400">Trade ID: {trade.id}</p>
              </div>
            </div>

            {/* Trade Details */}
            <div className="grid grid-cols-2 gap-4 mb-8 pb-8 border-b border-white/10">
              <div>
                <div className="text-sm text-gray-400">Trader</div>
                <div className="text-lg font-semibold text-white">{trade.sellerName}</div>
                <div className="text-sm text-yellow-400">⭐ {trade.sellerRating}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Type</div>
                <div className="text-lg font-semibold text-green-400">
                  {trade.type === "buy" ? "Buying" : "Selling"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Amount</div>
                <div className="text-lg font-semibold text-white">{trade.amount} GX</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Price per GX</div>
                <div className="text-lg font-semibold text-green-400">KES {trade.pricePerCoin}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Total</div>
                <div className="text-lg font-semibold text-green-400">KES {trade.totalPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Payment Method</div>
                <div className="text-lg font-semibold text-white">{trade.paymentMethod}</div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div>
                  <div className="font-semibold text-white">Trade Created</div>
                  <div className="text-sm text-gray-400">{trade.createdAt}</div>
                </div>
              </div>
              {trade.status === "completed" && (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <div>
                    <div className="font-semibold text-white">Trade Completed</div>
                    <div className="text-sm text-gray-400">{trade.completedAt}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Rating Section */}
            {trade.status === "completed" && !showRatingForm && (
              <button
                onClick={() => setShowRatingForm(true)}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition"
              >
                Rate This Trade
              </button>
            )}

            {/* Rating Form */}
            {showRatingForm && (
              <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
                <h3 className="font-semibold text-white">Rate Your Experience</h3>

                {/* Star Rating */}
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

                {/* Review */}
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

                {/* Submit Button */}
                <button
                  onClick={handleCompleteAndRate}
                  disabled={isSubmitting}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Rating"}
                </button>
              </div>
            )}

            {/* Existing Rating Display */}
            {trade.buyerRating && (
              <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="font-semibold text-white mb-2">Your Rating</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-400">{"⭐".repeat(trade.buyerRating)}</span>
                  <span className="text-gray-400">{trade.buyerRating}/5</span>
                </div>
                {trade.buyerReview && <p className="text-sm text-gray-300">{trade.buyerReview}</p>}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
