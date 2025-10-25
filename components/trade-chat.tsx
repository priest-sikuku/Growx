"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { sendTradeMessage, getTradeMessages } from "@/app/actions/trade-chat"
import { toast } from "sonner"
import { Send } from "lucide-react"

interface Message {
  id: string
  message: string
  sender_id: string
  created_at: string
  sender: { full_name: string }
}

export function TradeChat({ tradeId, currentUserId }: { tradeId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 2000)
    return () => clearInterval(interval)
  }, [tradeId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadMessages = async () => {
    const result = await getTradeMessages(tradeId)
    if (result.success) {
      setMessages(result.messages)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    setIsLoading(true)
    const result = await sendTradeMessage(tradeId, newMessage)
    setIsLoading(false)

    if (result.success) {
      setNewMessage("")
      await loadMessages()
    } else {
      toast.error(result.error || "Failed to send message")
    }
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Chat with {currentUserId === "buyer" ? "Seller" : "Buyer"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64 overflow-y-auto space-y-3 bg-muted/30 rounded-lg p-4">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">No messages yet</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender_id === currentUserId ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 ${
                    msg.sender_id === currentUserId ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  <p className="text-xs font-semibold mb-1">{msg.sender.full_name}</p>
                  <p className="text-sm break-words">{msg.message}</p>
                  <p className="text-xs opacity-70 mt-1">{new Date(msg.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !newMessage.trim()} size="sm" className="gap-2">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
