"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { CheckCircle2, XCircle } from "lucide-react"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidatingCode, setIsValidatingCode] = useState(false)
  const [codeValidation, setCodeValidation] = useState<"valid" | "invalid" | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const refCode = searchParams.get("ref")
    if (refCode) {
      const upperCode = refCode.toUpperCase()
      setReferralCode(upperCode)
      validateReferralCode(upperCode)
    }
  }, [searchParams])

  const validateReferralCode = async (code: string) => {
    if (!code) {
      setCodeValidation(null)
      return
    }

    setIsValidatingCode(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("referral_code", code.toUpperCase())
        .single()

      if (error || !data) {
        setCodeValidation("invalid")
      } else {
        setCodeValidation("valid")
      }
    } catch {
      setCodeValidation("invalid")
    } finally {
      setIsValidatingCode(false)
    }
  }

  const handleReferralCodeChange = (value: string) => {
    const upperValue = value.toUpperCase()
    setReferralCode(upperValue)

    // Debounce validation
    if (upperValue.length >= 6) {
      const timer = setTimeout(() => validateReferralCode(upperValue), 500)
      return () => clearTimeout(timer)
    } else {
      setCodeValidation(null)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    // Validate referral code if provided
    if (referralCode && codeValidation !== "valid") {
      setError("Please enter a valid referral code or leave it empty")
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
            referred_by: referralCode || null,
          },
        },
      })

      if (error) throw error

      router.push("/auth/signup-success")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-6">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold tracking-tight">Create an account</CardTitle>
            <CardDescription className="text-base">Enter your details to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referralCode">
                  Referral Code <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="referralCode"
                    type="text"
                    placeholder="Enter code"
                    value={referralCode}
                    onChange={(e) => handleReferralCodeChange(e.target.value)}
                    className="h-11 pr-10"
                    maxLength={8}
                  />
                  {isValidatingCode && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                  {!isValidatingCode && codeValidation === "valid" && (
                    <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
                  )}
                  {!isValidatingCode && codeValidation === "invalid" && (
                    <XCircle className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-destructive" />
                  )}
                </div>
                {codeValidation === "invalid" && <p className="text-sm text-destructive">Invalid referral code</p>}
              </div>
              {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
