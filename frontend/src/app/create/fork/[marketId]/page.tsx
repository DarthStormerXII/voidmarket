"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft,
  GitFork,
  Copy,
  Check,
  Share2,
  Lock,
  Cpu,
  Calendar,
  Users
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { VoidLogo } from "@/components/ui/void-logo"
import { BottomNav } from "@/components/layout/bottom-nav"
import { useMarket } from "@/hooks/use-market"
import { useWallet } from "@/components/providers/wallet-provider"
import { toMarket } from "@/lib/adapters"
import { CATEGORY_CONFIG } from "@/types"
import { cn } from "@/lib/utils"
import { haptics } from "@/lib/haptics"

interface ForkMarketPageProps {
  params: Promise<{ marketId: string }>
}

export default function ForkMarketPage({ params }: ForkMarketPageProps) {
  const router = useRouter()
  const { marketId } = use(params)
  const [isCreating, setIsCreating] = useState(false)
  const [isCreated, setIsCreated] = useState(false)
  const [forkedMarketId, setForkedMarketId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { forkMarket, pollTransaction } = useWallet()
  const { market: apiMarket, isLoading } = useMarket(marketId)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <VoidLogo size="md" className="animate-pulse" />
      </div>
    )
  }

  if (!apiMarket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground uppercase">MARKET NOT FOUND</p>
      </div>
    )
  }

  const market = toMarket(apiMarket)
  const category = CATEGORY_CONFIG[market.category]

  const handleCreateFork = async () => {
    haptics.buttonTap()
    setIsCreating(true)
    setError(null)

    try {
      // Call the real fork API via wallet provider
      const { transactionId } = await forkMarket({
        parentMarketId: Number(marketId),
      })

      // Poll until confirmed
      const result = await pollTransaction(transactionId)

      if (result.status === "CONFIRMED") {
        setForkedMarketId(transactionId)
        setIsCreated(true)
        haptics.success()
      } else {
        setError("Transaction failed. Please try again.")
        haptics.error()
      }
    } catch (err) {
      console.error("Fork market error:", err)
      setError(err instanceof Error ? err.message : "Failed to fork market")
      haptics.error()
    } finally {
      setIsCreating(false)
    }
  }

  const shareLink = `https://voidmarket-ethglobal.vercel.app/markets/${forkedMarketId || marketId}`

  const handleCopyShareLink = () => {
    haptics.buttonTap()
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = () => {
    haptics.buttonTap()
    if (navigator.share) {
      navigator.share({
        title: `Bet on: ${market?.title}`,
        text: "Join my private prediction market on VoidMarket!",
        url: shareLink,
      }).catch(() => {})
    } else {
      handleCopyShareLink()
    }
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-void-surface">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/create" className="p-2 -ml-2" onClick={() => haptics.buttonTap()}>
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase tracking-wider">
            {isCreated ? "MARKET CREATED" : "FORK MARKET"}
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6">
        {!isCreated ? (
          <>
            {/* Original Market Info */}
            <Card className="bg-void-mid border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <GitFork className="h-4 w-4 text-white" />
                  <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase">
                    FORKING FROM
                  </span>
                </div>

                <Badge variant="outline" className="mb-2">
                  {category.label}
                </Badge>

                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-foreground uppercase leading-tight">
                  {market.title}
                </h2>

                {market.description && (
                  <p className="font-[family-name:var(--font-body)] text-sm text-muted-foreground mt-2">
                    {market.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{market.totalBets} BETS</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>ENDS {market.endDate.toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fork Details */}
            <div className="space-y-4">
              <h3 className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase">
                YOUR FORKED MARKET
              </h3>

              <Card className="bg-void-deep border-void-surface">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-void-surface flex items-center justify-center">
                      <Lock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase">
                        PRIVATE MARKET
                      </p>
                      <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                        Only invited participants can join
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-void-surface" />

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-void-surface flex items-center justify-center">
                      <Cpu className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase">
                        AUTO-RESOLUTION
                      </p>
                      <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                        {market.oracleType === "stork"
                          ? "Resolved by Stork price feed"
                          : "Resolved when original market resolves"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/20">
                <CardContent className="p-4">
                  <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground text-center">
                    Your forked market will automatically resolve based on the original market&apos;s outcome. No manual intervention needed.
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            {/* Success State */}
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
                <Check className="h-10 w-10 text-white" />
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-foreground uppercase mb-2">
                MARKET FORKED
              </h2>
              <p className="font-[family-name:var(--font-body)] text-sm text-muted-foreground">
                Share the link below to invite your friends
              </p>
            </div>

            {/* Share Link */}
            <Card className="bg-void-mid border-white/30">
              <CardContent className="p-6">
                <p className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase text-center mb-3">
                  SHARE LINK
                </p>
                <div className="flex items-center justify-center gap-3">
                  <p className="font-[family-name:var(--font-mono)] text-xs text-foreground truncate max-w-[250px]">
                    {shareLink}
                  </p>
                  <button
                    onClick={handleCopyShareLink}
                    className="p-2 rounded-lg bg-void-surface hover:bg-void-deep transition-colors flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : (
                      <Copy className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Market Summary */}
            <Card className="bg-void-deep border-void-surface">
              <CardContent className="p-4">
                <Badge variant="outline" className="mb-2">
                  {category.label}
                </Badge>
                <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase">
                  {market.title}
                </h3>
                <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground mt-2">
                  ENDS {market.endDate.toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-20 left-0 right-0 z-30 p-4 bg-background/95 backdrop-blur-lg border-t border-void-surface">
        {error && (
          <p className="font-[family-name:var(--font-body)] text-xs text-red-400 text-center mb-2">
            {error}
          </p>
        )}
        {!isCreated ? (
          <Button
            variant="default"
            size="xl"
            onClick={handleCreateFork}
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? (
              "FORKING..."
            ) : (
              <>
                <GitFork className="mr-2 h-5 w-5" />
                FORK THIS MARKET
              </>
            )}
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleShare}
            >
              <Share2 className="mr-2 h-4 w-4" />
              SHARE
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={() => {
                haptics.buttonTap()
                router.push("/markets")
              }}
            >
              VIEW MARKETS
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
