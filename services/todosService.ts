import { supabase } from '@/lib/supabase';
import { Todo } from '@/features/todos/todosSlice';

interface SupabaseTodoRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: number;
  updated_at: number;
}

function rowToTodo(row: SupabaseTodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    completed: row.completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    synced: true,
  };
}

export async function fetchTodosFromSupabase(userId: string): Promise<Todo[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as SupabaseTodoRow[]).map(rowToTodo);
}

export async function upsertTodosToSupabase(todos: Todo[], userId: string): Promise<void> {
  if (todos.length === 0) return;

  const rows = todos.map((t) => ({
    id: t.id,
    user_id: userId,
    title: t.title,
    description: t.description ?? null,
    completed: t.completed,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  }));

  const { error } = await supabase.from('todos').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteTodoFromSupabase(id: string): Promise<void> {
  const { error } = await supabase.from('todos').delete().eq('id', id);
  if (error) throw error;
}
