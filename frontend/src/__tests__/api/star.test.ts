import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGetRequest, createPostRequest, parseResponse } from "../helpers";

vi.mock("@/lib/services/circle/wallet", () => ({
  getWalletByRefId: vi.fn(),
}));

vi.mock("@/lib/services/db", () => ({
  upsertStar: vi.fn(),
  getStarByTelegramId: vi.fn(),
  getStarByAddress: vi.fn(),
}));

vi.mock("@/lib/services/contracts/cluster-service", () => ({
  getMemberByAddress: vi.fn(),
}));

import { getWalletByRefId } from "@/lib/services/circle/wallet";
import { upsertStar, getStarByTelegramId } from "@/lib/services/db";
import { getMemberByAddress } from "@/lib/services/contracts/cluster-service";
import { GET, POST } from "@/app/api/star/route";

const mockGetWallet = vi.mocked(getWalletByRefId);
const mockUpsertStar = vi.mocked(upsertStar);
const mockGetStar = vi.mocked(getStarByTelegramId);
const mockGetMember = vi.mocked(getMemberByAddress);

describe("GET /api/star", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMember.mockRejectedValue(new Error("Not found") as never);
  });

  it("returns 400 when telegramUserId is missing", async () => {
    const req = createGetRequest("/api/star");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error).toContain("Missing telegramUserId");
  });

  it("returns null when star not found", async () => {
    mockGetStar.mockResolvedValue(null as never);

    const req = createGetRequest("/api/star", { telegramUserId: "unknown" });
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.star).toBeNull();
  });

  it("returns star profile from DB", async () => {
    mockGetStar.mockResolvedValue({
      name: "COSMIC_VOYAGER",
      walletAddress: "0xabc123",
      telegramId: "user_1",
      starType: "blue-supergiant",
      description: "Seeking truth",
      clusterId: null,
      totalPhotons: 100,
      betsWon: 5,
      betsLost: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const req = createGetRequest("/api/star", { telegramUserId: "user_1" });
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    const star = body.star as Record<string, unknown>;
    expect(star.name).toBe("COSMIC_VOYAGER");
    expect(star.starType).toBe("blue-supergiant");
    expect(star.betsWon).toBe(5);
  });
});

describe("POST /api/star", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when required fields missing", async () => {
    const req = createPostRequest("/api/star", { telegramUserId: "user_1" });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error).toContain("Missing required fields");
  });

  it("returns 404 when wallet not found", async () => {
    mockGetWallet.mockResolvedValue(null as never);

    const req = createPostRequest("/api/star", {
      telegramUserId: "user_1",
      name: "COSMIC",
      starType: "blue-supergiant",
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(404);
    expect(body.error).toContain("Wallet not found");
  });

  it("creates star profile successfully", async () => {
    mockGetWallet.mockResolvedValue({ id: "w-1", address: "0xabc" } as never);
    mockUpsertStar.mockResolvedValue({
      id: "star-1",
      name: "COSMIC",
      walletAddress: "0xabc",
      telegramId: "user_1",
      starType: "blue-supergiant",
      description: null,
      clusterId: null,
      totalPhotons: 0,
      betsWon: 0,
      betsLost: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const req = createPostRequest("/api/star", {
      telegramUserId: "user_1",
      name: "COSMIC",
      starType: "blue-supergiant",
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    const star = body.star as Record<string, unknown>;
    expect(star.name).toBe("COSMIC");
    expect(star.starType).toBe("blue-supergiant");
  });
});
