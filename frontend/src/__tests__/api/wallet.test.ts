import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGetRequest, parseResponse } from "../helpers";

// Mock Circle wallet service
vi.mock("@/lib/services/circle/wallet", () => ({
  getOrCreateWallet: vi.fn(),
}));

import { getOrCreateWallet } from "@/lib/services/circle/wallet";
import { GET } from "@/app/api/wallet/route";

const mockGetOrCreateWallet = vi.mocked(getOrCreateWallet);

describe("GET /api/wallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when telegramUserId is missing", async () => {
    const req = createGetRequest("/api/wallet");
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error).toBe("Missing telegramUserId parameter");
  });

  it("returns wallet for existing user", async () => {
    mockGetOrCreateWallet.mockResolvedValue({
      walletId: "wallet-123",
      address: "0x1234567890abcdef1234567890abcdef12345678",
      isNew: false,
    });

    const req = createGetRequest("/api/wallet", { telegramUserId: "user_1" });
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.walletId).toBe("wallet-123");
    expect(body.address).toBe("0x1234567890abcdef1234567890abcdef12345678");
    expect(body.isNew).toBe(false);
    expect(mockGetOrCreateWallet).toHaveBeenCalledWith("tg_user_1");
  });

  it("creates new wallet for new user", async () => {
    mockGetOrCreateWallet.mockResolvedValue({
      walletId: "wallet-new",
      address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      isNew: true,
    });

    const req = createGetRequest("/api/wallet", { telegramUserId: "new_user" });
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.isNew).toBe(true);
  });

  it("returns 500 on service error", async () => {
    mockGetOrCreateWallet.mockRejectedValue(new Error("Circle API down"));

    const req = createGetRequest("/api/wallet", { telegramUserId: "user_1" });
    const res = await GET(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(500);
    expect(body.error).toBe("Circle API down");
  });
});
