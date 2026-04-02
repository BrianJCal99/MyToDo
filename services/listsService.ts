import { supabase } from '@/lib/supabase';
import { List } from '@/features/lists/listsSlice';

interface SupabaseListRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string; // timestamptz → ISO 8601 string
}

function rowToList(row: SupabaseListRow): List {
  return {
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at).getTime(),
    synced: true,
  };
}

export async function fetchListsFromSupabase(userId: string): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as SupabaseListRow[]).map(rowToList);
}

export async function upsertListsToSupabase(lists: List[], userId: string): Promise<void> {
  if (lists.length === 0) return;

  const rows = lists.map((l) => ({
    id: l.id,
    user_id: userId,
    name: l.name,
    created_at: new Date(l.createdAt).toISOString(),
  }));

  const { error } = await supabase.from('lists').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteListFromSupabase(id: string): Promise<void> {
  const { error } = await supabase.from('lists').delete().eq('id', id);
  if (error) throw error;
}
