/**
 * ENS Gateway Module
 *
 * CCIP-Read gateway server for VoidMarket ENS resolution
 */

export { app, startGateway } from './server.js';
export { decodeDnsName, encodeDnsName, decodeCalldata, namehash, FunctionSelector } from './decoder.js';
export { signResponse, signTextResponse, signAddressResponse, verifyExpiry, generateExpiry } from './signer.js';
export { lookupStar, lookupMarket, lookupCluster, lookupTextRecord } from './database.js';
export type {
  ResolveRequest,
  ResolveResponse,
  CCIPReadResult,
  TextRecordKey,
  EntityType,
  ResolvedEntity,
  StarType,
  MarketStatus,
  GatewayConfig,
} from './types.js';
