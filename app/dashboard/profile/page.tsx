import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfileForm } from "@/components/profile-form"
import { Star, Award } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const getReputationBadge = (completedTrades: number) => {
    if (completedTrades >= 100) return { label: "Platinum", color: "text-purple-500" }
    if (completedTrades >= 50) return { label: "Gold", color: "text-yellow-500" }
    if (completedTrades >= 20) return { label: "Silver", color: "text-gray-400" }
    if (completedTrades >= 5) return { label: "Bronze", color: "text-orange-600" }
    return { label: "Newcomer", color: "text-blue-500" }
  }

  const reputation = getReputationBadge(profile?.completed_trades || 0)

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
        <div className="mx-auto max-w-2xl space-y-6">
          <Card className="border-border/50 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className={`h-5 w-5 ${reputation.color}`} />
                Trader Reputation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{profile?.completed_trades || 0}</div>
                  <p className="text-sm text-muted-foreground">Completed Trades</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-2xl font-bold">{profile?.average_rating?.toFixed(1) || "0.0"}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${reputation.color}`}>{reputation.label}</div>
                  <p className="text-sm text-muted-foreground">Status</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm profile={profile} userId={user.id} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
