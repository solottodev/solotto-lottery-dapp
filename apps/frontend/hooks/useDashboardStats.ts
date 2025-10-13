// apps/frontend/hooks/useDashboardStats.ts
// Fetches dashboard statistics (total rounds, SOL distributed, winners, avg prize pool)

'use client';

import { useState, useEffect } from 'react';

export interface DashboardStats {
  network: string;
  totalRounds: number;
  totalSolDistributed: number;
  totalWinners: number;
  avgPrizePool: number;
  lastUpdated: string;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      try {
        setLoading(true);
        setError(null);

        // Call our Next.js API route that proxies the backend request
        // Add cache-busting query parameter to ensure fresh data
        const response = await fetch(`/api/dashboard-stats?t=${Date.now()}`, {
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Dashboard stats API response:', data);

        if (data.error) {
          throw new Error(data.error);
        }

        if (isMounted) {
          console.log('Setting dashboard stats to:', data);
          setStats(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch stats');
          setLoading(false);
        }
      }
    }

    fetchStats();

    // Refresh every 5 minutes (stats don't change as frequently as prize pool)
    const interval = setInterval(fetchStats, 300000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { stats, loading, error };
}
