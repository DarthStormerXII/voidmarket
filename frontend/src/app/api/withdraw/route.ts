/**
 * POST /api/withdraw
 *
 * Transfer USDC from user's Arc wallet to a destination address.
 * - Same-chain (ARC-TESTNET): direct transfer via Circle SDK
 * - Cross-chain (ETH-SEPOLIA, BASE-SEPOLIA): BridgeKit CCTP bridge
 *
 * Input: { telegramUserId, destinationAddress, amount, destinationChain? }
 * Output: { status, isCrossChain, txHash?, burnTxHash?, mintTxHash?, transferTxHash? }
 */

import { NextRequest, NextResponse } from "next/server";
import { getWalletByRefId } from "@/lib/services/circle/wallet";
import { executeTransfer } from "@/lib/services/circle/transaction";
import { initiateBridgeWithdrawal } from "@/lib/services/circle/bridge";
import type { SupportedBlockchain } from "@/lib/services/circle/client";

const VALID_CHAINS: SupportedBlockchain[] = [
  "ARC-TESTNET",
  "ETH-SEPOLIA",
  "BASE-SEPOLIA",
];

interface WithdrawRequest {
  telegramUserId: string;
  destinationAddress: string;
  amount: number;
  destinationChain?: SupportedBlockchain;
}

export async function POST(request: NextRequest) {
  try {
    const body: WithdrawRequest = await request.json();
    const { telegramUserId, destinationAddress, amount, destinationChain } =
      body;

    if (!telegramUserId || !destinationAddress || !amount) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: telegramUserId, destinationAddress, amount",
        },
        { status: 400 }
      );
    }

    if (!/^0x[0-9a-fA-F]{40}$/.test(destinationAddress)) {
      return NextResponse.json(
        { error: "Invalid destination address" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (destinationChain && !VALID_CHAINS.includes(destinationChain)) {
      return NextResponse.json(
        {
          error: `Invalid destinationChain. Must be one of: ${VALID_CHAINS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const refId = `tg_${telegramUserId}`;
    const wallet = await getWalletByRefId(refId);

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found. Create a wallet first." },
        { status: 404 }
      );
    }

    const isCrossChain =
      destinationChain && destinationChain !== "ARC-TESTNET";

    if (!isCrossChain) {
      // Same-chain: direct transfer on Arc Testnet via Circle SDK
      const result = await executeTransfer({
        walletId: wallet.id,
        to: destinationAddress,
        amount: amount.toString(),
      });

      return NextResponse.json({
        transactionId: result.transactionId,
        txHash: result.txHash,
        status: result.status,
        isCrossChain: false,
      });
    } else {
      // Cross-chain: BridgeKit CCTP bridge
      const result = await initiateBridgeWithdrawal({
        refId,
        destinationBlockchain: destinationChain,
        destinationAddress,
        amount: amount.toString(),
      });

      return NextResponse.json({
        status: result.status,
        isCrossChain: true,
        destinationChain: result.destinationChain,
        burnTxHash: result.burnTxHash,
        mintTxHash: result.mintTxHash,
        transferTxHash: result.transferTxHash,
        bridgeWalletAddress: result.bridgeWalletAddress,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("[API /withdraw] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to withdraw",
      },
      { status: 500 }
    );
  }
}
