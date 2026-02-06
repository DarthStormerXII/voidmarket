type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft"
type NotificationType = "error" | "success" | "warning"

// Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void
        expand: () => void
        close: () => void
        MainButton: {
          text: string
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
          enable: () => void
          disable: () => void
        }
        BackButton: {
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        HapticFeedback: {
          impactOccurred: (style: ImpactStyle) => void
          notificationOccurred: (type: NotificationType) => void
          selectionChanged: () => void
        }
        themeParams: {
          bg_color?: string
          text_color?: string
          hint_color?: string
          link_color?: string
          button_color?: string
          button_text_color?: string
          secondary_bg_color?: string
        }
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
            language_code?: string
          }
        }
        colorScheme: "light" | "dark"
        viewportHeight: number
        viewportStableHeight: number
        isExpanded: boolean
        platform: string
      }
    }
  }
}

export const haptics = {
  impact: (style: ImpactStyle = "medium") => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style)
    }
  },

  notification: (type: NotificationType) => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred(type)
    }
  },

  selection: () => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.selectionChanged()
    }
  },

  // Preset patterns
  buttonTap: () => haptics.impact("light"),
  selectOutcome: () => haptics.impact("medium"),
  placeBet: () => haptics.impact("heavy"),
  betSuccess: () => haptics.notification("success"),
  betError: () => haptics.notification("error"),
  success: () => haptics.notification("success"),
  error: () => haptics.notification("error"),
  winReveal: () => {
    haptics.impact("heavy")
    setTimeout(() => haptics.notification("success"), 200)
  },
  lossReveal: () => haptics.notification("error"),
}

export const telegram = {
  ready: () => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready()
    }
  },

  expand: () => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      window.Telegram.WebApp.expand()
    }
  },

  close: () => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      window.Telegram.WebApp.close()
    }
  },

  getUser: () => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.initDataUnsafe?.user) {
      return window.Telegram.WebApp.initDataUnsafe.user
    }
    return null
  },

  isAvailable: () => {
    return typeof window !== "undefined" && !!window.Telegram?.WebApp
  },
}
