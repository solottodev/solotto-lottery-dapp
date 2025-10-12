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
        const response = await fetch('/api/prize-pool');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (isMounted) {
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

    // Refresh every 30 seconds
    const interval = setInterval(fetchBalance, 600000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { prizePool, loading, error };
}
