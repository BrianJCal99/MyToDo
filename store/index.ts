import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import userReducer from './userSlice';
import todosReducer, {
  addTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
  fetchTodos,
  hydrateTodos,
  syncTodos,
} from '@/features/todos/todosSlice';
import { saveTodosToStorage } from '@/services/storage';

const listenerMiddleware = createListenerMiddleware();

// Auto-persist todos to AsyncStorage after any mutation
const persistTriggers = [
  addTodo.fulfilled.type,
  updateTodo.fulfilled.type,
  deleteTodo.fulfilled.type,
  toggleTodo.fulfilled.type,
  fetchTodos.fulfilled.type,
  hydrateTodos.fulfilled.type,
  syncTodos.fulfilled.type,
];

listenerMiddleware.startListening({
  predicate: (action) => persistTriggers.includes((action as { type: string }).type),
  effect: async (_, { getState }) => {
    const state = getState() as RootState;
    const userId = state.user.id;
    if (userId) {
      saveTodosToStorage(userId, state.todos.todos);
    }
  },
});

export const store = configureStore({
  reducer: {
    user: userReducer,
    todos: todosReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
