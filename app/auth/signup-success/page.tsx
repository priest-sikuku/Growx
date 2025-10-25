import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SignupSuccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-6">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Check your email</CardTitle>
            <CardDescription className="text-base">
              We've sent you a confirmation link to verify your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Please check your email and click the confirmation link to activate your account. Once confirmed, you can
              sign in.
            </p>
            <Button asChild className="w-full">
              <Link href="/auth/login">Go to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
