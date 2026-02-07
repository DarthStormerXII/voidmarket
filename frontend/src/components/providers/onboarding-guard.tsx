"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    // Always render the onboarding page itself
    if (pathname === "/onboarding" || pathname === "/pitch") {
      setShowContent(true)
      return
    }

    const onboarded = localStorage.getItem("voidmarket_onboarded")
    if (onboarded !== "true") {
      router.replace("/onboarding")
    } else {
      setShowContent(true)
    }
  }, [pathname, router])

  // Show nothing while checking / redirecting (prevents flash of home page)
  if (!showContent) {
    return null
  }

  return <>{children}</>
}
