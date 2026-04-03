import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { loadListsFromStorage, loadListPendingDeleteIdsFromStorage } from '@/services/storage';
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
  pendingDeleteIds: string[];
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
  pendingDeleteIds: [],
};

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function mergeListArrays(local: List[], remote: List[], pendingDeleteIds: string[]): List[] {
  const pendingSet = new Set(pendingDeleteIds);
  const map = new Map<string, List>(local.map((l) => [l.id, l]));
  for (const remoteList of remote) {
    if (pendingSet.has(remoteList.id)) continue; // locally deleted — don't re-add
    map.set(remoteList.id, remoteList);
  }
  // Inbox is always present and local-only
  map.set(DEFAULT_LIST_ID, INBOX);
  return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
}

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const hydrateLists = createAsyncThunk('lists/hydrate', async (userId: string) => {
  const [stored, pendingDeleteIds] = await Promise.all([
    loadListsFromStorage(userId),
    loadListPendingDeleteIdsFromStorage(userId),
  ]);
  const map = new Map<string, List>(stored.map((l) => [l.id, l]));
  map.set(DEFAULT_LIST_ID, INBOX);
  return {
    lists: Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt),
    pendingDeleteIds,
  };
});

export const fetchLists = createAsyncThunk(
  'lists/fetch',
  async (userId: string, { getState }) => {
    const remote = await fetchListsFromSupabase(userId);
    const state = getState() as { lists: ListsState };
    return mergeListArrays(state.lists.lists, remote, state.lists.pendingDeleteIds);
  }
);

export const syncLists = createAsyncThunk(
  'lists/sync',
  async (userId: string, { getState }) => {
    const state = getState() as { lists: ListsState };
    // Skip Inbox — it's local-only and doesn't belong in Supabase
    const unsynced = state.lists.lists.filter((l) => !l.synced && l.id !== DEFAULT_LIST_ID);
    const { pendingDeleteIds } = state.lists;

    let syncedIds: string[] = [];
    if (unsynced.length > 0) {
      await upsertListsToSupabase(unsynced, userId);
      syncedIds = unsynced.map((l) => l.id);
    }

    const successfulDeleteIds: string[] = [];
    await Promise.all(
      pendingDeleteIds.map(async (id) => {
        try {
          await deleteListFromSupabase(id);
          successfulDeleteIds.push(id);
        } catch {}
      })
    );

    return { syncedIds, successfulDeleteIds };
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
  if (id === DEFAULT_LIST_ID) return { id, deleteSucceeded: true };
  let deleteSucceeded = false;
  try {
    await deleteListFromSupabase(id);
    deleteSucceeded = true;
  } catch {}
  return { id, deleteSucceeded };
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
        state.lists = action.payload.lists;
        state.pendingDeleteIds = action.payload.pendingDeleteIds;
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
        const { syncedIds, successfulDeleteIds } = action.payload;
        const ids = new Set(syncedIds);
        for (const list of state.lists) {
          if (ids.has(list.id)) list.synced = true;
        }
        if (successfulDeleteIds.length > 0) {
          const successSet = new Set(successfulDeleteIds);
          state.pendingDeleteIds = state.pendingDeleteIds.filter((id) => !successSet.has(id));
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
        const { id, deleteSucceeded } = action.payload;
        // Cannot delete Inbox
        if (id !== DEFAULT_LIST_ID) {
          state.lists = state.lists.filter((l) => l.id !== id);
          if (state.activeListId === id) {
            state.activeListId = null;
          }
          if (!deleteSucceeded && !state.pendingDeleteIds.includes(id)) {
            state.pendingDeleteIds.push(id);
          }
        }
      });
  },
});

export const { setActiveListId, clearLists } = listsSlice.actions;
export default listsSlice.reducer;
