"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  Copy,
  Check,
  ExternalLink,
  X,
  ArrowDownLeft,
  ArrowRightLeft,
  Loader2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/components/providers/wallet-provider"
import { useTelegram } from "@/components/providers/telegram-provider"
import { haptics } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import { getSupportedDepositChains, type BridgeChainInfo, type VoidMarketChain } from "@/lib/services/circle/bridge-kit"

interface DepositDrawerProps {
  isOpen: boolean
  onClose: () => void
}

type BridgeStatus = "idle" | "bridging" | "polling" | "confirmed" | "failed"

export function DepositDrawer({ isOpen, onClose }: DepositDrawerProps) {
  const { address, refreshBalance } = useWallet()
  const { user } = useTelegram()
  const [copied, setCopied] = useState(false)
  const supportedChains = getSupportedDepositChains()

  // Bridge states
  const [bridgingChain, setBridgingChain] = useState<VoidMarketChain | null>(null)
  const [bridgeAmount, setBridgeAmount] = useState("")
  const [isBridging, setIsBridging] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>("idle")
  const [bridgeTxId, setBridgeTxId] = useState<string | null>(null)
  const [bridgeError, setBridgeError] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const handleCopy = () => {
    if (!address) return
    haptics.buttonTap()
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetBridgeState = () => {
    setBridgingChain(null)
    setBridgeAmount("")
    setIsBridging(false)
    setBridgeStatus("idle")
    setBridgeTxId(null)
    setBridgeError(null)
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  const pollTransactionStatus = useCallback(
    (txId: string) => {
      setBridgeStatus("polling")
      let attempts = 0
      const maxAttempts = 240 // ~20 minutes at 5-second intervals

      pollIntervalRef.current = setInterval(async () => {
        attempts++

        try {
          const response = await fetch(`/api/transaction/${txId}`)
          if (!response.ok) {
            throw new Error("Failed to poll transaction")
          }

          const data = await response.json()

          if (data.status === "CONFIRMED") {
            setBridgeStatus("confirmed")
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            // Refresh balance after successful bridge
            await refreshBalance()
          } else if (data.status === "FAILED" || data.status === "CANCELLED") {
            setBridgeStatus("failed")
            setBridgeError(data.errorReason || "Bridge transfer failed")
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          }
        } catch (err) {
          console.error("[DepositDrawer] Poll error:", err)
        }

        if (attempts >= maxAttempts) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setBridgeStatus("failed")
          setBridgeError("Bridge timed out. The transfer may still complete -- check your balance later.")
        }
      }, 5000)
    },
    [refreshBalance]
  )

  const handleBridge = async (chain: VoidMarketChain) => {
    const amount = parseFloat(bridgeAmount)
    if (!amount || amount <= 0) {
      setBridgeError("Enter a valid amount greater than 0")
      return
    }

    const telegramUserId = user?.id || "test_user_123"

    setIsBridging(true)
    setBridgeStatus("bridging")
    setBridgeError(null)
    haptics.buttonTap()

    try {
      const response = await fetch("/api/deposit/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUserId,
          sourceChain: chain,
          amount,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to initiate bridge")
      }

      const data = await response.json()
      setBridgeTxId(data.transactionId)
      setIsBridging(false)

      // Start polling for transaction completion
      pollTransactionStatus(data.transactionId)
    } catch (err) {
      console.error("[DepositDrawer] Bridge error:", err)
      setBridgeError(err instanceof Error ? err.message : "Failed to bridge deposit")
      setIsBridging(false)
      setBridgeStatus("failed")
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
                    Click &quot;Bridge to Arc&quot; to move funds cross-chain via CCTP
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-[family-name:var(--font-display)] text-xs text-primary font-bold">4</span>
                  <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                    Your balance will update once the bridge completes (~15-20 min)
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
                      <div className="flex items-center gap-2">
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs font-[family-name:var(--font-display)] uppercase tracking-wider border-primary/30 hover:bg-primary/10"
                          onClick={() => {
                            haptics.buttonTap()
                            if (bridgingChain === chain.id) {
                              resetBridgeState()
                            } else {
                              resetBridgeState()
                              setBridgingChain(chain.id)
                            }
                          }}
                          disabled={isBridging || bridgeStatus === "polling"}
                        >
                          <ArrowRightLeft className="h-3 w-3 mr-1" />
                          Bridge
                        </Button>
                      </div>
                    </div>

                    {/* Bridge Input — shown when this chain is selected */}
                    {bridgingChain === chain.id && (
                      <div className="mt-3 pt-3 border-t border-void-surface space-y-3">
                        {/* Amount Input */}
                        {bridgeStatus === "idle" && (
                          <>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="Amount (USDC)"
                                value={bridgeAmount}
                                onChange={(e) => {
                                  setBridgeAmount(e.target.value)
                                  setBridgeError(null)
                                }}
                                min="0"
                                step="0.01"
                                className="flex-1 bg-void-surface border border-void-surface rounded-lg px-3 py-2 text-sm font-[family-name:var(--font-mono)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                              />
                              <Button
                                size="sm"
                                className="font-[family-name:var(--font-display)] uppercase tracking-wider text-xs"
                                onClick={() => handleBridge(chain.id)}
                                disabled={isBridging || !bridgeAmount}
                              >
                                {isBridging ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : null}
                                Bridge to Arc
                              </Button>
                            </div>
                            <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground">
                              CCTP bridge transfers typically take 15-20 minutes to complete.
                            </p>
                          </>
                        )}

                        {/* Bridging / Submitting */}
                        {bridgeStatus === "bridging" && (
                          <div className="flex items-center gap-2 py-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground">
                              Initiating CCTP bridge transfer...
                            </p>
                          </div>
                        )}

                        {/* Polling — waiting for confirmation */}
                        {bridgeStatus === "polling" && (
                          <div className="space-y-2 py-2">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              <p className="font-[family-name:var(--font-body)] text-xs text-foreground">
                                Bridge in progress...
                              </p>
                            </div>
                            {bridgeTxId && (
                              <p className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground break-all">
                                TX: {bridgeTxId}
                              </p>
                            )}
                            <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground">
                              CCTP bridge transfers take ~15-20 minutes. You can close this drawer and your balance will update automatically.
                            </p>
                          </div>
                        )}

                        {/* Confirmed */}
                        {bridgeStatus === "confirmed" && (
                          <div className="space-y-2 py-2">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-400" />
                              <p className="font-[family-name:var(--font-body)] text-xs text-green-400">
                                Bridge transfer confirmed!
                              </p>
                            </div>
                            <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground">
                              Your USDC has arrived on Arc Testnet. Balance has been refreshed.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs font-[family-name:var(--font-display)] uppercase tracking-wider"
                              onClick={resetBridgeState}
                            >
                              Done
                            </Button>
                          </div>
                        )}

                        {/* Failed */}
                        {bridgeStatus === "failed" && (
                          <div className="space-y-2 py-2">
                            <div className="flex items-center gap-2">
                              <X className="h-4 w-4 text-red-400" />
                              <p className="font-[family-name:var(--font-body)] text-xs text-red-400">
                                Bridge transfer failed
                              </p>
                            </div>
                            {bridgeError && (
                              <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground">
                                {bridgeError}
                              </p>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs font-[family-name:var(--font-display)] uppercase tracking-wider"
                              onClick={resetBridgeState}
                            >
                              Try Again
                            </Button>
                          </div>
                        )}

                        {/* Error message (for validation errors in idle state) */}
                        {bridgeError && bridgeStatus === "idle" && (
                          <p className="font-[family-name:var(--font-body)] text-[10px] text-red-400">
                            {bridgeError}
                          </p>
                        )}
                      </div>
                    )}
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
