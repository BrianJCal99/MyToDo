import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/store';
import { Priority } from '@/features/todos/todosSlice';
import { DEFAULT_LIST_ID } from '@/features/lists/listsSlice';

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

// ─── Input Selectors ──────────────────────────────────────────────────────────
// Raw slices of state — never memoized, used as inputs to composed selectors.

export const selectAllTodos       = (state: RootState) => state.todos.todos;
export const selectFilter         = (state: RootState) => state.todos.filter;
export const selectPriorityFilter = (state: RootState) => state.todos.priorityFilter;
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
        return todos.filter((t) => !t.completed && t.dueDate !== null && t.dueDate < now);
      case 'high_priority':
        return todos.filter((t) => t.priority === 'high' && !t.completed);
      case 'due_today': {
        const start = startOfToday();
        const end = endOfToday();
        return todos.filter((t) => !t.completed && t.dueDate !== null && t.dueDate >= start && t.dueDate <= end);
      }
      default:
        return todos;
    }
  }
);

// ─── 3. Priority Filter ───────────────────────────────────────────────────────
// Narrow results to a specific priority level, applied after status filter.

export const selectPriorityFilteredTodos = createSelector(
  [selectFilteredTodos, selectPriorityFilter],
  (todos, priorityFilter) =>
    priorityFilter === 'all' ? todos : todos.filter((t) => t.priority === priorityFilter)
);

// ─── 4. Search ────────────────────────────────────────────────────────────────
// Case-insensitive match against title + description, applied after priority filter.

export const selectSearchedTodos = createSelector(
  [selectPriorityFilteredTodos, selectSearchQuery],
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

// ─── 5. Sort ──────────────────────────────────────────────────────────────────
// Applied last — spread first to avoid mutating the upstream memoized array.
// dueDate nulls always sort to the end regardless of sort order.

function applySortOrder(cmp: number, sortOrder: 'asc' | 'desc'): number {
  return sortOrder === 'desc' ? -cmp : cmp;
}

function compareTodos(
  a: { title: string; priority: Priority; dueDate: number | null; createdAt: number; updatedAt: number },
  b: { title: string; priority: Priority; dueDate: number | null; createdAt: number; updatedAt: number },
  sortBy: string
): number {
  switch (sortBy) {
    case 'priority':
      return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    case 'title':
      return a.title.localeCompare(b.title);
    case 'dueDate':
      if (a.dueDate === null && b.dueDate === null) return 0;
      if (a.dueDate === null) return 1;
      if (b.dueDate === null) return -1;
      return a.dueDate - b.dueDate;
    case 'updatedAt':
      return a.updatedAt - b.updatedAt;
    case 'createdAt':
    default:
      return a.createdAt - b.createdAt;
  }
}

export const selectSortedTodos = createSelector(
  [selectSearchedTodos, selectSortBy, selectSortOrder],
  (todos, sortBy, sortOrder) =>
    [...todos].sort((a, b) => applySortOrder(compareTodos(a, b, sortBy), sortOrder))
);

// ─── 6. Smart Views ───────────────────────────────────────────────────────────
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
    return [...filtered].sort((a, b) => applySortOrder(compareTodos(a, b, sortBy), sortOrder));
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
    return [...filtered].sort((a, b) => applySortOrder(compareTodos(a, b, sortBy), sortOrder));
  }
);

/** Incomplete high-priority todos. Respects active list + search + sort. */
export const selectHighPriorityTodos = createSelector(
  [selectListSearchedTodos, selectSortBy, selectSortOrder],
  (todos, sortBy, sortOrder) => {
    const filtered = todos.filter((t) => t.priority === 'high' && !t.completed);
    return [...filtered].sort((a, b) => applySortOrder(compareTodos(a, b, sortBy), sortOrder));
  }
);

// ─── 7. Inbox View ────────────────────────────────────────────────────────────
// Full pipeline scoped to the Inbox list (DEFAULT_LIST_ID). Used by the home
// screen to show filtered + sorted inbox todos without touching activeListId.

const selectInboxTodos = createSelector(
  [selectAllTodos],
  (todos) => todos.filter((t) => t.listId === DEFAULT_LIST_ID)
);

const selectInboxStatusFilteredTodos = createSelector(
  [selectInboxTodos, selectFilter],
  (todos, filter) => {
    const now = Date.now();
    switch (filter) {
      case 'active':        return todos.filter((t) => !t.completed);
      case 'completed':     return todos.filter((t) => t.completed);
      case 'overdue':       return todos.filter((t) => !t.completed && t.dueDate !== null && t.dueDate < now);
      case 'high_priority': return todos.filter((t) => t.priority === 'high' && !t.completed);
      case 'due_today': {
        const start = startOfToday();
        const end = endOfToday();
        return todos.filter((t) => !t.completed && t.dueDate !== null && t.dueDate >= start && t.dueDate <= end);
      }
      default:              return todos;
    }
  }
);

const selectInboxPriorityFilteredTodos = createSelector(
  [selectInboxStatusFilteredTodos, selectPriorityFilter],
  (todos, priorityFilter) =>
    priorityFilter === 'all' ? todos : todos.filter((t) => t.priority === priorityFilter)
);

export const selectInboxFilteredSortedTodos = createSelector(
  [selectInboxPriorityFilteredTodos, selectSortBy, selectSortOrder],
  (todos, sortBy, sortOrder) =>
    [...todos].sort((a, b) => applySortOrder(compareTodos(a, b, sortBy), sortOrder))
);

// ─── 8. Per-List View (factory) ──────────────────────────────────────────────
// Returns a memoized selector scoped to a specific list ID.
// Call once per list screen mount: useMemo(() => makeSelectListFilteredSortedTodos(id), [id])

export function makeSelectListFilteredSortedTodos(listId: string) {
  const selectListTodos = createSelector(
    [selectAllTodos],
    (todos) => todos.filter((t) => t.listId === listId)
  );
  const selectListStatusFiltered = createSelector(
    [selectListTodos, selectFilter],
    (todos, filter) => {
      const now = Date.now();
      switch (filter) {
        case 'active':        return todos.filter((t) => !t.completed);
        case 'completed':     return todos.filter((t) => t.completed);
        case 'overdue':       return todos.filter((t) => !t.completed && t.dueDate !== null && t.dueDate < now);
        case 'high_priority': return todos.filter((t) => t.priority === 'high' && !t.completed);
        case 'due_today': {
          const start = startOfToday();
          const end = endOfToday();
          return todos.filter((t) => !t.completed && t.dueDate !== null && t.dueDate >= start && t.dueDate <= end);
        }
        default:              return todos;
      }
    }
  );
  const selectListPriorityFiltered = createSelector(
    [selectListStatusFiltered, selectPriorityFilter],
    (todos, priorityFilter) =>
      priorityFilter === 'all' ? todos : todos.filter((t) => t.priority === priorityFilter)
  );
  return createSelector(
    [selectListPriorityFiltered, selectSortBy, selectSortOrder],
    (todos, sortBy, sortOrder) =>
      [...todos].sort((a, b) => applySortOrder(compareTodos(a, b, sortBy), sortOrder))
  );
}

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
