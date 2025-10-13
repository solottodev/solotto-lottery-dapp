import { NextResponse } from 'next/server';

const PRIZE_WALLET_ADDRESS = 'Fz6MsasXdCwNC5koMcswNFm5Wo7Ud5GWKmDhPMurb4Zw';
const PRIZE_PERCENTAGE = 0.7; // 70%
const LAMPORTS_PER_SOL = 1_000_000_000;

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Use RPC endpoint from environment or default
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    console.log('[Prize Pool API] Using RPC URL:', rpcUrl);
    console.log('[Prize Pool API] Fetching balance for wallet:', PRIZE_WALLET_ADDRESS);

    // Make JSON-RPC call to get balance with retry logic
    let response;
    let retries = 3;
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        response = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Connection': 'close',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(), // Use timestamp as ID for uniqueness
            method: 'getBalance',
            params: [PRIZE_WALLET_ADDRESS],
          }),
          cache: 'no-store',
          keepalive: false,
        });

        if (response.ok) {
          break; // Success, exit retry loop
        }
        lastError = new Error(`HTTP ${response.status}`);
        console.log(`[Prize Pool API] Retry ${i + 1}/${retries} due to HTTP ${response.status}`);
      } catch (err) {
        lastError = err;
        console.log(`[Prize Pool API] Retry ${i + 1}/${retries} due to error:`, err);
      }

      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between retries
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error(`HTTP error! status: ${response?.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    }

    // Get balance in lamports from response
    const balanceInLamports = data.result?.value ?? 0;
    console.log('[Prize Pool API] Balance in lamports:', balanceInLamports);

    // Convert lamports to SOL and calculate 70%
    const solBalance = balanceInLamports / LAMPORTS_PER_SOL;
    const prizePoolAmount = solBalance * PRIZE_PERCENTAGE;

    console.log('[Prize Pool API] SOL balance:', solBalance);
    console.log('[Prize Pool API] Prize pool (70%):', prizePoolAmount);

    return NextResponse.json({
      prizePool: prizePoolAmount,
      walletBalance: solBalance,
      percentage: PRIZE_PERCENTAGE,
    });
  } catch (error) {
    console.error('Failed to fetch prize pool:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch prize pool' },
      { status: 500 }
    );
  }
}
