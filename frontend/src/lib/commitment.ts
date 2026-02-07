/**
 * Commitment Scheme for Hidden Bets
 *
 * Bets are hidden using a commit-reveal scheme:
 * 1. User generates a random salt
 * 2. commitmentHash = keccak256(abi.encodePacked(direction, salt))
 * 3. User submits commitmentHash with their bet (direction is hidden)
 * 4. After market resolves, user reveals direction + salt to claim winnings
 *
 * Salts are stored in BOTH Telegram Cloud Storage (primary) and
 * browser localStorage (fallback). This dual-storage approach ensures
 * salts survive cache clears and device switches within Telegram.
 */

import { keccak256, encodePacked, type Hex } from 'viem';

export interface StoredCommitment {
  marketId: string;
  betId: string;
  direction: boolean; // true = YES, false = NO
  salt: Hex;
  commitmentHash: Hex;
  timestamp: number;
}

const STORAGE_KEY = 'voidmarket_commitments';
const CLOUD_KEY_PREFIX = 'vm_c_';
const CLOUD_INDEX_KEY = 'vm_c_idx';

// ─── Telegram Cloud Storage type declarations ────────────────

interface TelegramCloudStorage {
  setItem(key: string, value: string, cb?: (err: Error | null, ok?: boolean) => void): void;
  getItem(key: string, cb: (err: Error | null, val?: string) => void): void;
  getItems(keys: string[], cb: (err: Error | null, vals?: Record<string, string>) => void): void;
  removeItem(key: string, cb?: (err: Error | null, ok?: boolean) => void): void;
  getKeys(cb: (err: Error | null, keys?: string[]) => void): void;
}

function getCloudStorage(): TelegramCloudStorage | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window.Telegram?.WebApp as any)?.CloudStorage ?? null;
}

// ─── Promisified Cloud Storage helpers ───────────────────────

function cloudSetItem(key: string, value: string): Promise<boolean> {
  return new Promise((resolve) => {
    const cs = getCloudStorage();
    if (!cs) { resolve(false); return; }
    cs.setItem(key, value, (err) => resolve(!err));
  });
}

function cloudGetItem(key: string): Promise<string | null> {
  return new Promise((resolve) => {
    const cs = getCloudStorage();
    if (!cs) { resolve(null); return; }
    cs.getItem(key, (err, val) => resolve(err ? null : val ?? null));
  });
}

function cloudRemoveItem(key: string): Promise<boolean> {
  return new Promise((resolve) => {
    const cs = getCloudStorage();
    if (!cs) { resolve(false); return; }
    cs.removeItem(key, (err) => resolve(!err));
  });
}

// ─── Core functions ──────────────────────────────────────────

/**
 * Generate a random 32-byte salt
 */
export function generateSalt(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as Hex;
}

/**
 * Generate a commitment hash from direction and salt
 * Must match the contract's generateCommitment(bool, bytes32) function
 */
export function generateCommitment(direction: boolean, salt: Hex): Hex {
  return keccak256(encodePacked(['bool', 'bytes32'], [direction, salt]));
}

// ─── Sync (localStorage-only) API — kept for backward compat ─

/**
 * Store a bet commitment in localStorage (sync, legacy)
 */
export function storeBetCommitment(
  marketId: string,
  betId: string,
  direction: boolean,
  salt: Hex
): void {
  const commitments = getAllCommitments();
  const commitmentHash = generateCommitment(direction, salt);

  commitments.push({
    marketId,
    betId,
    direction,
    salt,
    commitmentHash,
    timestamp: Date.now(),
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(commitments));
  }
}

/**
 * Get a stored commitment by bet ID (sync, localStorage only)
 */
export function getBetCommitment(betId: string): StoredCommitment | null {
  const commitments = getAllCommitments();
  return commitments.find(c => c.betId === betId) || null;
}

/**
 * Get all commitments for a specific market
 */
export function getMarketCommitments(marketId: string): StoredCommitment[] {
  const commitments = getAllCommitments();
  return commitments.filter(c => c.marketId === marketId);
}

/**
 * Get all stored commitments (sync, localStorage only)
 */
export function getAllCommitments(): StoredCommitment[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Remove a commitment after successful reveal (sync, localStorage only)
 */
export function removeCommitment(betId: string): void {
  const commitments = getAllCommitments().filter(c => c.betId !== betId);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(commitments));
  }
}

// ─── Async (Cloud Storage + localStorage) API — primary API ──

/**
 * Store a bet commitment to BOTH Cloud Storage and localStorage.
 * Cloud Storage is primary; localStorage is fallback.
 */
export async function storeBetCommitmentAsync(
  marketId: string,
  betId: string,
  direction: boolean,
  salt: Hex
): Promise<void> {
  const commitmentHash = generateCommitment(direction, salt);
  const commitment: StoredCommitment = {
    marketId,
    betId,
    direction,
    salt,
    commitmentHash,
    timestamp: Date.now(),
  };

  // Always write localStorage first (sync, reliable)
  storeBetCommitment(marketId, betId, direction, salt);

  // Then write Cloud Storage (async, best-effort)
  try {
    const json = JSON.stringify(commitment);
    // Cloud Storage has 1024 char per value limit — one key per bet
    if (json.length > 1024) {
      console.warn('[commitment] Value exceeds 1024 chars, skipping Cloud Storage for bet', betId);
      return;
    }
    await cloudSetItem(`${CLOUD_KEY_PREFIX}${betId}`, json);

    // Update index
    const idxRaw = await cloudGetItem(CLOUD_INDEX_KEY);
    const idx: string[] = idxRaw ? JSON.parse(idxRaw) : [];
    if (!idx.includes(betId)) {
      idx.push(betId);
      await cloudSetItem(CLOUD_INDEX_KEY, JSON.stringify(idx));
    }
  } catch (err) {
    console.warn('[commitment] Cloud Storage write failed, localStorage has the data:', err);
  }
}

/**
 * Get a stored commitment by bet ID.
 * Reads Cloud Storage first, falls back to localStorage.
 */
export async function getBetCommitmentAsync(betId: string): Promise<StoredCommitment | null> {
  // Try Cloud Storage first
  try {
    const raw = await cloudGetItem(`${CLOUD_KEY_PREFIX}${betId}`);
    if (raw) {
      return JSON.parse(raw) as StoredCommitment;
    }
  } catch {
    // Fall through to localStorage
  }

  // Fallback to localStorage
  return getBetCommitment(betId);
}

/**
 * Remove a commitment from BOTH Cloud Storage and localStorage.
 */
export async function removeCommitmentAsync(betId: string): Promise<void> {
  // Remove from localStorage
  removeCommitment(betId);

  // Remove from Cloud Storage
  try {
    await cloudRemoveItem(`${CLOUD_KEY_PREFIX}${betId}`);

    // Update index
    const idxRaw = await cloudGetItem(CLOUD_INDEX_KEY);
    if (idxRaw) {
      const idx: string[] = JSON.parse(idxRaw);
      const updated = idx.filter(id => id !== betId);
      await cloudSetItem(CLOUD_INDEX_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('[commitment] Cloud Storage remove failed:', err);
  }
}

/**
 * One-time migration: sync existing localStorage commitments to Cloud Storage.
 * Called on app init — fire-and-forget, never throws.
 */
export async function syncCommitmentsToCloud(): Promise<void> {
  try {
    if (!getCloudStorage()) return; // Not in Telegram — skip

    const local = getAllCommitments();
    if (local.length === 0) return;

    // Read existing Cloud index
    const idxRaw = await cloudGetItem(CLOUD_INDEX_KEY);
    const cloudIdx: string[] = idxRaw ? JSON.parse(idxRaw) : [];
    const cloudSet = new Set(cloudIdx);

    // Write any missing commitments to Cloud
    const newIds: string[] = [];
    for (const c of local) {
      if (!cloudSet.has(c.betId)) {
        const json = JSON.stringify(c);
        if (json.length <= 1024) {
          await cloudSetItem(`${CLOUD_KEY_PREFIX}${c.betId}`, json);
          newIds.push(c.betId);
        }
      }
    }

    if (newIds.length > 0) {
      const updatedIdx = [...cloudIdx, ...newIds];
      await cloudSetItem(CLOUD_INDEX_KEY, JSON.stringify(updatedIdx));
      console.log(`[commitment] Synced ${newIds.length} commitments to Cloud Storage`);
    }
  } catch (err) {
    console.warn('[commitment] Cloud sync failed (non-fatal):', err);
  }
}
