"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Coins, Clock, Loader2 } from "lucide-react"
import type { Profile } from "@/lib/types"
import { updateUserCoins, resetUserCooldown } from "@/app/actions/admin-actions"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface UsersTableProps {
  profiles: Profile[]
}

export function UsersTable({ profiles }: UsersTableProps) {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [newCoins, setNewCoins] = useState<number>(0)

  const filteredProfiles = profiles.filter(
    (profile) =>
      profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.referral_code.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const handleUpdateCoins = async () => {
    if (!editingUser) return

    setLoading("coins")
    const result = await updateUserCoins(editingUser.id, newCoins)

    if (result.success) {
      toast({
        title: "Coins updated",
        description: `User coins updated to ${newCoins}`,
      })
      setEditingUser(null)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update coins",
        variant: "destructive",
      })
    }
    setLoading(null)
  }

  const handleResetCooldown = async (userId: string) => {
    setLoading(userId)
    const result = await resetUserCooldown(userId)

    if (result.success) {
      toast({
        title: "Cooldown reset",
        description: "User can now claim coins immediately",
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to reset cooldown",
        variant: "destructive",
      })
    }
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or referral code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Referral Code</TableHead>
              <TableHead>Coins</TableHead>
              <TableHead>Total Claimed</TableHead>
              <TableHead>Referred By</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProfiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredProfiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.full_name || "No name"}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-2 py-1 text-sm">{profile.referral_code}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold">{profile.coins || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{profile.total_claimed || 0}</TableCell>
                  <TableCell>
                    {profile.referred_by ? (
                      <Badge variant="secondary">Referred</Badge>
                    ) : (
                      <Badge variant="outline">Direct</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingUser(profile)
                              setNewCoins(profile.coins || 0)
                            }}
                          >
                            <Coins className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit User Coins</DialogTitle>
                            <DialogDescription>Update the coin balance for {profile.full_name}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="coins">Coin Balance</Label>
                              <Input
                                id="coins"
                                type="number"
                                value={newCoins}
                                onChange={(e) => setNewCoins(Number.parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <Button onClick={handleUpdateCoins} disabled={loading === "coins"} className="w-full">
                              {loading === "coins" ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                "Update Coins"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetCooldown(profile.id)}
                        disabled={loading === profile.id}
                      >
                        {loading === profile.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Clock className="mr-1 h-3 w-3" />
                            Reset
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredProfiles.length} of {profiles.length} users
      </div>
    </div>
  )
}
