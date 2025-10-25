"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"
import { createAdvertisement } from "@/app/actions/p2p-actions"
import { toast } from "sonner"

export function CreateAdButton({ userCoins }: { userCoins: number }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [adType, setAdType] = useState<"buy" | "sell">("sell")
  const [formData, setFormData] = useState({
    ziroxAmount: "",
    pricePerZirox: "",
    minOrder: "",
    maxOrder: "",
    mpesaNumber: "",
  })

  const handleSubmit = async () => {
    const amount = Number.parseFloat(formData.ziroxAmount)
    const price = Number.parseFloat(formData.pricePerZirox)
    const min = Number.parseFloat(formData.minOrder)
    const max = Number.parseFloat(formData.maxOrder)

    if (isNaN(amount) || isNaN(price) || isNaN(min) || isNaN(max)) {
      toast.error("Please fill in all fields with valid numbers")
      return
    }

    if (min > max) {
      toast.error("Minimum order cannot be greater than maximum order")
      return
    }

    if (!formData.mpesaNumber) {
      toast.error("Please enter your M-Pesa number")
      return
    }

    setIsLoading(true)
    const result = await createAdvertisement({
      adType,
      ziroxAmount: amount,
      pricePerZirox: price,
      minOrder: min,
      maxOrder: max,
      mpesaNumber: formData.mpesaNumber,
    })
    setIsLoading(false)

    if (result.success) {
      toast.success("Advertisement created successfully!")
      setOpen(false)
      setFormData({
        ziroxAmount: "",
        pricePerZirox: "",
        minOrder: "",
        maxOrder: "",
        mpesaNumber: "",
      })
    } else {
      toast.error(result.error || "Failed to create advertisement")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Ad
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Advertisement</DialogTitle>
          <DialogDescription>Create a buy or sell advertisement for ZiroX</DialogDescription>
        </DialogHeader>

        <Tabs value={adType} onValueChange={(v) => setAdType(v as "buy" | "sell")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">Buy ZiroX</TabsTrigger>
            <TabsTrigger value="sell">Sell ZiroX</TabsTrigger>
          </TabsList>

          <TabsContent value={adType} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Amount (ZiroX)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.ziroxAmount}
                onChange={(e) => setFormData({ ...formData, ziroxAmount: e.target.value })}
                step="0.000001"
              />
              {adType === "sell" && (
                <p className="text-xs text-muted-foreground">
                  Minimum: 200 ZiroX | Your balance: {userCoins.toFixed(6)} ZiroX
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Price per ZiroX (KES)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.pricePerZirox}
                onChange={(e) => setFormData({ ...formData, pricePerZirox: e.target.value })}
                step="0.000001"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Order (ZiroX)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                  step="0.000001"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Order (ZiroX)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.maxOrder}
                  onChange={(e) => setFormData({ ...formData, maxOrder: e.target.value })}
                  step="0.000001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>M-Pesa Number</Label>
              <Input
                type="tel"
                placeholder="254712345678 or 0712345678"
                value={formData.mpesaNumber}
                onChange={(e) => setFormData({ ...formData, mpesaNumber: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {adType === "sell"
                  ? "Buyers will send payment to this number"
                  : "You'll send payment to seller's number"}
              </p>
            </div>

            <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
              {isLoading ? "Creating..." : "Create Advertisement"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
