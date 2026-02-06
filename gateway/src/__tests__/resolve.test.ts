import { describe, it, expect, vi, beforeEach } from "vitest";
import { ethers } from "ethers";

// Mock database services before importing resolve route
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
  prisma,
} from "../services/database.js";

const mockPrisma = prisma as unknown as {
  star: { findUnique: ReturnType<typeof vi.fn> };
  marketMetadata: { findUnique: ReturnType<typeof vi.fn> };
  clusterMetadata: { findUnique: ReturnType<typeof vi.fn> };
};

// Helper: encode a DNS name as bytes
function encodeDnsName(name: string): Uint8Array {
  const parts = name.split(".");
  const buffers: number[] = [];
  for (const part of parts) {
    const encoded = new TextEncoder().encode(part);
    buffers.push(encoded.length, ...encoded);
  }
  buffers.push(0); // terminator
  return new Uint8Array(buffers);
}

// Helper: build CCIP-Read calldata (what the contract sends)
function buildCalldata(
  dnsName: string,
  resolverSelector: string,
  resolverParams: string
): string {
  const nameBytes = encodeDnsName(dnsName);

  // Resolver call = selector + params
  const resolverCall = new Uint8Array([
    ...ethers.getBytes(resolverSelector),
    ...ethers.getBytes(resolverParams),
  ]);

  // Encode as (bytes name, bytes data) — matches contract's abi.encode(name, data)
  const calldata = ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes", "bytes"],
    [nameBytes, resolverCall]
  );

  return calldata;
}

// Helper: build addr(bytes32) resolver call params
function buildAddrParams(name: string): string {
  const node = ethers.namehash(name);
  return ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [node]);
}

// Helper: build text(bytes32, string) resolver call params
function buildTextParams(name: string, key: string): string {
  const node = ethers.namehash(name);
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "string"],
    [node, key]
  );
}

// Helper: build contenthash(bytes32) resolver call params
function buildContenthashParams(name: string): string {
  const node = ethers.namehash(name);
  return ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [node]);
}

// Import the resolve router and create a mock Express handler
import { resolveRouter } from "../routes/resolve.js";
import express from "express";
import http from "http";

// Set up Express app for testing
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/resolve", resolveRouter);
  return app;
}

// Helper to make request and get response
async function makeResolveRequest(
  app: express.Application,
  sender: string,
  calldata: string
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Failed to get server address"));
        return;
      }
      const port = address.port;

      http.get(
        `http://127.0.0.1:${port}/resolve/${sender}/${calldata}`,
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            server.close();
            try {
              resolve({
                status: res.statusCode || 500,
                body: JSON.parse(data),
              });
            } catch {
              resolve({
                status: res.statusCode || 500,
                body: { raw: data },
              });
            }
          });
        }
      ).on("error", (err) => {
        server.close();
        reject(err);
      });
    });
  });
}

const SENDER = "0x1234567890123456789012345678901234567890";

describe("GET /resolve/:sender/:calldata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: nothing found
    mockPrisma.star.findUnique.mockResolvedValue(null);
    mockPrisma.marketMetadata.findUnique.mockResolvedValue(null);
    mockPrisma.clusterMetadata.findUnique.mockResolvedValue(null);
  });

  describe("Star resolution (addr)", () => {
    it("resolves star wallet address via addr(bytes32)", async () => {
      mockPrisma.star.findUnique.mockResolvedValue({
        id: "star-1",
        name: "cosmicvoyager",
        walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        starType: "blue-supergiant",
        description: null,
        clusterId: null,
        totalPhotons: 1250,
        betsWon: 47,
        betsLost: 23,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const calldata = buildCalldata(
        "cosmicvoyager.voidmarket.eth",
        "0x3b3b57de",
        buildAddrParams("cosmicvoyager.voidmarket.eth")
      );

      const app = createTestApp();
      const { status, body } = await makeResolveRequest(app, SENDER, calldata);

      expect(status).toBe(200);
      expect(body.data).toBeTruthy();

      // Decode the signed response
      const [result] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes", "uint64", "bytes"],
        body.data as string
      );

      // Decode the result as address
      const [address] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["address"],
        result
      );
      expect(address).toBe(
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
      );
    });
  });

  describe("Star resolution (text records)", () => {
    it("resolves star-type text record", async () => {
      mockPrisma.star.findUnique.mockResolvedValue({
        id: "star-1",
        name: "cosmicvoyager",
        walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        starType: "blue-supergiant",
        description: "Seeking truth",
        clusterId: null,
        totalPhotons: 1250,
        betsWon: 47,
        betsLost: 23,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const calldata = buildCalldata(
        "cosmicvoyager.voidmarket.eth",
        "0x59d1d43c",
        buildTextParams(
          "cosmicvoyager.voidmarket.eth",
          "voidmarket.star-type"
        )
      );

      const app = createTestApp();
      const { status, body } = await makeResolveRequest(app, SENDER, calldata);

      expect(status).toBe(200);

      // Decode signed response → result → string
      const [result] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes", "uint64", "bytes"],
        body.data as string
      );
      const [textValue] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["string"],
        result
      );
      expect(textValue).toBe("blue-supergiant");
    });

    it("resolves total-photons text record", async () => {
      mockPrisma.star.findUnique.mockResolvedValue({
        id: "star-1",
        name: "cosmicvoyager",
        walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        starType: "blue-supergiant",
        description: null,
        clusterId: null,
        totalPhotons: 9999,
        betsWon: 100,
        betsLost: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const calldata = buildCalldata(
        "cosmicvoyager.voidmarket.eth",
        "0x59d1d43c",
        buildTextParams(
          "cosmicvoyager.voidmarket.eth",
          "voidmarket.total-photons"
        )
      );

      const app = createTestApp();
      const { status, body } = await makeResolveRequest(app, SENDER, calldata);

      expect(status).toBe(200);

      const [result] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes", "uint64", "bytes"],
        body.data as string
      );
      const [textValue] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["string"],
        result
      );
      expect(textValue).toBe("9999");
    });
  });

  describe("Market resolution", () => {
    it("resolves market text record (category)", async () => {
      // Star lookup returns null, market returns data
      mockPrisma.marketMetadata.findUnique.mockResolvedValue({
        id: "market-1",
        name: "eth-5k",
        onChainId: 1,
        category: "crypto",
        oracleType: "stork",
        oracleSource: "stork:eth-usd",
        creatorName: "cosmicvoyager",
        createdAt: new Date(),
      });

      const calldata = buildCalldata(
        "eth-5k.voidmarket.eth",
        "0x59d1d43c",
        buildTextParams("eth-5k.voidmarket.eth", "voidmarket.category")
      );

      const app = createTestApp();
      const { status, body } = await makeResolveRequest(app, SENDER, calldata);

      expect(status).toBe(200);

      const [result] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes", "uint64", "bytes"],
        body.data as string
      );
      const [textValue] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["string"],
        result
      );
      expect(textValue).toBe("crypto");
    });

    it("resolves market addr as ZeroAddress (markets have no wallet)", async () => {
      mockPrisma.marketMetadata.findUnique.mockResolvedValue({
        id: "market-1",
        name: "eth-5k",
        onChainId: 1,
        category: "crypto",
        oracleType: "stork",
        oracleSource: null,
        creatorName: null,
        createdAt: new Date(),
      });

      const calldata = buildCalldata(
        "eth-5k.voidmarket.eth",
        "0x3b3b57de",
        buildAddrParams("eth-5k.voidmarket.eth")
      );

      const app = createTestApp();
      const { status, body } = await makeResolveRequest(app, SENDER, calldata);

      expect(status).toBe(200);

      const [result] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes", "uint64", "bytes"],
        body.data as string
      );
      const [address] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["address"],
        result
      );
      expect(address).toBe(ethers.ZeroAddress);
    });
  });

  describe("Cluster resolution", () => {
    it("resolves cluster description text record", async () => {
      mockPrisma.clusterMetadata.findUnique.mockResolvedValue({
        id: "cluster-1",
        name: "void-seekers",
        onChainId: 1,
        description: "We seek truth in darkness",
        avatarUrl: "ipfs://Qm.../cluster.png",
        createdAt: new Date(),
      });

      const calldata = buildCalldata(
        "void-seekers.voidmarket.eth",
        "0x59d1d43c",
        buildTextParams("void-seekers.voidmarket.eth", "description")
      );

      const app = createTestApp();
      const { status, body } = await makeResolveRequest(app, SENDER, calldata);

      expect(status).toBe(200);

      const [result] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes", "uint64", "bytes"],
        body.data as string
      );
      const [textValue] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["string"],
        result
      );
      expect(textValue).toBe("We seek truth in darkness");
    });
  });

  describe("Entity resolution priority", () => {
    it("resolves star over market when both exist with same name", async () => {
      mockPrisma.star.findUnique.mockResolvedValue({
        id: "star-1",
        name: "overlap",
        walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        starType: "red-giant",
        description: null,
        clusterId: null,
        totalPhotons: 0,
        betsWon: 0,
        betsLost: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.marketMetadata.findUnique.mockResolvedValue({
        id: "market-1",
        name: "overlap",
        onChainId: 99,
        category: "custom",
        oracleType: "manual",
        oracleSource: null,
        creatorName: null,
        createdAt: new Date(),
      });

      const calldata = buildCalldata(
        "overlap.voidmarket.eth",
        "0x59d1d43c",
        buildTextParams("overlap.voidmarket.eth", "voidmarket.star-type")
      );

      const app = createTestApp();
      const { status, body } = await makeResolveRequest(app, SENDER, calldata);

      expect(status).toBe(200);

      const [result] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes", "uint64", "bytes"],
        body.data as string
      );
      const [textValue] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["string"],
        result
      );
      // Star resolved first, so star-type is available
      expect(textValue).toBe("red-giant");
    });
  });

  describe("404 handling", () => {
    it("returns 404 when no entity found", async () => {
      const calldata = buildCalldata(
        "nonexistent.voidmarket.eth",
        "0x3b3b57de",
        buildAddrParams("nonexistent.voidmarket.eth")
      );

      const app = createTestApp();
      const { status, body } = await makeResolveRequest(app, SENDER, calldata);

      expect(status).toBe(404);
      expect(body.error).toBe("Name not found");
    });
  });

  describe("Nested subdomains (forked markets)", () => {
    it("resolves nested subdomain as forked market", async () => {
      // For eth-5k.cosmicvoyager.voidmarket.eth, parentDomain = "cosmicvoyager"
      mockPrisma.marketMetadata.findUnique.mockResolvedValue({
        id: "forked-1",
        name: "eth-5k",
        onChainId: 10,
        category: "crypto",
        oracleType: "stork",
        oracleSource: null,
        creatorName: "cosmicvoyager",
        createdAt: new Date(),
      });

      const calldata = buildCalldata(
        "eth-5k.cosmicvoyager.voidmarket.eth",
        "0x59d1d43c",
        buildTextParams(
          "eth-5k.cosmicvoyager.voidmarket.eth",
          "voidmarket.creator"
        )
      );

      const app = createTestApp();
      const { status, body } = await makeResolveRequest(app, SENDER, calldata);

      expect(status).toBe(200);

      const [result] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes", "uint64", "bytes"],
        body.data as string
      );
      const [textValue] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["string"],
        result
      );
      expect(textValue).toBe("cosmicvoyager");
    });
  });

  describe("Contenthash resolution", () => {
    it("returns empty contenthash for entities without one", async () => {
      mockPrisma.star.findUnique.mockResolvedValue({
        id: "star-1",
        name: "nocontenthash",
        walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        starType: "red-giant",
        description: null,
        clusterId: null,
        totalPhotons: 0,
        betsWon: 0,
        betsLost: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const calldata = buildCalldata(
        "nocontenthash.voidmarket.eth",
        "0xbc1c58d1",
        buildContenthashParams("nocontenthash.voidmarket.eth")
      );

      const app = createTestApp();
      const { status, body } = await makeResolveRequest(app, SENDER, calldata);

      expect(status).toBe(200);

      const [result] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes", "uint64", "bytes"],
        body.data as string
      );
      const [contenthash] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes"],
        result
      );
      expect(contenthash).toBe("0x");
    });
  });

  describe("Response signing", () => {
    it("returns a verifiable signed response", async () => {
      mockPrisma.star.findUnique.mockResolvedValue({
        id: "star-1",
        name: "verified",
        walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        starType: "neutron-star",
        description: null,
        clusterId: null,
        totalPhotons: 0,
        betsWon: 0,
        betsLost: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const calldata = buildCalldata(
        "verified.voidmarket.eth",
        "0x3b3b57de",
        buildAddrParams("verified.voidmarket.eth")
      );

      const app = createTestApp();
      const { status, body } = await makeResolveRequest(app, SENDER, calldata);

      expect(status).toBe(200);

      // Decode and verify signature
      const [result, expires, signature] =
        ethers.AbiCoder.defaultAbiCoder().decode(
          ["bytes", "uint64", "bytes"],
          body.data as string
        );

      // Reconstruct hash the same way gateway does
      const calldataBytes = ethers.getBytes(calldata);
      const messageHash = ethers.solidityPackedKeccak256(
        ["bytes", "uint64", "bytes"],
        [result, expires, calldataBytes]
      );

      // Recover signer
      const recoveredAddress = ethers.verifyMessage(
        ethers.getBytes(messageHash),
        signature
      );

      // Should match hardhat account #0
      expect(recoveredAddress).toBe(
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
      );
    });

    it("response expires in ~5 minutes", async () => {
      mockPrisma.star.findUnique.mockResolvedValue({
        id: "star-1",
        name: "expiry",
        walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        starType: "red-giant",
        description: null,
        clusterId: null,
        totalPhotons: 0,
        betsWon: 0,
        betsLost: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const calldata = buildCalldata(
        "expiry.voidmarket.eth",
        "0x3b3b57de",
        buildAddrParams("expiry.voidmarket.eth")
      );

      const now = Math.floor(Date.now() / 1000);
      const app = createTestApp();
      const { body } = await makeResolveRequest(app, SENDER, calldata);

      const [, expires] = ethers.AbiCoder.defaultAbiCoder().decode(
        ["bytes", "uint64", "bytes"],
        body.data as string
      );

      const diff = Number(expires) - now;
      // Should be close to 300 seconds (5 minutes), allow ±5s for test execution
      expect(diff).toBeGreaterThanOrEqual(295);
      expect(diff).toBeLessThanOrEqual(305);
    });
  });
});
