import { ArrowUpRight, ArrowDownLeft, TrendingUp, Gift } from "lucide-react"
import { useMining } from "@/lib/mining-context"

export function TransactionHistory() {
  const { transactions } = useMining()

  const getIcon = (type: string) => {
    switch (type) {
      case "mine":
        return <TrendingUp className="w-4 h-4 text-green-400" />
      case "claim":
        return <Gift className="w-4 h-4 text-yellow-400" />
      case "buy":
        return <ArrowDownLeft className="w-4 h-4 text-blue-400" />
      case "sell":
        return <ArrowUpRight className="w-4 h-4 text-purple-400" />
      default:
        return <ArrowUpRight className="w-4 h-4 text-red-400" />
    }
  }

  const getLabel = (type: string) => {
    switch (type) {
      case "mine":
        return "Mining Reward"
      case "claim":
        return "Coins Claimed"
      case "buy":
        return "Bought GX"
      case "sell":
        return "Sold GX"
      default:
        return "Transaction"
    }
  }

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case "mine":
        return "bg-green-500/10"
      case "claim":
        return "bg-yellow-500/10"
      case "buy":
        return "bg-blue-500/10"
      case "sell":
        return "bg-purple-500/10"
      default:
        return "bg-gray-500/10"
    }
  }

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5">
      <h3 className="text-xl font-bold mb-6">Recent Activity</h3>

      <div className="space-y-4">
        {transactions.slice(0, 5).map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getBackgroundColor(tx.type)}`}>{getIcon(tx.type)}</div>
              <div>
                <p className="text-sm font-semibold">{getLabel(tx.type)}</p>
                <p className="text-xs text-gray-400">{tx.time}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-bold ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                {tx.amount > 0 ? "+" : ""}
                {tx.amount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 capitalize">{tx.status}</p>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-6 px-4 py-2 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition text-sm font-semibold">
        View All Transactions
      </button>
    </div>
  )
}
