import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGetRequest, parseResponse } from "../helpers";

vi.mock("@/lib/services/circle/transaction", () => ({
  getTransactionStatus: vi.fn(),
}));

import { getTransactionStatus } from "@/lib/services/circle/transaction";
import { GET } from "@/app/api/transaction/[id]/route";

const mockGetStatus = vi.mocked(getTransactionStatus);

describe("GET /api/transaction/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns transaction status", async () => {
    mockGetStatus.mockResolvedValue({
      transactionId: "tx-1",
      txHash: "0xhash",
      status: "CONFIRMED",
    } as never);

    const req = createGetRequest("/api/transaction/tx-1");
    const res = await GET(req, { params: Promise.resolve({ id: "tx-1" }) });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.transactionId).toBe("tx-1");
    expect(body.status).toBe("CONFIRMED");
  });

  it("returns pending status for in-flight tx", async () => {
    mockGetStatus.mockResolvedValue({
      transactionId: "tx-2",
      txHash: undefined,
      status: "PENDING",
    } as never);

    const req = createGetRequest("/api/transaction/tx-2");
    const res = await GET(req, { params: Promise.resolve({ id: "tx-2" }) });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.status).toBe("PENDING");
  });

  it("returns error reason for failed tx", async () => {
    mockGetStatus.mockResolvedValue({
      transactionId: "tx-3",
      txHash: "0xfailed",
      status: "FAILED",
      errorReason: "Insufficient balance",
    } as never);

    const req = createGetRequest("/api/transaction/tx-3");
    const res = await GET(req, { params: Promise.resolve({ id: "tx-3" }) });
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.status).toBe("FAILED");
    expect(body.errorReason).toBe("Insufficient balance");
  });
});
