"use client";

import { useState, useEffect, useCallback } from "react";
import type { ApiMarket, ApiBet } from "@/types";

export function useMarket(marketId: string | number | null) {
  const [market, setMarket] = useState<ApiMarket | null>(null);
  const [bets, setBets] = useState<ApiBet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarket = useCallback(async () => {
    if (!marketId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/markets/${marketId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch market");
      }

      const data = await response.json();
      setMarket(data.market);
      setBets(data.bets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch market");
    } finally {
      setIsLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    fetchMarket();
  }, [fetchMarket]);

  return { market, bets, isLoading, error, refetch: fetchMarket };
}
