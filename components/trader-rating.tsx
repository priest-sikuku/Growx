"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Star } from "lucide-react"
import { submitTraderRating } from "@/app/actions/trader-rating"
import { toast } from "sonner"

interface TraderRatingProps {
  tradeId: string
  ratedUserId: string
  ratedUserName: string
  onRatingSubmitted?: () => void
}

export function TraderRating({ tradeId, ratedUserId, ratedUserName, onRatingSubmitted }: TraderRatingProps) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating")
      return
    }

    setLoading(true)
    const result = await submitTraderRating({
      tradeId,
      ratedUserId,
      rating,
      comment,
    })
    setLoading(false)

    if (result.success) {
      toast.success("Rating submitted successfully!")
      setOpen(false)
      setRating(0)
      setComment("")
      onRatingSubmitted?.()
    } else {
      toast.error(result.error || "Failed to submit rating")
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="gap-1">
        <Star className="h-4 w-4" />
        Rate Trader
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate {ratedUserName}</DialogTitle>
            <DialogDescription>Share your experience with this trader</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110">
                  <Star
                    className={`h-8 w-8 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Share your experience (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-24"
            />

            <div className="flex gap-2">
              <Button onClick={() => setOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? "Submitting..." : "Submit Rating"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
