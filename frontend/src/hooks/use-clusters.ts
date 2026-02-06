"use client";

import { useState, useEffect, useCallback } from "react";
import type { ApiCluster } from "@/types";

interface UseClustersOptions {
  sort?: "energy" | "members" | "novasWon";
  limit?: number;
}

export function useClusters(options: UseClustersOptions = {}) {
  const [clusters, setClusters] = useState<ApiCluster[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClusters = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.sort) params.set("sort", options.sort);
      if (options.limit) params.set("limit", options.limit.toString());

      const response = await fetch(`/api/clusters?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch clusters");
      }

      const data = await response.json();
      setClusters(data.clusters);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch clusters");
    } finally {
      setIsLoading(false);
    }
  }, [options.sort, options.limit]);

  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  return { clusters, total, isLoading, error, refetch: fetchClusters };
}
