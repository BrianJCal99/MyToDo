import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { loadTodosFromStorage } from '@/services/storage';
import {
  fetchTodosFromSupabase,
  upsertTodosToSupabase,
  deleteTodoFromSupabase,
} from '@/services/todosService';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}

export type Filter = 'all' | 'completed' | 'active';

export interface TodosState {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  filter: Filter;
}

const initialState: TodosState = {
  todos: [],
  loading: false,
  error: null,
  filter: 'all',
};

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
  return await loadTodosFromStorage(userId);
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
    if (unsynced.length === 0) return [] as string[];
    await upsertTodosToSupabase(unsynced, userId);
    return unsynced.map((t) => t.id);
  }
);

export const addTodo = createAsyncThunk(
  'todos/add',
  async ({ title, description }: { title: string; description?: string }): Promise<Todo> => {
    const now = Date.now();
    return {
      id: generateId(),
      title: title.trim(),
      description: description?.trim() || undefined,
      completed: false,
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
  }: {
    id: string;
    title: string;
    description?: string;
  }) => {
    return { id, title: title.trim(), description: description?.trim() || undefined, updatedAt: Date.now() };
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
      // sync
      .addCase(syncTodos.fulfilled, (state, action) => {
        const ids = new Set(action.payload);
        for (const todo of state.todos) {
          if (ids.has(todo.id)) todo.synced = true;
        }
      })
      // add
      .addCase(addTodo.fulfilled, (state, action) => {
        state.todos.unshift(action.payload);
      })
      // update
      .addCase(updateTodo.fulfilled, (state, action) => {
        const { id, title, description, updatedAt } = action.payload;
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          todo.title = title;
          todo.description = description;
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

export const { setFilter, clearTodos } = todosSlice.actions;
export default todosSlice.reducer;
