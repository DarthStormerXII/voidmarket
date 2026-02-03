"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, ChevronRight, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { VoidLogo } from "@/components/ui/void-logo"
import { StarAvatar, STAR_TYPE_NAMES } from "@/components/ui/star-avatar"
import { StarSelector } from "@/components/onboarding/star-selector"
import { StarType } from "@/types"
import { cn } from "@/lib/utils"
import { haptics } from "@/lib/haptics"

type OnboardingStep = "welcome" | "story1" | "story2" | "story3" | "star" | "profile" | "deposit" | "complete"

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
  const [step, setStep] = useState<OnboardingStep>("welcome")
  const [selectedStar, setSelectedStar] = useState<StarType | null>(null)
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [isAnimating, setIsAnimating] = useState(false)

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress dots */}
      {step !== "welcome" && step !== "complete" && (
        <div className="fixed top-6 left-0 right-0 z-50 flex justify-center gap-2">
          {["story1", "story2", "story3", "star", "profile", "deposit"].map((s, i) => (
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
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-foreground uppercase text-center mb-4 tracking-widest">
              WELCOME TO
            </h1>
            <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold text-foreground uppercase text-center mb-8 tracking-widest text-glow">
              THE VOID
            </h2>
            <p className="font-[family-name:var(--font-body)] text-sm text-muted-foreground text-center mb-12 max-w-xs">
              Prediction markets powered by conviction. Enter the void and shape your destiny.
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
                onClick={() => handleNext("deposit")}
                disabled={!name.trim()}
                className="w-full"
              >
                CONTINUE
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Deposit USDC */}
        {step === "deposit" && (
          <div className="flex-1 flex flex-col pt-16 pb-8 px-4">
            <div className="text-center mb-8">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground uppercase mb-2 tracking-wider">
                FUEL YOUR STAR
              </h2>
              <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase">
                DEPOSIT USDC TO START TRADING
              </p>
            </div>

            <div className="flex justify-center mb-8">
              <VoidLogo size="lg" />
            </div>

            <Card className="bg-void-deep border-void-surface mb-6">
              <CardContent className="p-6 text-center">
                <p className="font-[family-name:var(--font-body)] text-xs text-muted-foreground uppercase mb-2">
                  CURRENT BALANCE
                </p>
                <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-foreground">
                  0.00 USDC
                </p>
              </CardContent>
            </Card>

            <div className="space-y-3 flex-1">
              <Button
                variant="default"
                size="lg"
                onClick={() => {
                  haptics.buttonTap()
                  // TODO: Connect wallet and deposit
                }}
                className="w-full"
              >
                <Wallet className="mr-2 h-4 w-4" />
                CONNECT WALLET
              </Button>

              <p className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground text-center px-4">
                VOIDMARKET USES ARC NETWORK FOR UNIFIED USDC BALANCE ACROSS ALL CHAINS
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <Button
                variant="outline"
                size="xl"
                onClick={() => handleNext("complete")}
                className="w-full"
              >
                SKIP FOR NOW
              </Button>
            </div>
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
