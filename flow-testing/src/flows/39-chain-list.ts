/**
 * Get clean list of BridgeKit supported chains
 */

import 'dotenv/config';
import { BridgeKit } from '@circle-fin/bridge-kit';

async function main() {
  console.log('='.repeat(70));
  console.log('BridgeKit Chain List');
  console.log('='.repeat(70));
  console.log('');

  const kit = new BridgeKit();
  const chains = await kit.getSupportedChains();

  // Separate testnets and mainnets
  const testnets: any[] = [];
  const mainnets: any[] = [];

  for (const chain of chains as any[]) {
    if (chain.isTestnet) {
      testnets.push(chain);
    } else {
      mainnets.push(chain);
    }
  }

  console.log('=== TESTNETS ===');
  console.log('');
  for (const chain of testnets.sort((a, b) => a.chain.localeCompare(b.chain))) {
    const domain = chain.cctp?.domain ?? 'N/A';
    console.log(`  ${chain.chain.padEnd(25)} | Domain: ${String(domain).padStart(2)} | Type: ${chain.type}`);
  }

  console.log('');
  console.log('=== MAINNETS ===');
  console.log('');
  for (const chain of mainnets.sort((a, b) => a.chain.localeCompare(b.chain))) {
    const domain = chain.cctp?.domain ?? 'N/A';
    console.log(`  ${chain.chain.padEnd(25)} | Domain: ${String(domain).padStart(2)} | Type: ${chain.type}`);
  }

  console.log('');
  console.log('Total chains:', chains.length);
  console.log('  Testnets:', testnets.length);
  console.log('  Mainnets:', mainnets.length);

  // Find chains relevant to our demo (Arc testnet compatible)
  console.log('');
  console.log('=== ARC_TESTNET COMPATIBLE (Testnets with CCTP v2) ===');
  console.log('');

  const arcCompatible = testnets.filter((c: any) => c.cctp?.contracts?.v2);
  for (const chain of arcCompatible.sort((a: any, b: any) => a.chain.localeCompare(b.chain))) {
    console.log(`  ${chain.chain}`);
  }
}

main().catch(console.error);
