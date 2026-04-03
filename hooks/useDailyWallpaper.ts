import { useEffect, useState } from 'react';
import {
  getDailyWallpaper,
  loadWallpaperFromStorage,
  WallpaperData,
} from '@/services/wallpaperService';

interface WallpaperState {
  wallpaper: WallpaperData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads the daily nature wallpaper on mount.
 * - Immediately surfaces any cached data so the UI isn't blank while fetching.
 * - Replaces with a fresh image if the cache is older than 24 h.
 */
export function useDailyWallpaper(): WallpaperState {
  const [state, setState] = useState<WallpaperState>({
    wallpaper: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Show cached data immediately to avoid a blank background on launch
      const cached = await loadWallpaperFromStorage();
      if (!cancelled && cached) {
        setState({ wallpaper: cached, loading: true, error: null });
      }

      try {
        const data = await getDailyWallpaper();
        if (!cancelled) {
          setState({ wallpaper: data, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            // Keep whatever we already have (cached or null)
            wallpaper: prev.wallpaper,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load wallpaper',
          }));
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
