import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
          Welcome to <span className="text-primary">ZiroX</span>
        </h1>
        <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
          Join our community with a referral code and unlock exclusive benefits. Manage your profile and track your
          referrals.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button asChild size="lg" className="h-12 px-8">
            <Link href="/auth/signup">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-8 bg-transparent">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
