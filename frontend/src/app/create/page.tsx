"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, GitFork, Plus, Search, Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { BottomNav } from "@/components/layout/bottom-nav"
import { mockMarkets } from "@/lib/mock-data"
import { CATEGORY_CONFIG } from "@/types"
import { cn } from "@/lib/utils"
import { haptics } from "@/lib/haptics"

export default function CreatePage() {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter active markets for forking
  const activeMarkets = mockMarkets.filter(m => m.status === "active")

  const filteredMarkets = activeMarkets.filter(market =>
    market.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    market.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-void-surface">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="p-2 -ml-2" onClick={() => haptics.buttonTap()}>
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase tracking-wider">
            CREATE MARKET
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6">
        {/* Options */}
        <div className="space-y-3">
          {/* Fork Existing Market - Active */}
          <Card className="bg-void-mid border-white/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <GitFork className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase">
                    FORK EXISTING MARKET
                  </h3>
                  <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground mt-1">
                    Create a private market from any public market
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create New Market - Disabled */}
          <Card className="bg-void-deep border-void-surface opacity-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-void-surface flex items-center justify-center">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold text-muted-foreground uppercase">
                      CREATE NEW MARKET
                    </h3>
                    <Badge variant="outline" className="text-[10px]">
                      COMING SOON
                    </Badge>
                  </div>
                  <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground mt-1">
                    Create original public markets
                  </p>
                </div>
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="h-px bg-void-surface" />

        {/* Search */}
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase mb-3">
            SELECT A MARKET TO FORK
          </h3>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH MARKETS..."
              className="pl-10 bg-void-deep border-void-surface uppercase"
            />
          </div>

          {/* Markets List */}
          <div className="space-y-3">
            {filteredMarkets.map(market => (
              <Link
                key={market.id}
                href={`/create/fork/${market.id}`}
                onClick={() => haptics.buttonTap()}
              >
                <Card className="bg-void-deep border-void-surface hover:border-white/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className="mb-2 text-[10px]">
                          {CATEGORY_CONFIG[market.category].label}
                        </Badge>
                        <h4 className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase leading-tight">
                          {market.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                            {market.totalBets} BETS
                          </span>
                          <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                            {market.totalPool} USDC
                          </span>
                        </div>
                      </div>
                      <GitFork className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {filteredMarkets.length === 0 && (
            <div className="text-center py-8">
              <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground uppercase">
                NO MARKETS FOUND
              </p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
