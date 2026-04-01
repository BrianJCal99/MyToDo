import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/store';
import { Priority } from '@/features/todos/todosSlice';

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

// ─── Input Selectors ──────────────────────────────────────────────────────────
// Raw slices of state — never memoized, used as inputs to composed selectors.

export const selectAllTodos       = (state: RootState) => state.todos.todos;
export const selectFilter         = (state: RootState) => state.todos.filter;
export const selectSearchQuery    = (state: RootState) => state.todos.searchQuery;
export const selectSortBy         = (state: RootState) => state.todos.sortBy;
export const selectSortOrder      = (state: RootState) => state.todos.sortOrder;
export const selectActiveListId   = (state: RootState) => state.lists.activeListId;
export const selectTodosLoading   = (state: RootState) => state.todos.loading;
export const selectTodosError     = (state: RootState) => state.todos.error;

// ─── 1. Base: List Filter ─────────────────────────────────────────────────────
// Scope the todo pool to the active list. null activeListId = show all lists.

export const selectTodosByList = createSelector(
  [selectAllTodos, selectActiveListId],
  (todos, activeListId) =>
    activeListId === null
      ? todos
      : todos.filter((t) => t.listId === activeListId)
);

// ─── 2. Status Filter ─────────────────────────────────────────────────────────
// Apply the active status filter on top of the list-scoped pool.

export const selectFilteredTodos = createSelector(
  [selectTodosByList, selectFilter],
  (todos, filter) => {
    const now = Date.now();
    switch (filter) {
      case 'active':
        return todos.filter((t) => !t.completed);
      case 'completed':
        return todos.filter((t) => t.completed);
      case 'overdue':
        // dueDate in the past and not yet done
        return todos.filter((t) => !t.completed && t.dueDate !== null && t.dueDate < now);
      case 'high_priority':
        return todos.filter((t) => t.priority === 'high' && !t.completed);
      default:
        // 'all' — no status filter
        return todos;
    }
  }
);

// ─── 3. Search ────────────────────────────────────────────────────────────────
// Case-insensitive match against title + description, applied after status filter.

export const selectSearchedTodos = createSelector(
  [selectFilteredTodos, selectSearchQuery],
  (todos, query) => {
    const q = query.trim().toLowerCase();
    if (!q) return todos;
    return todos.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
    );
  }
);

// ─── 4. Sort ──────────────────────────────────────────────────────────────────
// Applied last — spread first to avoid mutating the upstream memoized array.
// dueDate nulls always sort to the end regardless of sort order.

export const selectSortedTodos = createSelector(
  [selectSearchedTodos, selectSortBy, selectSortOrder],
  (todos, sortBy, sortOrder) =>
    [...todos].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'priority':
          cmp = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
          break;
        case 'dueDate':
          if (a.dueDate === null && b.dueDate === null) cmp = 0;
          else if (a.dueDate === null) cmp = 1;
          else if (b.dueDate === null) cmp = -1;
          else cmp = a.dueDate - b.dueDate;
          break;
        case 'updatedAt':
          cmp = a.updatedAt - b.updatedAt;
          break;
        case 'createdAt':
        default:
          cmp = a.createdAt - b.createdAt;
          break;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    })
);

// ─── 5. Smart Views ───────────────────────────────────────────────────────────
// Dedicated selectors for Today / Overdue / High Priority screens.
// These respect the active list and search query but bypass the status filter
// since each view IS its own filter. They also apply sort for UI-readiness.
//
// Intermediate: list-scoped + searched, no status filter applied.

const selectListSearchedTodos = createSelector(
  [selectTodosByList, selectSearchQuery],
  (todos, query) => {
    const q = query.trim().toLowerCase();
    if (!q) return todos;
    return todos.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
    );
  }
);

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Incomplete todos due today. Respects active list + search + sort. */
export const selectTodayTodos = createSelector(
  [selectListSearchedTodos, selectSortBy, selectSortOrder],
  (todos, sortBy, sortOrder) => {
    const start = startOfToday();
    const end = endOfToday();
    const filtered = todos.filter(
      (t) => !t.completed && t.dueDate !== null && t.dueDate >= start && t.dueDate <= end
    );
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'priority') {
        cmp = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      } else if (sortBy === 'dueDate') {
        if (a.dueDate === null && b.dueDate === null) cmp = 0;
        else if (a.dueDate === null) cmp = 1;
        else if (b.dueDate === null) cmp = -1;
        else cmp = a.dueDate - b.dueDate;
      } else if (sortBy === 'updatedAt') {
        cmp = a.updatedAt - b.updatedAt;
      } else {
        cmp = a.createdAt - b.createdAt;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }
);

/** Incomplete todos past their due date. Respects active list + search + sort. */
export const selectOverdueTodos = createSelector(
  [selectListSearchedTodos, selectSortBy, selectSortOrder],
  (todos, sortBy, sortOrder) => {
    const now = Date.now();
    const filtered = todos.filter(
      (t) => !t.completed && t.dueDate !== null && t.dueDate < now
    );
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'priority') {
        cmp = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      } else if (sortBy === 'dueDate') {
        if (a.dueDate === null && b.dueDate === null) cmp = 0;
        else if (a.dueDate === null) cmp = 1;
        else if (b.dueDate === null) cmp = -1;
        else cmp = a.dueDate - b.dueDate;
      } else if (sortBy === 'updatedAt') {
        cmp = a.updatedAt - b.updatedAt;
      } else {
        cmp = a.createdAt - b.createdAt;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }
);

/** Incomplete high-priority todos. Respects active list + search + sort. */
export const selectHighPriorityTodos = createSelector(
  [selectListSearchedTodos, selectSortBy, selectSortOrder],
  (todos, sortBy, sortOrder) => {
    const filtered = todos.filter((t) => t.priority === 'high' && !t.completed);
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'dueDate') {
        if (a.dueDate === null && b.dueDate === null) cmp = 0;
        else if (a.dueDate === null) cmp = 1;
        else if (b.dueDate === null) cmp = -1;
        else cmp = a.dueDate - b.dueDate;
      } else if (sortBy === 'updatedAt') {
        cmp = a.updatedAt - b.updatedAt;
      } else {
        cmp = a.createdAt - b.createdAt;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }
);

// ─── 6. Combined (UI-ready) ───────────────────────────────────────────────────
// Alias for the full pipeline: list → status filter → search → sort.
// This is the selector the main todo list should consume.

export const selectFilteredSortedTodos = selectSortedTodos;

// ─── Counts & Badges ─────────────────────────────────────────────────────────
// Operate on ALL todos (no list scoping) for nav badges and summaries.

/** Number of incomplete overdue todos across all lists. */
export const selectOverdueCount = createSelector([selectAllTodos], (todos) => {
  const now = Date.now();
  return todos.filter((t) => !t.completed && t.dueDate !== null && t.dueDate < now).length;
});

/** Number of incomplete high-priority todos across all lists. */
export const selectHighPriorityActiveCount = createSelector([selectAllTodos], (todos) =>
  todos.filter((t) => t.priority === 'high' && !t.completed).length
);

/** Number of incomplete todos due today across all lists. */
export const selectTodayCount = createSelector([selectAllTodos], (todos) => {
  const start = startOfToday();
  const end = endOfToday();
  return todos.filter(
    (t) => !t.completed && t.dueDate !== null && t.dueDate >= start && t.dueDate <= end
  ).length;
});

/** Number of todos not yet synced to Supabase. Useful for a sync status indicator. */
export const selectUnsyncedCount = createSelector(
  [selectAllTodos],
  (todos) => todos.filter((t) => !t.synced).length
);
