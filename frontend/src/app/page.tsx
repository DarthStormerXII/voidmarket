"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Flame, Clock, Timer, ChevronRight } from "lucide-react"
import { VoidLogo } from "@/components/ui/void-logo"
import { MarketCard } from "@/components/market/market-card"
import { TopClustersSection } from "@/components/cluster/top-clusters-section"
import { BottomNav } from "@/components/layout/bottom-nav"
import { useMarkets } from "@/hooks/use-markets"
import { toMarket } from "@/lib/adapters"
import { telegram, haptics } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import type { Market } from "@/types"

type MarketTab = "hot" | "latest" | "ending"

const marketTabs: { id: MarketTab; label: string; icon: React.ElementType }[] = [
  { id: "hot", label: "HOT", icon: Flame },
  { id: "latest", label: "LATEST", icon: Clock },
  { id: "ending", label: "ENDING SOON", icon: Timer },
]

export default function HomePage() {
  const [selectedTab, setSelectedTab] = useState<MarketTab>("hot")
  const { markets: apiMarkets, isLoading } = useMarkets({ status: "active" })

  // Initialize Telegram Mini App
  useEffect(() => {
    telegram.ready()
    telegram.expand()
  }, [])

  const activeMarkets = apiMarkets.map(toMarket)

  // Sort markets based on selected tab
  const getFilteredMarkets = () => {
    switch (selectedTab) {
      case "hot":
        return [...activeMarkets].sort((a, b) => b.totalBets - a.totalBets)
      case "latest":
        return [...activeMarkets].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      case "ending":
        return [...activeMarkets].sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
      default:
        return activeMarkets
    }
  }

  const filteredMarkets = getFilteredMarkets().slice(0, 5)

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Section - Simplified */}
      <section className="px-4 pt-8 pb-6 text-center">
        <VoidLogo size="lg" className="mx-auto mb-4" />

        <h1 className="font-[family-name:var(--font-accent)] text-2xl text-white text-glow tracking-widest">
          VOIDMARKET
        </h1>

        <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground mt-2 tracking-wide uppercase">
          GAMIFIED PRIVATE PREDICTION MARKETS THAT YOU CAN PLAY AND COMPETE WITH YOUR FRIENDS
        </p>
      </section>

      {/* Markets Section */}
      <section className="px-4 mb-8">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4">
          {marketTabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  haptics.buttonTap()
                  setSelectedTab(tab.id)
                }}
                className={cn(
                  "flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-lg font-[family-name:var(--font-display)] text-xs uppercase tracking-wider transition-all",
                  selectedTab === tab.id
                    ? "bg-white/10 text-white"
                    : "bg-void-surface text-muted-foreground hover:text-secondary-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Markets List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <VoidLogo size="md" className="mx-auto mb-3 animate-pulse" />
              <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground uppercase">
                SCANNING THE VOID...
              </p>
            </div>
          ) : filteredMarkets.length > 0 ? (
            filteredMarkets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground uppercase">
                NO MARKETS YET
              </p>
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mt-1">
                CREATE THE FIRST MARKET
              </p>
            </div>
          )}
        </div>

        {/* See All Link */}
        <Link
          href="/markets"
          onClick={() => haptics.buttonTap()}
          className="flex items-center justify-center gap-2 mt-4 py-3 rounded-lg border border-void-surface hover:border-white/30 transition-colors"
        >
          <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground uppercase tracking-wider">
            VIEW ALL MARKETS
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </section>

      <div className="h-px bg-void-surface mx-4 mb-6" />

      {/* Top Clusters */}
      <section className="px-4 mb-6">
        <TopClustersSection />
      </section>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
