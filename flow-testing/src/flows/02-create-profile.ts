/**
 * Flow 2: Create Profile
 *
 * Tests profile creation with ENS subdomain:
 * 1. User must be registered
 * 2. Create profile with display name and star type
 * 3. Register ENS subdomain
 * 4. Verify ENS resolution
 */

import { getUserByTelegramId, createProfile, getProfileByUserId } from '../services/db/queries.js';
import { createENSRecord, getENSRecord } from '../services/db/queries.js';
import type { Profile, NewProfile } from '../services/db/schema.js';

export interface ProfileResult {
  success: boolean;
  profile?: Profile;
  ensSubdomain?: string;
  error?: string;
}

// Star types in VoidMarket
export const STAR_TYPES = [
  'MAIN_SEQUENCE',
  'RED_GIANT',
  'WHITE_DWARF',
  'NEUTRON_STAR',
  'PULSAR',
  'SUPERGIANT',
] as const;

export type StarType = (typeof STAR_TYPES)[number];

/**
 * Create a user profile with optional ENS subdomain
 */
export async function createUserProfile(
  telegramId: string,
  displayName: string,
  starType: StarType = 'MAIN_SEQUENCE',
  requestENS = true
): Promise<ProfileResult> {
  console.log(`\n=== Flow 2: Create Profile ===`);
  console.log(`Telegram ID: ${telegramId}`);
  console.log(`Display Name: ${displayName}`);
  console.log(`Star Type: ${starType}`);

  try {
    // Step 1: Get user
    console.log(`\n[Step 1] Looking up user...`);
    const user = await getUserByTelegramId(telegramId);

    if (!user) {
      throw new Error('User not registered. Complete Flow 1 first.');
    }
    console.log(`Found user ID: ${user.id}`);

    // Step 2: Check for existing profile
    console.log(`\n[Step 2] Checking for existing profile...`);
    let profile = await getProfileByUserId(user.id);

    if (profile) {
      console.log(`Profile already exists: ${profile.displayName}`);
      return {
        success: true,
        profile,
        ensSubdomain: profile.ensSubdomain || undefined,
      };
    }

    // Step 3: Generate ENS subdomain
    let ensSubdomain: string | undefined;
    if (requestENS) {
      console.log(`\n[Step 3] Generating ENS subdomain...`);
      // Create subdomain from display name (lowercase, no spaces)
      const subdomain = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const fullSubdomain = `${subdomain}.voidmarket.eth`;

      // Check if subdomain is available
      const existingENS = await getENSRecord(subdomain);
      if (existingENS) {
        console.log(`Subdomain '${subdomain}' already taken, trying with suffix...`);
        ensSubdomain = `${subdomain}${user.id}.voidmarket.eth`;
      } else {
        ensSubdomain = fullSubdomain;
      }

      console.log(`ENS subdomain: ${ensSubdomain}`);
    }

    // Step 4: Create profile in database
    console.log(`\n[Step 4] Creating profile...`);
    const profileData: NewProfile = {
      userId: user.id,
      displayName,
      starType,
      ensSubdomain,
    };

    profile = await createProfile(profileData);
    console.log(`Profile created with ID: ${profile.id}`);

    // Step 5: Register ENS record (off-chain)
    if (ensSubdomain) {
      console.log(`\n[Step 5] Registering ENS record...`);
      const subdomain = ensSubdomain.split('.')[0];

      await createENSRecord({
        subdomain,
        fullName: ensSubdomain,
        address: user.walletAddress,
        userId: user.id,
        records: {
          display: displayName,
          'com.twitter': '', // Can be set later
          avatar: '', // Can be set later
        },
      });

      console.log(`ENS record created for ${ensSubdomain}`);

      // Verify ENS record
      const verifyENS = await getENSRecord(subdomain);
      if (verifyENS?.address !== user.walletAddress) {
        throw new Error('ENS record verification failed');
      }
      console.log(`✓ ENS record verified`);
    }

    console.log(`\n=== Profile Creation Complete ===`);
    console.log(`Display Name: ${profile.displayName}`);
    console.log(`Star Type: ${profile.starType}`);
    if (ensSubdomain) {
      console.log(`ENS: ${ensSubdomain}`);
    }

    return {
      success: true,
      profile,
      ensSubdomain,
    };
  } catch (error) {
    console.error(`\n❌ Profile creation failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test the profile creation flow
 */
export async function testProfileFlow(telegramId: string): Promise<void> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing Profile Creation Flow`);
  console.log(`${'='.repeat(50)}`);

  const result = await createUserProfile(
    telegramId,
    'TestStar',
    'NEUTRON_STAR',
    true
  );

  if (result.success) {
    console.log(`\n✅ Flow 2 PASSED`);
  } else {
    console.log(`\n❌ Flow 2 FAILED: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const telegramId = process.argv[2] || `test_${Date.now()}`;
  testProfileFlow(telegramId).catch(console.error);
}
