import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-3 py-1 font-[family-name:var(--font-display)] text-xs font-semibold uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "bg-white/20 text-white border border-white/30",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-white/10 text-white/70 border border-white/20",
        success: "bg-white/20 text-white border border-white/30",
        accent: "bg-white/20 text-white border border-white/30",
        outline: "border border-white text-white bg-transparent",
        muted: "bg-muted text-muted-foreground",
        // Status-specific
        inVoid: "bg-white/20 text-white border border-white/30",
        claimable: "bg-white/30 text-white border border-white animate-pulse",
        won: "bg-white/20 text-white border border-white/30",
        lost: "bg-white/10 text-white/60 border border-white/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
