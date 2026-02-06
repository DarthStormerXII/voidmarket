import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGetRequest, parseResponse } from "../helpers";

vi.mock("@/lib/services/contracts/market-service", () => ({
  getAllMarkets: vi.fn(),
  getMarketBetIds: vi.fn(),
}));

vi.mock("@/lib/services/db", () => ({
  getAllMarketMetadata: vi.fn(),
}));

import { getAllMarkets, getMarketBetIds } from "@/lib/services/contracts/market-service";
import { getAllMarketMetadata } from "@/lib/services/db";
import { GET } from "@/app/api/markets/route";

const mockGetAllMarkets = vi.mocked(getAllMarkets);
const mockGetBetIds = vi.mocked(getMarketBetIds);
const mockGetMetadata = vi.mocked(getAllMarketMetadata);

describe("GET /api/markets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBetIds.mockResolvedValue([] as never);
    mockGetMetadata.mockResolvedValue([] as never);
  });

  it("returns empty array when no markets exist", async () => {
    mockGetAllMarkets.mockResolvedValue([]);

    const req = createGetRequest("/api/markets");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.markets).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("returns markets with on-chain and DB data merged", async () => {
    mockGetAllMarkets.mockResolvedValue([
      {
        id: 1,
        question: "Will ETH hit $5k?",
        creator: "0xCreator",
        deadline: Math.floor(Date.now() / 1000) + 86400,
        resolutionDeadline: 0,
        status: "active",
        outcome: false,
        totalYesAmount: "5000000000000000000000",
        totalNoAmount: "3000000000000000000000",
        totalPool: "8000",
        isForked: false,
        parentMarketId: 0,
      },
    ] as never);

    mockGetMetadata.mockResolvedValue([
      { onChainId: 1, category: "crypto", oracleType: "stork", oracleSource: "eth-usd", creatorName: "cosmic" },
    ] as never);

    mockGetBetIds.mockResolvedValue([1, 2, 3] as never);

    const req = createGetRequest("/api/markets");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    const markets = body.markets as Array<Record<string, unknown>>;
    expect(markets).toHaveLength(1);
    expect(markets[0].question).toBe("Will ETH hit $5k?");
    expect(markets[0].category).toBe("crypto");
    expect(markets[0].oracleType).toBe("stork");
    expect(markets[0].totalBets).toBe(3);
  });

  it("filters by status", async () => {
    mockGetAllMarkets.mockResolvedValue([
      { id: 1, question: "Q1", creator: "0x1", deadline: 9999999999, resolutionDeadline: 0, status: "active", outcome: false, totalYesAmount: "0", totalNoAmount: "0", totalPool: "0", isForked: false, parentMarketId: 0 },
      { id: 2, question: "Q2", creator: "0x2", deadline: 9999999999, resolutionDeadline: 0, status: "resolved", outcome: true, totalYesAmount: "0", totalNoAmount: "0", totalPool: "0", isForked: false, parentMarketId: 0 },
    ] as never);

    const req = createGetRequest("/api/markets", { status: "active" });
    const res = await GET(req);
    const { body } = await parseResponse(res);

    const markets = body.markets as Array<Record<string, unknown>>;
    expect(markets).toHaveLength(1);
    expect(markets[0].status).toBe("active");
  });

  it("applies limit parameter", async () => {
    mockGetAllMarkets.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        question: `Q${i + 1}`,
        creator: "0x1",
        deadline: 9999999999,
        resolutionDeadline: 0,
        status: "active",
        outcome: false,
        totalYesAmount: "0",
        totalNoAmount: "0",
        totalPool: "0",
        isForked: false,
        parentMarketId: 0,
      })) as never
    );

    const req = createGetRequest("/api/markets", { limit: "3" });
    const res = await GET(req);
    const { body } = await parseResponse(res);

    const markets = body.markets as Array<Record<string, unknown>>;
    expect(markets).toHaveLength(3);
    expect(body.total).toBe(10);
  });
});
