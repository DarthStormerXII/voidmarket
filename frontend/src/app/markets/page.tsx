"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Flame, Clock, ChevronLeft, ArrowDownWideNarrow, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MarketCard } from "@/components/market/market-card"
import { VoidLogo } from "@/components/ui/void-logo"
import { BottomNav } from "@/components/layout/bottom-nav"
import { useMarkets, type MarketSort, type MarketStatusFilter } from "@/hooks/use-markets"
import { toMarket } from "@/lib/adapters"
import { cn } from "@/lib/utils"
import { MarketCategory, CATEGORY_CONFIG } from "@/types"
import { haptics } from "@/lib/haptics"

const categories: (MarketCategory | "all")[] = ["all", "crypto", "sports", "politics", "culture", "custom"]

const statusFilters: { id: MarketStatusFilter; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "active", label: "ACTIVE" },
  { id: "resolved", label: "RESOLVED" },
  { id: "cancelled", label: "CANCELLED" },
]

const sortOptions: { id: MarketSort; label: string; icon: typeof Flame }[] = [
  { id: "hot", label: "HOT", icon: Flame },
  { id: "ending-soon", label: "ENDING SOON", icon: Clock },
  { id: "pool-size", label: "POOL SIZE", icon: TrendingUp },
  { id: "newest", label: "NEWEST", icon: ArrowDownWideNarrow },
]

export default function MarketsPage() {
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory | "all">("all")
  const [selectedStatus, setSelectedStatus] = useState<MarketStatusFilter>("all")
  const [selectedSort, setSelectedSort] = useState<MarketSort>("hot")

  // Debounce search input (300ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  const { markets: apiMarkets, total, hasMore, isLoading, loadMore } = useMarkets({
    search: debouncedSearch || undefined,
    status: selectedStatus,
    category: selectedCategory === "all" ? undefined : selectedCategory,
    sort: selectedSort,
  })

  const displayMarkets = apiMarkets.map(toMarket)

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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="px-4 pt-4">
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-2">
            {statusFilters.map((sf) => (
              <button
                key={sf.id}
                onClick={() => {
                  haptics.buttonTap()
                  setSelectedStatus(sf.id)
                }}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-full font-[family-name:var(--font-display)] text-xs uppercase tracking-wider transition-all",
                  selectedStatus === sf.id
                    ? "bg-white/20 text-white border border-white"
                    : "bg-void-surface text-muted-foreground border border-void-surface hover:border-white/30"
                )}
              >
                {sf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 pt-3">
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
                    ? "bg-white/10 text-white border border-white/50"
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
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
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
                  "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg font-[family-name:var(--font-display)] text-xs uppercase tracking-wider transition-all",
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
        {isLoading && displayMarkets.length === 0 ? (
          <div className="text-center py-12">
            <VoidLogo size="md" className="mx-auto mb-3 animate-pulse" />
            <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground uppercase">
              SCANNING THE VOID...
            </p>
          </div>
        ) : displayMarkets.length > 0 ? (
          <>
            {displayMarkets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}

            {/* Result count */}
            <p className="text-center font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase pt-2">
              SHOWING {displayMarkets.length} OF {total} MARKETS
            </p>

            {hasMore && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  haptics.buttonTap()
                  loadMore()
                }}
                disabled={isLoading}
              >
                {isLoading ? "LOADING..." : "LOAD MORE MARKETS"}
              </Button>
            )}
          </>
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
      </div>

      <BottomNav />
    </div>
  )
}
