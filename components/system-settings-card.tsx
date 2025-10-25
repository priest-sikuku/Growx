"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Settings, Loader2 } from "lucide-react"
import { updateSystemSetting } from "@/app/actions/admin-actions"
import { useToast } from "@/hooks/use-toast"

interface SystemSettingsCardProps {
  settings: Array<{
    setting_key: string
    setting_value: string
    description: string | null
  }>
}

export function SystemSettingsCard({ settings }: SystemSettingsCardProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>(
    settings.reduce(
      (acc, s) => {
        acc[s.setting_key] = s.setting_value
        return acc
      },
      {} as Record<string, string>,
    ),
  )

  const handleUpdate = async (key: string) => {
    setLoading(key)
    const result = await updateSystemSetting(key, values[key])

    if (result.success) {
      toast({
        title: "Settings updated",
        description: "System settings have been updated successfully",
      })
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update settings",
        variant: "destructive",
      })
    }
    setLoading(null)
  }

  const getLabel = (key: string) => {
    const labels: Record<string, string> = {
      base_claim_amount: "Base Claim Amount",
      referral_bonus: "Referral Bonus (per referral)",
      claim_cooldown_hours: "Claim Cooldown (hours)",
    }
    return labels[key] || key
  }

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle>System Settings</CardTitle>
        </div>
        <CardDescription>Configure claim amounts and cooldown periods</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {settings.map((setting) => (
          <div key={setting.setting_key} className="space-y-2">
            <Label htmlFor={setting.setting_key}>{getLabel(setting.setting_key)}</Label>
            {setting.description && <p className="text-sm text-muted-foreground">{setting.description}</p>}
            <div className="flex gap-2">
              <Input
                id={setting.setting_key}
                type="number"
                value={values[setting.setting_key]}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [setting.setting_key]: e.target.value,
                  }))
                }
                className="max-w-xs"
              />
              <Button
                onClick={() => handleUpdate(setting.setting_key)}
                disabled={loading === setting.setting_key}
                size="sm"
              >
                {loading === setting.setting_key ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Update"
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
