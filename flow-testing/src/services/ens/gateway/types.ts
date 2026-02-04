/**
 * ENS Gateway Types
 */

import type { Hex } from 'viem';

// ============================================================================
// Request/Response Types
// ============================================================================

export interface ResolveRequest {
  sender: Hex;
  callData: Hex;
}

export interface ResolveResponse {
  data: Hex;
}

export interface CCIPReadResult {
  result: Hex | string;
  expires: bigint;
  signature?: Hex;
}

// ============================================================================
// ENS Record Types
// ============================================================================

export type TextRecordKey =
  // Standard ENS text records
  | 'avatar'
  | 'description'
  | 'display'
  | 'email'
  | 'keywords'
  | 'mail'
  | 'name'
  | 'notice'
  | 'location'
  | 'phone'
  | 'url'
  // Social records
  | 'com.github'
  | 'com.twitter'
  | 'com.discord'
  | 'com.telegram'
  | 'org.telegram'
  // VoidMarket-specific records for Stars
  | 'voidmarket.star-type'
  | 'voidmarket.total-photons'
  | 'voidmarket.cluster'
  | 'voidmarket.total-bets'
  | 'voidmarket.total-wins'
  // VoidMarket-specific records for Markets
  | 'voidmarket.question'
  | 'voidmarket.status'
  | 'voidmarket.deadline'
  | 'voidmarket.outcome'
  | 'voidmarket.total-pool'
  | 'voidmarket.yes-amount'
  | 'voidmarket.no-amount'
  | 'voidmarket.is-forked'
  // VoidMarket-specific records for Clusters
  | 'voidmarket.energy'
  | 'voidmarket.leader'
  | 'voidmarket.member-count'
  | 'voidmarket.novas-won'
  | 'voidmarket.total-novas'
  | 'voidmarket.is-private';

// ============================================================================
// Entity Types
// ============================================================================

export type EntityType = 'star' | 'market' | 'cluster';

export interface ResolvedEntity {
  type: EntityType;
  subdomain: string;
  address?: Hex;
  data: Record<string, unknown>;
}

// ============================================================================
// Star Types
// ============================================================================

export type StarType =
  | 'MAIN_SEQUENCE'
  | 'RED_GIANT'
  | 'BLUE_SUPERGIANT'
  | 'WHITE_DWARF'
  | 'NEUTRON_STAR'
  | 'BLACK_HOLE';

export const STAR_TYPE_DISPLAY: Record<StarType, string> = {
  MAIN_SEQUENCE: 'main-sequence',
  RED_GIANT: 'red-giant',
  BLUE_SUPERGIANT: 'blue-supergiant',
  WHITE_DWARF: 'white-dwarf',
  NEUTRON_STAR: 'neutron-star',
  BLACK_HOLE: 'black-hole',
};

// ============================================================================
// Market Status Types
// ============================================================================

export type MarketStatus = 'OPEN' | 'BETTING_CLOSED' | 'RESOLVED' | 'CANCELLED';

export const MARKET_STATUS_DISPLAY: Record<MarketStatus, string> = {
  OPEN: 'open',
  BETTING_CLOSED: 'betting-closed',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled',
};

// ============================================================================
// Configuration
// ============================================================================

export interface GatewayConfig {
  domain: string;
  signerPrivateKey?: Hex;
  signatureValiditySeconds: number;
  port: number;
}

export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  domain: 'voidmarket.eth',
  signatureValiditySeconds: 300, // 5 minutes
  port: 3001,
};
