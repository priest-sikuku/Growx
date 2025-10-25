"use client"

import { useState } from "react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useMining } from "@/lib/mining-context"
import { Star } from "lucide-react"

export default function RatingsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const { userRating, userTrades, activeTrades } = useMining()

  const completedTrades = activeTrades.filter((t) => t.status === "completed" && t.buyerRating)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0f1720, #071124)" }}>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-7 py-9">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Your Ratings & Reviews</h1>
            <p className="text-gray-400">Build trust in the GrowX community with your trading history</p>
          </div>

          {/* Rating Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Overall Rating */}
            <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="text-center">
                <div className="text-5xl font-bold text-yellow-400 mb-2">{userRating}</div>
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      className={i < Math.floor(userRating) ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}
                    />
                  ))}
                </div>
                <p className="text-gray-400">Overall Rating</p>
              </div>
            </div>

            {/* Total Trades */}
            <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="text-center">
                <div className="text-5xl font-bold text-green-400 mb-2">{userTrades}</div>
                <p className="text-gray-400">Completed Trades</p>
              </div>
            </div>

            {/* Positive Reviews */}
            <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-400 mb-2">{completedTrades.length}</div>
                <p className="text-gray-400">Rated Trades</p>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.04)" }}>
            <h2 className="text-2xl font-bold mb-6">Recent Reviews</h2>

            {completedTrades.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">No reviews yet. Complete trades to earn ratings.</p>
                <Link
                  href="/market"
                  className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition"
                >
                  Start Trading
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {completedTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-white">{trade.sellerName}</h3>
                        <p className="text-sm text-gray-400">
                          {trade.type === "buy" ? "Bought" : "Sold"} {trade.amount} GX at KES {trade.pricePerCoin}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-1 justify-end mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={
                                i < (trade.buyerRating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-600"
                              }
                            />
                          ))}
                        </div>
                        <p className="text-sm text-gray-400">{trade.completedAt}</p>
                      </div>
                    </div>

                    {trade.buyerReview && <p className="text-sm text-gray-300 italic">"{trade.buyerReview}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips Section */}
          <div className="mt-8 rounded-3xl p-8 bg-blue-500/10 border border-blue-500/30">
            <h3 className="font-bold text-white mb-4">Tips to Maintain High Ratings</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>Complete trades promptly and communicate clearly</li>
              <li>Use secure payment methods and verify transactions</li>
              <li>Leave honest reviews to help the community</li>
              <li>Respond to disputes professionally and fairly</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
