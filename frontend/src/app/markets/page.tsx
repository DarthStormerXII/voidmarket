"use client"

import { useState } from "react"
import { Search, Flame, Clock, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MarketCard } from "@/components/market/market-card"
import { BottomNav } from "@/components/layout/bottom-nav"
import { mockMarkets } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { MarketCategory, CATEGORY_CONFIG } from "@/types"
import { haptics } from "@/lib/haptics"

const categories: (MarketCategory | "all")[] = ["all", "crypto", "sports", "politics", "culture", "custom"]

const sortOptions = [
  { id: "hot", label: "HOT", icon: Flame },
  { id: "ending", label: "ENDING SOON", icon: Clock },
]

export default function MarketsPage() {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory | "all">("all")
  const [selectedSort, setSelectedSort] = useState("hot")

  const filteredMarkets = mockMarkets
    .filter(m => m.status === "active")
    .filter(m => selectedCategory === "all" || m.category === selectedCategory)
    .filter(m => m.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (selectedSort === "ending") {
        return a.endDate.getTime() - b.endDate.getTime()
      }
      return b.totalBets - a.totalBets // hot = most bets
    })

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-void-surface">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="p-2 -ml-2" onClick={() => haptics.buttonTap()}>
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase tracking-wider">
            MARKETS
          </h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      {/* Search */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="SEARCH MARKETS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 pt-4">
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  haptics.buttonTap()
                  setSelectedCategory(cat)
                }}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-full font-[family-name:var(--font-display)] text-xs uppercase tracking-wider transition-all",
                  selectedCategory === cat
                    ? "bg-white/20 text-white border border-white"
                    : "bg-void-surface text-muted-foreground border border-void-surface hover:border-white/30"
                )}
              >
                {cat === "all" ? "ALL" : CATEGORY_CONFIG[cat].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="px-4 pt-4">
        <div className="flex gap-2">
          {sortOptions.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.id}
                onClick={() => {
                  haptics.buttonTap()
                  setSelectedSort(option.id)
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-[family-name:var(--font-display)] text-xs uppercase tracking-wider transition-all",
                  selectedSort === option.id
                    ? "bg-white/20 text-white"
                    : "bg-void-surface text-muted-foreground hover:text-secondary-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Markets List */}
      <div className="px-4 pt-6 space-y-3">
        {filteredMarkets.length > 0 ? (
          filteredMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground uppercase">
              NO MARKETS FOUND
            </p>
            <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mt-1">
              TRY ADJUSTING YOUR FILTERS
            </p>
          </div>
        )}

        {filteredMarkets.length > 0 && (
          <Button variant="ghost" className="w-full">
            LOAD MORE MARKETS
          </Button>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
