import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function usePricesLastSync() {
  const { data } = useQuery({
    queryKey: ['prices-last-sync'],
    queryFn: api.getPricesLastSync,
    staleTime: 5 * 60 * 1000,
  });

  const syncedAtLabel = (() => {
    if (!data?.synced_at) return null;
    const date = new Date(data.synced_at);
    date.setHours(date.getHours() + 4);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
      timeZoneName: 'short',
    });
  })();

  const pricesStale = (() => {
    if (!data?.synced_at) return false;
    return Date.now() - new Date(data.synced_at).getTime() > STALE_THRESHOLD_MS;
  })();

  return { syncedAtLabel, pricesStale };
}