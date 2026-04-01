import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { loadListsFromStorage } from '@/services/storage';
import {
  fetchListsFromSupabase,
  upsertListsToSupabase,
  deleteListFromSupabase,
} from '@/services/listsService';

// Fixed UUID for the default "Inbox" list — always exists, never synced to Supabase
export const DEFAULT_LIST_ID = '00000000-0000-4000-8000-000000000001';

export interface List {
  id: string;
  name: string;
  createdAt: number;
  synced: boolean;
}

export interface ListsState {
  lists: List[];
  activeListId: string | null; // null = show all lists
  loading: boolean;
  error: string | null;
}

const INBOX: List = {
  id: DEFAULT_LIST_ID,
  name: 'Inbox',
  createdAt: 0,
  synced: true,
};

const initialState: ListsState = {
  lists: [INBOX],
  activeListId: null,
  loading: false,
  error: null,
};

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function mergeListArrays(local: List[], remote: List[]): List[] {
  const map = new Map<string, List>(local.map((l) => [l.id, l]));
  for (const remoteList of remote) {
    map.set(remoteList.id, remoteList);
  }
  // Inbox is always present and local-only
  map.set(DEFAULT_LIST_ID, INBOX);
  return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
}

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const hydrateLists = createAsyncThunk('lists/hydrate', async (userId: string) => {
  const stored = await loadListsFromStorage(userId);
  const map = new Map<string, List>(stored.map((l) => [l.id, l]));
  map.set(DEFAULT_LIST_ID, INBOX);
  return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
});

export const fetchLists = createAsyncThunk(
  'lists/fetch',
  async (userId: string, { getState }) => {
    const remote = await fetchListsFromSupabase(userId);
    const state = getState() as { lists: ListsState };
    return mergeListArrays(state.lists.lists, remote);
  }
);

export const syncLists = createAsyncThunk(
  'lists/sync',
  async (userId: string, { getState }) => {
    const state = getState() as { lists: ListsState };
    // Skip Inbox — it's local-only and doesn't belong in Supabase
    const unsynced = state.lists.lists.filter((l) => !l.synced && l.id !== DEFAULT_LIST_ID);
    if (unsynced.length === 0) return [] as string[];
    await upsertListsToSupabase(unsynced, userId);
    return unsynced.map((l) => l.id);
  }
);

export const addList = createAsyncThunk(
  'lists/add',
  async (name: string): Promise<List> => ({
    id: generateId(),
    name: name.trim(),
    createdAt: Date.now(),
    synced: false,
  })
);

export const updateList = createAsyncThunk(
  'lists/update',
  async ({ id, name }: { id: string; name: string }) => ({ id, name: name.trim() })
);

export const deleteList = createAsyncThunk('lists/delete', async (id: string) => {
  // Fire-and-forget — tolerate offline failures
  deleteListFromSupabase(id).catch(() => {});
  return id;
});

// ─── Slice ───────────────────────────────────────────────────────────────────

const listsSlice = createSlice({
  name: 'lists',
  initialState,
  reducers: {
    setActiveListId(state, action: PayloadAction<string | null>) {
      state.activeListId = action.payload;
    },
    clearLists() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateLists.fulfilled, (state, action) => {
        state.lists = action.payload;
      })
      .addCase(fetchLists.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLists.fulfilled, (state, action) => {
        state.loading = false;
        state.lists = action.payload;
      })
      .addCase(fetchLists.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch lists';
      })
      .addCase(syncLists.fulfilled, (state, action) => {
        const ids = new Set(action.payload);
        for (const list of state.lists) {
          if (ids.has(list.id)) list.synced = true;
        }
      })
      .addCase(addList.fulfilled, (state, action) => {
        state.lists.push(action.payload);
      })
      .addCase(updateList.fulfilled, (state, action) => {
        const { id, name } = action.payload;
        const list = state.lists.find((l) => l.id === id);
        // Cannot rename Inbox
        if (list && list.id !== DEFAULT_LIST_ID) {
          list.name = name;
          list.synced = false;
        }
      })
      .addCase(deleteList.fulfilled, (state, action) => {
        // Cannot delete Inbox
        if (action.payload !== DEFAULT_LIST_ID) {
          state.lists = state.lists.filter((l) => l.id !== action.payload);
          if (state.activeListId === action.payload) {
            state.activeListId = null;
          }
        }
      });
  },
});

export const { setActiveListId, clearLists } = listsSlice.actions;
export default listsSlice.reducer;
