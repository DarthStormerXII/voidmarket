import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGetRequest, parseResponse } from "../helpers";

vi.mock("@/lib/services/circle/wallet", () => ({
  getWalletByRefId: vi.fn(),
}));

vi.mock("@/lib/services/contracts/market-service", () => ({
  getMarketCount: vi.fn(),
  getUserBetsForMarket: vi.fn(),
  getBetById: vi.fn(),
  getMarketById: vi.fn(),
}));

import { getWalletByRefId } from "@/lib/services/circle/wallet";
import {
  getMarketCount,
  getUserBetsForMarket,
  getBetById,
  getMarketById,
} from "@/lib/services/contracts/market-service";
import { GET } from "@/app/api/user/bets/route";

const mockGetWallet = vi.mocked(getWalletByRefId);
const mockMarketCount = vi.mocked(getMarketCount);
const mockUserBets = vi.mocked(getUserBetsForMarket);
const mockGetBet = vi.mocked(getBetById);
const mockGetMarket = vi.mocked(getMarketById);

describe("GET /api/user/bets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when telegramUserId is missing", async () => {
    const req = createGetRequest("/api/user/bets");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error).toContain("Missing telegramUserId");
  });

  it("returns empty bets for user without wallet", async () => {
    mockGetWallet.mockResolvedValue(null as never);

    const req = createGetRequest("/api/user/bets", { telegramUserId: "user_1" });
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.bets).toEqual([]);
  });

  it("returns empty bets when no markets exist", async () => {
    mockGetWallet.mockResolvedValue({ id: "w-1", address: "0xabc" } as never);
    mockMarketCount.mockResolvedValue(0 as never);

    const req = createGetRequest("/api/user/bets", { telegramUserId: "user_1" });
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.bets).toEqual([]);
  });

  it("returns user bets across markets", async () => {
    mockGetWallet.mockResolvedValue({ id: "w-1", address: "0xabc" } as never);
    mockMarketCount.mockResolvedValue(2 as never);
    mockUserBets.mockImplementation(async (marketId: number) => {
      if (marketId === 1) return [10];
      return [];
    });
    mockGetBet.mockResolvedValue({
      id: 10,
      marketId: 1,
      bettor: "0xabc",
      amount: "1000000000000000000",
      commitmentHash: "0x" + "a".repeat(64),
      revealed: false,
      direction: false,
      timestamp: Math.floor(Date.now() / 1000),
      claimed: false,
    } as never);
    mockGetMarket.mockResolvedValue({ question: "ETH to $5k?" } as never);

    const req = createGetRequest("/api/user/bets", { telegramUserId: "user_1" });
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    const bets = body.bets as Array<Record<string, unknown>>;
    expect(bets).toHaveLength(1);
    expect(bets[0].marketQuestion).toBe("ETH to $5k?");
  });
});
