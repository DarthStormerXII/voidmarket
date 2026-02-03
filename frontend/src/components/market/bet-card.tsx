"use client"

import Link from "next/link"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Clock, Trophy, X, Gift } from "lucide-react"
import { Bet } from "@/types"
import { haptics } from "@/lib/haptics"
import { VoidLogo } from "@/components/ui/void-logo"

interface BetCardProps {
  bet: Bet
  onClaim?: (betId: string) => void
}

const statusConfig = {
  in_void: {
    icon: VoidLogo,
    label: "IN THE VOID",
    variant: "inVoid" as const,
    cardClass: "",
  },
  won: {
    icon: Trophy,
    label: "YOU WON",
    variant: "won" as const,
    cardClass: "border-white/30",
  },
  lost: {
    icon: X,
    label: "YOU LOST",
    variant: "lost" as const,
    cardClass: "opacity-70",
  },
  claimable: {
    icon: Gift,
    label: "CLAIMABLE",
    variant: "claimable" as const,
    cardClass: "glow border-white/50 animate-[border-glow_2s_ease-in-out_infinite]",
  },
}

export function BetCard({ bet, onClaim }: BetCardProps) {
  const config = statusConfig[bet.status]
  const Icon = config.icon

  const handleClaim = () => {
    haptics.betSuccess()
    onClaim?.(bet.id)
  }

  return (
    <Card className={cn("bg-card border-border", config.cardClass)}>
      <CardHeader className="pb-2">
        <Badge variant={config.variant} className="w-fit">
          {bet.status === "in_void" ? (
            <VoidLogo size="sm" className="h-3 w-3 mr-1" />
          ) : (
            <Icon className="h-3 w-3 mr-1" />
          )}
          {config.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        <Link href={`/markets/${bet.marketId}`} onClick={() => haptics.buttonTap()}>
          <p className="font-[family-name:var(--font-display)] text-sm text-foreground uppercase hover:text-primary transition-colors">
            &ldquo;{bet.marketTitle}&rdquo;
          </p>
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="font-[family-name:var(--font-body)] text-muted-foreground text-xs uppercase">YOUR BET: </span>
            <span className={cn(
              "font-[family-name:var(--font-display)] font-semibold",
              bet.outcome === "YES" ? "text-white" : "text-white/60"
            )}>
              {bet.outcome}
            </span>
          </div>
          <div>
            <span className="font-[family-name:var(--font-body)] text-muted-foreground text-xs uppercase">
              {bet.status === "won" || bet.status === "claimable" ? "WON: " : bet.status === "lost" ? "LOST: " : "AMOUNT: "}
            </span>
            <span className={cn(
              "font-[family-name:var(--font-display)] font-semibold",
              (bet.status === "won" || bet.status === "claimable") && "text-white"
            )}>
              {bet.status === "won" || bet.status === "claimable" ? bet.payout : bet.amount} USDC
            </span>
          </div>
        </div>

        {bet.status === "in_void" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-[family-name:var(--font-body)] text-xs uppercase">
              PLACED: {bet.placedAt.toLocaleDateString()}
            </span>
          </div>
        )}

        {bet.status === "claimable" && (
          <Button variant="accent" size="lg" className="w-full" onClick={handleClaim}>
            CLAIM {bet.payout} USDC
          </Button>
        )}

        {(bet.status === "won" && bet.claimedAt) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4 text-white" />
            <span className="font-[family-name:var(--font-body)] text-xs uppercase">
              CLAIMED: {bet.claimedAt.toLocaleDateString()}
            </span>
          </div>
        )}

        {bet.status === "in_void" && (
          <Link href={`/markets/${bet.marketId}`}>
            <Button variant="outline" size="sm" className="w-full">
              VIEW MARKET →
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
