/**
 * Get full list of BridgeKit supported chains
 */

import 'dotenv/config';
import { BridgeKit } from '@circle-fin/bridge-kit';
import { inspect } from 'util';

async function main() {
  console.log('='.repeat(70));
  console.log('BridgeKit Supported Chains');
  console.log('='.repeat(70));
  console.log('');

  const kit = new BridgeKit();

  // Explore the kit object
  console.log('BridgeKit instance keys:', Object.keys(kit));
  console.log('');

  // Try different methods
  try {
    const chains = await kit.getSupportedChains();
    console.log('getSupportedChains() result type:', typeof chains);
    console.log('getSupportedChains() result:');
    console.log(inspect(chains, false, null, true));
  } catch (e: any) {
    console.log('getSupportedChains error:', e.message);
  }

  console.log('');

  // Check prototype methods
  console.log('Kit prototype methods:');
  const proto = Object.getPrototypeOf(kit);
  console.log(Object.getOwnPropertyNames(proto).filter(n => n !== 'constructor'));
}

main().catch(console.error);
