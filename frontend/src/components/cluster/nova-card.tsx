"use client"

import { Swords, Sparkles, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Nova } from "@/types"
import { cn } from "@/lib/utils"

interface NovaCardProps {
  nova: Nova
  userClusterId?: string
  onClick?: () => void
}

export function NovaCard({ nova, userClusterId, onClick }: NovaCardProps) {
  const completedMatches = nova.matches.filter(m => m.status === "completed").length
  const totalMatches = nova.matches.length

  // Calculate photons for each side
  const cluster1Photons = nova.matches
    .filter(m => m.status === "completed" && m.winnerId === m.star1Id)
    .reduce((acc, m) => acc + m.photonsAwarded, 0)

  const cluster2Photons = nova.matches
    .filter(m => m.status === "completed" && m.winnerId === m.star2Id)
    .reduce((acc, m) => acc + m.photonsAwarded, 0)

  const isUserNova = userClusterId === nova.cluster1Id || userClusterId === nova.cluster2Id

  return (
    <Card
      className={cn(
        "bg-void-deep border-void-surface transition-colors overflow-hidden",
        onClick && "cursor-pointer hover:border-white/30",
        isUserNova && "border-white/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-void-surface">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-white" />
            <Badge
              variant={nova.status === "active" ? "inVoid" : "outline"}
              className="text-[10px]"
            >
              {nova.status === "active" ? "LIVE" : nova.status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
              {completedMatches}/{totalMatches} MATCHES
            </span>
            {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Nova Content */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            {/* Cluster 1 */}
            <div className="flex-1 text-center">
              <p className={cn(
                "font-[family-name:var(--font-display)] text-sm font-semibold uppercase",
                userClusterId === nova.cluster1Id ? "text-white" : "text-foreground"
              )}>
                {nova.cluster1Name}
              </p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Sparkles className="h-4 w-4 text-white" />
                <span className="font-[family-name:var(--font-display)] text-xl font-bold text-foreground">
                  {cluster1Photons}
                </span>
              </div>
            </div>

            {/* VS */}
            <div className="px-4">
              <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground">
                VS
              </span>
            </div>

            {/* Cluster 2 */}
            <div className="flex-1 text-center">
              <p className={cn(
                "font-[family-name:var(--font-display)] text-sm font-semibold uppercase",
                userClusterId === nova.cluster2Id ? "text-white" : "text-foreground"
              )}>
                {nova.cluster2Name}
              </p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Sparkles className="h-4 w-4 text-white" />
                <span className="font-[family-name:var(--font-display)] text-xl font-bold text-foreground">
                  {cluster2Photons}
                </span>
              </div>
            </div>
          </div>

          {/* Wager */}
          <div className="text-center mt-4 pt-3 border-t border-void-surface">
            <span className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
              WAGER: <span className="text-foreground font-semibold">{nova.wagerAmount} USDC</span> PER CLUSTER
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
