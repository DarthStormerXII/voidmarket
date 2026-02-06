"use client";

import { useState, useEffect, useCallback } from "react";
import type { ApiNova, ApiMatch } from "@/types";

export function useNova(novaId: string | number | null) {
  const [nova, setNova] = useState<ApiNova | null>(null);
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNova = useCallback(async () => {
    if (!novaId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/novas/${novaId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch nova");
      }

      const data = await response.json();
      setNova(data.nova);
      setMatches(data.matches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch nova");
    } finally {
      setIsLoading(false);
    }
  }, [novaId]);

  useEffect(() => {
    fetchNova();
  }, [fetchNova]);

  return { nova, matches, isLoading, error, refetch: fetchNova };
}
