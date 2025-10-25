"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

interface MiningContextType {
  balance: number
  totalMined: number
  miningStreak: number
  nextMineTime: number
  isMining: boolean
  pendingReward: number
  transactions: Transaction[]
  userRating: number
  userTrades: number
  activeTrades: Trade[]
  claimedCoins: ClaimedCoin[]
  userId: string | null
  mine: () => Promise<void>
  addTransaction: (transaction: Transaction) => void
  updateBalance: (amount: number) => void
  createTrade: (trade: Omit<Trade, "id" | "createdAt">) => Promise<void>
  completeTrade: (tradeId: string, rating: number, review: string) => Promise<void>
  claimCoins: (amount: number) => Promise<void>
  rateSeller: (sellerId: string, rating: number, review: string) => Promise<void>
  loadUserData: (userId: string) => Promise<void>
}

interface Transaction {
  id: number
  type: "mine" | "trade" | "buy" | "sell" | "claim"
  amount: number
  time: string
  status: "completed" | "pending"
  tradeId?: string
}

interface Trade {
  id: string
  type: "buy" | "sell"
  sellerId: string
  sellerName: string
  sellerRating: number
  sellerTrades: number
  amount: number
  pricePerCoin: number
  totalPrice: number
  paymentMethod: string
  status: "active" | "pending" | "completed" | "cancelled"
  createdAt: string
  completedAt?: string
  buyerRating?: number
  buyerReview?: string
}

interface ClaimedCoin {
  id: string
  amount: number
  claimedAt: string
  expiresAt: string
  status: "active" | "expired"
}

const MiningContext = createContext<MiningContextType | undefined>(undefined)

export function MiningProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [balance, setBalance] = useState(1234.56)
  const [totalMined, setTotalMined] = useState(5432.1)
  const [miningStreak, setMiningStreak] = useState(12)
  const [nextMineTime, setNextMineTime] = useState(2880)
  const [isMining, setIsMining] = useState(false)
  const [pendingReward, setPendingReward] = useState(0)
  const [userRating, setUserRating] = useState(4.8)
  const [userTrades, setUserTrades] = useState(45)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTrades, setActiveTrades] = useState<Trade[]>([])
  const [claimedCoins, setClaimedCoins] = useState<ClaimedCoin[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 1, type: "mine", amount: 45.23, time: "2 hours ago", status: "completed" },
    { id: 2, type: "trade", amount: -100, time: "5 hours ago", status: "completed" },
    { id: 3, type: "mine", amount: 52.1, time: "1 day ago", status: "completed" },
  ])

  useEffect(() => {
    const initializeUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        await loadUserData(user.id)
      }
    }
    initializeUser()
  }, [])

  // Mining timer
  useEffect(() => {
    const interval = setInterval(() => {
      setNextMineTime((prev) => {
        if (prev <= 0) {
          const reward = Math.random() * 50 + 30
          setPendingReward(reward)
          return 7200
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Daily growth calculation
  useEffect(() => {
    const dailyGrowthInterval = setInterval(() => {
      setBalance((prev) => prev * 1.03)
    }, 86400000)
    return () => clearInterval(dailyGrowthInterval)
  }, [])

  const loadUserData = useCallback(async (uid: string) => {
    try {
      const { data: coins } = await supabase.from("coins").select("*").eq("user_id", uid)

      const { data: trades } = await supabase.from("trades").select("*").or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)

      const { data: ratings } = await supabase.from("ratings").select("rating").eq("rated_user_id", uid)

      if (coins) {
        const total = coins.reduce((sum, coin) => sum + Number(coin.amount), 0)
        setBalance(total)
      }

      if (trades) {
        setUserTrades(trades.length)
      }

      if (ratings && ratings.length > 0) {
        const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        setUserRating(avg)
      }
    } catch (error) {
      console.error("[v0] Error loading user data:", error)
    }
  }, [])

  const mine = useCallback(async () => {
    if (isMining || nextMineTime > 0 || !userId) return

    setIsMining(true)
    const reward = Math.random() * 50 + 30
    setPendingReward(reward)

    try {
      setTimeout(async () => {
        const { error } = await supabase.from("transactions").insert({
          user_id: userId,
          type: "mining",
          amount: reward,
          description: "Mining reward",
          status: "completed",
        })

        if (error) throw error

        setBalance((prev) => prev + reward)
        setTotalMined((prev) => prev + reward)
        setMiningStreak((prev) => prev + 1)
        setNextMineTime(7200)

        addTransaction({
          id: transactions.length + 1,
          type: "mine",
          amount: reward,
          time: "just now",
          status: "completed",
        })

        setPendingReward(0)
        setIsMining(false)
      }, 1500)
    } catch (error) {
      console.error("[v0] Mining error:", error)
      setIsMining(false)
    }
  }, [isMining, nextMineTime, userId, transactions.length])

  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions((prev) => [transaction, ...prev])
  }, [])

  const updateBalance = useCallback((amount: number) => {
    setBalance((prev) => prev + amount)
  }, [])

  const createTrade = useCallback(
    async (trade: Omit<Trade, "id" | "createdAt">) => {
      if (!userId) return

      try {
        const newTrade: Trade = {
          ...trade,
          id: `trade-${Date.now()}`,
          createdAt: new Date().toLocaleString(),
        }

        const { error } = await supabase.from("trades").insert({
          buyer_id: trade.type === "buy" ? userId : trade.sellerId,
          seller_id: trade.type === "sell" ? userId : trade.sellerId,
          coin_amount: trade.amount,
          total_price: trade.totalPrice,
          payment_method: trade.paymentMethod,
          status: "pending",
        })

        if (error) throw error

        setActiveTrades((prev) => [newTrade, ...prev])
        addTransaction({
          id: transactions.length + 1,
          type: trade.type,
          amount: trade.amount,
          time: "just now",
          status: "pending",
          tradeId: newTrade.id,
        })
      } catch (error) {
        console.error("[v0] Trade creation error:", error)
      }
    },
    [userId, transactions.length],
  )

  const completeTrade = useCallback(
    async (tradeId: string, rating: number, review: string) => {
      if (!userId) return

      try {
        const { error: tradeError } = await supabase.from("trades").update({ status: "completed" }).eq("id", tradeId)

        if (tradeError) throw tradeError

        const trade = activeTrades.find((t) => t.id === tradeId)
        if (trade) {
          const { error: ratingError } = await supabase.from("ratings").insert({
            trade_id: tradeId,
            rater_id: userId,
            rated_user_id: trade.sellerId,
            rating,
            review,
          })

          if (ratingError) throw ratingError
        }

        setActiveTrades((prev) =>
          prev.map((trade) =>
            trade.id === tradeId
              ? {
                  ...trade,
                  status: "completed",
                  completedAt: new Date().toLocaleString(),
                  buyerRating: rating,
                  buyerReview: review,
                }
              : trade,
          ),
        )

        if (trade) {
          if (trade.type === "buy") {
            setBalance((prev) => prev - trade.totalPrice)
          } else {
            setBalance((prev) => prev + trade.totalPrice)
          }
          setUserTrades((prev) => prev + 1)
        }
      } catch (error) {
        console.error("[v0] Trade completion error:", error)
      }
    },
    [userId, activeTrades],
  )

  const claimCoins = useCallback(
    async (amount: number) => {
      if (balance < amount || !userId) return

      try {
        const lockedUntil = new Date()
        lockedUntil.setDate(lockedUntil.getDate() + 7)

        const { error } = await supabase.from("coins").insert({
          user_id: userId,
          amount,
          claim_type: "claim",
          locked_until: lockedUntil.toISOString(),
          lock_period_days: 7,
          status: "locked",
        })

        if (error) throw error

        const newClaim: ClaimedCoin = {
          id: `claim-${Date.now()}`,
          amount,
          claimedAt: new Date().toLocaleString(),
          expiresAt: lockedUntil.toLocaleString(),
          status: "active",
        }

        setClaimedCoins((prev) => [newClaim, ...prev])
        setBalance((prev) => prev - amount)
        addTransaction({
          id: transactions.length + 1,
          type: "claim",
          amount: -amount,
          time: "just now",
          status: "completed",
        })
      } catch (error) {
        console.error("[v0] Claim coins error:", error)
      }
    },
    [balance, userId, transactions.length],
  )

  const rateSeller = useCallback(
    async (sellerId: string, rating: number, review: string) => {
      if (!userId) return

      try {
        const { error } = await supabase.from("ratings").insert({
          rater_id: userId,
          rated_user_id: sellerId,
          rating,
          review,
        })

        if (error) throw error

        setUserRating((prev) => (prev + rating) / 2)
      } catch (error) {
        console.error("[v0] Rating error:", error)
      }
    },
    [userId],
  )

  return (
    <MiningContext.Provider
      value={{
        balance,
        totalMined,
        miningStreak,
        nextMineTime,
        isMining,
        pendingReward,
        transactions,
        userRating,
        userTrades,
        activeTrades,
        claimedCoins,
        userId,
        mine,
        addTransaction,
        updateBalance,
        createTrade,
        completeTrade,
        claimCoins,
        rateSeller,
        loadUserData,
      }}
    >
      {children}
    </MiningContext.Provider>
  )
}

export function useMining() {
  const context = useContext(MiningContext)
  if (!context) {
    throw new Error("useMining must be used within MiningProvider")
  }
  return context
}
