"use client"

import { ArrowLeftRight, Plus, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useRouter } from "next/navigation"

export default function P2PMarket() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <ArrowLeftRight size={32} className="text-green-400" />
              <h1 className="text-4xl font-bold">P2P Marketplace</h1>
            </div>
            <p className="text-gray-400">Buy and sell GX coins directly with other users</p>
          </div>

          <div className="glass-card border border-white/10 rounded-xl p-8">
            {/* My Trades Button - Small button above the main actions */}
            <div className="flex justify-end mb-6">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 transition"
                onClick={() => {
                  router.push("/p2p/my-trades")
                }}
              >
                <History size={16} />
                My Trades
              </Button>
            </div>

            {/* Main Action Buttons - Horizontally aligned */}
            <div className="flex gap-3">
              {/* BUY GX Button */}
              <Button
                className="flex-1 h-16 text-sm font-semibold bg-gradient-to-r from-green-500 to-green-600 text-black hover:shadow-lg hover:shadow-green-500/50 transition"
                onClick={() => router.push("/p2p/buy")}
              >
                <div className="flex flex-col items-center gap-1">
                  <ArrowLeftRight size={18} className="rotate-90" />
                  <span>BUY GX</span>
                </div>
              </Button>

              {/* SELL GX Button */}
              <Button
                className="flex-1 h-16 text-sm font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg hover:shadow-red-500/50 transition text-white"
                onClick={() => router.push("/p2p/sell")}
              >
                <div className="flex flex-col items-center gap-1">
                  <ArrowLeftRight size={18} className="-rotate-90" />
                  <span>SELL GX</span>
                </div>
              </Button>

              {/* POST AD Button */}
              <Button
                className="flex-1 h-16 text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg hover:shadow-blue-500/50 transition text-white"
                onClick={() => router.push("/p2p/post-ad")}
              >
                <div className="flex flex-col items-center gap-1">
                  <Plus size={18} />
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
                    <p className="font-semibold text-white">Direct Trading</p>
                    <p className="text-gray-400">Buy and sell GX with other users</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <p className="font-semibold text-white">Secure Escrow</p>
                    <p className="text-gray-400">Protected transactions with escrow system</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <p className="font-semibold text-white">Real-time Chat</p>
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
