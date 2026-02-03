"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, TrendingUp, PlusCircle, Users, Star } from "lucide-react"
import { haptics } from "@/lib/haptics"

const navItems = [
  { href: "/", icon: Home, label: "HOME" },
  { href: "/markets", icon: TrendingUp, label: "MARKETS" },
  { href: "/create", icon: PlusCircle, label: "CREATE", accent: true },
  { href: "/clusters", icon: Users, label: "CLUSTERS" },
  { href: "/star", icon: Star, label: "STAR" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-void-deep/95 backdrop-blur-lg border-t border-void-surface safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => haptics.buttonTap()}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors min-w-[60px]",
                isActive
                  ? "text-white"
                  : item.accent
                  ? "text-white/80"
                  : "text-muted-foreground hover:text-secondary-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  item.accent && !isActive && "text-white/80"
                )}
              />
              <span className="font-[family-name:var(--font-body)] text-[10px] tracking-wider uppercase">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
