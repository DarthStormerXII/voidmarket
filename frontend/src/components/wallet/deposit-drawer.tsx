"use client"

import { useState } from "react"
import {
  Copy,
  Check,
  ExternalLink,
  X,
  ArrowDownLeft,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/components/providers/wallet-provider"
import { haptics } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import { getSupportedDepositChains, type BridgeChainInfo } from "@/lib/services/circle/bridge-kit"

interface DepositDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function DepositDrawer({ isOpen, onClose }: DepositDrawerProps) {
  const { address } = useWallet()
  const [copied, setCopied] = useState(false)
  const supportedChains = getSupportedDepositChains()

  const handleCopy = () => {
    if (!address) return
    haptics.buttonTap()
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
            <ArrowDownLeft className="h-5 w-5 text-primary" />
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold uppercase tracking-wider">
              DEPOSIT USDC
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-void-surface">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="px-4 pb-8 space-y-4">
          {/* Wallet Address */}
          <Card className="bg-void-mid border-primary/20">
            <CardContent className="p-4">
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mb-2">
                YOUR DEPOSIT ADDRESS
              </p>
              <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground mb-3">
                Same address on all supported chains
              </p>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-void-surface">
                <span className="font-[family-name:var(--font-mono)] text-xs text-foreground break-all flex-1">
                  {address || "Loading..."}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg hover:bg-void-mid transition-colors flex-shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-white" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-void-deep border-void-surface">
            <CardContent className="p-4">
              <p className="font-[family-name:var(--font-display)] text-xs text-muted-foreground uppercase tracking-wider mb-3">
                HOW TO DEPOSIT
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="font-[family-name:var(--font-display)] text-xs text-primary font-bold">1</span>
                  <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                    Copy your wallet address above
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-[family-name:var(--font-display)] text-xs text-primary font-bold">2</span>
                  <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                    Send USDC from any supported chain to this address
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-[family-name:var(--font-display)] text-xs text-primary font-bold">3</span>
                  <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                    Your balance will update automatically
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supported Chains */}
          <div>
            <p className="font-[family-name:var(--font-display)] text-xs text-muted-foreground uppercase tracking-wider mb-3">
              SUPPORTED CHAINS
            </p>
            <div className="space-y-2">
              {supportedChains.map((chain) => (
                <Card key={chain.id} className="bg-void-deep border-void-surface">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-void-surface flex items-center justify-center">
                          <span className="font-[family-name:var(--font-display)] text-[10px] text-foreground font-bold">
                            {chain.name.split(' ')[0].slice(0, 3).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase">
                            {chain.name}
                          </p>
                          <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground">
                            USDC ({chain.usdcDecimals} decimals)
                          </p>
                        </div>
                      </div>
                      {address && (
                        <a
                          href={`${chain.explorerUrl}/address/${address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-void-surface transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Arc Testnet Direct */}
          <Card className="bg-white/5 border-white/20">
            <CardContent className="p-4 text-center">
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                For Arc Testnet USDC, use the{" "}
                <a
                  href="https://faucet.testnet.arc.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Arc Faucet
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
