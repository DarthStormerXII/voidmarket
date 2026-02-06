import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * ENS Text Records Schema Validation
 *
 * Validates that the gateway produces text records matching the
 * ENS_ARCHITECTURE.md specification for all three entity types:
 * - Stars (users)
 * - Markets
 * - Clusters
 */

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

describe("ENS Text Records Schema — Stars", () => {
  /**
   * Per ENS_ARCHITECTURE.md, Star text records:
   * - addr(60): wallet address
   * - avatar: profile picture (optional)
   * - description: user bio (optional)
   * - voidmarket.star-type: star avatar type
   * - voidmarket.cluster: current cluster name (optional)
   * - voidmarket.total-photons: total photons earned
   * - voidmarket.bets-won: winning bets count
   * - voidmarket.bets-lost: losing bets count
   * - voidmarket.bets-active: active bets count (not stored in DB yet)
   * - voidmarket.created-at: account creation date
   */

  const fullStar = {
    id: "star-full",
    name: "cosmicvoyager",
    walletAddress: "0x7A3B1234567890abcdef1234567890abcdeF92D0",
    starType: "blue-supergiant",
    description: "Seeking truth in the void",
    clusterId: "cluster-1",
    totalPhotons: 1250,
    betsWon: 47,
    betsLost: 23,
    createdAt: new Date("2025-02-01T00:00:00Z"),
    updatedAt: new Date("2025-02-01T00:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves walletAddress for addr(60) resolution", async () => {
    mockPrisma.star.findUnique.mockResolvedValue(fullStar);
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(null);

    const result = await getStarByName("cosmicvoyager");
    expect(result!.walletAddress).toBe(
      "0x7A3B1234567890abcdef1234567890abcdeF92D0"
    );
  });

  it("serves voidmarket.star-type text record", async () => {
    mockPrisma.star.findUnique.mockResolvedValue(fullStar);
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(null);

    const result = await getStarByName("cosmicvoyager");
    expect(result!.textRecords["voidmarket.star-type"]).toBe(
      "blue-supergiant"
    );
  });

  it("serves voidmarket.total-photons as string number", async () => {
    mockPrisma.star.findUnique.mockResolvedValue(fullStar);
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(null);

    const result = await getStarByName("cosmicvoyager");
    expect(result!.textRecords["voidmarket.total-photons"]).toBe("1250");
    // Must be parseable as integer
    expect(parseInt(result!.textRecords["voidmarket.total-photons"])).toBe(
      1250
    );
  });

  it("serves voidmarket.bets-won as string number", async () => {
    mockPrisma.star.findUnique.mockResolvedValue(fullStar);
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(null);

    const result = await getStarByName("cosmicvoyager");
    expect(result!.textRecords["voidmarket.bets-won"]).toBe("47");
  });

  it("serves voidmarket.bets-lost as string number", async () => {
    mockPrisma.star.findUnique.mockResolvedValue(fullStar);
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(null);

    const result = await getStarByName("cosmicvoyager");
    expect(result!.textRecords["voidmarket.bets-lost"]).toBe("23");
  });

  it("serves description text record when present", async () => {
    mockPrisma.star.findUnique.mockResolvedValue(fullStar);
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(null);

    const result = await getStarByName("cosmicvoyager");
    expect(result!.textRecords["description"]).toBe(
      "Seeking truth in the void"
    );
  });

  it("serves voidmarket.cluster when star belongs to one", async () => {
    mockPrisma.star.findUnique.mockResolvedValue(fullStar);
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue({
      id: "cluster-1",
      name: "void-seekers",
      onChainId: 1,
      createdAt: new Date(),
    });

    const result = await getStarByName("cosmicvoyager");
    expect(result!.textRecords["voidmarket.cluster"]).toBe("void-seekers");
  });

  it("serves voidmarket.created-at as ISO 8601 string", async () => {
    mockPrisma.star.findUnique.mockResolvedValue(fullStar);
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(null);

    const result = await getStarByName("cosmicvoyager");
    const createdAt = result!.textRecords["voidmarket.created-at"];
    expect(createdAt).toBe("2025-02-01T00:00:00.000Z");
    // Must be parseable as Date
    expect(new Date(createdAt).toISOString()).toBe(createdAt);
  });

  it("covers all required Star text record keys from spec", async () => {
    mockPrisma.star.findUnique.mockResolvedValue(fullStar);
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue({
      id: "cluster-1",
      name: "void-seekers",
      onChainId: 1,
      createdAt: new Date(),
    });

    const result = await getStarByName("cosmicvoyager");
    const keys = Object.keys(result!.textRecords);

    // Required keys per ENS_ARCHITECTURE.md
    const requiredKeys = [
      "voidmarket.star-type",
      "voidmarket.total-photons",
      "voidmarket.bets-won",
      "voidmarket.bets-lost",
      "voidmarket.created-at",
    ];

    for (const key of requiredKeys) {
      expect(keys).toContain(key);
    }
  });

  it("validates star types match expected values", async () => {
    const validStarTypes = [
      "red-giant",
      "blue-supergiant",
      "white-dwarf",
      "neutron-star",
      "black-hole",
      "pulsar",
      "quasar",
      "supernova",
    ];

    for (const starType of validStarTypes.slice(0, 3)) {
      mockPrisma.star.findUnique.mockResolvedValue({
        ...fullStar,
        starType,
      });
      mockPrisma.clusterMetadata.findUnique.mockResolvedValue(null);

      const result = await getStarByName("test");
      expect(result!.textRecords["voidmarket.star-type"]).toBe(starType);
    }
  });
});

describe("ENS Text Records Schema — Markets", () => {
  /**
   * Per ENS_ARCHITECTURE.md, Market text records:
   * - voidmarket.question: market question (from on-chain, not DB)
   * - voidmarket.deadline: resolution deadline (from on-chain)
   * - voidmarket.oracle: oracle source
   * - voidmarket.target-value: target value (from on-chain)
   * - voidmarket.pool-size: total USDC in pool (from on-chain)
   * - voidmarket.total-bets: number of bets (from on-chain)
   * - voidmarket.status: open/closed/resolved (from on-chain)
   * - voidmarket.result: resolution result (from on-chain)
   * - voidmarket.creator: creator's star name
   * - voidmarket.is-private: private market flag (from on-chain)
   * - voidmarket.share-code: invite code (from on-chain)
   * - voidmarket.category: market category
   *
   * Note: Many market fields are on-chain. The gateway currently serves
   * metadata fields from PostgreSQL. On-chain fields would need
   * Arc Chain RPC integration in the gateway.
   */

  const fullMarket = {
    id: "market-1",
    name: "eth-5k",
    onChainId: 1,
    category: "crypto",
    oracleType: "stork",
    oracleSource: "stork:eth-usd",
    creatorName: "cosmicvoyager",
    createdAt: new Date("2025-02-01T00:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves voidmarket.category text record", async () => {
    mockPrisma.marketMetadata.findUnique.mockResolvedValue(fullMarket);

    const result = await getMarketByName("eth-5k");
    expect(result!.textRecords["voidmarket.category"]).toBe("crypto");
  });

  it("serves voidmarket.oracle text record", async () => {
    mockPrisma.marketMetadata.findUnique.mockResolvedValue(fullMarket);

    const result = await getMarketByName("eth-5k");
    expect(result!.textRecords["voidmarket.oracle"]).toBe("stork");
  });

  it("serves voidmarket.oracle-source when present", async () => {
    mockPrisma.marketMetadata.findUnique.mockResolvedValue(fullMarket);

    const result = await getMarketByName("eth-5k");
    expect(result!.textRecords["voidmarket.oracle-source"]).toBe(
      "stork:eth-usd"
    );
  });

  it("serves voidmarket.creator text record", async () => {
    mockPrisma.marketMetadata.findUnique.mockResolvedValue(fullMarket);

    const result = await getMarketByName("eth-5k");
    expect(result!.textRecords["voidmarket.creator"]).toBe("cosmicvoyager");
  });

  it("serves voidmarket.on-chain-id for cross-referencing", async () => {
    mockPrisma.marketMetadata.findUnique.mockResolvedValue(fullMarket);

    const result = await getMarketByName("eth-5k");
    expect(result!.textRecords["voidmarket.on-chain-id"]).toBe("1");
    expect(parseInt(result!.textRecords["voidmarket.on-chain-id"])).toBe(1);
  });

  it("covers all DB-stored Market text record keys from spec", async () => {
    mockPrisma.marketMetadata.findUnique.mockResolvedValue(fullMarket);

    const result = await getMarketByName("eth-5k");
    const keys = Object.keys(result!.textRecords);

    // Keys that come from PostgreSQL (not on-chain)
    const dbKeys = [
      "voidmarket.category",
      "voidmarket.oracle",
      "voidmarket.on-chain-id",
    ];

    for (const key of dbKeys) {
      expect(keys).toContain(key);
    }
  });
});

describe("ENS Text Records Schema — Clusters", () => {
  /**
   * Per ENS_ARCHITECTURE.md, Cluster text records:
   * - avatar: cluster logo (optional)
   * - description: cluster description (optional)
   * - voidmarket.energy: total cluster energy (from on-chain)
   * - voidmarket.leader: leader's star name (from on-chain)
   * - voidmarket.members: member count (from on-chain)
   * - voidmarket.novas-total: total novas played (from on-chain)
   * - voidmarket.novas-won: novas won (from on-chain)
   * - voidmarket.created-at: creation date
   */

  const fullCluster = {
    id: "cluster-1",
    name: "void-seekers",
    onChainId: 1,
    description: "We seek truth in darkness",
    avatarUrl: "ipfs://Qm.../cluster.png",
    createdAt: new Date("2025-01-15T00:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves avatar text record", async () => {
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(fullCluster);

    const result = await getClusterByName("void-seekers");
    expect(result!.textRecords["avatar"]).toBe("ipfs://Qm.../cluster.png");
  });

  it("serves description text record", async () => {
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(fullCluster);

    const result = await getClusterByName("void-seekers");
    expect(result!.textRecords["description"]).toBe(
      "We seek truth in darkness"
    );
  });

  it("serves voidmarket.on-chain-id for cross-referencing", async () => {
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(fullCluster);

    const result = await getClusterByName("void-seekers");
    expect(result!.textRecords["voidmarket.on-chain-id"]).toBe("1");
  });

  it("serves voidmarket.created-at as ISO 8601 string", async () => {
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(fullCluster);

    const result = await getClusterByName("void-seekers");
    expect(result!.textRecords["voidmarket.created-at"]).toBe(
      "2025-01-15T00:00:00.000Z"
    );
  });

  it("covers all DB-stored Cluster text record keys from spec", async () => {
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(fullCluster);

    const result = await getClusterByName("void-seekers");
    const keys = Object.keys(result!.textRecords);

    const dbKeys = ["voidmarket.on-chain-id", "voidmarket.created-at"];

    for (const key of dbKeys) {
      expect(keys).toContain(key);
    }
  });
});

describe("ENS Resolution Priority", () => {
  /**
   * Per ENS_ARCHITECTURE.md and resolve.ts:
   * Priority: Star > Market > Cluster
   *
   * If a subdomain matches both a Star and a Market name,
   * the Star entity should be returned.
   */

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("star takes priority over market", async () => {
    mockPrisma.star.findUnique.mockResolvedValue({
      id: "star-1",
      name: "overlap",
      walletAddress: "0xSTAR",
      starType: "red-giant",
      description: null,
      clusterId: null,
      totalPhotons: 100,
      betsWon: 10,
      betsLost: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const star = await getStarByName("overlap");
    expect(star).not.toBeNull();
    expect(star!.type).toBe("star");
  });

  it("market resolves when no star matches", async () => {
    mockPrisma.star.findUnique.mockResolvedValue(null);
    mockPrisma.marketMetadata.findUnique.mockResolvedValue({
      id: "market-1",
      name: "unique-market",
      onChainId: 1,
      category: "crypto",
      oracleType: "manual",
      oracleSource: null,
      creatorName: null,
      createdAt: new Date(),
    });

    const star = await getStarByName("unique-market");
    expect(star).toBeNull();

    const market = await getMarketByName("unique-market");
    expect(market).not.toBeNull();
    expect(market!.type).toBe("market");
  });

  it("cluster resolves when no star or market matches", async () => {
    mockPrisma.star.findUnique.mockResolvedValue(null);
    mockPrisma.marketMetadata.findUnique.mockResolvedValue(null);
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue({
      id: "cluster-1",
      name: "unique-cluster",
      onChainId: 1,
      description: null,
      avatarUrl: null,
      createdAt: new Date(),
    });

    const star = await getStarByName("unique-cluster");
    expect(star).toBeNull();

    const market = await getMarketByName("unique-cluster");
    expect(market).toBeNull();

    const cluster = await getClusterByName("unique-cluster");
    expect(cluster).not.toBeNull();
    expect(cluster!.type).toBe("cluster");
  });
});

describe("ENS Subdomain Formats", () => {
  /**
   * Per ENS_ARCHITECTURE.md:
   * - cosmicvoyager.voidmarket.eth → Star profile
   * - eth-5k.voidmarket.eth → Market data
   * - void-seekers.voidmarket.eth → Cluster data
   * - eth-5k.cosmicvoyager.voidmarket.eth → User's forked market
   */

  it("simple subdomain format: name.voidmarket.eth → 3 parts", () => {
    const parts = "cosmicvoyager.voidmarket.eth".split(".");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("cosmicvoyager"); // subdomain
    // parts.length <= 3 means no parent domain
    expect(parts.length > 3).toBe(false);
  });

  it("nested subdomain format: market.user.voidmarket.eth → 4 parts", () => {
    const parts = "eth-5k.cosmicvoyager.voidmarket.eth".split(".");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("eth-5k"); // subdomain (market name)
    expect(parts[1]).toBe("cosmicvoyager"); // parent domain (user name)
    // parts.length > 3 means there IS a parent domain
    expect(parts.length > 3).toBe(true);
  });
});
