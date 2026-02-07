"use client"

import { useState } from "react"
import {
  ArrowUpRight,
  X,
  Loader2,
  Check,
  Clock,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useWallet } from "@/components/providers/wallet-provider"
import { useTelegram } from "@/components/providers/telegram-provider"
import { haptics } from "@/lib/haptics"
import { cn } from "@/lib/utils"

type WithdrawChain = "ARC-TESTNET" | "ETH-SEPOLIA" | "BASE-SEPOLIA"

const CHAIN_OPTIONS: { id: WithdrawChain; label: string; note: string }[] = [
  { id: "ARC-TESTNET", label: "ARC TESTNET", note: "Instant" },
  { id: "ETH-SEPOLIA", label: "ETH SEPOLIA", note: "~15-20 min (CCTP)" },
  { id: "BASE-SEPOLIA", label: "BASE SEPOLIA", note: "~15-20 min (CCTP)" },
]

interface WithdrawDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function WithdrawDrawer({ isOpen, onClose }: WithdrawDrawerProps) {
  const { arcBalance, refreshBalance, pollTransaction } = useWallet()
  const { user } = useTelegram()
  const [destinationAddress, setDestinationAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [selectedChain, setSelectedChain] = useState<WithdrawChain>("ARC-TESTNET")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<"idle" | "submitted" | "polling" | "confirmed" | "failed">("idle")
  const [txId, setTxId] = useState<string | null>(null)

  const isCrossChain = selectedChain !== "ARC-TESTNET"

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
    setTxStatus("idle")

    try {
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUserId: user.id,
          destinationAddress,
          amount: amountNum,
          destinationChain: selectedChain,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Withdrawal failed")
      }

      const data = await response.json()
      setTxId(data.transactionId)
      setTxStatus("submitted")
      haptics.success()

      // Poll for confirmation
      if (data.transactionId) {
        setTxStatus("polling")
        try {
          const result = await pollTransaction(data.transactionId)
          if (result.status === "CONFIRMED") {
            setTxStatus("confirmed")
            haptics.success()
            await refreshBalance()
          } else if (result.status === "FAILED" || result.status === "CANCELLED") {
            setTxStatus("failed")
            setError(`Transaction ${result.status.toLowerCase()}`)
            haptics.error()
          }
        } catch {
          // Polling timed out — for cross-chain this is expected
          if (isCrossChain) {
            setTxStatus("submitted")
          } else {
            setTxStatus("failed")
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed")
      setTxStatus("failed")
      haptics.error()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setTxStatus("idle")
      setTxId(null)
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
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
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-void-surface">
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

          {/* Destination Chain */}
          <div>
            <label className="font-[family-name:var(--font-display)] text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              DESTINATION CHAIN
            </label>
            <div className="flex gap-2">
              {CHAIN_OPTIONS.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => {
                    haptics.buttonTap()
                    setSelectedChain(chain.id)
                  }}
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 p-3 rounded-lg border transition-all text-center",
                    selectedChain === chain.id
                      ? "bg-white/10 border-white text-white"
                      : "bg-void-deep border-void-surface text-muted-foreground hover:border-white/30"
                  )}
                >
                  <p className="font-[family-name:var(--font-display)] text-[10px] font-semibold uppercase">
                    {chain.label}
                  </p>
                  <p className="font-[family-name:var(--font-body)] text-[9px] text-muted-foreground mt-0.5">
                    {chain.note}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Destination Address */}
          <div>
            <label className="font-[family-name:var(--font-display)] text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
              DESTINATION ADDRESS
            </label>
            <Input
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="0x..."
              disabled={isSubmitting}
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
                disabled={isSubmitting}
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
              disabled={isSubmitting}
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

          {/* Transaction Status */}
          {txStatus !== "idle" && txStatus !== "failed" && (
            <Card className={cn(
              "border",
              txStatus === "confirmed" ? "bg-white/10 border-white/30" : "bg-void-mid border-void-surface"
            )}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 justify-center">
                  {txStatus === "confirmed" ? (
                    <Check className="h-4 w-4 text-white" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
                  )}
                  <p className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase">
                    {txStatus === "submitted" && isCrossChain && "BRIDGE SUBMITTED"}
                    {txStatus === "submitted" && !isCrossChain && "WITHDRAWAL SUBMITTED"}
                    {txStatus === "polling" && "CONFIRMING..."}
                    {txStatus === "confirmed" && "WITHDRAWAL CONFIRMED"}
                  </p>
                </div>
                {isCrossChain && txStatus === "submitted" && (
                  <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground text-center mt-1">
                    Cross-chain transfers take ~15-20 minutes via CCTP
                  </p>
                )}
                {txId && (
                  <p className="font-[family-name:var(--font-mono)] text-[9px] text-muted-foreground text-center mt-1 break-all">
                    TX: {txId}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Withdraw Button */}
          <Button
            variant="default"
            size="xl"
            onClick={handleWithdraw}
            disabled={!destinationAddress || !amount || isSubmitting || txStatus === "confirmed"}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                PROCESSING...
              </>
            ) : txStatus === "confirmed" ? (
              "DONE"
            ) : isCrossChain ? (
              `BRIDGE TO ${selectedChain.replace('-', ' ')}`
            ) : (
              "WITHDRAW"
            )}
          </Button>

          {/* Info */}
          <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground text-center">
            {isCrossChain
              ? "Cross-chain withdrawals use CCTP and may take 15-20 minutes."
              : "Withdrawals are sent on Arc Testnet. Transfer may take a few minutes to confirm."}
          </p>
        </div>
      </div>
    </div>
  )
}
