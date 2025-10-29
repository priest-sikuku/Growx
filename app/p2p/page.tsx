"use client"

import { ArrowLeftRight, Plus, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import Footer from "@/components/footer"

export default function P2PMarket() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <ArrowLeftRight size={32} className="text-green-400" />
              <h1 className="text-4xl font-bold">P2P Marketplace</h1>
            </div>
            <p className="text-gray-400">Buy and sell GX coins directly with other users</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-8">
            {/* My Trades Button - Small button above the main actions */}
            <div className="flex justify-end mb-6">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent"
                onClick={() => {
                  // TODO: Navigate to my trades page
                  console.log("[v0] My Trades clicked")
                }}
              >
                <History size={16} />
                My Trades
              </Button>
            </div>

            {/* Main Action Buttons - Horizontally aligned */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* BUY GX Button */}
              <Button
                size="lg"
                className="h-24 text-lg font-semibold bg-green-600 hover:bg-green-700"
                onClick={() => {
                  // TODO: Navigate to buy GX page
                  console.log("[v0] BUY GX clicked")
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <ArrowLeftRight size={24} className="rotate-90" />
                  <span>BUY GX</span>
                </div>
              </Button>

              {/* SELL GX Button */}
              <Button
                size="lg"
                className="h-24 text-lg font-semibold bg-red-600 hover:bg-red-700"
                onClick={() => {
                  // TODO: Navigate to sell GX page
                  console.log("[v0] SELL GX clicked")
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <ArrowLeftRight size={24} className="-rotate-90" />
                  <span>SELL GX</span>
                </div>
              </Button>

              {/* POST AD Button */}
              <Button
                size="lg"
                className="h-24 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  // TODO: Navigate to post ad page
                  console.log("[v0] POST AD clicked")
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <Plus size={24} />
                  <span>POST AD</span>
                </div>
              </Button>
            </div>

            {/* Info Section */}
            <div className="mt-8 pt-8 border-t border-white/10">
              <h3 className="text-lg font-semibold mb-4">How P2P Trading Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <p className="font-semibold">Direct Trading</p>
                    <p className="text-gray-400">Buy and sell GX with other users</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <p className="font-semibold">Secure Escrow</p>
                    <p className="text-gray-400">Protected transactions with escrow system</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <p className="font-semibold">Real-time Chat</p>
                    <p className="text-gray-400">Communicate with traders during transactions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
