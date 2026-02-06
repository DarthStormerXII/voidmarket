import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { decodeDnsName, decodeResolverCall } from "../services/decoder.js";
import { signResponse } from "../services/signer.js";
import {
  getStarByName,
  getMarketByName,
  getClusterByName,
} from "../services/database.js";
import type { ResolvedEntity } from "../types/index.js";

export const resolveRouter = Router();

// Standard resolver interface selectors
const SELECTORS = {
  addr: "0x3b3b57de", // addr(bytes32)
  addrMultichain: "0xf1cb7e06", // addr(bytes32,uint256)
  text: "0x59d1d43c", // text(bytes32,string)
  contenthash: "0xbc1c58d1", // contenthash(bytes32)
};

/**
 * CCIP-Read endpoint
 * GET /resolve/:sender/:calldata
 *
 * Called automatically by viem/wagmi/ethers when VoidMarketResolver
 * reverts with OffchainLookup
 */
resolveRouter.get(
  "/:sender/:calldata",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { calldata } = req.params;

      // Decode the calldata (contains DNS-encoded name and resolver call)
      const calldataBytes = ethers.getBytes(calldata);
      const [nameBytes, dataBytes] =
        ethers.AbiCoder.defaultAbiCoder().decode(
          ["bytes", "bytes"],
          calldataBytes
        );

      // Decode DNS-encoded name
      const fullName = decodeDnsName(ethers.getBytes(nameBytes));
      const parts = fullName.split(".");

      // Parse subdomain structure
      // Could be: subdomain.voidmarket.eth
      // Or nested: market.user.voidmarket.eth (forked markets)
      const subdomain = parts[0];
      const parentDomain = parts.length > 3 ? parts[1] : null;

      // Detect entity type and fetch data
      const entity = await resolveEntity(subdomain, parentDomain);

      if (!entity) {
        res.status(404).json({ error: "Name not found" });
        return;
      }

      // Decode what resolver method was called
      const { selector, params } = decodeResolverCall(
        ethers.getBytes(dataBytes)
      );

      // Resolve based on method
      let result: string;

      switch (selector) {
        case SELECTORS.addr:
        case SELECTORS.addrMultichain:
          result = ethers.AbiCoder.defaultAbiCoder().encode(
            ["address"],
            [entity.walletAddress || ethers.ZeroAddress]
          );
          break;

        case SELECTORS.text: {
          const key = params.key as string;
          const textValue = entity.textRecords[key] || "";
          result = ethers.AbiCoder.defaultAbiCoder().encode(
            ["string"],
            [textValue]
          );
          break;
        }

        case SELECTORS.contenthash:
          result = ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes"],
            [entity.contenthash || "0x"]
          );
          break;

        default:
          res.status(400).json({ error: "Unsupported resolver method" });
          return;
      }

      // Sign the response (5 minute expiry)
      const expires = Math.floor(Date.now() / 1000) + 300;
      const signedResponse = await signResponse(
        result,
        expires,
        calldataBytes
      );

      // Return CCIP-Read format
      res.json({ data: signedResponse });
    } catch (error) {
      console.error("Resolution error:", error);
      res.status(500).json({ error: "Resolution failed" });
    }
  }
);

/**
 * Resolve entity from database based on subdomain
 * Priority: Star > Market > Cluster
 */
async function resolveEntity(
  subdomain: string,
  parentDomain: string | null
): Promise<ResolvedEntity | null> {
  // Check if it's a nested subdomain (forked market)
  if (parentDomain) {
    return await getMarketByName(subdomain, parentDomain);
  }

  // Try star first
  const star = await getStarByName(subdomain);
  if (star) return star;

  // Try market
  const market = await getMarketByName(subdomain);
  if (market) return market;

  // Try cluster
  const cluster = await getClusterByName(subdomain);
  if (cluster) return cluster;

  return null;
}
