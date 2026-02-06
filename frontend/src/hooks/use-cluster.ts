"use client";

import { useState, useEffect, useCallback } from "react";
import type { ApiCluster, ApiMember } from "@/types";

export function useCluster(clusterId: string | number | null) {
  const [cluster, setCluster] = useState<ApiCluster | null>(null);
  const [members, setMembers] = useState<ApiMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCluster = useCallback(async () => {
    if (!clusterId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clusters/${clusterId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch cluster");
      }

      const data = await response.json();
      setCluster(data.cluster);
      setMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch cluster");
    } finally {
      setIsLoading(false);
    }
  }, [clusterId]);

  useEffect(() => {
    fetchCluster();
  }, [fetchCluster]);

  return { cluster, members, isLoading, error, refetch: fetchCluster };
}
