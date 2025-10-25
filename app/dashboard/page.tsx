import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { CopyReferralButton } from "@/components/copy-referral-button"
import { ClaimCoinsCard } from "@/components/claim-coins-card"
import { ArrowLeftRight, FileText, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ZiroxPriceCard } from "@/components/zirox-price-card"
import { DashboardHeader } from "@/components/dashboard-header"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Count referrals
  const { count: referralCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("referred_by", user.id)

  const { data: globalStats } = await supabase.from("global_stats").select("*").eq("id", 1).single()

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || user.email?.[0].toUpperCase()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <DashboardHeader userInitials={initials} userName={profile?.full_name || "User"} userEmail={user.email || ""} />

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Welcome Section */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-lg text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">Welcome back, {profile?.full_name || "User"}!</h2>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <ClaimCoinsCard
            initialCoins={profile?.coins || 0}
            lastClaimTime={profile?.last_claim_time || null}
            referralCount={referralCount || 0}
            globalClaimed={globalStats?.total_claimed || 0}
            globalMax={globalStats?.max_supply || 200000}
          />

          <ZiroxPriceCard />

          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Your Referral Code</CardTitle>
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-3xl font-bold tracking-tight">{profile?.referral_code}</div>
                  <CopyReferralButton code={profile?.referral_code || ""} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Share this link to invite friends</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{referralCount || 0}</div>
                <p className="mt-2 text-xs text-muted-foreground">Friends who joined using your link</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Referral Earnings</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">
                  KES {(profile?.referral_earnings || 0).toFixed(2)}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  10% commission from referral trades + 5% from claims
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Profile Card */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Manage your account details</CardDescription>
                </div>
                <Button asChild variant="outline">
                  <Link href="/dashboard/profile">
                    <FileText className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="mt-1 text-base">{profile?.full_name || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="mt-1 text-base">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Bio</p>
                  <p className="mt-1 text-base">{profile?.bio || "No bio yet"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Referred By</p>
                  <p className="mt-1 text-base">{profile?.referred_by ? "Yes" : "Direct signup"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
