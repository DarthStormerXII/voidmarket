"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  Plus,
  Swords,
  Users,
  Zap,
  LogOut,
  Crown
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClusterMemberCard } from "@/components/cluster/cluster-member-card"
import { NovaCard } from "@/components/cluster/nova-card"
import { BottomNav } from "@/components/layout/bottom-nav"
import { VoidLogo } from "@/components/ui/void-logo"
import {
  mockStar,
  mockClusters,
  mockNova,
  mockTopClusters
} from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { haptics } from "@/lib/haptics"

export default function ClustersPage() {
  const router = useRouter()

  // Check if user is in a cluster
  const userCluster = mockClusters.find(c => c.id === mockStar.clusterId)

  // Sort members by photons for ranking
  const sortedMembers = userCluster
    ? [...userCluster.members].sort((a, b) => b.photons - a.photons)
    : []

  const handleStartNova = () => {
    haptics.buttonTap()
    // TODO: Implement nova matchmaking
    console.log("Starting nova...")
  }

  const handleLeaveCluster = () => {
    haptics.buttonTap()
    // TODO: Implement leave cluster
    console.log("Leaving cluster...")
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-void-surface">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="p-2 -ml-2" onClick={() => haptics.buttonTap()}>
            <ChevronLeft className="h-6 w-6 text-muted-foreground" />
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase tracking-wider">
            {userCluster ? "MY CLUSTER" : "CLUSTERS"}
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6">
        {userCluster ? (
          <>
            {/* Cluster Header */}
            <Card className="bg-void-mid border-primary/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-foreground uppercase tracking-wider">
                    {userCluster.name}
                  </h2>
                  {userCluster.description && (
                    <p className="font-[family-name:var(--font-body)] text-sm text-muted-foreground mt-2">
                      {userCluster.description}
                    </p>
                  )}

                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="h-5 w-5 text-white" />
                        <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
                          {userCluster.energy.toLocaleString()}
                        </span>
                      </div>
                      <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                        ENERGY
                      </p>
                    </div>
                    <div className="w-px h-10 bg-void-surface" />
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Swords className="h-5 w-5 text-white/60" />
                        <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
                          {userCluster.novasWon}/{userCluster.totalNovas}
                        </span>
                      </div>
                      <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                        NOVAS WON
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Nova */}
            {mockNova && mockNova.status === "active" && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Swords className="h-4 w-4 text-white" />
                  <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase">
                    ACTIVE NOVA
                  </span>
                </div>
                <NovaCard
                  nova={mockNova}
                  userClusterId={mockStar.clusterId}
                  onClick={() => {
                    haptics.buttonTap()
                    router.push(`/clusters/nova/${mockNova.id}`)
                  }}
                />
              </div>
            )}

            {/* Start Nova Button (if not in nova) */}
            {!userCluster.currentNovaId && (
              <Button
                variant="default"
                size="lg"
                onClick={handleStartNova}
                className="w-full"
              >
                <Swords className="mr-2 h-5 w-5" />
                START NOVA
              </Button>
            )}

            <div className="h-px bg-void-surface" />

            {/* Members */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-white" />
                <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase">
                  MEMBERS ({userCluster.members.length})
                </span>
              </div>

              <div className="space-y-2">
                {sortedMembers.map((member, index) => (
                  <ClusterMemberCard
                    key={member.odId}
                    member={member}
                    isLeader={member.odId === userCluster.leaderId}
                    rank={index + 1}
                  />
                ))}
              </div>
            </div>

            <div className="h-px bg-void-surface" />

            {/* Leave Cluster */}
            <button
              onClick={handleLeaveCluster}
              className="flex items-center justify-center gap-2 w-full py-3 text-muted-foreground hover:text-white/60 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-[family-name:var(--font-display)] text-xs uppercase tracking-wider">
                LEAVE CLUSTER
              </span>
            </button>
          </>
        ) : (
          <>
            {/* No Cluster State */}
            <div className="text-center py-8">
              <VoidLogo size="lg" className="mx-auto mb-4 opacity-50" />
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-foreground uppercase mb-2">
                JOIN A CLUSTER
              </h2>
              <p className="font-[family-name:var(--font-body)] text-sm text-muted-foreground max-w-xs mx-auto">
                Clusters are teams of stars that compete in novas together for energy and glory
              </p>
            </div>

            <Link href="/clusters/create">
              <Button
                variant="default"
                size="xl"
                onClick={() => haptics.buttonTap()}
                className="w-full"
              >
                <Plus className="mr-2 h-5 w-5" />
                CREATE CLUSTER
              </Button>
            </Link>

            <Card className="bg-void-deep border-void-surface">
              <CardContent className="p-4 text-center">
                <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                  Or join an existing cluster via invite link
                </p>
              </CardContent>
            </Card>

            <div className="h-px bg-void-surface" />

            {/* Top Clusters Leaderboard */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-4 w-4 text-white" />
                <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase">
                  TOP CLUSTERS
                </span>
              </div>

              <div className="space-y-2">
                {mockTopClusters.map((cluster, index) => (
                  <Card key={cluster.id} className="bg-void-deep border-void-surface">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-[family-name:var(--font-display)] text-sm font-bold",
                          index === 0 && "bg-white/20 text-white",
                          index === 1 && "bg-white/10 text-white/80",
                          index === 2 && "bg-void-surface text-white/60",
                          index > 2 && "bg-void-surface text-muted-foreground"
                        )}>
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase truncate">
                            {cluster.name}
                          </p>
                          <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                            {cluster.members.length} MEMBERS | {cluster.novasWon} WINS
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Zap className="h-4 w-4 text-white" />
                          <span className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground">
                            {cluster.energy.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
