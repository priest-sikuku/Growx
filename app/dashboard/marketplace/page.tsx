import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketplaceList } from "@/components/marketplace-list"
import { DashboardHeader } from "@/components/dashboard-header"

export default async function MarketplacePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Fetch active advertisements with user details
  const { data: advertisements } = await supabase
    .from("advertisements")
    .select("*, profiles!advertisements_user_id_fkey(full_name, referral_code)")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  const userCoins = profile?.coins || 0

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
              <CardTitle>Active Advertisements</CardTitle>
              <CardDescription>Browse buy and sell offers from other users</CardDescription>
            </CardHeader>
            <CardContent>
              <MarketplaceList advertisements={advertisements || []} currentUserId={user.id} userCoins={userCoins} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
