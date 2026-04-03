import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { loadTodosFromStorage, loadTodoPendingDeleteIdsFromStorage } from '@/services/storage';
import {
  fetchTodosFromSupabase,
  upsertTodosToSupabase,
  deleteTodoFromSupabase,
} from '@/services/todosService';
import { scheduleReminder, scheduleDueNotification, cancelReminder } from '@/services/notificationsService';
import { DEFAULT_LIST_ID } from '@/features/lists/listsSlice';

export type Priority = 'low' | 'medium' | 'high';
export type Filter = 'all' | 'active' | 'completed' | 'overdue' | 'high_priority' | 'due_today';
export type SortBy = 'createdAt' | 'updatedAt' | 'priority' | 'dueDate' | 'title';
export type SortOrder = 'asc' | 'desc';
export type PriorityFilter = Priority | 'all';

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
  reminderOffset: number | null; // minutes before dueDate to fire notification
  reminderId: string | null;     // expo notification identifier (device-local, not synced)
  dueNotificationId: string | null; // "task due" notification fired at the due date/time
}

export interface TodosState {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  filter: Filter;
  priorityFilter: PriorityFilter;
  searchQuery: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
  pendingDeleteIds: string[];
}

const initialState: TodosState = {
  todos: [],
  loading: false,
  error: null,
  filter: 'all',
  priorityFilter: 'all',
  searchQuery: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  pendingDeleteIds: [],
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
    reminderOffset: (raw.reminderOffset as number | null) ?? null,
    reminderId: (raw.reminderId as string | null) ?? null,
    dueNotificationId: (raw.dueNotificationId as string | null) ?? null,
  };
}

function mergeTodoLists(local: Todo[], remote: Todo[], pendingDeleteIds: string[]): Todo[] {
  const pendingSet = new Set(pendingDeleteIds);
  const map = new Map<string, Todo>(local.map((t) => [t.id, t]));
  for (const remoteTodo of remote) {
    if (pendingSet.has(remoteTodo.id)) continue; // locally deleted — don't re-add
    const existing = map.get(remoteTodo.id);
    if (!existing || remoteTodo.updatedAt > existing.updatedAt) {
      // Preserve device-local notification IDs when adopting the remote version
      map.set(remoteTodo.id, {
        ...remoteTodo,
        reminderId: existing?.reminderId ?? null,
        dueNotificationId: existing?.dueNotificationId ?? null,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
}

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const hydrateTodos = createAsyncThunk('todos/hydrate', async (userId: string) => {
  const [raw, pendingDeleteIds] = await Promise.all([
    loadTodosFromStorage(userId),
    loadTodoPendingDeleteIdsFromStorage(userId),
  ]);
  return {
    todos: (raw as Record<string, unknown>[]).map(migrateTodo),
    pendingDeleteIds,
  };
});

export const fetchTodos = createAsyncThunk(
  'todos/fetch',
  async (userId: string, { getState }) => {
    const remote = await fetchTodosFromSupabase(userId);
    const state = getState() as { todos: TodosState };
    return mergeTodoLists(state.todos.todos, remote, state.todos.pendingDeleteIds);
  }
);

export const syncTodos = createAsyncThunk(
  'todos/sync',
  async (userId: string, { getState }) => {
    const state = getState() as { todos: TodosState };
    const unsynced = state.todos.todos.filter((t) => !t.synced);
    const { pendingDeleteIds } = state.todos;

    // Upsert and get back server rows so we can adopt the trigger-assigned updated_at,
    // preventing clock-skew from causing stale local timestamps to lose conflict resolution.
    let serverTodos: Todo[] = [];
    if (unsynced.length > 0) {
      serverTodos = await upsertTodosToSupabase(unsynced, userId);
    }

    const successfulDeleteIds: string[] = [];
    await Promise.all(
      pendingDeleteIds.map(async (id) => {
        try {
          await deleteTodoFromSupabase(id);
          successfulDeleteIds.push(id);
        } catch {}
      })
    );

    return { serverTodos, successfulDeleteIds };
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
    reminderOffset,
  }: {
    title: string;
    description?: string;
    listId?: string;
    priority?: Priority;
    dueDate?: number | null;
    reminderOffset?: number | null;
  }): Promise<Todo> => {
    const now = Date.now();
    const id = generateId();
    const effectiveDueDate = dueDate ?? null;
    const effectiveOffset = effectiveDueDate !== null ? (reminderOffset ?? null) : null;

    let reminderId: string | null = null;
    let dueNotificationId: string | null = null;
    if (effectiveDueDate !== null) {
      dueNotificationId = await scheduleDueNotification(id, title.trim(), effectiveDueDate);
      if (effectiveOffset !== null) {
        reminderId = await scheduleReminder(id, title.trim(), effectiveDueDate, effectiveOffset);
      }
    }

    return {
      id,
      title: title.trim(),
      description: description?.trim() || undefined,
      completed: false,
      priority: priority ?? 'medium',
      dueDate: effectiveDueDate,
      listId: listId ?? DEFAULT_LIST_ID,
      createdAt: now,
      updatedAt: now,
      synced: false,
      reminderOffset: effectiveOffset,
      reminderId,
      dueNotificationId,
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
    reminderOffset,
  }: {
    id: string;
    title: string;
    description?: string;
    priority?: Priority;
    dueDate?: number | null;
    listId?: string;
    reminderOffset?: number | null;
  }, { getState }) => {
    const state = getState() as { todos: TodosState };
    const existing = state.todos.todos.find((t) => t.id === id);

    // Cancel any existing notifications first
    if (existing?.reminderId) await cancelReminder(existing.reminderId);
    if (existing?.dueNotificationId) await cancelReminder(existing.dueNotificationId);

    const effectiveDueDate = dueDate !== undefined ? dueDate : (existing?.dueDate ?? null);
    // If dueDate is cleared, also clear the reminder offset
    const effectiveOffset = effectiveDueDate === null
      ? null
      : (reminderOffset !== undefined ? reminderOffset : (existing?.reminderOffset ?? null));

    let reminderId: string | null = null;
    let dueNotificationId: string | null = null;
    if (effectiveDueDate !== null) {
      dueNotificationId = await scheduleDueNotification(id, title.trim(), effectiveDueDate);
      if (effectiveOffset !== null) {
        reminderId = await scheduleReminder(id, title.trim(), effectiveDueDate, effectiveOffset);
      }
    }

    return {
      id,
      title: title.trim(),
      description: description?.trim() || undefined,
      priority,
      dueDate,
      listId,
      reminderOffset: effectiveOffset,
      reminderId,
      dueNotificationId,
      updatedAt: Date.now(),
    };
  }
);

export const deleteTodo = createAsyncThunk('todos/delete', async (id: string, { getState }) => {
  const state = getState() as { todos: TodosState };
  const existing = state.todos.todos.find((t) => t.id === id);
  if (existing?.reminderId) await cancelReminder(existing.reminderId);
  if (existing?.dueNotificationId) await cancelReminder(existing.dueNotificationId);
  let deleteSucceeded = false;
  try {
    await deleteTodoFromSupabase(id);
    deleteSucceeded = true;
  } catch {}
  return { id, deleteSucceeded };
});

export const toggleTodo = createAsyncThunk('todos/toggle', async (id: string, { getState }) => {
  const state = getState() as { todos: TodosState };
  const todo = state.todos.todos.find((t) => t.id === id);
  let reminderId = todo?.reminderId ?? null;
  let dueNotificationId = todo?.dueNotificationId ?? null;

  if (todo) {
    if (!todo.completed) {
      // Completing → cancel both notifications
      if (reminderId) { await cancelReminder(reminderId); reminderId = null; }
      if (dueNotificationId) { await cancelReminder(dueNotificationId); dueNotificationId = null; }
    } else {
      // Un-completing → reschedule both if applicable
      if (todo.dueDate !== null) {
        dueNotificationId = await scheduleDueNotification(todo.id, todo.title, todo.dueDate);
        if (todo.reminderOffset !== null) {
          reminderId = await scheduleReminder(todo.id, todo.title, todo.dueDate, todo.reminderOffset);
        }
      }
    }
  }

  return { id, updatedAt: Date.now(), reminderId, dueNotificationId };
});

// ─── Slice ───────────────────────────────────────────────────────────────────

const todosSlice = createSlice({
  name: 'todos',
  initialState,
  reducers: {
    setFilter(state, action: PayloadAction<Filter>) {
      state.filter = action.payload;
    },
    setPriorityFilter(state, action: PayloadAction<PriorityFilter>) {
      state.priorityFilter = action.payload;
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
        state.todos = action.payload.todos;
        state.pendingDeleteIds = action.payload.pendingDeleteIds;
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
        const { serverTodos, successfulDeleteIds } = action.payload;
        const serverMap = new Map(serverTodos.map((t) => [t.id, t]));
        state.todos = state.todos.map((local) => {
          const server = serverMap.get(local.id);
          if (!server) return local;
          // Preserve device-local notification IDs — never stored on the server
          return { ...server, synced: true, reminderId: local.reminderId, dueNotificationId: local.dueNotificationId };
        });
        if (successfulDeleteIds.length > 0) {
          const successSet = new Set(successfulDeleteIds);
          state.pendingDeleteIds = state.pendingDeleteIds.filter((id) => !successSet.has(id));
        }
      })
      // add
      .addCase(addTodo.fulfilled, (state, action) => {
        state.todos.unshift(action.payload);
      })
      // update
      .addCase(updateTodo.fulfilled, (state, action) => {
        const { id, title, description, priority, dueDate, listId, reminderOffset, reminderId, dueNotificationId, updatedAt } = action.payload;
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          todo.title = title;
          todo.description = description;
          if (priority !== undefined) todo.priority = priority;
          if (dueDate !== undefined) todo.dueDate = dueDate;
          if (listId !== undefined) todo.listId = listId;
          todo.reminderOffset = reminderOffset;
          todo.reminderId = reminderId;
          todo.dueNotificationId = dueNotificationId;
          todo.updatedAt = updatedAt;
          todo.synced = false;
        }
      })
      // delete
      .addCase(deleteTodo.fulfilled, (state, action) => {
        const { id, deleteSucceeded } = action.payload;
        state.todos = state.todos.filter((t) => t.id !== id);
        if (!deleteSucceeded && !state.pendingDeleteIds.includes(id)) {
          state.pendingDeleteIds.push(id);
        }
      })
      // toggle
      .addCase(toggleTodo.fulfilled, (state, action) => {
        const { id, updatedAt, reminderId, dueNotificationId } = action.payload;
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          todo.completed = !todo.completed;
          todo.reminderId = reminderId;
          todo.dueNotificationId = dueNotificationId;
          todo.updatedAt = updatedAt;
          todo.synced = false;
        }
      });
  },
});

export const { setFilter, setPriorityFilter, setSearchQuery, setSortBy, setSortOrder, clearTodos } = todosSlice.actions;
export default todosSlice.reducer;
