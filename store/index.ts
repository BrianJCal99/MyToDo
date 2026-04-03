import listsReducer, {
  addList,
  deleteList,
  fetchLists,
  hydrateLists,
  setActiveListId,
  syncLists,
  updateList,
} from "@/features/lists/listsSlice";
import todosReducer, {
  addTodo,
  deleteTodo,
  fetchTodos,
  hydrateTodos,
  setFilter,
  setSearchQuery,
  setSortBy,
  setSortOrder,
  syncTodos,
  toggleTodo,
  updateTodo,
} from "@/features/todos/todosSlice";
import {
  saveListsToStorage,
  savePrefsToStorage,
  saveTodosToStorage,
} from "@/services/storage";
import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import devToolsEnhancer from "redux-devtools-expo-dev-plugin";
import userReducer from "./userSlice";

const listenerMiddleware = createListenerMiddleware();

// ─── Persistence: Todos ───────────────────────────────────────────────────────

const todosPersistTriggers = [
  addTodo.fulfilled.type,
  updateTodo.fulfilled.type,
  deleteTodo.fulfilled.type,
  toggleTodo.fulfilled.type,
  fetchTodos.fulfilled.type,
  hydrateTodos.fulfilled.type,
  syncTodos.fulfilled.type,
];

listenerMiddleware.startListening({
  predicate: (action) =>
    todosPersistTriggers.includes((action as { type: string }).type),
  effect: async (_, { getState }) => {
    const state = getState() as RootState;
    const userId = state.user.id;
    if (userId) {
      saveTodosToStorage(userId, state.todos.todos);
    }
  },
});

// ─── Persistence: Lists ───────────────────────────────────────────────────────

const listsPersistTriggers = [
  addList.fulfilled.type,
  updateList.fulfilled.type,
  deleteList.fulfilled.type,
  fetchLists.fulfilled.type,
  hydrateLists.fulfilled.type,
  syncLists.fulfilled.type,
];

listenerMiddleware.startListening({
  predicate: (action) =>
    listsPersistTriggers.includes((action as { type: string }).type),
  effect: async (_, { getState }) => {
    const state = getState() as RootState;
    const userId = state.user.id;
    if (userId) {
      saveListsToStorage(userId, state.lists.lists);
    }
  },
});

// ─── Persistence: UI Preferences ─────────────────────────────────────────────

const prefsTriggers: string[] = [
  setFilter.type,
  setSearchQuery.type,
  setSortBy.type,
  setSortOrder.type,
  setActiveListId.type,
];

listenerMiddleware.startListening({
  predicate: (action) =>
    prefsTriggers.includes((action as { type: string }).type),
  effect: async (_, { getState }) => {
    const state = getState() as RootState;
    const userId = state.user.id;
    if (userId) {
      savePrefsToStorage(userId, {
        filter: state.todos.filter,
        sortBy: state.todos.sortBy,
        sortOrder: state.todos.sortOrder,
        searchQuery: state.todos.searchQuery,
        activeListId: state.lists.activeListId,
      });
    }
  },
});

// ─── Store ────────────────────────────────────────────────────────────────────

export const store = configureStore({
  reducer: {
    user: userReducer,
    todos: todosReducer,
    lists: listsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  devTools: false, // Disable default to use the Expo plugin
  enhancers: (getDefaultEnhancers) =>
    getDefaultEnhancers().concat(devToolsEnhancer()),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
