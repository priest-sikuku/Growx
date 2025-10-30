"use client"

import { ArrowLeftRight, Plus, History, FileText, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function P2PMarket() {
  const router = useRouter()
  const [availableBalance, setAvailableBalance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAvailableBalance()
    const interval = setInterval(fetchAvailableBalance, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchAvailableBalance() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setIsLoading(false)
      return
    }

    const { data, error } = await supabase.rpc("get_available_balance", { user_id: user.id })

    if (error) {
      console.error("[v0] Error fetching available balance:", error)
      // Fallback: fetch total_mined from profiles
      const { data: profileData } = await supabase.from("profiles").select("total_mined").eq("id", user.id).single()

      if (profileData) {
        setAvailableBalance(profileData.total_mined || 0)
      }
    } else if (data !== null) {
      setAvailableBalance(data)
    }

    setIsLoading(false)
  }

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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              {/* Available Balance - More prominent display */}
              <div className="glass-card border border-green-500/30 rounded-lg px-4 py-3 bg-green-500/10">
                <div className="flex items-center gap-3">
                  <Wallet size={20} className="text-green-400" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Available Balance</p>
                    <p className="text-xl font-bold text-green-400">
                      {isLoading ? "..." : availableBalance !== null ? `${availableBalance.toFixed(2)} GX` : "0.00 GX"}
                    </p>
                  </div>
                </div>
              </div>

              {/* My Ads and My Trades buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 transition"
                  onClick={() => {
                    router.push("/p2p/my-ads")
                  }}
                >
                  <FileText size={16} />
                  My Ads
                </Button>
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
            </div>

            {/* Main Action Buttons - Horizontally aligned */}
            <div className="flex gap-3">
              <Button
                className="flex-1 h-16 text-sm font-semibold bg-gradient-to-r from-green-500 to-green-600 text-black hover:shadow-lg hover:shadow-green-500/50 transition"
                onClick={() => router.push("/p2p/buy")}
              >
                <div className="flex flex-col items-center gap-1">
                  <ArrowLeftRight size={18} className="rotate-90" />
                  <span>BUY GX</span>
                </div>
              </Button>

              <Button
                className="flex-1 h-16 text-sm font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg hover:shadow-red-500/50 transition text-white"
                onClick={() => router.push("/p2p/sell")}
              >
                <div className="flex flex-col items-center gap-1">
                  <ArrowLeftRight size={18} className="-rotate-90" />
                  <span>SELL GX</span>
                </div>
              </Button>

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
