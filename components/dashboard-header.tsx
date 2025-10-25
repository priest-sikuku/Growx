"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeftRight, FileText, Store, History, Users } from "lucide-react"
import { ZiroxLogo } from "./zirox-logo"
import { SignOutButton } from "./sign-out-button"

interface DashboardHeaderProps {
  userInitials: string
  userName: string
  userEmail: string
}

export function DashboardHeader({ userInitials, userName, userEmail }: DashboardHeaderProps) {
  const router = useRouter()

  return (
    <div className="bg-gradient-to-br from-background via-muted/20 to-background border-b border-border/50">
      {/* Top row - Logo and Profile Icon */}
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-3 sm:py-4">
          {/* Logo - left aligned */}
          <Link href="/dashboard" className="hover:opacity-80 transition-opacity flex-shrink-0">
            <ZiroxLogo />
          </Link>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-full p-0 w-9 h-9 sm:w-10 sm:h-10 border-2 border-primary hover:border-primary/80 bg-transparent hover:bg-muted/50 transition-all duration-200"
              >
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                  <AvatarFallback className="bg-gradient-to-br from-green-500 to-yellow-500 text-white font-bold text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="cursor-pointer">
                  <History className="mr-2 h-4 w-4" />
                  Profile & History
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  Referrals
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <SignOutButton />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation buttons - horizontal with equal spacing */}
        <div className="flex items-center gap-2 sm:gap-3 pb-3 sm:pb-4">
          {/* P2P Trade Button */}
          <Button
            asChild
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-xs sm:text-sm"
          >
            <Link href="/dashboard/marketplace">
              <ArrowLeftRight className="mr-1.5 h-3.5 sm:h-4 w-3.5 sm:w-4" />
              <span className="hidden sm:inline">P2P</span>
              <span className="sm:hidden">P2P</span>
            </Link>
          </Button>

          {/* My Trades Button */}
          <Button
            asChild
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-xs sm:text-sm"
          >
            <Link href="/dashboard/trades">
              <FileText className="mr-1.5 h-3.5 sm:h-4 w-3.5 sm:w-4" />
              <span className="hidden sm:inline">Trades</span>
              <span className="sm:hidden">Trades</span>
            </Link>
          </Button>

          {/* My Adverts Button */}
          <Button
            asChild
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-xs sm:text-sm"
          >
            <Link href="/dashboard/marketplace">
              <Store className="mr-1.5 h-3.5 sm:h-4 w-3.5 sm:w-4" />
              <span className="hidden sm:inline">Adverts</span>
              <span className="sm:hidden">Ads</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
