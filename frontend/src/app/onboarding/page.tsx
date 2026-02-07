"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, ChevronRight, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { VoidLogo } from "@/components/ui/void-logo"
import { StarAvatar, STAR_TYPE_NAMES } from "@/components/ui/star-avatar"
import { StarSelector } from "@/components/onboarding/star-selector"
import { StarType } from "@/types"
import { cn } from "@/lib/utils"
import { haptics } from "@/lib/haptics"
import { useTelegram } from "@/components/providers/telegram-provider"
import { useWallet } from "@/components/providers/wallet-provider"

type OnboardingStep = "welcome" | "story1" | "story2" | "story3" | "star" | "profile" | "fuel" | "complete"
type FuelPhase = "init" | "wallet" | "subdomain" | "balance" | "ready"

const STORY_SLIDES = [
  {
    id: "story1",
    title: "THE VOID AWAITS",
    description: "In the vast expanse of the crypto universe, prediction markets emerge from the darkness. Here, knowledge is power and conviction becomes currency.",
  },
  {
    id: "story2",
    title: "BECOME A STAR",
    description: "Every trader is a star burning bright in the void. Join clusters of like-minded voyagers, compete in battles, and earn photons through your predictive prowess.",
  },
  {
    id: "story3",
    title: "SHAPE THE COSMOS",
    description: "Fork existing markets to create your own constellations. Challenge other clusters in epic battles. Your predictions will echo through the void.",
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useTelegram()
  const { arcBalance, gatewayBalances } = useWallet()
  const [step, setStep] = useState<OnboardingStep>("welcome")
  const [selectedStar, setSelectedStar] = useState<StarType | null>(null)
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [isAnimating, setIsAnimating] = useState(false)

  // Fuel step state
  const [fuelPhase, setFuelPhase] = useState<FuelPhase>("init")
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [ensSubdomain, setEnsSubdomain] = useState<string | null>(null)
  const [chainsVisible, setChainsVisible] = useState(true)
  const [copied, setCopied] = useState(false)
  const [fuelError, setFuelError] = useState<string | null>(null)

  // Check if already onboarded
  useEffect(() => {
    const onboarded = localStorage.getItem("voidmarket_onboarded")
    if (onboarded === "true") {
      router.replace("/")
    }
  }, [router])

  const handleNext = (nextStep: OnboardingStep) => {
    haptics.buttonTap()
    setIsAnimating(true)
    setTimeout(() => {
      setStep(nextStep)
      setIsAnimating(false)
    }, 300)
  }

  const handleComplete = () => {
    haptics.success()
    localStorage.setItem("voidmarket_onboarded", "true")
    localStorage.setItem("voidmarket_star", JSON.stringify({
      name,
      starType: selectedStar,
      bio,
    }))
    router.push("/")
  }

  const handleSkip = () => {
    haptics.buttonTap()
    handleNext("star")
  }

  const copyAddress = useCallback(() => {
    if (!walletAddress) return
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    haptics.buttonTap()
    setTimeout(() => setCopied(false), 2000)
  }, [walletAddress])

  // Fuel step: run the multi-phase animation sequence
  const startFuelSequence = useCallback(async () => {
    setFuelPhase("init")
    setFuelError(null)

    try {
      // Phase 1: Create wallet + register star
      const telegramUserId = user?.id?.toString() || "test_user_123"
      const starName = name.trim().toLowerCase().replace(/\s+/g, "-")

      const res = await fetch("/api/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUserId,
          name: starName,
          starType: selectedStar,
          description: bio || undefined,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to register star")
      }

      const data = await res.json()
      const addr = data.walletAddress || data.star?.address
      setWalletAddress(addr)
      setFuelPhase("wallet")
      haptics.buttonTap()

      // Phase 2: Show ENS subdomain after 1s
      await new Promise((r) => setTimeout(r, 1000))
      setEnsSubdomain(`${starName}.voidmarket.eth`)
      setFuelPhase("subdomain")
      haptics.success()

      // Phase 3: Show balance after 1s
      await new Promise((r) => setTimeout(r, 1000))
      setFuelPhase("balance")

      // Trigger chain fade after 1s
      await new Promise((r) => setTimeout(r, 1000))
      setChainsVisible(false)

      // Mark ready after fade begins
      await new Promise((r) => setTimeout(r, 500))
      setFuelPhase("ready")
    } catch (err) {
      console.error("Fuel sequence error:", err)
      setFuelError(err instanceof Error ? err.message : "Something went wrong")
      setFuelPhase("ready")
    }
  }, [user?.id, name, selectedStar, bio])

  // Trigger fuel sequence when entering fuel step
  useEffect(() => {
    if (step === "fuel" && fuelPhase === "init") {
      startFuelSequence()
    }
  }, [step, fuelPhase, startFuelSequence])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress dots */}
      {step !== "welcome" && step !== "complete" && (
        <div className="fixed top-6 left-0 right-0 z-50 flex justify-center gap-2">
          {["story1", "story2", "story3", "star", "profile", "fuel"].map((s) => (
            <div
              key={s}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                step === s ? "bg-white w-6" : "bg-white/30"
              )}
            />
          ))}
        </div>
      )}

      <div className={cn(
        "flex-1 flex flex-col transition-opacity duration-300",
        isAnimating ? "opacity-0" : "opacity-100"
      )}>
        {/* Welcome Screen */}
        {step === "welcome" && (
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <VoidLogo size="xl" className="mb-8 animate-pulse" />
            <h1 className="font-[family-name:var(--font-accent)] text-4xl font-bold text-foreground uppercase text-center mb-8 tracking-widest text-glow">
              VOIDMARKET
            </h1>
            <p className="font-[family-name:var(--font-body)] text-sm text-muted-foreground text-center mb-12 max-w-xs uppercase">
              Gamified private prediction markets that you can play and compete with your friends
            </p>
            <Button
              variant="default"
              size="xl"
              onClick={() => handleNext("story1")}
              className="w-full max-w-xs"
            >
              BEGIN YOUR JOURNEY
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Story Slides */}
        {(step === "story1" || step === "story2" || step === "story3") && (
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div className="flex-1 flex flex-col items-center justify-center">
              <VoidLogo size="lg" className="mb-8 opacity-50" />
              {STORY_SLIDES.map((slide) => (
                step === slide.id && (
                  <div key={slide.id} className="text-center">
                    <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground uppercase mb-6 tracking-wider">
                      {slide.title}
                    </h2>
                    <p className="font-[family-name:var(--font-body)] text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                      {slide.description}
                    </p>
                  </div>
                )
              ))}
            </div>

            <div className="pb-12 w-full max-w-xs space-y-3">
              <Button
                variant="default"
                size="lg"
                onClick={() => {
                  if (step === "story1") handleNext("story2")
                  else if (step === "story2") handleNext("story3")
                  else handleNext("star")
                }}
                className="w-full"
              >
                CONTINUE
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <button
                onClick={handleSkip}
                className="w-full py-2 font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              >
                SKIP INTRO
              </button>
            </div>
          </div>
        )}

        {/* Star Selection */}
        {step === "star" && (
          <div className="flex-1 flex flex-col pt-16 pb-8">
            <div className="text-center mb-8 px-4">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground uppercase mb-2 tracking-wider">
                CHOOSE YOUR STAR
              </h2>
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                SELECT YOUR COSMIC IDENTITY
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <StarSelector selectedStar={selectedStar} onSelect={setSelectedStar} />
            </div>

            <div className="px-4 pt-4">
              <Button
                variant="default"
                size="xl"
                onClick={() => handleNext("profile")}
                disabled={!selectedStar}
                className="w-full"
              >
                CONTINUE
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Profile Setup */}
        {step === "profile" && (
          <div className="flex-1 flex flex-col pt-16 pb-8 px-4">
            <div className="text-center mb-8">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground uppercase mb-2 tracking-wider">
                NAME YOUR STAR
              </h2>
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                WHAT SHALL THE VOID CALL YOU?
              </p>
            </div>

            <div className="flex justify-center mb-8">
              {selectedStar && <StarAvatar starType={selectedStar} size="xl" showGlow />}
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <label className="font-[family-name:var(--font-display)] text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  STAR NAME
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="ENTER YOUR NAME"
                  className="bg-void-deep border-void-surface text-center uppercase"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="font-[family-name:var(--font-display)] text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  BIO (OPTIONAL)
                </label>
                <Input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A brief description..."
                  className="bg-void-deep border-void-surface"
                  maxLength={100}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button
                variant="default"
                size="xl"
                onClick={() => handleNext("fuel")}
                disabled={!name.trim()}
                className="w-full"
              >
                CONTINUE
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Fuel Your Star — Multi-phase animated sequence */}
        {step === "fuel" && (
          <div className="flex-1 flex flex-col pt-16 pb-8 px-4">
            <div className="text-center mb-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground uppercase mb-2 tracking-wider text-glow">
                FUEL YOUR STAR
              </h2>
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                {fuelPhase === "init" && "FORGING YOUR WALLET..."}
                {fuelPhase === "wallet" && "WALLET FORGED"}
                {fuelPhase === "subdomain" && "MINTING YOUR SUBDOMAIN..."}
                {(fuelPhase === "balance" || fuelPhase === "ready") && "YOUR COSMIC IDENTITY HAS BEEN FORGED"}
              </p>
            </div>

            {/* Phase 1: Loading / Wallet forging */}
            {fuelPhase === "init" && (
              <div className="flex-1 flex flex-col items-center justify-center">
                <VoidLogo size="xl" className="animate-[spin-slow_3s_linear_infinite]" />
                <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mt-6 animate-pulse">
                  FORGING YOUR WALLET...
                </p>
              </div>
            )}

            {/* Phase 2+: Wallet address revealed */}
            {fuelPhase !== "init" && (
              <div className="flex-1 flex flex-col space-y-4">
                {/* Wallet Address Card */}
                <Card
                  className={cn(
                    "bg-void-deep border-void-surface",
                    fuelPhase === "wallet" && "animate-[reveal-from-void_0.5s_ease-out_forwards]"
                  )}
                >
                  <CardContent className="p-4">
                    <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                      WALLET ADDRESS
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground font-mono truncate">
                        {walletAddress
                          ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                          : "—"}
                      </p>
                      <button
                        onClick={copyAddress}
                        className="p-1.5 rounded-md hover:bg-white/10 transition-colors shrink-0"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-green-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </CardContent>
                </Card>

                {/* ENS Subdomain Card */}
                {(fuelPhase === "subdomain" || fuelPhase === "balance" || fuelPhase === "ready") && (
                  <Card
                    className={cn(
                      "bg-void-deep border-void-surface",
                      fuelPhase === "subdomain" && "animate-[reveal-from-void_0.5s_ease-out_forwards]"
                    )}
                  >
                    <CardContent className="p-4">
                      <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                        ENS SUBDOMAIN
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-[family-name:var(--font-display)] text-sm font-bold text-foreground text-glow">
                          {ensSubdomain || "—"}
                        </p>
                        <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Unified Balance Visualization */}
                {(fuelPhase === "balance" || fuelPhase === "ready") && (
                  <Card
                    className={cn(
                      "bg-void-deep border-void-surface",
                      fuelPhase === "balance" && "animate-[reveal-from-void_0.5s_ease-out_forwards]"
                    )}
                  >
                    <CardContent className="p-4">
                      <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground uppercase tracking-wider mb-4 text-center">
                        ONE UNIFIED BALANCE ACROSS CHAINS
                      </p>

                      {/* Arc Testnet — prominent */}
                      <div className="flex justify-center mb-4">
                        <div className="border border-primary/40 bg-void-mid rounded-lg px-6 py-3 text-center shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                          <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                            ARC TESTNET
                          </p>
                          <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground text-glow">
                            {arcBalance.toFixed(2)} USDC
                          </p>
                        </div>
                      </div>

                      {/* Other chains — fading */}
                      <div className="flex justify-center gap-4">
                        <div
                          className={cn(
                            "rounded-lg px-4 py-2 text-center transition-all duration-[3000ms]",
                            chainsVisible
                              ? "opacity-60 blur-[1px]"
                              : "opacity-15 blur-[2px]"
                          )}
                        >
                          <p className="font-[family-name:var(--font-body)] text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
                            ETH SEPOLIA
                          </p>
                          <p className="font-[family-name:var(--font-display)] text-sm font-bold text-muted-foreground">
                            {(gatewayBalances.find((g) => g.chain === "ETH-SEPOLIA")?.balanceUSDC ?? 0).toFixed(2)} USDC
                          </p>
                        </div>
                        <div
                          className={cn(
                            "rounded-lg px-4 py-2 text-center transition-all duration-[3000ms]",
                            chainsVisible
                              ? "opacity-60 blur-[1px]"
                              : "opacity-15 blur-[2px]"
                          )}
                        >
                          <p className="font-[family-name:var(--font-body)] text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
                            BASE SEPOLIA
                          </p>
                          <p className="font-[family-name:var(--font-display)] text-sm font-bold text-muted-foreground">
                            {(gatewayBalances.find((g) => g.chain === "BASE-SEPOLIA")?.balanceUSDC ?? 0).toFixed(2)} USDC
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Error state */}
                {fuelError && (
                  <p className="font-[family-name:var(--font-body)] text-xs text-red-400 text-center">
                    {fuelError}
                  </p>
                )}
              </div>
            )}

            {/* Actions — shown once ready */}
            {fuelPhase === "ready" && (
              <div className="pt-4 space-y-3">
                <Button
                  variant="default"
                  size="xl"
                  onClick={() => handleNext("complete")}
                  className="w-full"
                >
                  ENTER THE VOID
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <button
                  onClick={() => handleNext("complete")}
                  className="w-full py-2 font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  SKIP FOR NOW
                </button>
              </div>
            )}
          </div>
        )}

        {/* Complete */}
        {step === "complete" && (
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div className="mb-8">
              {selectedStar && <StarAvatar starType={selectedStar} size="xl" showGlow />}
            </div>

            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground uppercase mb-2 tracking-wider text-glow">
              YOU ARE READY
            </h2>
            <p className="font-[family-name:var(--font-display)] text-lg text-muted-foreground uppercase mb-2">
              {name}
            </p>
            <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mb-8">
              {selectedStar && STAR_TYPE_NAMES[selectedStar]}
            </p>

            <p className="font-[family-name:var(--font-body)] text-sm text-muted-foreground text-center mb-12 max-w-xs">
              Your star has been born. The void awaits your predictions.
            </p>

            <Button
              variant="default"
              size="xl"
              onClick={handleComplete}
              className="w-full max-w-xs"
            >
              ENTER THE VOID
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
