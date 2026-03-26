import AsyncStorage from '@react-native-async-storage/async-storage';
import { Todo } from '@/features/todos/todosSlice';

const todosKey = (userId: string) => `@todos_${userId}`;

export async function loadTodosFromStorage(userId: string): Promise<Todo[]> {
  try {
    const raw = await AsyncStorage.getItem(todosKey(userId));
    return raw ? (JSON.parse(raw) as Todo[]) : [];
  } catch {
    return [];
  }
}

export async function saveTodosToStorage(userId: string, todos: Todo[]): Promise<void> {
  try {
    await AsyncStorage.setItem(todosKey(userId), JSON.stringify(todos));
  } catch {
    // Fail silently — app continues working without persistence
  }
}

export async function clearTodosFromStorage(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(todosKey(userId));
  } catch {
    // Fail silently
  }
}
