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
  const [balance, setBalance] = useState(0.0)
  const [totalMined, setTotalMined] = useState(0.0)
  const [miningStreak, setMiningStreak] = useState(0)
  const [nextMineTime, setNextMineTime] = useState(0)
  const [isMining, setIsMining] = useState(false)
  const [pendingReward, setPendingReward] = useState(0)
  const [userRating, setUserRating] = useState(0.0)
  const [userTrades, setUserTrades] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTrades, setActiveTrades] = useState<Trade[]>([])
  const [claimedCoins, setClaimedCoins] = useState<ClaimedCoin[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

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

  useEffect(() => {
    if (!userId) return

    const interval = setInterval(() => {
      setNextMineTime((prev) => {
        if (prev <= 0) {
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [userId])

  useEffect(() => {
    const dailyGrowthInterval = setInterval(() => {
      setBalance((prev) => prev * 1.03)
    }, 86400000)
    return () => clearInterval(dailyGrowthInterval)
  }, [])

  const loadUserData = useCallback(async (uid: string) => {
    try {
      console.log("[v0] Loading user data for:", uid)

      const { data: profile } = await supabase
        .from("profiles")
        .select("rating, total_trades, referral_code")
        .eq("id", uid)
        .single()

      if (profile) {
        console.log("[v0] Profile loaded:", profile)
        setUserRating(Number(profile.rating) || 0.0)
        setUserTrades(Number(profile.total_trades) || 0)
      } else {
        console.log("[v0] No profile found, setting defaults")
        setUserRating(0.0)
        setUserTrades(0)
      }

      const { data: coins } = await supabase.from("coins").select("*").eq("user_id", uid)

      const { data: trades } = await supabase.from("trades").select("*").or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)

      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(10)

      if (coins && coins.length > 0) {
        const total = coins.reduce((sum, coin) => sum + Number(coin.amount), 0)
        setBalance(total)
        console.log("[v0] Balance loaded:", total)
      } else {
        console.log("[v0] No coins found, setting balance to 0")
        setBalance(0.0)
      }

      if (transactionsData && transactionsData.length > 0) {
        const formattedTransactions = transactionsData.map((tx, index) => ({
          id: index + 1,
          type: tx.type as "mine" | "trade" | "buy" | "sell" | "claim",
          amount: Number(tx.amount),
          time: new Date(tx.created_at).toLocaleString(),
          status: tx.status as "completed" | "pending",
        }))
        setTransactions(formattedTransactions)
        console.log("[v0] Transactions loaded:", formattedTransactions.length)
      } else {
        console.log("[v0] No transactions found")
        setTransactions([])
      }
    } catch (error) {
      console.error("[v0] Error loading user data:", error)
      setBalance(0.0)
      setUserRating(0.0)
      setUserTrades(0)
      setTransactions([])
    }
  }, [])

  const mine = useCallback(async () => {
    if (isMining || nextMineTime > 0 || !userId) {
      console.log("[v0] Mining blocked:", { isMining, nextMineTime, userId })
      return
    }

    console.log("[v0] Starting mining...")
    setIsMining(true)
    const reward = Math.random() * 50 + 30 // 30-80 GX
    setPendingReward(reward)

    try {
      const { data: coinData, error: coinError } = await supabase
        .from("coins")
        .insert({
          user_id: userId,
          amount: reward,
          claim_type: "mining",
          status: "available",
        })
        .select()
        .single()

      if (coinError) {
        console.error("[v0] Coin insert error:", coinError)
        throw coinError
      }

      console.log("[v0] Coin inserted:", coinData)

      const { error: txError } = await supabase.from("transactions").insert({
        user_id: userId,
        type: "mining",
        amount: reward,
        description: "Mining reward",
        status: "completed",
      })

      if (txError) {
        console.error("[v0] Transaction insert error:", txError)
        throw txError
      }

      console.log("[v0] Transaction recorded")

      setBalance((prev) => prev + reward)
      setTotalMined((prev) => prev + reward)
      setMiningStreak((prev) => prev + 1)
      setNextMineTime(7200) // Reset to 2 hours

      addTransaction({
        id: transactions.length + 1,
        type: "mine",
        amount: reward,
        time: "just now",
        status: "completed",
      })

      console.log("[v0] Mining completed! Reward:", reward)

      setTimeout(() => {
        setPendingReward(0)
        setIsMining(false)
      }, 2000)
    } catch (error) {
      console.error("[v0] Mining error:", error)
      setPendingReward(0)
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
