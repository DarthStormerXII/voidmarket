"use client"

import Link from "next/link"
import { Zap, Trophy, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { mockTopClusters } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { haptics } from "@/lib/haptics"

export function TopClustersSection() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-white" />
          <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase">
            TOP CLUSTERS
          </span>
        </div>
        <Link
          href="/clusters"
          onClick={() => haptics.buttonTap()}
          className="font-[family-name:var(--font-body)] text-xs text-primary uppercase hover:underline"
        >
          VIEW ALL
        </Link>
      </div>

      <div className="space-y-2">
        {mockTopClusters.slice(0, 3).map((cluster, index) => (
          <Link
            key={cluster.id}
            href="/clusters"
            onClick={() => haptics.buttonTap()}
          >
            <Card className="bg-void-deep border-void-surface hover:border-white/30 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-[family-name:var(--font-display)] text-sm font-bold",
                      index === 0 && "bg-white/20 text-white",
                      index === 1 && "bg-white/10 text-white/80",
                      index === 2 && "bg-void-surface text-white/60"
                    )}
                  >
                    {index + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase truncate">
                      {cluster.name}
                    </p>
                    <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                      {cluster.members.length} MEMBERS
                    </p>
                  </div>

                  {/* Energy */}
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-white" />
                    <span className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
                      {cluster.energy.toLocaleString()}
                    </span>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
