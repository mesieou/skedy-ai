"use client";

import { useState, useEffect, useCallback } from 'react';

interface AnalyticsData {
  summary: Record<string, unknown> | null;
  businesses: Record<string, unknown>[] | null;
  recent: Record<string, unknown>[] | null;
  status: Record<string, unknown> | null;
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData>({
    summary: null,
    businesses: null,
    recent: null,
    status: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);

      // Simple single API call to get all data
      const response = await fetch('/api/analytics?type=all');

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'API returned error');
      }

      setData({
        summary: result.data.summary,
        businesses: result.data.businesses,
        recent: result.data.recent,
        status: result.data.status,
      });

      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Analytics fetch error:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Simple polling every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  return {
    summary: data.summary,
    businesses: data.businesses,
    recent: data.recent,
    status: data.status,
    isLoading,
    error,
    refetch: fetchAnalytics,
  };
}
