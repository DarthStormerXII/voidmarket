"use client"

import { use, useState } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  Swords,
  Sparkles,
  Check,
  Clock,
  Target
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StarAvatar } from "@/components/ui/star-avatar"
import { BottomNav } from "@/components/layout/bottom-nav"
import { mockNova, mockStar, mockClusters } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { haptics } from "@/lib/haptics"
import { BetOutcome } from "@/types"

interface NovaPageProps {
  params: Promise<{ id: string }>
}

export default function NovaPage({ params }: NovaPageProps) {
  const { id } = use(params)
  const [selectedBet, setSelectedBet] = useState<BetOutcome | null>(null)

  // Get nova - in real app would fetch by ID
  const nova = mockNova

  if (!nova || nova.id !== id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground uppercase">NOVA NOT FOUND</p>
      </div>
    )
  }

  // Get clusters
  const cluster1 = mockClusters.find(c => c.id === nova.cluster1Id)
  const cluster2 = mockClusters.find(c => c.id === nova.cluster2Id)

  // Find user's match
  const userMatch = nova.matches.find(
    m => m.star1Id === mockStar.id || m.star2Id === mockStar.id
  )

  // Calculate totals
  const cluster1Photons = nova.matches
    .filter(m => m.status === "completed" && m.winnerId === m.star1Id)
    .reduce((acc, m) => acc + m.photonsAwarded, 0)

  const cluster2Photons = nova.matches
    .filter(m => m.status === "completed" && m.winnerId === m.star2Id)
    .reduce((acc, m) => acc + m.photonsAwarded, 0)

  const isUserInCluster1 = mockStar.clusterId === nova.cluster1Id

  const handlePlaceBet = () => {
    if (!selectedBet) return
    haptics.success()
    console.log("Placing bet:", selectedBet)
    // TODO: Implement bet placement
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-void-surface">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/clusters" className="p-2 -ml-2" onClick={() => haptics.buttonTap()}>
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase tracking-wider">
            NOVA
          </h1>
          <Badge variant="inVoid" className="text-xs animate-pulse">
            LIVE
          </Badge>
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6">
        {/* Nova Score */}
        <Card className="bg-void-mid border-primary/20 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {/* Cluster 1 */}
              <div className="flex-1 text-center">
                <p className={cn(
                  "font-[family-name:var(--font-display)] text-sm font-semibold uppercase mb-2",
                  isUserInCluster1 ? "text-white" : "text-foreground"
                )}>
                  {nova.cluster1Name}
                </p>
                <div className="flex items-center justify-center gap-1">
                  <Sparkles className="h-6 w-6 text-white" />
                  <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-foreground">
                    {cluster1Photons}
                  </span>
                </div>
                {isUserInCluster1 && (
                  <Badge variant="outline" className="mt-2 text-[10px]">
                    YOUR TEAM
                  </Badge>
                )}
              </div>

              {/* VS */}
              <div className="px-6">
                <div className="w-12 h-12 rounded-full bg-void-surface flex items-center justify-center">
                  <Swords className="h-6 w-6 text-white" />
                </div>
              </div>

              {/* Cluster 2 */}
              <div className="flex-1 text-center">
                <p className={cn(
                  "font-[family-name:var(--font-display)] text-sm font-semibold uppercase mb-2",
                  !isUserInCluster1 ? "text-white" : "text-foreground"
                )}>
                  {nova.cluster2Name}
                </p>
                <div className="flex items-center justify-center gap-1">
                  <Sparkles className="h-6 w-6 text-white" />
                  <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-foreground">
                    {cluster2Photons}
                  </span>
                </div>
                {!isUserInCluster1 && (
                  <Badge variant="outline" className="mt-2 text-[10px]">
                    YOUR TEAM
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-center mt-4 pt-4 border-t border-void-surface">
              <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                WAGER: <span className="text-foreground font-semibold">{nova.wagerAmount} USDC</span> PER CLUSTER
              </span>
            </div>
          </CardContent>
        </Card>

        {/* User's Match */}
        {userMatch && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-white" />
              <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase">
                YOUR MATCH
              </span>
            </div>

            <Card className="bg-void-deep border-white/30">
              <CardContent className="p-4">
                {/* Opponents */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <StarAvatar
                      starType={cluster1?.members.find(m => m.odId === userMatch.star1Id)?.starType || "yellow-sun"}
                      size="sm"
                    />
                    <span className="font-[family-name:var(--font-display)] text-sm text-foreground uppercase">
                      {userMatch.star1Name}
                    </span>
                  </div>
                  <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground">
                    VS
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-[family-name:var(--font-display)] text-sm text-foreground uppercase">
                      {userMatch.star2Name}
                    </span>
                    <StarAvatar
                      starType={cluster2?.members.find(m => m.odId === userMatch.star2Id)?.starType || "yellow-sun"}
                      size="sm"
                    />
                  </div>
                </div>

                {/* Market */}
                <Card className="bg-void-surface border-void-surface mb-4">
                  <CardContent className="p-3">
                    <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase text-center">
                      {userMatch.marketTitle}
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground text-center mt-1">
                      {userMatch.photonsAwarded} PHOTONS AT STAKE
                    </p>
                  </CardContent>
                </Card>

                {/* Bet Selection */}
                {userMatch.status === "pending" || (userMatch.status === "active" && !userMatch.star1Bet) ? (
                  <div>
                    <p className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase mb-3 text-center">
                      PLACE YOUR BET (10 USDC)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          haptics.buttonTap()
                          setSelectedBet("YES")
                        }}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all",
                          selectedBet === "YES"
                            ? "border-white bg-white/10"
                            : "border-void-surface hover:border-white/30"
                        )}
                      >
                        <span className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
                          YES
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          haptics.buttonTap()
                          setSelectedBet("NO")
                        }}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all",
                          selectedBet === "NO"
                            ? "border-white bg-white/10"
                            : "border-void-surface hover:border-white/30"
                        )}
                      >
                        <span className="font-[family-name:var(--font-display)] text-lg font-bold text-white/60">
                          NO
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Check className="h-5 w-5 text-white" />
                      <span className="font-[family-name:var(--font-display)] text-sm text-foreground uppercase">
                        BET PLACED: {userMatch.star1Bet?.outcome}
                      </span>
                    </div>
                    <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground mt-1">
                      Waiting for opponent...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="h-px bg-void-surface" />

        {/* All Matches */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Swords className="h-4 w-4 text-white" />
            <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase">
              ALL MATCHES ({nova.matches.filter(m => m.status === "completed").length}/{nova.matches.length})
            </span>
          </div>

          <div className="space-y-2">
            {nova.matches.map((match) => (
              <Card
                key={match.id}
                className={cn(
                  "bg-void-deep border-void-surface",
                  match.id === userMatch?.id && "border-white/30"
                )}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-[family-name:var(--font-display)] text-xs text-foreground uppercase">
                        {match.star1Name}
                      </span>
                      {match.star1Bet && (
                        <Badge variant="outline" className="text-[8px]">
                          {match.star1Bet.outcome}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {match.status === "completed" ? (
                        <Badge variant="inVoid" className="text-[10px]">
                          DONE
                        </Badge>
                      ) : match.status === "active" ? (
                        <Badge variant="outline" className="text-[10px]">
                          LIVE
                        </Badge>
                      ) : (
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {match.star2Bet && (
                        <Badge variant="outline" className="text-[8px]">
                          {match.star2Bet.outcome}
                        </Badge>
                      )}
                      <span className="font-[family-name:var(--font-display)] text-xs text-foreground uppercase">
                        {match.star2Name}
                      </span>
                    </div>
                  </div>

                  <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground text-center mt-2 truncate">
                    {match.marketTitle}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      {userMatch && (userMatch.status === "pending" || (userMatch.status === "active" && !userMatch.star1Bet)) && (
        <div className="fixed bottom-20 left-0 right-0 z-30 p-4 bg-background/95 backdrop-blur-lg border-t border-void-surface">
          <Button
            variant="default"
            size="xl"
            onClick={handlePlaceBet}
            disabled={!selectedBet}
            className="w-full"
          >
            CONFIRM BET
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
