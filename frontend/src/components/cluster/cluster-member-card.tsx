"use client"

import { Crown, Sparkles, Swords } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StarAvatar, STAR_TYPE_NAMES } from "@/components/ui/star-avatar"
import { ClusterMember } from "@/types"
import { cn } from "@/lib/utils"

interface ClusterMemberCardProps {
  member: ClusterMember
  isLeader?: boolean
  rank?: number
}

export function ClusterMemberCard({ member, isLeader, rank }: ClusterMemberCardProps) {
  const winRate = member.novasPlayed > 0
    ? Math.round((member.novasWon / member.novasPlayed) * 100)
    : 0

  return (
    <Card className={cn(
      "bg-void-deep border-void-surface",
      isLeader && "border-white/30"
    )}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Rank */}
          {rank && (
            <div className={cn(
              "w-6 h-6 rounded flex items-center justify-center font-[family-name:var(--font-display)] text-xs font-bold",
              rank === 1 && "bg-white/20 text-white",
              rank === 2 && "bg-white/10 text-white/80",
              rank === 3 && "bg-void-surface text-white/60",
              rank > 3 && "text-muted-foreground"
            )}>
              {rank}
            </div>
          )}

          {/* Avatar */}
          <div className="relative">
            <StarAvatar starType={member.starType} size="sm" showGlow={isLeader} />
            {isLeader && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                <Crown className="h-2.5 w-2.5 text-black" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase truncate">
                {member.name}
              </p>
              {isLeader && (
                <Badge variant="outline" className="text-[8px]">
                  LEADER
                </Badge>
              )}
            </div>
            <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground uppercase">
              {STAR_TYPE_NAMES[member.starType]}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="flex items-center justify-end gap-1">
                <Sparkles className="h-3 w-3 text-white" />
                <span className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
                  {member.photons}
                </span>
              </div>
              <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground uppercase">
                PHOTONS
              </p>
            </div>
            <div>
              <div className="flex items-center justify-end gap-1">
                <Swords className="h-3 w-3 text-white/60" />
                <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground">
                  {member.novasWon}/{member.novasPlayed}
                </span>
              </div>
              <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground uppercase">
                WINS
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
