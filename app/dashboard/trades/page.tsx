import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TradesList } from "@/components/trades-list"
import { DashboardHeader } from "@/components/dashboard-header"

export default async function TradesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Fetch user's trades
  const { data: trades } = await supabase
    .from("trades")
    .select(
      `
      *,
      buyer:profiles!trades_buyer_id_fkey(id, full_name, referral_code, average_rating, completed_trades),
      seller:profiles!trades_seller_id_fkey(id, full_name, referral_code, average_rating, completed_trades),
      advertisement:advertisements(ad_type)
    `,
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false })

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || user.email?.[0].toUpperCase()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <DashboardHeader userInitials={initials} userName={profile?.full_name || "User"} userEmail={user.email || ""} />

      <main className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="mx-auto max-w-6xl space-y-6">
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>View and manage your active and completed trades</CardDescription>
            </CardHeader>
            <CardContent>
              <TradesList trades={trades || []} currentUserId={user.id} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
