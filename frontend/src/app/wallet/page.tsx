"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ExternalLink,
  Check,
  Coins,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { VoidLogo } from "@/components/ui/void-logo"
import { BottomNav } from "@/components/layout/bottom-nav"
import { mockUserBalance, mockTransactions } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { haptics } from "@/lib/haptics"

const filterTabs: { id: "all" | "deposit" | "withdraw" | "bet" | "winnings"; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "deposit", label: "DEPOSITS" },
  { id: "withdraw", label: "WITHDRAWS" },
  { id: "bet", label: "BETS" },
  { id: "winnings", label: "WINS" },
]

export default function WalletPage() {
  const [selectedFilter, setSelectedFilter] = useState<"all" | "deposit" | "withdraw" | "bet" | "winnings">("all")
  const [copied, setCopied] = useState(false)

  // Mock wallet address
  const walletAddress = "0x1234...5678"
  const fullAddress = "0x1234567890abcdef1234567890abcdef12345678"

  const handleCopyAddress = () => {
    haptics.buttonTap()
    navigator.clipboard.writeText(fullAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredTransactions = mockTransactions.filter(tx => {
    if (selectedFilter === "all") return true
    return tx.type === selectedFilter
  })

  const stats = {
    totalDeposited: mockTransactions
      .filter(t => t.type === "deposit")
      .reduce((acc, t) => acc + t.amount, 0),
    totalWithdrawn: mockTransactions
      .filter(t => t.type === "withdraw")
      .reduce((acc, t) => acc + t.amount, 0),
    totalWon: mockTransactions
      .filter(t => t.type === "winnings")
      .reduce((acc, t) => acc + t.amount, 0),
    totalBet: mockTransactions
      .filter(t => t.type === "bet")
      .reduce((acc, t) => acc + t.amount, 0),
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
            WALLET
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Balance Card */}
        <Card className="bg-void-mid border-primary/20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-center gap-2 mb-4">
              <VoidLogo size="md" />
            </div>

            <div className="text-center mb-6">
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mb-1">
                AVAILABLE BALANCE
              </p>
              <p className="font-[family-name:var(--font-display)] text-4xl font-bold text-foreground text-glow">
                {mockUserBalance.toFixed(4)}
              </p>
              <p className="font-[family-name:var(--font-body)] text-sm text-muted-foreground uppercase">
                USDC
              </p>
            </div>

            {/* Wallet Address */}
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-void-surface">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-[family-name:var(--font-mono)] text-sm text-foreground">
                {walletAddress}
              </span>
              <button
                onClick={handleCopyAddress}
                className="p-1 rounded hover:bg-void-mid transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <a
                href={`https://etherscan.io/address/${fullAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-void-mid transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button variant="default" size="lg" onClick={() => haptics.buttonTap()}>
                <ArrowDownLeft className="h-4 w-4 mr-2" />
                DEPOSIT
              </Button>
              <Button variant="outline" size="lg" onClick={() => haptics.buttonTap()}>
                <ArrowUpRight className="h-4 w-4 mr-2" />
                WITHDRAW
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-void-deep border-void-surface">
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-5 w-5 text-white mx-auto mb-1" />
              <p className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
                +{stats.totalWon.toFixed(2)}
              </p>
              <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground uppercase">
                TOTAL WON
              </p>
            </CardContent>
          </Card>
          <Card className="bg-void-deep border-void-surface">
            <CardContent className="p-3 text-center">
              <TrendingDown className="h-5 w-5 text-white/60 mx-auto mb-1" />
              <p className="font-[family-name:var(--font-display)] text-lg font-bold text-white/60">
                -{stats.totalBet.toFixed(2)}
              </p>
              <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground uppercase">
                TOTAL BET
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                haptics.buttonTap()
                setSelectedFilter(tab.id)
              }}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-lg font-[family-name:var(--font-display)] text-xs uppercase tracking-wider transition-all",
                selectedFilter === tab.id
                  ? "bg-primary/20 text-primary"
                  : "bg-void-surface text-muted-foreground hover:text-secondary-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="h-px bg-void-surface" />

        {/* Transaction History */}
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase mb-3">
            TRANSACTION HISTORY
          </h3>

          {filteredTransactions.length > 0 ? (
            <div className="space-y-2">
              {filteredTransactions.map(tx => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <VoidLogo size="md" className="mx-auto mb-3 opacity-50" />
              <p className="font-[family-name:var(--font-display)] text-sm text-muted-foreground uppercase">
                NO TRANSACTIONS
              </p>
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mt-1">
                YOUR HISTORY WILL APPEAR HERE
              </p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

function TransactionRow({ transaction }: { transaction: typeof mockTransactions[0] }) {
  const getIcon = () => {
    switch (transaction.type) {
      case "deposit":
        return <ArrowDownLeft className="h-4 w-4 text-white" />
      case "withdraw":
        return <ArrowUpRight className="h-4 w-4 text-white/60" />
      case "bet":
        return <Coins className="h-4 w-4 text-white/80" />
      case "winnings":
        return <Coins className="h-4 w-4 text-white" />
      default:
        return <Coins className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getAmountColor = () => {
    switch (transaction.type) {
      case "deposit":
      case "winnings":
        return "text-white"
      case "withdraw":
      case "bet":
        return "text-white/60"
      default:
        return "text-foreground"
    }
  }

  const getAmountPrefix = () => {
    switch (transaction.type) {
      case "deposit":
      case "winnings":
        return "+"
      case "withdraw":
      case "bet":
        return "-"
      default:
        return ""
    }
  }

  const getBadgeVariant = () => {
    switch (transaction.status) {
      case "confirmed":
        return "inVoid"
      case "pending":
        return "outline"
      case "failed":
        return "lost"
      default:
        return "outline"
    }
  }

  return (
    <Card className="bg-void-deep border-void-surface hover:border-white/30 transition-colors">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-void-surface flex items-center justify-center">
            {getIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-foreground uppercase truncate">
                {transaction.type === "bet" || transaction.type === "winnings"
                  ? transaction.marketTitle
                  : transaction.type.toUpperCase()}
              </p>
              <p className={cn(
                "font-[family-name:var(--font-display)] text-sm font-bold",
                getAmountColor()
              )}>
                {getAmountPrefix()}{transaction.amount} USDC
              </p>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                {transaction.timestamp.toLocaleDateString()}
              </p>
              <Badge variant={getBadgeVariant()} className="text-[10px]">
                {transaction.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
