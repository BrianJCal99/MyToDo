import AsyncStorage from '@react-native-async-storage/async-storage';
import { Todo, Filter, SortBy, SortOrder } from '@/features/todos/todosSlice';
import { List } from '@/features/lists/listsSlice';

const todosKey = (userId: string) => `@todos_${userId}`;
const listsKey = (userId: string) => `@lists_${userId}`;
const prefsKey = (userId: string) => `@prefs_${userId}`;

// ─── Todos ────────────────────────────────────────────────────────────────────

export async function loadTodosFromStorage(userId: string): Promise<Record<string, unknown>[]> {
  try {
    const raw = await AsyncStorage.getItem(todosKey(userId));
    return raw ? (JSON.parse(raw) as Record<string, unknown>[]) : [];
  } catch {
    return [];
  }
}

export async function saveTodosToStorage(userId: string, todos: Todo[]): Promise<void> {
  try {
    await AsyncStorage.setItem(todosKey(userId), JSON.stringify(todos));
  } catch {
    // Fail silently — app continues working without persistence
  }
}

export async function clearTodosFromStorage(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(todosKey(userId));
  } catch {}
}

const todoPendingDeleteKey = (userId: string) => `@todo_pending_deletes_${userId}`;

export async function loadTodoPendingDeleteIdsFromStorage(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(todoPendingDeleteKey(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export async function saveTodoPendingDeleteIdsToStorage(userId: string, ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(todoPendingDeleteKey(userId), JSON.stringify(ids));
  } catch {}
}

// ─── Lists ────────────────────────────────────────────────────────────────────

export async function loadListsFromStorage(userId: string): Promise<List[]> {
  try {
    const raw = await AsyncStorage.getItem(listsKey(userId));
    return raw ? (JSON.parse(raw) as List[]) : [];
  } catch {
    return [];
  }
}

export async function saveListsToStorage(userId: string, lists: List[]): Promise<void> {
  try {
    await AsyncStorage.setItem(listsKey(userId), JSON.stringify(lists));
  } catch {}
}

export async function clearListsFromStorage(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(listsKey(userId));
  } catch {}
}

const listPendingDeleteKey = (userId: string) => `@list_pending_deletes_${userId}`;

export async function loadListPendingDeleteIdsFromStorage(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(listPendingDeleteKey(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export async function saveListPendingDeleteIdsToStorage(userId: string, ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(listPendingDeleteKey(userId), JSON.stringify(ids));
  } catch {}
}

// ─── UI Preferences ───────────────────────────────────────────────────────────

export interface StoredPrefs {
  filter: Filter;
  sortBy: SortBy;
  sortOrder: SortOrder;
  searchQuery: string;
  activeListId: string | null;
}

export async function loadPrefsFromStorage(userId: string): Promise<Partial<StoredPrefs>> {
  try {
    const raw = await AsyncStorage.getItem(prefsKey(userId));
    return raw ? (JSON.parse(raw) as Partial<StoredPrefs>) : {};
  } catch {
    return {};
  }
}

export async function savePrefsToStorage(userId: string, prefs: StoredPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(prefsKey(userId), JSON.stringify(prefs));
  } catch {}
}

export async function clearPrefsFromStorage(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(prefsKey(userId));
  } catch {}
}
