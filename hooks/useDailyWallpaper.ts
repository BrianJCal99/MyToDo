import { useCallback, useEffect, useState } from 'react';
import {
  getDailyWallpaper,
  getRefreshesRemaining,
  loadWallpaperFromStorage,
  MAX_MANUAL_REFRESHES,
  refreshWallpaper,
  WallpaperData,
} from '@/services/wallpaperService';

interface WallpaperState {
  wallpaper: WallpaperData | null;
  loading: boolean;
  error: string | null;
  // Manual refresh
  isRefreshing: boolean;
  refreshesRemaining: number;
  refresh: () => Promise<void>;
  // Re-read storage (e.g. when returning from settings)
  reload: () => void;
}

export function useDailyWallpaper(): WallpaperState {
  const [wallpaper, setWallpaper] = useState<WallpaperData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshesRemaining, setRefreshesRemaining] = useState(MAX_MANUAL_REFRESHES);
  // Incrementing this triggers the load effect to re-run (used by reload())
  const [version, setVersion] = useState(0);

  // ── Initial / on-focus load ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Show cached image immediately so there's no blank flash on launch
      const cached = await loadWallpaperFromStorage();
      if (!cancelled && cached) {
        setWallpaper(cached);
        setLoading(true);
      }

      try {
        const [data, remaining] = await Promise.all([
          getDailyWallpaper(),
          getRefreshesRemaining(),
        ]);
        if (!cancelled) {
          setWallpaper(data);
          setRefreshesRemaining(remaining);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load wallpaper');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [version]);

  // ── Manual refresh ─────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (isRefreshing || refreshesRemaining <= 0) return;
    setIsRefreshing(true);
    try {
      const { wallpaper: fresh, remaining } = await refreshWallpaper();
      setWallpaper(fresh);
      setRefreshesRemaining(remaining);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh wallpaper');
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refreshesRemaining]);

  // ── Reload from storage (called on screen focus) ───────────────────────────
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    wallpaper,
    loading,
    error,
    isRefreshing,
    refreshesRemaining,
    refresh,
    reload,
  };
}
