// apps/frontend/hooks/usePrizePool.ts
// Fetches the SOL balance from the prize pool wallet and calculates 70% of it

'use client';

import { useState, useEffect } from 'react';

export function usePrizePool() {
  const [prizePool, setPrizePool] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchBalance() {
      try {
        setLoading(true);
        setError(null);

        // Call our Next.js API route that proxies the Solana RPC request
        // Add cache-busting query parameter to ensure fresh data
        const response = await fetch(`/api/prize-pool?t=${Date.now()}`, {
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Prize pool API response:', data);

        if (data.error) {
          throw new Error(data.error);
        }

        if (isMounted) {
          console.log('Setting prize pool to:', data.prizePool);
          setPrizePool(data.prizePool);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch prize pool balance:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch balance');
          setLoading(false);
        }
      }
    }

    fetchBalance();

    // Refresh every 2 minutes
    const interval = setInterval(fetchBalance, 120000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { prizePool, loading, error };
}
