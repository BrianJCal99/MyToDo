import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { loadTodosFromStorage } from '@/services/storage';
import {
  fetchTodosFromSupabase,
  upsertTodosToSupabase,
  deleteTodoFromSupabase,
} from '@/services/todosService';
import { DEFAULT_LIST_ID } from '@/features/lists/listsSlice';

export type Priority = 'low' | 'medium' | 'high';
export type Filter = 'all' | 'active' | 'completed' | 'overdue' | 'high_priority';
export type SortBy = 'createdAt' | 'updatedAt' | 'priority' | 'dueDate';
export type SortOrder = 'asc' | 'desc';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  dueDate: number | null;
  listId: string;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}

export interface TodosState {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  filter: Filter;
  searchQuery: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
}

const initialState: TodosState = {
  todos: [],
  loading: false,
  error: null,
  filter: 'all',
  searchQuery: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Fills in defaults for todos loaded from storage or Supabase that may be missing new fields
function migrateTodo(raw: Record<string, unknown>): Todo {
  return {
    id: raw.id as string,
    title: raw.title as string,
    description: raw.description as string | undefined,
    completed: (raw.completed as boolean) ?? false,
    priority: (raw.priority as Priority) ?? 'medium',
    dueDate: (raw.dueDate as number | null) ?? null,
    listId: (raw.listId as string) ?? DEFAULT_LIST_ID,
    createdAt: (raw.createdAt as number) ?? Date.now(),
    updatedAt: (raw.updatedAt as number) ?? Date.now(),
    synced: (raw.synced as boolean) ?? false,
  };
}

function mergeTodoLists(local: Todo[], remote: Todo[]): Todo[] {
  const map = new Map<string, Todo>(local.map((t) => [t.id, t]));
  for (const remoteTodo of remote) {
    const existing = map.get(remoteTodo.id);
    if (!existing || remoteTodo.updatedAt > existing.updatedAt) {
      map.set(remoteTodo.id, remoteTodo);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
}

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const hydrateTodos = createAsyncThunk('todos/hydrate', async (userId: string) => {
  const raw = await loadTodosFromStorage(userId);
  return (raw as Record<string, unknown>[]).map(migrateTodo);
});

export const fetchTodos = createAsyncThunk(
  'todos/fetch',
  async (userId: string, { getState }) => {
    const remote = await fetchTodosFromSupabase(userId);
    const state = getState() as { todos: TodosState };
    return mergeTodoLists(state.todos.todos, remote);
  }
);

export const syncTodos = createAsyncThunk(
  'todos/sync',
  async (userId: string, { getState }) => {
    const state = getState() as { todos: TodosState };
    const unsynced = state.todos.todos.filter((t) => !t.synced);
    if (unsynced.length === 0) return { serverTodos: [] as Todo[] };
    // Upsert and get back server rows so we can adopt the trigger-assigned updated_at,
    // preventing clock-skew from causing stale local timestamps to lose conflict resolution.
    const serverTodos = await upsertTodosToSupabase(unsynced, userId);
    return { serverTodos };
  }
);

export const addTodo = createAsyncThunk(
  'todos/add',
  async ({
    title,
    description,
    listId,
    priority,
    dueDate,
  }: {
    title: string;
    description?: string;
    listId?: string;
    priority?: Priority;
    dueDate?: number | null;
  }): Promise<Todo> => {
    const now = Date.now();
    return {
      id: generateId(),
      title: title.trim(),
      description: description?.trim() || undefined,
      completed: false,
      priority: priority ?? 'medium',
      dueDate: dueDate ?? null,
      listId: listId ?? DEFAULT_LIST_ID,
      createdAt: now,
      updatedAt: now,
      synced: false,
    };
  }
);

export const updateTodo = createAsyncThunk(
  'todos/update',
  async ({
    id,
    title,
    description,
    priority,
    dueDate,
    listId,
  }: {
    id: string;
    title: string;
    description?: string;
    priority?: Priority;
    dueDate?: number | null;
    listId?: string;
  }) => {
    return {
      id,
      title: title.trim(),
      description: description?.trim() || undefined,
      priority,
      dueDate,
      listId,
      updatedAt: Date.now(),
    };
  }
);

export const deleteTodo = createAsyncThunk('todos/delete', async (id: string) => {
  // Fire-and-forget — tolerate offline failures
  deleteTodoFromSupabase(id).catch(() => {});
  return id;
});

export const toggleTodo = createAsyncThunk('todos/toggle', async (id: string) => {
  return { id, updatedAt: Date.now() };
});

// ─── Slice ───────────────────────────────────────────────────────────────────

const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: {
    setFilter(state, action: PayloadAction<Filter>) {
      state.filter = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setSortBy(state, action: PayloadAction<SortBy>) {
      state.sortBy = action.payload;
    },
    setSortOrder(state, action: PayloadAction<SortOrder>) {
      state.sortOrder = action.payload;
    },
    clearTodos() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // hydrate
      .addCase(hydrateTodos.fulfilled, (state, action) => {
        state.todos = action.payload;
      })
      // fetch
      .addCase(fetchTodos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodos.fulfilled, (state, action) => {
        state.loading = false;
        state.todos = action.payload;
      })
      .addCase(fetchTodos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to fetch todos';
      })
      // sync — replace each synced todo with the server's version so that
      // the trigger-assigned updated_at is stored locally, preventing clock-skew
      // from causing subsequent merges to incorrectly prefer an older server copy.
      .addCase(syncTodos.fulfilled, (state, action) => {
        const { serverTodos } = action.payload;
        const serverMap = new Map(serverTodos.map((t) => [t.id, t]));
        state.todos = state.todos.map((local) => {
          const server = serverMap.get(local.id);
          if (!server) return local;
          return { ...server, synced: true };
        });
      })
      // add
      .addCase(addTodo.fulfilled, (state, action) => {
        state.todos.unshift(action.payload);
      })
      // update
      .addCase(updateTodo.fulfilled, (state, action) => {
        const { id, title, description, priority, dueDate, listId, updatedAt } = action.payload;
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          todo.title = title;
          todo.description = description;
          if (priority !== undefined) todo.priority = priority;
          if (dueDate !== undefined) todo.dueDate = dueDate;
          if (listId !== undefined) todo.listId = listId;
          todo.updatedAt = updatedAt;
          todo.synced = false;
        }
      })
      // delete
      .addCase(deleteTodo.fulfilled, (state, action) => {
        state.todos = state.todos.filter((t) => t.id !== action.payload);
      })
      // toggle
      .addCase(toggleTodo.fulfilled, (state, action) => {
        const { id, updatedAt } = action.payload;
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          todo.completed = !todo.completed;
          todo.updatedAt = updatedAt;
          todo.synced = false;
        }
      });
  },
});

export const { setFilter, setSearchQuery, setSortBy, setSortOrder, clearTodos } = todosSlice.actions;
export default todosSlice.reducer;
