/**
 * POST /api/deposit/bridge
 *
 * Bridge USDC from a source chain (ETH-SEPOLIA, BASE-SEPOLIA) to Arc Testnet.
 * Uses BridgeKit SDK for CCTP cross-chain transfers.
 *
 * Input: { telegramUserId, sourceChain: 'ETH-SEPOLIA' | 'BASE-SEPOLIA', amount }
 * Output: { status, sourceChain, destinationChain, burnTxHash, mintTxHash, transferTxHash, bridgeWalletAddress }
 *
 * GET /api/deposit/bridge
 *
 * Returns the bridge wallet address for deposits.
 * Output: { bridgeWalletAddress }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  initiateBridgeTransfer,
  getBridgeWalletAddress,
} from "@/lib/services/circle/bridge";
import type { SupportedBlockchain } from "@/lib/services/circle/client";

const VALID_SOURCE_CHAINS: SupportedBlockchain[] = [
  "ETH-SEPOLIA",
  "BASE-SEPOLIA",
];

interface BridgeRequest {
  telegramUserId: string;
  sourceChain: SupportedBlockchain;
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: BridgeRequest = await request.json();
    const { telegramUserId, sourceChain, amount } = body;

    if (!telegramUserId || !sourceChain || !amount) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: telegramUserId, sourceChain, amount",
        },
        { status: 400 }
      );
    }

    if (!VALID_SOURCE_CHAINS.includes(sourceChain)) {
      return NextResponse.json(
        {
          error: `Invalid sourceChain. Must be one of: ${VALID_SOURCE_CHAINS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    const refId = `tg_${telegramUserId}`;

    const result = await initiateBridgeTransfer({
      refId,
      sourceBlockchain: sourceChain,
      amount: amount.toString(),
    });

    return NextResponse.json({
      status: result.status,
      sourceChain: result.sourceChain,
      destinationChain: result.destinationChain,
      burnTxHash: result.burnTxHash,
      mintTxHash: result.mintTxHash,
      transferTxHash: result.transferTxHash,
      bridgeWalletAddress: result.bridgeWalletAddress,
      error: result.error,
    });
  } catch (error) {
    console.error("[API /deposit/bridge] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to bridge deposit",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const address = getBridgeWalletAddress();
    return NextResponse.json({ bridgeWalletAddress: address });
  } catch (error) {
    console.error("[API /deposit/bridge GET] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Failed to get bridge wallet address",
      },
      { status: 500 }
    );
  }
}
