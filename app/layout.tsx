import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { MiningProvider } from "@/lib/mining-context"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "GrowX — The Coin That Never Sleeps",
  description: "GrowX (GX) — The Coin That Never Sleeps. Mine every 2 hours. 3% daily growth. P2P trading.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-gradient-to-b from-[#0f1720] to-[#071124] text-[#e6eef8]`}
      >
        <MiningProvider>{children}</MiningProvider>
        <Analytics />
      </body>
    </html>
  )
}
