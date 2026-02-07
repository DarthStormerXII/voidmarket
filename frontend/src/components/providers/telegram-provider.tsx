"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { telegram } from "@/lib/haptics";
import { syncCommitmentsToCloud } from "@/lib/commitment";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramContextType {
  isReady: boolean;
  isInTelegram: boolean;
  user: TelegramUser | null;
  platform: string;
  colorScheme: "light" | "dark";
  viewportHeight: number;
}

const TelegramContext = createContext<TelegramContextType>({
  isReady: false,
  isInTelegram: false,
  user: null,
  platform: "unknown",
  colorScheme: "dark",
  viewportHeight: 0,
});

export function useTelegram() {
  return useContext(TelegramContext);
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [contextValue, setContextValue] = useState<TelegramContextType>({
    isReady: false,
    isInTelegram: false,
    user: null,
    platform: "unknown",
    colorScheme: "dark",
    viewportHeight: 0,
  });

  useEffect(() => {
    const initTelegram = () => {
      const isInTelegram = telegram.isAvailable();

      if (isInTelegram && window.Telegram?.WebApp) {
        const webApp = window.Telegram.WebApp;

        // Signal that the Mini App is ready
        telegram.ready();

        // Expand to full height
        telegram.expand();

        setContextValue({
          isReady: true,
          isInTelegram: true,
          user: webApp.initDataUnsafe?.user || null,
          platform: webApp.platform || "unknown",
          colorScheme: webApp.colorScheme || "dark",
          viewportHeight: webApp.viewportStableHeight || window.innerHeight,
        });
      } else {
        // Running in browser (not in Telegram)
        setContextValue({
          isReady: true,
          isInTelegram: false,
          user: null,
          platform: "browser",
          colorScheme: "dark",
          viewportHeight: window.innerHeight,
        });
      }

      setIsReady(true);

      // Fire-and-forget: sync any localStorage commitments to Cloud Storage
      if (isInTelegram) {
        syncCommitmentsToCloud();
      }
    };

    // Small delay to ensure Telegram script is loaded
    const timer = setTimeout(initTelegram, 100);

    return () => clearTimeout(timer);
  }, []);

  // Debug info in development
  useEffect(() => {
    if (isReady) {
      console.log("[VOIDMARKET] Telegram Mini App Status:", {
        isInTelegram: contextValue.isInTelegram,
        platform: contextValue.platform,
        user: contextValue.user?.username || "anonymous",
        viewportHeight: contextValue.viewportHeight,
      });
    }
  }, [isReady, contextValue]);

  return (
    <TelegramContext.Provider value={contextValue}>
      {children}
    </TelegramContext.Provider>
  );
}
