"use client";

import { useState, useEffect, useCallback } from "react";
import { useTelegram } from "@/components/providers/telegram-provider";
import type { ApiStar } from "@/types";

export function useStar() {
  const { user, isReady } = useTelegram();
  const [star, setStar] = useState<ApiStar | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStar = useCallback(async () => {
    if (!isReady) return;

    const telegramUserId = user?.id || "test_user_123";
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/star?telegramUserId=${telegramUserId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch star");
      }

      const data = await response.json();
      setStar(data.star);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch star");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isReady]);

  useEffect(() => {
    fetchStar();
  }, [fetchStar]);

  return { star, isLoading, error, refetch: fetchStar };
}
