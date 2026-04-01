import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAppSelector } from '@/store';
import TodoItem from '@/components/TodoItem';
import LniIcon from '@/components/LniIcon';

type Section =
  | { type: 'header'; label: string; count: number }
  | { type: 'todo'; id: string }
  | { type: 'list'; id: string }
  | { type: 'empty' };

export default function SearchScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');

  const allTodos = useAppSelector((state) => state.todos.todos);
  const allLists = useAppSelector((state) => state.lists.lists);

  const trimmed = query.trim().toLowerCase();

  const matchedLists = useMemo(() => {
    if (!trimmed) return [];
    return allLists.filter((l) => l.name.toLowerCase().includes(trimmed));
  }, [trimmed, allLists]);

  const matchedTodos = useMemo(() => {
    if (!trimmed) return [];
    return allTodos.filter(
      (t) =>
        t.title.toLowerCase().includes(trimmed) ||
        (t.description && t.description.toLowerCase().includes(trimmed))
    );
  }, [trimmed, allTodos]);

  // Precompute todo counts per list for display
  const todoCountByList = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of allTodos) {
      map[t.listId] = (map[t.listId] ?? 0) + 1;
    }
    return map;
  }, [allTodos]);

  // Build flat section list for FlatList
  const sections: Section[] = useMemo(() => {
    if (!trimmed) return [];

    const items: Section[] = [];
    const hasLists = matchedLists.length > 0;
    const hasTodos = matchedTodos.length > 0;

    if (!hasLists && !hasTodos) {
      items.push({ type: 'empty' });
      return items;
    }

    if (hasLists) {
      items.push({ type: 'header', label: 'Lists', count: matchedLists.length });
      for (const l of matchedLists) {
        items.push({ type: 'list', id: l.id });
      }
    }

    if (hasTodos) {
      items.push({ type: 'header', label: 'Todos', count: matchedTodos.length });
      for (const t of matchedTodos) {
        items.push({ type: 'todo', id: t.id });
      }
    }

    return items;
  }, [trimmed, matchedLists, matchedTodos]);

  function handleListPress(listId: string) {
    router.push(`/(tabs)/list/${listId}`);
  }

  function renderItem({ item }: { item: Section }) {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{item.label}</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionCount}>{item.count}</Text>
          </View>
        </View>
      );
    }

    if (item.type === 'empty') {
      return (
        <View style={styles.emptyState}>
          <LniIcon name="lni-search-1" size={36} color={colors.border} />
          <Text style={styles.emptyText}>No results for "{query.trim()}"</Text>
        </View>
      );
    }

    if (item.type === 'list') {
      const list = allLists.find((l) => l.id === item.id);
      if (!list) return null;
      const count = todoCountByList[list.id] ?? 0;
      return (
        <TouchableOpacity
          style={styles.listResult}
          onPress={() => handleListPress(list.id)}
          activeOpacity={0.7}
        >
          <View style={styles.listIconWrap}>
            <LniIcon name="lni-folder-1" size={18} color={colors.yellow} />
          </View>
          <View style={styles.listResultText}>
            <Text style={styles.listResultName}>{list.name}</Text>
            <Text style={styles.listResultCount}>
              {count} {count === 1 ? 'todo' : 'todos'}
            </Text>
          </View>
          <LniIcon name="lni-chevron-right-circle" size={16} color={colors.muted} />
        </TouchableOpacity>
      );
    }

    if (item.type === 'todo') {
      const todo = allTodos.find((t) => t.id === item.id);
      if (!todo) return null;
      return <TodoItem todo={todo} />;
    }

    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <LniIcon name="lni-chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <LniIcon name="lni-search-1" size={16} color={colors.placeholder} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search todos and lists..."
            placeholderTextColor={colors.placeholder}
            autoFocus
            returnKeyType="search"
            clearButtonMode="never"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <LniIcon name="lni-xmark" size={15} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {!trimmed ? (
        <View style={styles.emptyState}>
          <LniIcon name="lni-search-1" size={40} color={colors.border} />
          <Text style={styles.emptyText}>Search todos and lists</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item, index) =>
            item.type === 'todo' || item.type === 'list'
              ? `${item.type}-${item.id}`
              : `${item.type}-${index}`
          }
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 60,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 16,
    },
    inputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      padding: 0,
    },
    list: {
      paddingBottom: 32,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 10,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    sectionBadge: {
      backgroundColor: colors.yellow,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    sectionCount: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.black,
    },
    listResult: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginHorizontal: 24,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    listIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    listResultText: {
      flex: 1,
    },
    listResultName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    listResultCount: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 1,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    emptyText: {
      fontSize: 15,
      color: colors.muted,
    },
  });
}
