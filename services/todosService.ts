import { supabase } from '@/lib/supabase';
import { Todo, Priority } from '@/features/todos/todosSlice';
import { DEFAULT_LIST_ID } from '@/features/lists/listsSlice';

interface SupabaseTodoRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority | null;
  due_date: string | null;  // date    → "YYYY-MM-DD"
  due_time: string | null;  // timetz  → "HH:MM:SS+HH" — null means date-only
  list_id: string | null;
  created_at: string;       // timestamptz → ISO 8601 string
  updated_at: string;       // timestamptz → ISO 8601 string
}

// Reconstruct a local-time ms timestamp from the separate date and time columns.
// timetz comes back as "HH:MM:SS+HH" or "HH:MM:SS+HH:MM" — we use only the HH:MM
// portion (the user's intended local time) and discard the stored offset.
function combineDueDateTime(dueDate: string | null, dueTime: string | null): number | null {
  if (!dueDate) return null;
  const [year, month, day] = dueDate.split('-').map(Number);
  const d = new Date(year, month - 1, day); // local midnight
  if (dueTime) {
    const [hours, minutes] = dueTime.split(':').map(Number); // third segment holds offset
    d.setHours(hours, minutes, 0, 0);
  }
  return d.getTime();
}

// Decompose a local-time ms timestamp into the two Supabase columns.
// due_time is sent without an offset so Postgres stores it as-is in the session timezone.
function splitDueDateTime(ts: number | null): { due_date: string | null; due_time: string | null } {
  if (ts === null) return { due_date: null, due_time: null };
  const d = new Date(ts);
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  const due_date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const due_time = hasTime
    ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`
    : null;
  return { due_date, due_time };
}

function rowToTodo(row: SupabaseTodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    completed: row.completed,
    priority: row.priority ?? 'medium',
    dueDate: combineDueDateTime(row.due_date, row.due_time),
    listId: row.list_id ?? DEFAULT_LIST_ID,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
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

// Returns the server's rows so the caller can update local state with
// trigger-assigned updated_at values and avoid clock-skew data loss.
export async function upsertTodosToSupabase(todos: Todo[], userId: string): Promise<Todo[]> {
  if (todos.length === 0) return [];

  const rows = todos.map((t) => {
    const { due_date, due_time } = splitDueDateTime(t.dueDate);
    return {
      id: t.id,
      user_id: userId,
      title: t.title,
      description: t.description ?? null,
      completed: t.completed,
      priority: t.priority,
      due_date,   // "YYYY-MM-DD" or null
      due_time,   // "HH:MM:SS" or null (no offset — Postgres stores with session tz)
      list_id: t.listId,
      created_at: new Date(t.createdAt).toISOString(),
      updated_at: new Date(t.updatedAt).toISOString(),
    };
  });

  const { data, error } = await supabase
    .from('todos')
    .upsert(rows, { onConflict: 'id' })
    .select();
  if (error) throw error;
  return (data as SupabaseTodoRow[]).map(rowToTodo);
}

export async function deleteTodoFromSupabase(id: string): Promise<void> {
  const { error } = await supabase.from('todos').delete().eq('id', id);
  if (error) throw error;
}
