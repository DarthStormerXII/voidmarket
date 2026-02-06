"use client"

import { useState } from "react"
import { Coins, AlertTriangle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VoidLogo } from "@/components/ui/void-logo"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { BetOutcome, Market } from "@/types"
import { haptics } from "@/lib/haptics"
import { toast } from "sonner"
import { useWallet } from "@/components/providers/wallet-provider"

interface PlaceBetDrawerProps {
  market: Market
  userBalance: number
  children: React.ReactNode
}

const quickAmounts = [0.1, 0.25, 0.5, 1.0]

export function PlaceBetDrawer({ market, userBalance, children }: PlaceBetDrawerProps) {
  const [open, setOpen] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<BetOutcome | null>(null)
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const { placeBet, pollTransaction, refreshBalance } = useWallet()

  const parsedAmount = parseFloat(amount) || 0
  const isValid = selectedOutcome && parsedAmount > 0 && parsedAmount <= userBalance

  const handleOutcomeSelect = (outcome: BetOutcome) => {
    haptics.selectOutcome()
    setSelectedOutcome(outcome)
  }

  const handleQuickAmount = (amt: number) => {
    haptics.buttonTap()
    setAmount(amt.toString())
  }

  const handleSubmit = async () => {
    if (!isValid || !selectedOutcome) return

    haptics.placeBet()
    setIsLoading(true)

    try {
      // Place bet via Circle SDK
      const { transactionId } = await placeBet({
        marketId: market.id,
        outcome: selectedOutcome,
        amount: parsedAmount,
        contractAddress: (market as any).contractAddress || "0x0000000000000000000000000000000000000000", // TODO: Add contractAddress to Market type
      })

      // Poll for transaction confirmation
      const result = await pollTransaction(transactionId)

      if (result.status === "CONFIRMED") {
        // Refresh balance after successful bet
        await refreshBalance()

        setIsLoading(false)
        setOpen(false)

        // Reset form
        setSelectedOutcome(null)
        setAmount("")

        // Show success toast
        haptics.betSuccess()
        toast.custom(() => (
          <div className="bg-void-mid border border-white/30 rounded-lg p-4 flex items-center gap-3 glow">
            <VoidLogo size="sm" />
            <div>
              <p className="font-[family-name:var(--font-display)] text-sm text-foreground uppercase">
                BET SENT INTO THE VOID
              </p>
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                {parsedAmount} USDC ON {selectedOutcome}
              </p>
            </div>
          </div>
        ))
      } else {
        throw new Error(`Transaction ${result.status}${result.errorReason ? `: ${result.errorReason}` : ""}`)
      }
    } catch (error) {
      setIsLoading(false)

      // Show error toast
      toast.error(error instanceof Error ? error.message : "Failed to place bet")
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>

      <DrawerContent>
        <DrawerHeader className="text-center">
          <DrawerTitle>PLACE YOUR BET</DrawerTitle>
          <DrawerDescription>&ldquo;{market.title}&rdquo;</DrawerDescription>
        </DrawerHeader>

        <div className="p-4 space-y-6">
          {/* Outcome Selector */}
          <div>
            <label className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase block mb-3">
              YOUR PREDICTION
            </label>
            <div className="grid grid-cols-2 gap-3">
              <OutcomeButton
                outcome="YES"
                selected={selectedOutcome === "YES"}
                onClick={() => handleOutcomeSelect("YES")}
              />
              <OutcomeButton
                outcome="NO"
                selected={selectedOutcome === "NO"}
                onClick={() => handleOutcomeSelect("NO")}
              />
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase block mb-3">
              BET AMOUNT
            </label>
            <div className="relative">
              <Coins className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white" />
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="pl-12 pr-16 h-14 text-xl font-[family-name:var(--font-display)] text-center"
                placeholder="0.00"
                step="0.01"
                min="0"
                max={userBalance}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-[family-name:var(--font-body)] text-sm text-muted-foreground">
                USDC
              </span>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 mt-3">
              {quickAmounts.map(amt => (
                <Button
                  key={amt}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(amt)}
                  className={cn(
                    "flex-1",
                    parsedAmount === amt && "bg-primary/20 border-primary"
                  )}
                >
                  {amt}
                </Button>
              ))}
            </div>

            <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground mt-2 uppercase">
              BALANCE: {userBalance} USDC
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-void-surface border border-white/20">
            <AlertTriangle className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
            <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase leading-relaxed">
              YOUR BET WILL BE HIDDEN UNTIL THE MARKET RESOLVES. NO ONE WILL SEE YOUR POSITION.
            </p>
          </div>

          {/* Submit */}
          <Button
            variant="default"
            size="xl"
            className="w-full"
            disabled={!isValid}
            loading={isLoading}
            onClick={handleSubmit}
          >
            <VoidLogo size="sm" className="mr-2" />
            SEND INTO THE VOID
          </Button>

          {/* Disclaimer */}
          <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground text-center uppercase">
            BY BETTING, YOU AGREE TO THE{" "}
            <a href="/terms" className="text-primary underline">TERMS OF SERVICE</a>
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function OutcomeButton({
  outcome,
  selected,
  onClick,
}: {
  outcome: BetOutcome
  selected: boolean
  onClick: () => void
}) {
  const isYes = outcome === "YES"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200",
        selected
          ? isYes
            ? "bg-white/20 border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            : "bg-white/10 border-white/60 text-white/80 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          : "bg-transparent border-void-surface text-muted-foreground hover:border-white/30"
      )}
    >
      <span className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-widest">
        {outcome}
      </span>
      <span className="font-[family-name:var(--font-body)] text-xs mt-1 flex items-center gap-1">
        {selected ? (
          <>
            <Check className="h-3 w-3" />
            SELECTED
          </>
        ) : (
          "SELECT"
        )}
      </span>
    </button>
  )
}
