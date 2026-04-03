import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@daily_wallpaper';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const UNSPLASH_API_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY ?? '';

export interface WallpaperData {
  imageUrl: string;
  fetchedAt: number;
  photographerName: string;
  photographerUsername: string;
  photographerProfileUrl: string;
}

// ── Storage ───────────────────────────────────────────────────────────────────

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
