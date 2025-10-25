"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ZiroxLogo } from "@/components/zirox-logo"
import { DashboardHeader } from "@/components/dashboard-header"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface AppHeaderProps {
  userInitials?: string
  userName?: string
  userEmail?: string
}

export function AppHeader({ userInitials, userName, userEmail }: AppHeaderProps) {
  const pathname = usePathname()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
          setProfile(data)
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  // If we're on a dashboard page, use the full DashboardHeader
  if (pathname?.startsWith("/dashboard")) {
    return (
      <DashboardHeader
        userInitials={
          userInitials ||
          profile?.full_name
            ?.split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase() ||
          "U"
        }
        userName={userName || profile?.full_name || "User"}
        userEmail={userEmail || ""}
      />
    )
  }

  // For other pages, show a simple header with logo and back link
  return (
    <header className="border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ZiroxLogo size="sm" />
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">/</span>
            <span className="font-medium capitalize">{pathname?.split("/").pop() || "Page"}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
