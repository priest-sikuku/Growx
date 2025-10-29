"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Copy, Check, Clock, Send, AlertCircle } from "lucide-react"

export default function TradePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [trade, setTrade] = useState<any>(null)
  const [listing, setListing] = useState<any>(null)
  const [buyer, setBuyer] = useState<any>(null)
  const [seller, setSeller] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [timeRemaining, setTimeRemaining] = useState("")
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchTradeData()

    const tradeChannel = supabase
      .channel(`trade-${params.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `id=eq.${params.id}` },
        (payload) => {
          setTrade(payload.new)
        },
      )
      .subscribe()

    const messagesChannel = supabase
      .channel(`messages-${params.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trade_messages", filter: `trade_id=eq.${params.id}` },
        (payload) => {
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
      const now = Date.now()
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

  async function checkAuth() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setIsLoggedIn(!!user)
    setCurrentUserId(user?.id || null)
  }

  async function fetchTradeData() {
    try {
      console.log("[v0] Fetching trade with ID:", params.id)

      const { data: tradeData, error: tradeError } = await supabase
        .from("trades")
        .select("*")
        .eq("id", params.id)
        .single()

      if (tradeError) {
        console.error("[v0] Error fetching trade:", tradeError)
        throw tradeError
      }

      console.log("[v0] Trade data fetched:", tradeData)
      setTrade(tradeData)

      const [listingRes, buyerRes, sellerRes, messagesRes] = await Promise.all([
        supabase.from("listings").select("*").eq("id", tradeData.listing_id).single(),
        supabase.from("profiles").select("*").eq("id", tradeData.buyer_id).single(),
        supabase.from("profiles").select("*").eq("id", tradeData.seller_id).single(),
        supabase.from("trade_messages").select("*").eq("trade_id", params.id).order("created_at", { ascending: true }),
      ])

      if (listingRes.error) console.error("[v0] Error fetching listing:", listingRes.error)
      if (buyerRes.error) console.error("[v0] Error fetching buyer:", buyerRes.error)
      if (sellerRes.error) console.error("[v0] Error fetching seller:", sellerRes.error)

      setListing(listingRes.data)
      setBuyer(buyerRes.data)
      setSeller(sellerRes.data)
      setMessages(messagesRes.data || [])
    } catch (error) {
      console.error("[v0] Error in fetchTradeData:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !currentUserId) return

    try {
      console.log("[v0] Sending message:", newMessage)

      const { error } = await supabase.from("trade_messages").insert([
        {
          trade_id: params.id,
          sender_id: currentUserId,
          message: newMessage.trim(),
        },
      ])

      if (error) {
        console.error("[v0] Error sending message:", error)
        throw error
      }

      setNewMessage("")
    } catch (error) {
      console.error("[v0] Failed to send message:", error)
      alert("Failed to send message. Please try again.")
    }
  }

  async function handleMarkAsPaid() {
    if (!currentUserId || currentUserId !== trade.buyer_id) return

    setProcessing(true)
    try {
      console.log("[v0] Marking trade as paid")

      const { error } = await supabase
        .from("trades")
        .update({
          status: "paid",
          buyer_paid_at: new Date().toISOString(),
        })
        .eq("id", trade.id)

      if (error) {
        console.error("[v0] Error marking as paid:", error)
        throw error
      }

      alert("Payment marked! Waiting for seller to release coins.")
    } catch (error) {
      console.error("[v0] Failed to mark payment:", error)
      alert("Failed to mark payment. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  async function handleReleaseCoins() {
    if (!currentUserId || currentUserId !== trade.seller_id) return

    setProcessing(true)
    try {
      console.log("[v0] Releasing coins")

      const { error } = await supabase
        .from("trades")
        .update({
          status: "released",
          seller_released_at: new Date().toISOString(),
        })
        .eq("id", trade.id)

      if (error) {
        console.error("[v0] Error releasing coins:", error)
        throw error
      }

      alert("Coins released! Trade completed successfully.")
      router.push("/market/my-orders")
    } catch (error) {
      console.error("[v0] Failed to release coins:", error)
      alert("Failed to release coins. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0f1720] to-[#071124]">
        <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-4"></div>
            <p className="text-gray-400">Loading trade...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!trade) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0f1720] to-[#071124]">
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

  const isBuyer = currentUserId === trade.buyer_id
  const isSeller = currentUserId === trade.seller_id
  const otherParty = isBuyer ? seller : buyer
  const paymentDetails = listing?.payment_details || {}

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0f1720] to-[#071124]">
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <Link href="/market/my-orders" className="flex items-center gap-2 text-green-400 hover:text-green-300 mb-6">
          <ArrowLeft size={20} />
          Back to Orders
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Trade Details Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 rounded-2xl p-6 sticky top-4 space-y-4">
              <h2 className="text-xl font-bold">Trade Details</h2>

              {timeRemaining && trade.status !== "released" && trade.status !== "cancelled" && (
                <div
                  className={`p-3 rounded-lg flex items-center gap-2 ${
                    timeRemaining === "EXPIRED"
                      ? "bg-red-500/20 border border-red-500/50"
                      : "bg-yellow-500/20 border border-yellow-500/50"
                  }`}
                >
                  <Clock size={20} className={timeRemaining === "EXPIRED" ? "text-red-400" : "text-yellow-400"} />
                  <div>
                    <div className="text-xs text-gray-400">Time Left</div>
                    <div className={`font-bold ${timeRemaining === "EXPIRED" ? "text-red-400" : "text-yellow-400"}`}>
                      {timeRemaining}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-400">Trading With</div>
                  <div className="font-semibold">{otherParty?.username || "Anonymous"}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-400">Amount</div>
                  <div className="font-semibold text-green-400">{trade.coin_amount} GX</div>
                </div>

                <div>
                  <div className="text-xs text-gray-400">Total Price</div>
                  <div className="font-semibold text-green-400">KES {trade.total_price.toFixed(2)}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-400">Payment Method</div>
                  <div className="font-semibold">{trade.payment_method}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-400">Status</div>
                  <div className="font-semibold text-blue-400 capitalize">{trade.status}</div>
                </div>
              </div>

              {isBuyer && trade.status === "pending" && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="text-xs text-gray-400 mb-2">Payment Details:</div>
                  {trade.payment_method === "M-Pesa" && paymentDetails.mpesa && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm">{paymentDetails.mpesa}</span>
                      <button
                        onClick={() => copyToClipboard(paymentDetails.mpesa)}
                        className="p-2 hover:bg-white/10 rounded"
                      >
                        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  )}
                  {trade.payment_method === "Bank Transfer" && paymentDetails.bank_account && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm">{paymentDetails.bank_account}</span>
                      <button
                        onClick={() => copyToClipboard(paymentDetails.bank_account)}
                        className="p-2 hover:bg-white/10 rounded"
                      >
                        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  )}
                  {trade.payment_method === "Airtel Money" && paymentDetails.airtel_money && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm">{paymentDetails.airtel_money}</span>
                      <button
                        onClick={() => copyToClipboard(paymentDetails.airtel_money)}
                        className="p-2 hover:bg-white/10 rounded"
                      >
                        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isBuyer && trade.status === "pending" && (
                <button
                  onClick={handleMarkAsPaid}
                  disabled={processing}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50"
                >
                  {processing ? "Processing..." : "I Have Paid"}
                </button>
              )}

              {isSeller && trade.status === "paid" && (
                <button
                  onClick={handleReleaseCoins}
                  disabled={processing}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50"
                >
                  {processing ? "Processing..." : "Release Coins"}
                </button>
              )}

              {isBuyer && trade.status === "paid" && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                  <Clock className="mx-auto mb-2 text-yellow-400" size={20} />
                  <p className="text-xs text-gray-300">Waiting for seller to release coins...</p>
                </div>
              )}

              {isSeller && trade.status === "pending" && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                  <Clock className="mx-auto mb-2 text-yellow-400" size={20} />
                  <p className="text-xs text-gray-300">Waiting for buyer to send payment...</p>
                </div>
              )}

              {trade.status === "released" && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                  <Check className="mx-auto mb-2 text-green-400" size={20} />
                  <p className="text-xs text-gray-300">Trade completed successfully!</p>
                </div>
              )}

              {trade.status === "expired" && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                  <AlertCircle className="mx-auto mb-2 text-red-400" size={20} />
                  <p className="text-xs text-gray-300">Trade expired</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 rounded-2xl flex flex-col h-[600px]">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-xl font-bold">Trade Chat</h2>
                <p className="text-sm text-gray-400">Communicate with {otherParty?.username}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                            isOwn ? "bg-gradient-to-r from-green-500 to-green-600 text-black" : "bg-white/10"
                          }`}
                        >
                          <p className="text-sm break-words">{msg.message}</p>
                          <p className={`text-xs mt-1 ${isOwn ? "text-black/60" : "text-gray-400"}`}>
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
                    className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-green-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-black font-semibold hover:shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send size={18} />
                  </button>
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
