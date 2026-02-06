"use client";

import { useState, useEffect, useCallback } from "react";
import type { ApiMarket, MarketCategory, MarketStatus } from "@/types";

interface UseMarketsOptions {
  status?: MarketStatus;
  category?: MarketCategory;
  limit?: number;
}

export function useMarkets(options: UseMarketsOptions = {}) {
  const [markets, setMarkets] = useState<ApiMarket[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.status) params.set("status", options.status);
      if (options.category) params.set("category", options.category);
      if (options.limit) params.set("limit", options.limit.toString());

      const response = await fetch(`/api/markets?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch markets");
      }

      const data = await response.json();
      setMarkets(data.markets);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch markets");
    } finally {
      setIsLoading(false);
    }
  }, [options.status, options.category, options.limit]);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  return { markets, total, isLoading, error, refetch: fetchMarkets };
}
