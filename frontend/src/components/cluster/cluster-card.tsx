"use client"

import { Zap, Users, Swords, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cluster } from "@/types"
import { cn } from "@/lib/utils"

interface ClusterCardProps {
  cluster: Cluster
  isUserCluster?: boolean
  onClick?: () => void
}

export function ClusterCard({ cluster, isUserCluster, onClick }: ClusterCardProps) {
  const winRate = cluster.totalNovas > 0
    ? Math.round((cluster.novasWon / cluster.totalNovas) * 100)
    : 0

  return (
    <Card
      className={cn(
        "bg-void-deep border-void-surface transition-colors",
        onClick && "cursor-pointer hover:border-white/30",
        isUserCluster && "border-white/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-foreground uppercase truncate">
                {cluster.name}
              </h3>
              {isUserCluster && (
                <Badge variant="inVoid" className="text-[10px]">
                  YOUR CLUSTER
                </Badge>
              )}
              {cluster.currentNovaId && (
                <Badge variant="outline" className="text-[10px] animate-pulse">
                  IN NOVA
                </Badge>
              )}
            </div>

            {cluster.description && (
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground mb-3 line-clamp-1">
                {cluster.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{cluster.members.length} MEMBERS</span>
              </div>
              <div className="flex items-center gap-1">
                <Swords className="h-3 w-3" />
                <span>{cluster.novasWon}/{cluster.totalNovas} WINS</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
              <Zap className="h-5 w-5 text-white" />
              <span className="font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
                {cluster.energy.toLocaleString()}
              </span>
            </div>
            {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
