"use client";

import { useState, useEffect, useCallback } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useLeaderboard(tab: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/leaderboard?tab=${encodeURIComponent(tab)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const data = await response.json();
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch leaderboard");
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { entries, isLoading, error, refetch: fetchLeaderboard };
}
