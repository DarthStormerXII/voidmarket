"use client";

import { useState, useEffect, useCallback } from "react";
import { useTelegram } from "@/components/providers/telegram-provider";
import type { ApiBet } from "@/types";

export function useUserBets() {
  const { user, isReady } = useTelegram();
  const [bets, setBets] = useState<ApiBet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBets = useCallback(async () => {
    if (!isReady) return;

    const telegramUserId = user?.id || "test_user_123";
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/user/bets?telegramUserId=${telegramUserId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch bets");
      }

      const data = await response.json();
      setBets(data.bets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bets");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isReady]);

  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  return { bets, isLoading, error, refetch: fetchBets };
}
