"use client"

import { useState } from "react"
import {
  ArrowUpRight,
  X,
  Loader2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWallet } from "@/components/providers/wallet-provider"
import { useTelegram } from "@/components/providers/telegram-provider"
import { haptics } from "@/lib/haptics"

interface WithdrawDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function WithdrawDrawer({ isOpen, onClose }: WithdrawDrawerProps) {
  const { arcBalance, refreshBalance } = useWallet()
  const { user } = useTelegram()
  const [destinationAddress, setDestinationAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleWithdraw = async () => {
    if (!destinationAddress || !amount || !user?.id) return

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Invalid amount")
      return
    }

    if (amountNum > arcBalance) {
      setError("Insufficient balance")
      return
    }

    // Validate address format
    if (!/^0x[0-9a-fA-F]{40}$/.test(destinationAddress)) {
      setError("Invalid Ethereum address")
      return
    }

    haptics.buttonTap()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUserId: user.id,
          destinationAddress,
          amount: amountNum,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Withdrawal failed")
      }

      haptics.success()
      setSuccess(true)
      await refreshBalance()

      setTimeout(() => {
        setSuccess(false)
        setDestinationAddress("")
        setAmount("")
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed")
      haptics.error()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full bg-background border-t border-void-surface rounded-t-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-void-surface" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-white" />
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase tracking-wider">
              WITHDRAW USDC
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-void-surface">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="px-4 pb-8 space-y-4">
          {/* Available Balance */}
          <Card className="bg-void-mid border-void-surface">
            <CardContent className="p-4 text-center">
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mb-1">
                AVAILABLE ON ARC TESTNET
              </p>
              <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
                {arcBalance.toFixed(4)} USDC
              </p>
            </CardContent>
          </Card>

          {/* Destination Address */}
          <div>
            <label className="font-[family-name:var(--font-display)] text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              DESTINATION ADDRESS
            </label>
            <Input
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="0x..."
              className="bg-void-deep border-void-surface font-[family-name:var(--font-mono)] text-sm"
            />
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-[family-name:var(--font-display)] text-xs text-muted-foreground uppercase tracking-wider">
                AMOUNT (USDC)
              </label>
              <button
                onClick={() => {
                  haptics.buttonTap()
                  setAmount(arcBalance.toString())
                }}
                className="font-[family-name:var(--font-display)] text-xs text-primary uppercase tracking-wider hover:underline"
              >
                MAX
              </button>
            </div>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="bg-void-deep border-void-surface"
              step="0.001"
              min="0"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="font-[family-name:var(--font-body)] text-xs text-red-500 text-center">
              {error}
            </p>
          )}

          {/* Success */}
          {success && (
            <Card className="bg-white/10 border-white/30">
              <CardContent className="p-3 text-center">
                <p className="font-[family-name:var(--font-display)] text-sm text-white font-semibold uppercase">
                  WITHDRAWAL SUBMITTED
                </p>
              </CardContent>
            </Card>
          )}

          {/* Withdraw Button */}
          <Button
            variant="default"
            size="xl"
            onClick={handleWithdraw}
            disabled={!destinationAddress || !amount || isSubmitting || success}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                PROCESSING...
              </>
            ) : (
              "WITHDRAW"
            )}
          </Button>

          {/* Info */}
          <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground text-center">
            Withdrawals are sent on Arc Testnet. Transfer may take a few minutes to confirm.
          </p>
        </div>
      </div>
    </div>
  )
}
