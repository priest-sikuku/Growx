"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Profile } from "@/lib/types"

interface ProfileFormProps {
  profile: Profile | null
  userId: string
}

export function ProfileForm({ profile, userId }: ProfileFormProps) {
  const [fullName, setFullName] = useState(profile?.full_name || "")
  const [bio, setBio] = useState(profile?.bio || "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          bio: bio,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 1000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Doe"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
          rows={4}
          className="resize-none"
        />
      </div>

      {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">Profile updated successfully!</div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard")} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
