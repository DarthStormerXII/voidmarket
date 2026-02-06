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
        pollTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
