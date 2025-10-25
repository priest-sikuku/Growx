"use client"

import { useState } from "react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useMining } from "@/lib/mining-context"
import { ChevronRight } from "lucide-react"

export default function Market() {
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy")
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null)
  const { activeTrades, createTrade } = useMining()

  const buyListings = [
    {
      id: "seller-1",
      name: "CryptoKing",
      rating: 4.9,
      trades: 128,
      price: 125.0,
      paymentMethods: ["M-Pesa", "Bank Transfer"],
      available: 500,
    },
    {
      id: "seller-2",
      name: "TraderJane",
      rating: 4.7,
      trades: 93,
      price: 123.5,
      paymentMethods: ["M-Pesa"],
      available: 250,
    },
    {
      id: "seller-3",
      name: "SmartP2P",
      rating: 5.0,
      trades: 220,
      price: 126.0,
      paymentMethods: ["Airtel Money", "M-Pesa"],
      available: 1000,
    },
    {
      id: "seller-4",
      name: "FastTrader",
      rating: 4.8,
      trades: 156,
      price: 124.5,
      paymentMethods: ["M-Pesa"],
      available: 350,
    },
    {
      id: "seller-5",
      name: "SecureExchange",
      rating: 4.6,
      trades: 89,
      price: 122.0,
      paymentMethods: ["Bank Transfer"],
      available: 600,
    },
  ]

  const sellListings = [
    {
      id: "buyer-1",
      name: "BuyerPro",
      rating: 4.9,
      trades: 145,
      price: 124.0,
      paymentMethods: ["M-Pesa", "Bank Transfer"],
      available: 800,
    },
    {
      id: "buyer-2",
      name: "GXCollector",
      rating: 4.7,
      trades: 78,
      price: 122.5,
      paymentMethods: ["M-Pesa"],
      available: 400,
    },
    {
      id: "buyer-3",
      name: "TrustTrade",
      rating: 5.0,
      trades: 203,
      price: 125.5,
      paymentMethods: ["Bank Transfer", "Airtel Money"],
      available: 1200,
    },
  ]

  const currentListings = activeTab === "buy" ? buyListings : sellListings

  const handleTradeClick = (listing: any) => {
    setSelectedTrade(listing.id)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0f1720, #071124)" }}>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-7 py-9">
          {/* P2P Header */}
          <div className="flex justify-between items-center mt-7">
            <h2 className="text-2xl font-bold">P2P Marketplace</h2>
            <Link
              href="/market/create-listing"
              className="px-4 py-2 rounded-3xl border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition font-semibold text-sm"
            >
              + Make Advert
            </Link>
          </div>

          {/* Tab Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab("buy")}
              className={`px-4 py-2 rounded-3xl font-semibold text-sm transition ${
                activeTab === "buy"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                  : "bg-transparent text-green-400 border border-green-500/30 hover:bg-green-500/10"
              }`}
            >
              Buy GX
            </button>
            <button
              onClick={() => setActiveTab("sell")}
              className={`px-4 py-2 rounded-3xl font-semibold text-sm transition ${
                activeTab === "sell"
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                  : "bg-transparent text-green-400 border border-green-500/30 hover:bg-green-500/10"
              }`}
            >
              Sell GX
            </button>
          </div>

          {/* Trade Listings */}
          <div className="mt-6 flex flex-col gap-3">
            {currentListings.map((listing) => (
              <Link
                key={listing.id}
                href={`/market/trade/${listing.id}?type=${activeTab}`}
                className="flex justify-between items-center p-4 rounded-3xl transition hover:bg-white/10 cursor-pointer group"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                {/* Trader Info */}
                <div className="flex flex-col flex-1">
                  <div className="font-semibold text-white group-hover:text-green-400 transition">{listing.name}</div>
                  <div className="text-yellow-400 text-sm">
                    ⭐ {listing.rating} ({listing.trades} trades)
                  </div>
                </div>

                {/* Price & Payment */}
                <div className="text-right flex-1">
                  <div className="font-bold text-green-400">KES {listing.price.toFixed(2)} / GX</div>
                  <div className="text-gray-400 text-xs">{listing.paymentMethods.join(" | ")}</div>
                </div>

                {/* Available & Action */}
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Available</div>
                    <div className="font-semibold text-green-400">{listing.available} GX</div>
                  </div>
                  <button className="px-4 py-2 rounded-3xl bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold text-sm hover:shadow-lg hover:shadow-green-500/50 transition flex items-center gap-2">
                    {activeTab === "buy" ? "Buy" : "Sell"}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </Link>
            ))}
          </div>

          {/* Active Trades Section */}
          {activeTrades.length > 0 && (
            <div className="mt-12">
              <h3 className="text-xl font-bold mb-4">Your Active Trades</h3>
              <div className="flex flex-col gap-3">
                {activeTrades.map((trade) => (
                  <Link
                    key={trade.id}
                    href={`/market/trade-status/${trade.id}`}
                    className="flex justify-between items-center p-4 rounded-3xl transition hover:bg-white/10"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <div>
                      <div className="font-semibold text-white">{trade.sellerName}</div>
                      <div className="text-sm text-gray-400">
                        {trade.type === "buy" ? "Buying" : "Selling"} {trade.amount} GX at KES {trade.pricePerCoin}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-400">KES {trade.totalPrice.toFixed(2)}</div>
                      <div className={`text-sm ${trade.status === "completed" ? "text-green-400" : "text-yellow-400"}`}>
                        {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
