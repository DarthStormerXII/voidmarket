"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Users, Send, X, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BottomNav } from "@/components/layout/bottom-nav"
import { haptics } from "@/lib/haptics"
import { useWallet } from "@/components/providers/wallet-provider"

export default function CreateClusterPage() {
  const router = useRouter()
  const { createCluster, pollTransaction } = useWallet()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [telegramIds, setTelegramIds] = useState<string[]>([])
  const [newTelegramId, setNewTelegramId] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleAddMember = () => {
    if (newTelegramId.trim() && !telegramIds.includes(newTelegramId.trim())) {
      haptics.buttonTap()
      setTelegramIds([...telegramIds, newTelegramId.trim()])
      setNewTelegramId("")
    }
  }

  const handleRemoveMember = (id: string) => {
    haptics.buttonTap()
    setTelegramIds(telegramIds.filter(t => t !== id))
  }

  const handleCreate = async () => {
    if (!name.trim()) return

    haptics.buttonTap()
    setIsCreating(true)

    try {
      const { transactionId } = await createCluster(name.trim(), false)
      const result = await pollTransaction(transactionId)
      if (result.status === "CONFIRMED") {
        haptics.success()
        router.push("/clusters")
      } else {
        alert("Cluster creation failed")
      }
    } catch (err) {
      console.error("Failed to create cluster:", err)
      alert("Failed to create cluster")
    } finally {
      setIsCreating(false)
    }
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
            CREATE CLUSTER
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="px-4 pt-6 space-y-6">
        {/* Cluster Info */}
        <div className="space-y-4">
          <div>
            <label className="font-[family-name:var(--font-display)] text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              CLUSTER NAME
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="ENTER CLUSTER NAME"
              className="bg-void-deep border-void-surface uppercase"
              maxLength={20}
            />
          </div>

          <div>
            <label className="font-[family-name:var(--font-display)] text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              DESCRIPTION (OPTIONAL)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is your cluster about?"
              className="bg-void-deep border-void-surface"
              maxLength={100}
            />
          </div>
        </div>

        <div className="h-px bg-void-surface" />

        {/* Invite Members */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-white" />
            <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase">
              INVITE MEMBERS
            </span>
          </div>

          <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground mb-4">
            Add Telegram usernames to invite members after creation
          </p>

          {/* Add Member Input */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                value={newTelegramId}
                onChange={(e) => setNewTelegramId(e.target.value.replace("@", ""))}
                placeholder="telegram_username"
                className="bg-void-deep border-void-surface pl-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddMember()
                  }
                }}
              />
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={handleAddMember}
              disabled={!newTelegramId.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Member List */}
          {telegramIds.length > 0 && (
            <Card className="bg-void-deep border-void-surface">
              <CardContent className="p-3">
                <div className="flex flex-wrap gap-2">
                  {telegramIds.map((id) => (
                    <div
                      key={id}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-void-surface"
                    >
                      <Send className="h-3 w-3 text-muted-foreground" />
                      <span className="font-[family-name:var(--font-body)] text-xs text-foreground">
                        @{id}
                      </span>
                      <button
                        onClick={() => handleRemoveMember(id)}
                        className="p-0.5 rounded hover:bg-void-mid transition-colors"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {telegramIds.length === 0 && (
            <Card className="bg-void-deep border-void-surface">
              <CardContent className="p-4 text-center">
                <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                  No members added yet. You can invite them later too.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info Card */}
        <Card className="bg-white/5 border-white/20">
          <CardContent className="p-4">
            <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground text-center">
              You will be the leader of this cluster. Members can join via invite links or by being added directly.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-20 left-0 right-0 z-30 p-4 bg-background/95 backdrop-blur-lg border-t border-void-surface">
        <Button
          variant="default"
          size="xl"
          onClick={handleCreate}
          disabled={!name.trim() || isCreating}
          className="w-full"
        >
          {isCreating ? "CREATING..." : "CREATE CLUSTER"}
        </Button>
      </div>

      <BottomNav />
    </div>
  )
}
