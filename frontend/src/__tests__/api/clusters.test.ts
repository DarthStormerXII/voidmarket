import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGetRequest, parseResponse } from "../helpers";

vi.mock("@/lib/services/contracts/cluster-service", () => ({
  getAllClusters: vi.fn(),
}));

vi.mock("@/lib/services/db", () => ({
  getAllClusterMetadata: vi.fn(),
}));

import { getAllClusters } from "@/lib/services/contracts/cluster-service";
import { getAllClusterMetadata } from "@/lib/services/db";
import { GET } from "@/app/api/clusters/route";

const mockGetAllClusters = vi.mocked(getAllClusters);
const mockGetMeta = vi.mocked(getAllClusterMetadata);

describe("GET /api/clusters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMeta.mockResolvedValue([] as never);
  });

  it("returns empty array when no clusters", async () => {
    mockGetAllClusters.mockResolvedValue([] as never);

    const req = createGetRequest("/api/clusters");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.clusters).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("sorts clusters by energy", async () => {
    mockGetAllClusters.mockResolvedValue([
      { id: 1, name: "Alpha", leader: "0x1", energy: 100, novasWon: 1, totalNovas: 2, isPrivate: false, memberCount: 3, maxMembers: 10 },
      { id: 2, name: "Beta", leader: "0x2", energy: 500, novasWon: 3, totalNovas: 4, isPrivate: false, memberCount: 5, maxMembers: 10 },
    ] as never);

    const req = createGetRequest("/api/clusters", { sort: "energy" });
    const res = await GET(req);
    const { body } = await parseResponse(res);

    const clusters = body.clusters as Array<Record<string, unknown>>;
    expect(clusters[0].name).toBe("Beta");
    expect(clusters[1].name).toBe("Alpha");
  });

  it("applies limit", async () => {
    mockGetAllClusters.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `Cluster ${i + 1}`,
        leader: "0x1",
        energy: (5 - i) * 100,
        novasWon: 0,
        totalNovas: 0,
        isPrivate: false,
        memberCount: 2,
        maxMembers: 10,
      })) as never
    );

    const req = createGetRequest("/api/clusters", { sort: "energy", limit: "2" });
    const res = await GET(req);
    const { body } = await parseResponse(res);

    const clusters = body.clusters as Array<Record<string, unknown>>;
    expect(clusters).toHaveLength(2);
    expect(body.total).toBe(5);
  });
});
