import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, TrendingUp, Coins } from "lucide-react"
import { SignOutButton } from "@/components/sign-out-button"
import { UsersTable } from "@/components/users-table"
import { SystemSettingsCard } from "@/components/system-settings-card"

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  const isAdmin = user.user_metadata?.role === "admin"
  if (!isAdmin) {
    redirect("/dashboard")
  }

  // Fetch all profiles with user data
  const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

  const { data: settings } = await supabase.from("system_settings").select("*")

  const totalCoins = profiles?.reduce((sum, p) => sum + (p.coins || 0), 0) || 0

  const totalUsers = profiles?.length || 0
  const usersWithReferrals = profiles?.filter((p) => p.referred_by !== null).length || 0
  const totalReferrals = usersWithReferrals

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Claim Admin</h1>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Admin</span>
          </div>
          <SignOutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
            <p className="mt-2 text-muted-foreground">Manage users and configure system settings</p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{totalUsers}</div>
                <p className="mt-2 text-xs text-muted-foreground">Registered accounts</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Referred Users</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{usersWithReferrals}</div>
                <p className="mt-2 text-xs text-muted-foreground">Joined via referral code</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Referral Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">
                  {totalUsers > 0 ? Math.round((usersWithReferrals / totalUsers) * 100) : 0}%
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Users with referral codes</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Coins</CardTitle>
                <Coins className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{totalCoins.toLocaleString()}</div>
                <p className="mt-2 text-xs text-muted-foreground">Coins in circulation</p>
              </CardContent>
            </Card>
          </div>

          {/* System Settings Card */}
          <SystemSettingsCard settings={settings || []} />

          {/* Users Table */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage user accounts, coins, and cooldowns</CardDescription>
            </CardHeader>
            <CardContent>
              <UsersTable profiles={profiles || []} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
