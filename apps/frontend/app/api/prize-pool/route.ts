import { NextResponse } from 'next/server';

const PRIZE_WALLET_ADDRESS = 'Fz6MsasXdCwNC5koMcswNFm5Wo7Ud5GWKmDhPMurb4Zw';
const PRIZE_PERCENTAGE = 0.7; // 70%
const LAMPORTS_PER_SOL = 1_000_000_000;

export async function GET() {
  try {
    // Use RPC endpoint from environment or default
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

    // Make JSON-RPC call to get balance
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [PRIZE_WALLET_ADDRESS],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    }

    // Get balance in lamports from response
    const balanceInLamports = data.result?.value ?? 0;

    // Convert lamports to SOL and calculate 70%
    const solBalance = balanceInLamports / LAMPORTS_PER_SOL;
    const prizePoolAmount = solBalance * PRIZE_PERCENTAGE;

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
