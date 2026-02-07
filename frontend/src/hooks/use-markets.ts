"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ApiMarket, MarketCategory, MarketStatus } from "@/types";

export type MarketSort = "newest" | "ending-soon" | "pool-size" | "hot";
export type MarketStatusFilter = MarketStatus | "all";

interface UseMarketsOptions {
  search?: string;
  status?: MarketStatusFilter;
  category?: MarketCategory;
  sort?: MarketSort;
  limit?: number;
}

const DEFAULT_LIMIT = 20;

export function useMarkets(options: UseMarketsOptions = {}) {
  const [markets, setMarkets] = useState<ApiMarket[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track whether this is a "load more" fetch (append) vs a fresh fetch (replace)
  const isLoadMoreRef = useRef(false);

  const effectiveLimit = options.limit || DEFAULT_LIMIT;

  const fetchMarkets = useCallback(
    async (fetchOffset: number, append: boolean) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (options.search) params.set("search", options.search);
        if (options.status) params.set("status", options.status);
        if (options.category) params.set("category", options.category);
        if (options.sort) params.set("sort", options.sort);
        params.set("offset", fetchOffset.toString());
        params.set("limit", effectiveLimit.toString());

        const response = await fetch(`/api/markets?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch markets");
        }

        const data = await response.json();
        setMarkets((prev) => (append ? [...prev, ...data.markets] : data.markets));
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch markets");
      } finally {
        setIsLoading(false);
      }
    },
    [options.search, options.status, options.category, options.sort, effectiveLimit]
  );

  // Reset offset and re-fetch when filters/sort change
  useEffect(() => {
    setOffset(0);
    fetchMarkets(0, false);
  }, [fetchMarkets]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    const newOffset = offset + effectiveLimit;
    setOffset(newOffset);
    isLoadMoreRef.current = true;
    fetchMarkets(newOffset, true);
  }, [hasMore, isLoading, offset, effectiveLimit, fetchMarkets]);

  return { markets, total, hasMore, isLoading, error, loadMore, refetch: () => fetchMarkets(0, false) };
}
