import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPostRequest, parseResponse } from "../helpers";

vi.mock("@/lib/services/circle/wallet", () => ({
  getWalletByRefId: vi.fn(),
}));

vi.mock("@/lib/services/circle/transaction", () => ({
  executeContractCall: vi.fn(),
}));

import { getWalletByRefId } from "@/lib/services/circle/wallet";
import { executeContractCall } from "@/lib/services/circle/transaction";
import { POST } from "@/app/api/reveal/route";

const mockGetWallet = vi.mocked(getWalletByRefId);
const mockExecute = vi.mocked(executeContractCall);

describe("POST /api/reveal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWallet.mockResolvedValue({ id: "wallet-1", address: "0xabc" } as never);
    mockExecute.mockResolvedValue({
      transactionId: "tx-reveal-1",
      txHash: "0xreveal",
      status: "PENDING",
    } as never);
  });

  it("returns 400 when required fields are missing", async () => {
    const req = createPostRequest("/api/reveal", { telegramUserId: "user_1" });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error).toContain("Missing required fields");
  });

  it("returns 400 for invalid salt format", async () => {
    const req = createPostRequest("/api/reveal", {
      telegramUserId: "user_1",
      betId: "1",
      direction: true,
      salt: "bad-salt",
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error).toContain("bytes32");
  });

  it("reveals bet successfully", async () => {
    const salt = "0x" + "c".repeat(64);
    const req = createPostRequest("/api/reveal", {
      telegramUserId: "user_1",
      betId: "5",
      direction: true,
      salt,
    });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.transactionId).toBe("tx-reveal-1");
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "revealBet",
      })
    );
  });
});
