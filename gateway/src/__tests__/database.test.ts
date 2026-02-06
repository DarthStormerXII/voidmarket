import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma client before importing database service
vi.mock("../../src/generated/prisma/client.js", () => {
  return {
    PrismaClient: class MockPrismaClient {
      star = { findUnique: vi.fn() };
      marketMetadata = { findUnique: vi.fn() };
      clusterMetadata = { findUnique: vi.fn() };
    },
  };
});

import {
  getStarByName,
  getMarketByName,
  getClusterByName,
  prisma,
} from "../services/database.js";

const mockPrisma = prisma as unknown as {
  star: { findUnique: ReturnType<typeof vi.fn> };
  marketMetadata: { findUnique: ReturnType<typeof vi.fn> };
  clusterMetadata: { findUnique: ReturnType<typeof vi.fn> };
};

describe("getStarByName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when star not found", async () => {
    mockPrisma.star.findUnique.mockResolvedValue(null);

    const result = await getStarByName("nonexistent");
    expect(result).toBeNull();
  });

  it("returns star entity with correct text records", async () => {
    const createdAt = new Date("2025-02-01T00:00:00Z");
    mockPrisma.star.findUnique.mockResolvedValue({
      id: "star-1",
      name: "cosmicvoyager",
      walletAddress: "0x7A3B1234567890abcdef1234567890abcdeF92D",
      starType: "blue-supergiant",
      description: "Seeking truth in the void",
      clusterId: null,
      totalPhotons: 1250,
      betsWon: 47,
      betsLost: 23,
      createdAt,
      updatedAt: createdAt,
    });

    const result = await getStarByName("cosmicvoyager");

    expect(result).not.toBeNull();
    expect(result!.type).toBe("star");
    expect(result!.walletAddress).toBe(
      "0x7A3B1234567890abcdef1234567890abcdeF92D"
    );

    // Validate text records per ENS_ARCHITECTURE.md Star schema
    expect(result!.textRecords["voidmarket.star-type"]).toBe("blue-supergiant");
    expect(result!.textRecords["voidmarket.total-photons"]).toBe("1250");
    expect(result!.textRecords["voidmarket.bets-won"]).toBe("47");
    expect(result!.textRecords["voidmarket.bets-lost"]).toBe("23");
    expect(result!.textRecords["description"]).toBe(
      "Seeking truth in the void"
    );
    expect(result!.textRecords["voidmarket.created-at"]).toBe(
      "2025-02-01T00:00:00.000Z"
    );
  });

  it("omits description when null", async () => {
    mockPrisma.star.findUnique.mockResolvedValue({
      id: "star-2",
      name: "silentstar",
      walletAddress: "0xabc",
      starType: "red-giant",
      description: null,
      clusterId: null,
      totalPhotons: 0,
      betsWon: 0,
      betsLost: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await getStarByName("silentstar");

    expect(result!.textRecords["description"]).toBeUndefined();
  });

  it("includes cluster name when star belongs to a cluster", async () => {
    mockPrisma.star.findUnique.mockResolvedValue({
      id: "star-3",
      name: "clustered",
      walletAddress: "0xdef",
      starType: "white-dwarf",
      description: null,
      clusterId: "cluster-1",
      totalPhotons: 500,
      betsWon: 10,
      betsLost: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockPrisma.clusterMetadata.findUnique.mockResolvedValue({
      id: "cluster-1",
      name: "void-seekers",
      onChainId: 1,
      createdAt: new Date(),
    });

    const result = await getStarByName("clustered");

    expect(result!.textRecords["voidmarket.cluster"]).toBe("void-seekers");
  });

  it("omits cluster name when cluster lookup fails", async () => {
    mockPrisma.star.findUnique.mockResolvedValue({
      id: "star-4",
      name: "orphaned",
      walletAddress: "0x123",
      starType: "neutron-star",
      description: null,
      clusterId: "nonexistent-cluster",
      totalPhotons: 0,
      betsWon: 0,
      betsLost: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(null);

    const result = await getStarByName("orphaned");

    expect(result!.textRecords["voidmarket.cluster"]).toBeUndefined();
  });
});

describe("getMarketByName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when market not found", async () => {
    mockPrisma.marketMetadata.findUnique.mockResolvedValue(null);

    const result = await getMarketByName("nonexistent");
    expect(result).toBeNull();
  });

  it("returns market entity with correct text records", async () => {
    mockPrisma.marketMetadata.findUnique.mockResolvedValue({
      id: "market-1",
      name: "eth-5k",
      onChainId: 1,
      category: "crypto",
      oracleType: "stork",
      oracleSource: "stork:eth-usd",
      creatorName: "cosmicvoyager",
      createdAt: new Date("2025-02-01T00:00:00Z"),
    });

    const result = await getMarketByName("eth-5k");

    expect(result).not.toBeNull();
    expect(result!.type).toBe("market");

    // Validate text records per ENS_ARCHITECTURE.md Market schema
    expect(result!.textRecords["voidmarket.category"]).toBe("crypto");
    expect(result!.textRecords["voidmarket.oracle"]).toBe("stork");
    expect(result!.textRecords["voidmarket.oracle-source"]).toBe(
      "stork:eth-usd"
    );
    expect(result!.textRecords["voidmarket.on-chain-id"]).toBe("1");
    expect(result!.textRecords["voidmarket.creator"]).toBe("cosmicvoyager");
  });

  it("omits optional fields when null", async () => {
    mockPrisma.marketMetadata.findUnique.mockResolvedValue({
      id: "market-2",
      name: "btc-100k",
      onChainId: 2,
      category: "crypto",
      oracleType: "manual",
      oracleSource: null,
      creatorName: null,
      createdAt: new Date(),
    });

    const result = await getMarketByName("btc-100k");

    expect(result!.textRecords["voidmarket.oracle-source"]).toBeUndefined();
    expect(result!.textRecords["voidmarket.creator"]).toBeUndefined();
  });

  it("market has no walletAddress (markets are not addressable)", async () => {
    mockPrisma.marketMetadata.findUnique.mockResolvedValue({
      id: "market-3",
      name: "sol-500",
      onChainId: 3,
      category: "crypto",
      oracleType: "manual",
      oracleSource: null,
      creatorName: null,
      createdAt: new Date(),
    });

    const result = await getMarketByName("sol-500");

    expect(result!.walletAddress).toBeUndefined();
  });
});

describe("getClusterByName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when cluster not found", async () => {
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(null);

    const result = await getClusterByName("nonexistent");
    expect(result).toBeNull();
  });

  it("returns cluster entity with correct text records", async () => {
    const createdAt = new Date("2025-01-15T00:00:00Z");
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue({
      id: "cluster-1",
      name: "void-seekers",
      onChainId: 1,
      description: "We seek truth in darkness",
      avatarUrl: "ipfs://Qm.../cluster.png",
      createdAt,
    });

    const result = await getClusterByName("void-seekers");

    expect(result).not.toBeNull();
    expect(result!.type).toBe("cluster");

    // Validate text records per ENS_ARCHITECTURE.md Cluster schema
    expect(result!.textRecords["voidmarket.on-chain-id"]).toBe("1");
    expect(result!.textRecords["description"]).toBe(
      "We seek truth in darkness"
    );
    expect(result!.textRecords["avatar"]).toBe("ipfs://Qm.../cluster.png");
    expect(result!.textRecords["voidmarket.created-at"]).toBe(
      "2025-01-15T00:00:00.000Z"
    );
  });

  it("omits optional fields when null", async () => {
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue({
      id: "cluster-2",
      name: "bare-cluster",
      onChainId: 2,
      description: null,
      avatarUrl: null,
      createdAt: new Date(),
    });

    const result = await getClusterByName("bare-cluster");

    expect(result!.textRecords["description"]).toBeUndefined();
    expect(result!.textRecords["avatar"]).toBeUndefined();
  });

  it("cluster has no walletAddress", async () => {
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue({
      id: "cluster-3",
      name: "some-cluster",
      onChainId: 3,
      description: null,
      avatarUrl: null,
      createdAt: new Date(),
    });

    const result = await getClusterByName("some-cluster");

    expect(result!.walletAddress).toBeUndefined();
  });
});
