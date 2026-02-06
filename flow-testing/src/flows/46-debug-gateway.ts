/**
 * Debug Gateway API
 */

import 'dotenv/config';
import { privateKeyToAccount } from 'viem/accounts';

const GATEWAY_API = 'https://gateway-api-testnet.circle.com';

async function main() {
  const evmPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const account = privateKeyToAccount(evmPrivateKey as `0x${string}`);

  console.log('Wallet:', account.address);
  console.log('');

  // Test 1: Info endpoint
  console.log('=== Test 1: Gateway Info ===');
  try {
    const infoRes = await fetch(`${GATEWAY_API}/v1/info`);
    const info = await infoRes.json();
    console.log('Supported domains:', info.domains?.length);
    for (const d of info.domains || []) {
      console.log(`  Domain ${d.domain}: ${d.chain} ${d.network}`);
    }
  } catch (e: any) {
    console.error('Info error:', e.message);
  }

  console.log('');

  // Test 2: Balance endpoint (correct format)
  console.log('=== Test 2: Gateway Balances ===');
  const balanceRequest = {
    token: 'USDC',
    sources: [
      { depositor: account.address, domain: 0 },  // ETH
      { depositor: account.address, domain: 1 },  // Avalanche
      { depositor: account.address, domain: 6 },  // Base
      { depositor: account.address, domain: 26 }, // Arc
    ],
  };

  console.log('Request:', JSON.stringify(balanceRequest, null, 2));

  try {
    const balRes = await fetch(`${GATEWAY_API}/v1/balances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(balanceRequest),
    });

    const balText = await balRes.text();
    console.log('Status:', balRes.status);
    console.log('Response:', balText);

    if (balRes.ok) {
      const balances = JSON.parse(balText);
      console.log('');
      console.log('Parsed balances:');
      for (const b of balances.balances || []) {
        console.log(`  Domain ${b.domain}: ${b.balance} USDC`);
      }
    }
  } catch (e: any) {
    console.error('Balance error:', e.message);
  }

  console.log('');

  // Test 3: Check env vars
  console.log('=== Environment Variables ===');
  console.log('CIRCLE_CLIENT_URL:', process.env.CIRCLE_CLIENT_URL || 'not set');
  console.log('CIRCLE_CLIENT_KEY:', process.env.CIRCLE_CLIENT_KEY ? `set (${process.env.CIRCLE_CLIENT_KEY.slice(0, 20)}...)` : 'not set');
}

main().catch(console.error);
