import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@daily_wallpaper';
const QUOTA_KEY = '@wallpaper_refresh_quota';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const MAX_MANUAL_REFRESHES = 3;

const UNSPLASH_API_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY ?? '';

export interface WallpaperData {
  imageUrl: string;
  fetchedAt: number;
  photographerName: string;
  photographerUsername: string;
  photographerProfileUrl: string;
}

// Tracks how many manual refreshes the user has used today.
interface RefreshQuota {
  count: number;   // refreshes used
  dateKey: string; // 'YYYY-MM-DD' — resets when the date changes
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Wallpaper storage ─────────────────────────────────────────────────────────

export async function loadWallpaperFromStorage(): Promise<WallpaperData | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WallpaperData) : null;
  } catch {
    return null;
  }
}

async function saveWallpaperToStorage(data: WallpaperData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Fail silently — app continues with the fetched image in memory
  }
}

// ── Quota storage ─────────────────────────────────────────────────────────────

async function loadRefreshQuota(): Promise<RefreshQuota> {
  try {
    const raw = await AsyncStorage.getItem(QUOTA_KEY);
    if (!raw) return { count: 0, dateKey: todayKey() };
    const parsed = JSON.parse(raw) as RefreshQuota;
    // New day — reset the counter
    if (parsed.dateKey !== todayKey()) return { count: 0, dateKey: todayKey() };
    return parsed;
  } catch {
    return { count: 0, dateKey: todayKey() };
  }
}

async function saveRefreshQuota(quota: RefreshQuota): Promise<void> {
  try {
    await AsyncStorage.setItem(QUOTA_KEY, JSON.stringify(quota));
  } catch {}
}

// ── Unsplash API ──────────────────────────────────────────────────────────────

async function fetchWallpaperFromUnsplash(): Promise<WallpaperData> {
  const url =
    'https://api.unsplash.com/photos/random?query=nature&orientation=portrait';

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = await response.json();

  return {
    imageUrl: json.urls?.regular ?? json.urls?.full,
    fetchedAt: Date.now(),
    photographerName: json.user?.name ?? 'Unknown',
    photographerUsername: json.user?.username ?? '',
    photographerProfileUrl:
      json.user?.links?.html
        ? `${json.user.links.html}?utm_source=todo_app&utm_medium=referral`
        : 'https://unsplash.com',
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns cached wallpaper if it is less than 24 h old;
 * otherwise fetches a fresh one and updates storage.
 */
export async function getDailyWallpaper(): Promise<WallpaperData> {
  const cached = await loadWallpaperFromStorage();

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  const fresh = await fetchWallpaperFromUnsplash();
  await saveWallpaperToStorage(fresh);
  return fresh;
}

/**
 * Returns how many manual refreshes the user still has today (0–3).
 */
export async function getRefreshesRemaining(): Promise<number> {
  const quota = await loadRefreshQuota();
  return Math.max(0, MAX_MANUAL_REFRESHES - quota.count);
}

/**
 * Fetches a brand-new wallpaper, deducting one from today's quota.
 * Throws if the daily limit has been reached.
 */
export async function refreshWallpaper(): Promise<{ wallpaper: WallpaperData; remaining: number }> {
  const quota = await loadRefreshQuota();

  if (quota.count >= MAX_MANUAL_REFRESHES) {
    throw new Error('no_quota');
  }

  const wallpaper = await fetchWallpaperFromUnsplash();
  await saveWallpaperToStorage(wallpaper);

  const updated: RefreshQuota = { count: quota.count + 1, dateKey: todayKey() };
  await saveRefreshQuota(updated);

  return {
    wallpaper,
    remaining: Math.max(0, MAX_MANUAL_REFRESHES - updated.count),
  };
}
