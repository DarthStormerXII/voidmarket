import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import Link from "next/link"

interface SectionHeaderProps {
  icon: LucideIcon
  label: string
  action?: {
    label: string
    href: string
  }
  className?: string
}

export function SectionHeader({ icon: Icon, label, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="font-[family-name:var(--font-display)] text-sm text-muted-foreground tracking-widest uppercase">
          {label}
        </span>
      </div>
      {action && (
        <Link
          href={action.href}
          className="font-[family-name:var(--font-body)] text-xs text-primary hover:underline uppercase tracking-wide"
        >
          {action.label} →
        </Link>
      )}
    </div>
  )
}
