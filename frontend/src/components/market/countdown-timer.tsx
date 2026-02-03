"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Clock } from "lucide-react"

interface CountdownTimerProps {
  targetDate: Date
  className?: string
  onComplete?: () => void
  compact?: boolean
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const difference = targetDate.getTime() - new Date().getTime()

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  }
}

function TimeUnit({ value, label, urgent }: { value: number; label: string; urgent?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className={cn(
        "font-[family-name:var(--font-accent)] text-2xl font-black text-foreground",
        urgent ? "text-white text-glow" : "text-glow-soft"
      )}>
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-[family-name:var(--font-body)] text-[10px] text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
    </div>
  )
}

export function CountdownTimer({ targetDate, className, onComplete, compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(targetDate))
  const [isUrgent, setIsUrgent] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetDate)
      setTimeLeft(newTimeLeft)

      // Check if urgent (less than 24 hours)
      const totalHours = newTimeLeft.days * 24 + newTimeLeft.hours
      setIsUrgent(totalHours < 24)

      // Check if complete
      if (
        newTimeLeft.days === 0 &&
        newTimeLeft.hours === 0 &&
        newTimeLeft.minutes === 0 &&
        newTimeLeft.seconds === 0
      ) {
        clearInterval(timer)
        onComplete?.()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate, onComplete])

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
        <Clock className="h-3 w-3" />
        <span className="font-[family-name:var(--font-body)] text-xs uppercase">
          {timeLeft.days > 0 ? `${timeLeft.days}D ` : ""}
          {timeLeft.hours}H {timeLeft.minutes}M
        </span>
      </div>
    )
  }

  return (
    <div className={cn("rounded-xl bg-void-surface border border-void-surface p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Clock className={cn("h-4 w-4", isUrgent ? "text-white" : "text-white/70")} />
        <span className="font-[family-name:var(--font-display)] text-xs text-muted-foreground tracking-widest uppercase">
          TIME REMAINING
        </span>
      </div>

      <div className={cn(
        "flex justify-center items-center gap-2",
        isUrgent && "animate-pulse"
      )}>
        <TimeUnit value={timeLeft.days} label="D" urgent={isUrgent} />
        <span className="font-[family-name:var(--font-accent)] text-2xl text-primary animate-pulse">:</span>
        <TimeUnit value={timeLeft.hours} label="H" urgent={isUrgent} />
        <span className="font-[family-name:var(--font-accent)] text-2xl text-primary animate-pulse">:</span>
        <TimeUnit value={timeLeft.minutes} label="M" urgent={isUrgent} />
        <span className="font-[family-name:var(--font-accent)] text-2xl text-primary animate-pulse">:</span>
        <TimeUnit value={timeLeft.seconds} label="S" urgent={isUrgent} />
      </div>
    </div>
  )
}
