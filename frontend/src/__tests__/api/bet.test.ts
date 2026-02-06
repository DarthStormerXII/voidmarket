import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPostRequest, parseResponse } from "../helpers";

// Mock dependencies
vi.mock("@/lib/services/circle/wallet", () => ({
  getWalletByRefId: vi.fn(),
  parseUSDCAmount: vi.fn(),
}));

vi.mock("@/lib/services/circle/transaction", () => ({
  executeContractCall: vi.fn(),
}));

import { getWalletByRefId, parseUSDCAmount } from "@/lib/services/circle/wallet";
import { executeContractCall } from "@/lib/services/circle/transaction";
import { POST } from "@/app/api/bet/route";

const mockGetWallet = vi.mocked(getWalletByRefId);
const mockParseAmount = vi.mocked(parseUSDCAmount);
const mockExecute = vi.mocked(executeContractCall);

describe("POST /api/bet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWallet.mockResolvedValue({ id: "wallet-1", address: "0xabc" } as never);
    mockParseAmount.mockReturnValue("10000000000000000000" as never);
    mockExecute.mockResolvedValue({
      transactionId: "tx-123",
      txHash: "0xhash",
      status: "PENDING",
    } as never);
  });

  it("returns 400 when required fields are missing", async () => {
    const req = createPostRequest("/api/bet", { telegramUserId: "user_1" });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error).toContain("Missing required fields");
  });

  it("returns 400 for invalid commitmentHash format", async () => {
    const req = createPostRequest("/api/bet", {
      telegramUserId: "user_1",
      marketId: "1",
      commitmentHash: "not-a-hash",
      amount: 10,
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error).toContain("bytes32");
  });

  it("returns 400 for negative amount", async () => {
    const req = createPostRequest("/api/bet", {
      telegramUserId: "user_1",
      marketId: "1",
      commitmentHash: "0x" + "a".repeat(64),
      amount: -5,
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error).toContain("greater than 0");
  });

  it("returns 404 when wallet not found", async () => {
    mockGetWallet.mockResolvedValue(null as never);

    const req = createPostRequest("/api/bet", {
      telegramUserId: "unknown_user",
      marketId: "1",
      commitmentHash: "0x" + "a".repeat(64),
      amount: 10,
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(404);
    expect(body.error).toContain("Wallet not found");
  });

  it("places bet successfully with commitment hash", async () => {
    const commitmentHash = "0x" + "b".repeat(64);
    const req = createPostRequest("/api/bet", {
      telegramUserId: "user_1",
      marketId: "1",
      commitmentHash,
      amount: 10,
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.transactionId).toBe("tx-123");
    expect(body.txHash).toBe("0xhash");
    expect(body.status).toBe("PENDING");

    // Verify executeContractCall was called with correct params
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: "wallet-1",
        functionName: "placeBet",
      })
    );
  });
});
