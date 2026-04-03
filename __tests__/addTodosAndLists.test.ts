/**
 * Integration test: add 5 lists and 10 todos to the Redux store.
 *
 * Each todo is distinct and most belong to a thematically relevant list.
 * Two todos (dentist appointment, electricity bill) fall into the default
 * Inbox because they don't fit neatly under a named list.
 * Due dates and reminder offsets are varied across todos.
 */

import { configureStore } from '@reduxjs/toolkit';
import todosReducer, { addTodo } from '@/features/todos/todosSlice';
import listsReducer, {
  addList,
  DEFAULT_LIST_ID,
} from '@/features/lists/listsSlice';

// ─── Mock external services ───────────────────────────────────────────────────

jest.mock('@/services/notificationsService', () => ({
  scheduleReminder: jest.fn().mockResolvedValue('mock-reminder-id'),
  scheduleDueNotification: jest.fn().mockResolvedValue('mock-due-notif-id'),
  cancelReminder: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/storage', () => ({
  loadTodosFromStorage: jest.fn().mockResolvedValue([]),
  saveTodosToStorage: jest.fn().mockResolvedValue(undefined),
  loadListsFromStorage: jest.fn().mockResolvedValue([]),
  saveListsToStorage: jest.fn().mockResolvedValue(undefined),
  savePrefsToStorage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/todosService', () => ({
  fetchTodosFromSupabase: jest.fn().mockResolvedValue([]),
  upsertTodosToSupabase: jest.fn().mockResolvedValue([]),
  deleteTodoFromSupabase: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/listsService', () => ({
  fetchListsFromSupabase: jest.fn().mockResolvedValue([]),
  upsertListsToSupabase: jest.fn().mockResolvedValue(undefined),
  deleteListFromSupabase: jest.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a timestamp N days from now at a specific hour:minute. */
function futureDate(daysFromNow: number, hour = 9, minute = 0): number {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

/** Build a fresh test store (no listener middleware — avoids storage side-effects). */
function makeStore() {
  return configureStore({
    reducer: { todos: todosReducer, lists: listsReducer },
  });
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('Add 5 lists and 10 todos', () => {
  let store: ReturnType<typeof makeStore>;

  // IDs resolved after addList thunks complete
  const listIds: Record<string, string> = {};

  beforeAll(async () => {
    store = makeStore();

    // ── Add 5 lists ────────────────────────────────────────────────────────

    const listNames = ['Work', 'Shopping', 'Fitness', 'Home', 'Learning'];
    for (const name of listNames) {
      const result = await store.dispatch(addList(name));
      if (addList.fulfilled.match(result)) {
        listIds[name] = result.payload.id;
      }
    }

    // ── Add 10 todos ───────────────────────────────────────────────────────
    // Due dates and reminder offsets intentionally vary across items.

    await store.dispatch(
      addTodo({
        title: 'Prepare quarterly report',
        description: 'Consolidate Q2 metrics and write the exec summary.',
        listId: listIds['Work'],
        priority: 'high',
        dueDate: futureDate(3, 17, 0), // 3 days from now at 5 PM
        reminderOffset: 60,            // 1 hour before
      })
    );

    await store.dispatch(
      addTodo({
        title: 'Schedule team retrospective',
        description: 'Book the meeting room and send calendar invites.',
        listId: listIds['Work'],
        priority: 'medium',
        dueDate: futureDate(5, 10, 0), // 5 days from now at 10 AM
        reminderOffset: 30,            // 30 min before
      })
    );

    await store.dispatch(
      addTodo({
        title: 'Buy groceries',
        description: 'Milk, eggs, bread, spinach, chicken, olive oil.',
        listId: listIds['Shopping'],
        priority: 'medium',
        dueDate: futureDate(1, 18, 30), // tomorrow at 6:30 PM
        reminderOffset: 15,             // 15 min before
      })
    );

    await store.dispatch(
      addTodo({
        title: 'Order new running shoes',
        description: 'Size 10.5 — check Nike and Brooks first.',
        listId: listIds['Shopping'],
        priority: 'low',
        dueDate: futureDate(7, 12, 0),  // 7 days from now at noon
        reminderOffset: null,           // no reminder
      })
    );

    await store.dispatch(
      addTodo({
        title: 'Morning run — 5 km',
        description: 'Keep pace under 6 min/km. Stretch afterwards.',
        listId: listIds['Fitness'],
        priority: 'low',
        dueDate: futureDate(1, 7, 0),  // tomorrow at 7 AM
        reminderOffset: 15,            // 15 min before
      })
    );

    await store.dispatch(
      addTodo({
        title: 'Gym session — leg day',
        description: 'Squats 4×8, Romanian deadlifts 3×10, leg press 3×12.',
        listId: listIds['Fitness'],
        priority: 'medium',
        dueDate: futureDate(2, 18, 0), // 2 days from now at 6 PM
        reminderOffset: 30,            // 30 min before
      })
    );

    await store.dispatch(
      addTodo({
        title: 'Fix leaking kitchen faucet',
        description: 'Replace the O-ring. Watch the repair tutorial first.',
        listId: listIds['Home'],
        priority: 'high',
        dueDate: futureDate(4, 10, 0), // 4 days from now at 10 AM
        reminderOffset: 1440,          // 1 day before
      })
    );

    await store.dispatch(
      addTodo({
        title: 'Clean out the garage',
        description: 'Sort items into keep, donate, and bin piles.',
        listId: listIds['Home'],
        priority: 'low',
        dueDate: futureDate(14, 9, 0), // 2 weeks from now at 9 AM
        reminderOffset: null,          // no reminder
      })
    );

    // Inbox todos — no listId provided, defaults to DEFAULT_LIST_ID
    await store.dispatch(
      addTodo({
        title: 'Call dentist for checkup appointment',
        description: 'Ask about the chipped molar too.',
        priority: 'medium',
        dueDate: futureDate(10, 9, 0), // 10 days from now at 9 AM
        reminderOffset: 1440,          // 1 day before
      })
    );

    await store.dispatch(
      addTodo({
        title: 'Pay electricity bill',
        description: "Pay via the utility provider's app. Screenshot the receipt.",
        priority: 'high',
        dueDate: futureDate(1, 9, 0),  // tomorrow at 9 AM
        reminderOffset: 60,            // 1 hour before
      })
    );
  });

  // ── List assertions ─────────────────────────────────────────────────────────

  it('creates 5 user-defined lists plus the default Inbox', () => {
    const { lists } = store.getState().lists;
    // Inbox is always present; we added 5 more
    expect(lists).toHaveLength(6);
  });

  it('includes all expected list names', () => {
    const names = store.getState().lists.lists.map((l) => l.name);
    expect(names).toEqual(
      expect.arrayContaining(['Inbox', 'Work', 'Shopping', 'Fitness', 'Home', 'Learning'])
    );
  });

  it('marks new lists as unsynced', () => {
    const userLists = store
      .getState()
      .lists.lists.filter((l) => l.id !== DEFAULT_LIST_ID);
    expect(userLists.every((l) => !l.synced)).toBe(true);
  });

  // ── Todo count assertions ───────────────────────────────────────────────────

  it('stores exactly 10 todos', () => {
    expect(store.getState().todos.todos).toHaveLength(10);
  });

  // ── List membership assertions ──────────────────────────────────────────────

  it('assigns 2 todos to the Work list', () => {
    const workTodos = store
      .getState()
      .todos.todos.filter((t) => t.listId === listIds['Work']);
    expect(workTodos).toHaveLength(2);
    expect(workTodos.map((t) => t.title)).toEqual(
      expect.arrayContaining(['Prepare quarterly report', 'Schedule team retrospective'])
    );
  });

  it('assigns 2 todos to the Shopping list', () => {
    const shoppingTodos = store
      .getState()
      .todos.todos.filter((t) => t.listId === listIds['Shopping']);
    expect(shoppingTodos).toHaveLength(2);
    expect(shoppingTodos.map((t) => t.title)).toEqual(
      expect.arrayContaining(['Buy groceries', 'Order new running shoes'])
    );
  });

  it('assigns 2 todos to the Fitness list', () => {
    const fitnessTodos = store
      .getState()
      .todos.todos.filter((t) => t.listId === listIds['Fitness']);
    expect(fitnessTodos).toHaveLength(2);
    expect(fitnessTodos.map((t) => t.title)).toEqual(
      expect.arrayContaining(['Morning run — 5 km', 'Gym session — leg day'])
    );
  });

  it('assigns 2 todos to the Home list', () => {
    const homeTodos = store
      .getState()
      .todos.todos.filter((t) => t.listId === listIds['Home']);
    expect(homeTodos).toHaveLength(2);
    expect(homeTodos.map((t) => t.title)).toEqual(
      expect.arrayContaining(['Fix leaking kitchen faucet', 'Clean out the garage'])
    );
  });

  it('assigns 2 todos to the Inbox (no list specified)', () => {
    const inboxTodos = store
      .getState()
      .todos.todos.filter((t) => t.listId === DEFAULT_LIST_ID);
    expect(inboxTodos).toHaveLength(2);
    expect(inboxTodos.map((t) => t.title)).toEqual(
      expect.arrayContaining([
        'Call dentist for checkup appointment',
        'Pay electricity bill',
      ])
    );
  });

  // ── Priority distribution assertions ───────────────────────────────────────

  it('has 3 high-priority todos', () => {
    const highPri = store
      .getState()
      .todos.todos.filter((t) => t.priority === 'high');
    expect(highPri).toHaveLength(3);
    expect(highPri.map((t) => t.title)).toEqual(
      expect.arrayContaining([
        'Prepare quarterly report',
        'Fix leaking kitchen faucet',
        'Pay electricity bill',
      ])
    );
  });

  it('has 4 medium-priority todos', () => {
    const medPri = store
      .getState()
      .todos.todos.filter((t) => t.priority === 'medium');
    expect(medPri).toHaveLength(4);
  });

  it('has 3 low-priority todos', () => {
    const lowPri = store
      .getState()
      .todos.todos.filter((t) => t.priority === 'low');
    expect(lowPri).toHaveLength(3);
  });

  // ── Due date assertions ─────────────────────────────────────────────────────

  it('sets a due date on every todo', () => {
    const todos = store.getState().todos.todos;
    expect(todos.every((t) => t.dueDate !== null)).toBe(true);
  });

  it('sets all due dates in the future', () => {
    const now = Date.now();
    const todos = store.getState().todos.todos;
    expect(todos.every((t) => (t.dueDate as number) > now)).toBe(true);
  });

  // ── Reminder assertions ─────────────────────────────────────────────────────

  it('sets a reminder on 8 todos and leaves 2 without one', () => {
    const todos = store.getState().todos.todos;
    const withReminder = todos.filter((t) => t.reminderOffset !== null);
    const withoutReminder = todos.filter((t) => t.reminderOffset === null);
    expect(withReminder).toHaveLength(8);
    expect(withoutReminder).toHaveLength(2);
  });

  it('uses varied reminder offsets (15, 30, 60, 1440 min)', () => {
    const offsets = store
      .getState()
      .todos.todos.map((t) => t.reminderOffset)
      .filter((o): o is number => o !== null);

    expect(offsets).toEqual(expect.arrayContaining([15, 30, 60, 1440]));
  });

  // ── Initial state assertions ────────────────────────────────────────────────

  it('marks all todos as incomplete initially', () => {
    const todos = store.getState().todos.todos;
    expect(todos.every((t) => t.completed === false)).toBe(true);
  });

  it('marks all todos as unsynced initially', () => {
    const todos = store.getState().todos.todos;
    expect(todos.every((t) => t.synced === false)).toBe(true);
  });

  it('sets createdAt and updatedAt timestamps on every todo', () => {
    const todos = store.getState().todos.todos;
    expect(todos.every((t) => t.createdAt > 0 && t.updatedAt > 0)).toBe(true);
  });

  it('assigns unique IDs to all todos', () => {
    const ids = store.getState().todos.todos.map((t) => t.id);
    expect(new Set(ids).size).toBe(10);
  });

  it('assigns unique IDs to all lists', () => {
    const ids = store.getState().lists.lists.map((l) => l.id);
    expect(new Set(ids).size).toBe(6);
  });
});
