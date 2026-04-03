import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeColors } from '@/constants/theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useAppDispatch, useAppSelector } from '@/store';
import { addTodo, deleteTodo } from '@/features/todos/todosSlice';
import { deleteList } from '@/features/lists/listsSlice';
import TodoItem from '@/components/TodoItem';
import LniIcon from '@/components/LniIcon';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors, insets);

  const allTodos = useAppSelector((state) => state.todos.todos);
  const allLists = useAppSelector((state) => state.lists.lists);

  const list = allLists.find((l) => l.id === id);
  const todos = useMemo(
    () => allTodos.filter((t) => t.listId === id),
    [allTodos, id]
  );

  const [title, setTitle] = useState('');
  const canAdd = title.trim().length > 0;

  function handleAdd() {
    if (!canAdd) return;
    dispatch(addTodo({ title, listId: id }));
    setTitle('');
  }

  function handleDeleteList() {
    Alert.alert(
      `Delete "${list?.name}"?`,
      todos.length > 0
        ? `This will permanently delete the list and all ${todos.length} todo${todos.length === 1 ? '' : 's'} in it.`
        : 'This will permanently delete the list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            todos.forEach((t) => dispatch(deleteTodo(t.id)));
            dispatch(deleteList(id));
            router.back();
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <LniIcon name="lni-chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {list?.name ?? 'List'}
          </Text>
          <Text style={styles.subtitle}>
            {todos.length} {todos.length === 1 ? 'todo' : 'todos'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDeleteList} hitSlop={12}>
          <LniIcon name="lni-trash-3" size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {/* Quick add */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Add a todo..."
          placeholderTextColor={colors.placeholder}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={!canAdd}
          activeOpacity={0.8}
        >
          <Text style={[styles.addButtonText, !canAdd && styles.addButtonTextDisabled]}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Todos */}
      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TodoItem todo={item} />}
        contentContainerStyle={todos.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <LniIcon name="lni-folder-1" size={40} color={colors.border} />
            <Text style={styles.emptyText}>No todos in this list</Text>
          </View>
        }
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors, insets: { top: number; bottom: number }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: insets.top + 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 20,
    },
    titleWrap: {
      flex: 1,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 1,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    addButton: {
      backgroundColor: colors.yellow,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    addButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    addButtonText: {
      color: colors.black,
      fontWeight: '800',
      fontSize: 15,
    },
    addButtonTextDisabled: {
      color: colors.disabledText,
    },
    list: {
      paddingBottom: 32 + insets.bottom,
    },
    emptyContainer: {
      flex: 1,
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
