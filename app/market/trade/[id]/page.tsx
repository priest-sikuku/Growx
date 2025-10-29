"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { ArrowLeft, Copy, CheckCircle, Clock, Send } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function TradePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [trade, setTrade] = useState<any>(null)
  const [listing, setListing] = useState<any>(null)
  const [buyer, setBuyer] = useState<any>(null)
  const [seller, setSeller] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [timeRemaining, setTimeRemaining] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchTradeDetails()
    fetchMessages()

    const tradeChannel = supabase
      .channel(`trade-${params.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `id=eq.${params.id}` },
        (payload) => {
          console.log("[v0] Trade updated:", payload)
          setTrade(payload.new)
        },
      )
      .subscribe()

    const messagesChannel = supabase
      .channel(`trade-messages-${params.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trade_messages", filter: `trade_id=eq.${params.id}` },
        (payload) => {
          console.log("[v0] New message:", payload)
          setMessages((prev) => [...prev, payload.new])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tradeChannel)
      supabase.removeChannel(messagesChannel)
    }
  }, [params.id])

  useEffect(() => {
    if (!trade?.expires_at) return

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const expiresAt = new Date(trade.expires_at).getTime()
      const distance = expiresAt - now

      if (distance < 0) {
        setTimeRemaining("EXPIRED")
        clearInterval(interval)
        return
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((distance % (1000 * 60)) / 1000)
      setTimeRemaining(`${minutes}m ${seconds}s`)
    }, 1000)

    return () => clearInterval(interval)
  }, [trade])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function fetchTradeDetails() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setIsLoggedIn(true)
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        setCurrentUser(profile)
      }

      const { data: tradeData, error: tradeError } = await supabase
        .from("trades")
        .select("*")
        .eq("id", params.id)
        .single()

      if (tradeError) {
        console.error("[v0] Trade error:", tradeError)
        throw tradeError
      }

      if (!tradeData) {
        console.error("[v0] No trade found")
        setLoading(false)
        return
      }

      setTrade(tradeData)

      const { data: listingData } = await supabase.from("listings").select("*").eq("id", tradeData.listing_id).single()
      setListing(listingData)

      const { data: buyerData } = await supabase.from("profiles").select("*").eq("id", tradeData.buyer_id).single()
      setBuyer(buyerData)

      const { data: sellerData } = await supabase.from("profiles").select("*").eq("id", tradeData.seller_id).single()
      setSeller(sellerData)
    } catch (error) {
      console.error("[v0] Error fetching trade:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMessages() {
    try {
      const { data, error } = await supabase
        .from("trade_messages")
        .select("*")
        .eq("trade_id", params.id)
        .order("created_at", { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error("[v0] Error fetching messages:", error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return

    try {
      const { error } = await supabase.from("trade_messages").insert({
        trade_id: params.id,
        sender_id: currentUser.id,
        message: newMessage.trim(),
      })

      if (error) throw error
      setNewMessage("")
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      alert("Failed to send message")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleMarkAsPaid = async () => {
    if (!currentUser || currentUser.id !== trade.buyer_id) return

    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from("trades")
        .update({
          status: "payment_confirmed",
          payment_confirmed_at: new Date().toISOString(),
          buyer_confirmed: true,
        })
        .eq("id", trade.id)

      if (error) throw error

      alert("Payment marked as sent! Waiting for seller to release coins.")
      await fetchTradeDetails()
    } catch (error) {
      console.error("[v0] Error marking payment:", error)
      alert("Failed to update payment status")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReleaseCoins = async () => {
    if (!currentUser || currentUser.id !== trade.seller_id) return

    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from("trades")
        .update({
          status: "completed",
          seller_confirmed: true,
          coins_released_at: new Date().toISOString(),
        })
        .eq("id", trade.id)

      if (error) throw error

      alert("Coins released successfully! Trade completed.")
      await fetchTradeDetails()
      router.push(`/market/trade-status/${trade.id}`)
    } catch (error) {
      console.error("[v0] Error releasing coins:", error)
      alert("Failed to release coins. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0f1720, #071124)" }}>
        <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Loading trade...</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!trade) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0f1720, #071124)" }}>
        <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-4">Trade not found</p>
            <Link href="/market" className="text-green-400 hover:text-green-300">
              Back to Market
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const isBuyer = currentUser?.id === trade.buyer_id
  const isSeller = currentUser?.id === trade.seller_id
  const otherParty = isBuyer ? seller : buyer

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0f1720, #071124)" }}>
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link href="/market" className="flex items-center gap-2 text-green-400 hover:text-green-300 mb-4">
            <ArrowLeft size={20} />
            Back to Market
          </Link>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Left: Trade Details */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl p-6 sticky top-4" style={{ background: "rgba(255,255,255,0.04)" }}>
                <h2 className="text-xl font-bold mb-4">Trade Details</h2>

                {timeRemaining && trade.status !== "completed" && trade.status !== "cancelled" && (
                  <div
                    className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                      timeRemaining === "EXPIRED"
                        ? "bg-red-500/20 border border-red-500/50"
                        : "bg-yellow-500/20 border border-yellow-500/50"
                    }`}
                  >
                    <Clock size={20} className={timeRemaining === "EXPIRED" ? "text-red-400" : "text-yellow-400"} />
                    <div>
                      <div className="text-xs text-gray-400">Time Remaining</div>
                      <div className={`font-bold ${timeRemaining === "EXPIRED" ? "text-red-400" : "text-yellow-400"}`}>
                        {timeRemaining}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  <div>
                    <div className="text-xs text-gray-400">Trading With</div>
                    <div className="font-semibold text-white">{otherParty?.username || "Anonymous"}</div>
                    <div className="text-sm text-yellow-400">⭐ {otherParty?.rating?.toFixed(1) || "0.0"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400">Amount</div>
                    <div className="font-semibold text-green-400">{trade.coin_amount} GX</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400">Total Price</div>
                    <div className="font-semibold text-green-400">KES {Number(trade.total_price).toFixed(2)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400">Payment Method</div>
                    <div className="font-semibold text-white">
                      {trade.payment_method || listing?.payment_methods?.[0]}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400">Status</div>
                    <div className="font-semibold text-blue-400 capitalize">{trade.status.replace("_", " ")}</div>
                  </div>
                </div>

                {isBuyer && listing?.payment_account && trade.status !== "completed" && (
                  <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <div className="text-xs text-gray-400 mb-2">Send Payment To:</div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-green-400 text-sm break-all">{listing.payment_account}</span>
                      <button
                        onClick={() => copyToClipboard(listing.payment_account)}
                        className="p-2 hover:bg-white/10 rounded-lg transition flex-shrink-0"
                      >
                        {copied ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {isBuyer && trade.status === "pending" && !trade.buyer_confirmed && (
                    <button
                      onClick={handleMarkAsPaid}
                      disabled={isProcessing}
                      className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50"
                    >
                      {isProcessing ? "Processing..." : "I Have Paid"}
                    </button>
                  )}

                  {isSeller && trade.status === "payment_confirmed" && !trade.seller_confirmed && (
                    <button
                      onClick={handleReleaseCoins}
                      disabled={isProcessing}
                      className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50"
                    >
                      {isProcessing ? "Processing..." : "Release Coins"}
                    </button>
                  )}

                  {isBuyer && trade.status === "payment_confirmed" && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                      <Clock className="mx-auto mb-2 text-yellow-400" size={20} />
                      <p className="text-xs text-gray-300">Waiting for seller to release coins...</p>
                    </div>
                  )}

                  {isSeller && trade.status === "pending" && !trade.buyer_confirmed && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                      <Clock className="mx-auto mb-2 text-yellow-400" size={20} />
                      <p className="text-xs text-gray-300">Waiting for buyer to send payment...</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <p className="text-xs text-gray-300">
                    🔒 {trade.escrow_amount} GX locked in escrow for your protection
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Chat Interface */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl flex flex-col h-[600px]" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="p-4 border-b border-white/10">
                  <h2 className="text-xl font-bold">Trade Chat</h2>
                  <p className="text-sm text-gray-400">Communicate with {otherParty?.username || "the other party"}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-12">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwnMessage = msg.sender_id === currentUser?.id
                      return (
                        <div key={msg.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                              isOwnMessage
                                ? "bg-gradient-to-r from-green-500 to-green-600 text-black"
                                : "bg-white/10 text-white"
                            }`}
                          >
                            <p className="text-sm break-words">{msg.message}</p>
                            <p className={`text-xs mt-1 ${isOwnMessage ? "text-black/60" : "text-gray-400"}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-white/10">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send size={18} />
                      Send
                    </button>
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
