"use client"

import { ArrowLeftRight } from "lucide-react"
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

          {/* Coming Soon Card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ArrowLeftRight size={40} className="text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4">P2P Trading Coming Soon</h2>
              <p className="text-gray-400 mb-6">
                We're building a secure peer-to-peer marketplace where you can trade GX coins directly with other users.
                Stay tuned for updates!
              </p>
              <div className="flex flex-col gap-3 text-left bg-white/5 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <p className="font-semibold">Direct Trading</p>
                    <p className="text-sm text-gray-400">Buy and sell GX with other users</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <p className="font-semibold">Secure Escrow</p>
                    <p className="text-sm text-gray-400">Protected transactions with escrow system</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                  <div>
                    <p className="font-semibold">Real-time Chat</p>
                    <p className="text-sm text-gray-400">Communicate with traders during transactions</p>
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
