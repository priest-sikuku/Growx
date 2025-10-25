"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Share2 } from "lucide-react"

interface CopyReferralButtonProps {
  code: string
}

export function CopyReferralButton({ code }: CopyReferralButtonProps) {
  const [copied, setCopied] = useState(false)

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/signup?ref=${code}`
      : `https://yoursite.com/auth/signup?ref=${code}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="mr-2 h-4 w-4" />
          Share Link
        </>
      )}
    </Button>
  )
}
