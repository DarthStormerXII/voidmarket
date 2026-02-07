"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useTelegram } from "./telegram-provider";
import type {
  PlaceBetParams,
  CreateMarketParams,
  ForkMarketParams,
  TransactionResult,
  WalletInfo,
  WalletBalanceInfo,
} from "@/types";

interface WalletContextType {
  // State
  address: string | null;
  walletId: string | null;
  arcBalance: number;
  gatewayBalances: Array<{
    chain: string;
    domain: number;
    balance: string;
    balanceUSDC: number;
  }>;
  totalBalance: number;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  refreshBalance: () => Promise<void>;
  placeBet: (params: PlaceBetParams) => Promise<{ transactionId: string }>;
  claimBet: (betId: number) => Promise<{ transactionId: string }>;
  revealBet: (betId: number, direction: boolean, salt: string) => Promise<{ transactionId: string }>;
  createMarket: (params: CreateMarketParams) => Promise<{ transactionId: string }>;
  forkMarket: (params: ForkMarketParams) => Promise<{ transactionId: string }>;
  createCluster: (name: string, isPrivate: boolean) => Promise<{ transactionId: string }>;
  joinCluster: (clusterId: number, inviteCode?: string) => Promise<{ transactionId: string }>;
  leaveCluster: () => Promise<{ transactionId: string }>;
  startNova: (cluster1Id: number, cluster2Id: number, totalRounds: number, prizePool: number) => Promise<{ transactionId: string }>;
  pollTransaction: (txId: string) => Promise<TransactionResult>;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  walletId: null,
  arcBalance: 0,
  gatewayBalances: [],
  totalBalance: 0,
  isLoading: true,
  isInitialized: false,
  error: null,
  refreshBalance: async () => {},
  placeBet: async () => ({ transactionId: "" }),
  claimBet: async () => ({ transactionId: "" }),
  revealBet: async () => ({ transactionId: "" }),
  createMarket: async () => ({ transactionId: "" }),
  forkMarket: async () => ({ transactionId: "" }),
  createCluster: async () => ({ transactionId: "" }),
  joinCluster: async () => ({ transactionId: "" }),
  leaveCluster: async () => ({ transactionId: "" }),
  startNova: async () => ({ transactionId: "" }),
  pollTransaction: async () => ({
    transactionId: "",
    status: "PENDING",
  }),
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user, isReady: isTelegramReady, isInTelegram } = useTelegram();

  const [address, setAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [arcBalance, setArcBalance] = useState(0);
  const [gatewayBalances, setGatewayBalances] = useState<
    WalletContextType["gatewayBalances"]
  >([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize wallet when Telegram user is available
  useEffect(() => {
    const initWallet = async () => {
      // Wait for Telegram to be ready
      if (!isTelegramReady) return;

      // Use Telegram user ID or fallback for browser testing
      const telegramUserId = user?.id || "test_user_123";

      setIsLoading(true);
      setError(null);

      try {
        // Get or create wallet
        const walletResponse = await fetch(
          `/api/wallet?telegramUserId=${telegramUserId}`
        );

        if (!walletResponse.ok) {
          const errorData = await walletResponse.json();
          throw new Error(errorData.error || "Failed to get wallet");
        }

        const walletData: WalletInfo = await walletResponse.json();

        setWalletId(walletData.walletId);
        setAddress(walletData.address);

        console.log("[WalletProvider] Wallet initialized:", {
          walletId: walletData.walletId,
          address: walletData.address,
          isNew: walletData.isNew,
        });

        // Fetch initial balance
        await fetchBalance(telegramUserId);

        setIsInitialized(true);
      } catch (err) {
        console.error("[WalletProvider] Initialization error:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize wallet");
        setIsInitialized(true); // Mark as initialized even on error to stop loading state
      } finally {
        setIsLoading(false);
      }
    };

    initWallet();
  }, [isTelegramReady, user?.id]);

  // Fetch balance helper
  const fetchBalance = async (telegramUserId: string | number) => {
    try {
      const balanceResponse = await fetch(
        `/api/wallet/balance?telegramUserId=${telegramUserId}`
      );

      if (!balanceResponse.ok) {
        // If 404, wallet might not exist yet - not an error during initialization
        if (balanceResponse.status === 404) {
          console.log("[WalletProvider] Wallet not found during balance fetch");
          return;
        }
        const errorData = await balanceResponse.json();
        throw new Error(errorData.error || "Failed to fetch balance");
      }

      const balanceData: WalletBalanceInfo = await balanceResponse.json();

      setArcBalance(parseFloat(balanceData.arcBalance));
      setGatewayBalances(balanceData.gatewayBalances);
      setTotalBalance(parseFloat(balanceData.totalBalance));

      console.log("[WalletProvider] Balance updated:", {
        arcBalance: balanceData.arcBalance,
        totalBalance: balanceData.totalBalance,
      });
    } catch (err) {
      console.error("[WalletProvider] Balance fetch error:", err);
      // Don't set error state for balance fetch failures during use
    }
  };

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    const telegramUserId = user?.id || "test_user_123";
    await fetchBalance(telegramUserId);
  }, [user?.id]);

  // Place bet using commitment hash
  const placeBet = useCallback(
    async (params: PlaceBetParams): Promise<{ transactionId: string }> => {
      const telegramUserId = user?.id || "test_user_123";

      const response = await fetch("/api/bet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegramUserId,
          marketId: params.marketId,
          commitmentHash: params.commitmentHash,
          amount: params.amount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to place bet");
      }

      const data = await response.json();
      return { transactionId: data.transactionId };
    },
    [user?.id]
  );

  // Claim bet winnings
  const claimBet = useCallback(
    async (betId: number): Promise<{ transactionId: string }> => {
      const telegramUserId = user?.id || "test_user_123";

      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUserId, betId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to claim bet");
      }

      const data = await response.json();
      return { transactionId: data.transactionId };
    },
    [user?.id]
  );

  // Reveal bet (ZK commitment reveal)
  const revealBet = useCallback(
    async (
      betId: number,
      direction: boolean,
      salt: string
    ): Promise<{ transactionId: string }> => {
      const telegramUserId = user?.id || "test_user_123";

      const response = await fetch("/api/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUserId, betId, direction, salt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reveal bet");
      }

      const data = await response.json();
      return { transactionId: data.transactionId };
    },
    [user?.id]
  );

  // Create a new market
  const createMarket = useCallback(
    async (params: CreateMarketParams): Promise<{ transactionId: string }> => {
      const telegramUserId = user?.id || "test_user_123";

      const response = await fetch("/api/market/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUserId,
          question: params.question,
          deadline: params.deadline,
          resolutionDeadline: params.resolutionDeadline,
          category: params.category,
          oracleType: params.oracleType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create market");
      }

      const data = await response.json();
      return { transactionId: data.transactionId };
    },
    [user?.id]
  );

  // Fork an existing market
  const forkMarket = useCallback(
    async (params: ForkMarketParams): Promise<{ transactionId: string }> => {
      const telegramUserId = user?.id || "test_user_123";

      const response = await fetch("/api/market/fork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUserId,
          parentMarketId: params.parentMarketId,
          customQuestion: params.customQuestion,
          deadline: params.deadline,
          resolutionDeadline: params.resolutionDeadline,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fork market");
      }

      const data = await response.json();
      return { transactionId: data.transactionId };
    },
    [user?.id]
  );

  // Create a new cluster
  const createCluster = useCallback(
    async (
      name: string,
      isPrivate: boolean
    ): Promise<{ transactionId: string }> => {
      const telegramUserId = user?.id || "test_user_123";

      const response = await fetch("/api/cluster/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUserId, name, isPrivate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create cluster");
      }

      const data = await response.json();
      return { transactionId: data.transactionId };
    },
    [user?.id]
  );

  // Join an existing cluster
  const joinCluster = useCallback(
    async (
      clusterId: number,
      inviteCode?: string
    ): Promise<{ transactionId: string }> => {
      const telegramUserId = user?.id || "test_user_123";

      const response = await fetch("/api/cluster/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramUserId, clusterId, inviteCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to join cluster");
      }

      const data = await response.json();
      return { transactionId: data.transactionId };
    },
    [user?.id]
  );

  // Leave current cluster
  const leaveCluster = useCallback(async (): Promise<{
    transactionId: string;
  }> => {
    const telegramUserId = user?.id || "test_user_123";

    const response = await fetch("/api/cluster/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramUserId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to leave cluster");
    }

    const data = await response.json();
    return { transactionId: data.transactionId };
  }, [user?.id]);

  // Start a nova (cluster vs cluster competition)
  const startNova = useCallback(
    async (
      cluster1Id: number,
      cluster2Id: number,
      totalRounds: number,
      prizePool: number
    ): Promise<{ transactionId: string }> => {
      const telegramUserId = user?.id || "test_user_123";

      const response = await fetch("/api/nova/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUserId,
          cluster1Id,
          cluster2Id,
          totalRounds,
          prizePool,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start nova");
      }

      const data = await response.json();
      return { transactionId: data.transactionId };
    },
    [user?.id]
  );

  // Poll transaction status
  const pollTransaction = useCallback(
    async (txId: string): Promise<TransactionResult> => {
      const maxAttempts = 30; // 60 seconds with 2 second intervals
      const pollInterval = 2000;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const response = await fetch(`/api/transaction/${txId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get transaction status");
        }

        const data: TransactionResult = await response.json();

        if (
          data.status === "CONFIRMED" ||
          data.status === "FAILED" ||
          data.status === "CANCELLED"
        ) {
          return data;
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      // Timeout
      return {
        transactionId: txId,
        status: "PENDING",
      };
    },
    []
  );

  return (
    <WalletContext.Provider
      value={{
        address,
        walletId,
        arcBalance,
        gatewayBalances,
        totalBalance,
        isLoading,
        isInitialized,
        error,
        refreshBalance,
        placeBet,
        claimBet,
        revealBet,
        createMarket,
        forkMarket,
        createCluster,
        joinCluster,
        leaveCluster,
        startNova,
        pollTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
