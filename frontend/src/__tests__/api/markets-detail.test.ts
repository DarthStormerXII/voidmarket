import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGetRequest, parseResponse } from "../helpers";

vi.mock("@/lib/services/contracts/market-service", () => ({
  getMarketById: vi.fn(),
  getMarketBets: vi.fn(),
}));

vi.mock("@/lib/services/db", () => ({
  getMarketMetadata: vi.fn(),
}));

import { getMarketById, getMarketBets } from "@/lib/services/contracts/market-service";
import { getMarketMetadata } from "@/lib/services/db";
import { GET } from "@/app/api/markets/[id]/route";

const mockGetMarket = vi.mocked(getMarketById);
const mockGetBets = vi.mocked(getMarketBets);
const mockGetMeta = vi.mocked(getMarketMetadata);

describe("GET /api/markets/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMeta.mockResolvedValue(null as never);
  });

  it("returns 400 for invalid market ID", async () => {
    const req = createGetRequest("/api/markets/abc");
    const res = await GET(req, { params: Promise.resolve({ id: "abc" }) });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error).toBe("Invalid market ID");
  });

  it("returns market with bets", async () => {
    mockGetMarket.mockResolvedValue({
      id: 1,
      question: "Will BTC hit $100k?",
      creator: "0xCreator",
      deadline: Math.floor(Date.now() / 1000) + 86400,
      resolutionDeadline: 0,
      status: "active",
      outcome: false,
      totalYesAmount: "1000",
      totalNoAmount: "500",
      totalPool: "1500",
      isForked: false,
      parentMarketId: 0,
    } as never);

    mockGetBets.mockResolvedValue([
      {
        id: 1,
        marketId: 1,
        bettor: "0xBettor",
        amount: "100",
        commitmentHash: "0x" + "a".repeat(64),
        revealed: false,
        direction: false,
        timestamp: Math.floor(Date.now() / 1000),
        claimed: false,
      },
    ] as never);

    const req = createGetRequest("/api/markets/1");
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    const market = body.market as Record<string, unknown>;
    expect(market.question).toBe("Will BTC hit $100k?");
    expect(market.totalBets).toBe(1);
    const bets = body.bets as Array<Record<string, unknown>>;
    expect(bets).toHaveLength(1);
    expect(bets[0].bettor).toBe("0xBettor");
  });
});
